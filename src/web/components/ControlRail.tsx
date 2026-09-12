import { useRef } from 'react';
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
  const technicalControls = useRef<HTMLDetailsElement>(null);
  const runScenario = (scenarioId: string) => {
    if (technicalControls.current) technicalControls.current.open = false;
    onCommand(scenarioId);
  };
  return (
    <section className="scenario-launcher" aria-labelledby="scenario-launcher-heading">
      <div className="scenario-launcher__intro">
        <h2 id="scenario-launcher-heading">Same command. Different network trust.</h2>
        <p>
          Both operators request 52%, inside the {snapshot.setPressureMaximumPercent}% hard limit.
          Trusted network evidence determines which command reaches the digital twin.
        </p>
      </div>

      <div className="scenario-actions" role="group" aria-label="Demonstration scenarios">
        <button
          className="scenario-action scenario-action--primary"
          onClick={() => runScenario('judge-valid-credentials-compromised-context')}
          disabled={busy}
        >
          <span>
            {busy ? 'Holding command and collecting evidence…' : 'Run attack demonstration'}
          </span>
          <b>52%</b>
        </button>
        <button
          className="scenario-action"
          onClick={() => runScenario('judge-safe-operating-change')}
          disabled={busy}
        >
          <span>Run trusted comparison</span>
          <b>52%</b>
        </button>
        <button
          className="scenario-action scenario-action--quiet"
          onClick={() => runScenario('judge-read-only-inspection')}
          disabled={busy}
        >
          <span>Run read-only inspection</span>
          <b>
            {lowRiskToolCount} {lowRiskToolCount === 1 ? 'API' : 'APIs'}
          </b>
        </button>
      </div>

      <p className="replay-note">
        {snapshot.integration.agentReasoner === 'LANGGRAPH'
          ? 'Live LangGraph and provider calls run now. The policy decision remains deterministic.'
          : 'Reproducible local replay. Provider provenance is labeled on every result.'}
      </p>
      <details className="demo-controls" ref={technicalControls}>
        <summary>Demo controls</summary>
        <div className="demo-controls__body" role="group" aria-label="Simulation playback">
          <button onClick={() => onCommand('judge-hard-limit')} disabled={busy}>
            Test hard limit · 88%
          </button>
          <button onClick={() => onCommand('judge-degraded-provider')} disabled={busy}>
            Test evidence outage · 58%
          </button>
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
