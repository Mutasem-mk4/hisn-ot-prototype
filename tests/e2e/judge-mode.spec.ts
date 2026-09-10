import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { startScenario } from '../../scripts/browser-scenario.mjs';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.goto('/');
  await startScenario(
    context,
    page,
    baseURL ?? 'http://127.0.0.1:4321',
    'judge-valid-credentials-compromised-context',
  );
  await expect(page.getByRole('button', { name: /Run attack demonstration/ })).toBeEnabled();
});

test('explains the product immediately and exposes the primary action', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: /Stop dangerous industrial commands/i }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Run attack demonstration/i })).toBeVisible();
  await expect(
    page.getByText('An 88% pressure request exceeds the 60% safety limit.'),
  ).toBeVisible();
  const workflow = page.locator('.agent-workflow');
  await expect(workflow).toBeHidden();
  const investigation = page.locator('.investigation-details > summary');
  await investigation.focus();
  await page.keyboard.press('Enter');
  await expect(workflow).toBeVisible();
  await expect(workflow.getByText('Understand the command')).toBeVisible();
  await expect(workflow.getByText('Choose trusted evidence')).toBeVisible();
  await expect(workflow.getByText('Observe and recommend')).toBeVisible();
  await expect(workflow.getByText('Ready to investigate')).toBeVisible();
  await expect(page.getByRole('button', { name: /Run read-only inspection/i })).toContainText(
    '1 API',
  );
  const primaryAction = await page
    .getByRole('button', { name: /Run attack demonstration/i })
    .boundingBox();
  expect(primaryAction?.y).toBeLessThan(768);
});

test('runs the adaptive low-risk path with one inspectable evidence call', async ({ page }) => {
  await openDemoControls(page);
  await page.getByLabel('Simulation playback speed').selectOption('4');
  await page.getByRole('button', { name: /Run read-only inspection/i }).click();

  await expect(page.getByRole('heading', { name: 'Read-only inspection authorized.' })).toBeVisible(
    { timeout: 15_000 },
  );
  await expect(page.getByText('ALLOW', { exact: true }).first()).toBeVisible();
  const workflow = page.locator('.agent-workflow');
  await page.getByText('How was this decision made?', { exact: true }).click();
  await expect(workflow.getByText(/recorded agent steps/)).toBeVisible();
  await workflow.getByText('Show technical trace').click();
  await expect(workflow.getByText(/^Tool request/).first()).toBeVisible();
  await expect(workflow.getByText(/^Observation/).first()).toBeVisible();
  await expect(workflow.getByText('Allow recommended from recorded evidence')).toBeVisible();
  const outcome = page.locator('.outcome-facts');
  await expect(outcome).toContainText('Accepted by plant46%');
  await expect(outcome).toContainText('Physical resultNo change');

  await page.getByRole('link', { name: 'Evidence Trace' }).click();
  const table = page.getByRole('table', { name: 'Pre-decision telecom evidence calls' });
  await expect(table).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table).toContainText('Device reachability');
  const toolCount = page.locator('.tool-count');
  await expect(toolCount.locator('b')).toHaveText('1');
  await expect(toolCount.locator('span')).toHaveText('of 5 allowed tools selected');
  await expect(page.getByText('Why these network signals?')).toBeVisible();
  await expect(
    page.getByText('Confirm attachment to the expected mobile data network.', { exact: true }),
  ).toBeVisible();
});

test('supports keyboard stepping while keeping requested and actual pressure distinct', async ({
  page,
}) => {
  await openDemoControls(page);
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  await step.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Authenticated request received' })).toBeVisible();
  await step.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Gateway holds physical command' })).toBeVisible();
  const outcome = page.locator('.outcome-facts');
  await expect(outcome).toContainText('Accepted by plant46%');
  await expect(outcome).toContainText('Requested88%');
  await expect(outcome).toContainText('Physical resultUnchanged');
});

