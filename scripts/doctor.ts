import { resolve } from 'node:path';
import { config as loadEnvironmentFile } from 'dotenv';
import { loadConfiguration } from '../src/infrastructure/configuration.js';

loadEnvironmentFile({ path: resolve(process.cwd(), '.env.local'), quiet: true });
loadEnvironmentFile({ path: resolve(process.cwd(), '.env'), quiet: true });

try {
  const configuration = loadConfiguration(process.env, process.cwd());
  const checks = [
    ['Runtime', configuration.mode],
    [
      'Agent framework',
      configuration.llm
        ? 'LANGGRAPH'
        : configuration.hosted
          ? 'UNAVAILABLE (COMMANDS HELD)'
          : 'LOCAL DETERMINISTIC DEMO',
    ],
    ['Groq model', configuration.llm ? 'CONFIGURED' : 'NOT CONFIGURED'],
    [
      'Nokia evidence',
      configuration.nokiaSimulatorEnabled && configuration.nac
        ? 'NOKIA SANDBOX'
        : configuration.mode === 'DEMO'
          ? 'SIMULATED'
          : 'NOT CONFIGURED',
    ],
    ['Number Verification', configuration.nac?.accessToken ? 'NOKIA OAUTH' : 'LOCAL FALLBACK'],
    [
      'Slice attachment',
      configuration.nac?.gatewayNai && configuration.nac.operationalSliceId
        ? 'CONFIGURED'
        : 'LOCAL FALLBACK',
    ],
    ['Policy', configuration.policy.policyVersion],
  ];

  console.log('HISN-OT runtime doctor');
  console.log('----------------------');
  for (const [label, value] of checks) console.log(`${label.padEnd(22)} ${value}`);
  console.log('\nNo secret values were printed.');
} catch (error) {
  console.error('HISN-OT configuration is invalid.');
  console.error(error instanceof Error ? error.message : 'Unknown configuration error');
  process.exitCode = 1;
}
