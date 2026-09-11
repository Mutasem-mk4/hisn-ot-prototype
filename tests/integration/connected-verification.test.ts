import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { loadConfiguration } from '../../src/infrastructure/configuration.js';
import { verifyConnectedEvidenceComparison } from '../../src/infrastructure/connected-verification.js';

describe('direct connected evidence diagnostic', () => {
  it('uses simulator OAuth and five provider responses for each comparison context', async () => {
    const provider = createServer((request, response) => {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk: string) => {
        body += chunk;
      });
      request.on('end', () => {
        const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);
        if (requestUrl.pathname === '/oauth2/v1/auth/clientcredentials') {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(
            JSON.stringify({ client_id: 'simulator-client', client_secret: 'redacted' }),
          );
          return;
        }
        if (requestUrl.pathname === '/.well-known/oauth-authorization-server') {
          const origin = `http://${request.headers.host}`;
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(
            JSON.stringify({
              authorization_endpoint: `${origin}/oauth2/v1/authorize`,
              token_endpoint: `${origin}/oauth2/v1/token`,
              fast_flow_csp_auth_endpoint: `${origin}/oauth2/v1/retrieve_csp_auth_url`,
            }),
          );
          return;
        }
        if (requestUrl.pathname === '/oauth2/v1/retrieve_csp_auth_url') {
          const redirect = new URL(requestUrl.searchParams.get('redirect_uri')!);
          redirect.searchParams.set('code', 'single-use-simulator-code');
          redirect.searchParams.set('state', requestUrl.searchParams.get('state')!);
          response.writeHead(302, { location: redirect.toString() });
          response.end();
          return;
        }
        if (requestUrl.pathname.includes('/number-verification/')) {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(
            JSON.stringify({ devicePhoneNumberVerified: body.includes('+99999991000') }),
          );
          return;
        }
        const adverse = body.includes('+99999991000');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            swapped: adverse,
            verificationResult: adverse ? 'FALSE' : 'TRUE',
            matchRate: 100,
            reachable: true,
            connectivity: ['DATA'],
            lastStatusTime: new Date().toISOString(),
          }),
        );
      });
    });
    provider.listen(0, '127.0.0.1');
    await once(provider, 'listening');
    try {
      const configuration = loadConfiguration(
        {
          HISN_MODE: 'DEMO',
          HISN_NOKIA_SIMULATOR: 'true',
          NOKIA_NAC_BASE_URL: `http://127.0.0.1:${(provider.address() as AddressInfo).port}`,
          NOKIA_NAC_API_KEY: 'test-api-key',
          HISN_OPERATOR_PHONE: '+99999991001',
          HISN_BACKUP_PHONE: '+99999991001',
          HISN_APP_SERVER_IPV4: '192.0.2.1',
          HISN_GEOFENCE_LATITUDE: '29.5267',
          HISN_GEOFENCE_LONGITUDE: '35.0078',
          HISN_GEOFENCE_RADIUS_METERS: '500',
        },
        process.cwd(),
      );
      const comparison = await verifyConnectedEvidenceComparison(configuration);
      const [first, second] = comparison.executions;
      expect(comparison.stage).toBe('evidence-comparison');
      expect(first.command).toEqual(second.command);
      expect(first.command.requestedSetpointPercent).toBe(52);
      if (first.stage !== 'evidence' || second.stage !== 'evidence')
        throw new Error('Expected evidence probe');
      expect(first.assessment.compromised).toEqual(['NUMBER_VERIFICATION']);
      expect(second.assessment.compromised).toEqual(
        expect.arrayContaining(['SIM_SWAP', 'DEVICE_SWAP', 'LOCATION_VERIFICATION']),
      );
      for (const execution of [first, second]) {
        expect(execution.enforcementExecuted).toBe(false);
        expect(execution.evidence.filter((call) => call.provenance === 'SANDBOX')).toHaveLength(5);
        expect(
          execution.evidence.find((call) => call.tool === 'NUMBER_VERIFICATION'),
        ).toMatchObject({
          requestStatus: 'SUCCEEDED',
          provenance: 'SANDBOX',
          redactedResult: {
            authorizationFlow: 'SIMULATOR_FAST_OAUTH',
          },
        });
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        provider.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
