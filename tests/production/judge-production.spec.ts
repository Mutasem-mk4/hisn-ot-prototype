import { expect, test, type Page } from '@playwright/test';

type ProductionFrame = {
  run: { playbackStatus: string };
  currentEvent?: { workflowState: string; payload: Record<string, unknown> };
};

test('production deployment serves the application and completes the attack proof safely', async ({
  page,
  request,
}) => {
  const health = await request.get('/healthz');
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: 'ok', service: 'hisn-ot' });

  const readiness = await request.get('/readyz');
  expect(readiness.status()).toBe(200);
  expect(await readiness.json()).toMatchObject({ status: 'ready' });

  const root = await request.get('/');
  expect(root.status()).toBe(200);
  const html = await root.text();
  const scriptPath = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
  expect(scriptPath, 'The production HTML should reference its JavaScript bundle').toBeTruthy();
  const script = await request.get(scriptPath!);
  expect(script.status()).toBe(200);
  expect(script.headers()['content-type']).toContain('javascript');

  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/#judge', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: /Stop dangerous industrial commands/i }),
  ).toBeVisible();
  await expect(page.getByText('desalination-safety-2026.4')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);

  const controls = page.locator('.demo-controls');
  if (!(await controls.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await controls.getByText('Demo controls').click();
  }
  await page.getByLabel('Simulation playback speed').selectOption('4');
  const finalFrame = await runScenario(
    page,
    /Run attack demonstration/i,
    /Unsafe command blocked\. Plant setting unchanged\./,
  );
  expect(finalFrame.run.playbackStatus).toBe('COMPLETE');

  const outcome = (await page.locator('.outcome-facts').innerText()).replaceAll('\n', ' ');
  expect(outcome).toMatch(/Requested 88%/i);
  expect(outcome).toMatch(/Physical result (Unchanged|Held)/i);

  const evidence = (await page.locator('.external-proof').innerText()).replaceAll('\n', ' ');
  const headline = await page.locator('#judge-result-heading').innerText();
  const diagnostics = {
    playbackStatus: finalFrame?.run.playbackStatus,
    workflowState: finalFrame?.currentEvent?.workflowState,
    errorCode: finalFrame?.currentEvent?.payload.errorCode,
    failureReason: finalFrame?.currentEvent?.payload.failureReason,
    failedAfter: finalFrame?.currentEvent?.payload.failedAfter,
  };
  console.log(
    `PRODUCTION_REHEARSAL ${JSON.stringify({ headline, outcome, evidence, diagnostics })}`,
  );

  await page.getByRole('link', { name: 'Evidence Trace', exact: true }).click();
  const evidenceTable = page.getByRole('table', { name: 'Pre-decision telecom evidence calls' });
  await expect(evidenceTable).toBeVisible();
  await expect(evidenceTable.locator('tbody tr')).toHaveCount(5);
  await expect(
    page.getByRole('heading', { name: 'Goal → tool → observation → adaptation' }),
  ).toBeVisible();
  await expect(evidenceTable).toContainText('Latency');
  await expect(evidenceTable).toContainText('Correlation');
  await page.getByRole('link', { name: /Open the sealed incident report/ }).click();
  await expect(page.getByRole('link', { name: 'Export JSON' })).toBeVisible();
  for (const heading of [
    'Agent action trace',
    'Network proof',
    'Enforcement record',
    'Recovery requirements',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await page.getByRole('link', { name: 'Demo', exact: true }).click();
  const readOnlyFrame = await runScenario(
    page,
    /Run read-only inspection/i,
    /Read-only inspection authorized\./,
  );
  expect(readOnlyFrame.run.playbackStatus).toBe('COMPLETE');
  await expect(page.getByText('ALLOW', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.outcome-facts')).toContainText('No change');

  const safeFrame = await runScenario(page, /Run safe command/i, /Safe command authorized\./);
  expect(safeFrame.run.playbackStatus).toBe('COMPLETE');
  await expect(page.getByText('ALLOW', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.outcome-facts')).toContainText('52%');
  expect(consoleErrors).toEqual([]);
});

async function runScenario(page: Page, buttonName: RegExp, expectedHeadline: RegExp) {
  const button = page.getByRole('button', { name: buttonName });
  await expect(button).toBeEnabled();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/v1/judge-run/rehearsal'),
  );
  await button.click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { frames: ProductionFrame[] };
  const finalFrame = body.frames.at(-1);
  expect(finalFrame).toBeTruthy();
  if (finalFrame?.run.playbackStatus === 'FAILED_SAFE') {
    const failure = {
      errorCode: finalFrame.currentEvent?.payload.errorCode,
      failureReason: finalFrame.currentEvent?.payload.failureReason,
      failedAfter: finalFrame.currentEvent?.payload.failedAfter,
    };
    throw new Error(`Production scenario failed safe: ${JSON.stringify(failure)}`);
  }
  await expect
    .poll(() => page.locator('#judge-result-heading').innerText(), { timeout: 120_000 })
    .toMatch(expectedHeadline);
  return finalFrame!;
}
