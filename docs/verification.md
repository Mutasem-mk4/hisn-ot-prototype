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
2. Judge Mode reports policy `desalination-safety-2026.4`.
3. Read-only inspection shows LangGraph, its Device Reachability minimum, and live model tool requests.
4. Safe 52% reaches `ALLOW` and accepted pressure becomes 52%.
5. Unsafe 88% reaches the authoritative blocked/containment result without changing accepted pressure.
6. Evidence Trace contains tool requests, observations, adaptations, provenance, timestamps, latency, and correlation IDs.
7. Incident export contains the agent trace, evidence, policy result, enforcement status, and recovery requirements.
8. The page has no horizontal overflow and no browser-console errors.

## Release evidence

### 2026-09-11 light-interface follow-up

- Copy refinement commit: `9ea7334`. The hero identifies LangGraph and Nokia/CAMARA, and the 60% boundary is explicitly named the command hard limit.
- Local verification passed: 76 tests across 12 files, formatting, lint, type checks, and production build. Browser verification passed 22 tests with 2 intentional viewport skips.
- The rebuilt local application returned HTTP 200 from `/readyz`, rendered the updated copy without page errors, and had no horizontal overflow at 1280 pixels.
- Public rehearsals used the existing light-interface deployment `dpl_DWDNnQSn549qwbWmuFyiKbvxF3vy`. Read-only inspection completed with live planning and recommendation, one successful Nokia Sandbox reachability result, and `ALLOW`; accepted pressure stayed at 46%.
- The public safe command completed with live planning and recommendation and `ALLOW`; accepted pressure became 52%. Location and reachability came from successful Nokia Sandbox calls. Number Verification remained simulated.
- The following public attack attempt returned `HTTP_429` from the hosted agent after live planning. It reached `FAILED_SAFE` and retained 46% accepted pressure. A fresh successful attack rehearsal is not claimed here.
- Vercel rejected deployment of the copy refinement with `api-deployments-free-per-day` and instructed retry after 24 hours. The canonical public alias therefore still serves the previously deployed light redesign; the new wording is available locally and on GitHub.

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
