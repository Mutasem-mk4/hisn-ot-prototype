import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeterministicAgentReasoner,
  LangGraphAgentReasoner,
} from '../../src/infrastructure/agent-reasoners.js';
import { evaluatePhysicalSafety } from '../../src/domain/safety-engine.js';
import {
  evidenceFloorForInvestigation,
  minimumEvidenceForCommand,
} from '../../src/domain/agent-plan.js';
import { issueDecision } from '../../src/domain/decision-engine.js';
import { evidenceCall, testPolicy, testScenario } from '../helpers/fixtures.js';

const scenario = testScenario();
const policy = testPolicy();

describe('bounded evidence planning', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('scales the evidence floor with command consequence', async () => {
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
    const elevated = await reasoner.plan(
      {
        command: { ...scenario.command, requestedSetpointPercent: 52.01 },
        principal: scenario.principal,
        policy,
        twin: scenario.initialTwin,
      },
      signal,
    );
    expect(low.selectedTools).toEqual(['DEVICE_REACHABILITY']);
    expect(critical.selectedTools).toEqual(['LOCATION_VERIFICATION', 'DEVICE_REACHABILITY']);
    expect(elevated.selectedTools).toEqual([
      'LOCATION_VERIFICATION',
      'DEVICE_REACHABILITY',
      'SIM_SWAP',
      'DEVICE_SWAP',
    ]);
    expect(critical.selectedTools).not.toContain('NUMBER_VERIFICATION');
    expect(critical.selectedTools.length).toBeGreaterThan(low.selectedTools.length);
  });

  it('adapts its LangGraph tool plan after observing earlier evidence', async () => {
    const attackRequest = {
      command: scenario.command,
      principal: scenario.principal,
      policy,
      twin: scenario.initialTwin,
    };
    const initialPlan = await new DeterministicAgentReasoner().plan(
      attackRequest,
      new AbortController().signal,
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        groqResponse({
          content: null,
          tool_calls: [
            {
              id: 'call-location',
              type: 'function',
              function: {
                name: 'verify_facility_location',
                arguments: JSON.stringify({
                  reason: 'Confirm the operator is inside the approved facility geofence.',
                }),
              },
            },
            {
              id: 'call-sim-swap-premature',
              type: 'function',
              function: {
                name: 'check_recent_sim_swap',
                arguments: JSON.stringify({
                  reason: 'Check for takeover before any baseline observation is available.',
                }),
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        groqResponse({
          content: null,
          tool_calls: [
            {
              id: 'call-reachability',
              type: 'function',
              function: {
                name: 'get_device_reachability',
                arguments: JSON.stringify({
                  reason: 'Confirm the operator device remains attached to mobile data.',
                }),
              },
            },
            {
              id: 'call-sim-swap',
              type: 'function',
              function: {
                name: 'check_recent_sim_swap',
                arguments: JSON.stringify({
                  reason: 'Investigate subscription takeover after the failed location check.',
                }),
              },
            },
            {
              id: 'call-device-swap',
              type: 'function',
              function: {
                name: 'check_recent_device_swap',
                arguments: JSON.stringify({
                  reason: 'Investigate endpoint replacement after the failed location check.',
                }),
              },
            },
          ],
        }),
      )
      .mockImplementation(() =>
        Promise.resolve(
          groqResponse({ content: 'The escalated network investigation is complete.' }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const reasoner = new LangGraphAgentReasoner(
      {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'redacted-key',
        model: 'openai/gpt-oss-20b',
      },
      500,
    );
    const executor = vi.fn((tool) => {
      const observations = {
        LOCATION_VERIFICATION: { verificationResult: 'FALSE' },
        DEVICE_REACHABILITY: { reachable: true, connectivity: ['DATA'] },
        SIM_SWAP: { swapped: true, windowHours: 72 },
        DEVICE_SWAP: { swapped: true, windowHours: 168 },
        NUMBER_VERIFICATION: { verified: true },
      };
      return Promise.resolve(evidenceCall(tool, observations[tool]));
    });

    const investigation = await reasoner.investigate(
      attackRequest,
      initialPlan,
      executor,
      new AbortController().signal,
    );

    expect(investigation.framework).toBe('LANGGRAPH');
    expect(investigation.plan.reasoningProvenance).toBe('LIVE');
    expect(investigation.plan.selectedTools).toEqual([
      'LOCATION_VERIFICATION',
      'DEVICE_REACHABILITY',
      'SIM_SWAP',
      'DEVICE_SWAP',
    ]);
    expect(executor).toHaveBeenCalledTimes(4);
    expect(investigation.trace.map((step) => step.phase)).toContain('TOOL_REQUEST');
    expect(investigation.trace.map((step) => step.phase)).toContain('OBSERVATION');
    expect(investigation.trace.map((step) => step.phase)).toContain('ADAPTATION');
    const locationObservation = investigation.trace.findIndex(
      (step) => step.phase === 'OBSERVATION' && step.tool === 'LOCATION_VERIFICATION',
    );
    const adaptiveExpansion = investigation.trace.findIndex(
      (step) => step.headline === 'Suspicious observation expanded the evidence plan',
    );
    const simRequest = investigation.trace.findIndex(
      (step) => step.phase === 'TOOL_REQUEST' && step.tool === 'SIM_SWAP',
    );
    const deferredEscalation = investigation.trace.findIndex(
      (step) => step.headline === 'Escalation deferred pending baseline evidence',
    );
    expect(deferredEscalation).toBeLessThan(locationObservation);
    expect(locationObservation).toBeLessThan(adaptiveExpansion);
    expect(adaptiveExpansion).toBeLessThan(simRequest);
  });

  it('returns control to the model when it stops before the evidence floor', async () => {
    const lowRequest = {
      command: {
        kind: 'READ_STATUS' as const,
        requestedSetpointPercent: null,
        reason: 'Read status only',
      },
      principal: scenario.principal,
      policy,
      twin: scenario.initialTwin,
    };
    const initialPlan = await new DeterministicAgentReasoner().plan(
      lowRequest,
      new AbortController().signal,
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(groqResponse({ content: 'No tool is needed.' }))
        .mockResolvedValueOnce(
          groqResponse({
            content: null,
            tool_calls: [
              {
                id: 'call-reachability-after-reminder',
                type: 'function',
                function: {
                  name: 'get_device_reachability',
                  arguments: JSON.stringify({
                    reason: 'Complete the required reachability floor before concluding.',
                  }),
                },
              },
            ],
          }),
        )
        .mockResolvedValueOnce(groqResponse({ content: 'Required evidence is complete.' })),
    );
    const reasoner = new LangGraphAgentReasoner(
      {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'redacted-key',
        model: 'openai/gpt-oss-20b',
      },
      500,
    );
    const executor = vi.fn((tool) =>
      Promise.resolve(evidenceCall(tool, { reachable: true, connectivity: ['DATA'] })),
    );

    const investigation = await reasoner.investigate(
      lowRequest,
      initialPlan,
      executor,
      new AbortController().signal,
    );

    expect(investigation.framework).toBe('LANGGRAPH');
    expect(investigation.plan.selectedTools).toEqual(['DEVICE_REACHABILITY']);
    expect(investigation.trace.map((step) => step.phase)).not.toContain('FALLBACK');
    expect(investigation.trace.map((step) => step.headline)).toContain(
      'Agent identified an incomplete evidence floor',
    );
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('does not substitute tool calls when the hosted agent leaves the evidence floor incomplete', async () => {
    const lowRequest = {
      command: {
        kind: 'READ_STATUS' as const,
        requestedSetpointPercent: null,
        reason: 'Read status only',
      },
      principal: scenario.principal,
      policy,
      twin: scenario.initialTwin,
    };
    const initialPlan = await new DeterministicAgentReasoner().plan(
      lowRequest,
      new AbortController().signal,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(groqResponse({ content: 'No tool is needed.' })),
    );
    const reasoner = new LangGraphAgentReasoner(
      {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'redacted-key',
        model: 'openai/gpt-oss-20b',
      },
      500,
    );
    const executor = vi.fn((tool) =>
      Promise.resolve(evidenceCall(tool, { reachable: true, connectivity: ['DATA'] })),
    );

    await expect(
      reasoner.investigate(lowRequest, initialPlan, executor, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'AGENT_UNAVAILABLE' });
    expect(executor).not.toHaveBeenCalled();
  });

  it('executes bounded parallel model suggestions', async () => {
    const lowRequest = {
      command: {
        kind: 'READ_STATUS' as const,
        requestedSetpointPercent: null,
        reason: 'Read status only',
      },
      principal: scenario.principal,
      policy,
      twin: scenario.initialTwin,
    };
    const initialPlan = await new DeterministicAgentReasoner().plan(
      lowRequest,
      new AbortController().signal,
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          groqResponse({
            content: null,
            tool_calls: [
              {
                id: 'call-reachability-first',
                type: 'function',
                function: {
                  name: 'get_device_reachability',
                  arguments: JSON.stringify({
                    reason: 'Collect the required current attachment signal first.',
                  }),
                },
              },
              {
                id: 'call-number-parallel',
                type: 'function',
                function: {
                  name: 'verify_operator_number',
                  arguments: JSON.stringify({
                    reason: 'Also verify identity in the same model turn.',
                  }),
                },
              },
            ],
          }),
        )
        .mockResolvedValueOnce(groqResponse({ content: 'The required signal is reassuring.' })),
    );
    const reasoner = new LangGraphAgentReasoner(
      {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'redacted-key',
        model: 'openai/gpt-oss-20b',
      },
      500,
    );
    const executor = vi.fn((tool) =>
      Promise.resolve(evidenceCall(tool, { reachable: true, connectivity: ['DATA'] })),
    );

    const investigation = await reasoner.investigate(
      lowRequest,
      initialPlan,
      executor,
      new AbortController().signal,
    );

    expect(investigation.plan.selectedTools).toEqual([
      'DEVICE_REACHABILITY',
      'NUMBER_VERIFICATION',
    ]);
    expect(investigation.trace.map((step) => step.headline)).toContain(
      'Independent evidence calls batched',
    );
    expect(executor).toHaveBeenCalledTimes(2);
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
    const reasoner = new LangGraphAgentReasoner(
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
    expect(plan.selectedTools).toEqual(minimumEvidenceForCommand(scenario.command, policy));
  });

  it('fails closed when hosted planning returns malformed output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ invented: true }) } }],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const reasoner = new LangGraphAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'structured-model' },
      200,
      1,
    );
    await expect(
      reasoner.plan(
        {
          command: scenario.command,
          principal: scenario.principal,
          policy,
          twin: scenario.initialTwin,
        },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'AGENT_UNAVAILABLE' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails closed after the hosted planning deadline expires', async () => {
    const timeout = new DOMException('Hosted reasoning deadline expired', 'TimeoutError');
    const fetchMock = vi.fn().mockRejectedValue(timeout);
    vi.stubGlobal('fetch', fetchMock);
    const reasoner = new LangGraphAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'hosted-model' },
      10,
    );
    const expiredSignal = AbortSignal.abort(timeout);

    await expect(
      reasoner.plan(
        {
          command: scenario.command,
          principal: scenario.principal,
          policy,
          twin: scenario.initialTwin,
        },
        expiredSignal,
      ),
    ).rejects.toMatchObject({ code: 'AGENT_UNAVAILABLE' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves a Groq quota failure without immediately sending another paid request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: 'Rate limit reached on tokens per day. Organization: private-org-id',
          },
        }),
        { status: 429 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const reasoner = new LangGraphAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'test-key', model: 'test-model' },
      200,
      1,
    );
    await expect(
      reasoner.plan(
        {
          command: scenario.command,
          principal: scenario.principal,
          policy,
          twin: scenario.initialTwin,
        },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({
      code: 'AGENT_UNAVAILABLE',
      context: { failureReason: 'HTTP_429', quotaType: 'TOKENS_PER_DAY' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a valid-shaped plan omits required critical evidence', async () => {
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
    const reasoner = new LangGraphAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'structured-model' },
      200,
    );
    await expect(
      reasoner.plan(
        {
          command: scenario.command,
          principal: scenario.principal,
          policy,
          twin: scenario.initialTwin,
        },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'AGENT_UNAVAILABLE' });
  });

  it('accepts an allowlisted live plan that adds proportionate evidence', async () => {
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
                    risk: 'LOW',
                    consequence: 'Read the current process state without changing control state.',
                    selectedTools: ['DEVICE_REACHABILITY', 'NUMBER_VERIFICATION'],
                    selectionReasons: {
                      DEVICE_REACHABILITY: 'Confirm mobile data reachability.',
                      NUMBER_VERIFICATION: 'Add an unnecessary identity check.',
                    },
                  }),
                },
              },
            ],
          }),
      }),
    );
    const reasoner = new LangGraphAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'hosted-model' },
      200,
    );

    const plan = await reasoner.plan(
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
      new AbortController().signal,
    );

    expect(plan.reasoningProvenance).toBe('LIVE');
    expect(plan.selectedTools).toEqual(['DEVICE_REACHABILITY', 'NUMBER_VERIFICATION']);
  });

  it('records independent model advice while policy still requires containment', async () => {
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
    const baselineEvidence = minimumEvidenceForCommand(scenario.command, policy).map((tool) => {
      const fixture = scenario.evidence[tool];
      return evidenceCall(tool, fixture.redacted, fixture.status);
    });
    const evidence = evidenceFloorForInvestigation(scenario.command, policy, baselineEvidence).map(
      (tool) => {
        const fixture = scenario.evidence[tool];
        return evidenceCall(tool, fixture.redacted, fixture.status);
      },
    );
    const reasoner = new LangGraphAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'hosted-model' },
      200,
    );

    const advice = await reasoner.recommend(
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
    expect(advice.recommendedDecision).toBe('BLOCK');
    expect(advice.reasoningProvenance).toBe('LIVE');
    expect(
      issueDecision({
        command: scenario.command,
        principal: scenario.principal,
        policy,
        evidence,
        safety: evaluatePhysicalSafety(scenario.command, policy),
        recommendation: advice,
      }).state,
    ).toBe('BLOCK_AND_CONTAIN');
  });
});

function groqResponse(message: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      id: 'completion-test',
      object: 'chat.completion',
      created: 1,
      model: 'openai/gpt-oss-20b',
      choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
