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
  return calls.flatMap((call) => evidenceFailure(call, policy));
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
