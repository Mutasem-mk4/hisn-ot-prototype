# Integrations

## Capability ledger

| Capability              | Adapter                      | Decision purpose                              | Public provenance                                  |
| ----------------------- | ---------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Number Verification     | Nokia Number Verification V1 | Bind the session to the enrolled number       | Nokia sandbox fast OAuth in strict connected proof |
| SIM Swap                | Nokia SIM Swap               | Detect recent subscription reassignment       | Nokia sandbox                                      |
| Device Swap             | Nokia Device Swap            | Detect endpoint replacement                   | Nokia sandbox                                      |
| Location Verification   | Nokia Location Verification  | Require presence inside the facility boundary | Nokia sandbox                                      |
| Device Reachability     | Nokia Device Status          | Confirm current mobile-data reachability      | Nokia sandbox                                      |
| Quality on Demand       | Nokia QoD                    | Protect a separately addressed backup flow    | Nokia sandbox; pending remains pending             |
| Slice Device Attachment | Nokia slice attachment       | Remove a configured device attachment         | UNAVAILABLE until the targeted attachment exists   |

A successful HTTP response is transport evidence, not proof of trust. The policy evaluates returned fields such as `swapped`, `verificationResult`, `reachable`, freshness, duplicates, and correlation binding.

## Evidence and enforcement separation

Evidence tools are read-only and may run before the authoritative decision. QoD and slice detachment are side effects and remain behind a persisted deterministic authorization decision. The agent can recommend a response but cannot execute a physical command or network side effect without that guard.

## Runtime modes

| Mode      | Behavior                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| `DEMO`    | Local fixtures without Nokia configuration; the primary rehearsal uses strict sandbox providers when Nokia is enabled |
| `SANDBOX` | Configured Nokia adapters without fixture fallback; interactive control remains restricted                            |
| `LIVE`    | Requires complete Nokia configuration; does not imply certified physical control                                      |

Run `npm run doctor` to see the active configuration without printing secrets. Local `.env.local` is loaded automatically. Vercel uses project environment variables.

Agent selection:

- `HISN_AGENT_PROVIDER=AUTO` uses Groq when all model credentials are present and otherwise labels a local deterministic replay.
- `HISN_AGENT_PROVIDER=GROQ` requires Groq in local operation and fails closed if it is unavailable.
- `HISN_AGENT_PROVIDER=DETERMINISTIC` remains available for a quota-independent, explicitly labeled replay.
- The judged rehearsal forces Groq and direct sandbox evidence when Nokia is enabled. No evidence or AI fallback is permitted in that path.
- The judged rehearsal disables automatic model retries. A quota response produces one explicit fail-closed result instead of consuming another request.
- The separate connected diagnostic includes Number Verification simulator OAuth; it stops before enforcement.

Groq credentials:

- `HISN_LLM_BASE_URL`
- `HISN_LLM_API_KEY`
- `HISN_LLM_MODEL`

Required Nokia sandbox values are listed in `.env.example`. Strict connected verification obtains a one-time Nokia simulator fast-flow code for Number Verification. `NOKIA_NAC_ACCESS_TOKEN` is only used when a bearer from a subscriber authorization flow is supplied. Real slice detachment requires both an operational slice ID and gateway network-access identifier.

## Provenance rules

- `LIVE` describes schema-valid hosted model output.
- `LANGGRAPH AGENT` describes the active orchestration framework.
- `NOKIA SANDBOX` describes an authenticated Nokia response using simulator identities.
- `SIMULATOR_FAST_OAUTH` describes Nokia's one-time simulator authorization flow; it is not live subscriber consent.
- `IMPLEMENTED LOCALLY` describes digital-twin behavior or an explicit local fallback.
- `UNAVAILABLE` never counts as trusted evidence.

Secrets, full phone numbers, and provider credentials are excluded from model context, client snapshots, logs, traces, and incident exports.
