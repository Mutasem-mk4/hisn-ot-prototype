import { describe, expect, it } from 'vitest';
import { assertTransition, nextWorkflowState } from '../../src/domain/state-machine.js';

describe('workflow state machine', () => {
  it('follows the containment branch only after the decision state', () => {
    expect(nextWorkflowState('DECISION_ISSUED', true)).toBe('ENFORCEMENT_STARTED');
    expect(nextWorkflowState('DECISION_ISSUED', false)).toBe('INCIDENT_REPORTED');
  });

  it('rejects invalid transitions and pre-decision enforcement', () => {
    expect(() => assertTransition('EVIDENCE_COMPLETE', 'ENFORCEMENT_STARTED')).toThrow(
      'Transition from EVIDENCE_COMPLETE to ENFORCEMENT_STARTED is not allowed',
    );
    expect(() => assertTransition(null, 'ENDPOINT_CONTAINED')).toThrow();
  });
});
