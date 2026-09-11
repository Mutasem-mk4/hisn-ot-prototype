import type { IncidentReport, RunSnapshot } from '../../application/ports.js';
import { useEffect, useRef } from 'react';
import { StatusMark } from '../components/StatusMark.js';
import { statusLabel } from '../status-label.js';
import { ScreenIntro } from './LiveOperations.js';

export function IncidentReportView({
  snapshot,
  report,
}: {
  snapshot: RunSnapshot;
  report: IncidentReport | null;
}) {
  const downloadLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!report) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    if (downloadLink.current) downloadLink.current.href = url;
    return () => URL.revokeObjectURL(url);
  }, [report]);
  if (!report) {
    return (
      <main className="content-screen" id="main-content">
        <ScreenIntro
          kicker="Incident Report"
          title="The record forms as the proof executes."
          text="Advance Judge Mode through the authoritative decision and continuity phases to seal the incident."
        />
        <section className="empty-state">
          <span>∅</span>
          <h2>Report not yet sealed</h2>
          <p>Current state: {snapshot.run.workflowState?.replaceAll('_', ' ') ?? 'baseline'}.</p>
        </section>
      </main>
    );
  }
  const decision = report.authoritativeDecision;
  const continuity = report.continuityMeasurements;
  return (
    <main className="content-screen report-screen" id="main-content">
      <ScreenIntro
        kicker={`Incident ${report.correlationId.slice(-12)}`}
        title="Network-context safety incident"
        text="An evidence-bound record returned with this run. Download it to preserve a copy."
      />
      <div className="report-actions no-print">
        <button onClick={() => window.print()}>Print report</button>
        <a ref={downloadLink} href="#" download={`hisn-oil-incident-${report.correlationId}.json`}>
          Export JSON
        </a>
      </div>
      <article className="incident-document">
        <header className="incident-masthead">
          <div>
            <span>HISN—Oil / INCIDENT</span>
            <h2>{decision.state}</h2>
          </div>
          <StatusMark status={report.runtimeMode}>{report.runtimeMode} evidence mode</StatusMark>
        </header>
        <dl className="report-facts">
          <div>
            <dt>Correlation</dt>
            <dd>{report.correlationId}</dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>{new Date(report.generatedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Command</dt>
            <dd>{decision.requestedAction}</dd>
          </div>
          <div>
            <dt>Authority</dt>
            <dd>{decision.authoritativeSource.replaceAll('_', ' ')}</dd>
          </div>
        </dl>
        <section>
          <span className="eyebrow">Executive finding</span>
          <h3>
            {decision.state}: {decision.requestedAction}.
          </h3>
          <p>{decision.containmentRationale}</p>
        </section>
        <section>
          <h3>Agent action trace</h3>
          <ol className="agent-report-trace">
            {report.agentTrace.map((step) => (
              <li key={step.sequence}>
                <span>{String(step.sequence).padStart(2, '0')}</span>
                <div>
                  <small>{humanize(step.phase)}</small>
                  <b>{step.headline}</b>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className="report-columns">
          <section>
            <h3>Network proof</h3>
            <ul>
              {decision.evidenceSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Failed controls</h3>
            <ul>
              {[...decision.failedPolicies, ...decision.failedLimits].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
        <section>
          <h3>Continuity evidence</h3>
          <div className="continuity-strip">
            {Object.entries(continuity).map(([key, value]) => (
              <div key={key}>
                <span>{humanize(key)}</span>
                <b>{String(value)}</b>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3>Enforcement record</h3>
          <ol className="report-timeline">
            {report.networkEnforcement.map((call) => (
              <li key={call.id}>
                <time>{new Date(call.timestamp).toLocaleTimeString()}</time>
                <b>{humanize(call.action)}</b>
                <StatusMark status={call.status} />
                <small>
                  {statusLabel(call.provenance)} · {call.latencyMs} ms
                </small>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3>Recovery requirements</h3>
          <ol>
            {report.recoveryRequirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
        <footer>
          Audit chain: {report.timeline.length} persisted events · final hash{' '}
          {report.timeline.at(-1)?.integrityHash}
        </footer>
      </article>
    </main>
  );
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .toLowerCase();
}
