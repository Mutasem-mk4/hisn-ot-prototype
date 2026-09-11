import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { JudgeOrchestrator } from '../application/judge-orchestrator.js';
import { minimumEvidenceForCommand } from '../domain/agent-plan.js';
import { assessEvidence } from '../domain/evidence.js';
import type { Scenario } from '../shared/contracts.js';
import { HisnError } from '../shared/errors.js';
import type { AppConfiguration } from './configuration.js';
import { createProviders } from './provider-factory.js';
import { SqliteAuditStore } from './sqlite-audit-store.js';

export function connectedPreflight(configuration: AppConfiguration) {
  const simulatorOauthAvailable = configuration.nac !== null;
  return {
    groqConfigured: configuration.llm !== null,
    nokiaConfigured: configuration.nac !== null,
    subscriberAuthorizationConfigured: Boolean(
      configuration.nac?.accessToken || simulatorOauthAvailable,
    ),
    subscriberAuthorizationMode: configuration.nac?.accessToken
      ? ('BEARER' as const)
      : simulatorOauthAvailable
        ? ('SIMULATOR_FAST_OAUTH' as const)
        : ('UNAVAILABLE' as const),
    environment: 'SANDBOX' as const,
    fallbackAllowed: false,
    enforcementExecuted: false,
  };
}

function comparisonScenario(configuration: AppConfiguration, context: 'A' | 'B'): Scenario {
  const trusted = configuration.scenarios.find(
    (scenario) => scenario.id === 'judge-safe-operating-change',
  );
  const alternative = configuration.scenarios.find(
    (scenario) => scenario.id === 'judge-valid-credentials-compromised-context',
  );
  if (!trusted || !alternative)
    throw new HisnError('SCENARIO_NOT_FOUND', 'Comparison scenarios are not configured', 409);
  return {
    ...trusted,
    id: `connected-context-${context.toLowerCase()}`,
    name: `Comparison context ${context}`,
    telecomDevice: context === 'A' ? trusted.telecomDevice : alternative.telecomDevice,
  };
}

export async function verifyConnectedContext(
  configuration: AppConfiguration,
  request: { context: 'A' | 'B'; stage: 'evidence' | 'investigation' },
) {
  if (!configuration.nac || (request.stage === 'investigation' && !configuration.llm)) {
    throw new HisnError(
      'CONFIGURATION_INVALID',
      'Connected verification requires configured external providers',
      409,
    );
  }
  const providers = createProviders({
    ...configuration,
    mode: 'SANDBOX',
    agentProvider: request.stage === 'investigation' ? 'GROQ' : configuration.agentProvider,
    nokiaSimulatorEnabled: false,
    nac: {
      ...configuration.nac,
      simulatorNumberAuthorization: true,
    },
  });
  const scenario = comparisonScenario(configuration, request.context);
  if (request.stage === 'evidence') {
    const correlationId = randomUUID();
    const evidence = await Promise.all(
      configuration.policy.agent.allowedTools.map((tool) =>
        providers.evidence.collect(
          tool,
          { correlationId, scenario, policy: configuration.policy },
          new AbortController().signal,
        ),
      ),
    );
    return {
      ...connectedPreflight(configuration),
      stage: 'evidence' as const,
      context: request.context,
      correlationId,
      command: scenario.command,
      collectionMethod: 'FIXED_PROVIDER_PROBE',
      evidence,
      assessment: assessEvidence(evidence, configuration.policy),
    };
  }
  const store = new SqliteAuditStore(':memory:', resolve('migrations'));
  try {
    store.migrate();
    const orchestrator = new JudgeOrchestrator(
      store,
      configuration.policy,
      [scenario],
      providers.evidence,
      providers.enforcement,
      providers.reasoner,
    );
    const started = performance.now();
    let snapshot = await orchestrator.createRun(scenario.id);
    for (let step = 0; step < 16; step += 1) {
      if (snapshot.artifacts.decision || snapshot.run.playbackStatus === 'FAILED_SAFE') break;
      snapshot = await orchestrator.control('NEXT');
    }
    const evidence = snapshot.artifacts.evidence ?? [];
    const required = minimumEvidenceForCommand(scenario.command, configuration.policy);
    return {
      ...connectedPreflight(configuration),
      stage: 'investigation' as const,
      context: request.context,
      runId: snapshot.run.id,
      correlationId: snapshot.run.correlationId,
      command: snapshot.run.command,
      durationMs: Math.round(performance.now() - started),
      requiredEvidenceComplete: required.every((tool) =>
        evidence.some(
          (call) =>
            call.tool === tool &&
            call.requestStatus === 'SUCCEEDED' &&
            call.provenance === 'SANDBOX',
        ),
      ),
      evidence,
      trace: snapshot.artifacts.agentTrace,
      recommendation: snapshot.artifacts.recommendation,
      decision: snapshot.artifacts.decision,
      acceptedPressurePercent: snapshot.run.twin.acceptedPressurePercent,
      failure:
        snapshot.run.playbackStatus === 'FAILED_SAFE' ? snapshot.currentEvent?.payload : null,
    };
  } finally {
    store.close();
  }
}

export async function verifyConnectedEvidenceComparison(configuration: AppConfiguration) {
  const first = await verifyConnectedContext(configuration, { context: 'A', stage: 'evidence' });
  const second = await verifyConnectedContext(configuration, { context: 'B', stage: 'evidence' });
  const executions = [first, second] as const;
  return {
    ...connectedPreflight(configuration),
    stage: 'evidence-comparison' as const,
    command: executions[0].command,
    executions,
  };
}
