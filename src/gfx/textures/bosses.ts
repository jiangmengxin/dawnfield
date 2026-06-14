// Boss 门面纹理：角色同级的程序化多帧 Boss 美术。
// 约束：不引入外部图片；旧 base texture key 保留给图鉴/成就静态展示。
import type { EnemyId, MapId } from '../../content/ids';
import {
  BRAMBLE, CLOCKWORK, GROVE, HILLS, LAVENDER, MIRAGE, NOCTURNE, ORCHARD, PAL, POND, SNOWBELL, SUMMIT, cssOf,
} from '../palette';
import { Ctx, makeTex, petalShape, silhouettePass, softGlow, star } from './core';

const TAU = Math.PI * 2;

export type BossFramePhase = 'p1' | 'p2';
export type BossFrameState = 'idle' | 'hit' | 'cast_main' | 'cast_support' | 'death';
export type BossTelegraphStyle =
  | 'ink' | 'bubble' | 'feather' | 'spore' | 'butterfly' | 'bramble'
  | 'star' | 'night' | 'cider' | 'frost' | 'mirror' | 'clock';

type BossArchetype =
  | 'inkKing' | 'bubbleKing' | 'galeCrow' | 'sporeKing' | 'flutterQueen'
  | 'brambleBear' | 'starElk' | 'nightOwl' | 'ciderWyrm' | 'frostHare'
  | 'mirageWhale' | 'clockRooster';

export interface BossArtSpec {
  mapId: MapId;
  enemyId: EnemyId;
  key: string;
  w: number;
  h: number;
  archetype: BossArchetype;
  style: BossTelegraphStyle;
  body: number;
  edge: number;
  accent: number;
  accent2: number;
  glow: string;
}

export const BOSS_FRAME_COUNTS: Record<BossFrameState, number> = {
  idle: 4,
  hit: 2,
  cast_main: 2,
  cast_support: 2,
  death: 2,
};

export const BOSS_FRAME_STATES = ['idle', 'hit', 'cast_main', 'cast_support', 'death'] as const satisfies readonly BossFrameState[];
export const BOSS_FRAME_PHASES = ['p1', 'p2'] as const satisfies readonly BossFramePhase[];

export const BOSS_ART_SPECS = [
  {
    mapId: 'meadow', enemyId: 'boss', key: 'e_boss', w: 184, h: 168, archetype: 'inkKing', style: 'ink',
    body: PAL.boss, edge: PAL.bossEdge, accent: 0xf2da9a, accent2: 0xbcc6e2, glow: 'rgba(138,150,184,0.34)',
  },
  {
    mapId: 'pond', enemyId: 'bubbleking', key: 'e_bubbleking', w: 184, h: 166, archetype: 'bubbleKing', style: 'bubble',
    body: POND.bubbleking, edge: POND.bubblekingEdge, accent: POND.bubble, accent2: POND.lotus, glow: 'rgba(126,188,216,0.34)',
  },
  {
    mapId: 'hills', enemyId: 'galecrow', key: 'e_galecrow', w: 194, h: 166, archetype: 'galeCrow', style: 'feather',
    body: HILLS.galecrow, edge: HILLS.galecrowEdge, accent: HILLS.feather, accent2: HILLS.daisyCore, glow: 'rgba(226,170,104,0.28)',
  },
  {
    mapId: 'grove', enemyId: 'sporeking', key: 'e_sporeking', w: 184, h: 172, archetype: 'sporeKing', style: 'spore',
    body: GROVE.sporeking, edge: GROVE.sporekingEdge, accent: GROVE.sporekingCap, accent2: GROVE.spore, glow: 'rgba(176,216,120,0.28)',
  },
  {
    mapId: 'lavender', enemyId: 'flutterqueen', key: 'e_flutterqueen', w: 202, h: 168, archetype: 'flutterQueen', style: 'butterfly',
    body: LAVENDER.flutterqueen, edge: LAVENDER.flutterqueenEdge, accent: LAVENDER.dust, accent2: LAVENDER.bloomCore, glow: 'rgba(216,184,232,0.34)',
  },
  {
    mapId: 'bramble', enemyId: 'bramblebear', key: 'e_bramblebear', w: 186, h: 174, archetype: 'brambleBear', style: 'bramble',
    body: BRAMBLE.bramblebear, edge: BRAMBLE.bramblebearEdge, accent: BRAMBLE.berryDecor, accent2: BRAMBLE.thornDecor, glow: 'rgba(216,120,136,0.28)',
  },
  {
    mapId: 'nocturne', enemyId: 'starelk', key: 'e_starelk', w: 194, h: 176, archetype: 'starElk', style: 'star',
    body: NOCTURNE.starelk, edge: NOCTURNE.starelkEdge, accent: NOCTURNE.starelkAntler, accent2: NOCTURNE.starGlow, glow: 'rgba(143,168,232,0.33)',
  },
  {
    mapId: 'summit', enemyId: 'nightowl', key: 'e_nightowl', w: 194, h: 170, archetype: 'nightOwl', style: 'night',
    body: SUMMIT.nightowl, edge: SUMMIT.nightowlEdge, accent: SUMMIT.nightowlBelly, accent2: SUMMIT.dawnbloom, glow: 'rgba(155,143,200,0.34)',
  },
  {
    mapId: 'orchard', enemyId: 'ciderwyrm', key: 'e_ciderwyrm', w: 204, h: 162, archetype: 'ciderWyrm', style: 'cider',
    body: ORCHARD.ciderwyrm, edge: ORCHARD.ciderwyrmEdge, accent: ORCHARD.apple, accent2: ORCHARD.leaf, glow: 'rgba(240,184,104,0.32)',
  },
  {
    mapId: 'snowbell', enemyId: 'frosthare', key: 'e_frosthare', w: 192, h: 172, archetype: 'frostHare', style: 'frost',
    body: SNOWBELL.frosthare, edge: SNOWBELL.frosthareEdge, accent: SNOWBELL.crystal, accent2: SNOWBELL.bellCore, glow: 'rgba(174,224,240,0.34)',
  },
  {
    mapId: 'mirage', enemyId: 'miragewhale', key: 'e_miragewhale', w: 208, h: 162, archetype: 'mirageWhale', style: 'mirror',
    body: MIRAGE.miragewhale, edge: MIRAGE.miragewhaleEdge, accent: MIRAGE.glassShot, accent2: MIRAGE.prism, glow: 'rgba(168,207,232,0.34)',
  },
  {
    mapId: 'clockwork', enemyId: 'clockrooster', key: 'e_clockrooster', w: 198, h: 174, archetype: 'clockRooster', style: 'clock',
    body: CLOCKWORK.clockrooster, edge: CLOCKWORK.clockroosterEdge, accent: CLOCKWORK.roosterComb, accent2: CLOCKWORK.gold, glow: 'rgba(217,170,76,0.32)',
  },
] as const satisfies readonly BossArtSpec[];

