import { statusLabel } from '../status-label.js';

export function StatusMark({ status, children }: { status: string; children?: React.ReactNode }) {
  return (
    <span className={`status-mark status-mark--${tone(status)}`}>
      <span aria-hidden="true" />
      {children ?? statusLabel(status)}
    </span>
  );
}

function tone(status: string) {
  if (
    [
      'READY',
      'AVAILABLE',
      'SUCCEEDED',
      'ALLOW',
      'LIVE',
      'LANGGRAPH',
      'NOKIA_SANDBOX',
      'NOKIA_SANDBOX_WITH_FALLBACK',
      'NOKIA_LIVE',
    ].includes(status)
  )
    return 'trusted';
  if (['BLOCK', 'BLOCK_AND_CONTAIN', 'FAILED_SAFE', 'FAILED', 'FALSE'].includes(status))
    return 'danger';
  if (['STEP_UP', 'DEGRADED', 'UNAVAILABLE', 'PARTIAL', 'PENDING'].includes(status))
    return 'uncertain';
  return 'neutral';
}
