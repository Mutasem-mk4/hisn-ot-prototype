import { expect, test } from '@playwright/test';

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
  const attack = page.getByRole('button', { name: /Run attack demonstration/i });
  await expect(attack).toBeEnabled();
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
  const rehearsalResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/v1/judge-run/rehearsal'),
  );
  const primaryAction = page.locator('button.scenario-action--primary');
  await attack.click();
  await expect(primaryAction).toBeDisabled();
  const rehearsal = await rehearsalResponse;
  expect(rehearsal.status()).toBe(200);
  const rehearsalBody = (await rehearsal.json()) as {
    frames: Array<{
      run: { playbackStatus: string };
      currentEvent?: { workflowState: string; payload: Record<string, unknown> };
    }>;
  };
  const finalFrame = rehearsalBody.frames.at(-1);
  expect(finalFrame).toBeTruthy();
  await expect(primaryAction).toBeEnabled({ timeout: 120_000 });

  const resultHeading = page.locator('#judge-result-heading');
  await expect
    .poll(() => resultHeading.innerText(), { timeout: 120_000 })
    .toMatch(/Unsafe command blocked|AI unavailable\. Command held safely\./);

  const outcome = (await page.locator('.outcome-facts').innerText()).replaceAll('\n', ' ');
  expect(outcome).toMatch(/Requested 88%/i);
  expect(outcome).toMatch(/Physical result (Unchanged|Held)/i);

  const evidence = (await page.locator('.external-proof').innerText()).replaceAll('\n', ' ');
  const headline = await resultHeading.innerText();
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
  expect(consoleErrors).toEqual([]);
});