export const BOSS_ART_BY_MAP = Object.fromEntries(BOSS_ART_SPECS.map((s) => [s.mapId, s])) as Record<MapId, BossArtSpec>;
export const BOSS_ART_BY_KEY = Object.fromEntries(BOSS_ART_SPECS.map((s) => [s.key, s])) as Record<string, BossArtSpec>;
export const BOSS_ART_BY_ENEMY = Object.fromEntries(BOSS_ART_SPECS.map((s) => [s.enemyId, s])) as Partial<Record<EnemyId, BossArtSpec>>;

export function bossFrameKey(baseKey: string, phase: BossFramePhase, state: BossFrameState, frame: number): string {
  return `${baseKey}_${phase}_${state}${frame}`;
}

export function bossFrameKeysFor(baseKey: string): string[] {
  const keys = [baseKey];
  for (const phase of BOSS_FRAME_PHASES) {
    for (const state of BOSS_FRAME_STATES) {
      for (let i = 0; i < BOSS_FRAME_COUNTS[state]; i++) keys.push(bossFrameKey(baseKey, phase, state, i));
    }
  }
  return keys;
}

export function bossTextureKey(baseKey: string, state: BossFrameState, phase2: boolean, frame: number): string {
  const phase: BossFramePhase = phase2 ? 'p2' : 'p1';
  const n = BOSS_FRAME_COUNTS[state];
  return bossFrameKey(baseKey, phase, state, Math.max(0, Math.floor(frame) % n));
}

export function createBossTextures(scene: Phaser.Scene, mapId: MapId): void {
  const spec = BOSS_ART_BY_MAP[mapId];
  createBossTextureSet(scene, spec);
}

function createBossTextureSet(scene: Phaser.Scene, spec: BossArtSpec): void {
  replaceTex(scene, spec.key, spec.w, spec.h, (ctx, w, h) => drawBossFrame(ctx, w, h, spec, 'p1', 'idle', 0));
  for (const phase of BOSS_FRAME_PHASES) {
    for (const state of BOSS_FRAME_STATES) {
      for (let frame = 0; frame < BOSS_FRAME_COUNTS[state]; frame++) {
        replaceTex(scene, bossFrameKey(spec.key, phase, state, frame), spec.w, spec.h, (ctx, w, h) => {
          drawBossFrame(ctx, w, h, spec, phase, state, frame);
        });
      }
    }
  }
}

function replaceTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  makeTex(scene, key, w, h, draw);
}

function drawBossFrame(ctx: Ctx, w: number, h: number, spec: BossArtSpec, phase: BossFramePhase, state: BossFrameState, frame: number): void {
  const p2 = phase === 'p2';
  const idleT = state === 'idle' ? frame / BOSS_FRAME_COUNTS.idle : frame / Math.max(1, BOSS_FRAME_COUNTS[state]);
  const wave = Math.sin(idleT * TAU);
  const cast = state === 'cast_main' || state === 'cast_support';
  const hit = state === 'hit';
  const death = state === 'death';
  const phaseBoost = p2 ? 1 : 0;
  const bob = death ? 5 + frame * 4 : cast ? -3 : wave * 2.6;
  const squashX = death ? 1.08 : hit ? 1.08 - frame * 0.04 : cast ? 0.98 : 1;
  const squashY = death ? 0.78 - frame * 0.04 : hit ? 0.92 + frame * 0.04 : cast ? 1.04 : 1;
  const mood: DrawMood = death ? 'death' : hit ? 'hit' : state === 'cast_main' ? 'main' : state === 'cast_support' ? 'support' : p2 ? 'p2' : 'idle';

  softGlow(ctx, w / 2, h / 2 + 14, Math.min(w, h) * (p2 ? 0.56 : 0.48), spec.glow);
  if (p2) drawPhaseHalo(ctx, w, h, spec, idleT);

  ctx.save();
  ctx.translate(w / 2, h / 2 + bob);
  if (death) ctx.rotate((frame === 0 ? -0.05 : 0.07) + wave * 0.02);
  ctx.scale(squashX, squashY);
  ctx.translate(-w / 2, -h / 2);
  const draw = (c: Ctx): void => drawBossCreature(c, w, h, spec, { frame, wave, phaseBoost, mood });
  silhouettePass(ctx, w, h, cssOf(spec.edge), draw);
  ctx.restore();

  if (p2) drawPhaseForeground(ctx, w, h, spec, idleT);
  if (cast) drawCastGlints(ctx, w, h, spec, state, p2, frame);
  if (hit) drawHitPolish(ctx, w, h, spec, frame);
  if (death) drawDeathVeil(ctx, w, h, spec, frame);
}

type DrawMood = 'idle' | 'p2' | 'hit' | 'main' | 'support' | 'death';

interface DrawState {
  frame: number;
  wave: number;
  phaseBoost: number;
  mood: DrawMood;
}

