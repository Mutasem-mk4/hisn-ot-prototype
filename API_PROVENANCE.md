# API Provenance

Checked against official sources and the deployed Judge Mode on 2026-09-10. `DEMO` is the delivered default. No result is labeled `SANDBOX` or `LIVE` unless the corresponding external adapter actually produced it.

## Capability ledger

| Capability                 | Code path                                                                                | Public Judge Mode result on September 9                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Number Verification        | `NokiaEvidenceProvider.verifyNumber`                                                     | `SIMULATED`: Nokia V1 requires subscriber OAuth; the public deployment has no subscriber access token and records the fallback reason.         |
| SIM Swap                   | `NokiaEvidenceProvider.checkSimSwap`                                                     | `SANDBOX`: authenticated Nokia test-number calls returned both swapped and not-swapped results.                                                |
| Device Swap                | `NokiaEvidenceProvider.checkDeviceSwap`                                                  | `SANDBOX`: authenticated Nokia test-number calls returned both swapped and not-swapped results.                                                |
| Location Verification      | `NokiaEvidenceProvider.verifyLocation`                                                   | `SANDBOX`: authenticated circle-verification calls returned `TRUE` for the safe scenario and `FALSE` for the compromised scenario.             |
| Device Reachability        | `NokiaEvidenceProvider.checkReachability`                                                | `SANDBOX`: authenticated calls returned reachable test devices with `DATA` or `SMS` connectivity.                                              |
| Specialized Network detach | `NokiaEnforcementProvider.detachGateway`                                                 | `SIMULATED`: the account exposes slicing APIs, but no operational slice attachment is configured; the fallback reason is recorded.             |
| Quality on Demand          | `NokiaEnforcementProvider.protectBackup`                                                 | `SANDBOX`, `PENDING`: the app created, polled, and released a `QOS_L` test session; it remained `REQUESTED`, so backup ownership was withheld. |
| Backup safe-control        | `safeControlCall`, `protectContinuity`                                                   | `SIMULATED`: no physical OT gateway or PLC is connected.                                                                                       |
| Agent structured reasoning | `DeterministicAgentReasoner`; optional `HostedAgentReasoner` with deterministic fallback | `LIVE`: the public Judge Mode returned validated hosted plans and recommendations; deterministic policy remained authoritative.                |

## Evidence and enforcement separation

Pre-decision tools are Number Verification, SIM Swap, Device Swap, Location Verification, and Device Reachability. Their purpose is to inform policy. Post-decision actions are gateway detachment, backup QoD, and simulated backup safe-control. `JudgeOrchestrator` cannot enter `ENFORCEMENT_STARTED` until `DECISION_ISSUED`; detachment additionally checks for `BLOCK_AND_CONTAIN`.

Policy version `desalination-safety-2026.3` makes the adaptive plan executable in Judge Mode. A `READ_STATUS` inspection selects one real Nokia sandbox capability, Device Reachability. A `SET_PRESSURE` command is safety-critical and selects all five pre-decision tools. Evidence Trace exposes the selection reason and actual per-call provenance; the read-only path cannot change the accepted setpoint or start enforcement.

## Runtime behavior

Audit boundary, September 9: the public interactive path remains DEMO, with `HISN_NOKIA_SIMULATOR=true`. `NokiaSimulatorEvidenceProvider` and `NokiaSimulatorEnforcementProvider` call the Nokia test network first, preserve successful or pending external results, and use deterministic fixtures only when a capability is unavailable. Four evidence capabilities and the QoD lifecycle were verified through the public URL. No operator-core enforcement effect has been verified.

Detachment is marked successful only for a returned DETACHED state; otherwise it remains unconfirmed. The containment target is the implicated operator-facing primary-edge attachment, not the PLC. Detachment is not described as quarantine. QoD success requires AVAILABLE and is requested only for the separately enrolled backup application flow. The simulated backup becomes control owner only when both QoD and the separate simulated safe-control activation succeed; otherwise the modeled pump safe-stops. Operator-specific polling/notification reconciliation is still required before real use. Local simulation detachment does not isolate Docker or industrial 5G traffic. Simulated provider execution latency is rounded local processing time (often 0 ms), not fixture network latency.

- `DEMO`: `SimulatedEvidenceProvider` reads startup-validated scenario fixtures. When `HISN_NOKIA_SIMULATOR=true`, the hybrid providers call Nokia's test network first and add `fallbackReason` to any simulated substitute.
- `SANDBOX`: uses the Nokia adapter when the base endpoint, API key, phones, application-server address, and geofence configuration validate. Capability-specific missing authorization or resources return typed `UNAVAILABLE`, and policy blocks safely.
- `LIVE`: startup fails when Nokia configuration is incomplete. A configured adapter begins readiness as `DEGRADED`, becomes `AVAILABLE` only after a successful call, and records `LIVE` only on a successful live result.

## Official sources

- [Nokia Network as Code — Getting Started](https://networkascode.nokia.io/_docs/getting-started)
- [Nokia — Consent, identity, and API scopes](https://networkascode.nokia.io/_docs/general-concepts/consent-identity-mgmt)
- [Nokia — SIM Swap](https://networkascode.nokia.io/_docs/sim-swap/sim-swap)
- [Nokia — Number Verification v1](https://networkascode.nokia.io/_docs/number-verification/number-verification-v1)
- [Nokia — Location Verification](https://networkascode.nokia.io/_docs/location-verification/location-verification)
- [Nokia — Device Reachability Status](https://networkascode.nokia.io/_docs/status/device-reachability-status)
- [Nokia — QoD sessions](https://networkascode.nokia.io/_docs/quality-on-demand/qod-sessions)
- [Nokia — Specialized Networks](https://networkascode.nokia.io/_docs/slicing/index-slc)
- [Nokia — slice lifecycle and detach](https://networkascode.nokia.io/_docs/slicing/slice-notifications-and-life-cycle)
- [CAMARA API landscape](https://github.com/camaraproject/project-administration/blob/main/config/api-landscape.yaml)
- [CAMARA Number Verification OpenAPI](https://github.com/camaraproject/NumberVerification/blob/main/code/API_definitions/number-verification.yaml)
- [CAMARA SIM Swap OpenAPI](https://github.com/camaraproject/SimSwap/blob/main/code/API_definitions/sim-swap.yaml)
- [CAMARA Device Location OpenAPI](https://github.com/camaraproject/DeviceLocation/blob/main/code/API_definitions/location-verification.yaml)
- [CAMARA QoD OpenAPI](https://github.com/camaraproject/QualityOnDemand/blob/main/code/API_definitions/quality-on-demand.yaml)

The installed production dependency is `network-as-code@10.0.0`, pinned in `package.json` and `package-lock.json`.
