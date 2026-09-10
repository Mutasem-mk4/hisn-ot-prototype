import type { WorkflowArtifacts } from '../../application/ports.js';
import type { TwinState, WorkflowState } from '../../shared/contracts.js';

type Layer = {
  key: string;
  label: string;
  detail: string;
  state: 'waiting' | 'verified' | 'failed' | 'active';
};

export function NetworkProofLattice({
  artifacts,
  workflowState,
  twin,
}: {
  artifacts: WorkflowArtifacts;
  workflowState: WorkflowState | null;
  twin: TwinState;
}) {
  const contained = twin.gatewayAttachment === 'DETACHED';
  const layers = latticeLayers(artifacts, workflowState);
  return (
    <section
      className={`lattice ${contained ? 'lattice--contained' : ''}`}
      aria-labelledby="lattice-title"
    >
      <header>
        <div>
          <span className="eyebrow">Network Proof Lattice</span>
          <h2 id="lattice-title">Command trust topology</h2>
        </div>
        <span className="lattice-mode">
          {contained ? 'Containment topology' : 'Proof assembling'}
        </span>
      </header>
      <div className="lattice-stage">
        <svg viewBox="0 0 760 330" role="img" aria-label={latticeDescription(layers, contained)}>
          <defs>
            <pattern id="microgrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M16 0H0V16" fill="none" className="lattice-grid" />
            </pattern>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0 10 5 0 10z" className="lattice-arrow" />
            </marker>
          </defs>
          <rect width="760" height="330" fill="url(#microgrid)" />
          <path className="lattice-path" markerEnd="url(#arrow)" d="M78 165H680" />
          {layers.map((layer, index) => {
            const x = 78 + index * 172;
            return (
              <g
                key={layer.key}
                className={`lattice-node lattice-node--${layer.state}`}
                transform={`translate(${x} 165)`}
              >
                <path d="M-42-65h62l22 22v86L20 65h-62l-22-22v-86z" />
                <circle r="16" />
                <path className="lattice-glyph" d={glyph(index)} />
                <text className="lattice-index" x="-43" y="-79">
                  0{index + 1}
                </text>
                <text className="lattice-label" textAnchor="middle" y="96">
                  {layer.label}
                </text>
                <text className="lattice-detail" textAnchor="middle" y="116">
                  {layer.detail}
                </text>
              </g>
            );
          })}
          {contained && (
            <g className="containment-route">
              <path d="M250 165v105h344" />
              <text x="352" y="295">
                COMPROMISED ROUTE SEVERED
              </text>
              <path className="trusted-route" markerEnd="url(#arrow)" d="M422 165v-112h258" />
              <text x="462" y="37">
                {twin.backupReady ? 'BACKUP CONTROL ACTIVE' : 'BACKUP UNAVAILABLE'}
              </text>
            </g>
          )}
        </svg>
      </div>
      <ol className="lattice-legend">
        {layers.map((layer) => (
          <li key={layer.key} data-state={layer.state}>
            <b>{layer.label}</b>
            <span>{layer.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function latticeLayers(artifacts: WorkflowArtifacts, workflowState: WorkflowState | null): Layer[] {
  const evidence = artifacts.evidence ?? [];
  const usable = evidence.filter((call) => call.requestStatus === 'SUCCEEDED');
  const number = usable.find((call) => call.tool === 'NUMBER_VERIFICATION');
  const location = usable.find((call) => call.tool === 'LOCATION_VERIFICATION');
  const network = usable.find((call) => call.tool === 'DEVICE_REACHABILITY');
  const hasRequest = workflowState !== null;
  return [
    {
      key: 'identity',
      label: 'Identity',
      detail: number
        ? number.redactedResult.verified
          ? 'Valid'
          : 'Rejected'
        : hasRequest
          ? 'Not yet proven'
          : 'Waiting',
      state: number
        ? number.redactedResult.verified
          ? 'verified'
          : 'failed'
        : hasRequest
          ? 'active'
          : 'waiting',
    },
    {
      key: 'presence',
      label: 'Presence',
      detail: location
        ? location.redactedResult.verificationResult === 'TRUE'
          ? 'On-site'
          : 'Off-site'
        : 'Not proven',
      state: location
        ? location.redactedResult.verificationResult === 'TRUE'
          ? 'verified'
          : 'failed'
        : 'waiting',
    },
    {
      key: 'connectivity',
      label: 'Connectivity',
      detail: network
        ? network.redactedResult.reachable
          ? 'Reachable'
          : 'Unreachable'
        : 'Not proven',
      state: network ? (network.redactedResult.reachable ? 'verified' : 'failed') : 'waiting',
    },
    {
      key: 'safety',
      label: 'Physical safety',
      detail: artifacts.safety
        ? artifacts.safety.permitted
          ? 'Within limit'
          : 'Limit failed'
        : 'Not evaluated',
      state: artifacts.safety ? (artifacts.safety.permitted ? 'verified' : 'failed') : 'waiting',
    },
  ];
}

function glyph(index: number) {
  return ['M-7 0h14M0-7v14', 'M-8 5 0-8 8 5', 'M-9 3h5l4-7 4 7h5', 'M-8-5 8 10 8-10'][index];
}

function latticeDescription(layers: Layer[], contained: boolean) {
  return `${layers.map((layer) => `${layer.label}: ${layer.detail}`).join('. ')}. ${contained ? 'Gateway detached; inspect the evidence record for provenance.' : ''}`;
}
