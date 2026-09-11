import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { loadConfiguration } from '../../src/infrastructure/configuration.js';
import { verifyConnectedContext } from '../../src/infrastructure/connected-verification.js';

describe('direct connected evidence diagnostic', () => {
  it('uses provider responses for the same command and exposes missing subscriber authorization', async () => {
    const provider = createServer((request, response) => {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk: string) => {
        body += chunk;
      });
      request.on('end', () => {
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
      const first = await verifyConnectedContext(configuration, {
        context: 'A',
        stage: 'evidence',
      });
      const second = await verifyConnectedContext(configuration, {
        context: 'B',
        stage: 'evidence',
      });
      expect(first.command).toEqual(second.command);
      expect(first.command.requestedSetpointPercent).toBe(52);
      if (first.stage !== 'evidence' || second.stage !== 'evidence')
        throw new Error('Expected evidence probe');
      expect(first.assessment.compromised).toEqual([]);
      expect(second.assessment.compromised).toEqual(
        expect.arrayContaining(['SIM_SWAP', 'DEVICE_SWAP', 'LOCATION_VERIFICATION']),
      );
      for (const execution of [first, second]) {
        expect(execution.enforcementExecuted).toBe(false);
        expect(execution.evidence.filter((call) => call.provenance === 'SANDBOX')).toHaveLength(4);
        expect(
          execution.evidence.find((call) => call.tool === 'NUMBER_VERIFICATION'),
        ).toMatchObject({
          requestStatus: 'UNAVAILABLE',
          provenance: 'UNAVAILABLE',
          redactedResult: {
            failureCode: 'SUBSCRIBER_AUTHORIZATION_REQUIRED',
            externalRequestMade: false,
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
