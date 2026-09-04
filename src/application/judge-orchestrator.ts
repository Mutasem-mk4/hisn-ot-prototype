import { randomUUID } from 'node:crypto';
import {
  advanceHeartbeats,
  containGateway,
  continuityMetrics,
  holdCommand,
  protectContinuity,
  resolveHeldCommand,
} from '../domain/digital-twin.js';
import { issueDecision } from '../domain/decision-engine.js';
import { evaluatePhysicalSafety } from '../domain/safety-engine.js';
import { assertTransition, isTerminalState, nextWorkflowState } from '../domain/state-machine.js';
import {
  AgentPlanSchema,
  AgentRecommendationSchema,
  DecisionRecordSchema,
  EnforcementCallSchema,
  EvidenceCallSchema,
  SafetyEvaluationSchema,
  TwinStateSchema,
  type AgentPlan,
  type DomainEvent,
  type EnforcementCall,
  type Scenario,
  type WorkflowState,
} from '../shared/contracts.js';
import { HisnError } from '../shared/errors.js';
import type {
  AgentReasoner,
  AuditStore,
  EnforcementProvider,
  EvidenceProvider,
  IntegrationReadiness,
  RunRecord,
  RunSnapshot,
  WorkflowArtifacts,
} from './ports.js';
import { buildIncidentReport } from './incident-report.js';

const PRESENTATION_STEP_MS = 7_000;

export class JudgeOrchestrator {
  private busy = false;
  private lowRiskComparison: AgentPlan | null = null;

  constructor(
    private readonly store: AuditStore,
    private readonly policy: Parameters<typeof evaluatePhysicalSafety>[1],
    private readonly scenarios: Scenario[],
    private readonly evidenceProvider: EvidenceProvider,
    private readonly enforcementProvider: EnforcementProvider,
    private readonly reasoner: AgentReasoner,
    private readonly onChange: (snapshot: RunSnapshot) => void = () => undefined,
  ) {}

  async ensureRun(scenarioId = 'judge-valid-credentials-compromised-context') {
    const current = this.store.currentRun();
    return current ? this.snapshot(current) : this.createRun(scenarioId);
  }

  async createRun(scenarioId: string, commandIdempotencyKey: string = randomUUID()) {
    const existing = this.store.runByCommandIdempotencyKey(commandIdempotencyKey);
    if (existing) {
      if (existing.scenarioId !== scenarioId) {
        throw new HisnError(
          'COMMAND_INVALID',
          'The command idempotency key is already bound to a different request',
          409,
        );
      }
      return this.snapshot(existing);
    }
    const scenario = this.scenario(scenarioId);
    const now = new Date().toISOString();
    const run: RunRecord = {
      id: randomUUID(),
      scenarioId: scenario.id,
      correlationId: `hisn-${randomUUID()}`,
      commandIdempotencyKey,
      runtimeMode: this.evidenceProvider.mode,
      workflowState: null,
      playbackStatus: 'PAUSED',
      presentationCursor: 1,
      speed: 1,
      twin: scenario.initialTwin,
      command: scenario.command,
      createdAt: now,
      updatedAt: now,
    };
    this.store.createRun(run);
    this.store.appendEvent({
      runId: run.id,
      eventType: 'PROCESS_BASELINE_OBSERVED',
      workflowState: null,
      payload: {
        headline: 'Normal operation verified',
        detail: 'Primary and backup controllers are reachable; pressure and production are stable.',
        twin: run.twin,
      },
      occurredAt: now,
    });
    const snapshot = await this.snapshot(run);
    this.onChange(snapshot);
    return snapshot;
  }

  async control(action: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'RESET', speed?: number) {
    const run = this.requireCurrentRun();
    if (action === 'RESET') return this.createRun(run.scenarioId);
    if (action === 'PREVIOUS') return this.moveCursor(run, -1);
    if (action === 'PAUSE') return this.updatePlayback(run, 'PAUSED', speed);
    if (action === 'PLAY') return this.updatePlayback(run, 'PLAYING', speed);
    return this.advance(run);
  }

  async tick() {
    const run = this.store.currentRun();
    if (!run || run.playbackStatus !== 'PLAYING' || this.busy) return;
    const elapsed = Date.now() - Date.parse(run.updatedAt);
    if (elapsed >= PRESENTATION_STEP_MS / run.speed) await this.advance(run);
  }

