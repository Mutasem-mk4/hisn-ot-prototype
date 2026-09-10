import { z } from 'zod';

export const RuntimeModeSchema = z.enum(['DEMO', 'SANDBOX', 'LIVE']);
export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const DecisionStateSchema = z.enum(['ALLOW', 'STEP_UP', 'BLOCK', 'BLOCK_AND_CONTAIN']);
export const WorkflowStateSchema = z.enum([
  'COMMAND_RECEIVED',
  'COMMAND_HELD',
  'RISK_CLASSIFIED',
  'EVIDENCE_PLANNED',
  'EVIDENCE_COLLECTING',
  'EVIDENCE_COMPLETE',
  'SAFETY_EVALUATED',
  'DECISION_ISSUED',
  'ENFORCEMENT_STARTED',
  'ENDPOINT_CONTAINED',
  'CONTINUITY_PROTECTED',
  'INCIDENT_REPORTED',
  'FAILED_SAFE',
]);
export const EvidenceToolSchema = z.enum([
  'NUMBER_VERIFICATION',
  'SIM_SWAP',
  'DEVICE_SWAP',
  'LOCATION_VERIFICATION',
  'DEVICE_REACHABILITY',
]);
export const EvidenceProvenanceSchema = z.enum([
  'LIVE',
  'SANDBOX',
  'SIMULATED',
  'CACHED',
  'UNAVAILABLE',
]);
export const EvidenceRequestStatusSchema = z.enum([
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'UNAVAILABLE',
]);
export const CommandKindSchema = z.enum(['READ_STATUS', 'SET_PRESSURE']);

export const CommandSchema = z
  .object({
    kind: CommandKindSchema,
    requestedSetpointPercent: z.number().min(0).max(100).nullable(),
    reason: z.string().trim().min(3).max(240),
  })
  .strict()
  .refine(
    (command) =>
      command.kind === 'SET_PRESSURE'
        ? command.requestedSetpointPercent !== null
        : command.requestedSetpointPercent === null,
    'Setpoint must match command kind',
  );

export const PrincipalSchema = z
  .object({
    subjectId: z.string().min(3).max(80),
    role: z.enum(['VIEWER', 'PRIVILEGED_OPERATOR', 'OT_SECURITY_SUPERVISOR']),
    credentialsValid: z.boolean(),
  })
  .strict();

export const EvidenceFixtureSchema = z
  .object({
    status: EvidenceRequestStatusSchema,
    redacted: z.record(z.string(), z.unknown()),
    latencyMs: z.number().int().nonnegative().max(10_000),
  })
  .strict();

