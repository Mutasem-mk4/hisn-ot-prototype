import { mkdir } from 'node:fs/promises';
import process from 'node:process';
import { chromium, expect } from '@playwright/test';
import { startScenario } from './browser-scenario.mjs';

const output = new URL('../artifacts/visual-qa/', import.meta.url);
const baseURL = process.env.HISN_VISUAL_URL ?? 'http://127.0.0.1:4310/';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();

for (const target of [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'projector', viewport: { width: 1280, height: 720 } },
  { name: 'tablet', viewport: { width: 820, height: 1180 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
]) {
  const context = await browser.newContext({
    viewport: target.viewport,
    isMobile: target.isMobile ?? false,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(baseURL);
  await startScenario(context, page, baseURL, 'judge-safe-operating-change');
  const controls = page.locator('.demo-controls');
  if (!(await controls.evaluate((element) => /** @type {HTMLDetailsElement} */ (element).open))) {
    await controls.getByText('Demo controls').click();
  }
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  await expect(step).toBeEnabled();
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: new URL(`judge-${target.name}.png`, output).pathname.slice(1),
    fullPage: true,
  });
  for (let count = 0; count < 9; count += 1) {
    await step.click();
    if (count < 8) await expect(step).toBeEnabled();
  }
  await page.getByRole('button', { name: 'Run simulation' }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeEnabled();
  await page.waitForTimeout(1_200);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeEnabled();
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: new URL(`allowed-${target.name}.png`, output).pathname.slice(1),
    fullPage: true,
  });
  // Start the attack from its own 46% baseline so the captured proof cannot
  // inherit the accepted 52% state from the positive-control scenario above.
  await startScenario(context, page, baseURL, 'judge-valid-credentials-compromised-context');
  if (!(await controls.evaluate((element) => /** @type {HTMLDetailsElement} */ (element).open))) {
    await controls.getByText('Demo controls').click();
  }
  await expect(step).toBeEnabled();
  for (let count = 0; count < 8; count += 1) {
    await step.click();
    await expect(step).toBeEnabled();
  }
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: new URL(`decision-${target.name}.png`, output).pathname.slice(1),
    fullPage: true,
  });
  for (let count = 0; count < 4; count += 1) {
    await step.click();
    if (count < 3) await expect(step).toBeEnabled();
  }
  await page.evaluate(() => {
    globalThis.location.hash = '#incident';
  });
  await page.getByRole('link', { name: 'Export JSON' }).waitFor();
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: new URL(`incident-${target.name}.png`, output).pathname.slice(1),
    fullPage: true,
  });
  if (errors.length > 0) throw new Error(`${target.name} console errors: ${errors.join('; ')}`);
  await context.close();
}

await browser.close();
