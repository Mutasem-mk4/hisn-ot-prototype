# Threat Model

## Scope and trust boundaries

Protected assets are physical setpoints, process availability, operator authorization, network evidence, enforcement authority, recovery controls, credentials, and the incident record. Trust boundaries exist at the browser/API boundary, agent provider, Nokia/CAMARA provider, OT gateway, policy/configuration load, and SQLite store.

| Threat                   | Control in this prototype                                                                                                                               | Residual production requirement                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Stolen credentials       | Identity is necessary but insufficient; critical commands require network proof and deterministic safety.                                               | Enterprise IdP, MFA, device enrollment, revocation, privileged-access governance.               |
| SIM or device compromise | SIM Swap and Device Swap evidence are selected for critical control; anomalies contribute to containment.                                               | Operator consent, calibrated lookback policy, verified subscriber binding.                      |
| Remote command injection | Strict command schema, role check, CSRF, rate limit, held-command gateway, no browser decision authority.                                               | Authenticated industrial protocol gateway, certificate pinning, segmentation.                   |
| Replay                   | Correlation IDs, command history, server-owned transitions, unique enforcement idempotency keys.                                                        | Signed command nonce with durable expiry and cross-node replay cache.                           |
| Forged evidence          | Typed provider adapters, provenance, redacted audit record, malformed data rejection.                                                                   | Verify operator TLS identity, signed evidence where offered, secure time source.                |
| Compromised LLM output   | Strict schema, allowlist and tool budget, deterministic fallback, and a policy engine that does not let model output select an external decision state. | Provider isolation, model monitoring, prompt/evaluation regression suite.                       |
| Prompt injection         | Agent input is reduced to typed command, role, policy, selected twin fields, and redacted evidence; it cannot issue unrestricted tools.                 | Content provenance controls if future commands accept untrusted free-form documents.            |
| Provider outage          | Typed `UNAVAILABLE`; missing critical evidence blocks; unexpected failures enter `FAILED_SAFE`.                                                         | Multi-operator routing, circuit breakers, outage runbooks, locally cached signed policy.        |
| Audit tampering          | Append-only application flow with previous-hash and SHA-256 integrity fields; incident is reconstructed from events.                                    | WORM storage, signing key/HSM, external timestamp anchoring, access monitoring.                 |
| Unauthorized recovery    | Decision record lists recovery requirements; UI cannot restore access.                                                                                  | Dual control, signed supervisor approval, fresh evidence, change-management record.             |
| Denial of service        | 32 KiB body limit, per-mutation rate limits, bounded provider calls, abort support, backup continuity path.                                             | Reverse proxy limits, autoscaling, DDoS service, resource quotas, offline safe-state PLC logic. |
| Malicious policy change  | Versioned schema validated at startup; event/report records policy version.                                                                             | Signed policy bundles, four-eyes change approval, rollback, independent safety certification.   |

## Safety invariants

1. A received control command is held before evidence or reasoning begins.
2. The requested value cannot update actual process pressure while held.
3. AI output cannot override a failed deterministic limit.
4. Network enforcement cannot start before an authoritative containment decision.
5. A missing or malformed critical input cannot be interpreted as positive evidence.
6. Containment targets the implicated attachment; continuity uses a separate trusted path.
7. Recovery is an explicit later process, not an automatic inverse animation.

## Non-goals

The repository contains no real OT endpoint, telecom secret, subscriber identity, or facility coordinate. It does not claim SIS/ESD certification, deterministic real-time control, operator production approval, or protection against physical compromise of all controllers.