function drawBossCreature(ctx: Ctx, w: number, h: number, spec: BossArtSpec, st: DrawState): void {
  switch (spec.archetype) {
    case 'inkKing':
      drawInkKing(ctx, w, h, spec, st);
      break;
    case 'bubbleKing':
      drawBubbleKing(ctx, w, h, spec, st);
      break;
    case 'galeCrow':
      drawGaleCrow(ctx, w, h, spec, st);
      break;
    case 'sporeKing':
      drawSporeKing(ctx, w, h, spec, st);
      break;
    case 'flutterQueen':
      drawFlutterQueen(ctx, w, h, spec, st);
      break;
    case 'brambleBear':
      drawBrambleBear(ctx, w, h, spec, st);
      break;
    case 'starElk':
      drawStarElk(ctx, w, h, spec, st);
      break;
    case 'nightOwl':
      drawNightOwl(ctx, w, h, spec, st);
      break;
    case 'ciderWyrm':
      drawCiderWyrm(ctx, w, h, spec, st);
      break;
    case 'frostHare':
      drawFrostHare(ctx, w, h, spec, st);
      break;
    case 'mirageWhale':
      drawMirageWhale(ctx, w, h, spec, st);
      break;
    case 'clockRooster':
      drawClockRooster(ctx, w, h, spec, st);
      break;
  }
}

function drawInkKing(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 6;
  const lift = st.mood === 'main' ? -7 : st.mood === 'support' ? -3 : 0;
  drawMantle(ctx, cx, cy + 28, 68, s.body, s.edge, st.wave);
  for (let i = 0; i < 5; i++) {
    const x = cx - 48 + i * 24;
    fillEllipse(ctx, x, cy + 60 + (i % 2 ? 5 : -1), 9, 15, 0, colorLight(s.body, 0.08), cssOf(s.edge), 1.7);
  }
  fillEllipse(ctx, cx, cy + lift, 61, 54, -0.05, bossGrad(ctx, cx, cy - 16, 64, s.body, st), cssOf(s.edge), 4);
  drawCrown(ctx, cx, cy - 50 + lift + st.wave * 1.5, 58, 32, s.accent, 0xccaa55, st.mood === 'support' ? -0.15 : 0);
  drawFace(ctx, cx, cy - 5 + lift, 60, st, 'stern');
  drawInkDrops(ctx, cx, cy, s, st);
}

function drawBubbleKing(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 8;
  const castSpread = st.mood === 'main' ? 1.12 : 1;
  for (const side of [-1, 1]) {
    fillBubble(ctx, cx + side * 42 * castSpread, cy + 42, 20, s.accent, s.edge, 0.44);
    fillBubble(ctx, cx + side * 58, cy + 8 + st.wave * 2, 15, s.accent2, s.edge, 0.35);
  }
  fillBubble(ctx, cx, cy, st.mood === 'hit' ? 55 : 60, s.body, s.edge, 0.72);
  fillEllipse(ctx, cx, cy + 45, 55, 20, 0, rgba(s.accent, 0.46), cssOf(s.edge), 2.4);
  for (let i = 0; i < 5; i++) fillBubble(ctx, cx - 36 + i * 18, cy - 58 + Math.sin(i + st.wave) * 3, 9 + (i % 2) * 3, s.accent2, s.edge, 0.62);
  drawFace(ctx, cx, cy - 3, 55, st, 'round');
  drawBubbleHighlights(ctx, cx, cy, st);
}

function drawGaleCrow(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 9;
  const flap = st.mood === 'main' ? -0.35 : st.mood === 'support' ? 0.25 : st.wave * 0.14;
  for (const side of [-1, 1]) {
    drawWing(ctx, cx + side * 33, cy + 8, side, 58, 34, flap * side, s.body, s.edge, s.accent);
    drawFeatherFan(ctx, cx + side * 51, cy + 28, side, s, st);
  }
  fillEllipse(ctx, cx, cy, 42, 53, 0, bossGrad(ctx, cx - 12, cy - 20, 54, s.body, st), cssOf(s.edge), 3.5);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 4);
    ctx.lineTo(cx + 24, cy + (st.mood === 'support' ? -8 : 0));
    ctx.lineTo(cx - 8, cy + 12);
    ctx.closePath();
  }, cssOf(s.accent2), cssOf(s.edge), 2.5);
  drawFace(ctx, cx - 8, cy - 8, 42, st, 'beak');
  drawCrest(ctx, cx - 4, cy - 50, s.accent, s.edge, st.wave);
}

function drawSporeKing(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 14;
  const capLift = st.mood === 'main' ? -7 : 0;
  fillEllipse(ctx, cx, cy + 19, 45, 50, 0, bossGrad(ctx, cx - 12, cy - 8, 52, s.body, st), cssOf(s.edge), 3.5);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - 68, cy - 16 + capLift);
    ctx.bezierCurveTo(cx - 42, cy - 68 + capLift, cx + 42, cy - 68 + capLift, cx + 68, cy - 16 + capLift);
    ctx.quadraticCurveTo(cx + 30, cy + 2 + capLift, cx, cy - 2 + capLift);
    ctx.quadraticCurveTo(cx - 30, cy + 2 + capLift, cx - 68, cy - 16 + capLift);
    ctx.closePath();
  }, bossGrad(ctx, cx - 18, cy - 48 + capLift, 70, s.accent, st), cssOf(s.edge), 3.8);
  for (let i = 0; i < 8; i++) {
    const a = -2.7 + i * 0.78;
    fillEllipse(ctx, cx + Math.cos(a) * 43, cy - 29 + Math.sin(a) * 14 + capLift, 7 + (i % 2) * 2, 4.5, a * 0.4, rgba(s.accent2, 0.78), cssOf(s.edge), 1.2);
  }
  drawBeard(ctx, cx, cy + 38, s, st);
  drawFace(ctx, cx, cy + 8, 42, st, 'elder');
  for (const side of [-1, 1]) drawTinyShroom(ctx, cx + side * 55, cy + 50, s, side, st.wave);
}

