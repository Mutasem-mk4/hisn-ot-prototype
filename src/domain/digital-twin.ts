import type { Command, DecisionState, Policy, TwinState } from '../shared/contracts.js';

export function holdCommand(twin: TwinState, command: Command, correlationId: string): TwinState {
  return {
    ...twin,
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
  return { ...twin, gatewayAttachment: 'DETACHED' };
}

export function protectContinuity(twin: TwinState): TwinState {
  if (!twin.backupReady) return { ...twin, pumpState: 'STOPPED' };
  return { ...twin, activeController: 'BACKUP', pumpState: 'SAFE_CONTROL' };
}

export function resolveHeldCommand(twin: TwinState, decision: DecisionState): TwinState {
  if (decision === 'STEP_UP') return twin;
  const accepted = decision === 'ALLOW' && twin.requestedPressurePercent !== null;
  return {
    ...twin,
    acceptedPressurePercent: accepted
      ? twin.requestedPressurePercent
      : twin.acceptedPressurePercent,
    commandHistory: twin.commandHistory.map((entry) =>
      entry.outcome === 'HELD'
        ? { ...entry, outcome: decision === 'ALLOW' ? ('EXECUTED' as const) : ('BLOCKED' as const) }
        : entry,
    ),
  };
}

export function initializeSimulation(twin: TwinState, now = Date.now()): TwinState {
  const observedAt = new Date(now).toISOString();
  return {
    ...twin,
    observedAt,
    observationStartedAt: observedAt,
    minimumObservedPressure: twin.actualPressurePercent,
    maximumObservedPressure: twin.actualPressurePercent,
    acceptedPressurePercent: twin.acceptedPressurePercent ?? twin.actualPressurePercent,
    simulationElapsedMs: 0,
    simulationPaused: true,
    scenarioStepStartedAtMs: 0,
    pumpSpeedPercent: twin.pumpState === 'STOPPED' ? 0 : twin.actualPressurePercent,
    telemetryStatus: 'LIVE',
  };
}

// Fixed 100 ms process integration. This is an illustrative, non-calibrated plant model.
export function advanceSimulation(twin: TwinState, elapsedSimMs: number): TwinState {
  const elapsedMs = Math.max(0, elapsedSimMs);
  if (elapsedMs === 0) return twin;
  const controllerAvailable =
    twin.activeController === 'PRIMARY'
      ? twin.gatewayAttachment === 'OPERATIONAL'
      : twin.backupReady;
  if (!controllerAvailable) {
    return {
      ...twin,
      pumpState: 'STOPPED',
      pumpSpeedPercent: 0,
      telemetryStatus: twin.observedAt ? 'STALE' : 'UNKNOWN',
      simulationElapsedMs: twin.simulationElapsedMs + elapsedMs,
    };
  }
  const pumpState = controllerAvailable ? twin.pumpState : 'STOPPED';
  const target = pumpState === 'STOPPED' ? 0 : (twin.acceptedPressurePercent ?? 0);
  const valveTarget = pumpState === 'STOPPED' ? 0 : Math.min(100, 30 + target * 0.37);
  let pressure = twin.actualPressurePercent;
  let valve = twin.valvePositionPercent;
  let inlet = twin.inletTankLevelPercent;
  let output = twin.outputTankLevelPercent;
  let flow = twin.flowRateM3PerHour;
  let remaining = elapsedMs;
  while (remaining > 0) {
    const stepMs = Math.min(100, remaining);
    const seconds = stepMs / 1000;
    pressure += (target - pressure) * (1 - Math.exp(-stepMs / 8000));
    valve += (valveTarget - valve) * (1 - Math.exp(-stepMs / 3000));
    flow = pressure * valve * 0.573;
    inlet = clamp(inlet + ((1250 - flow) * seconds) / 10_000);
    output = clamp(output + ((flow - 1220) * seconds) / 12_000);
    remaining -= stepMs;
  }
  const previousSecond = Math.floor(twin.simulationElapsedMs / 1000);
  const simulationElapsedMs = twin.simulationElapsedMs + elapsedMs;
  const heartbeatSteps = Math.floor(simulationElapsedMs / 1000) - previousSecond;
  const observationStart = twin.observationStartedAt ?? new Date().toISOString();
  const observedAt = new Date(Date.parse(observationStart) + simulationElapsedMs).toISOString();
  return {
    ...twin,
    observedAt,
    pumpState,
    telemetryStatus: 'LIVE',
    simulationElapsedMs,
    actualPressurePercent: pressure,
    pumpSpeedPercent: target,
    valvePositionPercent: valve,
    flowRateM3PerHour: flow,
    inletTankLevelPercent: inlet,
    outputTankLevelPercent: output,
    primaryHeartbeatSequence:
      twin.primaryHeartbeatSequence +
      (twin.gatewayAttachment === 'OPERATIONAL' ? heartbeatSteps : 0),
    backupHeartbeatSequence: twin.backupHeartbeatSequence + (twin.backupReady ? heartbeatSteps : 0),
    maximumHeartbeatGapMs: Math.max(twin.maximumHeartbeatGapMs, elapsedMs),
    minimumObservedPressure: Math.min(twin.minimumObservedPressure ?? pressure, pressure),
    maximumObservedPressure: Math.max(twin.maximumObservedPressure ?? pressure, pressure),
  };
}

// Compatibility helper for callers that advance from an observation timestamp.
export function advanceHeartbeats(twin: TwinState, now = Date.now()): TwinState {
  if (!twin.observedAt) return initializeSimulation(twin, now);
  const elapsedMs = Math.max(0, now - Date.parse(twin.observedAt));
  return advanceSimulation(twin, elapsedMs);
}

export function continuityMetrics(initial: TwinState, current: TwinState, policy: Policy) {
  const duration = current.simulationElapsedMs;
  return {
    source: 'SIMULATED_PROCESS_OBSERVATIONS',
    observedAt: current.observedAt,
    observationDurationMs: duration,
    maximumHeartbeatGapMs: current.maximumHeartbeatGapMs,
    backupReady: current.backupReady,
    unsafeCommandsExecuted: current.commandHistory.filter(
      (entry) =>
        entry.outcome === 'EXECUTED' &&
        entry.requestedSetpointPercent !== null &&
        entry.requestedSetpointPercent > (policy.commands.SET_PRESSURE.maximumSetpointPercent ?? 0),
    ).length,
    pressureStayedInsideSafeBand:
      duration > 0 &&
      (current.minimumObservedPressure ?? -Infinity) >= policy.safePressureBand.minimumPercent &&
      (current.maximumObservedPressure ?? Infinity) <= policy.safePressureBand.maximumPercent,
    backupHeartbeatsObserved: current.backupHeartbeatSequence - initial.backupHeartbeatSequence,
    currentActualPressurePercent: current.actualPressurePercent,
    currentFlowRateM3PerHour: current.flowRateM3PerHour,
    configuredNetworkLatencyMs: current.networkLatencyMs,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
