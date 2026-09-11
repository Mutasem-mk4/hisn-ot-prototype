import { useEffect, useState } from 'react';
import type { EvidenceCall } from '../../shared/contracts.js';
import {
  compareConnectedEvidence,
  getConnectedPreflight,
  investigateConnectedContext,
  type ConnectedEvidenceComparison,
  type ConnectedInvestigation,
  type ConnectedPreflight,
} from '../api.js';
import { StatusMark } from './StatusMark.js';

export function ConnectedProof() {
  const [preflight, setPreflight] = useState<ConnectedPreflight | null>(null);
  const [comparison, setComparison] = useState<ConnectedEvidenceComparison | null>(null);
  const [investigation, setInvestigation] = useState<ConnectedInvestigation | null>(null);
  const [busy, setBusy] = useState<'evidence' | 'agent' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preflightUnavailable, setPreflightUnavailable] = useState(false);

  useEffect(() => {
    void getConnectedPreflight()
      .then(setPreflight)
      .catch(() => setPreflightUnavailable(true));
  }, []);

  const compareEvidence = async () => {
    setBusy('evidence');
    setError(null);
    try {
      setComparison(await compareConnectedEvidence());
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(null);
    }
  };

  const runAgent = async () => {
    setBusy('agent');
    setError(null);
    try {
      setInvestigation(await investigateConnectedContext());
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(null);
    }
  };

  return (
    <details className="connected-proof">
      <summary>
        <span>Verify real API calls</span>
        <span>Five Nokia calls per context, no local substitutes</span>
      </summary>
      <div className="connected-proof__body">
        <div className="connected-proof__intro">
          <div>
            <span className="eyebrow">Strict connected check</span>
            <h2>Inspect real Nokia evidence and its sandbox boundary.</h2>
            <p>
              These checks call the configured providers now. Local fallback results cannot count as
              connected proof. No command or containment action executes.
            </p>
          </div>
          <ConnectedReadiness preflight={preflight} unavailable={preflightUnavailable} />
        </div>
        <div className="connected-proof__actions">
          <button
            onClick={() => void compareEvidence()}
            disabled={busy !== null || !preflight?.nokiaConfigured}
          >
            {busy === 'evidence' ? 'Calling Nokia sandbox…' : 'Compare Nokia responses'}
          </button>
          <button
            onClick={() => void runAgent()}
            disabled={busy !== null || !preflight?.groqConfigured}
          >
            {busy === 'agent' ? 'Running LangGraph agent…' : 'Run Groq investigation'}
          </button>
        </div>
        {error && (
          <p className="connected-proof__error" role="alert">
            {error}
          </p>
        )}
        {comparison && <EvidenceComparison comparison={comparison} />}
        {investigation && <InvestigationResult investigation={investigation} />}
      </div>
    </details>
  );
}

function ConnectedReadiness({
  preflight,
  unavailable,
}: {
  preflight: ConnectedPreflight | null;
  unavailable: boolean;
}) {
  if (unavailable)
    return <span className="connected-proof__readiness">Configuration unavailable</span>;
  if (!preflight)
    return <span className="connected-proof__readiness">Checking configuration…</span>;
  return (
    <div className="connected-proof__readiness" aria-label="Connected provider readiness">
      <StatusMark status={preflight.nokiaConfigured ? 'NOKIA_SANDBOX' : 'UNAVAILABLE'}>
        Nokia {preflight.nokiaConfigured ? 'configured' : 'unavailable'}
      </StatusMark>
      <StatusMark status={preflight.groqConfigured ? 'LANGGRAPH' : 'UNAVAILABLE'}>
        Groq {preflight.groqConfigured ? 'configured' : 'unavailable'}
      </StatusMark>
      <small>
        Number Verification:{' '}
        {preflight.subscriberAuthorizationMode === 'SIMULATOR_FAST_OAUTH'
          ? 'simulator OAuth only, not subscriber consent'
          : preflight.subscriberAuthorizationConfigured
            ? 'subscriber OAuth configured'
            : 'OAuth required'}
      </small>
    </div>
  );
}

