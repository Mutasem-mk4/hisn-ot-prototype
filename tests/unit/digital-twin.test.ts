import { describe, expect, it } from 'vitest';
import {
  advanceSimulation,
  advanceHeartbeats,
  containGateway,
  holdCommand,
  protectContinuity,
  resolveHeldCommand,
  initializeSimulation,
} from '../../src/domain/digital-twin.js';
import { testScenario } from '../helpers/fixtures.js';

describe('stateful digital twin', () => {
  it('approaches an accepted setpoint over elapsed time without jumping to the requested value', () => {
    const initial = advanceHeartbeats(testScenario().initialTwin, 1_000);
    const held = holdCommand(
      initial,
      { kind: 'SET_PRESSURE', requestedSetpointPercent: 50, reason: 'Authorized adjustment' },
      'accepted-command',
    );
    const accepted = resolveHeldCommand(held, 'ALLOW');
    expect(accepted.actualPressurePercent).toBe(initial.actualPressurePercent);
    expect(accepted.acceptedPressurePercent).toBe(50);
    const evolved = advanceHeartbeats(accepted, 2_000);
    expect(evolved.actualPressurePercent).toBeGreaterThan(initial.actualPressurePercent);
    expect(evolved.actualPressurePercent).toBeLessThan(50);
  });
  it('keeps requested pressure separate from actual pressure after interception', () => {
    const scenario = testScenario();
    const held = holdCommand(scenario.initialTwin, scenario.command, 'correlation-test');
    expect(held.requestedPressurePercent).toBe(88);
    expect(held.actualPressurePercent).toBeLessThan(52);
    expect(held.commandHistory[0]?.outcome).toBe('HELD');
  });

  it('keeps the backup heartbeat advancing after containment', () => {
    const initial = advanceHeartbeats(testScenario().initialTwin, 1_000);
    const contained = containGateway(initial);
    const protectedTwin = advanceHeartbeats(protectContinuity(contained), 2_000);
    expect(protectedTwin.gatewayAttachment).toBe('DETACHED');
    expect(protectedTwin.backupHeartbeatSequence).toBeGreaterThan(initial.backupHeartbeatSequence);
    expect(protectedTwin.activeController).toBe('BACKUP');
  });

  it('produces equivalent process outcomes for equal simulated durations at every playback speed', () => {
    const outcomes = [0.5, 1, 2, 4].map((speed) => {
      let twin = initializeSimulation(testScenario().initialTwin, 0);
      twin = resolveHeldCommand(
        holdCommand(
          twin,
          { kind: 'SET_PRESSURE', requestedSetpointPercent: 52, reason: 'Authorized adjustment' },
          `speed-${speed}`,
        ),
        'ALLOW',
      );
      const wallTickMs = 250;
      const ticks = 10_000 / (wallTickMs * speed);
      for (let index = 0; index < ticks; index += 1) {
        twin = advanceSimulation(twin, wallTickMs * speed);
      }
      return twin;
    });
    for (const outcome of outcomes) {
      expect(outcome.simulationElapsedMs).toBe(10_000);
      expect(outcome.actualPressurePercent).toBeCloseTo(outcomes[1]!.actualPressurePercent, 2);
      expect(outcome.flowRateM3PerHour).toBeCloseTo(outcomes[1]!.flowRateM3PerHour, 1);
      expect(outcome.inletTankLevelPercent).toBeCloseTo(outcomes[1]!.inletTankLevelPercent, 1);
      expect(outcome.outputTankLevelPercent).toBeCloseTo(outcomes[1]!.outputTankLevelPercent, 1);
    }
  });
});
