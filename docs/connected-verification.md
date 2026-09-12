# Connected verification

The primary judged rehearsal now uses direct sandbox evidence and hosted LangGraph whenever Nokia is enabled. Legacy control endpoints retain the older hybrid providers and are not the primary connected proof. `HISN_MODE=SANDBOX` selects direct Nokia sandbox providers without those fallbacks; `LIVE` selects operator providers. Connected modes use a hosted agent or fail closed when no model is configured.

Authorization checks evidence provenance both when issuing a decision and before executing an allowed command. Sandbox verification rejects simulated and cached evidence. Live verification also rejects sandbox evidence. Strict sandbox verification obtains a one-time Nokia fast-flow authorization code before calling Number Verification. This proves the simulator OAuth and CAMARA request path; it does not represent consent from a live subscriber.

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

Exit code zero requires two completed investigations with the required successful sandbox evidence and two distinct policy decisions. Nokia's documented simulator fixtures intentionally distribute reassuring and adverse signals across different numbers, so this check does not require an `ALLOW` result. A provider failure, missing evidence, missing configuration, or no demonstrated decision contrast produces exit code one. This proves an authorization contrast only; it does not prove real-network enforcement, plant actuation, or an advantage over a fixed investigation workflow.

Vercel sensitive environment variables may export as `[SENSITIVE]`. The command rejects these placeholders before sending requests. Actual credentials must be supplied through a protected local environment or a runner where the secrets are available.

## Implementation status

### Hosted diagnostic

The DEMO server exposes `/api/v1/connected-verification` behind its session guard. GET reports provider configuration availability without secrets. POST requires the session CSRF token and a body with `context` (`A`, `B`, or `BOTH`) and `stage` (`evidence` or `investigation`). `BOTH` is valid only for the evidence stage and runs the two contexts sequentially to limit request bursts. The route allows two requests per minute per rate-limit key; this limit is process-local on serverless deployments.

The `evidence` stage calls the five configured allowlisted Nokia evidence tools directly, using the same 52% command and alternative sandbox devices. It labels collection as `FIXED_PROVIDER_PROBE`, makes no Groq request, and reports each provider response without local substitutes. For Number Verification, it obtains client metadata, creates unique state and nonce values, follows only trusted Nokia simulator redirects, validates the returned state, and consumes the one-time code. SDK timeouts and retry limits apply to each Nokia call.

The `investigation` stage uses Groq and the direct sandbox adapters with an isolated in-memory audit store. It stops at authorization before any command execution or enforcement. It does not modify the main demonstration's run. Both stages report `enforcementExecuted: false`.

The CLI and hosted investigation share the same implementation. Hosted execution uses existing deployment secrets, so it does not require exporting them to a developer machine.

The primary Judge Mode flow and this diagnostic have separate reasoner selection. `HISN_AGENT_PROVIDER=AUTO` uses Groq in the main presentation when all model credentials are available; otherwise local runs are explicitly labeled deterministic replays. The connected investigation always requests Groq when configured. Hosted model failure keeps the command held and is never replaced by a hidden AI result.

- Provenance enforcement and the comparison diagnostic are implemented.
- Regression tests cover the same 52% command with reassuring, suspicious, corroborated, and unavailable evidence. These tests use fixtures and do not prove external API behavior.
- Structured Groq planning/recommendation requests stop retrying immediately on HTTP 429. LangGraph SDK retry behavior is unchanged.
- Rate-limit failures retain a sanitized quota category when the provider message identifies tokens or requests per day or minute; otherwise the category is UNKNOWN. Provider response bodies are not exposed in the failure record.
- The initial plan still follows the policy evidence floor. Groq's advisory recommendation can now select any defined decision state instead of being restricted to a precomputed verdict. The authoritative policy engine independently decides authorization and containment, including when it disagrees with the model. Observation-driven tool selection already exists, but its benefit over fixed baselines has not been measured.
- The Nokia simulator fast OAuth and Number Verification request were verified locally against the external sandbox on 2026-09-11. Public deployment verification is recorded separately below after release.
- The official simulator fixtures do not contain one identity that both passes Number Verification and returns reassuring SIM, device, and location evidence. A connected `ALLOW` is therefore not claimed; producing one requires live subscriber onboarding. The policy is not weakened and evidence from different identities is never combined.
- Provider-specific quota diagnosis is implemented. Baseline measurements and repeated successful public Groq rehearsals remain pending.

