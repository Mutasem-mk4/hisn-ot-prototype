import { z } from 'zod';
import type {
  AgentPlanRequest,
  AgentReasoner,
  AgentRecommendationRequest,
} from '../application/ports.js';
import { failedEvidencePolicies } from '../domain/evidence.js';
import {
  AgentPlanSchema,
  AgentRecommendationSchema,
  type AgentPlan,
  type AgentRecommendation,
  type Command,
  type DecisionState,
  type EvidenceTool,
} from '../shared/contracts.js';
import type { LlmCredentials } from './configuration.js';

const CONSEQUENCES: Record<Command['kind'], string> = {
  READ_STATUS: 'Observes process state without changing the physical operating envelope.',
  SET_PRESSURE:
    'May change membrane and pump pressure, affecting equipment integrity and water production.',
};

const TOOL_REASONS: Record<EvidenceTool, string> = {
  NUMBER_VERIFICATION: 'Bind the session to the enrolled operator number.',
  SIM_SWAP: 'Detect subscription takeover before privileged control.',
  DEVICE_SWAP: 'Detect an unexpected handset or gateway change.',
  LOCATION_VERIFICATION: 'Require presence inside the approved facility boundary.',
  DEVICE_REACHABILITY: 'Confirm attachment to the expected mobile data network.',
};

const LiveAgentPlanSchema = AgentPlanSchema.omit({ reasoningProvenance: true });
const LiveAgentRecommendationSchema = AgentRecommendationSchema.omit({ reasoningProvenance: true });

export class DeterministicAgentReasoner implements AgentReasoner {
  readonly mode = 'DETERMINISTIC' as const;

  plan(request: AgentPlanRequest, signal: AbortSignal) {
    signal.throwIfAborted();
    const commandPolicy = request.policy.commands[request.command.kind];
    const selectedTools = commandPolicy.requiredEvidence.filter((tool) =>
      request.policy.agent.allowedTools.includes(tool),
    );
    const boundedTools = selectedTools.slice(0, request.policy.agent.maximumToolCalls);
    return Promise.resolve(
      AgentPlanSchema.parse({
        risk: commandPolicy.risk,
        consequence: CONSEQUENCES[request.command.kind],
        selectedTools: boundedTools,
        selectionReasons: Object.fromEntries(
          boundedTools.map((tool) => [tool, TOOL_REASONS[tool]]),
        ),
        reasoningProvenance: 'SIMULATED',
      }),
    );
  }

  recommend(request: AgentRecommendationRequest, signal: AbortSignal) {
    signal.throwIfAborted();
    const signals = failedEvidencePolicies(request.evidence, request.policy);
    const recommendedDecision = recommendationState(request, signals.length);
    return Promise.resolve(
      AgentRecommendationSchema.parse({
        recommendedDecision,
        summary: recommendationSummary(request.command, recommendedDecision, signals.length),
        observedSignals: signals.length > 0 ? signals : ['All requested evidence satisfied policy'],
        containmentRationale:
          recommendedDecision === 'BLOCK_AND_CONTAIN'
            ? 'Isolate only the implicated gateway while preserving the trusted backup path.'
            : 'Containment is not proportionate for the observed evidence state.',
        reasoningProvenance: 'SIMULATED',
      }),
    );
  }
}

export class FallbackAgentReasoner implements AgentReasoner {
  readonly mode = 'LIVE_LLM' as const;
  private readonly fallback = new DeterministicAgentReasoner();

  constructor(
    private readonly credentials: LlmCredentials,
    private readonly timeoutMs: number,
    private readonly maximumRetries = 0,
  ) {}

  async plan(request: AgentPlanRequest, signal: AbortSignal): Promise<AgentPlan> {
    try {
      const output = await this.request('PLAN', request, constrainedPlanSchema(request), signal);
      return AgentPlanSchema.parse({ ...output, reasoningProvenance: 'LIVE' });
    } catch (error) {
      if (signal.aborted || !isRecoverableReasonerFailure(error)) throw error;
      const result = await this.fallback.plan(request, signal);
      return { ...result, reasoningProvenance: 'FALLBACK' };
    }
  }

  async recommend(
    request: AgentRecommendationRequest,
    signal: AbortSignal,
  ): Promise<AgentRecommendation> {
    try {
      const output = await this.request(
        'RECOMMEND',
        request,
        LiveAgentRecommendationSchema,
        signal,
      );
      return AgentRecommendationSchema.parse({ ...output, reasoningProvenance: 'LIVE' });
    } catch (error) {
      if (signal.aborted || !isRecoverableReasonerFailure(error)) throw error;
      const result = await this.fallback.recommend(request, signal);
      return { ...result, reasoningProvenance: 'FALLBACK' };
    }
  }

