import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {
  NetworkAsCodeApiClient,
  NetworkAsCodeApiError,
  NetworkAsCodeApiTimeoutError,
} from 'network-as-code';
import { z } from 'zod';
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
  type EvidenceProvenance,
  type EvidenceTool,
  type RuntimeMode,
} from '../shared/contracts.js';
import type { NacCredentials } from './configuration.js';

type ToolResult = Record<string, unknown>;

export class NokiaEvidenceProvider implements EvidenceProvider {
  readonly mode: Exclude<RuntimeMode, 'DEMO'>;
  readonly source: 'NOKIA_SANDBOX' | 'NOKIA_LIVE';
  private readonly client: NetworkAsCodeApiClient;
  private healthy = false;

  constructor(
    mode: Exclude<RuntimeMode, 'DEMO'>,
    private readonly credentials: NacCredentials,
    private readonly timeoutMs: number,
    maximumAttempts: number,
  ) {
    this.mode = mode;
    this.source = mode === 'LIVE' ? 'NOKIA_LIVE' : 'NOKIA_SANDBOX';
    this.client = new NetworkAsCodeApiClient({
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl,
      rapidapiHost: credentials.rapidapiHost,
      timeoutInSeconds: timeoutMs / 1000,
      maxRetries: Math.max(0, maximumAttempts - 1),
    });
  }

  async collect(tool: EvidenceTool, context: EvidenceContext, signal: AbortSignal) {
    const startedAt = performance.now();
    try {
      const redactedResult = await this.invoke(tool, context, signal);
      this.healthy = true;
      return this.call(tool, context, 'SUCCEEDED', this.mode, redactedResult, startedAt);
    } catch (error) {
      this.healthy = false;
      if (signal.aborted) throw error;
      if (!isProviderFailure(error)) throw error;
      return this.call(
        tool,
        context,
        'UNAVAILABLE',
        'UNAVAILABLE',
        {
          reason: 'Network evidence provider did not return usable evidence',
          errorType: error.name,
        },
        startedAt,
      );
    }
  }

  async health() {
    return Promise.resolve<'AVAILABLE' | 'DEGRADED'>(this.healthy ? 'AVAILABLE' : 'DEGRADED');
  }

  private invoke(
    tool: EvidenceTool,
    context: EvidenceContext,
    signal: AbortSignal,
  ): Promise<ToolResult> {
    const invokers: Record<EvidenceTool, () => Promise<ToolResult>> = {
      NUMBER_VERIFICATION: () => this.verifyNumber(context, signal),
      SIM_SWAP: () => this.checkSimSwap(context, signal),
      DEVICE_SWAP: () => this.checkDeviceSwap(context, signal),
      LOCATION_VERIFICATION: () => this.verifyLocation(context, signal),
      DEVICE_REACHABILITY: () => this.checkReachability(context, signal),
    };
    return invokers[tool]();
  }

  private async verifyNumber(context: EvidenceContext, signal: AbortSignal) {
    if (!this.credentials.accessToken) {
      throw new TypeError('Subscriber authorization is not configured');
    }
    const response = await this.client.numberVerification.verify(
      { phoneNumber: this.phoneNumber(context) },
      this.requestOptions(context, signal),
    );
    return { verified: response.devicePhoneNumberVerified, subject: 'operator-number:redacted' };
  }

  private async checkSimSwap(context: EvidenceContext, signal: AbortSignal) {
    const response = await this.client.simSwap.check(
      {
        phoneNumber: this.phoneNumber(context),
        maxAge: context.policy.evidence.simSwapMaximumAgeHours,
      },
      this.requestOptions(context, signal),
    );
    return {
      swapped: response.swapped,
      windowHours: context.policy.evidence.simSwapMaximumAgeHours,
    };
  }

  private async checkDeviceSwap(context: EvidenceContext, signal: AbortSignal) {
    const response = await this.client.deviceSwap.check(
      {
        phoneNumber: this.phoneNumber(context),
        maxAge: context.policy.evidence.deviceSwapMaximumAgeHours,
      },
      this.requestOptions(context, signal),
    );
    return {
      swapped: response.swapped,
      windowHours: context.policy.evidence.deviceSwapMaximumAgeHours,
    };
  }

