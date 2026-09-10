# Safety Case

## Claim

For the demonstrated desalination workflow, an unsafe privileged pressure request cannot update the simulated physical process before network context and deterministic policy authorize it.

This is a prototype safety argument, not an IEC 61508/62443 certification, a safety integrity level claim, or evidence that a production plant is protected.

## Argument and evidence

| Claim                                             | Mechanism                                                                                                                                              | Verification evidence                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| The command is intercepted before actuation.      | `holdCommand` records `HELD` and updates only requested pressure.                                                                                      | Digital-twin unit test and complete workflow test.                                                                             |
| Requested and actual pressure cannot be confused. | Separate typed fields, separate visual channels, event-sourced presentation twin.                                                                      | Playwright desktop/mobile test asserts 88% held beside 46.0% actual.                                                           |
| The limit is independent of AI.                   | `evaluatePhysicalSafety` reads the validated versioned policy; `issueDecision` derives the external state only from deterministic policy and evidence. | Override tests: an ALLOW model cannot bypass a limit, and a hostile containment recommendation cannot escalate a safe request. |
| Missing context is not positive evidence.         | Provider errors become `UNAVAILABLE`; critical missing-evidence policy is `BLOCK`.                                                                     | Missing-evidence and degraded-provider tests.                                                                                  |
| Containment needs prior authority.                | State machine permits enforcement only after decision; detach also requires `BLOCK_AND_CONTAIN`.                                                       | Invalid-transition/pre-decision enforcement test.                                                                              |
| Enforcement is repeat-safe.                       | SQLite key uniqueness returns the first persisted action for an idempotency key.                                                                       | Audit-store idempotency test.                                                                                                  |
| Continuity remains observable.                    | Backup heartbeat advances, actual pressure remains in the configured safe band, unsafe-execution count remains zero.                                   | Complete workflow and three-run rehearsal tests; incident continuity metrics.                                                  |
| The incident is traceable.                        | Hash-linked persisted events generate the saved report.                                                                                                | Report-to-event equality and hash-chain tests.                                                                                 |

## Demonstrated result

- Requested pressure: 88%
- Configured maximum: 60% from `config/policy.v1.json`
- Initial actual pressure: 46%
- Safe operating band: 42–52%
- Credentials/number: valid
- Context anomalies: recent SIM swap, recent device swap, facility location mismatch
- Authoritative result: `BLOCK_AND_CONTAIN`
- Unsafe executions: 0
- Gateway after enforcement: detached in DEMO simulation
- Backup: simulated safe control; heartbeat observations advance with elapsed time when ready

## Authority model

The agent interprets consequence, selects allowlisted tools, and emits a structured recommendation that is preserved in the incident. The deterministic safety engine evaluates the configured physical maximum, and the decision engine derives the external state only from deterministic identity, evidence, safety, and response policy. Neither the model nor the browser can select containment or call an actuator.

## Failure behavior

- Invalid configuration prevents startup.
- Invalid command/control input receives a 400 response.
- Evidence outage becomes `UNAVAILABLE` and blocks a critical request.
- Malformed model output uses a marked deterministic fallback.
- Unexpected orchestration failure transitions to `FAILED_SAFE`; a held command is marked blocked.
- The legacy workflow stage `ENDPOINT_CONTAINED` records completion of the containment attempt, not its success. The event headline, enforcement status, twin attachment and lattice distinguish unconfirmed detachment from confirmed simulated detachment. QoD and backup readiness are independent outcomes.

Pressure percentages, the 60% command limit and the 42–52% normal band are prototype engineering assumptions, not certified limits. The twin approaches an accepted target with an eight-second first-order time constant; a stopped pump decays toward zero. Flow is a simple pressure/valve proxy, not a calibrated desalination model. The incident captures observations available when it was generated; zero-duration manual stepping is not proof of sustained continuity.

STEP_UP leaves the command held. No approval endpoint exists, so expired/reused approval-token behavior cannot be claimed as implemented. Unknown evidence is distinct from confirmed failed controls and cannot by itself authorize containment. An uncertain enforcement intent is retained across restart and is not blindly repeated; automatic operator-state reconciliation remains unimplemented.

## Production assurance needed

A deployable industrial safety system needs hazard analysis, certified independent safety functions, defense in depth at the PLC/SIS, formal site policy approval, telecom and identity onboarding, failover validation, operator training, recovery governance, external audit anchoring, and applicable regulatory/cybersecurity assessment.
