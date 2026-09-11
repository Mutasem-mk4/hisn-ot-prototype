import type { RunSnapshot } from '../../application/ports.js';
import { AgentWorkflowPanel } from '../components/AgentWorkflowPanel.js';
import { ControlRail } from '../components/ControlRail.js';
import { FacilitySchematic } from '../components/FacilitySchematic.js';
import { JudgeProofFlow } from '../components/JudgeProofFlow.js';
import { ProcessTwin } from '../components/ProcessTwin.js';
import { StatusMark } from '../components/StatusMark.js';
import { ConnectedProof } from '../components/ConnectedProof.js';

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
  const displayedAgentStatus = agentStatus(snapshot);
  const agentProof = agentProofCopy(displayedAgentStatus);
  const networkProof = networkProofCopy(snapshot.integration.evidenceSource);
  const progress = ['COMPLETE', 'FAILED_SAFE'].includes(snapshot.run.playbackStatus)
    ? 100
    : Math.round((snapshot.run.presentationCursor / 13) * 100);
  return (
    <main className="judge-screen" id="main-content">
      <section className="judge-intro">
        <div>
          <span className="eyebrow">HISN-OT / Industrial safety</span>
          <h1>Stop dangerous industrial commands before they reach the plant.</h1>
          <p>{agentIntroduction(displayedAgentStatus)}</p>
        </div>
      </section>
      <section className="external-proof" aria-label="Implementation and provider provenance">
        <div>
          <span>Nokia network evidence</span>
          <StatusMark status={snapshot.integration.evidenceSource}>{networkProof.badge}</StatusMark>
          <small>{networkProof.shortDetail}</small>
        </div>
        <div>
          <span>AI orchestration</span>
          <StatusMark status={displayedAgentStatus} />
          <small>{agentProof.short}</small>
        </div>
        <div>
          <span>Plant</span>
          <StatusMark status="SIMULATED">IMPLEMENTED LOCALLY</StatusMark>
          <small>Stateful digital twin</small>
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
      <section className="judge-result" aria-labelledby="judge-result-heading">
        <div className="event-banner" data-state={decision?.state ?? snapshot.run.playbackStatus}>
          <div className="event-sequence">{String(event?.sequence ?? 0).padStart(2, '0')}</div>
          <div>
            <span className="eyebrow">{plainStage(event?.workflowState ?? null)}</span>
            <h2 id="judge-result-heading">
              {resultHeadline(snapshot, (event?.payload.headline as string) ?? undefined)}
            </h2>
            <p>{resultDetail(snapshot, (event?.payload.detail as string) ?? undefined)}</p>
          </div>
          <StatusMark status={decision?.state ?? snapshot.run.playbackStatus} />
        </div>
        <OutcomeFacts snapshot={snapshot} />
      </section>
      <details className="investigation-details">
        <summary>
          <span>How was this decision made?</span>
          <span>Inspect AI reasoning and network evidence</span>
        </summary>
        <JudgeProofFlow snapshot={snapshot} />
        <AgentWorkflowPanel snapshot={snapshot} />
      </details>
      <details className="technical-expansion">
        <summary>
          <span>
            <small>Interactive digital twin</small>
            Explore the facility and live process telemetry
          </span>
          <b>Open technical view</b>
        </summary>
        <FacilitySchematic snapshot={snapshot} />
        <div className="judge-support">
          <ProcessTwin
            twin={snapshot.presentationTwin}
            safePressureBand={snapshot.safePressureBand}
          />
          <section className="proof-compact" aria-labelledby="adaptive-heading">
            <span className="eyebrow">Evidence scales with consequence</span>
            <h2 id="adaptive-heading">One check for observation. Five for physical control.</h2>
            <div className="plan-compare">
              <div>
                <span>Read-only inspection</span>
                <b>{snapshot.lowRiskComparison.selectedTools.length}</b>
                <small>LOW RISK · POLICY MINIMUM</small>
              </div>
              <i aria-hidden="true" />
              <div>
                <span>Pressure control</span>
                <b>{snapshot.artifacts.plan?.selectedTools.length ?? 'Pending'}</b>
                <small>
                  {snapshot.artifacts.plan?.risk ?? 'PENDING'} ·{' '}
                  {snapshot.artifacts.plan?.reasoningProvenance ?? 'PENDING'}
                </small>
              </div>
            </div>
          </section>
        </div>
        <nav className="technical-links" aria-label="Additional technical views">
          <a href="#operations">Open live process telemetry</a>
          <a href="#incident">Open incident report</a>
        </nav>
      </details>
      <ConnectedProof />
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

function OutcomeFacts({ snapshot }: { snapshot: RunSnapshot }) {
  const twin = snapshot.presentationTwin;
  const requested = twin.requestedPressurePercent ?? snapshot.run.command.requestedSetpointPercent;
  const accepted = twin.acceptedPressurePercent;
  const outcome = twin.commandHistory.at(-1)?.outcome ?? 'HELD';
  const evidenceCount = snapshot.artifacts.evidence?.length ?? 0;
  const safety = snapshot.artifacts.safety;
  return (
    <dl className="outcome-facts" aria-label="Physical safety outcome">
      <div>
        <dt>Requested</dt>
        <dd>{requested === null ? 'Read only' : `${requested.toFixed(0)}%`}</dd>
      </div>
      <div>
        <dt>Hard limit</dt>
        <dd>{hardLimitText(snapshot, safety)}</dd>
      </div>
      <div>
        <dt>Network evidence</dt>
        <dd>{evidenceCount === 0 ? 'Pending' : `${evidenceCount} recorded`}</dd>
      </div>
      <div>
        <dt>Plant state</dt>
        <dd>{plantStateText(snapshot, outcome, accepted)}</dd>
      </div>
    </dl>
  );
}

function hardLimitText(snapshot: RunSnapshot, safety: RunSnapshot['artifacts']['safety']) {
  if (snapshot.run.command.kind === 'READ_STATUS') return 'Not applicable';
  if (!safety) return 'Pending';
  const relation = safety.permitted ? '≤' : '>';
  return `${safety.permitted ? 'Passed' : 'Failed'} · ${relation}${safety.configuredMaximumPercent}%`;
}

function plantStateText(
  snapshot: RunSnapshot,
  outcome: RunSnapshot['presentationTwin']['commandHistory'][number]['outcome'] | 'HELD',
  accepted: number | null,
) {
  if (snapshot.run.command.kind === 'READ_STATUS') return 'No change';
  const pressure = accepted?.toFixed(0) ?? 'Previous';
  if (outcome === 'BLOCKED') return `${pressure}% unchanged`;
  if (outcome === 'HELD') return `${pressure}% current`;
  return accepted === null ? humanize(outcome) : `${pressure}% accepted`;
}

function resultHeadline(snapshot: RunSnapshot, fallback?: string) {
  const decision = snapshot.artifacts.decision?.state;
  if (decision === 'BLOCK_AND_CONTAIN' && snapshot.artifacts.safety?.permitted)
    return 'Network compromise blocked the command. Plant unchanged.';
  if (decision === 'BLOCK_AND_CONTAIN') return 'Unsafe command blocked. Plant setting unchanged.';
  if (decision === 'BLOCK') return 'Command blocked before physical execution.';
  if (decision === 'ALLOW' && snapshot.run.command.kind === 'READ_STATUS')
    return 'Read-only inspection authorized.';
  if (decision === 'ALLOW') return 'Safe command authorized.';
  if (snapshot.run.playbackStatus === 'FAILED_SAFE') return 'AI unavailable. Command held safely.';
  return fallback ?? 'Ready to prove the safety decision.';
}

function resultDetail(snapshot: RunSnapshot, fallback?: string) {
  const decision = snapshot.artifacts.decision?.state;
  const accepted = snapshot.presentationTwin.acceptedPressurePercent;
  const requested = snapshot.run.command.requestedSetpointPercent;
  const hardMaximum = snapshot.artifacts.safety?.configuredMaximumPercent;
  if (decision === 'BLOCK_AND_CONTAIN' || decision === 'BLOCK') {
    if (snapshot.artifacts.safety?.permitted) {
      return `The ${requested}% request passed the ${hardMaximum}% hard limit. Deterministic authorization rejected the network evidence; the plant remains at ${accepted?.toFixed(0) ?? 'its previous'}%.`;
    }
    return `The ${requested}% request never became accepted control state. The plant remains at ${accepted?.toFixed(0) ?? 'its previous'}%.`;
  }
  if (decision === 'ALLOW' && snapshot.run.command.kind === 'SET_PRESSURE') {
    return `Network evidence and policy agreed. The digital twin accepted ${accepted?.toFixed(0) ?? 'the requested'}%.`;
  }
  if (snapshot.run.playbackStatus === 'FAILED_SAFE') {
    return 'No AI recommendation was substituted. The safety boundary prevented actuation.';
  }
  return fallback ?? 'Run the attack demonstration to see each proof step.';
}

function plainStage(state: string | null) {
  const labels: Record<string, string> = {
    COMMAND_RECEIVED: '1 · Command received',
    COMMAND_HELD: '1 · Command held',
    RISK_CLASSIFIED: '2 · Risk understood',
    EVIDENCE_PLANNED: '2 · Network checks selected',
    EVIDENCE_COLLECTING: '2 · Nokia evidence collecting',
    EVIDENCE_COMPLETE: '2 · Nokia evidence received',
    SAFETY_EVALUATED: '3 · Safety limits evaluated',
    DECISION_ISSUED: '3 · Decision issued',
    ENFORCEMENT_STARTED: '4 · Containment started',
    ENDPOINT_CONTAINED: '4 · Command path contained',
    CONTINUITY_PROTECTED: '4 · Safe operation protected',
    INCIDENT_REPORTED: 'Proof complete',
    FAILED_SAFE: 'Command held',
  };
  return state ? (labels[state] ?? humanize(state)) : 'Ready';
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function agentStatus(snapshot: RunSnapshot): RunSnapshot['integration']['agentReasoner'] {
  const agentFailed =
    snapshot.run.playbackStatus === 'FAILED_SAFE' &&
    snapshot.currentEvent?.payload.errorCode === 'AGENT_UNAVAILABLE';
  const hasAgentOutput =
    snapshot.artifacts.plan?.reasoningProvenance === 'LIVE' ||
    snapshot.artifacts.recommendation?.reasoningProvenance === 'LIVE';
  if (agentFailed && !hasAgentOutput) return 'UNAVAILABLE';
  return snapshot.integration.agentReasoner;
}

function agentProofCopy(reasoner: RunSnapshot['integration']['agentReasoner']) {
  if (reasoner === 'LANGGRAPH')
    return { short: 'Hosted tool-calling agent', full: 'Hosted model tool loop' };
  if (reasoner === 'DETERMINISTIC')
    return { short: 'Local deterministic demo', full: 'Explicit local DEMO reasoner' };
  return { short: 'Commands fail closed', full: 'No AI recommendation' };
}

function agentIntroduction(reasoner: RunSnapshot['integration']['agentReasoner']) {
  if (reasoner === 'LANGGRAPH') {
    return 'Valid credentials can hide a compromised device. A live LangGraph tool loop gathers Nokia/CAMARA network evidence before deterministic policy can authorize a plant change.';
  }
  if (reasoner === 'DETERMINISTIC') {
    return 'Valid credentials can hide a compromised device. This reproducible local replay uses the same bounded evidence policy without claiming a live AI run.';
  }
  return 'Valid credentials can hide a compromised device. With AI unavailable, HISN-OT keeps the command held and grants no physical authority.';
}

function networkProofCopy(source: RunSnapshot['integration']['evidenceSource']) {
  const copy = {
    SIMULATED: {
      headline: 'Deterministic evidence mode',
      badge: 'LOCAL EVIDENCE',
      detail: 'Deterministic CAMARA-shaped fixtures',
      shortDetail: 'CAMARA-shaped test fixtures',
    },
    NOKIA_SANDBOX: {
      headline: 'Nokia test network connected',
      badge: 'NOKIA SANDBOX API',
      detail: 'Authenticated Nokia transport, simulator identities',
      shortDetail: 'Authenticated simulator calls',
    },
    NOKIA_SANDBOX_WITH_FALLBACK: {
      headline: 'Mixed sandbox and local evidence',
      badge: 'SANDBOX + LOCAL FALLBACK',
      detail:
        'Failed Nokia calls can be replaced by labeled local fixtures; this is not strict connected verification',
      shortDetail: 'Sandbox calls with local substitutes',
    },
    NOKIA_LIVE: {
      headline: 'Nokia operator network configured',
      badge: 'NOKIA LIVE API',
      detail: 'Authenticated Nokia transport, configured identities',
      shortDetail: 'Authenticated operator calls',
    },
    UNAVAILABLE: {
      headline: 'Network evidence unavailable',
      badge: 'UNAVAILABLE',
      detail: 'No telecom result is treated as proof',
      shortDetail: 'No result treated as proof',
    },
  } satisfies Record<
    RunSnapshot['integration']['evidenceSource'],
    { headline: string; badge: string; detail: string; shortDetail: string }
  >;
  return copy[source];
}

function presenterCue(state: string | null, snapshot: RunSnapshot) {
  if (state && snapshot.currentEvent) return String(snapshot.currentEvent.payload.detail);
  return 'Begin with simulated operations and the separation between requested, accepted and observed pressure.';
}