  async snapshot(run = this.requireCurrentRun()): Promise<RunSnapshot> {
    const events = this.store.eventsForRun(run.id);
    const visibleEvents = events.slice(0, run.presentationCursor);
    const scenario = this.scenario(run.scenarioId);
    const lowRiskComparison = await this.compareLowRisk(scenario);
    return {
      run,
      events,
      visibleEvents,
      currentEvent: visibleEvents.at(-1) ?? null,
      scenario: { id: scenario.id, name: scenario.name, principal: scenario.principal },
      policyVersion: this.policy.policyVersion,
      safePressureBand: this.policy.safePressureBand,
      setPressureMaximumPercent: requireConfiguredSetpointMaximum(this.policy),
      integration: await this.readiness(),
      lowRiskComparison,
      presentationTwin: visibleTwin(visibleEvents, scenario),
      artifacts: artifactsFrom(visibleEvents),
      incidentAvailable: this.store.incidentForRun(run.id) !== null,
    };
  }

  private async compareLowRisk(scenario: Scenario): Promise<AgentPlan> {
    if (this.lowRiskComparison) return this.lowRiskComparison;
    this.lowRiskComparison = await this.reasoner.plan(
      {
        command: {
          kind: 'READ_STATUS',
          requestedSetpointPercent: null,
          reason: 'Judge comparison',
        },
        principal: scenario.principal,
        policy: this.policy,
        twin: scenario.initialTwin,
      },
      AbortSignal.timeout(this.policy.providers.timeoutMs),
    );
    return this.lowRiskComparison;
  }

  incident(runId: string) {
    return this.store.incidentForRun(runId);
  }

  async readiness(): Promise<IntegrationReadiness> {
    return {
      runtimeMode: this.evidenceProvider.mode,
      database: 'READY',
      digitalTwin: 'READY',
      policy: 'READY',
      scenario: this.scenarios.length > 0 ? 'READY' : 'NOT_READY',
      evidenceProvider: await this.evidenceProvider.health(),
      enforcementProvider: await this.enforcementProvider.health(),
      agentReasoner: this.reasoner.mode,
    };
  }

  private async advance(run: RunRecord) {
    if (this.busy)
      throw new HisnError('RUN_BUSY', 'A workflow transition is already executing', 409);
    const events = this.store.eventsForRun(run.id);
    if (run.presentationCursor < events.length) return this.moveCursor(run, 1);
    if (isTerminalState(run.workflowState)) return this.snapshot(run);
    this.busy = true;
    try {
      return await this.executeTransition(run, artifactsFrom(events));
    } catch (error) {
      if (error instanceof HisnError && error.code === 'INVALID_TRANSITION') throw error;
      return this.failSafe(run, error);
    } finally {
      this.busy = false;
    }
  }

  private async executeTransition(run: RunRecord, artifacts: WorkflowArtifacts) {
    const requiresContainment = artifacts.decision?.state === 'BLOCK_AND_CONTAIN';
    const next = nextWorkflowState(run.workflowState, requiresContainment);
    if (next === null) return this.snapshot(run);
    assertTransition(run.workflowState, next);
    const scenario = this.scenario(run.scenarioId);
    const result = await this.performState(next, run, scenario, artifacts);
    const updated = this.updateAfterEvent(run, next, result.twin ?? advanceHeartbeats(run.twin));
    const event = this.store.appendEvent({
      runId: run.id,
      eventType: result.eventType,
      workflowState: next,
      payload: { ...result.payload, twin: updated.twin },
      occurredAt: updated.updatedAt,
    });
    updated.presentationCursor = event.sequence;
    if (isTerminalState(next))
      updated.playbackStatus = next === 'FAILED_SAFE' ? 'FAILED_SAFE' : 'COMPLETE';
    this.store.updateRun(updated);
    if (next === 'INCIDENT_REPORTED') this.persistReport(updated, scenario);
    const snapshot = await this.snapshot(updated);
    this.onChange(snapshot);
    return snapshot;
  }

