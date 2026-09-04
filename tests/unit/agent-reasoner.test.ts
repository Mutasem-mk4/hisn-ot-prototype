import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeterministicAgentReasoner,
  FallbackAgentReasoner,
} from '../../src/infrastructure/agent-reasoners.js';
import { testPolicy, testScenario } from '../helpers/fixtures.js';

const scenario = testScenario();
const policy = testPolicy();

describe('bounded evidence planning', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('selects stronger evidence for critical control than for read-only access', async () => {
    const reasoner = new DeterministicAgentReasoner();
    const signal = new AbortController().signal;
    const low = await reasoner.plan(
      {
        command: {
          kind: 'READ_STATUS',
          requestedSetpointPercent: null,
          reason: 'Read status only',
        },
        principal: scenario.principal,
        policy,
        twin: scenario.initialTwin,
      },
      signal,
    );
    const critical = await reasoner.plan(
      {
        command: scenario.command,
        principal: scenario.principal,
        policy,
        twin: scenario.initialTwin,
      },
      signal,
    );
    expect(low.selectedTools).toEqual(['NUMBER_VERIFICATION']);
    expect(critical.selectedTools).toHaveLength(5);
    expect(critical.selectedTools.length).toBeGreaterThan(low.selectedTools.length);
  });

  it('uses a validated deterministic fallback for malformed model output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ output: { invented: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const reasoner = new FallbackAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'structured-model' },
      200,
      1,
    );
    const plan = await reasoner.plan(
      {
        command: scenario.command,
        principal: scenario.principal,
        policy,
        twin: scenario.initialTwin,
      },
      new AbortController().signal,
    );
    expect(plan.reasoningProvenance).toBe('FALLBACK');
    expect(plan.selectedTools).toEqual(policy.commands.SET_PRESSURE.requiredEvidence);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back when a valid-shaped live plan omits required critical evidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            output: {
              risk: 'CRITICAL',
              consequence: 'A valid but insufficient critical evidence plan.',
              selectedTools: ['NUMBER_VERIFICATION'],
              selectionReasons: { NUMBER_VERIFICATION: 'Confirm the enrolled number.' },
            },
          }),
      }),
    );
    const reasoner = new FallbackAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'structured-model' },
      200,
    );
    const plan = await reasoner.plan(
      {
        command: scenario.command,
        principal: scenario.principal,
        policy,
        twin: scenario.initialTwin,
      },
      new AbortController().signal,
    );
    expect(plan.reasoningProvenance).toBe('FALLBACK');
    expect(plan.selectedTools).toEqual(policy.commands.SET_PRESSURE.requiredEvidence);
  });
});
