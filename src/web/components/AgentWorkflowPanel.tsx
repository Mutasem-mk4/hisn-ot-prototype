import type { RunSnapshot } from '../../application/ports.js';
import type { EvidenceCall, WorkflowState } from '../../shared/contracts.js';
import { StatusMark } from './StatusMark.js';

type StageState = 'complete' | 'current' | 'failed' | 'pending';

type WorkflowStage = {
  label: string;
  detail: string;
  completeAt: WorkflowState;
};

const workflowOrder: WorkflowState[] = [
  'COMMAND_RECEIVED',
  'COMMAND_HELD',
  'RISK_CLASSIFIED',
  'EVIDENCE_PLANNED',
  'EVIDENCE_COLLECTING',
  'EVIDENCE_COMPLETE',
  'SAFETY_EVALUATED',
  'DECISION_ISSUED',
  'ENFORCEMENT_STARTED',
  'ENDPOINT_CONTAINED',
  'CONTINUITY_PROTECTED',
  'INCIDENT_REPORTED',
  'FAILED_SAFE',
];

export function AgentWorkflowPanel({ snapshot }: { snapshot: RunSnapshot }) {
  const plan = snapshot.artifacts.plan;
  const evidence = snapshot.artifacts.evidence ?? [];
  const trace = snapshot.artifacts.agentTrace ?? [];
  const recommendation = snapshot.artifacts.recommendation;
  const decision = snapshot.artifacts.decision;
  const agentFailed =
    snapshot.run.playbackStatus === 'FAILED_SAFE' &&
    snapshot.currentEvent?.payload.errorCode === 'AGENT_UNAVAILABLE';
  const hasAgentOutput =
    plan?.reasoningProvenance === 'LIVE' || recommendation?.reasoningProvenance === 'LIVE';
  const agentUnavailable =
    snapshot.integration.agentReasoner === 'UNAVAILABLE' || (agentFailed && !hasAgentOutput);
  const failureReason = textPayload(snapshot.currentEvent?.payload.failureReason, 'UNAVAILABLE');
  const stages: WorkflowStage[] = [
    {
      label: 'Understand the command',
      detail: snapshot.artifacts.risk
        ? `${humanize(snapshot.artifacts.risk)} risk identified`
        : 'Read the command and its physical consequence',
      completeAt: 'RISK_CLASSIFIED',
    },
    {
      label: 'Choose trusted evidence',
      detail: plan
        ? `${plan.selectedTools.length} telecom ${pluralize('check', plan.selectedTools.length)} selected`
        : 'Select network checks from the safe allowlist',
      completeAt: 'EVIDENCE_PLANNED',
    },
    {
      label: 'Observe and recommend',
      detail: recommendation
        ? `${humanize(recommendation.recommendedDecision)} recommended from recorded evidence`
        : 'Review observations and explain the recommendation',
      completeAt: 'DECISION_ISSUED',
    },
  ];
  const stageStates = statesFor(
    stages,
    snapshot.currentEvent?.workflowState ?? null,
    agentUnavailable,
  );

  return (
    <section className="agent-workflow" aria-labelledby="agent-workflow-heading">
      <header className="agent-workflow__header">
        <div>
          <span className="eyebrow">How the AI makes its recommendation</span>
          <h2 id="agent-workflow-heading">
            {agentUnavailable
              ? 'AI unavailable. The command stays held.'
              : plan
                ? agentSummary(snapshot)
                : 'The agent will choose evidence before policy decides.'}
          </h2>
          <p>
            {agentUnavailable
              ? 'No rule-based recommendation replaced the failed model call.'
              : 'The agent chooses and evaluates network evidence. It cannot authorize the pump.'}
          </p>
        </div>
        <StatusMark
          status={agentUnavailable ? 'UNAVAILABLE' : snapshot.integration.agentReasoner}
        />
      </header>

      <ol className="agent-workflow__stages" aria-label="AI decision workflow">
        {stages.map((stage, index) => {
          const state = stageStates[index] ?? 'pending';
          return (
            <li
              key={stage.label}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="agent-workflow__number">
                {state === 'complete' ? '✓' : state === 'failed' ? '!' : index + 1}
              </span>
              <div>
                <b>{stage.label}</b>
                <small>{stage.detail}</small>
              </div>
            </li>
          );
        })}
      </ol>

      {agentUnavailable ? (
        <div className="agent-failure">
          <StatusMark status="UNAVAILABLE" />
          <div>
            <b>Provider error: {failureReason}</b>
            <p>The physical command was held and no substitute AI result was created.</p>
          </div>
        </div>
      ) : evidence.length > 0 ? (
        <EvidenceSummary evidence={evidence} />
      ) : (
        <div className="agent-ready">
          <b>Ready to investigate</b>
          <span>Run a scenario to see the model's selected tools and recorded observations.</span>
        </div>
      )}

      <details className="agent-details">
        <summary>
          <span>
            {trace.length > 0 ? `${trace.length} recorded agent steps` : 'Agent execution record'}
          </span>
          <b>Show technical trace</b>
        </summary>
        {trace.length > 0 ? (
          <ol className="agent-trace">
            {trace.map((step) => (
              <li key={step.sequence} data-phase={step.phase}>
                <span>{String(step.sequence).padStart(2, '0')}</span>
                <div>
                  <small>
                    {humanize(step.phase)}
                    {step.tool ? ` · ${humanize(step.tool)}` : ''}
                  </small>
                  <b>{step.headline}</b>
                  <p>{step.detail}</p>
                </div>
                {step.status && <StatusMark status={step.status} />}
              </li>
            ))}
          </ol>
        ) : (
          <p className="agent-details__empty">
            The trace will record the goal, tool requests, redacted observations and adaptation.
          </p>
        )}
        <a href="#evidence">Open the complete evidence record</a>
      </details>

      {decision && (
        <div className="policy-boundary">
          <span>Independent authority</span>
          <b>{humanize(decision.state)}</b>
          <p>Deterministic policy makes the final control decision.</p>
        </div>
      )}
    </section>
  );
}

