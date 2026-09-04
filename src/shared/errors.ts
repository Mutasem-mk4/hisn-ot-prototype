export type ErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_DENIED'
  | 'COMMAND_INVALID'
  | 'CONFIGURATION_INVALID'
  | 'ENFORCEMENT_NOT_AUTHORIZED'
  | 'ENFORCEMENT_UNAVAILABLE'
  | 'INCIDENT_INCOMPLETE'
  | 'INVALID_TRANSITION'
  | 'POLICY_ASSET_MISMATCH'
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'RUN_NOT_FOUND'
  | 'RUN_BUSY'
  | 'SCENARIO_NOT_FOUND'
  | 'WORKFLOW_ARTIFACT_MISSING';

export class HisnError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly statusCode: number,
    readonly context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'HisnError';
  }
}

export function invalidTransition(from: string | null, to: string): HisnError {
  return new HisnError(
    'INVALID_TRANSITION',
    `Transition from ${from ?? 'START'} to ${to} is not allowed`,
    409,
    {
      from,
      to,
    },
  );
}
