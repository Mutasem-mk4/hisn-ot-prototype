import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { JudgeOrchestrator } from '../../src/application/judge-orchestrator.js';
import { DeterministicAgentReasoner } from '../../src/infrastructure/agent-reasoners.js';
import {
  SimulatedEnforcementProvider,
  SimulatedEvidenceProvider,
} from '../../src/infrastructure/simulated-providers.js';
import { SqliteAuditStore } from '../../src/infrastructure/sqlite-audit-store.js';
import { testPolicy, testScenario } from './fixtures.js';

export function createHarness(scenarioId = 'judge-valid-credentials-compromised-context') {
  const directory = mkdtempSync(join(tmpdir(), 'hisn-ot-test-'));
  const store = new SqliteAuditStore(join(directory, 'test.db'), resolve('migrations'));
  store.migrate();
  const orchestrator = new JudgeOrchestrator(
    store,
    testPolicy(),
    [testScenario(), testScenario('judge-degraded-provider')],
    new SimulatedEvidenceProvider(),
    new SimulatedEnforcementProvider(),
    new DeterministicAgentReasoner(),
  );
  return {
    store,
    orchestrator,
    scenarioId,
    close() {
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

export async function completeRun(orchestrator: JudgeOrchestrator, scenarioId: string) {
  let snapshot = await orchestrator.createRun(scenarioId);
  for (let step = 0; step < 12 && snapshot.run.playbackStatus !== 'COMPLETE'; step += 1) {
    snapshot = await orchestrator.control('NEXT');
  }
  return snapshot;
}
