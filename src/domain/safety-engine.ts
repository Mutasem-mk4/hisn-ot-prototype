import type { Command, Policy, SafetyEvaluation } from '../shared/contracts.js';

export function evaluatePhysicalSafety(command: Command, policy: Policy): SafetyEvaluation {
  const commandPolicy = policy.commands[command.kind];
  const configuredMaximum = commandPolicy.maximumSetpointPercent;
  const requestedSetpoint = command.requestedSetpointPercent;
  const exceedsMaximum =
    configuredMaximum !== null &&
    requestedSetpoint !== null &&
    requestedSetpoint > configuredMaximum;

  return {
    permitted: !exceedsMaximum,
    policyVersion: policy.policyVersion,
    configuredMaximumPercent: configuredMaximum,
    requestedSetpointPercent: requestedSetpoint,
    failedLimits: exceedsMaximum
      ? [`Requested ${requestedSetpoint}% exceeds configured maximum ${configuredMaximum}%`]
      : [],
  };
}
