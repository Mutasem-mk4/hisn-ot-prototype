# Verification

## Required checks

```powershell
npm run doctor
npm run verify
npm run test:e2e
npm run audit:deps
```

The automated suite covers:

- Deterministic safety boundaries around 60%
- Missing, stale, malformed, duplicate, and unavailable evidence
- Model recommendations that conflict with policy
- Model-requested LangGraph tools and observation-driven adaptation
- Provider timeouts and explicit hosted-agent fail closure
- Idempotent enforcement and uncertain side effects
- Accepted-state isolation for blocked commands
- Digital-twin integration-step and playback behavior
- API session, CSRF, rate-limit, and validation controls
- Desktop, projector, tablet, and mobile browser behavior
- Accessibility and browser-console checks

## Manual deployment rehearsal

A release is complete only after checking the canonical public URL:

1. `/`, `/healthz`, and `/readyz` return successful responses.
2. Judge Mode reports policy `oil-pressure-safety-2026.8`.
3. Read-only inspection shows LangGraph, its Device Reachability minimum, and live model tool requests.
4. The trusted 52% comparison reaches `ALLOW` after two Nokia checks and accepted pressure becomes 52%.
5. The same 52% command with compromised context expands from two to four Nokia checks, reaches the authoritative blocked/containment result, and leaves accepted pressure unchanged.
6. Evidence Trace contains tool requests, observations, adaptations, provenance, timestamps, latency, and correlation IDs.
7. Incident export contains the agent trace, evidence, policy result, enforcement status, and recovery requirements.
8. The page has no horizontal overflow and no browser-console errors.

## Release evidence

### 2026-09-12 policy 2026.8 adaptive proof

- Code commit `94954c0` passed [CI 34695933595](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34695933595) and deployed as Vercel deployment `dpl_Dbsk719pU7zfNXgckyMZfW838wtJ` at the canonical public URL.
- The production smoke completed at `2026-09-12T13:28:22Z`, correlation `hisn-c0b37a73-a66c-4870-a2d8-2fe2c80a2bd0`. Live LangGraph reasoning collected four successful Nokia Sandbox responses. The real trace placed the failed location observation before the adaptive evidence-floor expansion and placed that expansion before the SIM Swap request.
- The 52% request passed the independent 60% hard maximum. Deterministic policy issued `BLOCK_AND_CONTAIN`, the workflow reached `INCIDENT_REPORTED`, and accepted pressure remained 46%.
- Local release checks passed 100 tests across 14 files, formatting, lint, type checks, and the production build. Browser checks passed 34 tests across desktop, projector, tablet, and mobile profiles, with two intentional small-screen skips.
- The production smoke now exercises one judged attack per run to conserve the free Groq quota. The separate local browser suite covers the read-only and trusted 52% paths. Earlier current-release execution already proved the primary connected attack before a subsequent auxiliary request received `HTTP_429`; that quota response failed closed.
- The final ten-slide submission deck and sample incident report now use policy `oil-pressure-safety-2026.8` and the same 52% comparison as the deployed demonstration.
- Documentation/artifact commit `fb8e330` passed [CI 34696577181](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34696577181) and deployed as `dpl_DXa5WYniNfZHjoiP2AsR2GDnke2M`. A fresh canonical-URL browser check returned healthy readiness, rendered the policy 2026.8 comparison with zero horizontal overflow at 1536 pixels, and loaded JavaScript bundle `/assets/index-DkxxxbAy.js`. This check did not repeat hosted provider calls because the deployed application code is unchanged from the successful adaptive proof.
- The verified final deck names correlation `hisn-c0b37a73-a66c-4870-a2d8-2fe2c80a2bd0`, matching the recorded connected attack above. The submission checklist keeps final-release safe and read-only reruns open instead of presenting earlier positive controls as fresh final-deployment evidence.

### 2026-09-12 final connected proof pass

