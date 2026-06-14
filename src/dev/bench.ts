// DPS / presentation bench（DEV-only；生产构建经动态 import 摇树移除）
// 默认保持旧口径：三环 24 静止标靶，Lv5 + 进化，60s ×3。
// 专项评估口径由 window.__benchConfig.preset = 'weaponEval32' 开启：
// 32 武器 × Lv1/Lv3/Lv5/进化 × staticRings/movingSwarm/singlePack。
import { WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import type { WeaponId } from '../content/ids';
import { FONT, t } from '../i18n';
import { SFX } from '../audio/sound';
import type { Enemy } from '../systems/EnemySystem';
import type { GameScene } from '../scenes/Game';

const DEFAULT_SIM_SECONDS = 60;
const DEFAULT_ROUNDS = 3;
const EVAL_SWEEP_SECONDS = 24;
const EVAL_SWEEP_ROUNDS = 2;
const DT = 1 / 60;
const RINGS: Array<[r: number, n: number]> = [[56, 8], [110, 8], [260, 8]];
const ALL_FORMS = ['lv1', 'lv3', 'lv5', 'evo'] as const;
const DEFAULT_FORMS = ['lv5', 'evo'] as const;
const ALL_SCENARIOS = ['staticRings', 'movingSwarm', 'singlePack'] as const;

type BenchForm = typeof ALL_FORMS[number];
type BenchScenario = typeof ALL_SCENARIOS[number];
type BenchPreset = 'weaponEval32' | 'weaponVisualSheets';

interface BenchConfig {
  ids?: WeaponId[];
  rounds?: number;
  simSeconds?: number;
  preset?: BenchPreset;
  forms?: BenchForm[];
  scenarios?: BenchScenario[];
  quietFx?: boolean;
}

interface TargetPlacement {
  x: number;
  y: number;
  spd: number;
  knockMul: number;
}

interface BenchRow {
  id: WeaponId;
  form: BenchForm;
  scenario: BenchScenario;
  dps: number;
  ratio: number;
  median: number;
  rounds: number[];
  min: number;
  max: number;
  sd: number;
}

interface BenchJson {
  version: 2;
  preset: 'default' | 'weaponEval32';
  generatedAt: string;
  simSeconds: number;
  rounds: number;
  forms: BenchForm[];
  scenarios: BenchScenario[];
  targetPolicy: Record<BenchScenario, string>;
  rows: BenchRow[];
}

// 让出主线程：MessageChannel 宏任务不受隐藏页 setTimeout 节流。
const yieldTask = (): Promise<void> => new Promise((res) => {
  const ch = new MessageChannel();
  ch.port1.onmessage = () => res();
  ch.port2.postMessage(0);
});

const fmt = (v: number): string => v.toFixed(1);
const ratio = (v: number): string => `${v.toFixed(2)}x`;

function totalFor(gs: GameScene, id: WeaponId): number {
  let sum = 0;
  for (const [src, , total] of gs.dps.entries()) {
    if (src === id) sum += total;
  }
  return sum;
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdev(xs: number[], avg: number): number {
  if (xs.length <= 1) return 0;
  const v = xs.reduce((acc, x) => acc + (x - avg) * (x - avg), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function scenarioLabel(s: BenchScenario): string {
  return s === 'staticRings' ? '静止三环'
    : s === 'movingSwarm' ? '移动怪潮'
      : '单体小队';
}

function formLabel(f: BenchForm): string {
  return f === 'evo' ? '进化' : f.toUpperCase();
}

function normalizeConfig(raw: BenchConfig): Required<Pick<BenchConfig, 'rounds' | 'simSeconds'>> & {
  preset: 'default' | BenchPreset;
  ids: WeaponId[];
  forms: BenchForm[];
  scenarios: BenchScenario[];
  quietFx: boolean;
} {
  const preset = raw.preset ?? 'default';
  const forms = raw.forms?.length
    ? raw.forms.filter((f): f is BenchForm => (ALL_FORMS as readonly string[]).includes(f))
    : preset === 'weaponEval32'
      ? [...ALL_FORMS]
      : [...DEFAULT_FORMS];
  const scenarios = raw.scenarios?.length
    ? raw.scenarios.filter((s): s is BenchScenario => (ALL_SCENARIOS as readonly string[]).includes(s))
    : preset === 'weaponEval32'
      ? [...ALL_SCENARIOS]
      : (['staticRings'] as BenchScenario[]);
  return {
    preset,
    ids: raw.ids?.length ? WEAPON_META.filter((m) => raw.ids?.includes(m.id)).map((m) => m.id) : WEAPON_META.map((m) => m.id),
    forms,
    scenarios,
    rounds: raw.rounds ?? (preset === 'weaponEval32' ? EVAL_SWEEP_ROUNDS : DEFAULT_ROUNDS),
    simSeconds: raw.simSeconds ?? (preset === 'weaponEval32' ? EVAL_SWEEP_SECONDS : DEFAULT_SIM_SECONDS),
    quietFx: raw.quietFx ?? true,
  };
}

function neutralize(gs: GameScene): void {
  Object.assign(gs.run.stats, {
    dmg: 1, cd: 1, area: 1, magnet: 0, moveSpeed: 0, projSpeed: 1,
    maxHp: 9999, xpGain: 1, coinGain: 1, armor: 0, regen: 0, crit: -1,
  });
  gs.player.setPosition(0, 0);
  gs.facing = { x: 1, y: 0 };
}

function ensureTargets(gs: GameScene, n: number): Enemy[] {
  const targets = gs.enemies.actives;
  while (targets.length < n) {
    const e = gs.enemies.spawn('blob', 5000 + targets.length * 24, 5000);
    e.setActive(false).setVisible(false);
    e.shadowImg.setVisible(false);
  }
  return targets;
}

function placementsFor(scenario: BenchScenario): TargetPlacement[] {
  if (scenario === 'staticRings') {
    const out: TargetPlacement[] = [];
    for (const [r, n] of RINGS) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r * 0.01;
        out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, spd: 0, knockMul: 0 });
      }
    }
    return out;
  }
  if (scenario === 'movingSwarm') {
    const out: TargetPlacement[] = [];
    for (const [r, n] of [[360, 8], [480, 8], [600, 8]] as Array<[number, number]>) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r * 0.005;
        out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, spd: 64, knockMul: 0 });
      }
    }
    return out;
  }
  return [
    { x: 116, y: 0, spd: 0, knockMul: 0 },
    { x: 168, y: -64, spd: 0, knockMul: 0 },
    { x: 168, y: 64, spd: 0, knockMul: 0 },
    { x: 228, y: -22, spd: 0, knockMul: 0 },
    { x: 228, y: 62, spd: 0, knockMul: 0 },
  ];
}

