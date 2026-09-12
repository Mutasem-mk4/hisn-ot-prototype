# Demo and judging

## Two-minute demonstration

Playback starts at 0.5× with a three-second pause on every recorded step, including the first. A 13-frame attack replay takes about 36 seconds after API execution finishes. Provider calls run at normal speed; the interface labels the presentation as recorded execution replay. Change speed, pause, or advance manually under **Demo controls**. The final result stays visible until another action is selected.

### 0:00–0:20 — State the problem

“Credentials can be stolen. HISN-Oil asks whether this command has current network proof before it can affect a pump.” Point to the valid-credentials attack scenario and the recommended action.

### 0:20–0:55 — Run the attack demonstration

Select **Run attack demonstration**. Follow the result: the gateway holds the 52% request, the agent starts with location and reachability, then a failed location observation expands the investigation to SIM Swap and Device Swap. Deterministic policy issues `BLOCK_AND_CONTAIN`, and the plant keeps its accepted setting. Because 52% is inside the independent 60% hard limit, the adverse network context is the decisive blocker.

### 0:55–1:20 — Prove the physical outcome

Use the outcome panel to compare **52% requested** with the unchanged accepted value. It explicitly shows that the request passed the independent **60% command hard limit**. The final decision is visible without opening the digital twin.

### 1:20–1:45 — Prove the agent and evidence

Open **How was this decision made?** to show the protection path, agent summary, and recorded network observations. Expand **Show technical trace** if the judges want the goal, tool request, redacted observation, adaptation, and recommendation record. This is an auditable action and observation trace, not hidden chain-of-thought.

### 1:45–2:00 — Prove honesty and depth

Point to the provenance strip and explain whether the current run uses Nokia sandbox, local evidence, or an unavailable provider. Open **Evidence Trace** for correlation IDs, latency, timestamps, and the incident link. The detailed digital twin remains available under **Open technical view**.

## Optional comparisons

- **Run trusted comparison** submits the same 52% command and demonstrates `ALLOW` when location and reachability pass.
- **Run read-only inspection** demonstrates the one-signal Device Reachability minimum with no process-state change.
- **Demo controls** exposes pause, playback speed, event stepping, reset, presenter cues, and full-screen mode for technical review.

## Likely judge questions

### Is the agent real?

Yes. The hosted path uses LangGraph and Groq. The model issues typed tool calls, the trusted executor invokes Nokia adapters, observations return to the graph, and the model may choose another tool. If the hosted agent fails, HISN-Oil records `AGENT_UNAVAILABLE` and keeps the command held; it does not substitute a rule-based AI recommendation.

### Does the AI decide whether the pump runs?

No. It selects evidence and recommends a response. The deterministic policy engine owns command authorization and the 60% maximum.

### Are Nokia calls real?

SIM Swap, Device Swap, Location Verification, Device Reachability, and QoD use authenticated Nokia sandbox calls in the configured public deployment. The strict connected diagnostic also obtains a Nokia simulator fast-flow authorization code before calling Number Verification. This proves the sandbox OAuth path, not consent from a live subscriber. The primary connected rehearsal reports slice detachment UNAVAILABLE unless the implicated gateway attachment actually exists. It never substitutes successful local detachment.

### Why not call every API every time?

The evidence floor starts with one signal for read-only access and two for a pressure request inside the observed safe band. A failed usable observation expands the investigation to SIM Swap and Device Swap; requests above that band require all four signals immediately. This makes the model's post-observation selection visible while deterministic policy still enforces the completed evidence floor.

### Why is the plant simulated?

A digital twin is the safe, reproducible way to demonstrate cyber-physical consequences during the prototype phase. The app never labels it as a physical PLC.

### What happens when a provider fails?

Unavailable required evidence produces `BLOCK`. It does not fabricate proof or authorize containment from uncertainty.

### What is commercially valuable?

The product creates one evidence trail connecting operator context, mobile-network intelligence, engineering policy, command outcome, and recovery. Utilities and industrial operators can deploy the pattern as a per-site or per-critical-asset safety layer.

## Presentation recovery

- If Groq is unavailable, show `AGENT_UNAVAILABLE` and explain that the held command fails closed without a substitute recommendation.
- If Nokia is unavailable, show the `BLOCK` result and fail-closed behavior.
- If QoD stays pending, explain that HISN-Oil correctly withholds backup ownership.
- If a prior run ended in containment, choose any scenario to start a fresh labeled demo baseline.
