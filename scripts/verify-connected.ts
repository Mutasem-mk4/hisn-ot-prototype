import { randomUUID } from 'node:crypto';
import { config as loadEnvironmentFile } from 'dotenv';
import { loadConfiguration } from '../src/infrastructure/configuration.js';
import {
  connectedPreflight,
  verifyConnectedContext,
} from '../src/infrastructure/connected-verification.js';

loadEnvironmentFile({ path: process.argv[2] ?? '.env.local', quiet: true });
loadEnvironmentFile({ path: '.env', quiet: true });
const unavailableSecrets = [
  'HISN_LLM_API_KEY',
  'NOKIA_NAC_API_KEY',
  'NOKIA_NAC_ACCESS_TOKEN',
].filter((key) => process.env[key] === '[SENSITIVE]');
if (unavailableSecrets.length) {
  console.log(
    JSON.stringify({
      kind: 'CONNECTED_PREFLIGHT',
      unavailableSecrets,
      reason: 'Vercel secret placeholders cannot authenticate external requests',
    }),
  );
  process.exit(1);
}
const configuration = loadConfiguration(
  {
    ...process.env,
    HISN_MODE: 'SANDBOX',
    HISN_AGENT_PROVIDER: 'AUTO',
    HISN_NOKIA_SIMULATOR: 'false',
    HISN_SESSION_SECRET: randomUUID(),
  },
  process.cwd(),
);
const checks = connectedPreflight(configuration);
console.log(JSON.stringify({ kind: 'CONNECTED_PREFLIGHT', checks }));
if (!checks.groqConfigured || !checks.nokiaConfigured) {
  process.exitCode = 1;
} else {
  const decisions: Array<string | undefined> = [];
  for (const context of ['A', 'B'] as const) {
    const execution = await verifyConnectedContext(configuration, {
      context,
      stage: 'investigation',
    });
    console.log(JSON.stringify({ kind: 'CONNECTED_EXECUTION', ...execution }));
    if (execution.stage !== 'investigation') throw new Error('Unexpected diagnostic stage');
    decisions.push(execution.decision?.state);
    if (!execution.requiredEvidenceComplete || !execution.decision) process.exitCode = 1;
    if (execution.failure) break;
  }
  const contrastProven =
    decisions.length === 2 &&
    decisions.every((decision) => decision !== undefined) &&
    new Set(decisions).size === 2 &&
    !process.exitCode;
  console.log(
    JSON.stringify({ kind: 'CONNECTED_COMPARISON', contrastProven: Boolean(contrastProven) }),
  );
  if (!contrastProven) process.exitCode = 1;
}
