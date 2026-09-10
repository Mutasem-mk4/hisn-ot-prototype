import type { RunSnapshot } from '../../application/ports.js';
import { ControlRail } from '../components/ControlRail.js';
import { FacilitySchematic } from '../components/FacilitySchematic.js';
import { ProcessTwin } from '../components/ProcessTwin.js';
import { StatusMark } from '../components/StatusMark.js';

type ControlAction = 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'RESET' | 'SET_SPEED';

export function JudgeMode({
  snapshot,
  busy,
  explained,
  onControl,
  onCommand,
  onExplain,
}: {
  snapshot: RunSnapshot;
  busy: boolean;
  explained: boolean;
  onControl: (action: ControlAction, speed?: string) => void;
  onCommand: (scenarioId: string) => void;
  onExplain: () => void;
}) {
  const event = snapshot.currentEvent;
  const decision = snapshot.artifacts.decision;
  const progress = ['COMPLETE', 'FAILED_SAFE'].includes(snapshot.run.playbackStatus)
    ? 100
    : Math.round((snapshot.run.presentationCursor / 13) * 100);
  return (
    <main className="judge-screen" id="main-content">
      <section className="judge-intro">
        <div>
          <span className="eyebrow">
            Connected MENA desalination facility · Judge Mode ·{' '}
            {snapshot.integration.evidenceSource === 'NOKIA_SANDBOX_WITH_FALLBACK'
              ? 'Nokia test network connected'
              : 'Deterministic evidence mode'}
          </span>
          <h1>No critical command becomes a physical action without network proof.</h1>
        </div>
        <div className="takeaway">
          <span>Security question</span>
          <b>Valid credentials. But should this command execute?</b>
        </div>
      </section>
      <ControlRail
        snapshot={snapshot}
        busy={busy}
        explained={explained}
        onControl={onControl}
        onCommand={onCommand}
        onExplain={onExplain}
        onPresent={() => void document.documentElement.requestFullscreen?.()}
      />
      <div className="event-banner" data-state={decision?.state ?? snapshot.run.playbackStatus}>
        <div className="event-sequence">{String(event?.sequence ?? 0).padStart(2, '0')}</div>
        <div>
          <span className="eyebrow">
            {event?.workflowState?.replaceAll('_', ' ') ?? 'SYSTEM BASELINE'}
          </span>
          <h2>{(event?.payload.headline as string) ?? 'Initializing operational proof'}</h2>
          <p>{(event?.payload.detail as string) ?? 'Waiting for persisted process telemetry.'}</p>
        </div>
        <StatusMark status={decision?.state ?? snapshot.run.playbackStatus} />
      </div>
      <FacilitySchematic snapshot={snapshot} />
      <div className="judge-support">
        <ProcessTwin
          twin={snapshot.presentationTwin}
          safePressureBand={snapshot.safePressureBand}
        />
        <section className="proof-compact" aria-labelledby="adaptive-heading">
          <span className="eyebrow">Adaptive agent plan</span>
          <h2 id="adaptive-heading">Evidence scales with consequence</h2>
          <div className="plan-compare">
            <div>
              <span>Read only</span>
              <b>{snapshot.lowRiskComparison.selectedTools.length}</b>
              <small>tool · LOW</small>
            </div>
            <i aria-hidden="true" />
            <div>
              <span>Pressure control</span>
              <b>{snapshot.artifacts.plan?.selectedTools.length ?? '—'}</b>
              <small>tools · {snapshot.artifacts.plan?.risk ?? 'pending'}</small>
            </div>
          </div>
        </section>
      </div>
      {explained && (
        <aside className="explain-drawer" aria-label="Current event explanation">
          <span className="eyebrow">Presenter cue</span>
          <b>{presenterCue(event?.workflowState ?? null, snapshot)}</b>
          <p>
            Correlation <code>{snapshot.run.correlationId.slice(0, 18)}…</code> · audit hash{' '}
            <code>{event?.integrityHash.slice(0, 14)}…</code>
          </p>
        </aside>
      )}
      <div
        className="run-progress"
        role="progressbar"
        aria-label="Scenario progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, progress)}
      >
        <i style={{ width: `${Math.min(100, progress)}%` }} />
      </div>
    </main>
  );
}

function presenterCue(state: string | null, snapshot: RunSnapshot) {
  if (state && snapshot.currentEvent) return String(snapshot.currentEvent.payload.detail);
  return 'Begin with simulated operations and the separation between requested, accepted and observed pressure.';
}
