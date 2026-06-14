#!/usr/bin/env node
// Drive DEV-only Boss quickstart playtests from a running Vite server.
// Requires Playwright to be resolvable by Node (Codex bundled runtime works via NODE_PATH).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (flag) => args.includes(flag);
const url = value('--url', 'http://127.0.0.1:5183');
const mapFilter = value('--map', 'all');
const phaseFilter = value('--phase', 'all');
const outDir = value('--out-dir', 'docs/boss-playtest');
const headful = has('--headed');

const MAPS = [
  'meadow', 'pond', 'hills', 'grove', 'lavender', 'bramble',
  'nocturne', 'summit', 'orchard', 'snowbell', 'mirage', 'clockwork',
];
const VIEWPORTS = [
  [402, 874],
  [1440, 900],
  [320, 480],
  [1260, 540],
];
const PHASES = ['p1', 'p2'];

async function waitForApp(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__game?.scene?.getScene('title')), null, { timeout: 30000 });
}

async function startBoss(page, mapId, phase) {
  await page.evaluate(({ mapId, phase }) => {
    window.__bossPlaytestErrors = [];
    window.__game.scene.stop('hud');
    window.__game.scene.stop('game');
    window.__game.scene.start('game', {
      charId: 'spark',
      mapId,
      bossTest: phase,
      arcana: false,
      random: false,
      speed2x: false,
      breakthrough: false,
    });
  }, { mapId, phase });
  await page.waitForFunction(() => {
    const gs = window.__game?.scene?.getScene('game');
    return Boolean(gs?.enemies?.boss?.active);
  }, null, { timeout: 12000 });
}

async function pump(page, seconds) {
  await page.evaluate((seconds) => {
    const game = window.__game;
    const step = 1000 / 60;
    const frames = Math.ceil(seconds * 60);
    let now = performance.now();
    for (let i = 0; i < frames; i++) {
      now += step;
      game.loop.step(now);
    }
  }, seconds);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const gs = window.__game.scene.getScene('game');
    return gs.debugBossTestSnapshot();
  });
}

async function main() {
  const maps = mapFilter === 'all' ? MAPS : mapFilter.split(',').filter(Boolean);
  const phases = phaseFilter === 'all' ? PHASES : phaseFilter.split(',').filter(Boolean);
  const absOut = join(root, outDir);
  mkdirSync(absOut, { recursive: true });

  const browser = await chromium.launch({ headless: !headful });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err?.message ?? err)));

  const rows = [];
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await waitForApp(page);
    for (const mapId of maps) {
      for (const phase of phases) {
        const beforeErrs = consoleErrors.length;
        await startBoss(page, mapId, phase);
        await pump(page, phase === 'p2' ? 4.5 : 3.5);
        const state = await snapshot(page);
        const file = `${mapId}-${phase}-${w}x${h}.png`;
        await page.screenshot({ path: join(absOut, file), fullPage: false });
        const row = {
          mapId,
          phase,
          viewport: `${w}x${h}`,
          active: state.active,
          hpK: Number(state.hpK.toFixed(3)),
          bullets: state.bullets,
          zones: state.zones,
          errors: consoleErrors.slice(beforeErrs),
          screenshot: file,
        };
        rows.push(row);
        console.log(`${row.viewport} ${mapId} ${phase} active=${row.active} hpK=${row.hpK} errors=${row.errors.length}`);
      }
    }
  }

  await browser.close();
  const summary = {
    url,
    generatedAt: new Date().toISOString(),
    rows,
    ok: rows.every((r) => r.active && r.errors.length === 0),
  };
  writeFileSync(join(absOut, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
