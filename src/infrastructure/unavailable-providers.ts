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
  type EvidenceTool,
} from '../shared/contracts.js';

export class UnavailableEvidenceProvider implements EvidenceProvider {
  readonly mode = 'SANDBOX' as const;
  readonly source = 'UNAVAILABLE' as const;
  constructor(private readonly reason = 'Provider credentials are not configured') {}

  async collect(tool: EvidenceTool, context: EvidenceContext) {
    return Promise.resolve(
      EvidenceCallSchema.parse({
        id: randomUUID(),
        tool,
        purpose: evidencePurpose(tool),
        requestStatus: 'UNAVAILABLE',
        redactedResult: { reason: this.reason, externalRequestMade: false },
        provenance: 'UNAVAILABLE',
        latencyMs: 0,
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId,
      }),
    );
  }

  async health() {
    return Promise.resolve<'UNAVAILABLE'>('UNAVAILABLE');
  }
}

export class UnavailableEnforcementProvider implements EnforcementProvider {
  readonly mode = 'SANDBOX' as const;
  readonly source = 'UNAVAILABLE' as const;

  detachGateway(context: EnforcementContext) {
    return this.result(context, 'DETACH_GATEWAY');
  }

  protectBackup(context: EnforcementContext) {
    return this.result(context, 'QUALITY_ON_DEMAND');
  }

  async health() {
    return Promise.resolve<'UNAVAILABLE'>('UNAVAILABLE');
  }

  private result(context: EnforcementContext, action: 'DETACH_GATEWAY' | 'QUALITY_ON_DEMAND') {
    return Promise.resolve(
      EnforcementCallSchema.parse({
        id: randomUUID(),
        action,
        status: 'UNAVAILABLE',
        provenance: 'UNAVAILABLE',
        redactedResult: { reason: 'Provider credentials are not configured' },
        latencyMs: 0,
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId,
        idempotencyKey: `${context.correlationId}:${action}`,
      }),
    );
  }
}