test('shows an allowed plant response followed by an intercepted unsafe command', async ({
  page,
}, testInfo) => {
  test.skip(
    !['desktop', 'projector'].includes(testInfo.project.name),
    'The full judge interaction is exercised at the presentation viewports.',
  );
  await openDemoControls(page);
  await page.getByRole('button', { name: /Run safe command/ }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.getByLabel('Simulation playback speed').selectOption('4');
  await stepProof(page, 9);
  await expect(page.getByText('ALLOW', { exact: true }).first()).toBeVisible();
  await page.getByText('Open technical view').click();
  const process = page.getByRole('heading', { name: 'Simulated process' }).locator('..');
  await expect(process).toContainText('Accepted setpoint52%');
  await expect(process).toContainText('EXECUTED');

  await page.getByRole('button', { name: 'Run simulation' }).click();
  const pressure = process
    .locator('.pressure-readout > div')
    .filter({ hasText: 'Actual pressure' })
    .locator('strong');
  await expect.poll(async () => Number.parseFloat(await pressure.innerText())).toBeGreaterThan(46);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeEnabled();
  const pausedClock = await page.locator('.facility__clock b').innerText();
  await page.waitForTimeout(400);
  await expect(page.locator('.facility__clock b')).toHaveText(pausedClock);

  await page.getByRole('button', { name: /Run attack demonstration/ }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await stepProof(page, 12);
  await expect(page.getByText('BLOCK AND CONTAIN', { exact: true }).first()).toBeVisible();
  await expect(process).toContainText('Accepted setpoint52%');
  await expect(process).toContainText('Requested setpoint88%');
  await expect(process).toContainText('BLOCKED');
  await expect(process).toContainText('ControllerBACKUP');
  await expect(process).toContainText('GatewayDETACHED');

  const readOnly = page.getByRole('button', { name: /Run read-only inspection/i });
  await expect(readOnly).toBeEnabled();
  await readOnly.click();
  await expect(page.getByRole('heading', { name: 'Read-only inspection authorized.' })).toBeVisible(
    { timeout: 15_000 },
  );
  await expect(page.getByText('ALLOW', { exact: true }).first()).toBeVisible();
  await expect(process).toContainText('Accepted setpoint46%');
  await expect(process).toContainText('GatewayOPERATIONAL');
});

test('completes the backend workflow, exposes trace, and exports the incident', async ({
  page,
}, testInfo) => {
  await openDemoControls(page);
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  for (let count = 0; count < 12; count += 1) {
    await step.click();
    if (count < 11) await expect(step).toBeEnabled();
  }
  await expect(
    page.getByRole('heading', { name: 'Unsafe command blocked. Plant setting unchanged.' }),
  ).toBeVisible();
  await expect(page.getByText('BLOCK AND CONTAIN', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Evidence Trace' }).click();
  await expect(
    page.getByRole('table', { name: 'Pre-decision telecom evidence calls' }),
  ).toBeVisible();
  await expect(page.getByText('IMPLEMENTED LOCALLY', { exact: true }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('link', { name: 'Incident' }).click();
  await expect(page.getByRole('link', { name: 'Export JSON' })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.screenshot({ path: testInfo.outputPath('incident.png'), fullPage: true });
});

test('has no serious accessibility violations or browser console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.reload();
  await expect(page.getByRole('main')).toBeVisible();
  for (const screen of ['Demo', 'Evidence Trace', 'Architecture']) {
    await page.getByRole('link', { name: screen, exact: true }).click();
    await expect(page.getByRole('main')).toBeVisible();
    await expectNoSeriousViolations(page);
  }
  for (const screen of ['operations', 'incident']) {
    await page.goto(`#${screen}`);
    await expect(page.getByRole('main')).toBeVisible();
    await expectNoSeriousViolations(page);
  }
  expect(consoleErrors).toEqual([]);
});

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );
  expect(serious).toEqual([]);
}

async function stepProof(page: Page, steps: number) {
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  for (let index = 0; index < steps; index += 1) {
    await expect(step).toBeEnabled();
    await step.click();
    await expect(page.locator('.event-sequence')).toHaveText(String(index + 2).padStart(2, '0'));
  }
}

async function openDemoControls(page: Page) {
  const controls = page.locator('.demo-controls');
  if (!(await controls.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await controls.getByText('Demo controls').click();
  }
}
