import { describe, expect, it, vi } from 'vitest';
import { JudgeOrchestrator } from '../../src/application/judge-orchestrator.js';
import { DeterministicAgentReasoner } from '../../src/infrastructure/agent-reasoners.js';
import {
  SimulatedEnforcementProvider,
  SimulatedEvidenceProvider,
} from '../../src/infrastructure/simulated-providers.js';
import type { EnforcementProvider } from '../../src/application/ports.js';
import { completeRun, createHarness } from '../helpers/harness.js';
import { testPolicy, testScenario } from '../helpers/fixtures.js';

describe('adversarial workflow outcomes', () => {
  it('bounds a hanging evidence adapter and records uncertainty without containment', async () => {
    vi.useFakeTimers();
    const harness = createHarness(undefined, {
      evidence: {
        mode: 'DEMO',
        health: () => Promise.resolve('AVAILABLE'),
        collect: () => new Promise(() => undefined),
      },
    });
    try {
      let snapshot = await harness.orchestrator.createRun(harness.scenarioId);
      while (snapshot.run.workflowState !== 'EVIDENCE_COLLECTING')
        snapshot = await harness.orchestrator.control('NEXT');
      const pending = harness.orchestrator.control('NEXT');
      const harmlessTick = await harness.orchestrator.control('TICK');
      expect(harmlessTick.run.workflowState).toBe('EVIDENCE_COLLECTING');
      const policy = testPolicy();
      await vi.advanceTimersByTimeAsync(
        policy.providers.timeoutMs * policy.providers.maximumAttempts + 1,
      );
      snapshot = await pending;
      expect(
        snapshot.artifacts.evidence?.every((call) => call.requestStatus === 'UNAVAILABLE'),
      ).toBe(true);
      await harness.orchestrator.control('NEXT');
      snapshot = await harness.orchestrator.control('NEXT');
      expect(snapshot.artifacts.decision?.state).toBe('BLOCK');
      expect(harness.store.enforcementForRun(snapshot.run.id)).toEqual([]);
    } finally {
      vi.useRealTimers();
      harness.close();
    }
  });

  it.each(['DETACH_GATEWAY', 'QUALITY_ON_DEMAND'] as const)(
    'keeps failed %s separate from command blocking and backup health',
    async (action) => {
      const simulation = new SimulatedEnforcementProvider();
      const provider: EnforcementProvider = {
        mode: 'DEMO',
        health: () => simulation.health(),
        async detachGateway(context, signal) {
          const result = await simulation.detachGateway(context, signal);
          return action === 'DETACH_GATEWAY'
            ? {
                ...result,
                status: 'UNAVAILABLE',
                redactedResult: { attachment: 'DETACH_REQUESTED' },
              }
            : result;
        },
        async protectBackup(context, signal) {
          const result = await simulation.protectBackup(context, signal);
          return action === 'QUALITY_ON_DEMAND' ? { ...result, status: 'FAILED' } : result;
        },
      };
      const harness = createHarness(undefined, { enforcement: provider });
      try {
        const result = await completeRun(harness.orchestrator, harness.scenarioId);
        expect(result.run.twin.commandHistory[0]?.outcome).toBe('BLOCKED');
        expect(result.run.twin.gatewayAttachment).toBe(
          action === 'DETACH_GATEWAY' ? 'OPERATIONAL' : 'DETACHED',
        );
        expect(result.run.twin.activeController).toBe(
          action === 'QUALITY_ON_DEMAND' ? 'PRIMARY' : 'BACKUP',
        );
        if (action === 'QUALITY_ON_DEMAND') {
          expect(result.run.twin.pumpState).toBe('STOPPED');
          expect(result.run.twin.telemetryStatus).toBe('STALE');
        }
        expect(
          harness.store
            .incidentForRun(result.run.id)
            ?.networkEnforcement.find((call) => call.action === action)?.status,
        ).not.toBe('SUCCEEDED');
      } finally {
        harness.close();
      }
    },
  );

  it('records failed backup readiness without fabricating protected continuity', async () => {
    const scenario = testScenario();
    scenario.initialTwin.backupReady = false;
    const harness = createHarness(scenario.id, { scenario });
    try {
      const result = await completeRun(harness.orchestrator, scenario.id);
      expect(result.run.twin.pumpState).toBe('STOPPED');
      expect(
        harness.store
          .enforcementForRun(result.run.id)
          .find((call) => call.action === 'ACTIVATE_SAFE_CONTROL')?.status,
      ).toBe('FAILED');
    } finally {
      harness.close();
    }
  });

  it('rejects unsafe input at interception before any reasoning or telecom call', async () => {
    const scenario = structuredClone(testScenario());
    scenario.command.requestedSetpointPercent = 88;
    const harness = createHarness(scenario.id, { scenario });
    try {
      await harness.orchestrator.createRun(harness.scenarioId);
      await harness.orchestrator.control('NEXT');
      const held = await harness.orchestrator.control('NEXT');
      expect(held.run.twin.commandHistory[0]?.outcome).toBe('BLOCKED');
      expect(held.artifacts.safety?.permitted).toBe(false);
      expect(held.artifacts.plan).toBeUndefined();
      expect(held.artifacts.evidence).toBeUndefined();
    } finally {
      harness.close();
    }
  });

  it('does not repeat an uncertain side effect after orchestrator restart or replay', async () => {
    const harness = createHarness();
    try {
      let snapshot = await harness.orchestrator.createRun(harness.scenarioId);
      while (snapshot.run.workflowState !== 'ENFORCEMENT_STARTED')
        snapshot = await harness.orchestrator.control('NEXT');
      harness.store.saveEnforcement(
        {
          id: 'interrupted-intent',
          action: 'DETACH_GATEWAY',
          status: 'UNAVAILABLE',
          provenance: 'UNAVAILABLE',
          redactedResult: { reason: 'Connection lost after sending request' },
          latencyMs: 0,
          timestamp: new Date().toISOString(),
          correlationId: snapshot.run.correlationId,
          idempotencyKey: `${snapshot.run.correlationId}:DETACH_GATEWAY`,
        },
        snapshot.run.id,
      );
      let externalCalls = 0;
      const simulation = new SimulatedEnforcementProvider();
      const provider: EnforcementProvider = {
        mode: 'DEMO',
        health: () => simulation.health(),
        detachGateway(context, signal) {
          externalCalls++;
          return simulation.detachGateway(context, signal);
        },
        protectBackup: (context, signal) => simulation.protectBackup(context, signal),
      };
      const restarted = new JudgeOrchestrator(
        harness.store,
        testPolicy(),
        [testScenario()],
        new SimulatedEvidenceProvider(),
        provider,
        new DeterministicAgentReasoner(),
      );
      snapshot = await restarted.control('NEXT');
      expect(snapshot.run.twin.gatewayAttachment).toBe('OPERATIONAL');
      await restarted.control('PREVIOUS');
      await restarted.control('NEXT');
      expect(externalCalls).toBe(0);
      expect(harness.store.enforcementForRun(snapshot.run.id)).toHaveLength(1);
    } finally {
      harness.close();
    }
  });
});
