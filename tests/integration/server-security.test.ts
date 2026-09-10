import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server/app.js';
import { EventHub } from '../../src/server/event-hub.js';
import type { AppConfiguration } from '../../src/infrastructure/configuration.js';
import { createHarness } from '../helpers/harness.js';
import { testPolicy, testScenario } from '../helpers/fixtures.js';

describe('server security boundary', () => {
  let harness: ReturnType<typeof createHarness>;
  let server: Awaited<ReturnType<typeof buildServer>>;
  let configuration: AppConfiguration;

  beforeEach(async () => {
    harness = createHarness();
    configuration = {
      mode: 'DEMO',
      port: 4310,
      databasePath: ':memory:',
      logLevel: 'silent',
      sessionSecret: 'test-session-signing-key-at-least-32-characters',
      secureCookies: false,
      policy: testPolicy(),
      scenarios: [testScenario(), testScenario('judge-degraded-provider')],
      nac: null,
      llm: null,
    };
    server = await buildServer(configuration, harness.orchestrator, new EventHub());
  });

  afterEach(async () => {
    await server.close();
    harness.close();
  });

  it('requires a server session for protected data', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/v1/judge-run' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it.each(['SANDBOX', 'LIVE'] as const)(
    'does not grant anonymous demo authority in %s mode',
    async (mode) => {
      const external = await buildServer(
        {
          mode,
          port: 4310,
          databasePath: ':memory:',
          logLevel: 'silent',
          sessionSecret: configuration.sessionSecret,
          secureCookies: false,
          policy: testPolicy(),
          scenarios: [testScenario()],
          nac: null,
          llm: null,
        },
        harness.orchestrator,
        new EventHub(),
      );
      try {
        expect((await external.inject({ method: 'GET', url: '/api/v1/session' })).statusCode).toBe(
          403,
        );
        expect(
          (
            await external.inject({
              method: 'POST',
              url: '/api/v1/judge-run/control',
              payload: { action: 'NEXT' },
            })
          ).statusCode,
        ).toBe(403);
      } finally {
        await external.close();
      }
    },
  );

  it('rejects mutations without the session CSRF token', async () => {
    const sessionResponse = await server.inject({ method: 'GET', url: '/api/v1/session' });
    const cookie = sessionResponse.headers['set-cookie'];
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/judge-run/control',
      headers: { cookie },
      payload: { action: 'NEXT' },
    });
    expect(response.statusCode).toBe(403);
  });

  it('validates every control request at the API boundary', async () => {
    const sessionResponse = await server.inject({ method: 'GET', url: '/api/v1/session' });
    const cookie = sessionResponse.headers['set-cookie'];
    const csrfToken = sessionResponse.json().csrfToken as string;
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/judge-run/control',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { action: 'EXECUTE_PLC' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('COMMAND_INVALID');
  });

  it('keeps CSRF data out of the session cookie and applies a restrictive CSP', async () => {
    const sessionResponse = await server.inject({ method: 'GET', url: '/api/v1/session' });
    expect(sessionResponse.headers['set-cookie']).not.toContain(
      sessionResponse.json().csrfToken as string,
    );
    expect(sessionResponse.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('accepts a signed session across server instances sharing the configured secret', async () => {
    const sessionResponse = await server.inject({ method: 'GET', url: '/api/v1/session' });
    const secondServer = await buildServer(configuration, harness.orchestrator, new EventHub());
    try {
      const response = await secondServer.inject({
        method: 'GET',
        url: '/api/v1/judge-run',
        headers: { cookie: sessionResponse.headers['set-cookie'] },
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await secondServer.close();
    }
  });

  it('rejects a tampered signed session', async () => {
    const sessionResponse = await server.inject({ method: 'GET', url: '/api/v1/session' });
    const cookie = String(sessionResponse.headers['set-cookie']).replace(
      'hisn_session=',
      'hisn_session=x',
    );
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/judge-run',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns a complete, incident-backed rehearsal in one authenticated request', async () => {
    const sessionResponse = await server.inject({ method: 'GET', url: '/api/v1/session' });
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/judge-run/rehearsal',
      headers: {
        cookie: sessionResponse.headers['set-cookie'],
        'x-csrf-token': sessionResponse.json().csrfToken as string,
      },
      payload: {
        scenarioId: 'judge-valid-credentials-compromised-context',
        idempotencyKey: crypto.randomUUID(),
      },
    });
    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result.frames[0].run.workflowState).toBeNull();
    expect(result.frames.at(-1).run.workflowState).toBe('INCIDENT_REPORTED');
    expect(result.incident.authoritativeDecision.state).toBe('BLOCK_AND_CONTAIN');
  });
});