function resetTargets(targets: Enemy[], scenario: BenchScenario): void {
  const placements = placementsFor(scenario);
  targets.forEach((e, i) => {
    const p = placements[i];
    if (!p) {
      e.setActive(false).setVisible(false);
      e.shadowImg.setVisible(false);
      return;
    }
    e.setActive(true).setVisible(true);
    e.shadowImg.setVisible(true);
    e.dying = false;
    e.hp = e.maxHp = 1e9;
    e.spd = p.spd;
    e.dmg = 0;
    e.xpVal = 0;
    e.knockMul = p.knockMul;
    e.kvx = e.kvy = 0;
    e.fireT = 0;
    e.stateT = 0;
    e.wobble = 0;
    e.affix = null;
    e.affixT = 0;
    e.affixPullT = 0;
    e.exploded = false;
    e.setPosition(p.x, p.y);
    e.shadowImg.setPosition(p.x, p.y + e.radius * 0.9);
    e.setAlpha(1).setScale(1).setRotation(0).clearTint();
    if (e.affixLabel) e.affixLabel.setVisible(false);
    if (e.auraImg) e.auraImg.setVisible(false);
  });
}

function prepareWeapon(gs: GameScene, id: WeaponId, form: BenchForm): void {
  gs.weapons.removeAll();
  gs.benchReset();
  const levels = form === 'lv1' ? 1 : form === 'lv3' ? 3 : WEAPON_MAX_LEVEL;
  for (let i = 0; i < levels; i++) gs.weapons.addOrUpgrade(id);
  if (form === 'evo') gs.weapons.evolve(id);
  neutralize(gs);
}

