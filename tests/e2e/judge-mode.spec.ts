import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
  await expect(page.getByRole('heading', { name: /Should this operator’s 52%/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Run attack demonstration/i })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'A safety gate for remote industrial commands' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Both operators request 52%, inside the 60% hard limit. Trusted network evidence determines which command reaches the digital twin.',
    ),
  ).toBeVisible();
  const workflow = page.locator('.agent-workflow');
  await expect(workflow).toBeHidden();
  const investigation = page.locator('.investigation-details > summary');
  await investigation.focus();
  await page.keyboard.press('Enter');
  await expect(workflow).toBeVisible();
  await expect(workflow.getByText('Command held')).toBeVisible();
  await expect(workflow.getByText('Baseline network checks')).toBeVisible();
  await expect(workflow.getByText('Additional investigation')).toBeVisible();
  await expect(workflow.getByText('Policy decision')).toBeVisible();
  await expect(workflow.getByText('Ready to investigate')).toBeVisible();
  await expect(page.getByRole('button', { name: /Run read-only inspection/i })).toContainText(
    '1 API',
  );
  const primaryAction = await page
    .getByRole('button', { name: /Run attack demonstration/i })
    .boundingBox();
  expect(primaryAction?.y).toBeLessThan(768);
});

test('shows a real-provider comparison without adding it to the primary demo flow', async ({
  page,
}) => {
  await page.route('**/api/v1/connected-verification', async (route) => {
    await route.fulfill({
      json:
        route.request().method() === 'GET' ? connectedPreflight() : connectedComparisonResponse(),
    });
  });
  await page.reload();
  const proof = page.locator('.connected-proof');
  await expect(proof.getByRole('heading', { name: /real Nokia evidence/i })).toBeHidden();
  await proof.getByText('Verify real API calls', { exact: true }).click();
  await expect(proof.getByText('Nokia configured')).toBeVisible();
  await proof.getByRole('button', { name: 'Compare Nokia responses' }).click();
  await expect(
    proof.getByRole('heading', { name: 'Same request, different network evidence' }),
  ).toBeVisible();
  await expect(proof.getByText('52% requested in both')).toBeVisible();
  await expect(proof.getByText('1 compromise signal returned')).toBeVisible();
  await expect(proof.getByText('3 compromise signals returned')).toBeVisible();
  await expect(proof.getByText('Not verified · simulator OAuth', { exact: true })).toBeVisible();
  await expect(proof.getByText('Verified · simulator OAuth', { exact: true })).toBeVisible();
  await expect(proof.getByText('Outside approved area')).toBeVisible();
});

test('replay gives judges time to read and respects pause and speed changes', async ({ page }) => {
  await openDemoControls(page);
  await expect(page.getByLabel('Simulation playback speed')).toHaveValue('0.5');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole('button', { name: /Run attack demonstration/ }).click();
  await openDemoControls(page);
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeEnabled();
  const sequence = page.locator('.event-sequence');
  await expect(sequence).toHaveText('01');
  await page.clock.runFor(2999);
  await expect(sequence).toHaveText('01');
  await page.clock.runFor(1);
  await expect(sequence).toHaveText('02');
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.clock.runFor(6000);
  await expect(sequence).toHaveText('02');
  await page.getByLabel('Simulation playback speed').selectOption('4');
  await page.getByRole('button', { name: 'Run simulation' }).click();
  await page.clock.runFor(375);
  await expect(sequence).toHaveText('03');
  await page.clock.runFor(10000);
  const finalSequence = await sequence.textContent();
  await expect(page.locator('.judge-result')).toContainText('BLOCK AND CONTAIN');
  await page.clock.runFor(10000);
  await expect(sequence).toHaveText(finalSequence!);
});

