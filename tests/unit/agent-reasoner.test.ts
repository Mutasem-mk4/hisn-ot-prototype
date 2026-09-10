import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeterministicAgentReasoner,
  HostedAgentReasoner,
} from '../../src/infrastructure/agent-reasoners.js';
import { evaluatePhysicalSafety } from '../../src/domain/safety-engine.js';
import { evidenceCall, testPolicy, testScenario } from '../helpers/fixtures.js';

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

  it('accepts a policy-complete hosted plan from a chat completion', async () => {
    const deterministicPlan = await new DeterministicAgentReasoner().plan(
      {
        command: scenario.command,
        principal: scenario.principal,
        policy,
        twin: scenario.initialTwin,
      },
      new AbortController().signal,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    ...deterministicPlan,
                    reasoningProvenance: undefined,
                  }),
                },
              },
            ],
          }),
      }),
    );
    const reasoner = new HostedAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'hosted-model' },
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

    expect(plan.reasoningProvenance).toBe('LIVE');
    expect(plan.selectedTools).toEqual(policy.commands.SET_PRESSURE.requiredEvidence);
  });

  it('uses a validated deterministic fallback for malformed model output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ invented: true }) } }],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const reasoner = new HostedAgentReasoner(
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
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: 'CRITICAL',
                    consequence: 'A valid but insufficient critical evidence plan.',
                    selectedTools: ['NUMBER_VERIFICATION'],
                    selectionReasons: {
                      NUMBER_VERIFICATION: 'Confirm the enrolled number.',
                    },
                  }),
                },
              },
            ],
          }),
      }),
    );
    const reasoner = new HostedAgentReasoner(
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

  it('rejects a hosted recommendation that weakens required containment', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    recommendedDecision: 'BLOCK',
                    summary: 'Block the unsafe request after evaluating compromised evidence.',
                    observedSignals: ['Multiple critical network-context anomalies'],
                    containmentRationale: 'Containment is required by deterministic policy.',
                  }),
                },
              },
            ],
          }),
      }),
    );
    const evidence = policy.commands.SET_PRESSURE.requiredEvidence.map((tool) => {
      const fixture = scenario.evidence[tool];
      return evidenceCall(tool, fixture.redacted, fixture.status);
    });
    const reasoner = new HostedAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'hosted-model' },
      200,
    );

    const recommendation = await reasoner.recommend(
      {
        command: scenario.command,
        principal: scenario.principal,
        policy,
        twin: scenario.initialTwin,
        evidence,
        safety: evaluatePhysicalSafety(scenario.command, policy),
      },
      new AbortController().signal,
    );

    expect(recommendation.reasoningProvenance).toBe('FALLBACK');
    expect(recommendation.recommendedDecision).toBe('BLOCK_AND_CONTAIN');
  });
});
