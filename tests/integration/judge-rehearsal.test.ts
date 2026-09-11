import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfiguration } from '../../src/infrastructure/configuration.js';
import {
  createRehearsalExecutor,
  executeJudgeRehearsal,
} from '../../src/infrastructure/judge-rehearsal.js';

const configuration = () => loadConfiguration({ HISN_MODE: 'DEMO' }, process.cwd());
const request = (scenarioId: string) => ({ scenarioId, idempotencyKey: randomUUID() });

describe('isolated judge rehearsals', () => {
  it('keeps simultaneous scenarios and their exported incident evidence isolated', async () => {
    const execute = createRehearsalExecutor(configuration());
    const attack = request('judge-valid-credentials-compromised-context');
    const safe = request('judge-safe-operating-change');
    const [blocked, allowed, duplicate] = await Promise.all([
      execute('session-a', attack),
      execute('session-b', safe),
      execute('session-a', attack),
    ]);
    expect(duplicate).toBe(blocked);
    const first = blocked.frames.at(-1)!;
    const second = allowed.frames.at(-1)!;
    expect(first.artifacts.decision?.state).toBe('BLOCK_AND_CONTAIN');
    expect(second.artifacts.decision?.state).toBe('ALLOW');
    expect(first.run.twin.acceptedPressurePercent).toBe(46);
    expect(second.run.twin.acceptedPressurePercent).toBe(52);
    expect(first.run.id).not.toBe(second.run.id);
    for (const result of [blocked, allowed]) {
      const last = result.frames.at(-1)!;
      expect(result.incident?.correlationId).toBe(last.run.correlationId);
      expect(
        result.incident?.identityAndNetworkEvidence.every(
          (call) => call.correlationId === last.run.correlationId,
        ),
      ).toBe(true);
    }
    expect(() => execute('session-a', { ...attack, scenarioId: safe.scenarioId })).toThrow(
      'Idempotency key',
    );
  });

  it.each([
    ['judge-hard-limit', 'BLOCK', 46],
    ['judge-degraded-provider', 'BLOCK', 46],
    ['judge-read-only-inspection', 'ALLOW', 46],
  ])(
    'keeps the %s outcome independent of concurrent controller state',
    async (scenarioId, decision, accepted) => {
      const result = await executeJudgeRehearsal(configuration(), request(String(scenarioId)));
      const final = result.frames.at(-1)!;
      expect(final.artifacts.decision?.state).toBe(decision);
      expect(final.run.twin.acceptedPressurePercent).toBe(accepted);
      expect(
        final.run.twin.commandHistory.filter(
          (c) => c.kind === 'SET_PRESSURE' && c.outcome === 'EXECUTED',
        ),
      ).toHaveLength(0);
    },
  );

  it('never substitutes local reasoning when connected providers are configured without a model', async () => {
    const config = configuration();
    config.nokiaSimulatorEnabled = true;
    const result = await executeJudgeRehearsal(
      config,
      request('judge-valid-credentials-compromised-context'),
    );
    const final = result.frames.at(-1)!;
    expect(final.run.playbackStatus).toBe('FAILED_SAFE');
    expect(final.integration.agentReasoner).toBe('UNAVAILABLE');
    expect(final.run.twin.acceptedPressurePercent).toBe(46);
    expect(final.artifacts.evidence ?? []).toEqual([]);
  });
});
