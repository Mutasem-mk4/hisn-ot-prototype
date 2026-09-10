# HISN-OT

**Agentic Network-Enforced Safety Gate for Critical Infrastructure**

> No critical command becomes a physical action without network proof.

HISN-OT is a defensive prototype for the MENA Ignite Hackathon's Industrial & Enterprise AI Automation theme. Its interactive desalination line first lets a judge submit a safe 52% pump setpoint and watch the modeled plant respond. The same gate then intercepts an 88% request under compromised network context before it can replace the accepted input. Process motion, telemetry, command location, evidence, containment, and controller ownership all render from the backend simulation state.

The memorable result is: **Identity valid. Context compromised. Command blocked. Operations continued safely.**

This is a safety architecture prototype, not a certified industrial safety system. A default local DEMO uses accurately labeled deterministic fixtures. The deployed Judge Mode opts into Nokia's test network for supported evidence and QoD calls; it still does not control a telecom network or PLC.

## Run locally

Requirements: Node.js 22.18 or later and npm 10 or later.

```powershell
cd hisn-ot-prototype
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4310`. DEMO is the default and needs no secrets. See [QUICKSTART.md](QUICKSTART.md) for presenter instructions and development commands.

## What is real in DEMO mode

- The backend owns the workflow, explicit state machine, authorization checks, evidence planning, policy decision, and playback cadence.
- Every transition is stored in SQLite with a correlation ID and SHA-256 hash link to the prior event.
- The digital twin is stateful. Requested pressure and actual pressure are separate fields; the held 88% command never becomes actual pressure.
- One pausable simulation clock drives the process model, simulation timestamps, controller heartbeats, scenario cadence, and state-bound motion at 0.5×, 1×, 2×, or 4×. Provider durations and external timeouts remain wall-clock based.
- The SVG facility view distinguishes physical water paths from digital command/evidence paths. Pump, flow, tank, valve, telemetry, isolation, and backup ownership reflect the validated twin snapshot rather than an independent frontend animation.
- The operator-facing primary edge and separately enrolled backup edge are shown as distinct control paths. Containment isolates the implicated primary edge; it does not claim that a PLC was quarantined. The backup never receives the operator command and becomes owner only after confirmed handover.
- Back replays persisted events; it does not invent a parallel frontend story. Refresh recovers the current run.
- The incident report is generated from persisted events and enforcement records, then saved and exportable as JSON.
- Every provider result carries explicit provenance. The deployed configuration labels successful Nokia test-network results `SANDBOX` and labels each deterministic fallback `SIMULATED` with a reason.

## Architecture at a glance

The prototype is a TypeScript modular monolith with clean boundaries:

- React presentation consumes versioned Fastify APIs and server-sent snapshots.
- Application orchestration executes the command lifecycle and builds incident reports.
- Domain modules hold the state machine, deterministic safety engine, decision policy, evidence semantics, and digital twin.
- Infrastructure adapters provide SQLite, deterministic simulations, a bounded structured reasoner, and Nokia Network as Code calls.

This shape keeps physical authority outside the model. External operation still requires the identity, reconciliation, operator, and industrial-control work listed in [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). See [ARCHITECTURE.md](ARCHITECTURE.md) for the implemented boundaries.

## Runtime modes

| Mode      | Behavior                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEMO`    | Seeded and reproducible by default. With `HISN_NOKIA_SIMULATOR=true` and complete test configuration, calls Nokia's test network first and visibly falls back per capability when unavailable. |
| `SANDBOX` | Uses configured Nokia adapters without fixture fallback. Interactive APIs remain disabled until enterprise authentication and command-to-gateway binding are implemented.                      |
| `LIVE`    | Requires Nokia configuration; interactive APIs and automatic advancement remain disabled. It is not an operational live-control mode.                                                          |

## Verification

```powershell
npm run verify
npm run test:e2e
npm run test:rehearsal
npm run audit:deps
npm run sample:report
```

`npm run sample:report` regenerates [the redacted DEMO incident](artifacts/sample-incident-report.json) through the production orchestration path. `npm run visual:qa` requires a running production server and captures desktop, projector, tablet, and mobile evidence under `artifacts/visual-qa/`.

Docker files are supplied for reproducible packaging. Docker was not installed in the implementation environment, so container health was not claimed as executed.

## Audit scope and remaining boundaries

See [AUDIT_LEDGER.md](AUDIT_LEDGER.md) for fixes and reproducible evidence. The anonymous DEMO session is not production authentication. STEP_UP remains held; there is no approval or recovery endpoint. The public Judge Mode uses the Groq-compatible hosted reasoner with strict validated output and deterministic fallback. Nokia test-network calls do not establish production operator enforcement. The twin is an in-process first-order simulation, not OpenPLC, Modbus, or a physical controller. This gate cannot prevent a compromised PLC from independently driving unsafe outputs.

## Repository guide

- `config/` — versioned, startup-validated policy and scenario data
- `migrations/` — SQLite schema
- `src/domain/` — deterministic rules and digital twin
- `src/application/` — workflow and ports
- `src/infrastructure/` — provider adapters, configuration, persistence
- `src/server/` — API, session/CSRF boundary, SSE
- `src/web/` — interactive facility schematic and operational evidence views
- `tests/` — unit, integration, end-to-end, and rehearsal suites
- `artifacts/` — redacted sample report and inspected visual captures

## Documentation

[Quickstart](QUICKSTART.md) · [Architecture](ARCHITECTURE.md) · [Safety case](SAFETY_CASE.md) · [Threat model](THREAT_MODEL.md) · [API provenance](API_PROVENANCE.md) · [Live integration](LIVE_INTEGRATION.md) · [Demo script](DEMO_SCRIPT.md) · [Judge Q&A](JUDGE_QA.md) · [Judging matrix](JUDGING_MATRIX.md) · [Design system](DESIGN_SYSTEM.md) · [Evidence ledger](EVIDENCE_LEDGER.md)
