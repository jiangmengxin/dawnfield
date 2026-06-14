#!/usr/bin/env node
// Drive the DEV-only weapon evaluation bench from a running Vite server.
// Requires Playwright to be resolvable by Node (Codex bundled runtime works via NODE_PATH).
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (err) {
  console.error('Unable to load Playwright. Run with NODE_PATH pointing at a Playwright install.');
  console.error(String(err?.message ?? err));
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const url = value('--url', 'http://127.0.0.1:5183');
const timeoutMs = Number(value('--timeout-ms', String(12 * 60 * 1000)));
const simSeconds = value('--sim-seconds', undefined);
const rounds = value('--rounds', undefined);
const ids = value('--ids', undefined);
const outData = value('--out-data', 'docs/balance/weapon-evaluation-32-data.json');
const outMarkdown = value('--out-markdown', 'docs/balance/weapon-evaluation-32-bench.generated.md');
const runDps = has('--dps') || !has('--visual');
const runVisual = has('--visual') || !has('--dps');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const outputPath = (p) => (isAbsolute(p) ? p : join(root, p));

async function waitForApp(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__game?.scene?.getScene('title')), null, { timeout: 30000 });
}

async function startBench(page, config) {
  await page.evaluate((cfg) => {
    window.__benchConfig = cfg;
    window.__benchJson = undefined;
    window.__benchRows = undefined;
    window.__benchResult = undefined;
    window.__weaponVisualSheets = undefined;
    window.__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true });
  }, config);
}

async function waitFor(page, doneExpr, label) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    const done = await page.evaluate(doneExpr);
    if (done) return;
    const progress = await page.evaluate(() => window.__benchProgress ?? null).catch(() => null);
    const msg = progress ? `${label}: ${progress.step}/${progress.totalSteps} ${progress.scenario ?? ''} ${progress.id ?? ''} ${progress.form ?? ''}` : `${label}: waiting`;
    if (msg !== last) {
      console.log(msg);
      last = msg;
    }
    await sleep(5000);
  }
  throw new Error(`${label} timed out after ${timeoutMs}ms`);
}

async function main() {
  mkdirSync(join(root, 'docs/balance'), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error(`[browser] ${msg.text()}`);
  });

  if (runDps) {
    await waitForApp(page);
    await startBench(page, {
      preset: 'weaponEval32',
      ...(simSeconds ? { simSeconds: Number(simSeconds) } : {}),
      ...(rounds ? { rounds: Number(rounds) } : {}),
      ...(ids ? { ids: ids.split(',').map((id) => id.trim()).filter(Boolean) } : {}),
    });
    await waitFor(page, () => Boolean(window.__benchJson), 'dps');
    const data = await page.evaluate(() => ({ json: window.__benchJson, markdown: window.__benchResult }));
    writeFileSync(outputPath(outData), `${JSON.stringify(data.json, null, 2)}\n`);
    writeFileSync(outputPath(outMarkdown), `${data.markdown}\n`);
    console.log(`wrote ${outData}`);
  }

  if (runVisual) {
    await waitForApp(page);
    await startBench(page, { preset: 'weaponVisualSheets' });
    await waitFor(page, () => Boolean(window.__weaponVisualSheets), 'visual');
    const shots = [
      ['.shots/weapon_eval_contact_base.jpg', 'docs/balance/weapon-evaluation-32-contact-base.jpg'],
      ['.shots/weapon_eval_contact_evo.jpg', 'docs/balance/weapon-evaluation-32-contact-evo.jpg'],
    ];
    for (const [from, to] of shots) {
      const src = join(root, from);
      if (!existsSync(src)) throw new Error(`missing generated shot: ${from}`);
      copyFileSync(src, join(root, to));
      console.log(`wrote ${to}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
