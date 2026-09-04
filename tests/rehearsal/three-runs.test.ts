import { describe, expect, it } from 'vitest';
import { completeRun, createHarness } from '../helpers/harness.js';

describe('judge rehearsal reliability', () => {
  it('passes three consecutive complete deterministic runs', async () => {
    const harness = createHarness();
    try {
      const results = [];
      for (let run = 0; run < 3; run += 1) {
        results.push(await completeRun(harness.orchestrator, harness.scenarioId));
      }
      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.run.playbackStatus).toBe('COMPLETE');
        expect(result.artifacts.decision?.state).toBe('BLOCK_AND_CONTAIN');
        expect(result.run.twin.actualPressurePercent).toBeLessThanOrEqual(52);
        expect(result.run.twin.commandHistory[0]?.outcome).toBe('BLOCKED');
      }
    } finally {
      harness.close();
    }
  });
});
