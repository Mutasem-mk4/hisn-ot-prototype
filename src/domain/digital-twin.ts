import type { Command, DecisionState, Policy, TwinState } from '../shared/contracts.js';

export function holdCommand(twin: TwinState, command: Command, correlationId: string): TwinState {
  return {
    ...advanceHeartbeats(twin),
    requestedPressurePercent: command.requestedSetpointPercent,
    commandHistory: [
      ...twin.commandHistory,
      {
        kind: command.kind,
        requestedSetpointPercent: command.requestedSetpointPercent,
        outcome: 'HELD',
        correlationId,
      },
    ],
  };
}

export function containGateway(twin: TwinState): TwinState {
  return {
    ...advanceHeartbeats(twin),
    gatewayAttachment: 'DETACHED',
    activeController: 'BACKUP',
    backupAttachment: 'PROTECTED',
  };
}

export function protectContinuity(twin: TwinState): TwinState {
  return {
    ...advanceHeartbeats(twin),
    pumpState: 'SAFE_CONTROL',
    backupAttachment: 'PROTECTED',
    networkLatencyMs: 18,
    commandHistory: twin.commandHistory.map((entry) =>
      entry.outcome === 'HELD' ? { ...entry, outcome: 'BLOCKED' as const } : entry,
    ),
  };
}

export function resolveHeldCommand(twin: TwinState, decision: DecisionState): TwinState {
  const outcome = decision === 'ALLOW' ? ('EXECUTED' as const) : ('BLOCKED' as const);
  const requested = twin.requestedPressurePercent;
  return {
    ...advanceHeartbeats(twin),
    actualPressurePercent:
      decision === 'ALLOW' && requested !== null ? requested : twin.actualPressurePercent,
    commandHistory: twin.commandHistory.map((entry) =>
      entry.outcome === 'HELD' ? { ...entry, outcome } : entry,
    ),
  };
}

export function advanceHeartbeats(twin: TwinState): TwinState {
  const pressureOffset = twin.backupHeartbeatSequence % 2 === 0 ? 0.1 : -0.1;
  return {
    ...twin,
    actualPressurePercent: Number((twin.actualPressurePercent + pressureOffset).toFixed(1)),
    primaryHeartbeatSequence: twin.primaryHeartbeatSequence + 1,
    backupHeartbeatSequence: twin.backupHeartbeatSequence + 1,
  };
}

export function continuityMetrics(initial: TwinState, current: TwinState, policy: Policy) {
  const { minimumPercent, maximumPercent } = policy.safePressureBand;
  return {
    unsafeCommandsExecuted: current.commandHistory.filter((entry) => entry.outcome === 'EXECUTED')
      .length,
    pressureStayedInsideSafeBand:
      current.actualPressurePercent >= minimumPercent &&
      current.actualPressurePercent <= maximumPercent,
    backupHeartbeatsObserved: current.backupHeartbeatSequence - initial.backupHeartbeatSequence,
    currentActualPressurePercent: current.actualPressurePercent,
    currentFlowRateM3PerHour: current.flowRateM3PerHour,
    networkLatencyMs: current.networkLatencyMs,
  };
}
