import type { EvidenceCall, EvidenceTool, Policy } from '../shared/contracts.js';

const PURPOSES: Record<EvidenceTool, string> = {
  NUMBER_VERIFICATION: 'Confirm the active network session possesses the authorized number',
  SIM_SWAP: 'Detect recent SIM reassignment associated with account takeover risk',
  DEVICE_SWAP: 'Detect a recent change in the physical device bound to the subscription',
  LOCATION_VERIFICATION: 'Verify presence inside the approved facility boundary',
  DEVICE_REACHABILITY: 'Confirm current data reachability through the mobile network',
};

export function evidencePurpose(tool: EvidenceTool): string {
  return PURPOSES[tool];
}

export function failedEvidencePolicies(calls: EvidenceCall[], policy: Policy): string[] {
  return assessEvidence(calls, policy).failures;
}

export function assessEvidence(calls: EvidenceCall[], policy: Policy, now = Date.now()) {
  const unknown: string[] = [];
  const failures: string[] = [];
  const compromised: EvidenceTool[] = [];
  for (const tool of new Set(calls.map((call) => call.tool))) {
    const matches = calls.filter((call) => call.tool === tool);
    const call = matches[0]!;
    const age = now - Date.parse(call.timestamp);
    const result = call.redactedResult;
    const validShape =
      tool === 'LOCATION_VERIFICATION'
        ? ['TRUE', 'FALSE'].includes(String(result.verificationResult))
        : typeof result[
            tool === 'NUMBER_VERIFICATION'
              ? 'verified'
              : tool === 'DEVICE_REACHABILITY'
                ? 'reachable'
                : 'swapped'
          ] === 'boolean';
    if (
      matches.length !== 1 ||
      call.requestStatus !== 'SUCCEEDED' ||
      call.provenance === 'UNAVAILABLE' ||
      !validShape ||
      !Number.isFinite(age) ||
      age < -1000 ||
      age > policy.evidence.locationMaximumAgeSeconds * 1000
    ) {
      unknown.push(`${tool}: missing, stale, conflicting or unusable evidence`);
      continue;
    }
    const failed = evidenceFailure(call, policy);
    failures.push(...failed);
    if (failed.length && tool !== 'DEVICE_REACHABILITY') compromised.push(tool);
  }
  return { unknown, failures, compromised };
}

function evidenceFailure(call: EvidenceCall, policy: Policy): string[] {
  if (call.requestStatus !== 'SUCCEEDED')
    return [`${call.tool} evidence is ${call.requestStatus.toLowerCase()}`];
  if (call.tool === 'NUMBER_VERIFICATION' && call.redactedResult.verified !== true)
    return ['Number is not verified'];
  if (call.tool === 'SIM_SWAP' && call.redactedResult.swapped === true)
    return ['Recent SIM swap violates critical-command policy'];
  if (call.tool === 'DEVICE_SWAP' && call.redactedResult.swapped === true)
    return ['Recent device swap violates critical-command policy'];
  if (call.tool === 'LOCATION_VERIFICATION' && call.redactedResult.verificationResult !== 'TRUE') {
    return ['Device is outside the approved facility geofence'];
  }
  if (
    call.tool === 'LOCATION_VERIFICATION' &&
    typeof call.redactedResult.matchRate === 'number' &&
    call.redactedResult.matchRate < policy.evidence.locationMinimumMatchRate
  ) {
    return ['Location match rate is below the configured critical-command threshold'];
  }
  if (call.tool === 'DEVICE_REACHABILITY' && call.redactedResult.reachable !== true) {
    return ['Device is not reachable on the expected data network'];
  }
  return [];
}

export function evidenceSummary(calls: EvidenceCall[]): string[] {
  return calls.map((call) => `${call.tool}: ${call.requestStatus} (${call.provenance})`);
}
