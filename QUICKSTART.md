# Quickstart

## Fastest reliable start

```powershell
cd C:\Users\User\hisn-ot-prototype
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4310`. The default `DEMO` mode needs no `.env` file and persists to `var/hisn-ot.db`.

For development with automatic reload:

```powershell
npm run dev
```

The Vite development UI is `http://127.0.0.1:4173`; it proxies `/api` to port 4310.

## Judge Mode in 90–150 seconds

1. Use a 1440×900 browser when possible. Open Judge Mode and click **Present** for full screen.
2. Click **Run Judge Scenario**. At 1×, the server advances one persisted state every seven seconds and reaches the report in about 90 seconds.
3. Pause at **COMMAND HELD**. Point to `88% requested` and `~46% actual`: the PLC has not received the request.
4. Resume through the runtime evidence plan. Point to the one-tool read-only comparison versus five tools for critical control.
5. Pause at **DECISION ISSUED**. Identity is valid; SIM/device/location context fails; 88% independently exceeds the policy's 60% maximum.
6. Resume. Containment starts only after the persisted `BLOCK_AND_CONTAIN` decision. The gateway detaches, QoD is requested for the backup path, and the backup enters safe-control mode.
7. Open **Incident**, then use **Export JSON** or **Print report**.

Controls are state-safe: Play/Resume, Pause, Step, Back, Reset, Speed, Explain, and Present. `Space` toggles Play/Pause. Arrow Right steps; Arrow Left replays the previous persisted event. Back does not reverse a real enforcement action.

## Reliability checks before judging

```powershell
npm run verify
npm run test:rehearsal
npm run test:e2e
```

Open **Architecture** and confirm every Demo Readiness check is ready or available. In DEMO, the provider and network adapter should be `AVAILABLE` and every external result should say `SIMULATED`.

## Optional Docker start

```powershell
docker compose up --build
```

Then open `http://127.0.0.1:4310`. The compose health check calls `/readyz`. Docker was not available in the build environment, so run this command on the presentation machine before relying on it.

## Resetting local demo data

Reset from Judge Mode to start a fresh persisted run. This preserves earlier SQLite history. To use a separate database without deleting anything:

```powershell
$env:HISN_DATABASE_PATH = './var/rehearsal.db'
npm start
```