  private performState(
    state: WorkflowState,
    run: RunRecord,
    scenario: Scenario,
    artifacts: WorkflowArtifacts,
  ): Promise<StateResult> {
    const handlers: Record<WorkflowState, () => StateResult | Promise<StateResult>> = {
      COMMAND_RECEIVED: () => ({
        eventType: 'PRIVILEGED_COMMAND_RECEIVED',
        payload: {
          headline: 'Authenticated request received',
          detail: 'Credentials are valid; authorization is deliberately not yet granted.',
          command: run.command,
          credentialsValid: scenario.principal.credentialsValid,
        },
      }),
      COMMAND_HELD: () => ({
        eventType: 'COMMAND_INTERCEPTED',
        payload: {
          headline: 'Gateway holds physical command',
          detail: 'The request has not reached the PLC or actuator.',
          reachedActuator: false,
        },
        twin: holdCommand(run.twin, run.command, run.correlationId),
      }),
      RISK_CLASSIFIED: () => this.classifyRisk(run, scenario),
      EVIDENCE_PLANNED: () => ({
        eventType: 'ADAPTIVE_EVIDENCE_PLAN_CREATED',
        payload: {
          headline: 'Minimum sufficient network proof selected',
          detail: `${artifacts.plan?.selectedTools.length ?? 0} tools selected at runtime for ${artifacts.plan?.risk ?? 'unknown'} risk.`,
          plan: requireArtifact(artifacts.plan, 'agent plan'),
        },
      }),
      EVIDENCE_COLLECTING: () => ({
        eventType: 'NETWORK_EVIDENCE_COLLECTION_STARTED',
        payload: {
          headline: 'Telecom evidence in flight',
          detail: 'Evidence calls are separate from post-decision enforcement.',
          pendingTools: requireArtifact(artifacts.plan, 'agent plan').selectedTools,
        },
      }),
      EVIDENCE_COMPLETE: () => this.collectEvidence(run, scenario, artifacts),
      SAFETY_EVALUATED: () => {
        const safety = evaluatePhysicalSafety(run.command, this.policy);
        return {
          eventType: 'DETERMINISTIC_SAFETY_EVALUATED',
          payload: {
            headline: safety.permitted ? 'Physical limit satisfied' : 'Deterministic limit failed',
            detail: safety.permitted
              ? 'Configured physical policy permits the requested value.'
              : 'The AI cannot override this independent physical-safety result.',
            safety,
          },
        };
      },
      DECISION_ISSUED: () => this.decide(run, scenario, artifacts),
      ENFORCEMENT_STARTED: () => ({
        eventType: 'AUTHORIZED_ENFORCEMENT_STARTED',
        payload: {
          headline: 'Targeted network containment authorized',
          detail: 'Enforcement begins only after BLOCK_AND_CONTAIN is persisted.',
          authorizedDecision: requireArtifact(artifacts.decision, 'decision').state,
        },
      }),
      ENDPOINT_CONTAINED: () => this.detachGateway(run, scenario, artifacts),
      CONTINUITY_PROTECTED: () => this.protectBackup(run, scenario, artifacts),
      INCIDENT_REPORTED: () => this.reportIncident(run, scenario, artifacts),
      FAILED_SAFE: () => ({
        eventType: 'WORKFLOW_FAILED_SAFE',
        payload: { headline: 'Workflow failed safe', detail: 'The held command remains blocked.' },
      }),
    };
    return Promise.resolve(handlers[state]());
  }

  private async classifyRisk(run: RunRecord, scenario: Scenario): Promise<StateResult> {
    const plan = await this.reasoner.plan(
      { command: run.command, principal: scenario.principal, policy: this.policy, twin: run.twin },
      AbortSignal.timeout(this.policy.providers.timeoutMs),
    );
    return {
      eventType: 'COMMAND_RISK_CLASSIFIED',
      payload: {
        headline: `${plan.risk} operational consequence`,
        detail: plan.consequence,
        risk: plan.risk,
        plan,
      },
    };
  }

  private async collectEvidence(
    run: RunRecord,
    scenario: Scenario,
    artifacts: WorkflowArtifacts,
  ): Promise<StateResult> {
    const plan = requireArtifact(artifacts.plan, 'agent plan');
    const signal = AbortSignal.timeout(
      this.policy.providers.timeoutMs * this.policy.providers.maximumAttempts,
    );
    const evidence = await Promise.all(
      plan.selectedTools.map((tool) =>
        this.evidenceProvider.collect(
          tool,
          { correlationId: run.correlationId, scenario, policy: this.policy },
          signal,
        ),
      ),
    );
    return {
      eventType: 'NETWORK_EVIDENCE_COMPLETE',
      payload: {
        headline: 'Network context contradicts valid identity',
        detail: `${evidence.filter((call) => call.requestStatus === 'SUCCEEDED').length}/${evidence.length} evidence calls returned usable results.`,
        evidence,
      },
    };
  }

  private async decide(
    run: RunRecord,
    scenario: Scenario,
    artifacts: WorkflowArtifacts,
  ): Promise<StateResult> {
    const evidence = requireArtifact(artifacts.evidence, 'evidence');
    const safety = requireArtifact(artifacts.safety, 'safety evaluation');
    const recommendation = await this.reasoner.recommend(
      {
        command: run.command,
        principal: scenario.principal,
        policy: this.policy,
        twin: run.twin,
        evidence,
        safety,
      },
      AbortSignal.timeout(this.policy.providers.timeoutMs),
    );
    const decision = issueDecision({
      command: run.command,
      principal: scenario.principal,
      evidence,
      safety,
      recommendation,
      policy: this.policy,
    });
    return {
      eventType: 'AUTHORITATIVE_DECISION_ISSUED',
      payload: {
        headline: decision.state,
        detail:
          'Identity valid. Context compromised. Command blocked. Operations continued safely.',
        recommendation,
        decision,
      },
    };
  }

