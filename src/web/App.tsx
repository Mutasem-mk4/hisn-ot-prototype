import { useCallback, useEffect, useRef, useState } from 'react';
import type { IncidentReport, RunSnapshot } from '../application/ports.js';
import { Brand } from './components/Brand.js';
import { StatusMark } from './components/StatusMark.js';
import { getJudgeRun, initializeSession, rehearseJudgeRun, type RehearsalResult } from './api.js';
import { ArchitectureView } from './screens/ArchitectureView.js';
import { EvidenceTrace } from './screens/EvidenceTrace.js';
import { IncidentReportView } from './screens/IncidentReportView.js';
import { JudgeMode } from './screens/JudgeMode.js';
import { LiveOperations } from './screens/LiveOperations.js';

type Screen = 'judge' | 'operations' | 'evidence' | 'incident' | 'architecture';
type ControlAction = 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'RESET' | 'SET_SPEED';

export function App() {
  const [screen, setScreen] = useState<Screen>(() => screenFromHash());
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordedReplay, setRecordedReplay] = useState(false);
  const lastCompleted = useRef<RehearsalResult | null>(null);
  const controlPending = useRef(false);
  const rehearsalFrames = useRef<RunSnapshot[]>([]);
  const rehearsalIndex = useRef(0);
  const playbackGeneration = useRef(0);
  const [explained, setExplained] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void initializeSession()
      .then(getJudgeRun)
      .then((initial) => {
        if (cancelled) return;
        setSnapshot(playbackFrame(initial, false, 0.5));
      })
      .catch((reason: Error) => setError(reason.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHash = () => setScreen(screenFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const showFrame = useCallback(
    (frames: RunSnapshot[], index: number, playing: boolean, speed: number) => {
      rehearsalIndex.current = index;
      setSnapshot(playbackFrame(frames[index]!, playing && index < frames.length - 1, speed));
    },
    [],
  );

  const playFrames = useCallback(
    (frames: RunSnapshot[], startIndex: number, speed: number) => {
      const generation = ++playbackGeneration.current;
      if (frames.at(-1)?.run.playbackStatus === 'FAILED_SAFE') {
        showFrame(frames, frames.length - 1, false, speed);
        return;
      }
      showFrame(frames, startIndex, true, speed);
      const advance = (index: number) => {
        window.setTimeout(() => {
          if (playbackGeneration.current !== generation) return;
          const nextIndex = index + 1;
          showFrame(frames, nextIndex, nextIndex < frames.length - 1, speed);
          if (nextIndex < frames.length - 1) advance(nextIndex);
        }, 1500 / speed);
      };
      if (startIndex < frames.length - 1) advance(startIndex);
    },
    [showFrame],
  );

  const prepareRehearsal = useCallback(
    async (scenarioId: string, continuingTwin?: RunSnapshot['run']['twin']) => {
      setBusy(true);
      playbackGeneration.current += 1;
      setRecordedReplay(false);
      setError(null);
      try {
        const result = await rehearseJudgeRun(scenarioId, continuingTwin);
        if (result.frames.at(-1)?.run.playbackStatus === 'COMPLETE') lastCompleted.current = result;
        rehearsalFrames.current = result.frames;
        rehearsalIndex.current = 0;
        setReport(result.incident);
        showFrame(result.frames, 0, false, result.frames[0]!.run.speed);
        return result.frames;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not prepare the rehearsal');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [showFrame],
  );

  const onControl = useCallback(
    async (action: ControlAction, speedValue?: string) => {
      if (!snapshot || controlPending.current) return;
      const speed = speedValue ? Number(speedValue) : snapshot.run.speed;
      const frames = rehearsalFrames.current;
      if (action === 'SET_SPEED') {
        if (!snapshot.presentationTwin.simulationPaused && frames.length > 0) {
          playbackGeneration.current += 1;
          playFrames(frames, rehearsalIndex.current, speed);
        } else {
          setSnapshot(playbackFrame(snapshot, false, speed));
        }
        return;
      }
      if (action === 'PAUSE') {
        playbackGeneration.current += 1;
        setSnapshot(playbackFrame(snapshot, false, speed));
        return;
      }
      if (action === 'RESET' && frames.length > 0) {
        playbackGeneration.current += 1;
        showFrame(frames, 0, false, speed);
        return;
      }
      let prepared = frames;
      if (prepared.length === 0 || prepared[0]?.run.scenarioId !== snapshot.run.scenarioId) {
        controlPending.current = true;
        prepared = (await prepareRehearsal(snapshot.run.scenarioId, snapshot.run.twin)) ?? [];
        controlPending.current = false;
      }
      if (prepared.length === 0) return;
      if (action === 'PLAY') {
        const start = rehearsalIndex.current >= prepared.length - 1 ? 0 : rehearsalIndex.current;
        playFrames(prepared, start, speed);
      } else if (action === 'NEXT') {
        playbackGeneration.current += 1;
        showFrame(
          prepared,
          Math.min(prepared.length - 1, rehearsalIndex.current + 1),
          false,
          speed,
        );
      } else if (action === 'PREVIOUS') {
        playbackGeneration.current += 1;
        showFrame(prepared, Math.max(0, rehearsalIndex.current - 1), false, speed);
      }
    },
    [playFrames, prepareRehearsal, showFrame, snapshot],
  );

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!snapshot || isInteractiveTarget(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void onControl(snapshot.presentationTwin.simulationPaused ? 'PLAY' : 'PAUSE');
      }
      if (event.key === 'ArrowRight') void onControl('NEXT');
      if (event.key === 'ArrowLeft') void onControl('PREVIOUS');
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [snapshot, onControl]);

  const runDegraded = async () => {
    const frames = await prepareRehearsal('judge-degraded-provider');
    if (frames) {
      window.location.hash = 'judge';
      playFrames(frames, 0, snapshot?.run.speed ?? 0.5);
    }
  };

  const submitCommand = async (scenarioId: string) => {
    if (!snapshot || controlPending.current) return;
    controlPending.current = true;
    const continuingTwin =
      snapshot.run.twin.gatewayAttachment === 'OPERATIONAL' ? snapshot.run.twin : undefined;
    const frames = await prepareRehearsal(scenarioId, continuingTwin);
    controlPending.current = false;
    if (frames) {
      window.location.hash = 'judge';
      playFrames(frames, 0, snapshot.run.speed);
    }
  };

  if (error && !snapshot) return <SystemState title="HISN-Oil failed safe" detail={error} />;
  if (!snapshot)
    return (
      <SystemState
        title="Establishing network proof"
        detail="Validating policy, audit store, and digital twin…"
        loading
      />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <Brand />
        <nav aria-label="Primary navigation">
          {(['judge', 'evidence', 'architecture'] as Screen[]).map((item) => (
            <a key={item} href={`#${item}`} aria-current={screen === item ? 'page' : undefined}>
              {navLabel(item)}
            </a>
          ))}
        </nav>
        <div className="mode-indicator">
          <StatusMark status={snapshot.integration.evidenceSource}>
            {snapshot.integration.evidenceSource === 'NOKIA_SANDBOX_WITH_FALLBACK'
              ? 'NOKIA TEST NETWORK'
              : snapshot.run.runtimeMode}
          </StatusMark>
          <span>{snapshot.policyVersion}</span>
        </div>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {screen === 'judge' && (
        <div className="replay-note" role="status">
          {recordedReplay && (
            <b>RECORDED RUN · {snapshot.run.createdAt} · no new provider calls. </b>
          )}
          {lastCompleted.current && (
            <button
              disabled={busy}
              onClick={() => {
                const recorded = lastCompleted.current!;
                setRecordedReplay(true);
                setError(null);
                setReport(recorded.incident);
                rehearsalFrames.current = recorded.frames;
                playFrames(recorded.frames, 0, snapshot.run.speed);
              }}
            >
              Replay completed recorded run
            </button>
          )}
        </div>
      )}
      {screen === 'judge' && (
        <JudgeMode
          snapshot={snapshot}
          busy={busy}
          explained={explained}
          onControl={(action, speed) => void onControl(action, speed)}
          onCommand={(scenarioId) => void submitCommand(scenarioId)}
          onExplain={() => setExplained((value) => !value)}
        />
      )}
      {screen === 'operations' && <LiveOperations snapshot={snapshot} />}
      {screen === 'evidence' && <EvidenceTrace snapshot={snapshot} />}
      {screen === 'incident' && (
        <IncidentReportView
          snapshot={snapshot}
          report={snapshot.incidentAvailable ? report : null}
        />
      )}
      {screen === 'architecture' && (
        <ArchitectureView snapshot={snapshot} onDegraded={() => void runDegraded()} />
      )}
      <div className="sr-status" role="status" aria-live="polite">
        {snapshot.currentEvent?.payload.headline as string}
      </div>
    </div>
  );
}

function SystemState({
  title,
  detail,
  loading = false,
}: {
  title: string;
  detail: string;
  loading?: boolean;
}) {
  return (
    <main className="system-state">
      <Brand />
      <div className={loading ? 'system-spinner' : 'system-stop'} aria-hidden="true" />
      <h1>{title}</h1>
      <p>{detail}</p>
    </main>
  );
}

function screenFromHash(): Screen {
  const hash = window.location.hash.slice(1) as Screen;
  return ['judge', 'operations', 'evidence', 'incident', 'architecture'].includes(hash)
    ? hash
    : 'judge';
}

function navLabel(screen: Screen) {
  return {
    judge: 'Demo',
    operations: 'Live Operations',
    evidence: 'Evidence Trace',
    incident: 'Incident',
    architecture: 'Architecture',
  }[screen];
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.matches('button, a, input, select, textarea') || target.isContentEditable)
  );
}

function playbackFrame(snapshot: RunSnapshot, playing: boolean, speed: number): RunSnapshot {
  const terminal = ['COMPLETE', 'FAILED_SAFE'].includes(snapshot.run.playbackStatus);
  return {
    ...snapshot,
    run: {
      ...snapshot.run,
      speed,
      playbackStatus: playing ? 'PLAYING' : terminal ? snapshot.run.playbackStatus : 'PAUSED',
      twin: { ...snapshot.run.twin, simulationPaused: !playing },
    },
    presentationTwin: { ...snapshot.presentationTwin, simulationPaused: !playing },
  };
}
