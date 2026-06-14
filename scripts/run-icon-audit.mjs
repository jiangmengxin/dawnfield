#!/usr/bin/env node
// Generate icon audit sheets from the shipped Phaser canvas textures.
// Requires a running Vite dev server, usually:
//   npm run dev -- --port 5183 --strictPort
//
// The script intentionally does not create source art. It captures the current
// rendered texture contract, highlights machine-assisted review candidates, and
// writes review artifacts under docs/icon-audit/ by default.
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
const outDir = resolve(root, value('--out-dir', 'docs/icon-audit'));
const headful = has('--headed');

const CATEGORY_LABELS = {
  base_weapon: '基础武器',
  evolved_weapon_target: '超武目标',
  passive: '被动',
  arcana: 'Arcana',
  drop: '掉落道具',
  pickup: '基础拾取',
};

async function waitForApp(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__game?.scene?.getScene('title')), null, { timeout: 30000 });
}

function markdownTable(rows, columns) {
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const out = [
    `| ${columns.map((c) => c.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    out.push(`| ${columns.map((c) => esc(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(' | ')} |`);
  }
  return out.join('\n');
}

function writeMarkdownArtifacts(report) {
  const categorySummary = Object.entries(CATEGORY_LABELS).map(([id, label]) => {
    const rows = report.icons.filter((icon) => icon.category === id);
    const present = rows.filter((icon) => icon.exists).length;
    const planned = rows.filter((icon) => icon.status === 'planned_missing').length;
    return { id, label, total: rows.length, present, planned };
  });

  const p0Rows = report.issues.p0;
  const p1Rows = report.issues.p1;

  const p2Rows = [
    {
      severity: 'P2',
      area: '自动复核候选',
      issue: `当前输出 ${report.similarityCandidates.length} 对相似候选和 ${report.sizeCandidates.length} 个尺寸候选，均不自动阻断。`,
      impact: '候选只用于人工抽查，避免白底圆令牌和卡面底纹造成误报。',
      action: '如人工确认撞脸或小尺寸不可读，再提升为 P0/P1 并进入重绘队列。',
    },
    {
      severity: 'P2',
      area: '审查流程',
      issue: '自动相似度会受白底圆、卡牌底和透明边影响，不能作为最终判定。',
      impact: '可能误报同底纹图标或漏掉语义撞脸。',
      action: '保留“自动辅助 + 人工定级”流程，报告中不把相似分数直接等同严重度。',
    },
    {
      severity: 'P2',
      area: '文档演进',
      issue: '图标审查规则已落入报告，但完整美术手册仍需后续固化。',
      impact: '后续新增或重绘图标时，需要明确沿用纸令牌立体物件、独立剪影和 palette 派生色规范。',
      action: '在 art-direction 中补充图标命名、超武展示和 palette helper 规范。',
    },
  ];

  const actionRows = [];
  for (const issue of [...report.issues.p0, ...report.issues.p1]) {
    actionRows.push({
      severity: issue.severity,
      id: issue.id ?? issue.area,
      category: issue.area,
      current: issue.issue,
      target: issue.action,
      acceptance: issue.impact,
    });
  }
  if (actionRows.length === 0) {
    actionRows.push({
      severity: 'OK',
      id: 'P0/P1',
      category: '阻断项',
      current: '当前没有 P0/P1 阻断项。',
      target: '保持超武独立图标、掉落道具纸令牌底托、同族独立剪影、gem 蓝色露珠语义和全链路进化图标展示。',
      acceptance: '复跑 `scripts/run-icon-audit.mjs` 时 `issues.p0.length === 0` 且 `issues.p1.length === 0`。',
    });
  }
  for (const row of report.sizeCandidates.slice(0, 24)) {
    actionRows.push({
      severity: 'Candidate',
      id: row.id,
      category: CATEGORY_LABELS[row.category],
      current: `minForegroundPixels=${row.minForegroundPixels}，bbox=${row.bbox.w}×${row.bbox.h}`,
      target: '人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。',
      acceptance: `${row.minSize}px 无文字可识别主体类别，不依赖卡片大图。`,
    });
  }

  const reportMd = [
    '# 图标全量审查状态报告',
    '',
    `生成时间：${report.generatedAt}`,
    '',
    `来源：${report.url}`,
    '',
    '## 产物',
    '',
    '- `icon-audit-sheet.png`：全量图标源尺寸 + 最小验收尺寸预览。',
    '- `summary.json`：机器辅助指标、缺失项、相似候选与尺寸候选。',
    '- `similarity-candidates.md`：近似候选对，供人工定级。',
    '- `remediation-table.md`：逐图标整改动作表。',
    '',
    '## 范围统计',
    '',
    markdownTable(categorySummary, [
      { label: '分类', value: 'label' },
      { label: '总数', value: 'total' },
      { label: '已存在纹理', value: 'present' },
      { label: '计划新增', value: 'planned' },
    ]),
    '',
    '## P0/P1/P2 问题表',
    '',
    markdownTable([...p0Rows, ...p1Rows, ...p2Rows], [
      { label: '级别', value: 'severity' },
      { label: '范围', value: 'area' },
      { label: '问题', value: 'issue' },
      { label: '影响', value: 'impact' },
      { label: '动作', value: 'action' },
    ]),
    '',
    '## 审查口径',
    '',
    '- P0：高相似、26/28px 不可读、主体粗糙、语义错误、明显偏离明亮童话纸面风格。',
    '- P1：可读但精致度不足、层次偏平、色彩来源不规范、与同类资产风格不齐。',
    '- P2：轻微比例、留白、描边、高光或文档一致性问题。',
    '- 自动相似度只辅助排序；最终 P0/P1/P2 仍以人工视觉复核为准。',
    '',
  ].join('\n');

  const similarityMd = [
    '# 图标相似候选',
    '',
    '这些候选由脚本在最小验收尺寸附近生成，主要用于提醒人工复核；白底圆令牌和同类卡面可能带来误报。',
    '',
    markdownTable(report.similarityCandidates, [
      { label: '分类', value: (row) => CATEGORY_LABELS[row.category] ?? row.category },
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: '相似度', value: (row) => row.score.toFixed(3) },
      { label: '原因', value: 'reason' },
    ]),
    '',
  ].join('\n');

  const remediationMd = [
    '# 图标逐项整改动作表',
    '',
    '下表列出当前仍需处理的 P0/P1 阻断项；Candidate 行仅作为人工抽查提示，不自动阻断。',
    '',
    markdownTable(actionRows, [
      { label: '级别', value: 'severity' },
      { label: 'ID', value: 'id' },
      { label: '分类', value: 'category' },
      { label: '现状', value: 'current' },
      { label: '目标', value: 'target' },
      { label: '验收', value: 'acceptance' },
    ]),
    '',
  ].join('\n');

  writeFileSync(resolve(outDir, 'icon-audit-report.md'), `${reportMd}\n`);
  writeFileSync(resolve(outDir, 'similarity-candidates.md'), `${similarityMd}\n`);
  writeFileSync(resolve(outDir, 'remediation-table.md'), `${remediationMd}\n`);
}

function buildIssues(report) {
  const p0 = [];
  const p1 = [];
  if (report.counts.unexpectedMissing > 0) {
    p0.push({
      severity: 'P0',
      area: '缺失纹理',
      issue: `${report.counts.unexpectedMissing} 个目标图标纹理意外缺失。`,
      impact: '玩家界面会出现空图标或回退错误。',
      action: '补齐缺失纹理，或从审查范围中移除无效目标。',
    });
  }
  if (report.counts.plannedMissing > 0) {
    p0.push({
      severity: 'P0',
      area: '超武独立图标',
      issue: `${report.counts.plannedMissing} 个超武目标图标尚无独立纹理。`,
      impact: '无法达成“32 超武全部独立绘制”和进化后全链路替换的上线标准。',
      action: '新增 `icon_<weapon>_e` 并接入进化态展示。',
    });
  }
  const gem = report.icons.find((icon) => icon.category === 'pickup' && icon.id === 'gem');
  if (!gem || !gem.exists || gem.avgSaturation < 0.18) {
    p0.push({
      severity: 'P0',
      area: '基础拾取物 / gem',
      id: 'gem',
      issue: '`gem` 缺少明确的蓝色经验/露珠语义。',
      impact: '局内高频拾取物缺乏颜色身份，密集战斗中不易和普通粒子区分。',
      action: '保持 16×16 契约，使用浅蓝主体、同系描边和白色高光。',
    });
  }
  const criticalSize = report.icons
    .filter((row) => row.exists && row.category !== 'pickup')
    .filter((row) => {
      if (row.category === 'drop') return row.minForegroundPixels < 35 || row.bbox.w < 7 || row.bbox.h < 7;
      return row.minForegroundPixels < 38 || row.bbox.w < 10 || row.bbox.h < 10;
    });
  for (const row of criticalSize) {
    p1.push({
      severity: 'P1',
      area: '小尺寸可读性',
      id: row.id,
      issue: `${row.id} 在 ${row.minSize}px 下主体过弱（fg=${row.minForegroundPixels}, bbox=${row.bbox.w}x${row.bbox.h}）。`,
      impact: '实战 HUD 或拾取尺寸下可能无法无文字识别。',
      action: '放大主体、强化同系描边并减少无效留白。',
    });
  }
  return { p0, p1 };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: !headful });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err?.message ?? err)));

  await waitForApp(page);
  const audit = await page.evaluate(async () => {
    const [{ WEAPON_META }, { PASSIVE_META }, { ARCANA_META }, { DROP_ITEMS, ALL_DROPS }, { t }] = await Promise.all([
      import('/src/content/weapons.ts'),
      import('/src/content/passives.ts'),
      import('/src/content/arcana.ts'),
      import('/src/content/dropItems.ts'),
      import('/src/i18n.ts'),
    ]);

    const game = window.__game;
    const scene = game.scene.getScene('title') ?? game.scene.getScenes(true)[0];
    const textures = scene.textures;
    const rows = [];

    const addIcon = (row) => rows.push({
      exists: textures.exists(row.key),
      minSize: row.minSize ?? 26,
      sourceContract: row.sourceContract ?? '40x40',
      ...row,
    });

    for (const meta of WEAPON_META) {
      addIcon({
        category: 'base_weapon',
        id: meta.id,
        key: meta.icon,
        label: t('w_' + meta.id),
        color: meta.color,
        minSize: 26,
        sourceContract: '40x40',
      });
    }
    for (const meta of WEAPON_META) {
      addIcon({
        category: 'evolved_weapon_target',
        id: `${meta.id}:evo`,
        key: meta.evolvedIcon,
        label: t('w_' + meta.id + '_e'),
        color: meta.color,
        minSize: 26,
        sourceContract: '40x40',
        fallbackKey: meta.icon,
        planned: true,
      });
    }
    for (const meta of PASSIVE_META) {
      addIcon({
        category: 'passive',
        id: meta.id,
        key: meta.icon,
        label: t('p_' + meta.id),
        color: meta.color,
        minSize: 26,
        sourceContract: '40x40',
      });
    }
    for (const meta of ARCANA_META) {
      addIcon({
        category: 'arcana',
        id: meta.id,
        key: meta.icon,
        label: t('arc_' + meta.id),
        color: meta.color,
        minSize: 26,
        sourceContract: '40x40',
      });
    }
    for (const id of ALL_DROPS) {
      const spec = DROP_ITEMS[id];
      addIcon({
        category: 'drop',
        id,
        key: spec.icon,
        label: t('drop_' + id),
        color: spec.color,
        minSize: 28,
        sourceContract: '28x28',
        scope: spec.scope,
        kind: spec.kind,
        glyph: spec.glyph,
        lethal: Boolean(spec.tags?.includes('lethal')),
      });
    }
    for (const row of [
      { id: 'gem', key: 'gem', label: 'XP gem / 经验露珠', sourceContract: '16x16' },
      { id: 'coin', key: 'coin', label: 'Coin / 金币', sourceContract: '18x18' },
      { id: 'heart', key: 'heart', label: 'Heart / 红心', sourceContract: '22x20' },
      { id: 'chest', key: 'chest', label: 'Chest / 宝箱', sourceContract: '44x38' },
      { id: 'arcanachest', key: 'arcanachest', label: 'Arcana Chest / 规则卡宝箱', sourceContract: '44x38' },
    ]) {
      addIcon({ category: 'pickup', minSize: 28, ...row });
    }

    function getFrame(row) {
      const drawKey = row.exists ? row.key : row.fallbackKey;
      if (!drawKey || !textures.exists(drawKey)) return null;
      return { key: drawKey, frame: textures.getFrame(drawKey) };
    }

    function drawFrame(ctx, frame, x, y, w, h) {
      const img = frame.source.image;
      ctx.drawImage(img, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, x, y, w, h);
    }

    function isForeground(r, g, b, a) {
      if (a < 26) return false;
      const nearWhite = r > 226 && g > 226 && b > 218 && Math.max(r, g, b) - Math.min(r, g, b) < 28;
      const faintNeutral = a < 96 && Math.abs(r - g) < 16 && Math.abs(g - b) < 16;
      return !nearWhite && !faintNeutral;
    }

    function metrics(row) {
      const ref = getFrame(row);
      if (!ref || !row.exists) {
        return {
          width: 0,
          height: 0,
          foregroundRatio: 0,
          minForegroundPixels: 0,
          bbox: { x: 0, y: 0, w: 0, h: 0 },
          signature: [],
        };
      }
      const size = row.minSize;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, size, size);
      drawFrame(ctx, ref.frame, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let fg = 0;
      let minX = size;
      let minY = size;
      let maxX = -1;
      let maxY = -1;
      let satSum = 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (isForeground(r, g, b, data[i + 3])) {
            fg++;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            satSum += max > 0 ? (max - min) / max : 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const sigSize = 16;
      const sigCanvas = document.createElement('canvas');
      sigCanvas.width = sigSize;
      sigCanvas.height = sigSize;
      const sigCtx = sigCanvas.getContext('2d', { willReadFrequently: true });
      sigCtx.clearRect(0, 0, sigSize, sigSize);
      drawFrame(sigCtx, ref.frame, 0, 0, sigSize, sigSize);
      const sigData = sigCtx.getImageData(0, 0, sigSize, sigSize).data;
      const signature = [];
      for (let i = 0; i < sigData.length; i += 4) {
        const r = sigData[i];
        const g = sigData[i + 1];
        const b = sigData[i + 2];
        const a = sigData[i + 3];
        const fgK = isForeground(r, g, b, a) ? 1 : 0;
        signature.push(fgK, fgK ? r / 255 : 0, fgK ? g / 255 : 0, fgK ? b / 255 : 0);
      }

      return {
        width: ref.frame.cutWidth,
        height: ref.frame.cutHeight,
        foregroundRatio: Number((fg / (size * size)).toFixed(4)),
        avgSaturation: Number((fg > 0 ? satSum / fg : 0).toFixed(4)),
        minForegroundPixels: fg,
        bbox: maxX >= 0 ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : { x: 0, y: 0, w: 0, h: 0 },
        signature,
      };
    }

    const enriched = rows.map((row) => {
      const m = metrics(row);
      const status = row.exists ? 'present' : row.planned ? 'planned_missing' : 'missing';
      return {
        ...row,
        status,
        width: m.width,
        height: m.height,
        foregroundRatio: m.foregroundRatio,
        avgSaturation: m.avgSaturation,
        minForegroundPixels: m.minForegroundPixels,
        bbox: m.bbox,
        signature: m.signature,
      };
    });

    function sigSimilarity(a, b) {
      if (!a.signature.length || !b.signature.length) return 0;
      let mse = 0;
      for (let i = 0; i < a.signature.length; i++) {
        const d = a.signature[i] - b.signature[i];
        mse += d * d;
      }
      mse /= a.signature.length;
      return Math.max(0, Math.min(1, 1 - Math.sqrt(mse)));
    }

    const similarityCandidates = [];
    for (const category of ['base_weapon', 'passive', 'arcana', 'drop', 'pickup']) {
      const group = enriched.filter((row) => row.category === category && row.exists);
      const pairs = [];
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const score = sigSimilarity(group[i], group[j]);
          pairs.push({
            category,
            a: group[i].id,
            b: group[j].id,
            score: Number(score.toFixed(4)),
            reason: 'foreground signature at review size',
          });
        }
      }
      pairs.sort((a, b) => b.score - a.score);
      similarityCandidates.push(...pairs.slice(0, category === 'drop' ? 18 : 10));
    }

    const sizeCandidates = enriched
      .filter((row) => row.exists && row.category !== 'pickup')
      .filter((row) => row.minForegroundPixels < (row.category === 'drop' ? 70 : 82) || row.bbox.w < 12 || row.bbox.h < 12)
      .sort((a, b) => a.minForegroundPixels - b.minForegroundPixels)
      .slice(0, 48)
      .map(({ signature, ...row }) => row);

    const sheetCols = 8;
    const tileW = 168;
    const tileH = 104;
    const headerH = 34;
    const categoryBlocks = Object.keys({
      base_weapon: 1,
      evolved_weapon_target: 1,
      passive: 1,
      arcana: 1,
      drop: 1,
      pickup: 1,
    }).map((category) => enriched.filter((row) => row.category === category));
    const sheetRows = categoryBlocks.reduce((sum, block) => sum + Math.ceil(block.length / sheetCols) + 1, 0);
    const sheet = document.createElement('canvas');
    sheet.width = sheetCols * tileW;
    sheet.height = sheetRows * tileH + headerH;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#FAF5EA';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = '#5A5248';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Dawnfield Icon Audit Sheet', 14, 24);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8A8276';
    ctx.fillText('left: source preview / right: min readability size; dashed = planned missing evolved icon fallback', 280, 24);

    const labels = {
      base_weapon: '基础武器',
      evolved_weapon_target: '超武目标',
      passive: '被动',
      arcana: 'Arcana',
      drop: '掉落道具',
      pickup: '基础拾取',
    };
    let rowCursor = headerH;
    for (const block of categoryBlocks) {
      if (block.length === 0) continue;
      const category = block[0].category;
      ctx.fillStyle = '#E0D4BC';
      ctx.fillRect(0, rowCursor, sheet.width, 24);
      ctx.fillStyle = '#5A5248';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${labels[category]} (${block.length})`, 14, rowCursor + 17);
      rowCursor += tileH;
      for (let i = 0; i < block.length; i++) {
        const item = block[i];
        const col = i % sheetCols;
        const row = Math.floor(i / sheetCols);
        const x = col * tileW;
        const y = rowCursor + row * tileH;
        ctx.fillStyle = item.exists ? '#FFFDF6' : '#FFF8ED';
        ctx.fillRect(x + 6, y + 4, tileW - 12, tileH - 8);
        ctx.strokeStyle = item.exists ? '#E0D4BC' : '#C86870';
        ctx.lineWidth = item.exists ? 1 : 2;
        if (item.exists) {
          ctx.strokeRect(x + 6, y + 4, tileW - 12, tileH - 8);
        } else {
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(x + 6, y + 4, tileW - 12, tileH - 8);
          ctx.setLineDash([]);
        }

        const ref = getFrame(item);
        if (ref) {
          const srcSize = item.category === 'pickup' && item.key.includes('chest') ? 42 : 44;
          const sourceScale = Math.min(srcSize / ref.frame.cutWidth, srcSize / ref.frame.cutHeight);
          const sw = ref.frame.cutWidth * sourceScale;
          const sh = ref.frame.cutHeight * sourceScale;
          drawFrame(ctx, ref.frame, x + 24 + (44 - sw) / 2, y + 13 + (44 - sh) / 2, sw, sh);
          drawFrame(ctx, ref.frame, x + 95, y + 22, item.minSize, item.minSize);
        }

        ctx.fillStyle = item.exists ? '#8A8276' : '#C86870';
        ctx.font = '10px sans-serif';
        ctx.fillText(item.exists ? item.key : `missing ${item.key}`, x + 10, y + 74);
        ctx.fillStyle = '#5A5248';
        ctx.font = 'bold 11px sans-serif';
        const idText = item.id.length > 19 ? `${item.id.slice(0, 18)}…` : item.id;
        ctx.fillText(idText, x + 10, y + 90);
      }
      rowCursor += Math.ceil(block.length / sheetCols) * tileH;
    }

    const cleanIcons = enriched.map(({ signature, ...row }) => row);
    const unexpectedMissing = cleanIcons.filter((row) => row.status === 'missing');
    const plannedMissing = cleanIcons.filter((row) => row.status === 'planned_missing');
    return {
      generatedAt: new Date().toISOString(),
      url: window.location.href,
      icons: cleanIcons,
      counts: {
        total: cleanIcons.length,
        present: cleanIcons.filter((row) => row.exists).length,
        plannedMissing: plannedMissing.length,
        unexpectedMissing: unexpectedMissing.length,
      },
      plannedEvolvedIconKeyPattern: 'icon_<weapon>_e',
      similarityCandidates,
      sizeCandidates,
      unexpectedMissing,
      sheetDataUrl: sheet.toDataURL('image/png'),
    };
  });

  await browser.close();
  const errors = consoleErrors.filter((line) => !line.includes('Failed to load resource'));
  const baseReport = { ...audit, url, consoleErrors: errors };
  const issues = buildIssues(baseReport);
  const report = {
    ...baseReport,
    issues,
    ok: audit.unexpectedMissing.length === 0 && errors.length === 0 && issues.p0.length === 0 && issues.p1.length === 0,
  };

  writeFileSync(resolve(outDir, 'icon-audit-sheet.png'), Buffer.from(audit.sheetDataUrl.split(',')[1], 'base64'));
  writeFileSync(resolve(outDir, 'summary.json'), `${JSON.stringify({ ...report, sheetDataUrl: undefined }, null, 2)}\n`);
  writeMarkdownArtifacts(report);

  console.log([
    'icon-audit:',
    `total=${report.counts.total}`,
    `present=${report.counts.present}`,
    `plannedMissing=${report.counts.plannedMissing}`,
    `unexpectedMissing=${report.counts.unexpectedMissing}`,
    `p0=${report.issues.p0.length}`,
    `p1=${report.issues.p1.length}`,
    `similarityCandidates=${report.similarityCandidates.length}`,
    `sizeCandidates=${report.sizeCandidates.length}`,
    `errors=${errors.length}`,
  ].join(' '));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
