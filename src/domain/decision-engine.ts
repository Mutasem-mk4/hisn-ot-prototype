import type {
  AgentRecommendation,
  Command,
  DecisionRecord,
  DecisionState,
  EvidenceCall,
  Policy,
  Principal,
  RuntimeMode,
  SafetyEvaluation,
} from '../shared/contracts.js';
import { assessEvidence, evidenceSummary } from './evidence.js';
import { evaluatePhysicalSafety } from './safety-engine.js';
import { evidenceFloorForInvestigation } from './agent-plan.js';

type DecisionInput = {
  command: Command;
  principal: Principal;
  evidence: EvidenceCall[];
  safety: SafetyEvaluation;
  recommendation: AgentRecommendation;
  policy: Policy;
  evidenceMode?: RuntimeMode;
};

export function issueDecision(input: DecisionInput): DecisionRecord {
  input = { ...input, safety: evaluatePhysicalSafety(input.command, input.policy) };
  const assessment = assessEvidence(input.evidence, input.policy);
  const missingEvidence = missingRequiredEvidence(input);
  const untrustedProvenance =
    input.evidenceMode && input.evidenceMode !== 'DEMO'
      ? input.evidence.filter((call) => call.provenance !== input.evidenceMode)
      : [];
  const failedPolicies = [
    ...(!input.principal.credentialsValid ? ['Principal credentials invalid'] : []),
    ...(input.command.kind === 'SET_PRESSURE' && input.principal.role === 'VIEWER'
      ? ['Role is not authorized for control']
      : []),
    ...assessment.failures,
    ...assessment.unknown,
    ...missingEvidence.map((tool) => `${tool} required evidence was not collected`),
    ...untrustedProvenance.map(
      (call) =>
        `${call.tool}: ${call.provenance} cannot satisfy ${input.evidenceMode} verification`,
    ),
  ];
  const state = policyDecisionState(
    input,
    assessment.compromised.length,
    untrustedProvenance.length > 0 ||
      missingEvidence.length > 0 ||
      assessment.unknown.length > 0 ||
      assessment.failures.length > assessment.compromised.length,
  );
  return {
    state,
    requestedAction: requestedAction(input.command),
    evidenceSummary: evidenceSummary(input.evidence),
    failedPolicies,
    failedLimits: input.safety.failedLimits,
    containmentRationale: containmentRationale(state, assessment.compromised.length),
    recoveryRequirements: state === 'ALLOW' ? [] : input.policy.containment.recoveryRequirements,
    authoritativeSource: 'DETERMINISTIC_POLICY_ENGINE',
  };
}

function policyDecisionState(
  input: DecisionInput,
  anomalyCount: number,
  missingRequiredEvidence: boolean,
): DecisionState {
  if (!input.principal.credentialsValid) return 'BLOCK';
  if (input.command.kind === 'SET_PRESSURE' && input.principal.role === 'VIEWER') return 'BLOCK';
  if (missingRequiredEvidence || hasUnavailableEvidence(input.evidence)) return 'BLOCK';
  if (input.command.kind === 'READ_STATUS') return anomalyCount > 0 ? 'BLOCK' : 'ALLOW';
  if (!input.safety.permitted && anomalyCount >= input.policy.containment.criticalAnomalyCount) {
    return 'BLOCK_AND_CONTAIN';
  }
  if (!input.safety.permitted) return 'BLOCK';
  if (anomalyCount >= input.policy.containment.criticalAnomalyCount) return 'BLOCK_AND_CONTAIN';
  if (anomalyCount === 1) return 'STEP_UP';
  return 'ALLOW';
}

function missingRequiredEvidence(input: DecisionInput) {
  const collected = new Set(input.evidence.map((call) => call.tool));
  return evidenceFloorForInvestigation(input.command, input.policy, input.evidence).filter(
    (tool) => !collected.has(tool),
  );
}

function hasUnavailableEvidence(evidence: EvidenceCall[]): boolean {
  return evidence.some((call) => call.requestStatus !== 'SUCCEEDED');
}

function requestedAction(command: Command): string {
  return command.kind === 'SET_PRESSURE'
    ? `Set pressure to ${command.requestedSetpointPercent}%`
    : 'Read current process status';
}

function containmentRationale(state: DecisionState, anomalyCount: number): string {
  if (state !== 'BLOCK_AND_CONTAIN')
    return 'No containment authorized by deterministic policy; uncertainty alone is not evidence of compromise.';
  return `Targeted containment is proportionate because ${anomalyCount} network-context controls failed while a safety-critical command was held.`;
}
