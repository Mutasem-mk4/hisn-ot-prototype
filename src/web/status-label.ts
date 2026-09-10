export function statusLabel(status: string) {
  if (status === 'SANDBOX') return 'NOKIA SANDBOX';
  if (status === 'SIMULATED') return 'IMPLEMENTED LOCALLY';
  if (status === 'LIVE_LLM') return 'LIVE LLM';
  if (status === 'NOKIA_SANDBOX_WITH_FALLBACK') return 'NOKIA SANDBOX + LOCAL FALLBACK';
  if (status === 'NOKIA_LIVE') return 'NOKIA LIVE';
  return status.replaceAll('_', ' ');
}
