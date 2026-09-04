import type {
  AgentRecommendation,
  Command,
  DecisionRecord,
  DecisionState,
  EvidenceCall,
  Policy,
  Principal,
  SafetyEvaluation,
} from '../shared/contracts.js';
import { evidenceSummary, failedEvidencePolicies } from './evidence.js';

type DecisionInput = {
  command: Command;
  principal: Principal;
  evidence: EvidenceCall[];
  safety: SafetyEvaluation;
  recommendation: AgentRecommendation;
  policy: Policy;
};

export function issueDecision(input: DecisionInput): DecisionRecord {
  const missingEvidence = missingRequiredEvidence(input);
  const failedPolicies = [
    ...failedEvidencePolicies(input.evidence, input.policy),
    ...missingEvidence.map((tool) => `${tool} required evidence was not collected`),
  ];
  const state = policyDecisionState(input, failedPolicies.length, missingEvidence.length > 0);
  return {
    state,
    requestedAction: requestedAction(input.command),
    evidenceSummary: evidenceSummary(input.evidence),
    failedPolicies,
    failedLimits: input.safety.failedLimits,
    containmentRationale: containmentRationale(state, input.recommendation, failedPolicies.length),
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
  if (!input.safety.permitted && anomalyCount >= input.policy.containment.criticalAnomalyCount) {
    return 'BLOCK_AND_CONTAIN';
  }
  if (!input.safety.permitted) return 'BLOCK';
  if (missingRequiredEvidence || hasUnavailableEvidence(input.evidence))
    return input.policy.evidence.criticalMissingEvidenceDecision;
  if (anomalyCount >= input.policy.containment.criticalAnomalyCount) return 'BLOCK_AND_CONTAIN';
  if (anomalyCount === 1) return 'STEP_UP';
  return 'ALLOW';
}

function missingRequiredEvidence(input: DecisionInput) {
  const collected = new Set(input.evidence.map((call) => call.tool));
  return input.policy.commands[input.command.kind].requiredEvidence.filter(
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

function containmentRationale(
  state: DecisionState,
  recommendation: AgentRecommendation,
  anomalyCount: number,
): string {
  if (state !== 'BLOCK_AND_CONTAIN') return recommendation.containmentRationale;
  return `Targeted containment is proportionate because ${anomalyCount} network-context controls failed while a safety-critical command was held.`;
}
