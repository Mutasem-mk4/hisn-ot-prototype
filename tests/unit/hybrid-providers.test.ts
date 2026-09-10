import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type {
  EnforcementContext,
  EnforcementProvider,
  EvidenceContext,
  EvidenceProvider,
} from '../../src/application/ports.js';
import { loadConfiguration } from '../../src/infrastructure/configuration.js';
import {
  NokiaSimulatorEnforcementProvider,
  NokiaSimulatorEvidenceProvider,
} from '../../src/infrastructure/hybrid-providers.js';
import {
  SimulatedEnforcementProvider,
  SimulatedEvidenceProvider,
} from '../../src/infrastructure/simulated-providers.js';
import {
  EnforcementCallSchema,
  EvidenceCallSchema,
  type EnforcementCall,
  type EvidenceCall,
} from '../../src/shared/contracts.js';

const configuration = loadConfiguration({ HISN_MODE: 'DEMO' }, process.cwd());
const scenario = configuration.scenarios[0]!;
const evidenceContext: EvidenceContext = {
  correlationId: 'hisn-hybrid-provider-test',
  scenario,
  policy: configuration.policy,
};

describe('Nokia simulator provider fallbacks', () => {
  it('uses a labeled fixture only when Nokia evidence is unavailable', async () => {
    const nokiaUnavailable = evidenceProvider(
      EvidenceCallSchema.parse({
        id: randomUUID(),
        tool: 'SIM_SWAP',
        purpose: 'Check recent SIM reassociation',
        requestStatus: 'UNAVAILABLE',
        redactedResult: { reason: 'Subscriber authorization is not configured' },
        provenance: 'UNAVAILABLE',
        latencyMs: 12,
        timestamp: new Date().toISOString(),
        correlationId: evidenceContext.correlationId,
      }),
    );
    const provider = new NokiaSimulatorEvidenceProvider(
      nokiaUnavailable,
      new SimulatedEvidenceProvider(),
    );

    const call = await provider.collect('SIM_SWAP', evidenceContext, new AbortController().signal);

    expect(call.requestStatus).toBe('SUCCEEDED');
    expect(call.provenance).toBe('SIMULATED');
    expect(call.redactedResult.fallbackReason).toBe('Subscriber authorization is not configured');
  });

  it('keeps a pending Nokia QoD allocation instead of replacing it with simulated success', async () => {
    const pendingCall = EnforcementCallSchema.parse({
      id: randomUUID(),
      action: 'QUALITY_ON_DEMAND',
      status: 'PENDING',
      provenance: 'SANDBOX',
      redactedResult: { qosStatus: 'REQUESTED', cleanup: 'RELEASED' },
      latencyMs: 24,
      timestamp: new Date().toISOString(),
      correlationId: evidenceContext.correlationId,
      idempotencyKey: `${evidenceContext.correlationId}:QUALITY_ON_DEMAND`,
    });
    const provider = new NokiaSimulatorEnforcementProvider(
      enforcementProvider(pendingCall),
      new SimulatedEnforcementProvider(),
    );
    const context: EnforcementContext = {
      ...evidenceContext,
      decision: {
        state: 'BLOCK_AND_CONTAIN',
        requestedAction: 'SET_PRESSURE:88',
        evidenceSummary: [],
        failedPolicies: [],
        failedLimits: [],
        containmentRationale: 'Critical contextual anomalies require containment.',
        recoveryRequirements: [],
        authoritativeSource: 'DETERMINISTIC_POLICY_ENGINE',
      },
    };

    const call = await provider.protectBackup(context, new AbortController().signal);

    expect(call.status).toBe('PENDING');
    expect(call.provenance).toBe('SANDBOX');
    expect(call.redactedResult.qosStatus).toBe('REQUESTED');
  });
});

function evidenceProvider(call: EvidenceCall): EvidenceProvider {
  return {
    mode: 'SANDBOX',
    source: 'NOKIA_SANDBOX',
    collect: () => Promise.resolve(call),
    health: () => Promise.resolve('DEGRADED'),
  };
}

function enforcementProvider(call: EnforcementCall): EnforcementProvider {
  return {
    mode: 'SANDBOX',
    source: 'NOKIA_SANDBOX',
    detachGateway: () => Promise.resolve(call),
    protectBackup: () => Promise.resolve(call),
    health: () => Promise.resolve('AVAILABLE'),
  };
}
