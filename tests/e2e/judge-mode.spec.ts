import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Reset/i })).toBeVisible();
  await page.getByRole('button', { name: /Reset/i }).click();
  await expect(page.getByRole('button', { name: 'Advance one backend event' })).toBeEnabled();
});

test('explains the product immediately and exposes the primary action', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: /No critical command becomes a physical action/i }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Run Judge Scenario/i })).toBeVisible();
  await expect(
    page.getByText('The attacker had valid credentials—and still failed.'),
  ).toBeVisible();
});

test('supports keyboard stepping while keeping requested and actual pressure distinct', async ({
  page,
}) => {
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  await step.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Authenticated request received' })).toBeVisible();
  await step.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Gateway holds physical command' })).toBeVisible();
  const instrument = page.getByRole('heading', { name: 'Physical state' }).locator('..');
  await expect(instrument).toContainText('46.0%');
  await expect(instrument).toContainText('88%');
  await expect(instrument).toContainText('Held at HISN Gateway');
});

test('completes the backend workflow, exposes trace, and exports the incident', async ({
  page,
}, testInfo) => {
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  for (let count = 0; count < 12; count += 1) {
    await step.click();
    if (count < 11) await expect(step).toBeEnabled();
  }
  await expect(
    page.getByRole('heading', { name: 'Evidence-bound incident record sealed' }),
  ).toBeVisible();
  await expect(page.getByText('BLOCK AND CONTAIN', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Evidence Trace' }).click();
  await expect(
    page.getByRole('table', { name: 'Pre-decision telecom evidence calls' }),
  ).toBeVisible();
  await expect(page.getByText('SIMULATED', { exact: true }).first()).toBeVisible();
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
  for (const screen of [
    'Judge Mode',
    'Live Operations',
    'Evidence Trace',
    'Incident',
    'Architecture',
  ]) {
    await page.getByRole('link', { name: screen, exact: true }).click();
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