function drawFlutterQueen(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 8;
  const close = st.mood === 'main' ? 0.22 : st.mood === 'support' ? -0.18 : st.wave * 0.08;
  for (const side of [-1, 1]) {
    drawButterflyWing(ctx, cx + side * 26, cy - 4, side, 64, 48, close, s, st);
    drawButterflyWing(ctx, cx + side * 22, cy + 36, side, 48, 34, -close * 0.7, s, st, true);
  }
  fillEllipse(ctx, cx, cy + 14, 28, 57, 0, bossGrad(ctx, cx - 8, cy - 26, 50, s.body, st), cssOf(s.edge), 3.2);
  drawAntennae(ctx, cx, cy - 45, s, st.wave);
  drawCrown(ctx, cx, cy - 48, 35, 20, s.accent2, s.edge, 0);
  drawFace(ctx, cx, cy - 2, 37, st, 'queen');
  drawDust(ctx, cx, cy, s, st);
}

function drawBrambleBear(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 13;
  const pawLift = st.mood === 'main' ? -20 : st.mood === 'support' ? -10 : 0;
  for (const side of [-1, 1]) {
    fillEllipse(ctx, cx + side * 41, cy - 32, 21, 24, 0, bossGrad(ctx, cx, cy - 45, 25, s.body, st), cssOf(s.edge), 3);
    fillEllipse(ctx, cx + side * 58, cy + 16 + pawLift, 22, 18, side * 0.35, colorLight(s.body, 0.1), cssOf(s.edge), 3);
  }
  fillEllipse(ctx, cx, cy + 20, 58, 58, 0, bossGrad(ctx, cx - 15, cy - 8, 62, s.body, st), cssOf(s.edge), 4);
  drawBrambleCollar(ctx, cx, cy - 22, s, st);
  fillEllipse(ctx, cx, cy + 20, 27, 22, 0, colorLight(s.body, 0.42), cssOf(s.edge), 2);
  drawFace(ctx, cx, cy - 8, 48, st, 'bear');
  for (let i = 0; i < 6; i++) fillEllipse(ctx, cx - 44 + i * 18, cy - 39 + (i % 2) * 5, 5, 6, 0.2, cssOf(s.accent), cssOf(s.edge), 1.2);
}

function drawStarElk(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 16;
  const antlerGlow = st.mood === 'main' || st.phaseBoost > 0 ? 1 : 0;
  drawAntlers(ctx, cx, cy - 48, s, st.wave, antlerGlow);
  for (const side of [-1, 1]) fillEllipse(ctx, cx + side * 36, cy - 20, 18, 27, side * -0.5, colorLight(s.body, 0.2), cssOf(s.edge), 2.5);
  fillEllipse(ctx, cx, cy + 16, 45, 58, 0, bossGrad(ctx, cx - 12, cy - 20, 58, s.body, st), cssOf(s.edge), 3.6);
  fillEllipse(ctx, cx, cy - 28, 32, 36, 0, bossGrad(ctx, cx - 7, cy - 43, 40, s.body, st), cssOf(s.edge), 3);
  star(ctx, cx, cy - 37, 5, 8 + antlerGlow * 2, 3.4, cssOf(s.accent2), cssOf(s.edge));
  drawFace(ctx, cx, cy - 22, 35, st, 'deer');
  drawStarMantle(ctx, cx, cy + 28, s, st);
}

function drawNightOwl(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 10;
  const gaze = st.mood === 'main';
  for (const side of [-1, 1]) drawOwlWing(ctx, cx + side * 37, cy + 16, side, s, st);
  drawEarTufts(ctx, cx, cy - 45, s, st.wave);
  fillEllipse(ctx, cx, cy + 12, 56, 57, 0, bossGrad(ctx, cx - 12, cy - 14, 62, s.body, st), cssOf(s.edge), 3.8);
  fillEllipse(ctx, cx, cy + 33, 31, 21, 0, rgba(s.accent, 0.55), cssOf(s.edge), 2);
  for (const side of [-1, 1]) {
    fillEllipse(ctx, cx + side * 22, cy - 12, gaze ? 21 : 18, gaze ? 23 : 18, 0, colorLight(s.accent2, 0.22), cssOf(s.edge), 2.4);
  }
  drawFace(ctx, cx, cy - 13, 46, st, 'owl');
  drawMoonMark(ctx, cx, cy + 30, s);
}

function drawCiderWyrm(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2 + 4;
  const cy = h / 2 + 15;
  const coil = st.mood === 'main' ? 1.25 : 1;
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const x = cx - 72 + i * 30;
    const y = cy + Math.sin(k * Math.PI * 1.6 + st.wave * 0.7) * 15;
    fillEllipse(ctx, x, y, 25, 20, 0.18, bossGrad(ctx, x - 8, y - 8, 28, s.body, st), cssOf(s.edge), 2.6);
    fillEllipse(ctx, x, y - 7, 7, 4, 0, rgba(s.accent, 0.55), cssOf(s.edge), 1);
  }
  fillEllipse(ctx, cx + 58, cy - 4, 37 * coil, 30, -0.08, bossGrad(ctx, cx + 47, cy - 20, 44, s.body, st), cssOf(s.edge), 3.2);
  drawLeaves(ctx, cx + 42, cy - 34, s, st.wave);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx + 83, cy - 5);
    ctx.lineTo(cx + 108, cy + (st.mood === 'support' ? -15 : 0));
    ctx.lineTo(cx + 83, cy + 12);
    ctx.closePath();
  }, cssOf(s.accent), cssOf(s.edge), 2.4);
  drawFace(ctx, cx + 52, cy - 8, 31, st, 'wyrm');
}

