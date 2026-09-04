import { useCallback, useEffect, useState } from 'react';
import type { IncidentReport, RunSnapshot } from '../application/ports.js';
import { Brand } from './components/Brand.js';
import { StatusMark } from './components/StatusMark.js';
import {
  controlJudgeRun,
  createJudgeRun,
  getIncident,
  getJudgeRun,
  initializeSession,
  subscribeToRun,
} from './api.js';
import { ArchitectureView } from './screens/ArchitectureView.js';
import { EvidenceTrace } from './screens/EvidenceTrace.js';
import { IncidentReportView } from './screens/IncidentReportView.js';
import { JudgeMode } from './screens/JudgeMode.js';
import { LiveOperations } from './screens/LiveOperations.js';

type Screen = 'judge' | 'operations' | 'evidence' | 'incident' | 'architecture';
type ControlAction = 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'RESET';

export function App() {
  const [screen, setScreen] = useState<Screen>(() => screenFromHash());
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [explained, setExplained] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    void initializeSession()
      .then(getJudgeRun)
      .then((initial) => {
        setSnapshot(initial);
        unsubscribe = subscribeToRun(setSnapshot, setError);
      })
      .catch((reason: Error) => setError(reason.message));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!snapshot?.incidentAvailable) return;
    void getIncident(snapshot.run.id)
      .then(setReport)
      .catch((reason: Error) => setError(reason.message));
  }, [snapshot?.incidentAvailable, snapshot?.run.id]);

  useEffect(() => {
    const onHash = () => setScreen(screenFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onControl = useCallback(async (action: ControlAction, speed?: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await controlJudgeRun(action, speed);
      setSnapshot(next);
      if (action === 'RESET') setReport(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Control request failed');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!snapshot || isInteractiveTarget(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void onControl(snapshot.run.playbackStatus === 'PLAYING' ? 'PAUSE' : 'PLAY');
      }
      if (event.key === 'ArrowRight') void onControl('NEXT');
      if (event.key === 'ArrowLeft') void onControl('PREVIOUS');
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [snapshot, onControl]);

  const runDegraded = async () => {
    setBusy(true);
    try {
      setSnapshot(await createJudgeRun('judge-degraded-provider'));
      setReport(null);
      window.location.hash = 'judge';
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start scenario');
    } finally {
      setBusy(false);
    }
  };

  if (error && !snapshot) return <SystemState title="HISN-OT failed safe" detail={error} />;
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
          {(['judge', 'operations', 'evidence', 'incident', 'architecture'] as Screen[]).map(
            (item) => (
              <a key={item} href={`#${item}`} aria-current={screen === item ? 'page' : undefined}>
                {navLabel(item)}
              </a>
            ),
          )}
        </nav>
        <div className="mode-indicator">
          <StatusMark status={snapshot.run.runtimeMode} />
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
        <JudgeMode
          snapshot={snapshot}
          busy={busy}
          explained={explained}
          onControl={(action, speed) => void onControl(action, speed)}
          onExplain={() => setExplained((value) => !value)}
        />
      )}
      {screen === 'operations' && <LiveOperations snapshot={snapshot} />}
      {screen === 'evidence' && <EvidenceTrace snapshot={snapshot} />}
      {screen === 'incident' && <IncidentReportView snapshot={snapshot} report={report} />}
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
    judge: 'Judge Mode',
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