function silencePresentation(gs: GameScene): () => void {
  const original: Record<string, unknown> = {};
  const quietFx = gs.fx as unknown as Record<string, (...args: unknown[]) => void>;
  for (const k of ['burst', 'spray', 'teleLine', 'teleCircle', 'ring', 'flash', 'number']) {
    original[`fx.${k}`] = quietFx[k];
    quietFx[k] = () => {};
  }
  original.castFx = (gs as unknown as { castFx: unknown }).castFx;
  original.requestHitStop = (gs as unknown as { requestHitStop: unknown }).requestHitStop;
  (gs as unknown as { castFx: () => void; requestHitStop: () => void }).castFx = () => {};
  (gs as unknown as { requestHitStop: () => void }).requestHitStop = () => {};
  return () => {
    for (const k of ['burst', 'spray', 'teleLine', 'teleCircle', 'ring', 'flash', 'number']) {
      quietFx[k] = original[`fx.${k}`] as (...args: unknown[]) => void;
    }
    (gs as unknown as { castFx: unknown }).castFx = original.castFx;
    (gs as unknown as { requestHitStop: unknown }).requestHitStop = original.requestHitStop;
  };
}

async function pump(gs: GameScene, seconds: number, fakeNow = performance.now()): Promise<number> {
  const frames = Math.round(seconds / DT);
  for (let f = 0; f < frames; f++) {
    fakeNow += DT * 1000;
    gs.benchTick(DT);
    gs.time.preUpdate();
    gs.time.update(fakeNow, DT * 1000);
    tickTweens(gs, DT * 1000);
    if (f % 900 === 899) await yieldTask();
  }
  return fakeNow;
}

async function drain(gs: GameScene, fakeNow: number): Promise<number> {
  return pump(gs, 1.0, fakeNow);
}

function tickTweens(gs: GameScene, deltaMs: number): void {
  const tweens = gs.tweens as unknown as {
    getDelta: (tick?: boolean) => number;
    step: (tick?: boolean) => void;
  };
  const original = tweens.getDelta;
  tweens.getDelta = () => deltaMs;
  tweens.step(true);
  tweens.getDelta = original;
}

function applyRatios(rows: BenchRow[]): void {
  for (const scenario of ALL_SCENARIOS) {
    for (const form of ALL_FORMS) {
      const group = rows.filter((r) => r.scenario === scenario && r.form === form);
      if (group.length === 0) continue;
      const med = median(group.map((r) => r.dps));
      for (const row of group) {
        row.median = med;
        row.ratio = row.dps / Math.max(1, med);
      }
    }
  }
}

function toLegacyRows(rows: BenchRow[]): Array<{ id: WeaponId; lv5: number; evo: number }> {
  return WEAPON_META.map((m) => {
    const lv5 = rows.find((r) => r.id === m.id && r.scenario === 'staticRings' && r.form === 'lv5')?.dps ?? 0;
    const evo = rows.find((r) => r.id === m.id && r.scenario === 'staticRings' && r.form === 'evo')?.dps ?? 0;
    return { id: m.id, lv5, evo };
  });
}