  private async detachGateway(
    run: RunRecord,
    scenario: Scenario,
    artifacts: WorkflowArtifacts,
  ): Promise<StateResult> {
    const decision = requireArtifact(artifacts.decision, 'decision');
    if (decision.state !== 'BLOCK_AND_CONTAIN') {
      throw new HisnError(
        'ENFORCEMENT_NOT_AUTHORIZED',
        'Containment requires BLOCK_AND_CONTAIN',
        409,
      );
    }
    const context = { correlationId: run.correlationId, scenario, policy: this.policy, decision };
    const call = this.store.saveEnforcement(
      await this.enforcementProvider.detachGateway(
        context,
        AbortSignal.timeout(this.policy.providers.timeoutMs),
      ),
      run.id,
    );
    if (call.status !== 'SUCCEEDED')
      throw new HisnError('ENFORCEMENT_UNAVAILABLE', 'Gateway detach failed safe', 503);
    return {
      eventType: 'COMPROMISED_ENDPOINT_CONTAINED',
      payload: {
        headline: 'Compromised gateway detached',
        detail: 'Containment is scoped to the implicated network attachment.',
        enforcement: [call],
      },
      twin: containGateway(run.twin),
    };
  }

  private async protectBackup(
    run: RunRecord,
    scenario: Scenario,
    artifacts: WorkflowArtifacts,
  ): Promise<StateResult> {
    const decision = requireArtifact(artifacts.decision, 'decision');
    const context = { correlationId: run.correlationId, scenario, policy: this.policy, decision };
    const qod = this.store.saveEnforcement(
      await this.enforcementProvider.protectBackup(
        context,
        AbortSignal.timeout(this.policy.providers.timeoutMs),
      ),
      run.id,
    );
    const safeControl = this.store.saveEnforcement(safeControlCall(run), run.id);
    const twin = protectContinuity(run.twin);
    return {
      eventType: 'SAFE_CONTINUITY_PROTECTED',
      payload: {
        headline: 'Backup continuity protected',
        detail:
          'The trusted controller enters safe-control mode while the unsafe request remains unexecuted.',
        enforcement: [qod, safeControl],
        continuity: continuityMetrics(scenario.initialTwin, twin, this.policy),
      },
      twin,
    };
  }

  private reportIncident(
    run: RunRecord,
    scenario: Scenario,
    artifacts: WorkflowArtifacts,
  ): StateResult {
    const decision = requireArtifact(artifacts.decision, 'decision');
    const twin =
      artifacts.decision?.state === 'BLOCK_AND_CONTAIN'
        ? run.twin
        : resolveHeldCommand(run.twin, decision.state);
    return {
      eventType: 'INCIDENT_REPORT_GENERATED',
      payload: {
        headline: 'Evidence-bound incident record sealed',
        detail:
          'Timeline, provenance, decision, enforcement, and recovery requirements are persisted.',
        decisionState: decision.state,
        continuity: continuityMetrics(scenario.initialTwin, twin, this.policy),
      },
      twin,
    };
  }

  private async failSafe(run: RunRecord, error: unknown) {
    if (isTerminalState(run.workflowState)) return this.snapshot(run);
    assertTransition(run.workflowState, 'FAILED_SAFE');
    const now = new Date().toISOString();
    const updated = this.updateAfterEvent(
      run,
      'FAILED_SAFE',
      resolveHeldCommand(run.twin, 'BLOCK'),
    );
    const event = this.store.appendEvent({
      runId: run.id,
      eventType: 'WORKFLOW_FAILED_SAFE',
      workflowState: 'FAILED_SAFE',
      payload: {
        headline: 'Workflow failed safe',
        detail:
          'An integration or orchestration error occurred; the physical command remained blocked.',
        errorCode: error instanceof HisnError ? error.code : 'UNEXPECTED_FAILURE',
        twin: updated.twin,
      },
      occurredAt: now,
    });
    updated.presentationCursor = event.sequence;
    updated.playbackStatus = 'FAILED_SAFE';
    this.store.updateRun(updated);
    const snapshot = await this.snapshot(updated);
    this.onChange(snapshot);
    return snapshot;
  }

  private updateAfterEvent(
    run: RunRecord,
    state: WorkflowState,
    twin: RunRecord['twin'],
  ): RunRecord {
    return { ...run, workflowState: state, twin, updatedAt: new Date().toISOString() };
  }