function EvidenceComparison({ comparison }: { comparison: ConnectedEvidenceComparison }) {
  return (
    <section className="connected-comparison" aria-labelledby="connected-comparison-heading">
      <div className="connected-comparison__heading">
        <div>
          <span className="eyebrow">Live Nokia result</span>
          <h3 id="connected-comparison-heading">Same request, different network evidence</h3>
        </div>
        <b>{comparison.command.requestedSetpointPercent}% requested in both</b>
      </div>
      <div className="connected-comparison__contexts">
        {comparison.executions.map((execution) => (
          <div key={execution.context}>
            <h4>Context {execution.context}</h4>
            <p>{compromiseSummary(execution.assessment.compromised.length)}</p>
            <dl>
              {execution.evidence.map((call) => (
                <div key={call.tool}>
                  <dt>{evidenceLabel(call.tool)}</dt>
                  <dd>{evidenceValue(call)}</dd>
                  <small>{call.provenance}</small>
                </div>
              ))}
            </dl>
            <code className="connected-proof__correlation">
              Correlation {execution.correlationId}
            </code>
          </div>
        ))}
      </div>
      <p className="connected-proof__note">
        Nokia's published free fixtures split assurance across identities: Context A has clean SIM,
        device and location signals but its number does not verify; Context B verifies the number
        but returns three compromise signals. A fully trusted connected ALLOW therefore cannot be
        claimed without live subscriber onboarding. The product does not mix identities or weaken
        policy to manufacture one.
      </p>
      <p className="connected-proof__note">
        Fixed provider probe. SANDBOX marks an external Nokia response; UNAVAILABLE does not count
        as provider proof. This does not prove agent-selected tool order.
      </p>
    </section>
  );
}

function InvestigationResult({ investigation }: { investigation: ConnectedInvestigation }) {
  const quota = stringField(investigation.failure, 'quotaType');
  return (
    <section className="connected-investigation" aria-labelledby="connected-agent-heading">
      <span className="eyebrow">Live Groq and Nokia result</span>
      <h3 id="connected-agent-heading">
        {investigation.failure ? 'Agent request held safely' : 'Agent investigation completed'}
      </h3>
      {investigation.failure ? (
        <p>
          Groq returned{' '}
          {stringField(investigation.failure, 'failureReason') ?? 'an unavailable response'}
          {quota ? ` (${humanize(quota)})` : ''}.{' '}
          {investigation.acceptedPressurePercent === null
            ? 'No command executed.'
            : `The 52% command stayed at ${investigation.acceptedPressurePercent}%.`}
        </p>
      ) : (
        <p>
          Groq advised {investigation.recommendation?.recommendedDecision ?? 'no decision'}; policy
          issued {investigation.decision?.state ?? 'no decision'}. The plant stayed at{' '}
          {investigation.acceptedPressurePercent}%.
        </p>
      )}
      <dl>
        <div>
          <dt>Agent actions</dt>
          <dd>
            {investigation.trace?.filter((step) => step.phase === 'TOOL_REQUEST').length ?? 0}
          </dd>
        </div>
        <div>
          <dt>Nokia results</dt>
          <dd>{investigation.evidence.filter((call) => call.provenance === 'SANDBOX').length}</dd>
        </div>
        <div>
          <dt>Required proof</dt>
          <dd>{investigation.requiredEvidenceComplete ? 'Complete' : 'Incomplete'}</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd>{(investigation.durationMs / 1000).toFixed(1)}s</dd>
        </div>
      </dl>
      <code className="connected-proof__correlation">
        Correlation {investigation.correlationId}
      </code>
    </section>
  );
}

function evidenceLabel(tool: EvidenceCall['tool']) {
  return {
    NUMBER_VERIFICATION: 'Number',
    SIM_SWAP: 'SIM swap',
    DEVICE_SWAP: 'Device swap',
    LOCATION_VERIFICATION: 'Location',
    DEVICE_REACHABILITY: 'Reachability',
  }[tool];
}

function compromiseSummary(count: number) {
  if (count === 0) return 'No compromise signal returned';
  return `${count} compromise signal${count === 1 ? '' : 's'} returned`;
}

function evidenceValue(call: EvidenceCall) {
  const value = call.redactedResult;
  if (call.requestStatus !== 'SUCCEEDED') {
    const failureCode = stringField(value, 'failureCode');
    if (failureCode === 'SUBSCRIBER_AUTHORIZATION_REQUIRED') return 'OAuth required';
    return failureCode ? humanize(failureCode) : 'Unavailable';
  }
  if (call.tool === 'NUMBER_VERIFICATION') {
    const result = value.verified === true ? 'Verified' : 'Not verified';
    return value.authorizationFlow === 'SIMULATOR_FAST_OAUTH'
      ? `${result} · simulator OAuth`
      : result;
  }
  if (call.tool === 'SIM_SWAP' || call.tool === 'DEVICE_SWAP')
    return value.swapped === true ? 'Recent change' : 'No recent change';
  if (call.tool === 'LOCATION_VERIFICATION')
    return value.verificationResult === 'TRUE' ? 'Inside approved area' : 'Outside approved area';
  return value.reachable === true
    ? `Reachable · ${Array.isArray(value.connectivity) ? value.connectivity.join(', ') : 'network'}`
    : 'Not reachable';
}

function stringField(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return typeof value === 'string' ? value : null;
}

function message(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Connected verification could not complete';
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}
