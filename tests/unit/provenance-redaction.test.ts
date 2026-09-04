import { describe, expect, it } from 'vitest';
import { SimulatedEvidenceProvider } from '../../src/infrastructure/simulated-providers.js';
import { testPolicy, testScenario } from '../helpers/fixtures.js';

describe('provider provenance and redaction', () => {
  it('labels fixture evidence simulated without exposing an unredacted number', async () => {
    const provider = new SimulatedEvidenceProvider();
    const call = await provider.collect(
      'NUMBER_VERIFICATION',
      { correlationId: 'correlation-test', scenario: testScenario(), policy: testPolicy() },
      new AbortController().signal,
    );
    expect(call.provenance).toBe('SIMULATED');
    expect(JSON.stringify(call)).not.toMatch(/\+\d{7,15}/);
    expect(JSON.stringify(call)).toContain('***');
  });

  it('keeps unavailable fixture provenance accurate', async () => {
    const provider = new SimulatedEvidenceProvider();
    const call = await provider.collect(
      'SIM_SWAP',
      {
        correlationId: 'correlation-test',
        scenario: testScenario('judge-degraded-provider'),
        policy: testPolicy(),
      },
      new AbortController().signal,
    );
    expect(call.requestStatus).toBe('UNAVAILABLE');
    expect(call.provenance).toBe('UNAVAILABLE');
  });
});
