import type { RunSnapshot } from '../../application/ports.js';
import { EnforcementCallSchema } from '../../shared/contracts.js';

const displayValue = (value: unknown) => (typeof value === 'string' ? value : '');

export function RunProof({ snapshot }: { snapshot: RunSnapshot }) {
  const { evidence = [], plan, recommendation, decision } = snapshot.artifacts;
  if (!plan && snapshot.run.playbackStatus !== 'FAILED_SAFE') return null;
  const required =
    snapshot.run.command.kind === 'READ_STATUS'
      ? ['DEVICE_REACHABILITY']
      : [
          'LOCATION_VERIFICATION',
          'DEVICE_REACHABILITY',
          ...((snapshot.run.command.requestedSetpointPercent ?? 0) >
          snapshot.safePressureBand.maximumPercent
            ? ['SIM_SWAP', 'DEVICE_SWAP']
            : []),
        ];
  const connected = snapshot.run.runtimeMode === 'SANDBOX';
  const enforcement = snapshot.visibleEvents.flatMap((event) => {
    const result = EnforcementCallSchema.array().safeParse(event.payload.enforcement);
    return result.success ? result.data : [];
  });
  const complete = required.every((tool) =>
    evidence.some(
      (call) =>
        call.tool === tool &&
        call.requestStatus === 'SUCCEEDED' &&
        (!connected || call.provenance === 'SANDBOX'),
    ),
  );
  const writes = snapshot.run.twin.commandHistory.filter(
    (command) =>
      command.kind === 'SET_PRESSURE' &&
      command.outcome === 'EXECUTED' &&
      command.correlationId === snapshot.run.correlationId,
  ).length;
  return (
    <section className="run-proof" aria-label="Agent and network proof for this run">
      <div className="run-proof__summary">
        <span>
          <b>
            {recommendation?.reasoningProvenance === 'LIVE'
              ? 'LANGGRAPH LIVE · GROQ'
              : snapshot.integration.agentReasoner === 'DETERMINISTIC'
                ? 'LOCAL TEST REASONER'
                : snapshot.run.playbackStatus === 'FAILED_SAFE'
                  ? 'AGENT UNAVAILABLE · COMMAND HELD'
                  : 'LANGGRAPH · AWAITING RESULT'}
          </b>
          <small>
            AI recommendation: {recommendation?.recommendedDecision ?? 'Pending'} · advisory
          </small>
        </span>
        <span>
          <b>Required evidence {complete ? 'COMPLETE' : 'INCOMPLETE'}</b>
          <small>Collection completeness does not mean the device is trusted.</small>
        </span>
        <span>
          <b>{writes} simulated control writes for this request</b>
          <small>Policy: {decision?.state ?? 'Pending'} · final authority</small>
        </span>
      </div>
      <ul className="run-proof__calls">
        {evidence.map((call) => (
          <li key={call.id}>
            <b>{call.tool.replaceAll('_', ' ')}</b>
            <span>
              {call.requestStatus} ·{' '}
              {call.provenance === 'SANDBOX' ? 'NOKIA SANDBOX' : call.provenance}
            </span>
            <small>
              {plan?.selectionReasons[call.tool]} · {new Date(call.timestamp).toLocaleTimeString()}
            </small>
          </li>
        ))}
      </ul>
      {enforcement.length > 0 && (
        <dl className="run-proof__summary">
          {enforcement.map((call) => (
            <div key={call.id}>
              <dt>
                {call.action === 'DETACH_GATEWAY'
                  ? 'Primary gateway attachment'
                  : call.action === 'QUALITY_ON_DEMAND'
                    ? 'Separate backup flow · QoD'
                    : 'Local safe-control routine'}
              </dt>
              <dd>
                {call.status} ·{' '}
                {call.provenance === 'SIMULATED'
                  ? 'LOCAL ENFORCEMENT'
                  : call.provenance === 'SANDBOX'
                    ? 'NOKIA SANDBOX'
                    : call.provenance}
                <small>
                  {displayValue(call.redactedResult.reason ?? call.redactedResult.target)}
                </small>
                {Boolean(call.redactedResult.primaryIdentity) && (
                  <small>
                    {String(call.redactedResult.primaryIdentity)} →{' '}
                    {String(call.redactedResult.backupIdentity)}
                  </small>
                )}
                {Boolean(call.redactedResult.cleanup) && (
                  <small>
                    QoD cleanup: {String(call.redactedResult.cleanup)} · allocation is not handover
                    proof
                  </small>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <small>
        Run {snapshot.run.correlationId} · local digital twin · normalized pressure, not a
        calibrated oil process
      </small>
      {snapshot.incidentAvailable && <a href="#incident">Open this run’s incident report</a>}
    </section>
  );
}