- Canonical production deployment `dpl_7xJFbDQhB3cJZPPYkFgDuktnEDJQ` was Ready at [https://hisn-ot-prototype.vercel.app](https://hisn-ot-prototype.vercel.app). Commit `299b157` passed [CI 34666679572](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34666679572).
- The primary 58% attack completed at `2026-09-12T02:09:43Z`, correlation `hisn-f67079c8-848f-4505-b998-85e20bf54702`. Live LangGraph reasoning selected four successful Nokia Sandbox calls. Deterministic policy issued `BLOCK_AND_CONTAIN`, and accepted pressure remained 46%.
- Read-only inspection completed at `2026-09-12T02:14:02Z`, correlation `hisn-d0a8741b-5e97-4a9f-8149-c790eb8b4d2d`. Live reasoning and one successful Nokia Sandbox reachability call produced `ALLOW`; accepted pressure remained 46%.
- The safe 52% command completed at `2026-09-12T02:17:28Z`, correlation `hisn-680ab711-07e2-4d22-9b61-fc6b6905c0e0`. Live reasoning plus successful Nokia Sandbox location and reachability calls produced `ALLOW`; accepted pressure reached 52%.
- A combined browser run proved the attack first, then received Groq `HTTP_429` when it immediately started the next scenario. Running the three proofs in separate free-quota windows completed all of them without changing policy, substituting local evidence, or paying for provider access.
- Fresh local verification passed 100 tests across 14 files, formatting, lint, type checks, and the production build. Dependency audit reported zero vulnerabilities. Visual QA passed at desktop, projector, tablet, and mobile sizes; final screenshots now use the HISN-Oil release copy and start the attack from its independent 46% baseline.

These results establish the connected Nokia Sandbox and hosted Groq prototype path. They do not establish live-subscriber consent, live operator-network access, physical PLC actuation, or production safety certification.

### 2026-09-12 submission-readiness pass

- The official AI Resource and Tooling Guide was inspected directly. It lists LangGraph as a code-first agent framework and Groq as a hosted model provider, matching the deployed agent stack.
- The primary connected rehearsal now sets model retries to zero. A hosted-model quota response produces one explicit fail-closed outcome and does not automatically consume another request.
- Production configuration was aligned with the repository: distinct primary/backup simulator identities and model `openai/gpt-oss-20b`. No credentials or full identities were printed or committed.
- Local verification passed 100 tests across 14 files, formatting, lint, type checks, and the production build. Browser verification passed 34 tests with two intentional small-screen skips.
- The judge-facing headline and introduction now explain the security value before naming implementation details. The submission pack provides aligned portal copy, a two-minute demonstration script, a pitch-deck structure, an evidence-backed claims table, and a final checklist.
- A new deployment and fresh public connected rehearsal are required before this pass can be marked complete. Do not reuse the earlier Groq `HTTP_429` result as successful evidence.

### 2026-09-12 HISN-Oil 1.1.0 release audit

- Reviewed clean, pushed commits `516cf7e` (oil scenario and isolated connected rehearsal) and `dc717d0` (version 1.1.0). [CI 34647054617](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34647054617) passed for `dc717d0`.
- The canonical alias resolved to Ready deployment `dpl_FPQGPHgQ4VtAFgzKChKYnDidhRNJ` during this audit. Rendering and health endpoints responded; this alone does not establish provider availability.
- Fresh local verification passed: 99 tests in 14 files, formatting, lint, type checks, build, and dependency audit (zero vulnerabilities). Ten consecutive local fixture attack rehearsals blocked the request, retained 46%, and returned correctly bound incident reports. These are local simulated runs, not ten connected AI successes.
- Fresh Nokia-only public comparison at `2026-09-12T01:40:25Z` returned five successful SANDBOX evidence calls in each context, including Number Verification. Correlations: `9527960a-fe29-4259-90c2-7ad63f8fbc6e` and `54387444-51c1-4eab-82d2-19c266efde7d`. This diagnostic does not invoke Groq or enforcement.
- Public attack at `2026-09-12T01:37:08Z`, correlation `hisn-8bd24283-0212-4967-8b14-75d9b833f883`, failed closed with `AGENT_UNAVAILABLE`, `HTTP_429`, after `EVIDENCE_COLLECTING`. The current connected attack/safe/read-only freeze gate remains incomplete; earlier successful releases do not satisfy it.
- Follow-up presentation fixes show terminal agent failure immediately, use neutral containment/continuity result headings, and preserve valid definition-list markup. The production test now checks the current 58% headline and requires successful sandbox evidence plus live model recommendation.
- Follow-up browser suite passed 34 tests with two intentional small-screen skips, including immediate failure visibility with a paused presentation clock and incident JSON downloads.
- Follow-up code commit `a442bb9` passed [CI 34665646915](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34665646915) and deployed as `dpl_FiQRT4M8GDh39SgEEfJLCKqpXVpz`. A fresh canonical-URL browser check confirmed bundle `/assets/index-Bk_ZvABL.js`, HTTP 200 health/readiness, rendered Judge Mode, no overflow at 390/1280 pixels, and no page errors. This post-deployment rendering check did not repeat provider calls or resolve the recorded Groq quota failure.

Do not mark the submission frozen until hosted quota permits the outstanding connected rehearsals and the final deck, video, and signed-in submission fields have been reviewed against the deployed build.

### 2026-09-11 light-interface and replay follow-up

- Copy refinement commit: `9ea7334`. The hero identifies LangGraph and Nokia/CAMARA, and the 60% boundary is explicitly named the command hard limit.
- Replay timing commit: `427d52b`. Recorded execution now defaults to 0.5× with a three-second hold per step; provider calls still run at normal speed, and the final result remains visible.
- Local verification passed: 76 tests across 12 files, formatting, lint, type checks, and production build. Browser verification passed 26 tests with 2 intentional viewport skips.
- The rebuilt local application returned HTTP 200 from `/readyz`, rendered the updated copy without page errors, and had no horizontal overflow at 1280 pixels.
- Public rehearsals used the existing light-interface deployment `dpl_DWDNnQSn549qwbWmuFyiKbvxF3vy`. Read-only inspection completed with live planning and recommendation, one successful Nokia Sandbox reachability result, and `ALLOW`; accepted pressure stayed at 46%.
- The public safe command completed with live planning and recommendation and `ALLOW`; accepted pressure became 52%. Location and reachability came from successful Nokia Sandbox calls. Number Verification remained simulated.
- The following public attack attempt returned `HTTP_429` from the hosted agent after live planning. It reached `FAILED_SAFE` and retained 46% accepted pressure. A fresh successful attack rehearsal is not claimed here.
- GitHub verification run [34551723765](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34551723765) passed for replay commit `427d52b`.
- Application deployment `dpl_CEzeeoF1FpmzAQXCHQErJwVbAKx8` was verified Ready at its [deployment URL](https://hisn-ot-prototype-7t8l4bhbo-mutasem-mk4s-projects.vercel.app). A fresh browser check against the canonical [Judge Mode](https://hisn-ot-prototype.vercel.app/#judge) confirmed the 0.5× default, three-second replay notice, command-hard-limit wording, no horizontal overflow at 1280×720, and no console errors.
- Production smoke runs [34553252098](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34553252098) and [34553964581](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34553964581) each reached the hosted agent twice. All attempts returned `HTTP_429`; the recorded failure points included `COMMAND_HELD`, `EVIDENCE_COLLECTING`, and `SAFETY_EVALUATED`. Each attempt surfaced `AGENT_UNAVAILABLE` and failed closed. A fresh successful attack recommendation is therefore still not claimed.

Record the final test counts, Git commit, CI run, Vercel deployment ID, canonical URL, and public rehearsal result here only after fresh verification. Historical results must not be presented as current verification.

### 2026-09-10 judge-mode release

- Judge-mode implementation commit: `741d2992b40071614661c62477579bf63ee82b10`.
- Production-smoke harness through commit: `a84c358d5ea1143cabe0dd25c549aac183062763`.
- Local verification: `npm run verify` passed 12 Vitest files and 76 tests; `npm run test:e2e` passed 22 tests with 2 intentional viewport-duplicate skips; `npm run audit:deps` reported 0 vulnerabilities.
- GitHub verification passed for the implementation in run [34517943618](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34517943618) and for the final smoke harness in run [34529341417](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34529341417).
- Production deployment at the successful public rehearsal: `dpl_CBWLtWVpainfP6aAKnwGZ38uUydS` ([deployment](https://hisn-ot-prototype-5l4fc2wxp-mutasem-mk4s-projects.vercel.app)); canonical URL: [https://hisn-ot-prototype.vercel.app](https://hisn-ot-prototype.vercel.app).
- Public smoke run [34528193054](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34528193054) passed `/`, `/healthz`, `/readyz`, JavaScript bundle delivery, the 1440×900 overflow check, and browser-console checks. The hosted LangGraph path recorded five Nokia sandbox evidence calls, blocked the 88% request, kept accepted pressure at 46%, and reached `INCIDENT_REPORTED`.
- A preceding public run [34527745272](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34527745272) exercised the fail-closed path: the UI reported `AI unavailable. Command held safely.`, accepted pressure stayed at 46%, and no network evidence was treated as proof.
- The expanded three-scenario rehearsal in run [34528588025](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/runs/34528588025) was blocked before its read-only and safe-command checks because the hosted agent returned `HTTP_429` after `SAFETY_EVALUATED` on both attempts. The command remained held. This is an external model-quota limitation, so consistent hosted-provider availability and the remaining public checklist items are not claimed by this release record.
