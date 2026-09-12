import { describe, expect, it, vi } from 'vitest';
import { LangGraphAgentReasoner } from '../../src/infrastructure/agent-reasoners.js';
import { completeRun, createHarness } from '../helpers/harness.js';
import { evidenceCall, testScenario } from '../helpers/fixtures.js';

describe('complete judge workflow', () => {
  it.each(['SIMULATED', 'SANDBOX'] as const)(
    'revalidates %s evidence before changing accepted pressure in sandbox mode',
    async (provenance) => {
      const scenario = testScenario('judge-safe-operating-change');
      const harness = createHarness(scenario.id, {
        evidence: {
          mode: 'SANDBOX',
          source: 'NOKIA_SANDBOX',
          health: () => Promise.resolve('AVAILABLE'),
          collect: (tool, context) =>
            Promise.resolve({
              ...evidenceCall(tool, scenario.evidence[tool].redacted),
              provenance,
              correlationId: context.correlationId,
            }),
        },
      });
      try {
        const snapshot = await completeRun(harness.orchestrator, scenario.id);
        expect(snapshot.artifacts.decision?.state).toBe(
          provenance === 'SANDBOX' ? 'ALLOW' : 'BLOCK',
        );
        expect(snapshot.run.twin.acceptedPressurePercent).toBe(provenance === 'SANDBOX' ? 52 : 46);
        expect(harness.store.enforcementForRun(snapshot.run.id)).toEqual([]);
      } finally {
        harness.close();
      }
    },
  );
  it('authorizes a read-only inspection with one evidence call and no control-state change', async () => {
    const harness = createHarness('judge-read-only-inspection');
    try {
      const snapshot = await completeRun(harness.orchestrator, harness.scenarioId);

      expect(snapshot.artifacts.plan?.risk).toBe('LOW');
      expect(snapshot.artifacts.plan?.selectedTools).toEqual(['DEVICE_REACHABILITY']);
      expect(snapshot.artifacts.evidence?.map((call) => call.tool)).toEqual([
        'DEVICE_REACHABILITY',
      ]);
      expect(snapshot.artifacts.decision?.state).toBe('ALLOW');
      expect(snapshot.run.twin.acceptedPressurePercent).toBe(46);
      expect(snapshot.run.twin.actualPressurePercent).toBe(46);
      expect(snapshot.run.twin.requestedPressurePercent).toBeNull();
      expect(snapshot.run.twin.commandHistory).toEqual([
        expect.objectContaining({
          kind: 'READ_STATUS',
          requestedSetpointPercent: null,
          outcome: 'EXECUTED',
        }),
      ]);
      expect(harness.store.enforcementForRun(snapshot.run.id)).toEqual([]);
    } finally {
      harness.close();
    }
  });

  it('blocks and contains the dangerous request while continuity remains measurable', async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    try {
      await completeRun(harness.orchestrator, harness.scenarioId);
      await harness.orchestrator.control('PLAY');
      vi.advanceTimersByTime(1_000);
      await harness.orchestrator.tick();
      const snapshot = await harness.orchestrator.snapshot();
      expect(snapshot.run.playbackStatus).toBe('COMPLETE');
      expect(snapshot.run.workflowState).toBe('INCIDENT_REPORTED');
      expect(snapshot.artifacts.decision?.state).toBe('BLOCK_AND_CONTAIN');
      expect(snapshot.run.twin.requestedPressurePercent).toBe(52);
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
      vi.useRealTimers();
      harness.close();
    }
  });

  it('executes a safe setpoint, then blocks an unsafe command without changing the accepted input', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'));
    const harness = createHarness('judge-safe-operating-change');
    try {
      let snapshot = await completeRun(harness.orchestrator, harness.scenarioId);
      expect(snapshot.artifacts.decision?.state).toBe('ALLOW');
      expect(snapshot.run.twin.acceptedPressurePercent).toBe(52);
      expect(snapshot.run.twin.commandHistory.at(-1)?.outcome).toBe('EXECUTED');

      await harness.orchestrator.control('PLAY');
      vi.advanceTimersByTime(8_000);
      await harness.orchestrator.tick();
      snapshot = await harness.orchestrator.snapshot();
      expect(snapshot.run.twin.actualPressurePercent).toBeGreaterThan(46);
      expect(snapshot.run.twin.actualPressurePercent).toBeLessThan(52);

      snapshot = await harness.orchestrator.submitCommand(
        'judge-valid-credentials-compromised-context',
      );
      while (snapshot.run.playbackStatus !== 'COMPLETE') {
        snapshot = await harness.orchestrator.control('NEXT');
      }
      expect(snapshot.artifacts.decision?.state).toBe('BLOCK_AND_CONTAIN');
      expect(snapshot.run.twin.acceptedPressurePercent).toBe(52);
      expect(snapshot.run.twin.requestedPressurePercent).toBe(52);
      expect(snapshot.run.twin.commandHistory.at(-1)?.outcome).toBe('BLOCKED');
      expect(snapshot.run.twin.actualPressurePercent).toBeLessThan(52);
    } finally {
      vi.useRealTimers();
      harness.close();
    }
  });

  it('uses one pausable simulation clock and applies playback speed only to simulated time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'));
    const harness = createHarness('judge-safe-operating-change');
    try {
      let snapshot = await harness.orchestrator.createRun(harness.scenarioId);
      vi.advanceTimersByTime(2_000);
      await harness.orchestrator.tick();
      expect((await harness.orchestrator.snapshot()).run.twin.simulationElapsedMs).toBe(0);

      await harness.orchestrator.control('PLAY');
      vi.advanceTimersByTime(1_000);
      await harness.orchestrator.tick();
      snapshot = await harness.orchestrator.control('PAUSE');
      expect(snapshot.run.twin.simulationElapsedMs).toBe(1_000);

      vi.advanceTimersByTime(5_000);
      await harness.orchestrator.tick();
      expect((await harness.orchestrator.snapshot()).run.twin.simulationElapsedMs).toBe(1_000);

      await harness.orchestrator.control('SET_SPEED', 4);
      await harness.orchestrator.control('PLAY');
      vi.advanceTimersByTime(500);
      await harness.orchestrator.tick();
      snapshot = await harness.orchestrator.control('PAUSE');
      expect(snapshot.run.twin.simulationElapsedMs).toBe(3_000);
    } finally {
      vi.useRealTimers();
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
      ).toHaveLength(1);
      expect(harness.store.enforcementForRun(snapshot.run.id)).toEqual([]);
      expect(snapshot.run.twin.commandHistory[0]?.outcome).toBe('BLOCKED');
    } finally {
      harness.close();
    }
  });

  it('holds the command when hosted AI is unavailable without substituting a recommendation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Hosted endpoint unavailable')));
    const reasoner = new LangGraphAgentReasoner(
      { baseUrl: 'https://reasoner.invalid', apiKey: 'redacted-key', model: 'hosted-model' },
      50,
    );
    const harness = createHarness('judge-safe-operating-change', { reasoner });
    try {
      let snapshot = await harness.orchestrator.createRun(harness.scenarioId);
      for (let step = 0; step < 4 && snapshot.run.playbackStatus !== 'FAILED_SAFE'; step += 1) {
        snapshot = await harness.orchestrator.control('NEXT');
      }

      expect(snapshot.run.playbackStatus).toBe('FAILED_SAFE');
      expect(snapshot.currentEvent?.payload.errorCode).toBe('AGENT_UNAVAILABLE');
      expect(snapshot.currentEvent?.payload.failureReason).toBe('NETWORK_OR_PROTOCOL_ERROR');
      expect(snapshot.currentEvent?.payload.headline).toBe('AI agent unavailable — command held');
      expect(snapshot.artifacts.recommendation).toBeUndefined();
      expect(snapshot.artifacts.decision).toBeUndefined();
      expect(snapshot.run.twin.acceptedPressurePercent).toBe(46);
      expect(snapshot.run.twin.commandHistory.at(-1)?.outcome).toBe('BLOCKED');
      expect(harness.store.enforcementForRun(snapshot.run.id)).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
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