function flagsFor(row: BenchRow, rows: BenchRow[]): string {
  const lv5 = rows.find((r) => r.id === row.id && r.scenario === row.scenario && r.form === 'lv5');
  const evo = rows.find((r) => r.id === row.id && r.scenario === row.scenario && r.form === 'evo');
  const flags: string[] = [];
  if (row.ratio < 0.6) flags.push('低');
  if (row.ratio > 2.0) flags.push('高');
  if (row.form === 'evo' && lv5 && row.dps / Math.max(1, lv5.dps) > 4.0) flags.push('跃迁高');
  if (row.form === 'evo' && lv5 && row.dps / Math.max(1, lv5.dps) < 1.3) flags.push('跃迁低');
  if (row.sd / Math.max(1, row.dps) > 0.12) flags.push('波动');
  if (row.form === 'lv5' && evo && evo.dps / Math.max(1, row.dps) > 4.0) flags.push('超武跃迁');
  return flags.join(' / ');
}

function legacyMarkdown(rows: BenchRow[]): string {
  const legacy = toLegacyRows(rows).sort((a, b) => b.lv5 - a.lv5);
  const med = median(legacy.map((r) => r.lv5));
  return [
    '| 武器 | Lv5 DPS | /中位 | 进化 DPS | 进化/Lv5 |',
    '|------|--------:|------:|---------:|---------:|',
    ...legacy.map((r) => `| ${r.id} | ${fmt(r.lv5)} | ${ratio(r.lv5 / med)} | ${fmt(r.evo)} | ${ratio(r.evo / Math.max(1, r.lv5))} |`),
    '',
    `中位（Lv5）= ${fmt(med)}；标靶三环 24（r56/r110/r260 各 8）。`,
  ].join('\n');
}

function multiMarkdown(json: BenchJson): string {
  const lines: string[] = [];
  lines.push(`# Weapon Eval Bench ${json.generatedAt}`);
  lines.push('');
  lines.push(`口径：${json.forms.map(formLabel).join(' / ')}；${json.scenarios.map(scenarioLabel).join(' / ')}；每项 ${json.simSeconds}s ×${json.rounds}。`);
  for (const scenario of json.scenarios) {
    lines.push('');
    lines.push(`## ${scenarioLabel(scenario)}`);
    lines.push('');
    lines.push('| 武器 | Lv1 | Lv3 | Lv5 | 进化 | 进化/Lv5 | 标记 |');
    lines.push('|---|---:|---:|---:|---:|---:|---|');
    const sorted = WEAPON_META
      .map((m) => ({
        id: m.id,
        lv1: json.rows.find((r) => r.id === m.id && r.scenario === scenario && r.form === 'lv1'),
        lv3: json.rows.find((r) => r.id === m.id && r.scenario === scenario && r.form === 'lv3'),
        lv5: json.rows.find((r) => r.id === m.id && r.scenario === scenario && r.form === 'lv5'),
        evo: json.rows.find((r) => r.id === m.id && r.scenario === scenario && r.form === 'evo'),
      }))
      .sort((a, b) => (b.lv5?.dps ?? 0) - (a.lv5?.dps ?? 0));
    for (const r of sorted) {
      const cell = (row?: BenchRow): string => row ? `${fmt(row.dps)} (${ratio(row.ratio)})` : '-';
      const evoK = r.evo && r.lv5 ? ratio(r.evo.dps / Math.max(1, r.lv5.dps)) : '-';
      const flags = [r.lv1, r.lv3, r.lv5, r.evo].filter(Boolean).map((row) => flagsFor(row!, json.rows)).filter(Boolean);
      lines.push(`| ${r.id} | ${cell(r.lv1)} | ${cell(r.lv3)} | ${cell(r.lv5)} | ${cell(r.evo)} | ${evoK} | ${[...new Set(flags)].join('；')} |`);
    }
  }
  return lines.join('\n');
}

