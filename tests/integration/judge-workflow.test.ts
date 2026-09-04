import { describe, expect, it } from 'vitest';
import { completeRun, createHarness } from '../helpers/harness.js';

describe('complete judge workflow', () => {
  it('blocks and contains the dangerous request while continuity remains measurable', async () => {
    const harness = createHarness();
    try {
      const snapshot = await completeRun(harness.orchestrator, harness.scenarioId);
      expect(snapshot.run.playbackStatus).toBe('COMPLETE');
      expect(snapshot.run.workflowState).toBe('INCIDENT_REPORTED');
      expect(snapshot.artifacts.decision?.state).toBe('BLOCK_AND_CONTAIN');
      expect(snapshot.run.twin.requestedPressurePercent).toBe(88);
      expect(snapshot.run.twin.actualPressurePercent).toBeLessThanOrEqual(52);
      expect(snapshot.run.twin.commandHistory[0]?.outcome).toBe('BLOCKED');
      expect(snapshot.run.twin.gatewayAttachment).toBe('DETACHED');
      expect(snapshot.run.twin.backupHeartbeatSequence).toBeGreaterThan(9188);
      expect(harness.store.enforcementForRun(snapshot.run.id).map((call) => call.action)).toEqual([
        'DETACH_GATEWAY',
        'QUALITY_ON_DEMAND',
        'ACTIVATE_SAFE_CONTROL',
      ]);
    } finally {
      harness.close();
    }
  });

  it('fails safely on partial provider evidence without starting enforcement', async () => {
    const harness = createHarness('judge-degraded-provider');
    try {
      const snapshot = await completeRun(harness.orchestrator, harness.scenarioId);
      expect(snapshot.run.playbackStatus).toBe('COMPLETE');
      expect(snapshot.artifacts.decision?.state).toBe('BLOCK');
      expect(
        snapshot.artifacts.evidence?.filter((call) => call.requestStatus === 'UNAVAILABLE'),
      ).toHaveLength(2);
      expect(harness.store.enforcementForRun(snapshot.run.id)).toEqual([]);
      expect(snapshot.run.twin.commandHistory[0]?.outcome).toBe('BLOCKED');
    } finally {
      harness.close();
    }
  });

  it('generates an incident report from the exact persisted event record', async () => {
    const harness = createHarness();
    try {
      const snapshot = await completeRun(harness.orchestrator, harness.scenarioId);
      const report = harness.store.incidentForRun(snapshot.run.id);
      const events = harness.store.eventsForRun(snapshot.run.id);
      expect(report?.timeline.map((event) => event.integrityHash)).toEqual(
        events.map((event) => event.integrityHash),
      );
      expect(report?.authoritativeDecision).toEqual(snapshot.artifacts.decision);
      expect(report?.correlationId).toBe(snapshot.run.correlationId);
    } finally {
      harness.close();
    }
  });

  it('supports Back and Step by replaying persisted events without changing the physical twin', async () => {
    const harness = createHarness();
    try {
      let snapshot = await completeRun(harness.orchestrator, harness.scenarioId);
      const finalTwin = snapshot.run.twin;
      const eventCount = snapshot.events.length;
      snapshot = await harness.orchestrator.control('PREVIOUS');
      expect(snapshot.visibleEvents).toHaveLength(eventCount - 1);
      expect(snapshot.run.twin).toEqual(finalTwin);
      snapshot = await harness.orchestrator.control('NEXT');
      expect(snapshot.visibleEvents).toHaveLength(eventCount);
      expect(snapshot.run.twin).toEqual(finalTwin);
    } finally {
      harness.close();
    }
  });
});
