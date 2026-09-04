import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server/app.js';
import { EventHub } from '../../src/server/event-hub.js';
import type { AppConfiguration } from '../../src/infrastructure/configuration.js';
import { createHarness } from '../helpers/harness.js';
import { testPolicy, testScenario } from '../helpers/fixtures.js';

describe('server security boundary', () => {
  let harness: ReturnType<typeof createHarness>;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    harness = createHarness();
    const configuration: AppConfiguration = {
      mode: 'DEMO',
      port: 4310,
      databasePath: ':memory:',
      logLevel: 'silent',
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
});