async function runDpsBench(gs: GameScene, rawCfg: BenchConfig): Promise<void> {
  const cfg = normalizeConfig(rawCfg);
  const wasMuted = SFX.muted;
  SFX.setMuted(true);
  const restorePresentation = cfg.quietFx ? silencePresentation(gs) : () => {};

  const label = gs.add.text(16, 16, 'DPS bench...', {
    fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#5A5248',
    stroke: '#FFFFFF', strokeThickness: 4,
  }).setScrollFactor(0).setDepth(1e9);

  const maxTargets = Math.max(...cfg.scenarios.map((s) => placementsFor(s).length));
  const targets = ensureTargets(gs, maxTargets);
  const totalSteps = cfg.ids.length * cfg.scenarios.length * cfg.forms.length * cfg.rounds;
  const rows: BenchRow[] = [];
  let step = 0;

  const setProgress = (id = '', form = '', scenario = ''): void => {
    (window as unknown as { __benchProgress?: unknown }).__benchProgress = { step, totalSteps, id, form, scenario };
  };
  setProgress();

  for (const scenario of cfg.scenarios) {
    for (const id of cfg.ids) {
      for (const form of cfg.forms) {
        const rounds: number[] = [];
        for (let round = 0; round < cfg.rounds; round++) {
          resetTargets(targets, scenario);
          prepareWeapon(gs, id, form);
          const before = totalFor(gs, id);
          let fakeNow = performance.now();
          fakeNow = await pump(gs, cfg.simSeconds, fakeNow);
          fakeNow = await drain(gs, fakeNow);
          rounds.push((totalFor(gs, id) - before) / cfg.simSeconds);
          step++;
          setProgress(id, form, scenario);
          label.setText(`DPS bench ${step}/${totalSteps} - ${scenarioLabel(scenario)} - ${t('w_' + id)} ${formLabel(form)}`);
        }
        const avg = rounds.reduce((a, b) => a + b, 0) / rounds.length;
        rows.push({
          id, form, scenario, dps: avg, ratio: 1, median: 0, rounds,
          min: Math.min(...rounds), max: Math.max(...rounds), sd: stdev(rounds, avg),
        });
      }
    }
  }

  applyRatios(rows);
  const json: BenchJson = {
    version: 2,
    preset: cfg.preset === 'weaponEval32' ? 'weaponEval32' : 'default',
    generatedAt: new Date().toISOString(),
    simSeconds: cfg.simSeconds,
    rounds: cfg.rounds,
    forms: cfg.forms,
    scenarios: cfg.scenarios,
    targetPolicy: {
      staticRings: '24 high-HP static targets: r56/r110/r260 x8; no damage, no XP, no knockback.',
      movingSwarm: '24 high-HP chase targets: r360/r480/r600 x8; speed 64; no damage, no XP, no knockback.',
      singlePack: '5 high-HP static targets: one primary at x116 plus four nearby satellites; no damage, no XP, no knockback.',
    },
    rows,
  };

  console.table(rows.map((r) => ({
    scenario: r.scenario, weapon: r.id, form: r.form, dps: Math.round(r.dps), ratio: r.ratio.toFixed(2), sd: r.sd.toFixed(1),
  })));

  const md = cfg.preset === 'weaponEval32' ? multiMarkdown(json) : legacyMarkdown(rows);
  (window as unknown as { __benchJson: BenchJson }).__benchJson = json;
  (window as unknown as { __benchResult: string }).__benchResult = md;
  (window as unknown as { __benchRows: unknown }).__benchRows = cfg.preset === 'weaponEval32' ? rows : toLegacyRows(rows);

  restorePresentation();
  SFX.setMuted(wasMuted);
  label.setText('DPS bench 完成：window.__benchResult / __benchJson / __benchRows\n点击任意处返回主菜单');
  gs.input.once('pointerup', () => gs.scene.start('title'));
}

