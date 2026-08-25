import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:4173';
const OUTPUT_DIR = 'specs/001-core-loop/artifacts/acceptance';
const VIEWPORT = { width: 1280, height: 720 };
const BUILD_CELLS = {
  first: { x: 683, y: 427 }, // Grid cell (6, 3) at the acceptance viewport.
  second: { x: 552, y: 454 }, // Grid cell (5, 5).
  earnedCoins: { x: 471, y: 305 }, // An additional buildable cell.
};

await mkdir(OUTPUT_DIR, { recursive: true });

const server = spawn(
  globalThis.process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '4173',
    '--strictPort',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

try {
  await waitForServer();
  const browser = await chromium.launch({ channel: 'chromium' });
  try {
    await captureVictoryFlow(browser);
    await captureDefeatFlow(browser);
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

async function captureVictoryFlow(browser) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await applyCaptureFont(page);

  await screenshot(page, 'ready.png');
  await page.mouse.click(BUILD_CELLS.first.x, BUILD_CELLS.first.y);
  await page.waitForTimeout(100);
  await screenshot(page, 'pre-start-rejection.png');

  await page.getByRole('button', { name: 'Start' }).click();
  await page.mouse.click(BUILD_CELLS.first.x, BUILD_CELLS.first.y);
  await page.mouse.click(BUILD_CELLS.second.x, BUILD_CELLS.second.y);
  await page.waitForTimeout(200);
  assert.equal(await hudValue(page, 'status'), 'Preparation');
  assert.equal(await hudValue(page, 'coins'), '0');
  assert.match(await page.locator('.hud-countdown').innerText(), /20/);
  await screenshot(page, 'preparation.png');

  await page.waitForTimeout(21_000);
  assert.equal(await hudValue(page, 'status'), 'WaveActive');
  await screenshot(page, 'wave-active.png');

  let earnedCoinsBuildCompleted = false;
  for (let elapsed = 0; elapsed < 80; elapsed += 1) {
    const status = await hudValue(page, 'status');
    const coins = Number(await hudValue(page, 'coins'));
    if (status === 'WaveActive' && coins >= 50) {
      await page.mouse.click(
        BUILD_CELLS.earnedCoins.x,
        BUILD_CELLS.earnedCoins.y,
      );
      await page.waitForTimeout(200);
      assert.equal(Number(await hudValue(page, 'coins')), coins - 50);
      await screenshot(page, 'wave-earned-build.png');
      earnedCoinsBuildCompleted = true;
      break;
    }
    assert.equal(
      status,
      'WaveActive',
      'session ended before earned-coins build',
    );
    await page.waitForTimeout(1_000);
  }
  assert.ok(
    earnedCoinsBuildCompleted,
    'earned-coins build did not occur during the active wave',
  );

  await waitForStatus(page, 'Victory');
  await screenshot(page, 'victory.png');
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForTimeout(200);
  assert.equal(await hudValue(page, 'status'), 'Ready');
  assert.equal(await hudValue(page, 'coins'), '100');
  assert.equal(await hudValue(page, 'base-hp'), '3');
  await screenshot(page, 'restarted.png');
  await page.close();
}

async function captureDefeatFlow(browser) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await applyCaptureFont(page);
  await page.getByRole('button', { name: 'Start' }).click();
  await waitForStatus(page, 'Defeat');
  await screenshot(page, 'defeat.png');
  assert.match(await page.locator('.final-overlay').innerText(), /Escaped\s+3/);
  await page.close();
}

async function waitForServer() {
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for Vite\n${output}`));
    }, 10_000);
    const handleData = (chunk) => {
      output += chunk.toString();
      if (output.includes(`Local:   ${BASE_URL}/`)) {
        cleanup();
        resolve();
      }
    };
    const handleExit = (code) => {
      cleanup();
      reject(
        new Error(`Vite exited before it became ready (${code})\n${output}`),
      );
    };
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      server.stdout.off('data', handleData);
      server.stderr.off('data', handleData);
      server.off('exit', handleExit);
    };

    server.stdout.on('data', handleData);
    server.stderr.on('data', handleData);
    server.once('exit', handleExit);
  });

  const response = await globalThis.fetch(BASE_URL);
  assert.ok(response.ok, `Vite returned HTTP ${response.status}`);
}

async function waitForStatus(page, expected) {
  await page.waitForFunction(
    (status) =>
      globalThis.document.querySelector('[data-hud="status"]')?.textContent ===
      status,
    expected,
    { timeout: 80_000 },
  );
}

async function hudValue(page, field) {
  return page.locator(`[data-hud="${field}"]`).innerText();
}

async function screenshot(page, filename) {
  await page.screenshot({ path: `${OUTPUT_DIR}/${filename}` });
}

async function applyCaptureFont(page) {
  // The CI image lacks Chromium's preferred system-ui fallback.
  await page.addStyleTag({
    content: '* { font-family: Lato, sans-serif !important; }',
  });
}