function drawFrostHare(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 15;
  const earKick = st.mood === 'main' ? -0.18 : st.wave * 0.08;
  for (const side of [-1, 1]) {
    fillEllipse(ctx, cx + side * 21, cy - 67, 14, 49, side * (0.18 + earKick), bossGrad(ctx, cx, cy - 75, 45, s.body, st), cssOf(s.edge), 3);
    fillEllipse(ctx, cx + side * 21, cy - 67, 7, 34, side * (0.18 + earKick), rgba(s.accent, 0.46), cssOf(s.edge), 1.4);
  }
  fillEllipse(ctx, cx, cy + 17, 50, 54, 0, bossGrad(ctx, cx - 12, cy - 5, 58, s.body, st), cssOf(s.edge), 3.6);
  fillEllipse(ctx, cx, cy + 31, 24, 20, 0, rgba(PAL.white, 0.55), cssOf(s.edge), 2);
  drawFace(ctx, cx, cy - 4, 42, st, 'hare');
  star(ctx, cx, cy - 42, 6, 10 + st.phaseBoost * 2, 4, cssOf(s.accent2), cssOf(s.edge));
  drawFrostCrystals(ctx, cx, cy + 51, s, st);
}

function drawMirageWhale(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2 + 2;
  const cy = h / 2 + 18;
  const swish = st.mood === 'main' ? 0.5 : st.wave * 0.12;
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy + 1);
    ctx.bezierCurveTo(cx - 60, cy - 45, cx + 36, cy - 52, cx + 76, cy - 10);
    ctx.bezierCurveTo(cx + 61, cy + 38, cx - 42, cy + 51, cx - 80, cy + 1);
    ctx.closePath();
  }, bossGrad(ctx, cx - 25, cy - 28, 80, s.body, st), cssOf(s.edge), 3.4);
  for (const side of [-1, 1]) drawWhaleTail(ctx, cx - 83, cy - 1, side, s, swish);
  drawPrismFin(ctx, cx + 12, cy - 38, s, st);
  drawFace(ctx, cx + 37, cy - 6, 37, st, 'whale');
  for (let i = 0; i < 4; i++) {
    fillPath(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(cx - 28 + i * 24, cy + 18);
      ctx.lineTo(cx - 12 + i * 24, cy + 14);
      ctx.lineTo(cx - 18 + i * 24, cy + 25);
      ctx.closePath();
    }, rgba(s.accent2, 0.48), cssOf(s.edge), 1.2);
  }
}

function drawClockRooster(ctx: Ctx, w: number, h: number, s: BossArtSpec, st: DrawState): void {
  const cx = w / 2;
  const cy = h / 2 + 15;
  const beat = st.mood === 'main' ? -9 : st.wave * 2;
  for (const side of [-1, 1]) drawClockWing(ctx, cx + side * 44, cy + 18, side, s, st);
  fillEllipse(ctx, cx, cy + 16, 47, 56, 0, bossGrad(ctx, cx - 12, cy - 13, 58, s.body, st), cssOf(s.edge), 3.8);
  fillEllipse(ctx, cx, cy - 33, 35, 35, 0, bossGrad(ctx, cx - 8, cy - 47, 44, s.body, st), cssOf(s.edge), 3.2);
  drawComb(ctx, cx, cy - 63 + beat, s.accent, s.edge);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 29);
    ctx.lineTo(cx + 39, cy - 20 + (st.mood === 'support' ? 7 : 0));
    ctx.lineTo(cx + 8, cy - 11);
    ctx.closePath();
  }, cssOf(s.accent2), cssOf(s.edge), 2.5);
  drawFace(ctx, cx - 4, cy - 28, 34, st, 'rooster');
  drawClockBelly(ctx, cx, cy + 18, s, st);
}

function fillPath(ctx: Ctx, build: () => void, fill: string | CanvasGradient, edge: string, lineWidth: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  build();
  ctx.fillStyle = fill;
  ctx.fill();
  build();
  ctx.strokeStyle = edge;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function fillEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rot: number, fill: string | CanvasGradient, edge: string, lineWidth: number): void {
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
  }, fill, edge, lineWidth);
}

function fillBubble(ctx: Ctx, cx: number, cy: number, r: number, body: number, edge: number, alpha: number): void {
  fillEllipse(ctx, cx, cy, r, r * 0.94, 0, rgba(body, alpha), rgba(edge, 0.92), 2.4);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = Math.max(1.4, r * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx - r * 0.22, cy - r * 0.2, r * 0.55, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
}

function bossGrad(ctx: Ctx, cx: number, cy: number, r: number, body: number, st: DrawState): CanvasGradient {
  const g = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.44, r * 0.12, cx, cy, r * 1.25);
  const phase = st.phaseBoost > 0 ? 0.08 : 0;
  const hit = st.mood === 'hit' ? 0.18 : 0;
  g.addColorStop(0, colorLight(body, 0.56 + phase + hit));
  g.addColorStop(0.56, colorLight(body, 0.16 + phase));
  g.addColorStop(1, cssOf(body));
  return g;
}

