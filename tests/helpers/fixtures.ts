import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AgentRecommendationSchema,
  EvidenceCallSchema,
  PolicySchema,
  ScenarioFileSchema,
  type AgentRecommendation,
  type EvidenceCall,
  type EvidenceTool,
  type Policy,
  type Scenario,
} from '../../src/shared/contracts.js';

export function testPolicy(): Policy {
  return PolicySchema.parse(JSON.parse(readFileSync(resolve('config/policy.v1.json'), 'utf8')));
}

export function testScenario(id = 'judge-valid-credentials-compromised-context'): Scenario {
  const file = ScenarioFileSchema.parse(
    JSON.parse(readFileSync(resolve('config/scenarios.v1.json'), 'utf8')),
  );
  const scenario = file.scenarios.find((item) => item.id === id);
  if (!scenario) throw new Error(`Missing test scenario ${id}`);
  return scenario;
}

export function evidenceCall(
  tool: EvidenceTool,
  redactedResult: Record<string, unknown>,
  requestStatus: EvidenceCall['requestStatus'] = 'SUCCEEDED',
): EvidenceCall {
  return EvidenceCallSchema.parse({
    id: `evidence-${tool}`,
    tool,
    purpose: `Test purpose for ${tool}`,
    requestStatus,
    redactedResult,
    provenance: requestStatus === 'SUCCEEDED' ? 'SIMULATED' : 'UNAVAILABLE',
    latencyMs: 12,
    timestamp: new Date().toISOString(),
    correlationId: 'correlation-test',
  });
}

export function recommendation(
  state: AgentRecommendation['recommendedDecision'],
): AgentRecommendation {
  return AgentRecommendationSchema.parse({
    recommendedDecision: state,
    summary: `Agent recommends ${state} from the available evidence.`,
    observedSignals: ['Structured test signal'],
    containmentRationale: 'Containment matches the observed risk.',
    reasoningProvenance: 'SIMULATED',
  });
}