export const TwinStateSchema = z
  .object({
    actualPressurePercent: z.number().min(0).max(100),
    acceptedPressurePercent: z.number().min(0).max(100).nullable().default(null),
    observedAt: z.string().datetime().nullable().default(null),
    observationStartedAt: z.string().datetime().nullable().default(null),
    minimumObservedPressure: z.number().nullable().default(null),
    maximumObservedPressure: z.number().nullable().default(null),
    maximumHeartbeatGapMs: z.number().nonnegative().default(0),
    backupReady: z.boolean().default(true),
    requestedPressurePercent: z.number().min(0).max(100).nullable(),
    pumpState: z.enum(['STOPPED', 'RUNNING', 'SAFE_CONTROL']),
    valvePositionPercent: z.number().min(0).max(100),
    flowRateM3PerHour: z.number().nonnegative(),
    primaryHeartbeatSequence: z.number().int().nonnegative(),
    backupHeartbeatSequence: z.number().int().nonnegative(),
    activeController: z.enum(['PRIMARY', 'BACKUP']),
    gatewayAttachment: z.enum(['OPERATIONAL', 'QUARANTINED', 'DETACHED']),
    primaryAttachment: z.enum(['OPERATIONAL', 'PROTECTED']),
    backupAttachment: z.enum(['OPERATIONAL', 'PROTECTED']),
    networkLatencyMs: z.number().nonnegative(),
    simulationElapsedMs: z.number().nonnegative().default(0),
    simulationPaused: z.boolean().default(true),
    scenarioStepStartedAtMs: z.number().nonnegative().default(0),
    pumpSpeedPercent: z.number().min(0).max(100).default(46),
    inletTankLevelPercent: z.number().min(0).max(100).default(68),
    outputTankLevelPercent: z.number().min(0).max(100).default(54),
    telemetryStatus: z.enum(['LIVE', 'STALE', 'UNKNOWN']).default('LIVE'),
    commandHistory: z.array(
      z
        .object({
          kind: CommandKindSchema,
          requestedSetpointPercent: z.number().nullable(),
          outcome: z.enum(['HELD', 'EXECUTED', 'BLOCKED']),
          correlationId: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export const ScenarioSchema = z
  .object({
    id: z.string().min(3),
    name: z.string().min(3),
    assetId: z.string().min(3),
    principal: PrincipalSchema,
    telecomDevice: z
      .object({ phoneNumber: z.string().regex(/^\+[1-9]\d{4,14}$/) })
      .strict()
      .optional(),
    command: CommandSchema,
    initialTwin: TwinStateSchema,
    evidence: z.record(EvidenceToolSchema, EvidenceFixtureSchema),
  })
  .strict();

export const ScenarioFileSchema = z
  .object({ schemaVersion: z.literal(1), scenarios: z.array(ScenarioSchema).min(1) })
  .strict();

export const CommandPolicySchema = z
  .object({
    risk: RiskLevelSchema,
    maximumSetpointPercent: z.number().min(0).max(100).nullable(),
    requiredEvidence: z.array(EvidenceToolSchema),
  })
  .strict();

export const PolicySchema = z
  .object({
    schemaVersion: z.literal(1),
    policyVersion: z.string().min(3),
    assetId: z.string().min(3),
    safePressureBand: z.object({ minimumPercent: z.number(), maximumPercent: z.number() }).strict(),
    commands: z.object({
      READ_STATUS: CommandPolicySchema,
      SET_PRESSURE: CommandPolicySchema,
    }),
    evidence: z
      .object({
        simSwapMaximumAgeHours: z.number().int().positive(),
        deviceSwapMaximumAgeHours: z.number().int().positive(),
        locationMinimumMatchRate: z.number().min(0).max(100),
        locationMaximumAgeSeconds: z.number().int().min(1).max(3_600),
        criticalMissingEvidenceDecision: z.literal('BLOCK'),
      })
      .strict(),
    agent: z
      .object({
        maximumToolCalls: z.number().int().min(1).max(12),
        maximumRetries: z.number().int().min(0).max(3),
        allowedTools: z.array(EvidenceToolSchema).min(1),
      })
      .strict(),
    providers: z
      .object({
        timeoutMs: z.number().int().min(100).max(10_000),
        maximumAttempts: z.number().int().min(1).max(4),
      })
      .strict(),
    containment: z
      .object({
        decisionStates: z.array(DecisionStateSchema).length(4),
        criticalAnomalyCount: z.number().int().min(1),
        continuityQosProfile: z.string().min(3),
        continuityDurationSeconds: z.number().int().min(60).max(86_400),
        recoveryRequirements: z.array(z.string().min(3)).min(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((policy, context) => {
    if (policy.safePressureBand.minimumPercent >= policy.safePressureBand.maximumPercent) {
      context.addIssue({ code: 'custom', message: 'Safe pressure minimum must be below maximum' });
    }
    if (policy.commands.SET_PRESSURE.maximumSetpointPercent === null) {
      context.addIssue({
        code: 'custom',
        message: 'SET_PRESSURE requires a deterministic maximum',
      });
    }
    if (new Set(policy.agent.allowedTools).size !== policy.agent.allowedTools.length) {
      context.addIssue({
        code: 'custom',
        message: 'Agent tool allowlist must not contain duplicates',
      });
    }
    for (const [command, commandPolicy] of Object.entries(policy.commands)) {
      if (commandPolicy.requiredEvidence.length > policy.agent.maximumToolCalls) {
        context.addIssue({
          code: 'custom',
          message: `${command} requires more evidence tools than the agent budget permits`,
        });
      }
      const disallowed = commandPolicy.requiredEvidence.filter(
        (tool) => !policy.agent.allowedTools.includes(tool),
      );
      if (disallowed.length > 0) {
        context.addIssue({
          code: 'custom',
          message: `${command} requires tools outside the agent allowlist: ${disallowed.join(', ')}`,
        });
      }
    }
  });

export const AgentPlanSchema = z
  .object({
    risk: RiskLevelSchema,
    consequence: z.string().min(8).max(280),
    selectedTools: z.array(EvidenceToolSchema),
    selectionReasons: z.partialRecord(EvidenceToolSchema, z.string().min(3).max(180)),
    reasoningProvenance: z.enum(['LIVE', 'SIMULATED', 'FALLBACK']),
  })
  .strict();

export const AgentRecommendationSchema = z
  .object({
    recommendedDecision: DecisionStateSchema,
    summary: z.string().min(8).max(500),
    observedSignals: z.array(z.string().min(3)).max(12),
    containmentRationale: z.string().min(3).max(320),
    reasoningProvenance: z.enum(['LIVE', 'SIMULATED', 'FALLBACK']),
  })
  .strict();

export const EvidenceCallSchema = z
  .object({
    id: z.string(),
    tool: EvidenceToolSchema,
    purpose: z.string(),
    requestStatus: EvidenceRequestStatusSchema,
    redactedResult: z.record(z.string(), z.unknown()),
    provenance: EvidenceProvenanceSchema,
    latencyMs: z.number().nonnegative(),
    timestamp: z.string().datetime(),
    correlationId: z.string(),
  })
  .strict();

export const SafetyEvaluationSchema = z
  .object({
    permitted: z.boolean(),
    policyVersion: z.string(),
    configuredMaximumPercent: z.number().nullable(),
    requestedSetpointPercent: z.number().nullable(),
    failedLimits: z.array(z.string()),
  })
  .strict();

export const DecisionRecordSchema = z
  .object({
    state: DecisionStateSchema,
    requestedAction: z.string(),
    evidenceSummary: z.array(z.string()),
    failedPolicies: z.array(z.string()),
    failedLimits: z.array(z.string()),
    containmentRationale: z.string(),
    recoveryRequirements: z.array(z.string()),
    authoritativeSource: z.literal('DETERMINISTIC_POLICY_ENGINE'),
  })
  .strict();

export const EnforcementCallSchema = z
  .object({
    id: z.string(),
    action: z.enum(['DETACH_GATEWAY', 'QUALITY_ON_DEMAND', 'ACTIVATE_SAFE_CONTROL']),
    status: z.enum(['SUCCEEDED', 'PENDING', 'FAILED', 'UNAVAILABLE']),
    provenance: EvidenceProvenanceSchema,
    redactedResult: z.record(z.string(), z.unknown()),
    latencyMs: z.number().nonnegative(),
    timestamp: z.string().datetime(),
    correlationId: z.string(),
    idempotencyKey: z.string(),
  })
  .strict();

export const DomainEventSchema = z
  .object({
    id: z.string(),
    runId: z.string(),
    sequence: z.number().int().positive(),
    eventType: z.string(),
    workflowState: WorkflowStateSchema.nullable(),
    payload: z.record(z.string(), z.unknown()),
    previousHash: z.string(),
    integrityHash: z.string(),
    occurredAt: z.string().datetime(),
  })
  .strict();

export const IncidentReportSchema = z
  .object({
    id: z.string(),
    runtimeMode: RuntimeModeSchema,
    correlationId: z.string(),
    generatedAt: z.string().datetime(),
    timeline: z.array(DomainEventSchema),
    submittedCommand: CommandSchema,
    identityAndNetworkEvidence: z.array(EvidenceCallSchema),
    evidenceProvenance: z.array(
      z.object({ tool: EvidenceToolSchema, provenance: EvidenceProvenanceSchema }).strict(),
    ),
    safetyPolicyEvaluation: SafetyEvaluationSchema,
    agentRecommendation: AgentRecommendationSchema,
    authoritativeDecision: DecisionRecordSchema,
    networkEnforcement: z.array(EnforcementCallSchema),
    continuityMeasurements: z.record(z.string(), z.unknown()),
    recoveryRequirements: z.array(z.string()),
  })
  .strict();

export const ControlRequestSchema = z
  .object({
    action: z.enum(['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS', 'RESET', 'SET_SPEED', 'TICK']),
    speed: z.enum(['0.5', '1', '2', '4']).optional(),
  })
  .superRefine((request, context) => {
    if (request.action === 'SET_SPEED' && request.speed === undefined) {
      context.addIssue({ code: 'custom', message: 'SET_SPEED requires speed' });
    }
  })
  .strict();

export type AgentPlan = z.infer<typeof AgentPlanSchema>;
export type AgentRecommendation = z.infer<typeof AgentRecommendationSchema>;
export type Command = z.infer<typeof CommandSchema>;
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
export type DecisionState = z.infer<typeof DecisionStateSchema>;
export type DomainEvent = z.infer<typeof DomainEventSchema>;
export type EnforcementCall = z.infer<typeof EnforcementCallSchema>;
export type EvidenceCall = z.infer<typeof EvidenceCallSchema>;
export type EvidenceProvenance = z.infer<typeof EvidenceProvenanceSchema>;
export type EvidenceTool = z.infer<typeof EvidenceToolSchema>;
export type IncidentReport = z.infer<typeof IncidentReportSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type Principal = z.infer<typeof PrincipalSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type RuntimeMode = z.infer<typeof RuntimeModeSchema>;
export type SafetyEvaluation = z.infer<typeof SafetyEvaluationSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type TwinState = z.infer<typeof TwinStateSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
