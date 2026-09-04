# 105-Second Judge Demo

## 0:00–0:15 — Physical risk

“HISN-OT is an agentic network-enforced safety gate for critical infrastructure. This connected desalination line is stable at 46% pressure, both controllers are reachable, and production is flowing. Our rule is simple: no critical command becomes a physical action without network proof.”

Click **Run Judge Scenario**.

## 0:15–0:30 — Valid credentials, held command

“A privileged operator submits an 88% pressure setpoint. The credentials are valid. But identity alone is not authority. The HISN Gateway intercepts the command before the PLC. Notice the two values: 88% is requested; actual pressure remains around 46%.”

Pause on **COMMAND HELD** if needed.

## 0:30–0:48 — Adaptive evidence

“The bounded agent interprets the physical consequence as critical, then selects the minimum sufficient evidence from an allowlist. A read-only status request needs one tool. This pressure-control request needs five: number verification, SIM swap, device swap, location, and reachability. That plan is generated on the backend from risk policy.”

Use **Explain** on the plan or evidence state.

## 0:48–1:05 — Network context fails

“The number verifies and the device is reachable, but recent SIM and device changes are detected, and the device is outside the approved facility boundary. Every call shows its purpose, status, redacted result, provenance, latency, timestamp, and correlation ID. Today they are honestly labeled SIMULATED for a reliable judge run.”

## 1:05–1:20 — Deterministic authority

“Independently, the deterministic safety engine loads the versioned policy and rejects 88% against the configured 60% maximum. The AI cannot override that. The structured result is `BLOCK_AND_CONTAIN`: identity valid, context compromised, command blocked.”

Pause on **DECISION ISSUED** and point to actual versus requested pressure.

## 1:20–1:38 — Targeted containment and continuity

“Only after that decision is persisted does enforcement start. HISN detaches the implicated gateway, requests Quality on Demand for the trusted backup flow, and moves the backup into safe-control mode. Containment is narrow; operations continue.”

## 1:38–1:50 — Proof and commercial value

Open **Incident**.

“The incident is generated from the event record: correlation, redacted evidence, provenance, deterministic failure, recommendation, authority, enforcement, recovery, and measurable continuity. Unsafe executions are zero; backup heartbeats continued. Desalination is our anchor, but the same gate applies to oil and gas, energy, ports, factories, airports, hospitals, and smart-city infrastructure.”

Close with: “The attacker had valid credentials—and still failed.”

## Presenter recovery

- If interrupted, click **Pause**. State is persisted.
- Use **Back** to revisit an event; it replays history without undoing containment.
- Use **Reset** for a fresh run. It preserves earlier audit records.
- If an external provider is unavailable, use DEMO; do not relabel it sandbox or live.
