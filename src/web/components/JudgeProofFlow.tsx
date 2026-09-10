import type { RunSnapshot } from '../../application/ports.js';
import { StatusMark } from './StatusMark.js';

export function JudgeProofFlow({ snapshot }: { snapshot: RunSnapshot }) {
  const twin = snapshot.presentationTwin;
  const evidenceCount = snapshot.artifacts.evidence?.length ?? 0;
  const decision = snapshot.artifacts.decision?.state;
  const requested = twin.requestedPressurePercent ?? snapshot.run.command.requestedSetpointPercent;
  const accepted = twin.acceptedPressurePercent;
  const commandHeld = twin.commandHistory.at(-1)?.outcome !== 'EXECUTED';
  const readOnly = snapshot.run.command.kind === 'READ_STATUS';

  return (
    <section className="proof-flow" aria-labelledby="proof-flow-heading">
      <header>
        <div>
          <span className="eyebrow">The protection path</span>
          <h2 id="proof-flow-heading">From command to safe physical outcome</h2>
        </div>
        <a href="#evidence">View verified evidence</a>
      </header>

      <ol aria-label="Command protection flow">
        <li data-state={requested !== null ? 'active' : 'waiting'}>
          <span className="proof-flow__number">1</span>
          <div>
            <small>Requested command</small>
            <strong>
              {readOnly
                ? 'Read-only status'
                : requested === null
                  ? 'Pending'
                  : `${requested.toFixed(0)}% pressure`}
            </strong>
            <p>
              {readOnly
                ? 'No physical change is requested.'
                : 'Valid credentials reach the HISN gate.'}
            </p>
          </div>
          <StatusMark status={readOnly ? 'READ ONLY' : commandHeld ? 'HELD' : 'EXECUTED'} />
        </li>
        <li data-state={evidenceCount > 0 ? 'active' : 'waiting'}>
          <span className="proof-flow__number">2</span>
          <div>
            <small>AI and network evidence</small>
            <strong>
              {evidenceCount > 0
                ? `${evidenceCount} network ${evidenceCount === 1 ? 'signal' : 'signals'}`
                : 'Selecting evidence'}
            </strong>
            <p>The agent chooses trusted CAMARA checks.</p>
          </div>
          <StatusMark status={snapshot.integration.agentReasoner} />
        </li>
        <li data-state={decision ? 'active' : 'waiting'}>
          <span className="proof-flow__number">3</span>
          <div>
            <small>Safety policy</small>
            <strong>{decision ? humanize(decision) : 'Decision pending'}</strong>
            <p>The model cannot override physical limits.</p>
          </div>
          <StatusMark status={decision ?? 'PENDING'} />
        </li>
        <li data-state={decision ? 'active' : 'waiting'}>
          <span className="proof-flow__number">4</span>
          <div>
            <small>Protected plant</small>
            <strong>
              {accepted === null ? 'No accepted command' : `${accepted.toFixed(0)}% accepted`}
            </strong>
            <p>Only authorized state reaches the digital twin.</p>
          </div>
          <StatusMark status={twin.pumpState === 'STOPPED' ? 'SAFE STOP' : twin.pumpState} />
        </li>
      </ol>
    </section>
  );
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}
