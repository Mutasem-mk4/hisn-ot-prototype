import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { IncidentReportSchema } from '../src/shared/contracts.ts';
import { startScenario } from './browser-scenario.mjs';

const baseURL = process.env.HISN_VISUAL_URL ?? 'http://127.0.0.1:4310';
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const measurements = [];
try {
  await page.goto('/');
  for (let index = 0; index < 4; index++) {
    if (index === 3) {
      await page.getByRole('link', { name: 'Architecture', exact: true }).click();
      await page.getByRole('button', { name: 'Run degraded-provider proof' }).click();
    } else {
      await startScenario(context, page, baseURL, 'judge-valid-credentials-compromised-context');
      await page.getByRole('link', { name: 'Judge Mode', exact: true }).click();
    }
    await page.getByRole('combobox', { name: 'Simulation playback speed' }).selectOption('2');
    const started = performance.now();
    await page.getByRole('button', { name: 'Run simulation' }).click();
    // The browser waits on an actual persisted workflow outcome; it does not drive story steps.
    await page
      .getByRole('heading', { name: 'Evidence-bound incident record sealed' })
      .waitFor({ timeout: 65_000 });
    const elapsedMs = Math.round(performance.now() - started);
    await page.reload();
    await page.getByRole('link', { name: 'Incident', exact: true }).click();
    const link = page.getByRole('link', { name: 'Export JSON' });
    await link.waitFor();
    const report = IncidentReportSchema.parse(
      await (await context.request.get(await link.getAttribute('href'))).json(),
    );
    assert.equal(report.authoritativeDecision.state, index === 3 ? 'BLOCK' : 'BLOCK_AND_CONTAIN');
    assert.equal(report.continuityMeasurements.unsafeCommandsExecuted, 0);
    assert.ok(report.continuityMeasurements.observationDurationMs > 0);
    assert.ok(report.continuityMeasurements.backupHeartbeatsObserved > 0);
    if (index === 3) assert.equal(report.networkEnforcement.length, 0);
    else
      assert.equal(
        report.networkEnforcement.filter((call) => call.status === 'SUCCEEDED').length,
        3,
      );
    measurements.push({
      run: index + 1,
      correlationId: report.correlationId,
      mode: report.runtimeMode,
      speed: 2,
      elapsedMs,
      decision: report.authoritativeDecision.state,
      continuity: report.continuityMeasurements,
    });
    process.stdout.write(`${JSON.stringify(measurements.at(-1))}\n`);
  }
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/browser-rehearsals.json',
    JSON.stringify({ observedAt: new Date().toISOString(), measurements }, null, 2) + '\n',
  );
} finally {
  await browser.close();
}
