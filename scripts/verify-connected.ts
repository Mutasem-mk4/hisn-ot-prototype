import { randomUUID } from 'node:crypto';
import { config as loadEnvironmentFile } from 'dotenv';
import { JudgeOrchestrator } from '../src/application/judge-orchestrator.js';
import { loadConfiguration } from '../src/infrastructure/configuration.js';
import { createProviders } from '../src/infrastructure/provider-factory.js';
import { SqliteAuditStore } from '../src/infrastructure/sqlite-audit-store.js';
import { minimumEvidenceForCommand } from '../src/domain/agent-plan.js';

loadEnvironmentFile({ path: process.argv[2] ?? '.env.local', quiet: true });
loadEnvironmentFile({ path: '.env', quiet: true });

const unavailableSecrets = [
  'HISN_LLM_API_KEY',
  'NOKIA_NAC_API_KEY',
  'NOKIA_NAC_ACCESS_TOKEN',
].filter((key) => process.env[key] === '[SENSITIVE]');
if (unavailableSecrets.length) {
  console.log(
    JSON.stringify({
      kind: 'CONNECTED_PREFLIGHT',
      unavailableSecrets,
      reason: 'Vercel secret placeholders cannot authenticate external requests',
    }),
  );
  process.exit(1);
}

// This diagnostic always uses sandbox adapters and never executes containment.
const configuration = loadConfiguration(
  {
    ...process.env,
    HISN_MODE: 'SANDBOX',
    HISN_AGENT_PROVIDER: 'AUTO',
    HISN_NOKIA_SIMULATOR: 'false',
    HISN_SESSION_SECRET: randomUUID(),
  },
  process.cwd(),
);
const providers = createProviders(configuration);
const trusted = configuration.scenarios.find(
  (scenario) => scenario.id === 'judge-safe-operating-change',
)!;
const alternative = configuration.scenarios.find(
  (scenario) => scenario.id === 'judge-valid-credentials-compromised-context',
)!;
const checks = {
  groqConfigured: configuration.llm !== null,
  nokiaConfigured: configuration.nac !== null,
  subscriberAuthorizationConfigured: Boolean(configuration.nac?.accessToken),
  evidenceSource: providers.evidence.source,
  agent: providers.reasoner.mode,
};
console.log(JSON.stringify({ kind: 'CONNECTED_PREFLIGHT', checks }));

if (!checks.groqConfigured || !checks.nokiaConfigured) {
  process.exitCode = 1;
} else {
  const scenarios = [
    trusted,
    {
      ...trusted,
      id: 'connected-context-b',
      name: 'Comparison context B',
      telecomDevice: alternative.telecomDevice,
    },
  ];
  const store = new SqliteAuditStore(':memory:', `${process.cwd()}/migrations`);
  store.migrate();
  const orchestrator = new JudgeOrchestrator(
    store,
    configuration.policy,
    scenarios,
    providers.evidence,
    providers.enforcement,
    providers.reasoner,
  );
  const decisions: Array<string | undefined> = [];
  try {
    for (const scenario of scenarios) {
      const started = performance.now();
      let snapshot = await orchestrator.createRun(scenario.id, randomUUID());
      for (let step = 0; step < 16; step += 1) {
        if (snapshot.artifacts.decision || snapshot.run.playbackStatus === 'FAILED_SAFE') break;
        snapshot = await orchestrator.control('NEXT');
      }
      const calls = snapshot.artifacts.evidence ?? [];
      const required = minimumEvidenceForCommand(snapshot.run.command, configuration.policy);
      const complete = required.every((tool) =>
        calls.some(
          (call) =>
            call.tool === tool &&
            call.requestStatus === 'SUCCEEDED' &&
            call.provenance === 'SANDBOX',
        ),
      );
      decisions.push(snapshot.artifacts.decision?.state);
      console.log(
        JSON.stringify({
          kind: 'CONNECTED_EXECUTION',
          context: scenario.id === trusted.id ? 'A' : 'B',
          runId: snapshot.run.id,
          correlationId: snapshot.run.correlationId,
          command: snapshot.run.command,
          durationMs: Math.round(performance.now() - started),
          requiredEvidenceComplete: complete,
          evidence: calls,
          trace: snapshot.artifacts.agentTrace,
          recommendation: snapshot.artifacts.recommendation,
          decision: snapshot.artifacts.decision,
          failure:
            snapshot.run.playbackStatus === 'FAILED_SAFE' ? snapshot.currentEvent?.payload : null,
          enforcementExecuted: false,
        }),
      );
      if (!complete || !snapshot.artifacts.decision) process.exitCode = 1;
      if (snapshot.run.playbackStatus === 'FAILED_SAFE') break;
    }
    const contrastProven =
      decisions.length === 2 &&
      decisions.includes('ALLOW') &&
      decisions.some((decision) => decision !== undefined && decision !== 'ALLOW') &&
      !process.exitCode;
    console.log(
      JSON.stringify({ kind: 'CONNECTED_COMPARISON', contrastProven: Boolean(contrastProven) }),
    );
    if (!contrastProven) process.exitCode = 1;
  } finally {
    store.close();
  }
}
