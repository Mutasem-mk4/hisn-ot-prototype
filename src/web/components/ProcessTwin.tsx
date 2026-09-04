import type { Policy, TwinState } from '../../shared/contracts.js';
import { StatusMark } from './StatusMark.js';

export function ProcessTwin({
  twin,
  safePressureBand,
}: {
  twin: TwinState;
  safePressureBand: Policy['safePressureBand'];
}) {
  const requested = twin.requestedPressurePercent;
  return (
    <section className="process-instrument" aria-labelledby="process-heading">
      <div className="section-kicker">
        <span>Process A · RO membrane feed</span>
        <StatusMark status={twin.pumpState === 'SAFE_CONTROL' ? 'SAFE_CONTROL' : 'AVAILABLE'}>
          {twin.pumpState === 'SAFE_CONTROL' ? 'Safe control' : 'Process live'}
        </StatusMark>
      </div>
      <h2 id="process-heading">Physical state</h2>
      <div className="pressure-readout">
        <div>
          <span className="metric-label">Actual pressure</span>
          <strong>
            {twin.actualPressurePercent.toFixed(1)}
            <small>%</small>
          </strong>
          <span className="safe-band">
            Safe band {safePressureBand.minimumPercent}–{safePressureBand.maximumPercent}%
          </span>
        </div>
        <div className={requested !== null ? 'request-value request-value--held' : 'request-value'}>
          <span className="metric-label">Requested setpoint</span>
          <strong>
            {requested === null ? '—' : requested.toFixed(0)}
            {requested !== null && <small>%</small>}
          </strong>
          <span>{requested === null ? 'No command pending' : 'Held at HISN Gateway'}</span>
        </div>
      </div>
      <div
        className="pressure-track"
        role="img"
        aria-label={`Actual pressure ${twin.actualPressurePercent} percent`}
      >
        <i
          className="pressure-track__band"
          style={{
            left: `${safePressureBand.minimumPercent}%`,
            width: `${safePressureBand.maximumPercent - safePressureBand.minimumPercent}%`,
          }}
        />
        <i className="pressure-track__actual" style={{ left: `${twin.actualPressurePercent}%` }} />
        {requested !== null && (
          <i className="pressure-track__requested" style={{ left: `${requested}%` }} />
        )}
      </div>
      <dl className="process-grid">
        <div>
          <dt>Flow</dt>
          <dd>{twin.flowRateM3PerHour.toLocaleString()} m³/h</dd>
        </div>
        <div>
          <dt>Valve</dt>
          <dd>{twin.valvePositionPercent}% open</dd>
        </div>
        <div>
          <dt>Controller</dt>
          <dd>{twin.activeController}</dd>
        </div>
        <div>
          <dt>Gateway</dt>
          <dd>{twin.gatewayAttachment}</dd>
        </div>
      </dl>
      <div className="heartbeat-line">
        <Heartbeat
          label="Primary"
          value={twin.primaryHeartbeatSequence}
          protectedState={twin.primaryAttachment}
        />
        <Heartbeat
          label="Backup"
          value={twin.backupHeartbeatSequence}
          protectedState={twin.backupAttachment}
        />
      </div>
    </section>
  );
}

function Heartbeat({
  label,
  value,
  protectedState,
}: {
  label: string;
  value: number;
  protectedState: string;
}) {
  return (
    <span>
      <i aria-hidden="true" /> {label} <b>#{value}</b> · {protectedState.toLowerCase()}
    </span>
  );
}