  private async moveCursor(run: RunRecord, delta: number) {
    const eventCount = this.store.eventsForRun(run.id).length;
    const updated = {
      ...run,
      playbackStatus: 'PAUSED' as const,
      presentationCursor: Math.max(1, Math.min(eventCount, run.presentationCursor + delta)),
      updatedAt: new Date().toISOString(),
    };
    this.store.updateRun(updated);
    const snapshot = await this.snapshot(updated);
    this.onChange(snapshot);
    return snapshot;
  }

  private async updatePlayback(run: RunRecord, status: 'PAUSED' | 'PLAYING', speed?: number) {
    const updated = {
      ...run,
      playbackStatus: isTerminalState(run.workflowState) ? run.playbackStatus : status,
      speed: speed ?? run.speed,
      updatedAt: new Date().toISOString(),
    };
    this.store.updateRun(updated);
    const snapshot = await this.snapshot(updated);
    this.onChange(snapshot);
    return snapshot;
  }

  private persistReport(run: RunRecord, scenario: Scenario) {
    const artifacts = artifactsFrom(this.store.eventsForRun(run.id));
    const report = buildIncidentReport(this.store, run, scenario, this.policy, artifacts);
    this.store.saveIncident(run.id, run.correlationId, report);
  }

  private requireCurrentRun(): RunRecord {
    const run = this.store.currentRun();
    if (!run) throw new HisnError('RUN_NOT_FOUND', 'No judge run exists', 404);
    return run;
  }

  private scenario(id: string): Scenario {
    const scenario = this.scenarios.find((item) => item.id === id);
    if (!scenario) throw new HisnError('SCENARIO_NOT_FOUND', `Scenario ${id} was not found`, 404);
    if (scenario.assetId !== this.policy.assetId) {
      throw new HisnError(
        'POLICY_ASSET_MISMATCH',
        'Scenario asset does not match policy asset',
        500,
      );
    }
    return scenario;
  }
}

type StateResult = {
  eventType: string;
  payload: Record<string, unknown>;
  twin?: RunRecord['twin'];
};

function artifactsFrom(events: DomainEvent[]): WorkflowArtifacts {
  const artifacts: WorkflowArtifacts = {};
  for (const event of events) {
    if (event.payload.risk)
      artifacts.risk = zodPayload(event.payload.risk, AgentPlanSchema.shape.risk);
    if (event.payload.plan) artifacts.plan = zodPayload(event.payload.plan, AgentPlanSchema);
    if (event.payload.evidence)
      artifacts.evidence = zodPayload(event.payload.evidence, EvidenceCallSchema.array());
    if (event.payload.safety)
      artifacts.safety = zodPayload(event.payload.safety, SafetyEvaluationSchema);
    if (event.payload.recommendation) {
      artifacts.recommendation = zodPayload(
        event.payload.recommendation,
        AgentRecommendationSchema,
      );
    }
    if (event.payload.decision)
      artifacts.decision = zodPayload(event.payload.decision, DecisionRecordSchema);
  }
  return artifacts;
}

function visibleTwin(events: DomainEvent[], scenario: Scenario) {
  const twin = [...events].reverse().find((event) => event.payload.twin)?.payload.twin;
  return twin ? TwinStateSchema.parse(twin) : scenario.initialTwin;
}

function zodPayload<T>(value: unknown, schema: { parse(input: unknown): T }): T {
  return schema.parse(value);
}

function requireArtifact<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new HisnError('WORKFLOW_ARTIFACT_MISSING', `Missing ${name}`, 409);
  return value;
}

function requireConfiguredSetpointMaximum(
  policy: Parameters<typeof evaluatePhysicalSafety>[1],
): number {
  const maximum = policy.commands.SET_PRESSURE.maximumSetpointPercent;
  if (maximum === null) {
    throw new HisnError('CONFIGURATION_INVALID', 'SET_PRESSURE maximum is not configured', 500);
  }
  return maximum;
}

function safeControlCall(run: RunRecord): EnforcementCall {
  return EnforcementCallSchema.parse({
    id: randomUUID(),
    action: 'ACTIVATE_SAFE_CONTROL',
    status: 'SUCCEEDED',
    provenance: 'SIMULATED',
    redactedResult: { controller: 'trusted-backup', mode: 'SAFE_CONTROL' },
    latencyMs: 22,
    timestamp: new Date().toISOString(),
    correlationId: run.correlationId,
    idempotencyKey: `${run.correlationId}:ACTIVATE_SAFE_CONTROL`,
  });
}
