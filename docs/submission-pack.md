# HISN-Oil submission pack

Keep the submission, video, and live pitch aligned with the deployed application. Replace bracketed team details before submitting. Do not add claims that are absent from the application or verification record.

## Submission description

HISN-Oil is an agentic safety gate for remote oil infrastructure. Valid credentials alone are insufficient for a critical pressure command: a bounded LangGraph agent selects Nokia Network as Code/CAMARA evidence, observes the returned telecom signals, and recommends a response. An independent deterministic policy makes the final authorization decision, so the AI cannot override the engineering maximum or actuate the pump.

The primary demonstration submits the same 52% pressure request used by the trusted comparison. It is below the independent 60% command hard maximum, yet compromised SIM, device, and location context causes the attack command to be blocked before the digital twin accepts it. The trusted context allows 52%. This makes network intelligence decisive. Every model action, Nokia sandbox result, policy finding, enforcement attempt, and simulated plant outcome is bound to one correlation ID and available in an incident report.

The prototype targets the Industrial & Enterprise AI Automation theme. Its plant and PLC behavior are explicitly modeled as an illustrative digital twin. Nokia calls identify their sandbox provenance, hosted AI failures remain visible, and no physical deployment or live-subscriber consent is claimed.

## What judges should verify

1. Open [Judge Mode](https://hisn-ot-prototype.vercel.app/#judge).
2. Select **Run attack demonstration**.
3. Confirm the request is 52%, the command hard maximum is 60%, and accepted pressure remains 46%.
4. Confirm the agent starts with location and reachability, records the failed location observation, and then expands to four successful Nokia sandbox evidence calls.
5. Expand **How was this decision made?** to inspect model-selected tool calls and observations.
6. Open **Evidence Trace** and the incident report to verify matching correlation IDs and provenance.
7. Use **Run trusted comparison** to show that the same 52% command is allowed exactly once when the network evidence is reassuring.

If the hosted model is rate-limited, show the visible `AGENT_UNAVAILABLE` result and explain the fail-closed behavior. Do not present that failure as a successful agent run. Use a previously recorded run only when it is clearly labeled as recorded.

## Two-minute demo script

**0:00–0:15 — Problem.** “A valid login proves that somebody has credentials. It does not prove that the expected operator, device, SIM, and location are behind a dangerous industrial command.”

**0:15–0:30 — Product.** “HISN-Oil holds the command while a LangGraph agent gathers Nokia/CAMARA network evidence. The AI selects and interprets evidence; deterministic policy retains final control authority.”

**0:30–1:05 — Decisive attack.** Run the 52% attack. Point out that 52% passes the 60% hard maximum. Show location and reachability first, the visible adaptation, then SIM Swap and Device Swap. Finish on the unchanged 46% accepted pressure.

**1:05–1:25 — Agent proof.** Expand the decision explanation. Show the sequence from goal to model tool request, Nokia observation, adaptation, recommendation, and policy decision. State that the model has no actuation authority.

**1:25–1:40 — Auditability.** Open Evidence Trace and the incident report. Point to provenance, latency, timestamps, the correlation ID, and the explicit status of each enforcement attempt.

**1:40–1:55 — Positive control.** Run the safe 52% command and show that accepted pressure changes only after trusted evidence and policy agree.

**1:55–2:00 — Close.** “HISN-Oil turns mobile-network intelligence into a safety control for remote critical infrastructure, with every decision explainable and every claim verifiable.”

## Business case

The initial customer is an industrial operator managing remote pumps, valves, or other high-consequence assets over cellular networks. HISN-Oil sits between the operator application and the industrial command gateway. A pilot would integrate one site, one critical command family, the operator identity system, Nokia/Open Gateway APIs, and the site’s existing safety controller.

The product can be offered as a per-site subscription with integration and assurance services. Expansion follows the same control pattern across oil and gas, utilities, ports, mines, and large remote facilities. Production deployment still requires operator identity integration, durable tenant-isolated audit storage, approved network attachments, certified OT interfaces, and formal safety validation.

## Pitch deck structure

The editable final deck is [HISN-Oil MENA Ignite Pitch Deck](../artifacts/HISN-Oil-MENA-Ignite-Pitch-Deck-Final-2026.8-Verified.pptx). It contains ten slides, speaker notes on every slide, a QR code to Judge Mode, clickable demo and source links, and the correlation ID from the recorded policy 2026.8 connected attack.

1. **HISN-Oil:** network proof before industrial action, with the public Judge Mode URL.
2. **The command trust gap:** credentials alone do not establish trusted device, SIM, location, or reachability context.
3. **Network evidence changes the decision:** the 52% request passes the 60% hard maximum, four network calls are recorded after adaptive escalation, and accepted pressure remains 46%.
4. **Safety architecture:** command hold → LangGraph agent → Nokia Network as Code → deterministic policy → illustrative digital twin.
5. **Verified connected attack:** four successful Nokia Sandbox results share one correlation ID and lead to `BLOCK_AND_CONTAIN`.
6. **Agent responsibility and policy authority:** the AI selects evidence and recommends; deterministic policy authorizes.
7. **Positive controls:** connected safe and read-only runs prove the system does not simply block every command.
8. **One-site pilot:** buyer, scope, commercial hypothesis, and a four-stage adoption path.
9. **Scale roadmap:** operator identity, durable assurance, certified integration, and expansion across remote critical assets.
10. **Pilot partner:** one-site validation request, QR code, live demo link, source link, and explicit prototype boundaries.

Use one claim and one visual per slide. Screenshots must come from the final deployed version. Put technical detail in speaker notes unless it directly proves a judging criterion.

## Evidence-backed claims

| Claim                                 | What supports it                                                                                                                 | Boundary                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Agentic orchestration                 | LangGraph `StateGraph` and `ToolNode` execute a bounded model/tool/observation loop                                              | Hosted Groq availability is quota-dependent                               |
| CAMARA usage                          | Authenticated Nokia sandbox calls for Number Verification, SIM Swap, Device Swap, Location Verification, and Device Reachability | Simulator identities; Number Verification diagnostic uses simulator OAuth |
| Network evidence changes the decision | The same 52% request is allowed with trusted evidence and blocked with compromised evidence                                      | Demonstrated against an illustrative digital twin                         |
| AI cannot authorize the pump          | Deterministic policy independently evaluates evidence and physical limits                                                        | Production certification is outside prototype scope                       |
| Containment is honest                 | Slice detachment remains unavailable unless the exact attachment exists; QoD status is shown exactly                             | No physical PLC handover is claimed                                       |

## Final submission checklist

- [ ] Signed-in HackerEarth fields and file limits captured.
- [x] Final deployed URL opens directly in Judge Mode without credentials.
- [x] GitHub repository is public and points to the same release.
- [x] Updated pitch deck uses the HISN-Oil name and final screenshots.
- [ ] Demo video uses the deployed build, English narration or captions, and the verified two-minute path.
- [ ] Repeat the connected safe and read-only controls on the final code release when hosted quota permits. The policy 2026.8 attack is freshly verified; the existing positive controls are recorded on the preceding compatible release.
- [ ] Groq quota availability is checked before recording and before the live presentation.
- [ ] Nokia sandbox provenance and digital-twin boundaries are spoken and visible.
- [ ] No API keys, phone numbers, tokens, or raw provider payloads appear in the repository, deck, video, or incident export.
- [ ] Team names, theme, business model, repository URL, demo URL, and technical claims match across every artifact.

## Source alignment

The official AI Resource and Tooling Guide lists LangGraph as a code-first agent framework and Groq as a hosted model provider. The hackathon microsite requires a deployed prototype, one or more Nokia Network as Code/CAMARA APIs, and an AI agent layer that orchestrates those APIs. Public claims must stay within the integration boundaries documented in [Integrations](integrations.md) and the fresh results in [Verification](verification.md).
