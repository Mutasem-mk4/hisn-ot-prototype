import type { WorkflowState } from '../shared/contracts.js';
import { invalidTransition } from '../shared/errors.js';

const NEXT_STATES: Record<WorkflowState, readonly WorkflowState[]> = {
  COMMAND_RECEIVED: ['COMMAND_HELD', 'FAILED_SAFE'],
  COMMAND_HELD: ['RISK_CLASSIFIED', 'FAILED_SAFE'],
  RISK_CLASSIFIED: ['EVIDENCE_PLANNED', 'FAILED_SAFE'],
  EVIDENCE_PLANNED: ['EVIDENCE_COLLECTING', 'FAILED_SAFE'],
  EVIDENCE_COLLECTING: ['EVIDENCE_COMPLETE', 'FAILED_SAFE'],
  EVIDENCE_COMPLETE: ['SAFETY_EVALUATED', 'FAILED_SAFE'],
  SAFETY_EVALUATED: ['DECISION_ISSUED', 'FAILED_SAFE'],
  DECISION_ISSUED: ['ENFORCEMENT_STARTED', 'INCIDENT_REPORTED', 'FAILED_SAFE'],
  ENFORCEMENT_STARTED: ['ENDPOINT_CONTAINED', 'FAILED_SAFE'],
  ENDPOINT_CONTAINED: ['CONTINUITY_PROTECTED', 'FAILED_SAFE'],
  CONTINUITY_PROTECTED: ['INCIDENT_REPORTED', 'FAILED_SAFE'],
  INCIDENT_REPORTED: [],
  FAILED_SAFE: [],
};

export function assertTransition(from: WorkflowState | null, to: WorkflowState): void {
  const permitted = from === null ? to === 'COMMAND_RECEIVED' : NEXT_STATES[from].includes(to);
  if (!permitted) throw invalidTransition(from, to);
}

export function nextWorkflowState(
  current: WorkflowState | null,
  requiresContainment: boolean,
): WorkflowState | null {
  if (current === null) return 'COMMAND_RECEIVED';
  if (current === 'DECISION_ISSUED')
    return requiresContainment ? 'ENFORCEMENT_STARTED' : 'INCIDENT_REPORTED';
  return NEXT_STATES[current][0] ?? null;
}

export function isTerminalState(state: WorkflowState | null): boolean {
  return state === 'INCIDENT_REPORTED' || state === 'FAILED_SAFE';
}
