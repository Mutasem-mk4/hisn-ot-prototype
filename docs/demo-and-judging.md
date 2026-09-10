# Demo and judging

## Two-minute demonstration

### 0:00–0:20 — State the problem

“Credentials can be stolen. HISN-OT asks whether this command has current network proof before it can affect a pump.” Point to the requested, accepted, and observed values.

### 0:20–0:40 — Prove adaptive scope

Run the read-only inspection. Show `LANGGRAPH AGENT`, the one-signal Device Reachability minimum, any additional model-selected check, no setpoint change, and no enforcement.

### 0:40–1:05 — Prove safe control

Submit 52%. Show the in-band evidence floor: Number Verification, Location Verification, and Device Reachability. Advance to `ALLOW` and show accepted pressure become 52% while the twin responds progressively.

### 1:05–1:35 — Prove attack resistance

Submit 88%. Explain that exceeding the observed safe band escalates identity-risk evidence with SIM Swap and Device Swap. Point out the independent 60% maximum. Advance to `BLOCK_AND_CONTAIN` and show that accepted pressure remains 52%.

### 1:35–1:55 — Prove the agent

Open Evidence Trace. Walk through goal, model-requested tool, Nokia observation, adaptation, recommendation, and deterministic authority. State that this is an action/observation trace, not hidden chain-of-thought.

### 1:55–2:10 — Prove honesty and value

Open Incident. Show Nokia versus local provenance, containment status, continuity status, and recovery requirements. Close with the regional path across desalination, energy, ports, oil and gas, and factories.

## Likely judge questions

### Is the agent real?

Yes. The hosted path uses LangGraph and Groq. The model issues typed tool calls, the trusted executor invokes Nokia adapters, observations return to the graph, and the model may choose another tool. If the hosted agent fails, HISN-OT records `AGENT_UNAVAILABLE` and keeps the command held; it does not substitute a rule-based AI recommendation.

### Does the AI decide whether the pump runs?

No. It selects evidence and recommends a response. The deterministic policy engine owns command authorization and the 60% maximum.

### Are Nokia calls real?

SIM Swap, Device Swap, Location Verification, Device Reachability, and QoD use authenticated Nokia sandbox calls in the configured public deployment. Number Verification and slice detachment retain visible local fallbacks because subscriber OAuth and an operational attachment are absent.

### Why not call every API every time?

The evidence floor scales with consequence: one signal for read-only access, three for an in-band physical change, and five for a command above the observed safe band. The model can add proportionate allowlisted evidence and adapts after observations.

### Why is the plant simulated?

A digital twin is the safe, reproducible way to demonstrate cyber-physical consequences during the prototype phase. The app never labels it as a physical PLC.

### What happens when a provider fails?

Unavailable required evidence produces `BLOCK`. It does not fabricate proof or authorize containment from uncertainty.

### What is commercially valuable?

The product creates one evidence trail connecting operator context, mobile-network intelligence, engineering policy, command outcome, and recovery. Utilities and industrial operators can deploy the pattern as a per-site or per-critical-asset safety layer.

## Presentation recovery

- If Groq is unavailable, show `AGENT_UNAVAILABLE` and explain that the held command fails closed without a substitute recommendation.
- If Nokia is unavailable, show the `BLOCK` result and fail-closed behavior.
- If QoD stays pending, explain that HISN-OT correctly withholds backup ownership.
- If a prior run ended in containment, choose any scenario to start a fresh labeled demo baseline.
