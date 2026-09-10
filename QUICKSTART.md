# Quickstart

## Fastest reliable start

```powershell
cd hisn-ot-prototype
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
2. Under **B · Pump operating setpoint**, click **Submit safe change · 52%**. The command packet stops at the HISN gate while evidence is gathered. Use **Step proof** for narration or let the simulation advance automatically.
3. At `ALLOW`, the packet is released to the primary controller. Let the simulation run briefly: pump speed becomes 52%, flow increases, pressure approaches the accepted value progressively, and tank/valve telemetry follows the same process model.
4. Pause the simulation to inspect a tank, pump, treatment stage, valve, gate, or controller. The simulation clock and state-bound motion freeze together.
5. Click **Submit unsafe change · 88%**. The previously accepted 52% input remains in force while the new packet is held and then blocked at the gate.
6. Continue through `BLOCK_AND_CONTAIN`. The implicated primary path becomes isolated. The backup is marked as owner only after QoD and the simulated safe-control activation both succeed; a pending or failed handover safe-stops the modeled pump.
7. Open **Incident**, then use **Export JSON** or **Print report**.

Controls are state-safe: Run/Pause simulation, Step proof, Back, Reset, Clock speed, Explain, and Present. `Space` toggles Run/Pause. Arrow Right steps; Arrow Left replays the previous persisted event. Back does not reverse a real enforcement action.

Playback speed (0.5×, 1×, 2×, 4×) changes simulated time, not the pump input. Pause freezes the local process, scenario scheduling, simulation timestamps, and corresponding motion without a resume jump. Real provider durations and timeouts remain wall-clock based. Back shows historical process observations; returning to the latest event shows current observations. Reset creates another DEMO run and preserves prior audit history. STEP_UP never executes without approval, and this prototype intentionally exposes no approval or quarantine-recovery endpoint.

## Reliability checks before judging

```powershell
npm run verify
npm run test:rehearsal
npm run test:e2e
```

With the production server running on the default port, reproduce the three standard browser runs plus the degraded-provider run and refresh the visual evidence:

```powershell
$env:HISN_VISUAL_URL = 'http://127.0.0.1:4310'
node scripts/rehearse-browser.mjs
npm run visual:qa
```

The rehearsal measurements are written to `artifacts/browser-rehearsals.json`. Visual captures are written to `artifacts/visual-qa/`. Both scripts explicitly start the required scenario, so a previously selected degraded run cannot leak into standard evidence.

Open **Architecture** and confirm every Demo Readiness check is ready or available. A default local DEMO labels provider results `SIMULATED`. The deployed hybrid configuration identifies its provider source as `NOKIA_SANDBOX_WITH_FALLBACK`; successful Nokia test-network results say `SANDBOX`, and any deterministic substitute says `SIMULATED` with a fallback reason.

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
