import { randomUUID } from 'node:crypto';
import type {
  EnforcementContext,
  EnforcementProvider,
  EvidenceContext,
  EvidenceProvider,
} from '../application/ports.js';
import { evidencePurpose } from '../domain/evidence.js';
import {
  EnforcementCallSchema,
  EvidenceCallSchema,
  type EnforcementCall,
  type EvidenceTool,
} from '../shared/contracts.js';

export class SimulatedEvidenceProvider implements EvidenceProvider {
  readonly mode = 'DEMO' as const;

  async collect(tool: EvidenceTool, context: EvidenceContext, signal: AbortSignal) {
    signal.throwIfAborted();
    const fixture = context.scenario.evidence[tool];
    await Promise.resolve();
    signal.throwIfAborted();
    return EvidenceCallSchema.parse({
      id: randomUUID(),
      tool,
      purpose: evidencePurpose(tool),
      requestStatus: fixture.status,
      redactedResult: fixture.redacted,
      provenance: fixture.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'SIMULATED',
      latencyMs: fixture.latencyMs,
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
    });
  }

  async health() {
    return Promise.resolve<'AVAILABLE'>('AVAILABLE');
  }
}

export class SimulatedEnforcementProvider implements EnforcementProvider {
  readonly mode = 'DEMO' as const;

  async detachGateway(context: EnforcementContext, signal: AbortSignal) {
    signal.throwIfAborted();
    return this.result(context, 'DETACH_GATEWAY', {
      attachment: 'DETACHED',
      scope: 'compromised-gateway-only',
    });
  }

  async protectBackup(context: EnforcementContext, signal: AbortSignal) {
    signal.throwIfAborted();
    return this.result(context, 'QUALITY_ON_DEMAND', {
      qosStatus: 'AVAILABLE',
      profile: context.policy.containment.continuityQosProfile,
      durationSeconds: context.policy.containment.continuityDurationSeconds,
    });
  }

  async health() {
    return Promise.resolve<'AVAILABLE'>('AVAILABLE');
  }

  private result(
    context: EnforcementContext,
    action: EnforcementCall['action'],
    redactedResult: Record<string, unknown>,
  ) {
    return Promise.resolve(
      EnforcementCallSchema.parse({
        id: randomUUID(),
        action,
        status: 'SUCCEEDED',
        provenance: 'SIMULATED',
        redactedResult,
        latencyMs: action === 'DETACH_GATEWAY' ? 128 : 164,
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId,
        idempotencyKey: `${context.correlationId}:${action}`,
      }),
    );
  }
}