function drawFace(ctx: Ctx, cx: number, cy: number, r: number, st: DrawState, face: 'stern' | 'round' | 'beak' | 'elder' | 'queen' | 'bear' | 'deer' | 'owl' | 'wyrm' | 'hare' | 'whale' | 'rooster'): void {
  const ink = cssOf(PAL.ink);
  const blink = st.mood === 'idle' && st.frame === 3;
  const cast = st.mood === 'main' || st.mood === 'support';
  const hit = st.mood === 'hit' || st.mood === 'death';
  const eyeGap = face === 'whale' ? r * 0.3 : face === 'wyrm' || face === 'rooster' ? r * 0.34 : r * 0.42;
  const er = face === 'owl' ? r * 0.17 : r * 0.12;
  const eyeY = cy - r * 0.1;
  ctx.save();
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const x = cx + side * eyeGap;
    if (blink || hit) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, eyeY - er * 0.2, er * 1.25, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, er * (cast ? 1.05 : 0.88), er * (cast ? 1.5 : 1.25), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.beginPath();
      ctx.arc(x - er * 0.28, eyeY - er * 0.45, er * 0.38, 0, TAU);
      ctx.fill();
      if (cast) {
        ctx.fillStyle = 'rgba(255,244,196,0.86)';
        ctx.beginPath();
        ctx.arc(x + er * 0.35, eyeY + er * 0.25, er * 0.2, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 2.2;
  if (face === 'beak' || face === 'owl' || face === 'rooster') {
    fillPath(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.08);
      ctx.lineTo(cx + r * 0.16, cy + r * 0.24);
      ctx.lineTo(cx - r * 0.16, cy + r * 0.24);
      ctx.closePath();
    }, face === 'owl' ? '#F0C060' : '#F0B860', ink, 1.5);
  } else if (face === 'bear') {
    fillEllipse(ctx, cx, cy + r * 0.22, r * 0.24, r * 0.17, 0, 'rgba(255,245,220,0.72)', ink, 1.4);
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.22, r * 0.07, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.2, r * (cast ? 0.2 : 0.16), 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
  }
  if (face !== 'beak' && face !== 'owl' && face !== 'rooster') {
    ctx.fillStyle = 'rgba(248,150,160,0.42)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * r * 0.63, cy + r * 0.12, r * 0.13, r * 0.08, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPhaseHalo(ctx: Ctx, w: number, h: number, s: BossArtSpec, t: number): void {
  const cx = w / 2;
  const cy = h / 2 + 14;
  ctx.save();
  ctx.strokeStyle = rgba(s.accent2, 0.36);
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 9]);
  ctx.lineDashOffset = -t * 18;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.38, h * 0.38, 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 8; i++) {
    const a = t * TAU + i * TAU / 8;
    const r = w * 0.35 + (i % 2) * 5;
    drawTinyMotif(ctx, s.style, cx + Math.cos(a) * r, cy + Math.sin(a) * h * 0.32, 4.2, s.accent2, s.edge);
  }
  ctx.restore();
}

function drawPhaseForeground(ctx: Ctx, w: number, h: number, s: BossArtSpec, t: number): void {
  const cx = w / 2;
  const cy = h / 2 + 10;
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = rgba(s.accent2, 0.68);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 34, cy - 4, 18, side > 0 ? 0.15 * Math.PI : 0.85 * Math.PI, side > 0 ? 0.72 * Math.PI : 1.28 * Math.PI);
    ctx.stroke();
    drawTinyMotif(ctx, s.style, cx + side * (54 + Math.sin(t * TAU) * 2), cy - 20, 5.2, s.accent2, s.edge);
  }
  drawTinyMotif(ctx, s.style, cx, cy - 43 + Math.sin(t * TAU) * 2, 6.4, s.accent, s.edge);
  ctx.strokeStyle = rgba(s.accent, 0.58);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy - 42, 12, 0.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawDeathVeil(ctx: Ctx, w: number, h: number, s: BossArtSpec, frame: number): void {
  const cx = w / 2;
  const cy = h / 2 + 50 + frame * 5;
  ctx.save();
  ctx.globalAlpha = frame === 0 ? 0.42 : 0.56;
  ctx.fillStyle = rgba(PAL.paper, 0.5);
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.26, h * 0.07, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = -0.2 + i * 0.68;
    drawTinyMotif(ctx, s.style, cx + Math.cos(a) * (34 + frame * 8), cy - 14 + Math.sin(a) * 10, 3.2, s.accent2, s.edge);
  }
  ctx.restore();
}

function drawCastGlints(ctx: Ctx, w: number, h: number, s: BossArtSpec, state: BossFrameState, p2: boolean, frame: number): void {
  const cx = w / 2;
  const cy = h / 2 + 4;
  const n = state === 'cast_main' ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + frame * 0.35;
    const r = 42 + (i % 2) * 14 + (p2 ? 8 : 0);
    drawTinyMotif(ctx, s.style, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.72, 3.8, s.accent2, s.edge);
  }
}

function drawHitPolish(ctx: Ctx, w: number, h: number, s: BossArtSpec, frame: number): void {
  ctx.save();
  ctx.globalAlpha = frame === 0 ? 0.34 : 0.2;
  ctx.strokeStyle = cssOf(PAL.white);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 + 12, w * 0.34, h * 0.3, -0.2, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
  drawTinyMotif(ctx, s.style, w / 2 + 37, h / 2 - 24, 5, PAL.white, s.edge);
  ctx.restore();
}

function drawMantle(ctx: Ctx, cx: number, cy: number, r: number, body: number, edge: number, wave: number): void {
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - 28);
    ctx.quadraticCurveTo(cx - r * 0.82, cy + 18, cx - r * 0.72, cy + 42 + wave * 2);
    for (let i = 0; i <= 6; i++) {
      const x = cx - r * 0.72 + (i * r * 1.44) / 6;
      const y = cy + 48 + (i % 2 ? 7 : 0) - wave;
      ctx.quadraticCurveTo(x - 8, y + 8, x, y);
    }
    ctx.quadraticCurveTo(cx + r * 0.82, cy + 18, cx + r, cy - 28);
    ctx.closePath();
  }, cssOf(body), cssOf(edge), 3.5);
}

function drawCrown(ctx: Ctx, cx: number, cy: number, width: number, height: number, fill: number, edge: number, tilt: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-width / 2, height * 0.34);
    ctx.lineTo(-width * 0.38, -height * 0.28);
    ctx.lineTo(-width * 0.16, height * 0.03);
    ctx.lineTo(0, -height * 0.5);
    ctx.lineTo(width * 0.16, height * 0.03);
    ctx.lineTo(width * 0.38, -height * 0.28);
    ctx.lineTo(width / 2, height * 0.34);
    ctx.closePath();
  }, cssOf(fill), cssOf(edge), 2.4);
  for (const x of [-width * 0.34, 0, width * 0.34]) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x, -height * 0.14, 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawInkDrops(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  for (let i = 0; i < 5; i++) {
    const a = -0.4 + i * 0.32 + st.wave * 0.03;
    fillEllipse(ctx, cx - 36 + i * 18, cy + 37 + Math.sin(i + st.wave) * 2, 4, 7, a, rgba(s.edge, 0.62), rgba(s.edge, 0.8), 1);
  }
}

