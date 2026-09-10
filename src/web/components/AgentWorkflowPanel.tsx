import type { RunSnapshot } from '../../application/ports.js';
import type { WorkflowState } from '../../shared/contracts.js';
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
  const missingTrace = trace.length === 0 && decision !== undefined;
  const agentFailed =
    snapshot.run.playbackStatus === 'FAILED_SAFE' &&
    snapshot.currentEvent?.payload.errorCode === 'AGENT_UNAVAILABLE';
  const hasAgentOutput =
    plan?.reasoningProvenance === 'LIVE' || recommendation?.reasoningProvenance === 'LIVE';
  const agentUnavailable =
    snapshot.integration.agentReasoner === 'UNAVAILABLE' || (agentFailed && !hasAgentOutput);
  const failureCode = textPayload(snapshot.currentEvent?.payload.errorCode, 'FAILED SAFE');
  const failureReason = textPayload(snapshot.currentEvent?.payload.failureReason, 'UNAVAILABLE');
  const failureDetail = textPayload(
    snapshot.currentEvent?.payload.detail,
    'The command remained blocked.',
  );
  const stages: WorkflowStage[] = [
    {
      label: 'Understand command',
      detail: snapshot.artifacts.risk
        ? `${humanize(snapshot.run.command.kind)} · ${snapshot.artifacts.risk} risk`
        : 'Read redacted command context',
      completeAt: 'RISK_CLASSIFIED',
    },
    {
      label: 'Plan evidence',
      detail: plan
        ? `${plan.selectedTools.length} allowlisted ${pluralize('tool', plan.selectedTools.length)}`
        : 'Choose signals by consequence',
      completeAt: 'EVIDENCE_PLANNED',
    },
    {
      label: 'Call CAMARA tools',
      detail:
        evidence.length > 0
          ? `${evidence.length} trusted ${pluralize('result', evidence.length)} recorded`
          : plan
            ? `${plan.selectedTools.length} selected ${pluralize('call', plan.selectedTools.length)} queued`
            : 'Nokia tools remain idle',
      completeAt: 'EVIDENCE_COMPLETE',
    },
    {
      label: 'Observe & adapt',
      detail: trace.some((step) => step.phase === 'ADAPTATION')
        ? 'Plan changed from observations'
        : 'Check evidence completeness',
      completeAt: 'SAFETY_EVALUATED',
    },
    {
      label: 'Recommend action',
      detail: recommendation
        ? `${humanize(recommendation.recommendedDecision)} · ${recommendation.reasoningProvenance}`
        : 'Explain evidence-based advice',
      completeAt: 'DECISION_ISSUED',
    },
    {
      label: 'Policy authorizes',
      detail: decision
        ? `${humanize(decision.state)} · deterministic authority`
        : 'Enforce non-bypassable limits',
      completeAt: 'DECISION_ISSUED',
    },
  ];
  const stageStates = statesFor(
    stages,
    snapshot.currentEvent?.workflowState ?? null,
    failedStageIndex(snapshot),
  );

  return (
    <section className="agent-workflow" aria-labelledby="agent-workflow-heading">
      <header className="agent-workflow__header">
        <div>
          <span className="eyebrow">Auditable AI workflow</span>
          <h2 id="agent-workflow-heading">
            {agentUnavailable
              ? 'AI unavailable — command stays held'
              : 'See what the agent does and why'}
          </h2>
          <p>
            {agentUnavailable
              ? 'No rule-based AI recommendation is substituted. The deterministic safety boundary prevents actuation.'
              : 'Inspectable goal, tool choices, observations and adaptation. The final control decision remains with the deterministic safety policy.'}
          </p>
        </div>
        <StatusMark
          status={agentUnavailable ? 'UNAVAILABLE' : snapshot.integration.agentReasoner}
        />
      </header>

      <ol className="agent-workflow__stages" aria-label="Agent decision workflow">
        {stages.map((stage, index) => {
          const state = stageStates[index] ?? 'pending';
          return (
            <li
              key={stage.label}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="agent-workflow__number">
                {state === 'complete'
                  ? '✓'
                  : state === 'failed'
                    ? '!'
                    : String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <b>{stage.label}</b>
                <small>{stage.detail}</small>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="agent-journal">
        <div className="agent-journal__heading">
          <div>
            <span className="eyebrow">Action + observation journal</span>
            <b>
              {agentFailed
                ? 'Agent stopped safely'
                : trace.length > 0
                  ? `${trace.length} recorded steps`
                  : missingTrace
                    ? 'No trace in this saved run'
                    : 'Ready to investigate'}
            </b>
          </div>
          <a href="#evidence">Inspect complete AI record →</a>
        </div>
        {agentFailed ? (
          <div className="agent-journal__missing">
            <span>{`${failureCode} · ${failureReason}`}</span>
            <b>No AI plan or recommendation replaced the failed agent call.</b>
            <p>{failureDetail}</p>
          </div>
        ) : trace.length > 0 ? (
          <ol aria-live="polite">
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
        ) : missingTrace ? (
          <div className="agent-journal__missing">
            <span>Saved result</span>
            <b>This run has no structured agent trace.</b>
            <p>Reset and run a scenario again to capture each goal, tool call and observation.</p>
          </div>
        ) : (
          <div className="agent-journal__empty">
            <div>
              <span>01</span>
              <p>
                <b>Frame the goal</b>
                Interpret the command, role and physical consequence.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <b>Select trusted signals</b>
                Choose Nokia/CAMARA tools from the server allowlist.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <b>Adapt without authority</b>
                Recommend from observations; policy alone can authorize control.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function statesFor(
  stages: WorkflowStage[],
  workflowState: WorkflowState | null,
  failedStage: number | null,
): StageState[] {
  if (workflowState === 'FAILED_SAFE' && failedStage !== null) {
    return stages.map((_stage, index) => {
      if (index < failedStage) return 'complete';
      if (index === failedStage) return 'failed';
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

function failedStageIndex(snapshot: RunSnapshot): number | null {
  if (snapshot.run.playbackStatus !== 'FAILED_SAFE') return null;
  if (!snapshot.artifacts.plan) return 1;
  if (!snapshot.artifacts.evidence) return 2;
  if (!snapshot.artifacts.safety) return 3;
  if (!snapshot.artifacts.recommendation) return 4;
  return 5;
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

function textPayload(payload: unknown, fallback: string) {
  return typeof payload === 'string' ? payload : fallback;
}
