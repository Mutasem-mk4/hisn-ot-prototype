# API Provenance

Checked against official sources on 2026-09-04. `DEMO` is the delivered default. No network result in this repository is labeled live or sandboxed unless its corresponding adapter actually produced it.

## Capability ledger

| Capability                 | Official contract                                                                                                                    | Code path                                                                    | DEMO provenance | Current external status                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| Number Verification        | Nokia `numberVerification.verify`; CAMARA `POST /verify`, `devicePhoneNumberVerified`                                                | `NokiaEvidenceProvider.verifyNumber`                                         | `SIMULATED`     | Adapter implemented; sandbox/live not run because credentials and consent were not provided. |
| SIM Swap                   | Nokia `simSwap.check`; CAMARA check result `swapped` with a policy lookback                                                          | `NokiaEvidenceProvider.checkSimSwap`                                         | `SIMULATED`     | Adapter implemented; external status unavailable.                                            |
| Device Swap                | Nokia `deviceSwap.check`; result `swapped`                                                                                           | `NokiaEvidenceProvider.checkDeviceSwap`                                      | `SIMULATED`     | Adapter implemented; external status unavailable.                                            |
| Location Verification      | CAMARA circle includes center latitude/longitude and radius; Nokia response is validated as `TRUE`, `FALSE`, `PARTIAL`, or `UNKNOWN` | `NokiaEvidenceProvider.verifyLocation` through SDK-authenticated passthrough | `SIMULATED`     | Adapter implemented; operator coverage/minimum radius must be verified during onboarding.    |
| Device Reachability        | Nokia `deviceStatus.retrieveReachabilityStatus`; response includes `reachable`, connectivity, last status time                       | `NokiaEvidenceProvider.checkReachability`                                    | `SIMULATED`     | Adapter implemented; external status unavailable.                                            |
| Specialized Network detach | Nokia lists device attachments and detaches by attachment resource ID                                                                | `NokiaEnforcementProvider.detachGateway`                                     | `SIMULATED`     | Adapter implemented; requires an authorized operational slice attachment.                    |
| Quality on Demand          | Nokia `qod.createSessionV1`; CAMARA creates a QoS session for a device/application flow and profile                                  | `NokiaEnforcementProvider.protectBackup`                                     | `SIMULATED`     | Adapter implemented; profile name and network support require operator onboarding.           |
| Backup safe-control        | HISN digital-twin enforcement port; no telecom API claim                                                                             | `safeControlCall`, `protectContinuity`                                       | `SIMULATED`     | A real OT gateway/PLC adapter is intentionally not configured.                               |
| Agent structured reasoning | Provider-neutral POST returning a strict plan/recommendation schema                                                                  | `FallbackAgentReasoner`                                                      | `SIMULATED`     | Optional live endpoint adapter implemented; not configured.                                  |

## Evidence and enforcement separation

Pre-decision tools are Number Verification, SIM Swap, Device Swap, Location Verification, and Device Reachability. Their purpose is to inform policy. Post-decision actions are gateway detachment, backup QoD, and simulated backup safe-control. `JudgeOrchestrator` cannot enter `ENFORCEMENT_STARTED` until `DECISION_ISSUED`; detachment additionally checks for `BLOCK_AND_CONTAIN`.

## Runtime behavior

- `DEMO`: `SimulatedEvidenceProvider` reads startup-validated scenario fixtures. Successful results say `SIMULATED`; fixture outages say `UNAVAILABLE`.
- `SANDBOX`: uses the Nokia adapter only when all endpoint/identity/network configuration validates. Without it, providers return typed `UNAVAILABLE` and policy blocks safely.
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
