import { resolve } from 'node:path';
import { config as loadEnvironmentFile } from 'dotenv';
import { loadConfiguration } from '../src/infrastructure/configuration.js';
import { rehearsalConfiguration } from '../src/infrastructure/judge-rehearsal.js';
import { createProviders } from '../src/infrastructure/provider-factory.js';

loadEnvironmentFile({ path: resolve(process.cwd(), '.env.local'), quiet: true });
loadEnvironmentFile({ path: resolve(process.cwd(), '.env'), quiet: true });

try {
  const configuration = rehearsalConfiguration(loadConfiguration(process.env, process.cwd()));
  const providers = createProviders(configuration);
  const checks = [
    ['Runtime', configuration.mode],
    ['Agent framework', providers.reasoner.mode],
    ['Groq model', configuration.llm ? 'CONFIGURED' : 'NOT CONFIGURED'],
    [
      'Nokia evidence',
      configuration.mode === 'SANDBOX' && configuration.nac
        ? 'NOKIA SANDBOX'
        : configuration.mode === 'DEMO'
          ? 'SIMULATED'
          : 'NOT CONFIGURED',
    ],
    ['Number Verification', 'SEPARATE DIAGNOSTIC; NOT IN PRIMARY ASSURANCE FLOOR'],
    [
      'Slice attachment',
      configuration.nac?.gatewayNai && configuration.nac.operationalSliceId
        ? 'CONFIGURED'
        : configuration.mode === 'DEMO'
          ? 'LOCAL SIMULATION'
          : 'UNAVAILABLE',
    ],
    ['Policy', configuration.policy.policyVersion],
  ];

  console.log('HISN-Oil runtime doctor');
  console.log('----------------------');
  for (const [label, value] of checks) console.log(`${label.padEnd(22)} ${value}`);
  console.log('\nNo secret values were printed.');
} catch (error) {
  console.error('HISN-Oil configuration is invalid.');
  console.error(error instanceof Error ? error.message : 'Unknown configuration error');
  process.exitCode = 1;
}
