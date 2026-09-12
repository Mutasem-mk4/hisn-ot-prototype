import { resolve } from 'node:path';
import { JudgeOrchestrator } from '../application/judge-orchestrator.js';
import type { RunSnapshot } from '../application/ports.js';
import type { TwinState } from '../shared/contracts.js';
import type { AppConfiguration } from './configuration.js';
import { createProviders } from './provider-factory.js';
import { SqliteAuditStore } from './sqlite-audit-store.js';
import { HisnError } from '../shared/errors.js';
import { UnavailableEvidenceProvider } from './unavailable-providers.js';

export type RehearsalRequest = {
  scenarioId: string;
  idempotencyKey: string;
  continuingTwin?: TwinState | undefined;
};

// This bounds duplicate demo requests within one warm process, not durable operator actuation.
export function createRehearsalExecutor(configuration: AppConfiguration) {
  const requests = new Map<
    string,
    { fingerprint: string; expires: number; result: ReturnType<typeof executeJudgeRehearsal> }
  >();
  return (sessionId: string, request: RehearsalRequest) => {
    for (const [key, entry] of requests) if (entry.expires < Date.now()) requests.delete(key);
    const key = `${sessionId}:${request.idempotencyKey}`;
    const fingerprint = JSON.stringify(request);
    const existing = requests.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new HisnError(
          'COMMAND_INVALID',
          'Idempotency key already belongs to another request',
          409,
        );
      return existing.result;
    }
    if (requests.size >= 32)
      throw new HisnError('RUN_BUSY', 'Demo capacity reached. Try again later.', 429);
    const result = executeJudgeRehearsal(configuration, request);
    const entry = { fingerprint, expires: Number.POSITIVE_INFINITY, result };
    requests.set(key, entry);
    const settle = () => {
      entry.expires = Date.now() + 60_000;
    };
    void result.then(settle, settle);
    return result;
  };
}

export function rehearsalConfiguration(configuration: AppConfiguration): AppConfiguration {
  if (!configuration.nokiaSimulatorEnabled) return configuration;
  return {
    ...configuration,
    mode: 'SANDBOX',
    agentProvider: 'GROQ',
    nokiaSimulatorEnabled: false,
    policy: {
      ...configuration.policy,
      agent: {
        ...configuration.policy.agent,
        maximumRetries: 0,
        allowedTools: configuration.policy.agent.allowedTools.filter(
          (tool) => tool !== 'NUMBER_VERIFICATION',
        ),
      },
    },
  };
}

export async function judgeBaseline(configuration: AppConfiguration) {
  const runtime = rehearsalConfiguration(configuration);
  const providers = createProviders(runtime);
  const store = new SqliteAuditStore(':memory:', resolve('migrations'));
  try {
    store.migrate();
    const orchestrator = new JudgeOrchestrator(
      store,
      runtime.policy,
      runtime.scenarios,
      providers.evidence,
      providers.enforcement,
      providers.reasoner,
    );
    return await orchestrator.createRun('judge-valid-credentials-compromised-context');
  } finally {
    store.close();
  }
}

export async function executeJudgeRehearsal(
  configuration: AppConfiguration,
  request: RehearsalRequest,
) {
  const runtime = rehearsalConfiguration(configuration);
  const providers = createProviders(runtime);
  if (runtime.mode === 'SANDBOX' && request.scenarioId === 'judge-degraded-provider') {
    providers.evidence = new UnavailableEvidenceProvider(
      'Explicit outage test: external evidence intentionally withheld',
    );
  }
  const store = new SqliteAuditStore(':memory:', resolve('migrations'));
  try {
    store.migrate();
    const orchestrator = new JudgeOrchestrator(
      store,
      runtime.policy,
      runtime.scenarios,
      providers.evidence,
      providers.enforcement,
      providers.reasoner,
    );
    const frames = [
      await orchestrator.createRun(
        request.scenarioId,
        request.idempotencyKey,
        request.continuingTwin,
      ),
    ];
    await finishWorkflow(orchestrator, frames);
    return { frames, incident: orchestrator.incident(frames.at(-1)!.run.id) };
  } finally {
    store.close();
  }
}

async function finishWorkflow(orchestrator: JudgeOrchestrator, frames: RunSnapshot[]) {
  for (let step = 0; step < 16; step += 1) {
    if (['COMPLETE', 'FAILED_SAFE'].includes(frames.at(-1)!.run.playbackStatus)) break;
    frames.push(await orchestrator.control('NEXT'));
  }
  if (!['COMPLETE', 'FAILED_SAFE'].includes(frames.at(-1)!.run.playbackStatus)) {
    throw new HisnError('INVALID_TRANSITION', 'Rehearsal exceeded its workflow bound', 500);
  }
  if (frames.at(-1)!.artifacts.decision?.state !== 'ALLOW') return;
  frames.push(await orchestrator.control('PLAY'));
  for (let sample = 0; sample < 12; sample += 1) frames.push(await orchestrator.simulate(250));
  frames.push(await orchestrator.control('PAUSE'));
}
