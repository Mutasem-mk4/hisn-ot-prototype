export function StatusMark({ status, children }: { status: string; children?: React.ReactNode }) {
  return (
    <span className={`status-mark status-mark--${tone(status)}`}>
      <span aria-hidden="true" />
      {children ?? status.replaceAll('_', ' ')}
    </span>
  );
}

function tone(status: string) {
  if (['READY', 'AVAILABLE', 'SUCCEEDED', 'ALLOW', 'LIVE'].includes(status)) return 'trusted';
  if (['BLOCK', 'BLOCK_AND_CONTAIN', 'FAILED_SAFE', 'FAILED', 'FALSE'].includes(status))
    return 'danger';
  if (['STEP_UP', 'DEGRADED', 'UNAVAILABLE', 'PARTIAL'].includes(status)) return 'uncertain';
  return 'neutral';
}