async function snapshot(gs: GameScene, w: number, h: number): Promise<string> {
  return new Promise((resolve) => {
    gs.game.renderer.snapshot((shot) => {
      const img = shot as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#fffdf6';
      c.fillRect(0, 0, w, h);
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      c.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    }, 'image/jpeg', 0.86);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function contactSheet(title: string, entries: Array<{ id: WeaponId; label: string; src: string }>): Promise<string> {
  const cols = 4;
  const cellW = 330;
  const cellH = 238;
  const headerH = 58;
  const rows = Math.ceil(entries.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = headerH + rows * cellH;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#5a5248';
  c.font = `bold 28px ${FONT}`;
  c.fillText(title, 24, 38);
  c.font = `15px ${FONT}`;
  c.fillStyle = '#8a7a62';
  c.fillText('Dawnfield weapon evaluation contact sheet - generated from live Phaser canvas', 430, 38);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const img = await loadImage(entry.src);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellW + 12;
    const y = headerH + row * cellH + 10;
    c.fillStyle = '#f3ead8';
    c.fillRect(x - 4, y - 4, cellW - 16, cellH - 12);
    c.strokeStyle = '#d8c7a8';
    c.strokeRect(x - 4, y - 4, cellW - 16, cellH - 12);
    c.drawImage(img, x, y + 24, cellW - 24, cellH - 46);
    c.fillStyle = '#5a5248';
    c.font = `bold 15px ${FONT}`;
    c.fillText(`${entry.id} - ${entry.label}`, x + 4, y + 16);
  }
  return canvas.toDataURL('image/jpeg', 0.88);
}

async function runVisualSheets(gs: GameScene, rawCfg: BenchConfig): Promise<void> {
  const cfg = normalizeConfig({ ...rawCfg, forms: ['lv5', 'evo'], scenarios: ['staticRings'], quietFx: false });
  const wasMuted = SFX.muted;
  SFX.setMuted(true);
  const label = gs.add.text(16, 16, 'Weapon visual sheets...', {
    fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#5A5248',
    stroke: '#FFFFFF', strokeThickness: 4,
  }).setScrollFactor(0).setDepth(1e9);
  const targets = ensureTargets(gs, placementsFor('staticRings').length);
  const sheets: Array<{ name: string; dataUrl: string }> = [];

  for (const form of ['lv5', 'evo'] as BenchForm[]) {
    const entries: Array<{ id: WeaponId; label: string; src: string }> = [];
    let i = 0;
    for (const id of cfg.ids) {
      resetTargets(targets, 'staticRings');
      prepareWeapon(gs, id, form);
      let fakeNow = performance.now();
      fakeNow = await pump(gs, 0.82, fakeNow);
      entries.push({
        id,
        label: form === 'evo' ? t('w_' + id + '_e') : t('w_' + id),
        src: await snapshot(gs, 300, 190),
      });
      await drain(gs, fakeNow);
      label.setText(`Weapon visual ${formLabel(form)} ${++i}/${cfg.ids.length} - ${t('w_' + id)}`);
    }
    const name = form === 'evo' ? 'weapon_eval_contact_evo' : 'weapon_eval_contact_base';
    const dataUrl = await contactSheet(form === 'evo' ? '32 Weapon Evolutions' : '32 Base Weapons Lv5', entries);
    await fetch(`/__shot?name=${name}`, { method: 'POST', body: dataUrl });
    sheets.push({ name: `${name}.jpg`, dataUrl });
  }

  (window as unknown as { __weaponVisualSheets: unknown }).__weaponVisualSheets = sheets;
  SFX.setMuted(wasMuted);
  label.setText('视觉接触表完成：.shots/weapon_eval_contact_base.jpg 与 _evo.jpg\n点击任意处返回主菜单');
  gs.input.once('pointerup', () => gs.scene.start('title'));
}

export async function runBench(gs: GameScene): Promise<void> {
  const cfg = (window as unknown as { __benchConfig?: BenchConfig }).__benchConfig ?? {};
  if (cfg.preset === 'weaponVisualSheets') {
    await runVisualSheets(gs, cfg);
    return;
  }
  await runDpsBench(gs, cfg);
}
