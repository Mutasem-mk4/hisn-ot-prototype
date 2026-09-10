import type { RunSnapshot } from '../../application/ports.js';
import { StatusMark } from '../components/StatusMark.js';
import { ScreenIntro } from './LiveOperations.js';

export function EvidenceTrace({ snapshot }: { snapshot: RunSnapshot }) {
  const evidence = snapshot.artifacts.evidence ?? [];
  const plan = snapshot.artifacts.plan;
  const recommendation = snapshot.artifacts.recommendation;
  const agentTrace = snapshot.artifacts.agentTrace ?? [];
  return (
    <main className="content-screen" id="main-content">
      <ScreenIntro
        kicker="Evidence & Agent Trace"
        title="Bounded intelligence. Inspectable proof."
        text="The agent selects an allowlisted evidence plan; typed provider results and deterministic policy produce the authoritative decision."
      />
      <section className="trace-plan">
        <div>
          <span className="eyebrow">Runtime plan</span>
          <h2>{plan?.risk ?? 'Pending'} command</h2>
          <p>{plan?.consequence ?? 'Advance Judge Mode to generate the plan.'}</p>
        </div>
        <div className="tool-count">
          <b>{plan?.selectedTools.length ?? 0}</b>
          <span>of 5 allowed tools selected</span>
        </div>
        <StatusMark status={plan?.reasoningProvenance ?? 'PENDING'} />
      </section>
      {plan && (
        <section className="selection-rationale" aria-labelledby="selection-rationale-heading">
          <div>
            <span className="eyebrow">Agent tool selection</span>
            <h2 id="selection-rationale-heading">Why these network signals?</h2>
          </div>
          <ol>
            {plan.selectedTools.map((tool) => (
              <li key={tool}>
                <b>{humanize(tool)}</b>
                <span>{plan.selectionReasons[tool]}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {agentTrace.length > 0 && (
        <section className="agent-run" aria-labelledby="agent-run-heading">
          <div className="agent-run__heading">
            <div>
              <span className="eyebrow">LangGraph execution</span>
              <h2 id="agent-run-heading">Goal → tool → observation → adaptation</h2>
            </div>
            <StatusMark status={snapshot.integration.agentReasoner} />
          </div>
          <ol>
            {agentTrace.map((step) => (
              <li key={step.sequence} data-phase={step.phase}>
                <span>{String(step.sequence).padStart(2, '0')}</span>
                <div>
                  <small>{step.phase.replaceAll('_', ' ')}</small>
                  <b>{step.headline}</b>
                  <p>{step.detail}</p>
                </div>
                {step.status && <StatusMark status={step.status} />}
              </li>
            ))}
          </ol>
        </section>
      )}
      {evidence.length === 0 ? (
        <section className="empty-state">
          <span>00</span>
          <h2>No evidence collected yet</h2>
          <p>The command remains held. Advance the backend workflow to begin network proof.</p>
        </section>
      ) : (
        <div
          className="evidence-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Scrollable telecom evidence"
        >
          <table className="evidence-table">
            <caption>Pre-decision telecom evidence calls</caption>
            <thead>
              <tr>
                <th>Tool / purpose</th>
                <th>Redacted result</th>
                <th>Provenance</th>
                <th>Latency</th>
                <th>Correlation</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((call) => (
                <tr key={call.id}>
                  <td>
                    <b>{humanize(call.tool)}</b>
                    <small>{call.purpose}</small>
                  </td>
                  <td>
                    <code>{compactResult(call.redactedResult)}</code>
                    <StatusMark status={call.requestStatus} />
                  </td>
                  <td>
                    <StatusMark status={call.provenance} />
                  </td>
                  <td>
                    {call.latencyMs} ms
                    <small>{new Date(call.timestamp).toLocaleTimeString()}</small>
                  </td>
                  <td>
                    <code>{call.correlationId.slice(-12)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {recommendation && (
        <section className="decision-explanation" data-state={recommendation.recommendedDecision}>
          <span className="eyebrow">Evidence-based agent recommendation</span>
          <h2>{recommendation.recommendedDecision}</h2>
          <p>{recommendation.summary}</p>
          <ul>
            {recommendation.observedSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
          {snapshot.incidentAvailable && <a href="#incident">Open the sealed incident report →</a>}
        </section>
      )}
    </main>
  );
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}
function compactResult(value: Record<string, unknown>) {
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(',') : String(item)}`)
    .join(' · ');
}
