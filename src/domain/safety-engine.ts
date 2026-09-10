import type { Command, Policy, SafetyEvaluation } from '../shared/contracts.js';

export function evaluatePhysicalSafety(command: Command, policy: Policy): SafetyEvaluation {
  const commandPolicy = policy.commands[command.kind];
  const configuredMaximum = commandPolicy.maximumSetpointPercent;
  const requestedSetpoint = command.requestedSetpointPercent;
  const exceedsMaximum =
    configuredMaximum !== null &&
    requestedSetpoint !== null &&
    requestedSetpoint > configuredMaximum;
  const invalid =
    command.kind === 'SET_PRESSURE' &&
    (requestedSetpoint === null ||
      !Number.isFinite(requestedSetpoint) ||
      requestedSetpoint < 0 ||
      configuredMaximum === null);

  return {
    permitted: !invalid && !exceedsMaximum,
    policyVersion: policy.policyVersion,
    configuredMaximumPercent: configuredMaximum,
    requestedSetpointPercent: requestedSetpoint,
    failedLimits: invalid
      ? ['SET_PRESSURE requires a finite nonnegative setpoint and configured maximum']
      : exceedsMaximum
        ? [`Requested ${requestedSetpoint}% exceeds configured maximum ${configuredMaximum}%`]
        : [],
  };
}
