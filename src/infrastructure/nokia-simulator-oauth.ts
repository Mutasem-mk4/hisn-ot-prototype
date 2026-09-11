import { randomUUID } from 'node:crypto';
import type { NetworkAsCodeApiClient } from 'network-as-code';
import type { NacCredentials } from './configuration.js';

const CALLBACK = 'https://hisn-ot-prototype.vercel.app/api/v1/number-verification/callback';
const SCOPE = 'dpv:FraudPreventionAndDetection number-verification:verify';

type AuthorizationRequest = {
  client: NetworkAsCodeApiClient;
  credentials: NacCredentials;
  phoneNumber: string;
  correlationId: string;
  timeoutMs: number;
  signal: AbortSignal;
};

export async function getSimulatorNumberAuthorization(request: AuthorizationRequest) {
  const requestOptions = {
    abortSignal: request.signal,
    timeoutInSeconds: request.timeoutMs / 1000,
    headers: { 'x-correlator': request.correlationId },
  };
  const clientCredentials = await request.client.oauth.getClientCredentials(requestOptions);
  const metadata =
    await request.client.wellKnownMetadata.getOauthAuthorizationServer(requestOptions);
  const state = randomUUID();
  const authorizationUrl = buildAuthorizationUrl(
    metadata.fast_flow_csp_auth_endpoint,
    clientCredentials.client_id,
    request.phoneNumber,
    state,
  );
  assertTrustedOrigin(authorizationUrl, request.credentials.baseUrl);
  return followAuthorization(authorizationUrl, state, request.credentials.baseUrl, request.signal);
}

function buildAuthorizationUrl(
  endpoint: string,
  clientId: string,
  phoneNumber: string,
  state: string,
) {
  const url = new URL(endpoint);
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('prompt', 'none');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', CALLBACK);
  url.searchParams.set('login_hint', phoneNumber);
  url.searchParams.set('nonce', randomUUID());
  return url;
}

async function followAuthorization(
  authorizationUrl: URL,
  expectedState: string,
  baseUrl: string,
  signal: AbortSignal,
): Promise<{ code: string; state: string }> {
  let current = authorizationUrl;
  let cookie = '';
  for (let redirect = 0; redirect < 6; redirect += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal,
      ...(cookie ? { headers: { cookie } } : {}),
    });
    cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';', 1)[0])
      .join('; ');
    const next = redirectTarget(response, current);
    const authorization = callbackAuthorization(next, expectedState);
    if (authorization) return authorization;
    assertTrustedOrigin(next, baseUrl);
    current = next;
  }
  throw new TypeError('Nokia simulator authorization exceeded its redirect limit');
}

function redirectTarget(response: Response, current: URL) {
  const location = response.headers.get('location');
  if (!location) throw new TypeError('Nokia simulator authorization did not redirect');
  return new URL(location, current);
}

function callbackAuthorization(url: URL, expectedState: string) {
  const callback = new URL(CALLBACK);
  if (url.origin !== callback.origin || url.pathname !== callback.pathname) return null;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || state !== expectedState || url.searchParams.has('error')) {
    throw new TypeError('Nokia simulator authorization callback was invalid');
  }
  return { code, state };
}

function assertTrustedOrigin(url: URL, baseUrl: string) {
  const nokiaHost =
    url.protocol === 'https:' &&
    (url.hostname === 'nac.nokia.io' || url.hostname.endsWith('.nac.nokia.io'));
  if (url.origin !== new URL(baseUrl).origin && !nokiaHost) {
    throw new TypeError('Nokia authorization redirect is not trusted');
  }
}
