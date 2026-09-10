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
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  await startScenario(context, page, baseURL, 'judge-safe-operating-change');
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
  await page.getByRole('button', { name: /Submit unsafe change/ }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeEnabled();
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
  await page.getByRole('link', { name: 'Incident' }).click();
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
