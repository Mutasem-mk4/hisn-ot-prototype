import type {
  EnforcementContext,
  EnforcementProvider,
  EvidenceContext,
  EvidenceProvider,
} from '../application/ports.js';
import type { EnforcementCall, EvidenceCall, EvidenceTool } from '../shared/contracts.js';

export class NokiaSimulatorEvidenceProvider implements EvidenceProvider {
  readonly mode = 'DEMO' as const;
  readonly source = 'NOKIA_SANDBOX_WITH_FALLBACK' as const;

  constructor(
    private readonly nokia: EvidenceProvider,
    private readonly fallback: EvidenceProvider,
  ) {}

  async collect(tool: EvidenceTool, context: EvidenceContext, signal: AbortSignal) {
    const primary = await this.nokia.collect(tool, context, signal);
    if (primary.requestStatus === 'SUCCEEDED') return primary;
    const fallback = await this.fallback.collect(tool, context, signal);
    return {
      ...fallback,
      redactedResult: {
        ...fallback.redactedResult,
        fallbackReason: fallbackReason(primary, 'Nokia evidence unavailable'),
      },
    } satisfies EvidenceCall;
  }

  async health() {
    const health = await this.nokia.health();
    return health === 'AVAILABLE' ? ('AVAILABLE' as const) : ('DEGRADED' as const);
  }
}

export class NokiaSimulatorEnforcementProvider implements EnforcementProvider {
  readonly mode = 'DEMO' as const;
  readonly source = 'NOKIA_SANDBOX_WITH_FALLBACK' as const;

  constructor(
    private readonly nokia: EnforcementProvider,
    private readonly fallback: EnforcementProvider,
  ) {}

  async detachGateway(context: EnforcementContext, signal: AbortSignal) {
    return this.withFallback(await this.nokia.detachGateway(context, signal), () =>
      this.fallback.detachGateway(context, signal),
    );
  }

  async protectBackup(context: EnforcementContext, signal: AbortSignal) {
    return this.withFallback(await this.nokia.protectBackup(context, signal), () =>
      this.fallback.protectBackup(context, signal),
    );
  }

  async health() {
    const health = await this.nokia.health();
    return health === 'AVAILABLE' ? ('AVAILABLE' as const) : ('DEGRADED' as const);
  }

  private async withFallback(primary: EnforcementCall, fallback: () => Promise<EnforcementCall>) {
    if (primary.status !== 'UNAVAILABLE' && primary.status !== 'FAILED') return primary;
    const simulated = await fallback();
    return {
      ...simulated,
      redactedResult: {
        ...simulated.redactedResult,
        fallbackReason: fallbackReason(primary, 'Nokia enforcement unavailable'),
      },
    } satisfies EnforcementCall;
  }
}

function fallbackReason(primary: EvidenceCall | EnforcementCall, defaultReason: string): string {
  return typeof primary.redactedResult.reason === 'string'
    ? primary.redactedResult.reason
    : defaultReason;
}