  private async verifyLocation(context: EvidenceContext, signal: AbortSignal) {
    // SDK 10.0.0's generated Area type omits the circle fields required by the API.
    const area = {
      areaType: 'CIRCLE',
      center: {
        latitude: this.credentials.geofence.latitude,
        longitude: this.credentials.geofence.longitude,
      },
      radius: this.credentials.geofence.radiusMeters,
    } as const;
    const response = await this.client.location.verifyV1(
      {
        device: { phoneNumber: this.phoneNumber(context) },
        area,
        maxAge: context.policy.evidence.locationMaximumAgeSeconds,
      },
      this.requestOptions(context, signal),
    );
    return {
      verificationResult: response.verificationResult,
      matchRate: response.matchRate,
      geofence: 'approved-facility:redacted',
      lastLocationTime: response.lastLocationTime,
    };
  }

  private async checkReachability(context: EvidenceContext, signal: AbortSignal) {
    const response = await this.client.deviceStatus.retrieveReachabilityStatus(
      { device: { phoneNumber: this.phoneNumber(context) } },
      this.requestOptions(context, signal),
    );
    return {
      reachable: response.reachable,
      connectivity: response.connectivity,
      lastStatusTime: response.lastStatusTime,
    };
  }

  private requestOptions(context: EvidenceContext, signal: AbortSignal) {
    return {
      abortSignal: signal,
      timeoutInSeconds: this.timeoutMs / 1000,
      headers: {
        ...(this.credentials.accessToken
          ? { Authorization: `Bearer ${this.credentials.accessToken}` }
          : {}),
        'x-correlator': context.correlationId,
      },
    };
  }

  private phoneNumber(context: EvidenceContext) {
    return context.scenario.telecomDevice?.phoneNumber ?? this.credentials.operatorPhone;
  }

  private call(
    tool: EvidenceTool,
    context: EvidenceContext,
    requestStatus: 'SUCCEEDED' | 'UNAVAILABLE',
    provenance: EvidenceProvenance,
    redactedResult: ToolResult,
    startedAt: number,
  ) {
    return EvidenceCallSchema.parse({
      id: randomUUID(),
      tool,
      purpose: evidencePurpose(tool),
      requestStatus,
      redactedResult,
      provenance,
      latencyMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
    });
  }
}

export class NokiaEnforcementProvider implements EnforcementProvider {
  readonly mode: Exclude<RuntimeMode, 'DEMO'>;
  readonly source: 'NOKIA_SANDBOX' | 'NOKIA_LIVE';
  private readonly client: NetworkAsCodeApiClient;
  private healthy = false;

  constructor(
    mode: Exclude<RuntimeMode, 'DEMO'>,
    private readonly credentials: NacCredentials,
    private readonly timeoutMs: number,
  ) {
    this.mode = mode;
    this.source = mode === 'LIVE' ? 'NOKIA_LIVE' : 'NOKIA_SANDBOX';
    this.client = new NetworkAsCodeApiClient({
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl,
      rapidapiHost: credentials.rapidapiHost,
      timeoutInSeconds: timeoutMs / 1000,
      maxRetries: 0,
    });
  }

  async detachGateway(context: EnforcementContext, signal: AbortSignal) {
    return this.execute(context, 'DETACH_GATEWAY', signal, async () => {
      if (!this.credentials.operationalSliceId || !this.credentials.gatewayNai) {
        return {
          status: 'UNAVAILABLE' as const,
          result: { reason: 'Specialized-network attachment is not configured' },
        };
      }
      const attachments = await this.client.slice.getDeviceAttachments(
        this.requestOptions(context, signal),
      );
      const match = attachments.find(
        (attachment) =>
          attachment.resource.sliceId === this.credentials.operationalSliceId &&
          attachment.resource.device.networkAccessIdentifier === this.credentials.gatewayNai,
      );
      if (!match)
        return {
          status: 'UNAVAILABLE' as const,
          result: { reason: 'Attachment resource not found' },
        };
      const response = await this.client.slice.deleteDeviceAttachment(
        { resource_id: match.nac_resource_id },
        this.requestOptions(context, signal),
      );
      return {
        status:
          response.deviceStatus === 'DETACHED' ? ('SUCCEEDED' as const) : ('UNAVAILABLE' as const),
        result: {
          attachment: response.deviceStatus ?? 'DETACH_REQUESTED',
          resource: 'gateway:redacted',
        },
      };
    });
  }

