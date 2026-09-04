import { describe, expect, it } from 'vitest';
import { EnforcementCallSchema } from '../../src/shared/contracts.js';
import { createHarness } from '../helpers/harness.js';

describe('audit store', () => {
  it('returns the original enforcement result for a repeated idempotency key', async () => {
    const harness = createHarness();
    try {
      const snapshot = await harness.orchestrator.createRun(harness.scenarioId);
      const original = EnforcementCallSchema.parse({
        id: 'first',
        action: 'DETACH_GATEWAY',
        status: 'SUCCEEDED',
        provenance: 'SIMULATED',
        redactedResult: { attachment: 'DETACHED' },
        latencyMs: 4,
        timestamp: '2026-09-04T08:00:00.000Z',
        correlationId: snapshot.run.correlationId,
        idempotencyKey: 'stable-key',
      });
      const duplicate = { ...original, id: 'second', redactedResult: { attachment: 'DIFFERENT' } };
      harness.store.saveEnforcement(original, snapshot.run.id);
      const persisted = harness.store.saveEnforcement(duplicate, snapshot.run.id);
      expect(persisted.id).toBe('first');
      expect(persisted.redactedResult).toEqual({ attachment: 'DETACHED' });
    } finally {
      harness.close();
    }
  });

  it('returns one workflow for a repeated command idempotency key', async () => {
    const harness = createHarness();
    try {
      const first = await harness.orchestrator.createRun(harness.scenarioId, 'command-retry-key');
      const retry = await harness.orchestrator.createRun(harness.scenarioId, 'command-retry-key');
      expect(retry.run.id).toBe(first.run.id);
      expect(harness.store.eventsForRun(first.run.id)).toHaveLength(1);
    } finally {
      harness.close();
    }
  });

  it('rejects reuse of a command idempotency key for a different request', async () => {
    const harness = createHarness();
    try {
      await harness.orchestrator.createRun(harness.scenarioId, 'command-conflict-key');
      await expect(
        harness.orchestrator.createRun('judge-degraded-provider', 'command-conflict-key'),
      ).rejects.toThrow('idempotency key is already bound to a different request');
    } finally {
      harness.close();
    }
  });

  it('links event integrity hashes in sequence', async () => {
    const harness = createHarness();
    try {
      const snapshot = await harness.orchestrator.createRun(harness.scenarioId);
      await harness.orchestrator.control('NEXT');
      const events = harness.store.eventsForRun(snapshot.run.id);
      expect(events[0]?.previousHash).toBe('GENESIS');
      expect(events[1]?.previousHash).toBe(events[0]?.integrityHash);
    } finally {
      harness.close();
    }
  });

  it('rejects malformed incident JSON read from persistence', async () => {
    const harness = createHarness();
    try {
      const snapshot = await harness.orchestrator.createRun(harness.scenarioId);
      harness.store.database
        .prepare(
          'INSERT INTO incidents(id, run_id, correlation_id, report_json, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          'malformed',
          snapshot.run.id,
          snapshot.run.correlationId,
          '{"trusted":false}',
          new Date().toISOString(),
        );
      expect(() => harness.store.incidentForRun(snapshot.run.id)).toThrow();
    } finally {
      harness.close();
    }
  });
});