function drawBubbleHighlights(ctx: Ctx, cx: number, cy: number, st: DrawState): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx - 20 + st.wave, cy - 21, 22, Math.PI * 1.05, Math.PI * 1.38);
  ctx.stroke();
  ctx.restore();
}

function drawWing(ctx: Ctx, cx: number, cy: number, side: number, len: number, wid: number, rot: number, body: number, edge: number, accent: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, -wid * 0.45);
    ctx.quadraticCurveTo(side * len * 0.85, -wid, side * len, wid * 0.08);
    ctx.quadraticCurveTo(side * len * 0.48, wid * 0.75, 0, wid * 0.45);
    ctx.closePath();
  }, colorLight(body, 0.08), cssOf(edge), 3);
  for (let i = 0; i < 4; i++) {
    const x = side * (18 + i * 10);
    petalShape(ctx, x, 6 + i * 3, 28 - i * 2, 6, side * (1.2 + i * 0.08), rgba(accent, 0.42), cssOf(edge));
  }
  ctx.restore();
}

function drawFeatherFan(ctx: Ctx, cx: number, cy: number, side: number, s: BossArtSpec, st: DrawState): void {
  for (let i = 0; i < 4; i++) {
    petalShape(ctx, cx + side * i * 6, cy + i * 7, 26, 5, side * (0.8 + i * 0.18 + st.wave * 0.04), rgba(s.accent, 0.58), cssOf(s.edge));
  }
}

function drawCrest(ctx: Ctx, cx: number, cy: number, fill: number, edge: number, wave: number): void {
  for (let i = 0; i < 3; i++) {
    petalShape(ctx, cx + (i - 1) * 8, cy + i * 2, 22 - i * 3, 6, -0.2 + (i - 1) * 0.38 + wave * 0.03, cssOf(fill), cssOf(edge));
  }
}

function drawBeard(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  for (let i = 0; i < 7; i++) {
    const x = cx - 33 + i * 11;
    fillEllipse(ctx, x, cy + Math.sin(i + st.wave) * 2, 5, 18 - Math.abs(i - 3), 0.08 * (i - 3), rgba(s.accent2, 0.72), cssOf(s.edge), 1.2);
  }
}

function drawTinyShroom(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, side: number, wave: number): void {
  fillEllipse(ctx, cx, cy + 7, 6, 12, side * 0.1, rgba(s.body, 0.68), cssOf(s.edge), 1.2);
  fillEllipse(ctx, cx, cy - 3 + wave, 14, 8, side * 0.08, cssOf(s.accent), cssOf(s.edge), 1.5);
}

function drawButterflyWing(ctx: Ctx, cx: number, cy: number, side: number, len: number, wid: number, close: number, s: BossArtSpec, st: DrawState, lower = false): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(side * (0.12 + close));
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(side * len * 0.35, -wid * 0.9, side * len * 1.02, -wid * 0.42, side * len * 0.84, wid * 0.2);
    ctx.bezierCurveTo(side * len * 0.6, wid * 0.66, side * len * 0.18, wid * 0.6, 0, 0);
    ctx.closePath();
  }, rgba(lower ? s.accent : s.body, lower ? 0.56 : 0.7), cssOf(s.edge), 2.8);
  for (let i = 0; i < 3; i++) {
    fillEllipse(ctx, side * (len * (0.36 + i * 0.14)), -wid * 0.22 + i * wid * 0.16, 7, 5, side * 0.3, rgba(st.phaseBoost ? s.accent2 : s.accent, 0.65), cssOf(s.edge), 1);
  }
  ctx.restore();
}

function drawAntennae(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, wave: number): void {
  ctx.strokeStyle = cssOf(s.edge);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 9, cy + 10);
    ctx.quadraticCurveTo(cx + side * 23, cy - 10 + wave, cx + side * 34, cy - 16);
    ctx.stroke();
    fillEllipse(ctx, cx + side * 36, cy - 17, 4, 4, 0, cssOf(s.accent2), cssOf(s.edge), 1);
  }
}

function drawDust(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8 + st.wave * 0.05;
    fillEllipse(ctx, cx + Math.cos(a) * 66, cy + Math.sin(a) * 44, 3, 3, 0, rgba(s.accent2, 0.58), 'rgba(255,255,255,0)', 0.1);
  }
}

function drawBrambleCollar(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  ctx.strokeStyle = cssOf(s.edge);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const x = cx - 48 + i * 12;
    const y = cy + Math.sin(i * 0.8 + st.wave) * 6;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    petalShape(ctx, cx - 42 + i * 14, cy + (i % 2 ? 3 : -4), 16, 4, (i % 2 ? 0.8 : -0.8), cssOf(s.accent2), cssOf(s.edge));
  }
}

function drawAntlers(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, wave: number, glow: number): void {
  ctx.save();
  ctx.strokeStyle = cssOf(s.edge);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (glow > 0) {
    ctx.shadowColor = rgba(s.accent2, 0.55);
    ctx.shadowBlur = 8;
  }
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 18, cy + 32);
    ctx.quadraticCurveTo(cx + side * 31, cy - 1 + wave, cx + side * 48, cy - 28);
    ctx.moveTo(cx + side * 35, cy - 4);
    ctx.lineTo(cx + side * 58, cy - 10);
    ctx.moveTo(cx + side * 43, cy - 18);
    ctx.lineTo(cx + side * 36, cy - 36);
    ctx.stroke();
    ctx.strokeStyle = cssOf(s.accent);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx + side * 18, cy + 32);
    ctx.quadraticCurveTo(cx + side * 31, cy - 1 + wave, cx + side * 48, cy - 28);
    ctx.stroke();
    ctx.strokeStyle = cssOf(s.edge);
    ctx.lineWidth = 4;
  }
  ctx.restore();
}