function EvidenceSummary({ evidence }: { evidence: EvidenceCall[] }) {
  return (
    <div className="agent-evidence" aria-label="Network evidence selected by the agent">
      <div>
        <span className="eyebrow">Recorded network observations</span>
        <b>
          {evidence.length} {pluralize('result', evidence.length)}
        </b>
      </div>
      <ul>
        {evidence.map((call) => (
          <li key={call.id}>
            <span>{humanize(call.tool)}</span>
            <StatusMark status={call.provenance} />
            <StatusMark status={call.requestStatus} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function agentSummary(snapshot: RunSnapshot) {
  const plan = snapshot.artifacts.plan;
  if (!plan) return 'The agent will choose evidence before policy decides.';
  if (snapshot.run.command.kind === 'READ_STATUS') {
    return `Low-risk inspection uses ${plan.selectedTools.length} focused network ${pluralize('check', plan.selectedTools.length)}.`;
  }
  return `Physical control requires ${plan.selectedTools.length} network ${pluralize('check', plan.selectedTools.length)}.`;
}

function statesFor(
  stages: WorkflowStage[],
  workflowState: WorkflowState | null,
  agentUnavailable: boolean,
): StageState[] {
  if (agentUnavailable) {
    const riskComplete = workflowState ? workflowOrder.indexOf(workflowState) >= 2 : false;
    return stages.map((_stage, index) => {
      if (index === 0 && riskComplete) return 'complete';
      if (index === (riskComplete ? 1 : 0)) return 'failed';
      return 'pending';
    });
  }
  const currentIndex = workflowState ? workflowOrder.indexOf(workflowState) : -1;
  const completed = stages.map((stage) => currentIndex >= workflowOrder.indexOf(stage.completeAt));
  const firstPending = completed.findIndex((value) => !value);
  return completed.map((isComplete, index) => {
    if (isComplete) return 'complete';
    if (index === firstPending) return 'current';
    return 'pending';
  });
}

function humanize(machineLabel: string) {
  return machineLabel
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function pluralize(noun: string, count: number) {
  return count === 1 ? noun : `${noun}s`;
}

function textPayload(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}