  private async request<T>(
    task: 'PLAN' | 'RECOMMEND',
    input: AgentPlanRequest | AgentRecommendationRequest,
    schema: z.ZodType<T>,
    signal: AbortSignal,
  ): Promise<T> {
    let lastFailure: unknown;
    for (let attempt = 0; attempt <= this.maximumRetries; attempt += 1) {
      try {
        return await this.requestOnce(task, input, schema, signal);
      } catch (error) {
        if (signal.aborted || !isRecoverableReasonerFailure(error)) throw error;
        lastFailure = error;
      }
    }
    throw lastFailure;
  }

  private async requestOnce<T>(
    task: 'PLAN' | 'RECOMMEND',
    input: AgentPlanRequest | AgentRecommendationRequest,
    schema: z.ZodType<T>,
    signal: AbortSignal,
  ): Promise<T> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    const response = await fetch(this.credentials.baseUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.credentials.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.credentials.model,
        task,
        guardrails: {
          toolAllowlist: input.policy.agent.allowedTools,
          maximumToolCalls: input.policy.agent.maximumToolCalls,
          noPhysicalAuthority: true,
          untrustedFields: ['input.command.reason'],
        },
        input: redactAgentInput(input),
      }),
      signal: combined,
    });
    if (!response.ok)
      throw new TypeError(`Structured reasoning endpoint returned ${response.status}`);
    const body = z
      .object({ output: z.unknown() })
      .strict()
      .parse(await response.json());
    return schema.parse(body.output);
  }
}

function constrainedPlanSchema(request: AgentPlanRequest) {
  const commandPolicy = request.policy.commands[request.command.kind];
  return LiveAgentPlanSchema.superRefine((plan, context) => {
    if (plan.risk !== commandPolicy.risk) {
      context.addIssue({ code: 'custom', message: 'Plan risk does not match command policy' });
    }
    if (plan.selectedTools.length > request.policy.agent.maximumToolCalls) {
      context.addIssue({ code: 'custom', message: 'Plan exceeds the maximum tool-call budget' });
    }
    if (new Set(plan.selectedTools).size !== plan.selectedTools.length) {
      context.addIssue({ code: 'custom', message: 'Plan contains duplicate evidence tools' });
    }
    for (const tool of plan.selectedTools) {
      if (!request.policy.agent.allowedTools.includes(tool)) {
        context.addIssue({ code: 'custom', message: `${tool} is outside the tool allowlist` });
      }
      if (!plan.selectionReasons[tool]) {
        context.addIssue({ code: 'custom', message: `${tool} is missing a selection reason` });
      }
    }
    for (const tool of commandPolicy.requiredEvidence) {
      if (!plan.selectedTools.includes(tool)) {
        context.addIssue({ code: 'custom', message: `${tool} is required by command policy` });
      }
    }
  });
}

function isRecoverableReasonerFailure(error: unknown): boolean {
  return (
    error instanceof z.ZodError ||
    error instanceof TypeError ||
    error instanceof SyntaxError ||
    (error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name))
  );
}

function recommendationState(
  request: AgentRecommendationRequest,
  anomalies: number,
): DecisionState {
  if (!request.safety.permitted && anomalies >= request.policy.containment.criticalAnomalyCount) {
    return 'BLOCK_AND_CONTAIN';
  }
  if (
    !request.safety.permitted ||
    request.evidence.some((call) => call.requestStatus !== 'SUCCEEDED')
  ) {
    return 'BLOCK';
  }
  if (anomalies >= request.policy.containment.criticalAnomalyCount) return 'BLOCK_AND_CONTAIN';
  if (anomalies === 1) return 'STEP_UP';
  return 'ALLOW';
}

function recommendationSummary(
  command: Command,
  decision: DecisionState,
  anomalyCount: number,
): string {
  const target =
    command.requestedSetpointPercent === null
      ? command.kind
      : `${command.requestedSetpointPercent}% pressure`;
  return `${decision}: ${target} evaluated against physical policy and ${anomalyCount} network-context anomaly signals.`;
}

function redactAgentInput(input: AgentPlanRequest | AgentRecommendationRequest) {
  return {
    command: input.command,
    principal: { role: input.principal.role, credentialsValid: input.principal.credentialsValid },
    policy: input.policy,
    twin: {
      actualPressurePercent: input.twin.actualPressurePercent,
      gatewayAttachment: input.twin.gatewayAttachment,
      activeController: input.twin.activeController,
    },
    ...('evidence' in input
      ? {
          evidence: input.evidence.map((call) => ({
            tool: call.tool,
            status: call.requestStatus,
            result: call.redactedResult,
            provenance: call.provenance,
          })),
          safety: input.safety,
        }
      : {}),
  };
}