test('shows an agent failure immediately even when the presentation clock is paused', async ({
  page,
}) => {
  await page.route('**/api/v1/judge-run/rehearsal', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const failed = body.frames.at(-1);
    failed.run.playbackStatus = 'FAILED_SAFE';
    failed.run.workflowState = 'FAILED_SAFE';
    failed.integration.agentReasoner = 'UNAVAILABLE';
    failed.artifacts = {};
    failed.currentEvent = {
      ...failed.currentEvent,
      workflowState: 'FAILED_SAFE',
      payload: { errorCode: 'AGENT_UNAVAILABLE', failureReason: 'HTTP_429' },
    };
    await route.fulfill({ json: { frames: [body.frames[0], failed], incident: null } });
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole('button', { name: /Run attack demonstration/ }).click();
  await expect(
    page.getByRole('heading', {
      name: 'AI service temporarily unavailable. Command held.',
    }),
  ).toBeVisible();
  await expect(page.locator('.outcome-facts')).toContainText('Accepted plant setting46% unchanged');
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
  await expect(workflow.getByText('Allow issued by deterministic policy')).toBeVisible();
  const outcome = page.locator('.outcome-facts');
  await expect(outcome).toContainText('AI recommendationAllow');
  await expect(outcome).toContainText('Policy decisionAllow');
  await expect(outcome).toContainText('Accepted plant settingNo change');

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
  await expect(outcome).toContainText('Requested52%');
  await expect(outcome).toContainText('Hard limitPassed · ≤60%');
  await expect(outcome).toContainText('Accepted plant setting46% current');
});

test('shows an allowed plant response followed by an intercepted unsafe command', async ({
  page,
}, testInfo) => {
  test.skip(
    !['desktop', 'projector'].includes(testInfo.project.name),
    'The full judge interaction is exercised at the presentation viewports.',
  );
  await openDemoControls(page);
  const demoControls = page.locator('.demo-controls');
  await page.getByRole('button', { name: /Run trusted comparison/ }).click();
  await expect.poll(() => isOpen(demoControls)).toBe(false);
  await openDemoControls(page);
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
  const comparison = page.getByRole('region', {
    name: 'Same 52% command, different authorization',
  });
  await expect(comparison).toContainText('Trusted contextALLOW', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeEnabled();
  const pausedClock = await page.locator('.facility__clock b').innerText();
  await page.waitForTimeout(400);
  await expect(page.locator('.facility__clock b')).toHaveText(pausedClock);

  await page.getByRole('button', { name: /Run attack demonstration/ }).click();
  await expect.poll(() => isOpen(demoControls)).toBe(false);
  await openDemoControls(page);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await stepProof(page, 12);
  await expect(page.getByText('BLOCK AND CONTAIN', { exact: true }).first()).toBeVisible();
  await expect(process).toContainText('Accepted setpoint52%');
  await expect(process).toContainText('Requested setpoint52%');
  await expect(process).toContainText('BLOCKED');
  await expect(process).toContainText('ControllerBACKUP');
  await expect(process).toContainText('GatewayDETACHED');

  await expect(comparison).toContainText('Compromised context');
  await expect(comparison).toContainText('BLOCK AND CONTAIN');
  await expect(comparison).toContainText('Trusted context');
  await expect(comparison).toContainText('ALLOW');
  await expect(comparison.getByText(/hisn-/)).toHaveCount(2);
  await expect(comparison.getByText('IMPLEMENTED LOCALLY')).toHaveCount(2);

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
    page.getByRole('heading', { name: 'Network compromise blocked the command. Plant unchanged.' }),
  ).toBeVisible();
  await expect(page.locator('.judge-result')).toContainText('Gateway isolation status: Succeeded.');
  await expect(page.getByText('BLOCK AND CONTAIN', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Evidence Trace' }).click();
  await expect(
    page.getByRole('table', { name: 'Pre-decision telecom evidence calls' }),
  ).toBeVisible();
  await expect(page.getByText('IMPLEMENTED LOCALLY', { exact: true }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('link', { name: 'Incident' }).click();
  await expect(page.getByRole('link', { name: 'Export JSON' })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export JSON' }).click();
  const download = await downloaded;
  const report = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(report.authoritativeDecision.state).toBe('BLOCK_AND_CONTAIN');
  expect(download.suggestedFilename()).toContain(report.correlationId);
  expect(report.identityAndNetworkEvidence.length).toBeGreaterThanOrEqual(4);
  expect(
    report.identityAndNetworkEvidence.every(
      (call: { correlationId: string }) => call.correlationId === report.correlationId,
    ),
  ).toBe(true);
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
  if (!(await isOpen(controls))) {
    await controls.getByText('Demo controls').click();
  }
}

async function isOpen(controls: Locator) {
  return controls.evaluate((element) => (element as HTMLDetailsElement).open);
}

function connectedPreflight() {
  return {
    groqConfigured: true,
    nokiaConfigured: true,
    subscriberAuthorizationConfigured: false,
    subscriberAuthorizationMode: 'SIMULATOR_FAST_OAUTH',
    environment: 'SANDBOX',
    fallbackAllowed: false,
    enforcementExecuted: false,
  };
}

function connectedComparisonResponse() {
  const command = {
    kind: 'SET_PRESSURE',
    requestedSetpointPercent: 52,
    reason: 'Judge-requested production increase',
  };
  const execution = (context: 'A' | 'B') => ({
    ...connectedPreflight(),
    stage: 'evidence',
    context,
    correlationId: `connected-${context.toLowerCase()}`,
    command,
    collectionMethod: 'FIXED_PROVIDER_PROBE',
    evidence: connectedEvidence(context),
    assessment: {
      unknown: [],
      failures:
        context === 'A'
          ? ['Number is not verified']
          : [
              'Recent SIM swap violates critical-command policy',
              'Recent device swap violates critical-command policy',
              'Device is outside the approved facility geofence',
            ],
      compromised:
        context === 'A'
          ? ['NUMBER_VERIFICATION']
          : ['SIM_SWAP', 'DEVICE_SWAP', 'LOCATION_VERIFICATION'],
    },
  });
  return {
    ...connectedPreflight(),
    stage: 'evidence-comparison',
    command,
    executions: [execution('A'), execution('B')],
  };
}

function connectedEvidence(context: 'A' | 'B') {
  const adverse = context === 'B';
  const call = (
    tool: string,
    redactedResult: Record<string, unknown>,
    requestStatus = 'SUCCEEDED',
    provenance = 'SANDBOX',
  ) => ({
    id: `${context}-${tool}`,
    tool,
    purpose: `Connected check for ${tool}`,
    requestStatus,
    redactedResult,
    provenance,
    latencyMs: 120,
    timestamp: '2026-09-11T03:02:17.000Z',
    correlationId: `connected-${context.toLowerCase()}`,
  });
  return [
    call('NUMBER_VERIFICATION', {
      verified: adverse,
      authorizationFlow: 'SIMULATOR_FAST_OAUTH',
    }),
    call('SIM_SWAP', { swapped: adverse }),
    call('DEVICE_SWAP', { swapped: adverse }),
    call('LOCATION_VERIFICATION', { verificationResult: adverse ? 'FALSE' : 'TRUE' }),
    call('DEVICE_REACHABILITY', { reachable: true, connectivity: [adverse ? 'SMS' : 'DATA'] }),
  ];
}
