import type { RunSnapshot } from '../../application/ports.js';
import { StatusMark } from '../components/StatusMark.js';
import { ScreenIntro } from './LiveOperations.js';

export function ArchitectureView({
  snapshot,
  onDegraded,
}: {
  snapshot: RunSnapshot;
  onDegraded: () => void;
}) {
  const readiness = snapshot.integration;
  return (
    <main className="content-screen" id="main-content">
      <ScreenIntro
        kicker="Architecture & Integration"
        title="Small system. Hard boundaries."
        text="A modular monolith separates presentation, orchestration, deterministic domain rules, and swappable infrastructure adapters."
      />
      <section className="architecture-map" aria-label="HISN-OT clean architecture">
        <div className="arch-layer arch-presentation">
          <span>01</span>
          <b>Presentation</b>
          <small>React · SSE · print report</small>
        </div>
        <div className="arch-gate">Validated API boundary</div>
        <div className="arch-layer arch-application">
          <span>02</span>
          <b>Application</b>
          <small>Incident orchestrator · state machine</small>
        </div>
        <div className="arch-gate">Typed ports</div>
        <div className="arch-layer arch-domain">
          <span>03</span>
          <b>Domain authority</b>
          <small>Command gateway · safety engine · twin</small>
        </div>
        <div className="arch-split">
          <div>
            <b>CAMARA evidence ports</b>
            <small>Pre-decision only</small>
          </div>
          <div>
            <b>Nokia enforcement ports</b>
            <small>Post-decision only</small>
          </div>
        </div>
        <div className="arch-layer arch-infrastructure">
          <span>04</span>
          <b>Infrastructure</b>
          <small>SQLite audit · Nokia SDK · simulations</small>
        </div>
      </section>
      <div className="integration-layout">
        <section className="readiness-panel">
          <header>
            <div>
              <span className="eyebrow">Demo Readiness</span>
              <h2>{readiness.runtimeMode} runtime</h2>
            </div>
            <StatusMark status="READY" />
          </header>
          <ul>
            {Object.entries(readiness).map(
              ([key, value]) =>
                key !== 'runtimeMode' && (
                  <li key={key}>
                    <span>{humanize(key)}</span>
                    <StatusMark status={value} />
                  </li>
                ),
            )}
          </ul>
        </section>
        <section className="provenance-panel">
          <span className="eyebrow">Integration truth</span>
          <h2>Capability provenance</h2>
          <dl>
            <div>
              <dt>Evidence contract</dt>
              <dd>Nokia Network as Code / CAMARA-shaped</dd>
            </div>
            <div>
              <dt>Current results</dt>
              <dd>
                {readiness.runtimeMode === 'DEMO'
                  ? 'Deterministic simulation fixtures'
                  : 'Configured provider adapter'}
              </dd>
            </div>
            <div>
              <dt>Gateway detachment</dt>
              <dd>
                {readiness.runtimeMode === 'DEMO'
                  ? 'Simulated adapter'
                  : 'Specialized Networks adapter'}
              </dd>
            </div>
            <div>
              <dt>Backup QoD</dt>
              <dd>
                {readiness.runtimeMode === 'DEMO' ? 'Simulated adapter' : 'QoD session adapter'}
              </dd>
            </div>
          </dl>
          <button onClick={onDegraded}>Run degraded-provider proof</button>
        </section>
      </div>
    </main>
  );
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}
