import type { AgentPlan, Command, Policy } from '../shared/contracts.js';

export function minimumEvidenceForCommand(command: Command, policy: Policy) {
  const required = [...policy.commands[command.kind].requiredEvidence];
  if (
    command.kind === 'SET_PRESSURE' &&
    command.requestedSetpointPercent !== null &&
    command.requestedSetpointPercent > policy.safePressureBand.maximumPercent
  ) {
    for (const contextualTool of ['SIM_SWAP', 'DEVICE_SWAP'] as const) {
      if (!required.includes(contextualTool)) required.push(contextualTool);
    }
  }
  return required;
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
