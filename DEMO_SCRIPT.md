# 125-Second Judge Demo

## 0:00–0:18 — Adaptive orchestration

“HISN-OT is an agentic network-enforced safety gate for critical infrastructure. The agent adapts its network evidence to the consequence of each request.”

Click **Run read-only inspection · 1 API**, then open **Evidence Trace**.

“This low-risk request selected only Nokia Device Reachability. The reason, sandbox provenance, redacted result, latency, and correlation are inspectable. It reaches `ALLOW` without changing pressure or starting enforcement. Critical control will require five signals.”

Return to Judge Mode.

## 0:18–0:36 — Physical risk and safe control

“The desalination line is stable at 46% pressure. Our rule is simple: no critical command becomes a physical action without network proof.”

Click **Submit safe change · 52%**, then let the proof complete.

“The request pauses at the HISN gate while authorization is pending. When policy and network proof agree, the packet reaches the primary controller. Pump speed becomes 52%, and pressure, flow, valve position, and tank levels respond from the same model.”

Pause and select the pump or valve to inspect the accepted input and measured response.

## 0:36–0:54 — Unsafe command is held

Click **Submit unsafe change · 88%**.

“A privileged operator now submits an 88% setpoint. The credentials are valid, but identity alone is not authority. The command packet is held at the HISN gate. Notice that 88% is requested while 52% remains the accepted pump input.”

Use **Explain** on the plan or evidence state.

## 0:54–1:12 — Network context fails

“The device is reachable, but recent SIM and device changes are detected, and the device is outside the approved facility boundary. Four checks came from Nokia's test network and say SANDBOX. Number Verification says SIMULATED with its reason: subscriber OAuth is not configured. Every record shows purpose, status, redacted result, provenance, latency, timestamp, and correlation ID.”

## 1:12–1:27 — Deterministic authority

“Independently, the deterministic safety engine loads the versioned policy and rejects 88% against the configured 60% maximum. The AI cannot override that. The structured result is `BLOCK_AND_CONTAIN`: identity valid, context compromised, command blocked.”

Pause on **DECISION ISSUED** and point to actual versus requested pressure.

## 1:27–1:45 — Targeted containment and continuity

“Only after that decision is persisted does enforcement start. The contained object is the suspicious operator-facing primary edge, not the PLC. No real slice attachment exists yet, so its isolation is visibly implemented locally with that reason. The backup has a separate enrolled identity and path, never receives the operator command, and cannot become owner without confirmed handover. The Nokia test network accepts and releases the Quality on Demand session, but its lifecycle stays REQUESTED. HISN records PENDING, withholds backup ownership, and safe-stops the model.”

## 1:45–2:05 — Proof and commercial value

Open **Incident**.

“The incident is generated from the event record: correlation, redacted evidence, provenance, deterministic failure, recommendation, authority, enforcement, recovery, and measurable process state. Unsafe executions are zero, and the unconfirmed handover is visible. Desalination is our anchor, but the same gate applies to oil and gas, energy, ports, factories, airports, hospitals, and smart-city infrastructure.”

Close with: “The attacker had valid credentials—and still failed.”

## Presenter recovery

- If interrupted, click **Pause simulation**. Local process time and its motion freeze; state is persisted.
- Use **Back** to revisit an event; it replays history without undoing containment.
- Use **Reset** for a fresh run. It preserves earlier audit records.
- If a provider is unavailable, point to the recorded fallback reason. Do not relabel simulated evidence as sandbox or live.
