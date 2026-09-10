import { randomUUID } from 'node:crypto';
import type { AuditStore, IncidentReport, RunRecord, WorkflowArtifacts } from './ports.js';
import { continuityMetrics } from '../domain/digital-twin.js';
import type { Policy, Scenario } from '../shared/contracts.js';
import { HisnError } from '../shared/errors.js';

export function buildIncidentReport(
  store: AuditStore,
  run: RunRecord,
  scenario: Scenario,
  policy: Policy,
  artifacts: WorkflowArtifacts,
): IncidentReport {
  if (!artifacts.safety || !artifacts.recommendation || !artifacts.decision) {
    throw new HisnError('INCIDENT_INCOMPLETE', 'Decision artifacts are incomplete', 409);
  }
  const evidence = artifacts.evidence ?? [];
  return {
    id: randomUUID(),
    runtimeMode: run.runtimeMode,
    correlationId: run.correlationId,
    generatedAt: new Date().toISOString(),
    timeline: store.eventsForRun(run.id),
    submittedCommand: run.command,
    identityAndNetworkEvidence: evidence,
    evidenceProvenance: evidence.map(({ tool, provenance }) => ({ tool, provenance })),
    safetyPolicyEvaluation: artifacts.safety,
    agentTrace: artifacts.agentTrace ?? [],
    agentRecommendation: artifacts.recommendation,
    authoritativeDecision: artifacts.decision,
    networkEnforcement: store.enforcementForRun(run.id),
    continuityMeasurements: continuityMetrics(scenario.initialTwin, run.twin, policy),
    recoveryRequirements: artifacts.decision.recoveryRequirements,
  };
}
