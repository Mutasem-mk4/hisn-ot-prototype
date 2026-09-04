import { describe, expect, it } from 'vitest';
import { containGateway, holdCommand, protectContinuity } from '../../src/domain/digital-twin.js';
import { testScenario } from '../helpers/fixtures.js';

describe('stateful digital twin', () => {
  it('keeps requested pressure separate from actual pressure after interception', () => {
    const scenario = testScenario();
    const held = holdCommand(scenario.initialTwin, scenario.command, 'correlation-test');
    expect(held.requestedPressurePercent).toBe(88);
    expect(held.actualPressurePercent).toBeLessThan(52);
    expect(held.commandHistory[0]?.outcome).toBe('HELD');
  });

  it('keeps the backup heartbeat advancing after containment', () => {
    const initial = testScenario().initialTwin;
    const contained = containGateway(initial);
    const protectedTwin = protectContinuity(contained);
    expect(protectedTwin.gatewayAttachment).toBe('DETACHED');
    expect(protectedTwin.backupHeartbeatSequence).toBeGreaterThan(initial.backupHeartbeatSequence);
    expect(protectedTwin.activeController).toBe('BACKUP');
  });
});
