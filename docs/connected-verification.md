# Connected verification

The deployed hybrid demonstration can replace failed Nokia requests with labeled local fixtures. It is not strict connected verification. `HISN_MODE=SANDBOX` selects direct Nokia sandbox providers without those fallbacks; `LIVE` selects operator providers. Connected modes use a hosted agent or fail closed when no model is configured.

Authorization checks evidence provenance both when issuing a decision and before executing an allowed command. Sandbox verification rejects simulated and cached evidence. Live verification also rejects sandbox evidence. The policy still requires Number Verification, Location Verification, and Device Reachability for a 52% command. Subscriber authorization is therefore a dependency, not an optional substitute.

## Run the connected comparison

```powershell
npm run verify:connected
```

The command loads `.env.local`, then `.env`, without replacing existing environment variables. An optional first argument specifies a different environment file:

```powershell
npm run verify:connected -- .vercel/.env.connected.local
```

The command type-checks its implementation, forces direct sandbox adapters, uses an in-memory audit database, and submits the same 52% command with identical credentials, role, and initial plant state against the two configured sandbox device contexts. Scenario fixtures are never used as substitute responses. Each investigation stops at authorization, before command execution or network enforcement.

Output is JSON lines containing configuration availability, run and correlation IDs, provider evidence, agent actions, advisory recommendation, policy decision, and elapsed time. API keys and phone numbers are not printed. Redirect output to a private local file when an execution record is needed.

Exit code zero requires two completed investigations with the required successful sandbox evidence, one ALLOW decision and one non-ALLOW decision. A provider failure, missing evidence, missing configuration, or no demonstrated contrast produces exit code one. This proves an authorization contrast only; it does not prove real-network enforcement, plant actuation, or an advantage over a fixed investigation workflow.

Vercel sensitive environment variables may export as `[SENSITIVE]`. The command rejects these placeholders before sending requests. Actual credentials must be supplied through a protected local environment or a runner where the secrets are available.

## Implementation status

### Hosted diagnostic

The DEMO server exposes `/api/v1/connected-verification` behind its session guard. GET reports provider configuration availability without secrets. POST requires the session CSRF token and a body with `context` (`A` or `B`) and `stage` (`evidence` or `investigation`). The route allows two requests per minute per rate-limit key; this limit is process-local on serverless deployments.

The `evidence` stage calls the five configured allowlisted Nokia evidence tools directly, using the same 52% command and alternative sandbox devices. It labels collection as `FIXED_PROVIDER_PROBE`, makes no Groq request, and reports each provider response without local substitutes. Missing subscriber authorization reports `SUBSCRIBER_AUTHORIZATION_REQUIRED` and `externalRequestMade: false` for Number Verification. SDK timeouts and retry limits apply to each Nokia call.

The `investigation` stage uses Groq and the direct sandbox adapters with an isolated in-memory audit store. It stops at authorization before any command execution or enforcement. It does not modify the main demonstration's run. Both stages report `enforcementExecuted: false`.

The CLI and hosted investigation share the same implementation. Hosted execution uses existing deployment secrets, so it does not require exporting them to a developer machine.

- Provenance enforcement and the comparison diagnostic are implemented.
- Regression tests cover the same 52% command with reassuring, suspicious, corroborated, and unavailable evidence. These tests use fixtures and do not prove external API behavior.
- Structured Groq planning/recommendation requests stop retrying immediately on HTTP 429. LangGraph SDK retry behavior is unchanged.
- Rate-limit failures retain a sanitized quota category when the provider message identifies tokens or requests per day or minute; otherwise the category is UNKNOWN. Provider response bodies are not exposed in the failure record.
- The initial plan still follows the policy evidence floor. Groq's advisory recommendation can now select any defined decision state instead of being restricted to a precomputed verdict. The authoritative policy engine independently decides authorization and containment, including when it disagrees with the model. Observation-driven tool selection already exists, but its benefit over fixed baselines has not been measured.
- A successful connected contrast is not yet verified. The local rehearsal was stopped by unavailable exported Groq and Nokia secrets; the hosted diagnostic provides a path to verify providers without exporting secrets.
- The comparison UI, provider-specific quota diagnosis, baseline measurements, and repeated successful public connected rehearsals remain pending.
