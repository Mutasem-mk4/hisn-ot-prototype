import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const SessionResponseSchema = z.object({ csrfToken: z.string() });

/**
 * @param {import('@playwright/test').BrowserContext} context
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL
 * @param {string} scenarioId
 */
export async function startScenario(context, page, baseURL, scenarioId) {
  const sessionResponse = await context.request.get(new URL('/api/v1/session', baseURL).href);
  assert.equal(sessionResponse.ok(), true, 'Could not establish a browser rehearsal session');
  const session = SessionResponseSchema.parse(await sessionResponse.json());
  const createResponse = await context.request.post(new URL('/api/v1/judge-run', baseURL).href, {
    headers: { 'x-csrf-token': session.csrfToken },
    data: { scenarioId, idempotencyKey: randomUUID() },
  });
  assert.equal(createResponse.ok(), true, `Could not start scenario ${scenarioId}`);
  await page.reload();
}
