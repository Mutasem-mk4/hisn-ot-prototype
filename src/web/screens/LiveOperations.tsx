import type { RunSnapshot } from '../../application/ports.js';
import { ProcessTwin } from '../components/ProcessTwin.js';
import { StatusMark } from '../components/StatusMark.js';

export function LiveOperations({ snapshot }: { snapshot: RunSnapshot }) {
  const pressurePoints = snapshot.visibleEvents
    .map(
      (event) =>
        (event.payload.twin as { actualPressurePercent?: number } | undefined)
          ?.actualPressurePercent,
    )
    .filter((value): value is number => typeof value === 'number');
  const path = sparkPath(pressurePoints);
  const twin = snapshot.presentationTwin;
  const safeMaximumY = pressureY(snapshot.safePressureBand.maximumPercent);
  const safeMinimumY = pressureY(snapshot.safePressureBand.minimumPercent);
  return (
    <main className="content-screen" id="main-content">
      <ScreenIntro
        kicker="Live Operations"
        title="Continuity is a measurement, not a message."
        text="Process telemetry is reconstructed from persisted domain events. Requested commands never masquerade as actual plant state."
      />
      <div className="operations-grid">
        <ProcessTwin twin={twin} safePressureBand={snapshot.safePressureBand} />
        <section className="telemetry-panel">
          <header>
            <div>
              <span className="eyebrow">Pressure history</span>
              <h2>Stable operating envelope</h2>
            </div>
            <StatusMark status="AVAILABLE">Event stream live</StatusMark>
          </header>
          <svg
            viewBox="0 0 720 250"
            role="img"
            aria-label={`Actual pressure history ending at ${twin.actualPressurePercent} percent`}
          >
            <path className="safe-zone" d={`M0 ${safeMaximumY}H720V${safeMinimumY}H0z`} />
            <path className="telemetry-grid" d="M0 50H720M0 120H720M0 190H720" />
            <path className="telemetry-path" d={path} />
            <text x="8" y={safeMaximumY - 7}>
              {snapshot.safePressureBand.maximumPercent}% SAFE MAX
            </text>
            <text x="8" y={safeMinimumY + 17}>
              {snapshot.safePressureBand.minimumPercent}% SAFE MIN
            </text>
          </svg>
          <div className="continuity-strip">
            <div>
              <span>Unsafe executions</span>
              <b>
                {
                  twin.commandHistory.filter(
                    (item) =>
                      item.outcome === 'EXECUTED' &&
                      item.requestedSetpointPercent !== null &&
                      item.requestedSetpointPercent > snapshot.setPressureMaximumPercent,
                  ).length
                }
              </b>
            </div>
            <div>
              <span>Backup heartbeats</span>
              <b>{twin.backupHeartbeatSequence}</b>
            </div>
            <div>
              <span>Path latency</span>
              <b>{twin.networkLatencyMs} ms</b>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ScreenIntro({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text: string;
}) {
  return (
    <header className="screen-intro">
      <span className="eyebrow">{kicker}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </header>
  );
}

function sparkPath(values: number[]) {
  const points = values.length > 1 ? values : [46, 46];
  return points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 720;
      const y = pressureY(value);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function pressureY(value: number) {
  return 250 - ((value - 35) / 25) * 250;
}
