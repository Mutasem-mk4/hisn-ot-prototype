import type {
  AgentPlan,
  Command,
  EvidenceCall,
  EvidenceTool,
  Policy,
} from '../shared/contracts.js';
import { assessEvidence } from './evidence.js';

export function minimumEvidenceForCommand(command: Command, policy: Policy) {
  return [...policy.commands[command.kind].requiredEvidence];
}

export function evidenceFloorForInvestigation(
  command: Command,
  policy: Policy,
  evidence: EvidenceCall[],
): EvidenceTool[] {
  const required = minimumEvidenceForCommand(command, policy);
  if (command.kind !== 'SET_PRESSURE' || evidence.length === 0) return required;

  const assessment = assessEvidence(evidence, policy);
  if (assessment.failures.length === 0) return required;

  return [...new Set([...required, 'SIM_SWAP' as const, 'DEVICE_SWAP' as const])];
}

export function assertPlanAssurance(
  plan: Omit<AgentPlan, 'reasoningProvenance'>,
  command: Command,
  policy: Policy,
): void {
  const commandPolicy = policy.commands[command.kind];
  const requiredEvidence = minimumEvidenceForCommand(command, policy);
  if (
    plan.risk !== commandPolicy.risk ||
    plan.selectedTools.length > policy.agent.maximumToolCalls ||
    new Set(plan.selectedTools).size !== plan.selectedTools.length ||
    plan.selectedTools.some(
      (tool) => !policy.agent.allowedTools.includes(tool) || !plan.selectionReasons[tool],
    ) ||
    requiredEvidence.some((tool) => !plan.selectedTools.includes(tool))
  ) {
    throw new TypeError('Agent plan violates server assurance policy');
  }
}

export function assertInvestigationAssurance(
  plan: Omit<AgentPlan, 'reasoningProvenance'>,
  command: Command,
  policy: Policy,
  evidence: EvidenceCall[],
): void {
  assertPlanAssurance(plan, command, policy);
  const requiredEvidence = evidenceFloorForInvestigation(command, policy, evidence);
  if (requiredEvidence.some((tool) => !plan.selectedTools.includes(tool))) {
    throw new TypeError('Agent investigation stopped before adaptive evidence was complete');
  }
}
