import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';
import { JudgeOrchestrator } from '../src/application/judge-orchestrator.js';
import { loadConfiguration } from '../src/infrastructure/configuration.js';
import { createProviders } from '../src/infrastructure/provider-factory.js';
import { SqliteAuditStore } from '../src/infrastructure/sqlite-audit-store.js';
import { IncidentReportSchema } from '../src/shared/contracts.js';

const root = process.cwd();
const configuration = loadConfiguration({ HISN_MODE: 'DEMO' }, root);
const store = new SqliteAuditStore(':memory:', resolve(root, 'migrations'));
store.migrate();
const providers = createProviders(configuration);
const orchestrator = new JudgeOrchestrator(
  store,
  configuration.policy,
  configuration.scenarios,
  providers.evidence,
  providers.enforcement,
  providers.reasoner,
);

try {
  let snapshot = await orchestrator.createRun('judge-valid-credentials-compromised-context');
  for (let step = 0; step < 20 && snapshot.run.playbackStatus !== 'COMPLETE'; step += 1) {
    snapshot = await orchestrator.control('NEXT');
  }
  if (snapshot.run.playbackStatus !== 'COMPLETE') {
    throw new Error('Sample report workflow did not complete within the transition budget');
  }
  const report = IncidentReportSchema.parse(orchestrator.incident(snapshot.run.id));
  const outputDirectory = resolve(root, 'artifacts');
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = resolve(outputDirectory, 'sample-incident-report.json');
  const formatted = await format(JSON.stringify(report), { parser: 'json' });
  writeFileSync(outputPath, formatted, 'utf8');
  process.stdout.write(`Generated ${outputPath}\n`);
} finally {
  store.close();
}
