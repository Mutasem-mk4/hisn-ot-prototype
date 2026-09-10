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

Record the final test counts, Git commit, CI run, Vercel deployment ID, canonical URL, and public rehearsal result here only after fresh verification. Historical results must not be presented as current verification.
