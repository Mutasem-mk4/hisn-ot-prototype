import { describe, expect, it } from 'vitest';
import { issueDecision } from '../../src/domain/decision-engine.js';
import { evaluatePhysicalSafety } from '../../src/domain/safety-engine.js';
import type { Command, DecisionState, EvidenceCall } from '../../src/shared/contracts.js';
import { evidenceCall, recommendation, testPolicy, testScenario } from '../helpers/fixtures.js';

const policy = testPolicy();
const principal = testScenario().principal;
const safeCommand: Command = {
  kind: 'SET_PRESSURE',
  requestedSetpointPercent: 50,
  reason: 'Safe test adjustment',
};
const unsafeCommand: Command = {
  kind: 'SET_PRESSURE',
  requestedSetpointPercent: 88,
  reason: 'Unsafe test adjustment',
};
const validEvidence = [
  evidenceCall('NUMBER_VERIFICATION', { verified: true }),
  evidenceCall('SIM_SWAP', { swapped: false }),
  evidenceCall('DEVICE_SWAP', { swapped: false }),
  evidenceCall('LOCATION_VERIFICATION', { verificationResult: 'TRUE' }),
  evidenceCall('DEVICE_REACHABILITY', { reachable: true }),
];

describe('authoritative decisions', () => {
  it.each([59.99, 60, 60.01])('independently evaluates the %s percent boundary', (value) => {
    const command = { ...safeCommand, requestedSetpointPercent: value };
    const result = issueDecision({
      command,
      principal,
      evidence: validEvidence,
      safety: { ...evaluatePhysicalSafety(safeCommand, policy), permitted: true },
      recommendation: recommendation('ALLOW'),
      policy,
    });
    expect(result.state).toBe(value <= 60 ? 'ALLOW' : 'BLOCK');
  });

  it.each(['outage', 'stale', 'duplicate', 'malformed', 'unreachable'])(
    'treats %s evidence as a reason to block, not permission to contain',
    (variation) => {
      let evidence = [...validEvidence];
      if (variation === 'outage')
        evidence = replaceMany(evidence, [
          evidenceCall('SIM_SWAP', {}, 'UNAVAILABLE'),
          evidenceCall('LOCATION_VERIFICATION', {}, 'UNAVAILABLE'),
        ]);
      if (variation === 'stale')
        evidence = evidence.map((call) => ({ ...call, timestamp: '2000-01-01T00:00:00.000Z' }));
      if (variation === 'duplicate') evidence.push(evidenceCall('SIM_SWAP', { swapped: true }));
      if (variation === 'malformed')
        evidence = replace(evidence, evidenceCall('SIM_SWAP', { swapped: 'false' }));
      if (variation === 'unreachable')
        evidence = replace(evidence, evidenceCall('DEVICE_REACHABILITY', { reachable: false }));
      const result = issueDecision({
        command: safeCommand,
        principal,
        evidence,
        safety: evaluatePhysicalSafety(safeCommand, policy),
        recommendation: recommendation('BLOCK_AND_CONTAIN'),
        policy,
      });
      expect(result.state).toBe('BLOCK');
      expect(result.failedPolicies.length).toBeGreaterThan(0);
    },
  );

  it('denies control to a viewer even with trusted network signals', () => {
    expect(
      issueDecision({
        command: safeCommand,
        principal: { ...principal, role: 'VIEWER' },
        evidence: validEvidence,
        safety: evaluatePhysicalSafety(safeCommand, policy),
        recommendation: recommendation('ALLOW'),
        policy,
      }).state,
    ).toBe('BLOCK');
  });

  it('contains a within-limit command when multiple context controls fail', () => {
    expect(
      issueDecision({
        command: safeCommand,
        principal,
        evidence: replaceMany(validEvidence, [
          evidenceCall('SIM_SWAP', { swapped: true }),
          evidenceCall('LOCATION_VERIFICATION', { verificationResult: 'FALSE' }),
        ]),
        safety: evaluatePhysicalSafety(safeCommand, policy),
        recommendation: recommendation('ALLOW'),
        policy,
      }).state,
    ).toBe('BLOCK_AND_CONTAIN');
  });
  it.each([
    ['ALLOW', safeCommand, validEvidence],
    [
      'STEP_UP',
      safeCommand,
      replace(
        validEvidence,
        evidenceCall('LOCATION_VERIFICATION', { verificationResult: 'FALSE' }),
      ),
    ],
    ['BLOCK', unsafeCommand, validEvidence],
    [
      'BLOCK_AND_CONTAIN',
      unsafeCommand,
      replaceMany(validEvidence, [
        evidenceCall('SIM_SWAP', { swapped: true }),
        evidenceCall('LOCATION_VERIFICATION', { verificationResult: 'FALSE' }),
      ]),
    ],
  ] satisfies Array<[DecisionState, Command, EvidenceCall[]]>)(
    'issues %s from policy and evidence',
    (expected, command, evidence) => {
      const result = issueDecision({
        command,
        principal,
        evidence,
        safety: evaluatePhysicalSafety(command, policy),
        recommendation: recommendation(expected),
        policy,
      });
      expect(result.state).toBe(expected);
      expect(result.authoritativeSource).toBe('DETERMINISTIC_POLICY_ENGINE');
    },
  );

  it('lets the deterministic limit override an ALLOW agent recommendation', () => {
    const result = issueDecision({
      command: unsafeCommand,
      principal,
      evidence: validEvidence,
      safety: evaluatePhysicalSafety(unsafeCommand, policy),
      recommendation: recommendation('ALLOW'),
      policy,
    });
    expect(result.state).toBe('BLOCK');
    expect(result.failedLimits[0]).toContain('88% exceeds configured maximum 60%');
  });

  it('does not let a compromised agent authorize containment outside deterministic policy', () => {
    const result = issueDecision({
      command: safeCommand,
      principal,
      evidence: validEvidence,
      safety: evaluatePhysicalSafety(safeCommand, policy),
      recommendation: recommendation('BLOCK_AND_CONTAIN'),
      policy,
    });
    expect(result.state).toBe('ALLOW');
  });

  it('fails safely when required evidence is unavailable', () => {
    const evidence = replace(
      validEvidence,
      evidenceCall('SIM_SWAP', { reason: 'timeout' }, 'UNAVAILABLE'),
    );
    const result = issueDecision({
      command: safeCommand,
      principal,
      evidence,
      safety: evaluatePhysicalSafety(safeCommand, policy),
      recommendation: recommendation('ALLOW'),
      policy,
    });
    expect(result.state).toBe('BLOCK');
  });

  it('fails safely when required evidence is omitted entirely', () => {
    const result = issueDecision({
      command: safeCommand,
      principal,
      evidence: validEvidence.slice(0, 1),
      safety: evaluatePhysicalSafety(safeCommand, policy),
      recommendation: recommendation('ALLOW'),
      policy,
    });
    expect(result.state).toBe('BLOCK');
    expect(result.failedPolicies).toContain(
      'LOCATION_VERIFICATION required evidence was not collected',
    );
  });

  it('applies the configured location match threshold', () => {
    const evidence = replace(
      validEvidence,
      evidenceCall('LOCATION_VERIFICATION', { verificationResult: 'TRUE', matchRate: 72 }),
    );
    const result = issueDecision({
      command: safeCommand,
      principal,
      evidence,
      safety: evaluatePhysicalSafety(safeCommand, policy),
      recommendation: recommendation('ALLOW'),
      policy,
    });
    expect(result.state).toBe('STEP_UP');
    expect(result.failedPolicies).toContain(
      'Location match rate is below the configured critical-command threshold',
    );
  });
});

function replace(calls: EvidenceCall[], replacement: EvidenceCall) {
  return calls.map((call) => (call.tool === replacement.tool ? replacement : call));
}
function replaceMany(calls: EvidenceCall[], replacements: EvidenceCall[]) {
  return replacements.reduce(replace, calls);
}