function drawStarMantle(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  for (let i = 0; i < 5; i++) {
    const x = cx - 34 + i * 17;
    star(ctx, x, cy + Math.sin(i + st.wave) * 4, 5, 4.2, 1.8, rgba(s.accent2, 0.82), cssOf(s.edge));
  }
}

function drawOwlWing(ctx: Ctx, cx: number, cy: number, side: number, s: BossArtSpec, st: DrawState): void {
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - side * 5, cy - 35);
    ctx.quadraticCurveTo(cx + side * 54, cy - 17, cx + side * 42, cy + 48);
    ctx.quadraticCurveTo(cx + side * 12, cy + 27, cx - side * 5, cy - 35);
    ctx.closePath();
  }, rgba(s.body, 0.72), cssOf(s.edge), 3);
  for (let i = 0; i < 4; i++) petalShape(ctx, cx + side * (18 + i * 7), cy + 6 + i * 9, 22, 5, side * (0.18 + st.wave * 0.02), rgba(s.accent2, 0.35), cssOf(s.edge));
}

function drawEarTufts(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, wave: number): void {
  for (const side of [-1, 1]) petalShape(ctx, cx + side * 29, cy, 30, 8, side * (0.42 + wave * 0.02), cssOf(s.body), cssOf(s.edge));
}

function drawMoonMark(ctx: Ctx, cx: number, cy: number, s: BossArtSpec): void {
  ctx.save();
  ctx.fillStyle = rgba(s.accent, 0.72);
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0.25 * Math.PI, 1.75 * Math.PI);
  ctx.arc(cx + 5, cy - 2, 9, 1.7 * Math.PI, 0.3 * Math.PI, true);
  ctx.fill();
  ctx.restore();
}

function drawLeaves(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, wave: number): void {
  for (const side of [-1, 1]) petalShape(ctx, cx + side * 10, cy + side * wave, 24, 8, side * 0.75, cssOf(s.accent2), cssOf(s.edge));
}

function drawFrostCrystals(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  for (let i = 0; i < 5; i++) {
    const x = cx - 34 + i * 17;
    star(ctx, x, cy + (i % 2) * 4 + st.wave * 1.2, 4, 5, 2.1, rgba(s.accent, 0.72), cssOf(s.edge));
  }
}

function drawWhaleTail(ctx: Ctx, cx: number, cy: number, side: number, s: BossArtSpec, swish: number): void {
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx - 25, cy + side * (22 + swish * 8), cx - 49, cy + side * 23);
    ctx.quadraticCurveTo(cx - 28, cy + side * 2, cx, cy);
    ctx.closePath();
  }, rgba(s.body, 0.72), cssOf(s.edge), 2.8);
}

function drawPrismFin(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 20);
    ctx.lineTo(cx + 17, cy - 22 - st.phaseBoost * 5);
    ctx.lineTo(cx + 33, cy + 14);
    ctx.closePath();
  }, rgba(s.accent2, 0.56), cssOf(s.edge), 2.2);
}

function drawClockWing(ctx: Ctx, cx: number, cy: number, side: number, s: BossArtSpec, st: DrawState): void {
  fillEllipse(ctx, cx, cy, 22, 42, side * (0.45 + st.wave * 0.03), rgba(s.body, 0.66), cssOf(s.edge), 2.8);
  for (let i = 0; i < 4; i++) {
    petalShape(ctx, cx + side * (6 + i * 4), cy + 6 + i * 9, 20, 4, side * 0.4, rgba(s.accent, 0.42), cssOf(s.edge));
  }
}

function drawComb(ctx: Ctx, cx: number, cy: number, fill: number, edge: number): void {
  for (let i = 0; i < 4; i++) fillEllipse(ctx, cx - 16 + i * 11, cy - (i % 2) * 5, 8, 11, 0, cssOf(fill), cssOf(edge), 1.8);
}

function drawClockBelly(ctx: Ctx, cx: number, cy: number, s: BossArtSpec, st: DrawState): void {
  fillEllipse(ctx, cx, cy, 23, 23, 0, rgba(PAL.paper, 0.68), cssOf(s.edge), 2);
  ctx.save();
  ctx.strokeStyle = cssOf(s.edge);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
    ctx.lineTo(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(-Math.PI / 2 + st.wave * 0.2) * 13, cy + Math.sin(-Math.PI / 2 + st.wave * 0.2) * 13);
  ctx.stroke();
  ctx.restore();
}

function drawTinyMotif(ctx: Ctx, style: BossTelegraphStyle, x: number, y: number, r: number, fill: number, edge: number): void {
  const f = rgba(fill, 0.78);
  const e = rgba(edge, 0.78);
  if (style === 'star' || style === 'frost' || style === 'clock') {
    star(ctx, x, y, style === 'frost' ? 4 : 5, r, r * 0.42, f, e);
  } else if (style === 'bubble' || style === 'spore' || style === 'cider') {
    fillEllipse(ctx, x, y, r, r * (style === 'cider' ? 1.2 : 1), 0, f, e, 1);
  } else if (style === 'mirror') {
    fillPath(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.8, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r * 0.8, y);
      ctx.closePath();
    }, f, e, 1);
  } else {
    petalShape(ctx, x, y, r * 2.1, r * 0.58, style === 'bramble' ? 0.8 : -0.35, f, e);
  }
}

function colorLight(c: number, k: number): string {
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  return `rgb(${Math.round(r + (255 - r) * k)},${Math.round(g + (255 - g) * k)},${Math.round(b + (255 - b) * k)})`;
}

function rgba(c: number, a: number): string {
  return `rgba(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff},${a})`;
}
