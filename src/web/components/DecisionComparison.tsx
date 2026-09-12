import type { RunSnapshot } from '../../application/ports.js';
import { statusLabel } from '../status-label.js';
import { StatusMark } from './StatusMark.js';

export type DecisionComparisonRuns = {
  compromised: RunSnapshot | null;
  trusted: RunSnapshot | null;
};

export function DecisionComparison({ runs }: { runs: DecisionComparisonRuns }) {
  if (!runs.compromised && !runs.trusted) return null;

  return (
    <section className="decision-comparison" aria-labelledby="decision-comparison-heading">
      <header>
        <div>
          <span className="eyebrow">Direct comparison</span>
          <h2 id="decision-comparison-heading">Same 52% command, different authorization</h2>
        </div>
        <p>Each result keeps its evidence source, execution time, and correlation ID.</p>
      </header>
      <div className="decision-comparison__runs">
        <ComparisonRun
          label="Compromised context"
          snapshot={runs.compromised}
          empty="Run the compromised request to record its result."
        />
        <ComparisonRun
          label="Trusted context"
          snapshot={runs.trusted}
          empty="Run the trusted comparison to record its result."
        />
      </div>
    </section>
  );
}

function ComparisonRun({
  label,
  snapshot,
  empty,
}: {
  label: string;
  snapshot: RunSnapshot | null;
  empty: string;
}) {
  if (!snapshot) {
    return (
      <article className="decision-comparison__run" data-state="pending">
        <header>
          <b>{label}</b>
          <StatusMark status="PENDING">Not run</StatusMark>
        </header>
        <p>{empty}</p>
      </article>
    );
  }

  const decision = snapshot.artifacts.decision?.state ?? 'PENDING';
  const requested = snapshot.run.command.requestedSetpointPercent;
  const accepted = snapshot.presentationTwin.acceptedPressurePercent;
  const evidence = snapshot.artifacts.evidence ?? [];
  const writes = snapshot.run.twin.commandHistory.filter(
    (command) =>
      command.kind === 'SET_PRESSURE' &&
      command.outcome === 'EXECUTED' &&
      command.correlationId === snapshot.run.correlationId,
  ).length;

  return (
    <article className="decision-comparison__run" data-state={decision}>
      <header>
        <b>{label}</b>
        <StatusMark status={decision} />
      </header>
      <dl>
        <div>
          <dt>Requested</dt>
          <dd>{requested === null ? 'Read only' : `${requested.toFixed(0)}%`}</dd>
        </div>
        <div>
          <dt>Accepted plant setting</dt>
          <dd>
            {accepted === null ? 'No accepted setting' : `${accepted.toFixed(0)}%`}{' '}
            <small>{writes > 0 ? 'updated' : 'unchanged'}</small>
          </dd>
        </div>
        <div>
          <dt>Network evidence</dt>
          <dd>
            {`${evidence.length} ${pluralize('call', evidence.length)}`}{' '}
            <small>· {statusLabel(snapshot.integration.evidenceSource)}</small>
          </dd>
        </div>
        <div>
          <dt>Execution time</dt>
          <dd>{formatDuration(snapshot.run.createdAt, snapshot.run.updatedAt)}</dd>
        </div>
      </dl>
      <footer>
        <span>{reasoningProvenanceLabel(snapshot)}</span>
        <code>{snapshot.run.correlationId}</code>
        <time dateTime={snapshot.run.updatedAt}>{formatTimestamp(snapshot.run.updatedAt)}</time>
      </footer>
    </article>
  );
}

function reasoningProvenanceLabel(snapshot: RunSnapshot) {
  const provenance = snapshot.artifacts.recommendation?.reasoningProvenance;
  if (provenance === 'LIVE') return 'Live LangGraph recommendation';
  if (provenance === 'SIMULATED') return 'Local deterministic recommendation';
  if (provenance === 'FALLBACK') return 'Labeled fallback recommendation';
  return 'No AI recommendation recorded';
}

function formatDuration(start: string, end: string) {
  const durationMs = Math.max(0, Date.parse(end) - Date.parse(start));
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

function pluralize(noun: string, count: number) {
  return count === 1 ? noun : `${noun}s`;
}