## Previous release public provider evidence — 2026-09-11

Production deployment `dpl_9wHL6MLjj18RnxtLhyF4dMTHDmHJ`, built from commit `2367254`, passed the independent [Hosted DEMO smoke](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34614581435). Both comparison contexts returned exactly five successful `SANDBOX` observations with no simulated or cached evidence. Number Verification completed through `SIMULATOR_FAST_OAUTH`: Context A returned not verified and Context B returned verified. The comparison correlation IDs were `70e329f3-ac7d-4ee9-b261-b218aae590cb` and `3d94745c-1df1-47e2-8f75-97e1e2a86fd8`.

The same smoke run completed the attack rehearsal with `BLOCK_AND_CONTAIN` and exported its incident report. A separate [production browser smoke](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34614636485) then passed the public attack, read-only, safe-command, evidence, incident, layout, and browser-console checks.

## Earlier public provider evidence — 2026-09-11

The hosted fixed provider probes at 03:02 UTC used the same 52% command and different configured Nokia sandbox devices. Four external calls succeeded in each context, with no simulated substitutes:

| Observation           | Context A            | Context B           |
| --------------------- | -------------------- | ------------------- |
| SIM Swap              | swapped=false        | swapped=true        |
| Device Swap           | swapped=false        | swapped=true        |
| Location Verification | TRUE                 | FALSE               |
| Reachability          | reachable=true, DATA | reachable=true, SMS |

Context A correlation ID: `1bae364f-c651-4eb5-8343-049699999bb6`. Context B correlation ID: `e423c9d5-58e2-4a1b-823f-316028c54069`. Deployment implementation: `be37e79`.

Number Verification was UNAVAILABLE in both contexts with `SUBSCRIBER_AUTHORIZATION_REQUIRED`; no external Number Verification request was made. These probes prove contrasting sandbox observations, not completed authorization or AI adaptation. Collection was explicitly labeled FIXED_PROVIDER_PROBE, and no enforcement executed.

A connected Context A investigation also completed through Groq in 2.676 seconds with correlation ID `hisn-4d09e0e6-609a-4e30-b2cd-203c45cfc19a`. Groq requested Nokia Number Verification, Location Verification, and Device Reachability. Number Verification was unavailable, while the latter two returned sandbox responses. Groq advised BLOCK, the independent policy engine issued BLOCK, accepted pressure remained 46%, and no enforcement executed.

A subsequent Context B investigation, correlation ID `hisn-aaffb177-17d9-4667-a0ba-063fa6627669`, failed closed when Groq returned HTTP 429 with quota category `TOKENS_PER_DAY`. It collected no evidence and left accepted pressure at 46%. This records a real provider attempt and a precise quota blocker, not a successful investigation.

Judge Mode exposes this check under the collapsed **Verify real API calls** section. The comparison runs both configured contexts for the same command, labels each result by provenance, and displays the complete correlation IDs. The adjacent Groq action runs one connected LangGraph investigation; it remains separate because it consumes provider quota.

The manual **Hosted connected rehearsal** GitHub Actions workflow repeats the fixed Nokia comparison from an independent runner, then runs the primary LangGraph attack. It requires five sandbox responses per diagnostic context, checks Number Verification's authorization provenance, rejects simulated or cached evidence, and verifies the contrasting SIM Swap result. The primary attack must return four successful sandbox evidence calls, a live model recommendation, unchanged accepted pressure, and a bound incident report. This workflow consumes Groq quota and fails when the hosted agent is unavailable.
