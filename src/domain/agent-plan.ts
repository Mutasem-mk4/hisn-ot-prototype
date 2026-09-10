import type { AgentPlan, Command, Policy } from '../shared/contracts.js';

export function assertPlanAssurance(
  plan: Omit<AgentPlan, 'reasoningProvenance'>,
  command: Command,
  policy: Policy,
): void {
  const required = policy.commands[command.kind];
  if (
    plan.risk !== required.risk ||
    plan.selectedTools.length > policy.agent.maximumToolCalls ||
    new Set(plan.selectedTools).size !== plan.selectedTools.length ||
    plan.selectedTools.some(
      (tool) => !policy.agent.allowedTools.includes(tool) || !plan.selectionReasons[tool],
    ) ||
    required.requiredEvidence.some((tool) => !plan.selectedTools.includes(tool))
  ) {
    throw new TypeError('Agent plan violates server assurance policy');
  }
}
