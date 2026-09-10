import type { RunSnapshot } from '../../application/ports.js';

type ControlAction = 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'RESET' | 'SET_SPEED';

export function ControlRail({
  snapshot,
  busy,
  explained,
  onControl,
  onCommand,
  onExplain,
  onPresent,
}: {
  snapshot: RunSnapshot;
  busy: boolean;
  explained: boolean;
  onControl: (action: ControlAction, speed?: string) => void;
  onCommand: (scenarioId: string) => void;
  onExplain: () => void;
  onPresent: () => void;
}) {
  const playing = !snapshot.presentationTwin.simulationPaused;
  const atStart = snapshot.run.presentationCursor <= 1;
  const terminal = ['COMPLETE', 'FAILED_SAFE'].includes(snapshot.run.playbackStatus);
  const contained = snapshot.run.twin.gatewayAttachment !== 'OPERATIONAL';
  const lowRiskToolCount = snapshot.lowRiskComparison.selectedTools.length;
  return (
    <section className="scenario-launcher" aria-labelledby="scenario-launcher-heading">
      <div className="scenario-launcher__intro">
        <h2 id="scenario-launcher-heading">Try a compromised command</h2>
        <p>
          An 88% pressure request exceeds the {snapshot.setPressureMaximumPercent}% command hard
          limit.
        </p>
      </div>

      <div className="scenario-actions" role="group" aria-label="Demonstration scenarios">
        <button
          className="scenario-action scenario-action--primary"
          onClick={() => onCommand('judge-valid-credentials-compromised-context')}
          disabled={busy}
        >
          <span>{busy ? 'Preparing verified run…' : 'Run attack demonstration'}</span>
        </button>
        <button
          className="scenario-action"
          onClick={() => onCommand('judge-safe-operating-change')}
          disabled={busy}
        >
          <span>Run safe command</span>
          <b>52%</b>
        </button>
        <button
          className="scenario-action scenario-action--quiet"
          onClick={() => onCommand('judge-read-only-inspection')}
          disabled={busy}
        >
          <span>Run read-only inspection</span>
          <b>
            {lowRiskToolCount} {lowRiskToolCount === 1 ? 'API' : 'APIs'}
          </b>
        </button>
      </div>

      <details className="demo-controls">
        <summary>Demo controls</summary>
        <div className="demo-controls__body" role="group" aria-label="Simulation playback">
          <button
            className="control-primary"
            onClick={() => onControl(playing ? 'PAUSE' : 'PLAY')}
            disabled={busy}
          >
            <ControlIcon name={playing ? 'pause' : 'play'} />
            <span>{playing ? 'Pause simulation' : 'Run simulation'}</span>
          </button>
          <label className="speed-control">
            <span>Speed</span>
            <select
              aria-label="Simulation playback speed"
              value={String(snapshot.run.speed)}
              onChange={(event) => onControl('SET_SPEED', event.target.value)}
              disabled={busy}
            >
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="4">4×</option>
            </select>
          </label>
          <button onClick={() => onControl('PREVIOUS')} disabled={busy || atStart}>
            <ControlIcon name="back" /> <span>Previous</span>
          </button>
          <button
            onClick={() => onControl('NEXT')}
            disabled={busy || terminal}
            aria-label="Advance one backend event"
          >
            <ControlIcon name="next" /> <span>Next step</span>
          </button>
          <button
            onClick={() => onControl('RESET')}
            disabled={busy}
            aria-label="Reset local simulation"
          >
            <ControlIcon name="reset" /> <span>Reset</span>
          </button>
          <button
            className={explained ? 'is-active' : ''}
            onClick={onExplain}
            aria-pressed={explained}
            aria-label="Explain current event"
          >
            <ControlIcon name="explain" /> <span>Presenter cue</span>
          </button>
          <button onClick={onPresent} aria-label="Enter presentation mode">
            <ControlIcon name="present" /> <span>Full screen</span>
          </button>
        </div>
        {contained && <p>Choosing another scenario starts from a fresh facility baseline.</p>}
      </details>
    </section>
  );
}

function ControlIcon({
  name,
}: {
  name: 'play' | 'pause' | 'back' | 'next' | 'reset' | 'explain' | 'present';
}) {
  const paths = {
    play: 'M7 5v14l11-7z',
    pause: 'M7 5h4v14H7zm7 0h4v14h-4z',
    back: 'm14 6-6 6 6 6',
    next: 'm10 6 6 6-6 6',
    reset: 'M18 8a7 7 0 1 0 1 6M18 4v4h-4',
    explain: 'M12 17v.01M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.8.5-1.2 1-1.2 2',
    present: 'M4 5h16v12H4zM9 21l3-4 3 4',
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