  async protectBackup(context: EnforcementContext, signal: AbortSignal) {
    return this.execute(context, 'QUALITY_ON_DEMAND', signal, async () => {
      const response = await this.client.qod.createSessionV1(
        {
          device: { phoneNumber: this.credentials.backupPhone },
          applicationServer: { ipv4Address: this.credentials.appServerIpv4 },
          qosProfile: context.policy.containment.continuityQosProfile,
          duration: context.policy.containment.continuityDurationSeconds,
        },
        this.requestOptions(context, signal),
      );
      const lifecycle = [response.qosStatus];
      let current = response;
      for (let attempt = 0; attempt < 2 && current.qosStatus === 'REQUESTED'; attempt += 1) {
        await delay(150, undefined, { signal });
        current = await this.client.qod.getSessionV1(
          { sessionId: response.sessionId },
          this.requestOptions(context, signal),
        );
        lifecycle.push(current.qosStatus);
      }
      let cleanup: 'RELEASED' | 'FAILED' = 'RELEASED';
      try {
        await this.client.qod.deleteSessionV1(
          { sessionId: response.sessionId },
          this.requestOptions(context, AbortSignal.timeout(this.timeoutMs)),
        );
      } catch (error) {
        if (!isProviderFailure(error)) throw error;
        cleanup = 'FAILED';
      }
      return {
        status:
          current.qosStatus === 'AVAILABLE'
            ? ('SUCCEEDED' as const)
            : current.qosStatus === 'REQUESTED'
              ? ('PENDING' as const)
              : ('UNAVAILABLE' as const),
        result: {
          qosStatus: current.qosStatus,
          lifecycle,
          session: 'qod-session:redacted',
          duration: response.duration,
          cleanup,
        },
      };
    });
  }

  async health() {
    return Promise.resolve<'AVAILABLE' | 'DEGRADED'>(this.healthy ? 'AVAILABLE' : 'DEGRADED');
  }

  private requestOptions(context: EnforcementContext, signal: AbortSignal) {
    return {
      abortSignal: signal,
      timeoutInSeconds: this.timeoutMs / 1000,
      headers: {
        ...(this.credentials.accessToken
          ? { Authorization: `Bearer ${this.credentials.accessToken}` }
          : {}),
        'x-correlator': context.correlationId,
      },
    };
  }

  private async execute(
    context: EnforcementContext,
    action: EnforcementCall['action'],
    signal: AbortSignal,
    invoke: () => Promise<{
      status: 'SUCCEEDED' | 'PENDING' | 'UNAVAILABLE';
      result: ToolResult;
    }>,
  ) {
    const startedAt = performance.now();
    try {
      const outcome = await invoke();
      this.healthy = outcome.status === 'SUCCEEDED' || outcome.status === 'PENDING';
      return this.call(context, action, outcome.status, outcome.result, startedAt);
    } catch (error) {
      if (signal.aborted) throw error;
      if (!isProviderFailure(error)) throw error;
      return this.call(
        context,
        action,
        'UNAVAILABLE',
        { reason: 'Network enforcement provider did not complete', errorType: error.name },
        startedAt,
      );
    }
  }

  private call(
    context: EnforcementContext,
    action: EnforcementCall['action'],
    status: 'SUCCEEDED' | 'PENDING' | 'UNAVAILABLE',
    redactedResult: ToolResult,
    startedAt: number,
  ) {
    return EnforcementCallSchema.parse({
      id: randomUUID(),
      action,
      status,
      provenance: status === 'SUCCEEDED' || status === 'PENDING' ? this.mode : 'UNAVAILABLE',
      redactedResult,
      latencyMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      idempotencyKey: `${context.correlationId}:${action}`,
    });
  }
}

function isProviderFailure(error: unknown): error is Error {
  return (
    error instanceof NetworkAsCodeApiError ||
    error instanceof NetworkAsCodeApiTimeoutError ||
    error instanceof z.ZodError ||
    error instanceof TypeError
  );
}
