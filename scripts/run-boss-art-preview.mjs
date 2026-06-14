#!/usr/bin/env node
// Generate Boss state preview sheets from a running Vite dev server.
// The script renders shipped Phaser canvas textures; it does not create source art assets.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (flag) => args.includes(flag);
const url = value('--url', 'http://127.0.0.1:5183');
const mapFilter = value('--map', 'all');
const outDir = resolve(root, value('--out-dir', 'docs/boss-art-preview'));
const headful = has('--headed');

const MAPS = [
  'meadow', 'pond', 'hills', 'grove', 'lavender', 'bramble',
  'nocturne', 'summit', 'orchard', 'snowbell', 'mirage', 'clockwork',
];

async function waitForApp(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__game?.scene?.getScene('title')), null, { timeout: 30000 });
}

async function startMap(page, mapId) {
  await page.evaluate((mapId) => {
    for (const key of ['hud', 'game', 'title', 'charselect', 'mapselect', 'shop', 'codex', 'achievements', 'settings', 'result']) {
      window.__game.scene.stop(key);
    }
    window.__game.scene.start('game', {
      charId: 'spark',
      mapId,
      bossTest: 'p1',
      arcana: false,
      random: false,
      speed2x: false,
      breakthrough: false,
    });
  }, mapId);
  await page.waitForFunction(() => Boolean(window.__game?.scene?.getScene('game')?.enemies?.boss?.active), null, { timeout: 12000 });
}

async function main() {
  const maps = mapFilter === 'all' ? MAPS : mapFilter.split(',').filter(Boolean);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: !headful });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err?.message ?? err)));
  await waitForApp(page);

  const rows = [];
  for (const mapId of maps) {
    const beforeErrs = consoleErrors.length;
    await startMap(page, mapId);
    const sheet = await page.evaluate(async (mapId) => {
      const mod = await import('/src/gfx/textures/bosses.ts');
      const spec = mod.BOSS_ART_BY_MAP[mapId];
      const scene = window.__game.scene.getScene('game');
      const rows = [
        { label: 'P1 idle', phase: 'p1', state: 'idle', n: mod.BOSS_FRAME_COUNTS.idle },
        { label: 'P1 hit', phase: 'p1', state: 'hit', n: mod.BOSS_FRAME_COUNTS.hit },
        { label: 'P1 main', phase: 'p1', state: 'cast_main', n: mod.BOSS_FRAME_COUNTS.cast_main },
        { label: 'P1 support', phase: 'p1', state: 'cast_support', n: mod.BOSS_FRAME_COUNTS.cast_support },
        { label: 'P2 idle', phase: 'p2', state: 'idle', n: mod.BOSS_FRAME_COUNTS.idle },
        { label: 'P2 hit', phase: 'p2', state: 'hit', n: mod.BOSS_FRAME_COUNTS.hit },
        { label: 'P2 main', phase: 'p2', state: 'cast_main', n: mod.BOSS_FRAME_COUNTS.cast_main },
        { label: 'P2 support', phase: 'p2', state: 'cast_support', n: mod.BOSS_FRAME_COUNTS.cast_support },
        { label: 'Death', phase: 'p2', state: 'death', n: mod.BOSS_FRAME_COUNTS.death },
      ];
      const slotW = 132;
      const slotH = 118;
      const labelW = 96;
      const pad = 14;
      const cols = 4;
      const canvas = document.createElement('canvas');
      canvas.width = labelW + cols * slotW + pad * 2;
      canvas.height = rows.length * slotH + pad * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FAF5EA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#5A5248';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${spec.enemyId} / ${mapId}`, pad, 18);
      const missing = [];
      let drawn = 0;
      for (let row = 0; row < rows.length; row++) {
        const info = rows[row];
        const y = pad + row * slotH + 24;
        ctx.fillStyle = '#5A5248';
        ctx.font = '12px sans-serif';
        ctx.fillText(info.label, pad, y + 46);
        for (let i = 0; i < cols; i++) {
          if (i >= info.n) continue;
          const key = mod.bossFrameKey(spec.key, info.phase, info.state, i);
          if (!scene.textures.exists(key)) {
            missing.push(key);
            continue;
          }
          const frame = scene.textures.getFrame(key);
          const img = frame.source.image;
          const sx = frame.cutX;
          const sy = frame.cutY;
          const sw = frame.cutWidth;
          const sh = frame.cutHeight;
          const scale = Math.min((slotW - 14) / sw, (slotH - 26) / sh);
          const dw = sw * scale;
          const dh = sh * scale;
          const dx = pad + labelW + i * slotW + (slotW - dw) / 2;
          const dy = y + (slotH - 28 - dh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
          ctx.fillStyle = '#8A8276';
          ctx.font = '10px sans-serif';
          ctx.fillText(String(i), pad + labelW + i * slotW + 6, y + slotH - 12);
          drawn++;
        }
      }
      return {
        mapId,
        enemyId: spec.enemyId,
        file: `${mapId}-${spec.enemyId}-sheet.png`,
        drawn,
        missing,
        dataUrl: canvas.toDataURL('image/png'),
      };
    }, mapId);
    writeFileSync(resolve(outDir, sheet.file), Buffer.from(sheet.dataUrl.split(',')[1], 'base64'));
    rows.push({
      mapId,
      enemyId: sheet.enemyId,
      screenshot: sheet.file,
      drawn: sheet.drawn,
      missing: sheet.missing,
      errors: consoleErrors.slice(beforeErrs),
    });
    console.log(`${mapId} ${sheet.enemyId} drawn=${sheet.drawn} missing=${sheet.missing.length} errors=${consoleErrors.length - beforeErrs}`);
  }

  await browser.close();
  const summary = {
    url,
    generatedAt: new Date().toISOString(),
    rows,
    ok: rows.every((r) => r.missing.length === 0 && r.errors.length === 0),
  };
  writeFileSync(resolve(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
