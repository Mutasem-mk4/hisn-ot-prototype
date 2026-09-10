import type {
  AgentPlan,
  AgentInvestigation,
  AgentRecommendation,
  Command,
  DecisionRecord,
  DomainEvent,
  EnforcementCall,
  EvidenceCall,
  EvidenceTool,
  IncidentReport,
  Policy,
  Principal,
  RiskLevel,
  RuntimeMode,
  SafetyEvaluation,
  Scenario,
  TwinState,
  WorkflowState,
} from '../shared/contracts.js';

export type { IncidentReport } from '../shared/contracts.js';

export type AgentPlanRequest = {
  command: Command;
  principal: Principal;
  policy: Policy;
  twin: TwinState;
};

export type AgentRecommendationRequest = AgentPlanRequest & {
  evidence: EvidenceCall[];
  safety: SafetyEvaluation;
};

export interface AgentReasoner {
  readonly mode: 'DETERMINISTIC' | 'LANGGRAPH' | 'UNAVAILABLE';
  plan(request: AgentPlanRequest, signal: AbortSignal): Promise<AgentPlan>;
  investigate(
    request: AgentPlanRequest,
    initialPlan: AgentPlan,
    executeTool: (tool: EvidenceTool, signal: AbortSignal) => Promise<EvidenceCall>,
    signal: AbortSignal,
  ): Promise<AgentInvestigation>;
  recommend(request: AgentRecommendationRequest, signal: AbortSignal): Promise<AgentRecommendation>;
}

export type EvidenceContext = {
  correlationId: string;
  scenario: Scenario;
  policy: Policy;
};

export type ProviderSource =
  'SIMULATED' | 'NOKIA_SANDBOX' | 'NOKIA_SANDBOX_WITH_FALLBACK' | 'NOKIA_LIVE' | 'UNAVAILABLE';

export interface EvidenceProvider {
  readonly mode: RuntimeMode;
  readonly source: ProviderSource;
  collect(tool: EvidenceTool, context: EvidenceContext, signal: AbortSignal): Promise<EvidenceCall>;
  health(): Promise<'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'>;
}

export type EnforcementContext = EvidenceContext & { decision: DecisionRecord };

export interface EnforcementProvider {
  readonly mode: RuntimeMode;
  readonly source: ProviderSource;
  detachGateway(context: EnforcementContext, signal: AbortSignal): Promise<EnforcementCall>;
  protectBackup(context: EnforcementContext, signal: AbortSignal): Promise<EnforcementCall>;
  health(): Promise<'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'>;
}

export type RunRecord = {
  id: string;
  scenarioId: string;
  correlationId: string;
  commandIdempotencyKey: string;
  runtimeMode: RuntimeMode;
  workflowState: WorkflowState | null;
  playbackStatus: 'PAUSED' | 'PLAYING' | 'COMPLETE' | 'FAILED_SAFE';
  presentationCursor: number;
  speed: number;
  twin: TwinState;
  command: Command;
  createdAt: string;
  updatedAt: string;
};

export type RunSnapshot = {
  run: RunRecord;
  events: DomainEvent[];
  visibleEvents: DomainEvent[];
  currentEvent: DomainEvent | null;
  scenario: Pick<Scenario, 'id' | 'name' | 'principal'>;
  policyVersion: string;
  safePressureBand: Policy['safePressureBand'];
  setPressureMaximumPercent: number;
  integration: IntegrationReadiness;
  lowRiskComparison: AgentPlan | null;
  presentationTwin: TwinState;
  artifacts: WorkflowArtifacts;
  incidentAvailable: boolean;
};

export type IntegrationReadiness = {
  runtimeMode: RuntimeMode;
  database: 'READY' | 'NOT_READY';
  digitalTwin: 'READY' | 'NOT_READY';
  policy: 'READY' | 'NOT_READY';
  scenario: 'READY' | 'NOT_READY';
  evidenceProvider: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  enforcementProvider: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  evidenceSource: ProviderSource;
  enforcementSource: ProviderSource;
  agentReasoner: AgentReasoner['mode'];
};

export type EventAppend = {
  runId: string;
  eventType: string;
  workflowState: WorkflowState | null;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export interface AuditStore {
  migrate(): void;
  createRun(run: RunRecord): void;
  updateRun(run: RunRecord): void;
  currentRun(): RunRecord | null;
  runById(runId: string): RunRecord | null;
  runByCommandIdempotencyKey(idempotencyKey: string): RunRecord | null;
  appendEvent(event: EventAppend): DomainEvent;
  commitTransition(run: RunRecord, event: EventAppend): DomainEvent;
  eventsForRun(runId: string): DomainEvent[];
  saveEnforcement(call: EnforcementCall, runId: string): EnforcementCall;
  completeEnforcement(call: EnforcementCall, runId: string): EnforcementCall;
  enforcementForRun(runId: string): EnforcementCall[];
  saveIncident(runId: string, correlationId: string, report: IncidentReport): void;
  incidentForRun(runId: string): IncidentReport | null;
}

export type WorkflowArtifacts = {
  risk?: RiskLevel | undefined;
  plan?: AgentPlan | undefined;
  evidence?: EvidenceCall[] | undefined;
  agentTrace?: AgentInvestigation['trace'] | undefined;
  safety?: SafetyEvaluation | undefined;
  recommendation?: AgentRecommendation | undefined;
  decision?: DecisionRecord | undefined;
};
