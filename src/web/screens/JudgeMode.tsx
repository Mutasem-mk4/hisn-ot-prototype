import type { RunSnapshot } from '../../application/ports.js';
import { ControlRail } from '../components/ControlRail.js';
import { NetworkProofLattice } from '../components/NetworkProofLattice.js';
import { ProcessTwin } from '../components/ProcessTwin.js';
import { StatusMark } from '../components/StatusMark.js';

type ControlAction = 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'RESET';

export function JudgeMode({
  snapshot,
  busy,
  explained,
  onControl,
  onExplain,
}: {
  snapshot: RunSnapshot;
  busy: boolean;
  explained: boolean;
  onControl: (action: ControlAction, speed?: string) => void;
  onExplain: () => void;
}) {
  const event = snapshot.currentEvent;
  const decision = snapshot.artifacts.decision;
  const progress = Math.round((snapshot.run.presentationCursor / 13) * 100);
  return (
    <main className="judge-screen" id="main-content">
      <section className="judge-intro">
        <div>
          <span className="eyebrow">Connected MENA desalination facility · Judge Mode</span>
          <h1>No critical command becomes a physical action without network proof.</h1>
        </div>
        <div className="takeaway">
          <span>Judge takeaway</span>
          <b>The attacker had valid credentials—and still failed.</b>
        </div>
      </section>
      <ControlRail
        snapshot={snapshot}
        busy={busy}
        explained={explained}
        onControl={onControl}
        onExplain={onExplain}
        onPresent={() => void document.documentElement.requestFullscreen?.()}
      />
      <div className="judge-grid">
        <div className="judge-primary">
          <div className="event-banner" data-state={decision?.state ?? snapshot.run.playbackStatus}>
            <div className="event-sequence">{String(event?.sequence ?? 0).padStart(2, '0')}</div>
            <div>
              <span className="eyebrow">
                {event?.workflowState?.replaceAll('_', ' ') ?? 'SYSTEM BASELINE'}
              </span>
              <h2>{(event?.payload.headline as string) ?? 'Initializing operational proof'}</h2>
              <p>
                {(event?.payload.detail as string) ?? 'Waiting for persisted process telemetry.'}
              </p>
            </div>
            <StatusMark status={decision?.state ?? snapshot.run.playbackStatus} />
          </div>
          <NetworkProofLattice
            artifacts={snapshot.artifacts}
            workflowState={event?.workflowState ?? null}
          />
        </div>
        <aside className="judge-side">
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
        </aside>
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
  const requested = snapshot.run.command.requestedSetpointPercent ?? 'the requested value';
  const actual = snapshot.presentationTwin.actualPressurePercent.toFixed(1);
  const maximum = snapshot.setPressureMaximumPercent;
  const cues: Record<string, string> = {
    COMMAND_RECEIVED:
      'Credentials establish identity. They do not establish safe intent or trusted context.',
    COMMAND_HELD: `Point to ${requested}% requested and ${actual}% actual: interception is already protecting the plant.`,
    RISK_CLASSIFIED: 'The agent interprets consequence before selecting any network tools.',
    EVIDENCE_PLANNED: 'Compare one tool for a read with five for critical pressure control.',
    EVIDENCE_COMPLETE:
      'The number is valid, but presence and subscription integrity are compromised.',
    SAFETY_EVALUATED: `The ${maximum}% rule is deterministic configuration. The model has no veto.`,
    DECISION_ISSUED: 'This is structured authority: BLOCK_AND_CONTAIN, not free-form model output.',
    ENDPOINT_CONTAINED: 'Only the implicated gateway is detached after authorization.',
    CONTINUITY_PROTECTED: 'Backup heartbeats rise while unsafe executions remain zero.',
    INCIDENT_REPORTED: 'Every result is exportable with provenance and audit integrity.',
  };
  return (
    cues[state ?? ''] ??
    'Begin with stable operations and the separation between requested and actual pressure.'
  );
}
