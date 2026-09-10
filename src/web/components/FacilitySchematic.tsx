import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { RunSnapshot } from '../../application/ports.js';

type ComponentKey = 'intake' | 'pump' | 'treatment' | 'valve' | 'output' | 'gate' | 'control';

export function FacilitySchematic({ snapshot }: { snapshot: RunSnapshot }) {
  const [selected, setSelected] = useState<ComponentKey>('gate');
  const twin = snapshot.presentationTwin;
  const workflow = snapshot.currentEvent?.workflowState ?? snapshot.run.workflowState;
  const decision = snapshot.artifacts.decision?.state;
  const paused = twin.simulationPaused;
  const flowing = !paused && twin.pumpState !== 'STOPPED' && twin.flowRateM3PerHour > 0;
  const primaryConnected =
    twin.gatewayAttachment === 'OPERATIONAL' && twin.primaryAttachment === 'OPERATIONAL';
  const backupConnected = twin.backupAttachment === 'OPERATIONAL';
  const backupActive = twin.activeController === 'BACKUP' && twin.backupReady && backupConnected;
  const evidencePhase = phaseIndex(workflow) >= phaseIndex('EVIDENCE_COLLECTING');
  const evidenceReturned = phaseIndex(workflow) >= phaseIndex('EVIDENCE_COMPLETE');
  const packet = packetState(workflow, decision);
  const inspector = useMemo(() => componentDetail(selected, snapshot), [selected, snapshot]);
  const motionStyle = {
    '--pump-duration': `${Math.max(0.34, 3.4 - twin.pumpSpeedPercent * 0.052)}s`,
    '--flow-duration': `${Math.max(0.65, 3.8 - twin.flowRateM3PerHour / 520)}s`,
  } as CSSProperties;

  const select = (key: ComponentKey) => setSelected(key);
  const keySelect = (event: KeyboardEvent<SVGGElement>, key: ComponentKey) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(key);
    }
  };

  return (
    <section className="facility" aria-labelledby="facility-heading" style={motionStyle}>
      <header className="facility__header">
        <div>
          <span className="eyebrow">State-bound facility view</span>
          <h2 id="facility-heading">Desalination line A</h2>
        </div>
        <div className="facility__clock" data-paused={paused}>
          <span>{paused ? 'SIMULATION PAUSED' : `${snapshot.run.speed}× SIMULATION`}</span>
          <b>{formatSimulationTime(twin.simulationElapsedMs)}</b>
          <small>External API timing remains real time</small>
        </div>
      </header>

      <div className="facility__layout">
        <div className="facility__canvas">
          <svg viewBox="0 0 1000 560" aria-labelledby="facility-svg-title facility-svg-desc">
            <title id="facility-svg-title">HISN-OT desalination process and command paths</title>
            <desc id="facility-svg-desc">
              Physical water moves left to right through two tanks, a pump, treatment stage and
              valve. Digital commands move above the process through the HISN gate to primary or
              backup control. The operator-facing primary edge and separately enrolled backup edge
              are independent paths.
            </desc>

            <g className="digital-lane">
              <text className="lane-title" x="34" y="28">
                DIGITAL COMMAND &amp; EVIDENCE PATH
              </text>
              <path className="digital-path" d="M105 89 H280" />
              <path
                className={primaryConnected ? 'digital-path is-live' : 'digital-path is-cut'}
                d="M360 89 H455 M555 89 H655"
              />
              <path
                className={
                  backupActive
                    ? 'digital-path is-live'
                    : backupConnected
                      ? 'digital-path'
                      : 'digital-path is-cut'
                }
                d="M320 126 V180 H455 M555 180 H655"
              />
              <path
                className={
                  primaryConnected && twin.activeController === 'PRIMARY'
                    ? 'control-drop is-live'
                    : 'control-drop'
                }
                d="M700 116 V276 H390"
              />
              <path
                className={backupActive ? 'control-drop is-live' : 'control-drop'}
                d="M700 209 V276 H390"
              />

              <g className="operator-node">
                <circle cx="70" cy="89" r="28" />
                <path d="M58 96c4-13 20-13 24 0M70 69a9 9 0 1 1 0 18 9 9 0 0 1 0-18" />
                <text x="34" y="130">
                  OPERATOR
                </text>
              </g>

              <g
                className={selected === 'gate' ? 'gate-node is-selected' : 'gate-node'}
                role="button"
                tabIndex={0}
                aria-label="Inspect HISN command gate"
                onClick={() => select('gate')}
                onKeyDown={(event) => keySelect(event, 'gate')}
              >
                <path d="M280 52h80v74h-80z" />
                <path d="M303 72v34M337 72v34M303 88h34" />
                <text x="320" y="145" textAnchor="middle">
                  HISN COMMAND GATE
                </text>
                <text x="320" y="160" textAnchor="middle">
                  {packet === 'held' ? 'AUTHORIZATION PENDING' : (decision ?? 'READY')}
                </text>
              </g>

              <g className={primaryConnected ? 'gateway-node' : 'gateway-node is-cut'}>
                <rect x="455" y="58" width="100" height="58" />
                <text x="505" y="79" textAnchor="middle">
                  PRIMARY EDGE
                </text>
                <text x="505" y="94" textAnchor="middle">
                  OPERATOR PATH
                </text>
                <text className="gateway-state" x="505" y="108" textAnchor="middle">
                  {primaryConnected ? 'OPERATIONAL' : 'ISOLATED'}
                </text>
              </g>
              <text className="handover-label" x="386" y="170" textAnchor="middle">
                SYSTEM HANDOVER ONLY
              </text>
              <g className={backupConnected ? 'gateway-node' : 'gateway-node is-cut'}>
                <rect x="455" y="151" width="100" height="58" />
                <text x="505" y="172" textAnchor="middle">
                  BACKUP EDGE
                </text>
                <text x="505" y="187" textAnchor="middle">
                  SEPARATE IDENTITY
                </text>
                <text className="gateway-state" x="505" y="201" textAnchor="middle">
                  {backupActive ? 'CONTROL OWNER' : 'ENROLLED STANDBY'}
                </text>
              </g>

              <g
                className={
                  selected === 'control' ? 'controller-node is-selected' : 'controller-node'
                }
                role="button"
                tabIndex={0}
                aria-label="Inspect primary and backup controllers"
                onClick={() => select('control')}
                onKeyDown={(event) => keySelect(event, 'control')}
              >
                <rect
                  className={
                    primaryConnected && twin.activeController === 'PRIMARY'
                      ? 'controller-box is-owner'
                      : 'controller-box'
                  }
                  x="655"
                  y="58"
                  width="90"
                  height="58"
                />
                <text x="700" y="81" textAnchor="middle">
                  PRIMARY PLC
                </text>
                <text x="700" y="99" textAnchor="middle">
                  #{twin.primaryHeartbeatSequence}
                </text>
                <rect
                  className={backupActive ? 'controller-box is-owner' : 'controller-box'}
                  x="655"
                  y="151"
                  width="90"
                  height="58"
                />
                <text x="700" y="174" textAnchor="middle">
                  BACKUP PLC
                </text>
                <text x="700" y="192" textAnchor="middle">
                  #{twin.backupHeartbeatSequence}
                </text>
              </g>

              <g className={evidencePhase ? 'evidence-services is-active' : 'evidence-services'}>
                <text x="835" y="47">
                  NETWORK EVIDENCE
                </text>
                {['NUMBER', 'SIM / DEVICE', 'LOCATION', 'REACHABILITY'].map((label, index) => (
                  <g key={label} transform={`translate(790 ${60 + index * 38})`}>
                    <rect width="174" height="28" />
                    <circle cx="14" cy="14" r="4" />
                    <text x="27" y="18">
                      {label}
                    </text>
                    {evidenceReturned && (
                      <text className="evidence-returned" x="160" y="18" textAnchor="end">
                        RETURNED
                      </text>
                    )}
                  </g>
                ))}
                {evidencePhase && !evidenceReturned && (
                  <path className="evidence-pulse" d="M360 70 C520 15 665 20 790 74" />
                )}
                {evidenceReturned && (
                  <path
                    className="evidence-pulse is-returning"
                    d="M790 188 C625 230 475 170 360 108"
                  />
                )}
              </g>

              {packet !== 'idle' && (
                <g className={`command-packet command-packet--${packet}`}>
                  <rect x={packetX(packet)} y="74" width="48" height="29" rx="2" />
                  <text x={packetX(packet) + 24} y="92" textAnchor="middle">
                    {twin.requestedPressurePercent ?? snapshot.run.command.requestedSetpointPercent}
                    %
                  </text>
                  {packet === 'blocked' && <path d="M306 67l28 43M334 67l-28 43" />}
                </g>
              )}
            </g>

            <g className="physical-lane">
              <text className="lane-title" x="34" y="264">
                PHYSICAL WATER PROCESS
              </text>
              <path
                className="water-pipe"
                d="M32 396 H130 M230 396 H315 M405 396 H470 M620 396 H685 M755 396 H845"
              />
              <path className="water-pipe water-pipe--intake" d="M32 396v-48" />
              <g
                className={flowing ? 'flow-markers is-flowing' : 'flow-markers'}
                aria-hidden="true"
              >
                {[0, 1, 2].map((index) => (
                  <circle
                    key={`a-${index}`}
                    cx="38"
                    cy="396"
                    r="4"
                    style={{ animationDelay: `${index * -0.55}s` }}
                  />
                ))}
                {[0, 1, 2].map((index) => (
                  <circle
                    key={`b-${index}`}
                    cx="235"
                    cy="396"
                    r="4"
                    style={{ animationDelay: `${index * -0.55}s` }}
                  />
                ))}
                {[0, 1, 2].map((index) => (
                  <circle
                    key={`c-${index}`}
                    cx="625"
                    cy="396"
                    r="4"
                    style={{ animationDelay: `${index * -0.55}s` }}
                  />
                ))}
                {[0, 1, 2].map((index) => (
                  <circle
                    key={`d-${index}`}
                    cx="760"
                    cy="396"
                    r="4"
                    style={{ animationDelay: `${index * -0.55}s` }}
                  />
                ))}
              </g>

              <g
                className={
                  selected === 'intake'
                    ? 'asset-node tank-node is-selected'
                    : 'asset-node tank-node'
                }
                role="button"
                tabIndex={0}
                aria-label="Inspect intake tank"
                onClick={() => select('intake')}
                onKeyDown={(event) => keySelect(event, 'intake')}
              >
                <rect className="tank-shell" x="130" y="315" width="100" height="162" />
                <rect
                  className="tank-water"
                  x="137"
                  y={469 - twin.inletTankLevelPercent * 1.46}
                  width="86"
                  height={twin.inletTankLevelPercent * 1.46}
                />
                <path d="M130 335h100M130 457h100" />
                <text x="180" y="500" textAnchor="middle">
                  INTAKE TANK
                </text>
                <text className="asset-value" x="180" y="519" textAnchor="middle">
                  {twin.inletTankLevelPercent.toFixed(1)}%
                </text>
              </g>

              <g
                className={
                  selected === 'pump' ? 'asset-node pump-node is-selected' : 'asset-node pump-node'
                }
                role="button"
                tabIndex={0}
                aria-label="Inspect high pressure pump"
                onClick={() => select('pump')}
                onKeyDown={(event) => keySelect(event, 'pump')}
              >
                <circle className="pump-shell" cx="360" cy="396" r="46" />
                <g
                  className={
                    !paused && twin.pumpSpeedPercent > 0 ? 'pump-rotor is-running' : 'pump-rotor'
                  }
                >
                  <path d="M360 361v70M325 396h70M335 371l50 50M385 371l-50 50" />
                  <circle cx="360" cy="396" r="12" />
                </g>
                <text x="360" y="470" textAnchor="middle">
                  HP PUMP
                </text>
                <text className="asset-value" x="360" y="489" textAnchor="middle">
                  {twin.pumpSpeedPercent.toFixed(0)}% SPEED
                </text>
              </g>

              <g
                className={
                  selected === 'treatment'
                    ? 'asset-node treatment-node is-selected'
                    : 'asset-node treatment-node'
                }
                role="button"
                tabIndex={0}
                aria-label="Inspect reverse osmosis treatment"
                onClick={() => select('treatment')}
                onKeyDown={(event) => keySelect(event, 'treatment')}
              >
                <rect x="470" y="330" width="150" height="132" />
                {[0, 1, 2, 3].map((index) => (
                  <path key={index} d={`M${492 + index * 34} 350v92`} />
                ))}
                <text x="545" y="489" textAnchor="middle">
                  RO TREATMENT
                </text>
                <text className="asset-value" x="545" y="508" textAnchor="middle">
                  {twin.actualPressurePercent.toFixed(1)}% PRESSURE
                </text>
              </g>

              <g
                className={
                  selected === 'valve'
                    ? 'asset-node valve-node is-selected'
                    : 'asset-node valve-node'
                }
                role="button"
                tabIndex={0}
                aria-label="Inspect output valve"
                onClick={() => select('valve')}
                onKeyDown={(event) => keySelect(event, 'valve')}
              >
                <circle cx="720" cy="396" r="34" />
                <path
                  className="valve-blade"
                  style={{ transform: `rotate(${twin.valvePositionPercent * 0.9 - 45}deg)` }}
                  d="M696 396h48"
                />
                <path d="M720 362v-25M706 337h28" />
                <text x="720" y="466" textAnchor="middle">
                  CONTROL VALVE
                </text>
                <text className="asset-value" x="720" y="485" textAnchor="middle">
                  {twin.valvePositionPercent.toFixed(1)}% OPEN
                </text>
              </g>

              <g
                className={
                  selected === 'output'
                    ? 'asset-node tank-node is-selected'
                    : 'asset-node tank-node'
                }
                role="button"
                tabIndex={0}
                aria-label="Inspect product water tank"
                onClick={() => select('output')}
                onKeyDown={(event) => keySelect(event, 'output')}
              >
                <rect className="tank-shell" x="845" y="315" width="110" height="162" />
                <rect
                  className="tank-water tank-water--clean"
                  x="852"
                  y={469 - twin.outputTankLevelPercent * 1.46}
                  width="96"
                  height={twin.outputTankLevelPercent * 1.46}
                />
                <path d="M845 335h110M845 457h110" />
                <text x="900" y="500" textAnchor="middle">
                  PRODUCT TANK
                </text>
                <text className="asset-value" x="900" y="519" textAnchor="middle">
                  {twin.outputTankLevelPercent.toFixed(1)}%
                </text>
              </g>

              <g className="intake-source">
                <path d="M20 348c14-10 28 10 42 0s28 10 42 0" />
                <text x="34" y="328">
                  SEAWATER
                </text>
              </g>
              <text className="flow-readout" x="490" y="301">
                MEASURED FLOW{' '}
                {twin.telemetryStatus === 'LIVE'
                  ? `${twin.flowRateM3PerHour.toFixed(0)} m³/h`
                  : twin.telemetryStatus}
              </text>
            </g>
          </svg>
          <div className="facility__legend" aria-label="Schematic legend">
            <span>
              <i className="legend-water" /> Physical water
            </span>
            <span>
              <i className="legend-digital" /> Digital command
            </span>
            <span>
              <i className="legend-owner" /> Active control owner
            </span>
            <span>
              <i className="legend-cut" /> Isolated path
            </span>
          </div>
        </div>

        <aside className="component-inspector" aria-live="polite">
          <span className="eyebrow">Selected component</span>
          <h3>{inspector.name}</h3>
          <p>{inspector.summary}</p>
          <dl>
            {inspector.metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="component-inspector__events">
            <b>Recent related state</b>
            {snapshot.visibleEvents
              .slice(-3)
              .reverse()
              .map((event) => (
                <span key={event.id}>
                  <time>{String(event.sequence).padStart(2, '0')}</time>
                  {String(event.payload.headline)}
                </span>
              ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function phaseIndex(state: string | null) {
  return [
    null,
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
  ].indexOf(state);
}

function packetState(workflow: string | null, decision?: string) {
  if (!workflow) return 'idle';
  if (workflow === 'COMMAND_RECEIVED') return 'travelling';
  if (!decision || decision === 'STEP_UP') return 'held';
  if (decision === 'ALLOW') return workflow === 'INCIDENT_REPORTED' ? 'released' : 'held';
  return 'blocked';
}

function packetX(state: string) {
  if (state === 'travelling') return 170;
  if (state === 'released') return 580;
  return 296;
}

function formatSimulationTime(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `T+${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function componentDetail(key: ComponentKey, snapshot: RunSnapshot) {
  const twin = snapshot.presentationTwin;
  const decision = snapshot.artifacts.decision?.state ?? 'PENDING';
  const details: Record<
    ComponentKey,
    { name: string; summary: string; metrics: [string, string][] }
  > = {
    intake: {
      name: 'Intake tank',
      summary: 'Raw seawater buffer feeding the high-pressure process.',
      metrics: [
        ['Level', `${twin.inletTankLevelPercent.toFixed(1)}%`],
        ['Telemetry', twin.telemetryStatus],
      ],
    },
    pump: {
      name: 'High-pressure pump',
      summary: 'Rotation follows the last setpoint accepted by the HISN gate.',
      metrics: [
        ['Operating speed', `${twin.pumpSpeedPercent.toFixed(0)}%`],
        ['State', twin.pumpState.replaceAll('_', ' ')],
        ['Accepted input', `${twin.acceptedPressurePercent?.toFixed(0) ?? '—'}%`],
      ],
    },
    treatment: {
      name: 'Reverse-osmosis treatment',
      summary: 'Modeled membrane stage; pressure and flow respond progressively.',
      metrics: [
        ['Pressure', `${twin.actualPressurePercent.toFixed(1)}%`],
        ['Flow', `${twin.flowRateM3PerHour.toFixed(0)} m³/h`],
        ['Telemetry', twin.telemetryStatus],
      ],
    },
    valve: {
      name: 'Process control valve',
      summary: 'The blade position is the modeled accepted control output.',
      metrics: [
        ['Opening', `${twin.valvePositionPercent.toFixed(1)}%`],
        ['Requested', `${twin.requestedPressurePercent?.toFixed(0) ?? '—'}%`],
      ],
    },
    output: {
      name: 'Product-water tank',
      summary: 'Treated-water inventory changes with modeled production flow.',
      metrics: [
        ['Level', `${twin.outputTankLevelPercent.toFixed(1)}%`],
        ['Flow in', `${twin.flowRateM3PerHour.toFixed(0)} m³/h`],
      ],
    },
    gate: {
      name: 'HISN command gate',
      summary: 'No requested setpoint reaches control until policy and network proof agree.',
      metrics: [
        ['Decision', decision],
        ['Requested', `${twin.requestedPressurePercent?.toFixed(0) ?? '—'}%`],
        ['Operator edge', twin.gatewayAttachment],
      ],
    },
    control: {
      name: 'Controller pair',
      summary:
        'The separately enrolled backup path accepts only a system-authorized handover, never the operator command.',
      metrics: [
        [
          'Control owner',
          twin.gatewayAttachment !== 'OPERATIONAL' && twin.activeController === 'PRIMARY'
            ? 'NONE — SAFE STOP'
            : twin.activeController,
        ],
        ['Primary heartbeat', `#${twin.primaryHeartbeatSequence}`],
        ['Backup heartbeat', `#${twin.backupHeartbeatSequence}`],
        ['Backup path', twin.backupAttachment],
      ],
    },
  };
  return details[key];
}
