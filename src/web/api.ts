import { z } from 'zod';
import type { IncidentReport, RunSnapshot } from '../application/ports.js';
import {
  AgentPlanSchema,
  AgentRecommendationSchema,
  CommandSchema,
  DecisionRecordSchema,
  DomainEventSchema,
  EvidenceCallSchema,
  IncidentReportSchema,
  PrincipalSchema,
  RuntimeModeSchema,
  SafetyEvaluationSchema,
  TwinStateSchema,
  WorkflowStateSchema,
} from '../shared/contracts.js';

type Session = {
  csrfToken: string;
  role: string;
  runtimeMode: string;
};

const SessionSchema: z.ZodType<Session> = z
  .object({
    csrfToken: z.string(),
    role: z.string(),
    runtimeMode: RuntimeModeSchema,
  })
  .strict();

const RunSnapshotSchema: z.ZodType<RunSnapshot> = z
  .object({
    run: z
      .object({
        id: z.string(),
        scenarioId: z.string(),
        correlationId: z.string(),
        commandIdempotencyKey: z.string(),
        runtimeMode: RuntimeModeSchema,
        workflowState: WorkflowStateSchema.nullable(),
        playbackStatus: z.enum(['PAUSED', 'PLAYING', 'COMPLETE', 'FAILED_SAFE']),
        presentationCursor: z.number().int().positive(),
        speed: z.number().positive(),
        twin: TwinStateSchema,
        command: CommandSchema,
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
      .strict(),
    events: z.array(DomainEventSchema),
    visibleEvents: z.array(DomainEventSchema),
    currentEvent: DomainEventSchema.nullable(),
    scenario: z.object({ id: z.string(), name: z.string(), principal: PrincipalSchema }).strict(),
    policyVersion: z.string(),
    safePressureBand: z.object({ minimumPercent: z.number(), maximumPercent: z.number() }).strict(),
    setPressureMaximumPercent: z.number(),
    integration: z
      .object({
        runtimeMode: RuntimeModeSchema,
        database: z.enum(['READY', 'NOT_READY']),
        digitalTwin: z.enum(['READY', 'NOT_READY']),
        policy: z.enum(['READY', 'NOT_READY']),
        scenario: z.enum(['READY', 'NOT_READY']),
        evidenceProvider: z.enum(['AVAILABLE', 'DEGRADED', 'UNAVAILABLE']),
        enforcementProvider: z.enum(['AVAILABLE', 'DEGRADED', 'UNAVAILABLE']),
        agentReasoner: z.enum(['DETERMINISTIC', 'LIVE_LLM']),
      })
      .strict(),
    lowRiskComparison: AgentPlanSchema,
    presentationTwin: TwinStateSchema,
    artifacts: z
      .object({
        risk: AgentPlanSchema.shape.risk.optional(),
        plan: AgentPlanSchema.optional(),
        evidence: z.array(EvidenceCallSchema).optional(),
        safety: SafetyEvaluationSchema.optional(),
        recommendation: AgentRecommendationSchema.optional(),
        decision: DecisionRecordSchema.optional(),
      })
      .strict(),
    incidentAvailable: z.boolean(),
  })
  .strict();

const ErrorResponseSchema = z.object({ error: z.object({ message: z.string() }) }).strict();

let session: Session | null = null;

export async function initializeSession(): Promise<Session> {
  session = await request('/api/v1/session', SessionSchema);
  return session;
}

export function getJudgeRun(): Promise<RunSnapshot> {
  return request('/api/v1/judge-run', RunSnapshotSchema);
}

export function createJudgeRun(scenarioId: string): Promise<RunSnapshot> {
  return mutate(
    '/api/v1/judge-run',
    { scenarioId, idempotencyKey: crypto.randomUUID() },
    RunSnapshotSchema,
  );
}

export function controlJudgeRun(
  action: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'RESET',
  speed?: string,
): Promise<RunSnapshot> {
  return mutate(
    '/api/v1/judge-run/control',
    { action, ...(speed ? { speed } : {}) },
    RunSnapshotSchema,
  );
}

export function getIncident(runId: string): Promise<IncidentReport> {
  return request(`/api/v1/judge-run/${encodeURIComponent(runId)}/incident`, IncidentReportSchema);
}

export function incidentDownloadUrl(runId: string): string {
  return `/api/v1/judge-run/${encodeURIComponent(runId)}/incident?download=1`;
}

export function subscribeToRun(
  onSnapshot: (snapshot: RunSnapshot) => void,
  onInvalidPayload: (message: string) => void,
): () => void {
  const source = new EventSource('/api/v1/events');
  source.addEventListener('snapshot', (event) => {
    try {
      const parsed = RunSnapshotSchema.parse(JSON.parse((event as MessageEvent<string>).data));
      onSnapshot(parsed);
    } catch {
      source.close();
      onInvalidPayload('The event stream returned an invalid snapshot and was closed safely.');
    }
  });
  return () => source.close();
}

async function mutate<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  if (!session) throw new Error('Session has not been initialized');
  return request(path, schema, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
    body: JSON.stringify(body),
  });
}

async function request<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: 'same-origin' });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = ErrorResponseSchema.safeParse(body);
    throw new Error(error.success ? error.data.error.message : 'Request failed');
  }
  return schema.parse(body);
}
