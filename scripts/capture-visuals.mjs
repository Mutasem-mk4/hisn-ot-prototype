import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output = new URL('../artifacts/visual-qa/', import.meta.url);
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
  await page.goto('http://127.0.0.1:4310/');
  const reset = page.getByRole('button', { name: 'Reset scenario' });
  await reset.click();
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.screenshot({
    path: new URL(`judge-${target.name}.png`, output).pathname.slice(1),
    fullPage: true,
  });
  const step = page.getByRole('button', { name: 'Advance one backend event' });
  for (let count = 0; count < 8; count += 1) {
    await step.click();
    await step.waitFor({ state: 'visible' });
  }
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.screenshot({
    path: new URL(`decision-${target.name}.png`, output).pathname.slice(1),
    fullPage: true,
  });
  for (let count = 0; count < 4; count += 1) {
    await step.click();
    if (count < 3) await step.waitFor({ state: 'visible' });
  }
  await page.getByRole('link', { name: 'Incident' }).click();
  await page.getByRole('link', { name: 'Export JSON' }).waitFor();
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.screenshot({
    path: new URL(`incident-${target.name}.png`, output).pathname.slice(1),
    fullPage: true,
  });
  if (errors.length > 0) throw new Error(`${target.name} console errors: ${errors.join('; ')}`);
  await context.close();
}

await browser.close();
