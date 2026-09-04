# HISN-OT

**Agentic Network-Enforced Safety Gate for Critical Infrastructure**

> No critical command becomes a physical action without network proof.

HISN-OT is a judge-ready defensive prototype for the MENA Ignite Hackathon's Industrial & Enterprise AI Automation theme. Its anchor scenario is a connected MENA desalination facility: a privileged operator with valid credentials requests an unsafe pressure setpoint of 88%, while policy permits at most 60%. The gateway holds the command, a bounded agent selects telecom evidence according to consequence, deterministic policy rejects the request, the implicated gateway is contained, and backup continuity remains measurable.

The memorable result is: **Identity valid. Context compromised. Command blocked. Operations continued safely.**

This is a safety architecture prototype, not a certified industrial safety system. DEMO mode uses accurately labeled deterministic simulations and does not contact a telecom network or PLC.

## Run locally

Requirements: Node.js 22.18 or later and npm 10 or later.

```powershell
cd C:\Users\User\hisn-ot-prototype
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4310`. DEMO is the default and needs no secrets. See [QUICKSTART.md](QUICKSTART.md) for presenter instructions and development commands.

## What is real in DEMO mode

- The backend owns the workflow, explicit state machine, authorization checks, evidence planning, policy decision, and playback cadence.
- Every transition is stored in SQLite with a correlation ID and SHA-256 hash link to the prior event.
- The digital twin is stateful. Requested pressure and actual pressure are separate fields; the held 88% command never becomes actual pressure.
- Back replays persisted events; it does not invent a parallel frontend story. Refresh recovers the current run.
- The incident report is generated from persisted events and enforcement records, then saved and exportable as JSON.
- Evidence and enforcement fixtures enter through the same validated provider contracts as the Nokia adapter and remain labeled `SIMULATED`.

## Architecture at a glance

The prototype is a TypeScript modular monolith with clean boundaries:

- React presentation consumes versioned Fastify APIs and server-sent snapshots.
- Application orchestration executes the command lifecycle and builds incident reports.
- Domain modules hold the state machine, deterministic safety engine, decision policy, evidence semantics, and digital twin.
- Infrastructure adapters provide SQLite, deterministic simulations, a bounded structured reasoner, and Nokia Network as Code calls.

This is the smallest deployable shape that keeps physical authority outside the model while retaining a direct production path. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Runtime modes

| Mode      | Behavior                                                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEMO`    | Seeded, reproducible, no secrets. Telecom and OT enforcement results are visibly simulated.                                                                                   |
| `SANDBOX` | Uses configured Nokia/CAMARA endpoints. Missing configuration returns typed `UNAVAILABLE` evidence and blocks safely.                                                         |
| `LIVE`    | Refuses startup unless all Nokia endpoint, token, device, application server, slice, and geofence values validate. No live claim is made without an observed provider result. |

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

## Repository guide

- `config/` — versioned, startup-validated policy and scenario data
- `migrations/` — SQLite schema
- `src/domain/` — deterministic rules and digital twin
- `src/application/` — workflow and ports
- `src/infrastructure/` — provider adapters, configuration, persistence
- `src/server/` — API, session/CSRF boundary, SSE
- `src/web/` — Network Proof Lattice experience
- `tests/` — unit, integration, end-to-end, and rehearsal suites
- `artifacts/` — redacted sample report and inspected visual captures

## Documentation

[Quickstart](QUICKSTART.md) · [Architecture](ARCHITECTURE.md) · [Safety case](SAFETY_CASE.md) · [Threat model](THREAT_MODEL.md) · [API provenance](API_PROVENANCE.md) · [Live integration](LIVE_INTEGRATION.md) · [Demo script](DEMO_SCRIPT.md) · [Judge Q&A](JUDGE_QA.md) · [Judging matrix](JUDGING_MATRIX.md) · [Design system](DESIGN_SYSTEM.md) · [Evidence ledger](EVIDENCE_LEDGER.md)
