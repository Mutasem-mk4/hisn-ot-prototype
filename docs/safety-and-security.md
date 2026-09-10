# Safety and security

## Safety claim

For configured commands, HISN-OT prevents an unverified or physically unsafe request from changing accepted control state.

The claim applies to the software prototype and digital twin. It is not a certification of a real plant, PLC, operator network, or safety instrumented system.

## Invariants

- A command is held before agent reasoning or telecom evidence collection.
- Requested, accepted, and observed pressure remain separate values.
- Missing, stale, malformed, duplicate, unbound, or unavailable evidence fails closed.
- The model cannot override the 60% pressure maximum.
- A blocked request cannot mutate accepted control state.
- Containment requires a persisted `BLOCK_AND_CONTAIN` decision based on affirmative compromise evidence.
- Uncertainty alone produces `BLOCK`, not containment.
- Backup ownership requires confirmed QoD and safe-control activation.
- An uncertain side-effect result is recorded and is not retried blindly.
- Evidence and enforcement results retain provenance and correlation binding.

## Threats and controls

| Threat                             | Control                                                               |
| ---------------------------------- | --------------------------------------------------------------------- |
| Stolen credentials                 | Number, SIM, device, location, and reachability evidence              |
| Prompt injection in command reason | Untrusted-field labeling, structured tools, allowlist, Zod validation |
| Model hallucinated tool            | Only bound LangGraph tools can execute                                |
| Excessive or duplicate tool calls  | Five-call budget and duplicate rejection                              |
| Model recommends unsafe approval   | Independent deterministic policy recomputes the decision              |
| Hosted AI outage                   | Explicit `AGENT_UNAVAILABLE`; held command fails closed               |
| Replay or double submission        | Idempotency keys and stored run state                                 |
| Partial containment failure        | Persisted intent, visible uncertainty, local safe stop                |
| Secret disclosure                  | Server-only environment configuration and redacted traces             |
| Evidence tampering                 | Correlation checks and hash-linked event history                      |

## Failure behavior

The system prefers a safe, explainable failure over an optimistic result. If Groq fails, the workflow records `AGENT_UNAVAILABLE`, issues no substitute recommendation, and keeps the command blocked. If Nokia evidence fails, the result is `UNAVAILABLE` and cannot authorize the command. If QoD remains pending, backup ownership is withheld and the modeled pump safe-stops.

## Production work

Operational deployment would require a certified plant adapter, enterprise IAM, two-person approval where appropriate, operator-supported subscriber authorization and slice resources, durable isolated storage, reconciliation of uncertain network side effects, formal hazard analysis, penetration testing, monitoring, and change-controlled policies.
