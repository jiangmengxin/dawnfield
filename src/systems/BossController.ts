// Boss 技能控制器：按 BossSpec 数据驱动。
// 新 Boss 主体 = 独占主招 + 轻辅招；旧 ring/spread/summon/dash 仅保留低频背景压力。
import type Phaser from 'phaser';
import type { BossMoveSpec, BossRing, BossSpec, BossSpread } from '../content/bosses';
import { SFX } from '../audio/sound';
import type { CombatContext } from './context';
import type { Enemy, EnemySystem } from './EnemySystem';

const TAU = Math.PI * 2;
const PLAYER_R = 14;
const PATH_SAMPLE_EVERY = 0.12;
const MAX_TRAIL = 36;

type Hazard =
  | CircleHazard
  | LineHazard
  | RingHazard
  | SectorHazard
  | SafeCircleHazard;

interface BaseHazard {
  gfx: Phaser.GameObjects.Graphics;
  delay: number;
  warn: number;
  t: number;
  color: number;
  dmg: number;
  source: Enemy;
}

interface CircleHazard extends BaseHazard {
  kind: 'circle';
  x: number;
  y: number;
  r: number;
}

interface LineHazard extends BaseHazard {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

interface RingHazard extends BaseHazard {
  kind: 'ring';
  x: number;
  y: number;
  r: number;
  width: number;
  gapA?: number;
  gapArc?: number;
}

interface SectorHazard extends BaseHazard {
  kind: 'sector';
  x: number;
  y: number;
  angle: number;
  arc: number;
  range: number;
}

interface SafeCircleHazard extends BaseHazard {
  kind: 'safeCircle';
  x: number;
  y: number;
  r: number;
}

interface Pt {
  x: number;
  y: number;
}

export class BossController {
  private moveT: number[];
  private ringT: number;
  private spreadT: number;
  private summonT: number;
  private dashT: number;
  private hazards: Hazard[] = [];
  private trail: Pt[] = [];
  private trailT = 0;

  constructor(private ctx: CombatContext, private enemies: EnemySystem, private spec: BossSpec) {
    this.moveT = spec.moves.map((m) => m.firstCd);
    this.ringT = spec.ring?.firstCd ?? Infinity;
    this.spreadT = spec.spread?.firstCd ?? Infinity;
    this.summonT = spec.summon?.firstCd ?? Infinity;
    this.dashT = spec.dash?.firstCd ?? Infinity;
  }

  get debugHazardCount(): number {
    return this.hazards.length;
  }

  update(e: Enemy, dt: number, nx: number, ny: number, dist: number): void {
    const s = this.spec;
    const phase2 = e.hp < e.maxHp * s.phase2HpK;
    this.sampleTrail(dt);
    this.updateHazards(dt);

    for (let i = 0; i < s.moves.length; i++) {
      const move = s.moves[i];
      this.moveT[i] -= dt;
      if (this.moveT[i] <= 0) {
        this.moveT[i] = phase2 ? move.cdP2 ?? move.cd : move.cd;
        this.castMove(e, move, phase2, nx, ny);
      }
    }

    this.ringT -= dt;
    this.spreadT -= dt;
    this.summonT -= dt;
    this.dashT -= dt;

    if (s.ring && this.ringT <= 0) {
      this.ringT = phase2 ? s.ring.cdP2 : s.ring.cd;
      if (!s.ring.p2Only || phase2) this.fireRing(e, s.ring, phase2);
    }
    if (s.spread && this.spreadT <= 0) {
      this.spreadT = phase2 ? s.spread.cdP2 : s.spread.cd;
      if (!s.spread.p2Only || phase2) this.fireSpread(e, s.spread, nx, ny);
    }
    if (s.summon && this.summonT <= 0) {
      this.summonT = s.summon.cd;
      if (!s.summon.p2Only || phase2) {
        for (let k = 0; k < s.summon.n; k++) {
          const a = (k / s.summon.n) * TAU;
          this.enemies.spawn(s.summon.id, e.x + Math.cos(a) * s.summon.radius, e.y + Math.sin(a) * s.summon.radius);
        }
        SFX.warning();
      }
    }
    if (s.dash && this.dashT <= 0 && dist > s.dash.minDist) {
      this.dashT = phase2 ? s.dash.cdP2 : s.dash.cd;
      e.kvx = nx * s.dash.speed;
      e.kvy = ny * s.dash.speed;
      SFX.swish();
    }
  }

  destroy(): void {
    for (const h of this.hazards) h.gfx.destroy();
    this.hazards.length = 0;
    this.trail.length = 0;
  }

  /** Test/dev hook：直接释放一招，验证 warning→resolve→cleanup 生命周期。 */
  debugCast(e: Enemy, move: BossMoveSpec, phase2: boolean): void {
    const { x, y } = this.aimToPlayer(e);
    this.castMove(e, move, phase2, x, y);
  }

  debugTick(dt: number): void {
    this.updateHazards(dt);
  }

  private castMove(e: Enemy, move: BossMoveSpec, phase2: boolean, nx: number, ny: number): void {
    const warn = phase2 ? move.warnP2 ?? move.warn : move.warn;
    const p = this.playerPt();
    const aim = Math.atan2(ny, nx);
    switch (move.id) {
      case 'ink_recall':
        this.castInkRecall(e, move, warn, phase2);
        break;
      case 'crown_drip':
        this.castCrownDrip(e, move, warn, p);
        break;
      case 'bubble_lane':
        this.castParallelLanes(e, move, warn, p, aim + Math.PI / 2, phase2 ? move.p2?.delay ?? 0.35 : 0);
        break;
      case 'bubble_pressure':
        this.addRing(e, p.x, p.y, move.radius ?? 160, move.width ?? 32, warn, move.dmg, move.color, aim, 0.95);
        break;
      case 'feather_return':
        this.addLineThrough(e, p.x, p.y, aim, move.length ?? 640, move.width ?? 30, warn, move.dmg, move.color);
        if (phase2) this.addLineThrough(e, p.x, p.y, aim + (move.p2?.rotate ?? 0.5), move.length ?? 640, move.width ?? 30, warn, move.dmg, move.color, move.p2?.delay ?? 0.38);
        break;
      case 'sidewind_shear':
        this.castParallelLanes(e, move, warn, p, aim, 0, 92);
        break;
      case 'spore_breath':
        this.castSporeBreath(e, move, warn, p, phase2);
        break;
      case 'mushroom_drop':
        this.castMushroomDrop(e, move, warn, p);
        break;
      case 'butterfly_clasp':
        this.castButterflyClasp(e, move, warn, p, aim, phase2);
        break;
      case 'dust_curve':
        this.castDustCurve(e, move, warn, p, aim);
        break;
      case 'bear_paws':
        this.castBearPaws(e, move, warn, p, aim, phase2);
        break;
      case 'bramble_rift':
        this.addLineThrough(e, p.x + Math.cos(aim) * 90, p.y + Math.sin(aim) * 90, aim, move.length ?? 300, move.width ?? 34, warn, move.dmg, move.color);
        break;
      case 'constellation_lines':
        this.castConstellation(e, move, warn, p, phase2);
        break;
      case 'meteor_mark':
        this.castMeteorMark(e, move, warn, p);
        break;
      case 'owl_gaze':
        this.addSector(e, e.x, e.y, aim, move.width ?? 0.95, move.radius ?? 360, warn, move.dmg, move.color);
        if (phase2) this.addSector(e, e.x, e.y, aim + Math.PI, move.width ?? 0.95, move.radius ?? 360, warn, move.dmg, move.color, move.p2?.delay ?? 0.35);
        break;
      case 'feather_curtain':
        this.castFeatherCurtain(e, move, warn, p, aim);
        break;
      case 'fruit_roll':
        this.addLineThrough(e, p.x, p.y, aim, move.length ?? 620, move.width ?? 44, warn, move.dmg, move.color);
        if (phase2) this.addLineThrough(e, p.x, p.y, aim + (move.p2?.rotate ?? 0.45), move.length ?? 620, move.width ?? 44, warn, move.dmg, move.color, move.p2?.delay ?? 0.35);
        break;
      case 'cider_sprout':
        this.castCiderSprout(e, move, warn, p);
        break;
      case 'snow_footsteps':
        this.castSnowFootsteps(e, move, warn, p, aim, phase2);
        break;
      case 'frost_breath':
        this.castFrostBreath(e, move, warn, aim);
        break;
      case 'mirror_tide':
        this.castMirrorTide(e, move, warn, p, aim, phase2);
        break;
      case 'mirror_shards':
        this.castMirrorShards(e, move, warn, p, aim);
        break;
      case 'dawn_beat':
        this.castDawnBeat(e, move, warn, p, phase2);
        break;
      case 'pendulum_sweep':
        this.addLineThrough(e, p.x, p.y, aim + Math.PI / 2, move.length ?? 650, move.width ?? 44, warn, move.dmg, move.color);
        if (phase2) this.addLineThrough(e, p.x, p.y, aim + Math.PI / 2 + (move.p2?.rotate ?? 0.28), move.length ?? 650, move.width ?? 44, warn, move.dmg, move.color, 0.32);
        break;
    }
    this.pump(e);
    SFX.warning();
  }

  private castInkRecall(e: Enemy, move: BossMoveSpec, warn: number, phase2: boolean): void {
    const pts = this.trail.length >= 4 ? this.pickTrail(move.count ?? 5) : this.fallbackRing(this.playerPt(), move.count ?? 5, 80);
    pts.forEach((p, i) => this.addCircle(e, p.x, p.y, move.radius ?? 34, warn, move.dmg, move.color, i * 0.04));
    if (phase2) {
      const again = [...pts].reverse();
      again.forEach((p, i) => this.addCircle(e, p.x, p.y, (move.radius ?? 34) * 0.9, warn, move.dmg, move.color, (move.p2?.delay ?? 0.45) + i * 0.04));
    }
  }

  private castCrownDrip(e: Enemy, move: BossMoveSpec, warn: number, p: Pt): void {
    const n = move.count ?? 4;
    const base = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * TAU;
      const cx = p.x + Math.cos(a) * 76;
      const cy = p.y + Math.sin(a) * 76;
      this.addLineThrough(e, cx, cy, a + Math.PI / 2, move.length ?? 210, move.width ?? 34, warn, move.dmg, move.color);
    }
  }

  private castParallelLanes(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, angle: number, p2Delay: number, gap = 118): void {
    const nx = Math.cos(angle + Math.PI / 2);
    const ny = Math.sin(angle + Math.PI / 2);
    for (const side of [-1, 1]) {
      this.addLineThrough(e, p.x + nx * gap * side, p.y + ny * gap * side, angle, move.length ?? 540, move.width ?? 36, warn, move.dmg, move.color);
    }
    if (p2Delay > 0) {
      const a2 = angle + Math.PI / 2;
      const sx = Math.cos(a2 + Math.PI / 2);
      const sy = Math.sin(a2 + Math.PI / 2);
      for (const side of [-1, 1]) {
        this.addLineThrough(e, p.x + sx * gap * side * 0.82, p.y + sy * gap * side * 0.82, a2, move.length ?? 540, move.width ?? 34, warn, move.dmg, move.color, p2Delay);
      }
    }
  }

  private castSporeBreath(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, phase2: boolean): void {
    const centerFirst = !phase2 || move.p2?.reverse !== true;
    const delay = move.p2?.delay ?? 0.42;
    const center = () => this.addCircle(e, p.x, p.y, (move.radius ?? 135) * 0.48, warn, move.dmg, move.color);
    const ring = (d = 0) => this.addRing(e, p.x, p.y, move.radius ?? 135, move.width ?? 46, warn, move.dmg, move.color, undefined, undefined, d);
    if (centerFirst) {
      center();
      ring(delay);
    } else {
      ring();
      this.addCircle(e, p.x, p.y, (move.radius ?? 135) * 0.48, warn, move.dmg, move.color, delay);
    }
  }

  private castMushroomDrop(e: Enemy, move: BossMoveSpec, warn: number, p: Pt): void {
    const fx = this.ctx.facing.x || 1;
    const fy = this.ctx.facing.y || 0;
    const back = { x: p.x - fx * 105, y: p.y - fy * 105 };
    const side = { x: -fy, y: fx };
    const n = move.count ?? 3;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 58;
      this.addCircle(e, back.x + side.x * off, back.y + side.y * off, move.radius ?? 42, warn, move.dmg, move.color, i * 0.08);
    }
  }

  private castButterflyClasp(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, aim: number, phase2: boolean): void {
    const a = aim + Math.PI / 2;
    this.addLineThrough(e, p.x - Math.cos(a) * 60, p.y - Math.sin(a) * 60, aim + 0.8, move.length ?? 560, move.width ?? 28, warn, move.dmg, move.color);
    this.addLineThrough(e, p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60, aim - 0.8, move.length ?? 560, move.width ?? 28, warn, move.dmg, move.color);
    if (phase2) {
      this.addLineThrough(e, p.x, p.y, aim + (move.p2?.rotate ?? -0.65), move.length ?? 560, move.width ?? 28, warn, move.dmg, move.color, move.p2?.delay ?? 0.35);
    }
  }

  private castDustCurve(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, aim: number): void {
    const dir = { x: Math.cos(aim), y: Math.sin(aim) };
    const side = { x: -dir.y, y: dir.x };
    const n = move.count ?? 7;
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const wave = Math.sin(k * Math.PI * 1.5) * 58;
      this.addCircle(e, p.x + dir.x * k * 220 + side.x * wave, p.y + dir.y * k * 220 + side.y * wave, move.radius ?? 28, warn, move.dmg, move.color, i * 0.035);
    }
  }

  private castBearPaws(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, aim: number, phase2: boolean): void {
    const dir = { x: Math.cos(aim), y: Math.sin(aim) };
    const side = { x: -dir.y, y: dir.x };
    const pts = [
      { x: p.x - dir.x * 75, y: p.y - dir.y * 75 },
      { x: p.x + dir.x * 95, y: p.y + dir.y * 95 },
      { x: p.x + side.x * 92, y: p.y + side.y * 92 },
    ];
    pts.forEach((q, i) => this.addCircle(e, q.x, q.y, move.radius ?? 52, warn, move.dmg, move.color, i * 0.24));
    if (phase2) {
      const q = pts[2];
      const d = (move.p2?.delay ?? 0.34) + 0.48;
      this.addLineThrough(e, q.x, q.y, aim, 260, move.width ?? 30, warn, move.dmg, move.color, d);
      this.addLineThrough(e, q.x, q.y, aim + Math.PI / 2, 260, move.width ?? 30, warn, move.dmg, move.color, d);
    }
  }

  private castConstellation(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, phase2: boolean): void {
    const pts = this.fallbackRing(p, move.count ?? 5, move.radius ?? 155, phase2 ? move.p2?.rotate ?? 0.45 : 0);
    const links: Array<[number, number]> = [[0, 2], [2, 4], [4, 1], [1, 3]];
    links.forEach(([a, b], i) => this.addLine(e, pts[a].x, pts[a].y, pts[b].x, pts[b].y, move.width ?? 28, warn, move.dmg, move.color, i * 0.05));
    if (phase2) {
      const d = move.p2?.delay ?? 0.36;
      this.addLine(e, pts[3].x, pts[3].y, pts[0].x, pts[0].y, move.width ?? 28, warn, move.dmg, move.color, d);
    }
  }

  private castMeteorMark(e: Enemy, move: BossMoveSpec, warn: number, p: Pt): void {
    this.addCircle(e, p.x, p.y, move.radius ?? 48, warn, move.dmg, move.color);
    this.addLineThrough(e, p.x, p.y, 0, move.length ?? 190, move.width ?? 24, warn, move.dmg, move.color, 0.08);
    this.addLineThrough(e, p.x, p.y, Math.PI / 2, move.length ?? 190, move.width ?? 24, warn, move.dmg, move.color, 0.08);
  }

  private castFeatherCurtain(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, aim: number): void {
    const angle = aim + Math.PI / 2;
    const side = { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) };
    const n = move.count ?? 7;
    const gap = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      if (i === gap) continue;
      const off = (i - (n - 1) / 2) * 58;
      this.addLineThrough(e, p.x + side.x * off, p.y + side.y * off, angle, move.length ?? 520, move.width ?? 28, warn, move.dmg, move.color, i * 0.025);
    }
  }

  private castCiderSprout(e: Enemy, move: BossMoveSpec, warn: number, p: Pt): void {
    const pts = this.fallbackRing(p, move.count ?? 5, 86, Math.random() * 0.5);
    pts.push(p);
    pts.forEach((q, i) => this.addCircle(e, q.x, q.y, move.radius ?? 34, warn, move.dmg, move.color, i * 0.04));
  }

  private castSnowFootsteps(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, aim: number, phase2: boolean): void {
    const dir = { x: Math.cos(aim), y: Math.sin(aim) };
    const side = { x: -dir.y, y: dir.x };
    const n = move.count ?? 5;
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const q = { x: p.x + dir.x * k * 58 + side.x * (i % 2 === 0 ? 24 : -24), y: p.y + dir.y * k * 58 + side.y * (i % 2 === 0 ? 24 : -24) };
      const d = i * 0.16;
      this.addCircle(e, q.x, q.y, move.radius ?? 38, warn, move.dmg, move.color, d);
      if (phase2) this.addLineThrough(e, q.x, q.y, aim + Math.PI / 2, 150, move.width ?? 24, warn, move.dmg, move.color, d + (move.p2?.delay ?? 0.28));
    }
  }

  private castFrostBreath(e: Enemy, move: BossMoveSpec, warn: number, aim: number): void {
    const total = move.width ?? 1.15;
    const safe = 0.44;
    const arc = Math.max(0.18, (total - safe) / 2);
    const offset = safe / 2 + arc / 2;
    this.addSector(e, e.x, e.y, aim - offset, arc, move.radius ?? 330, warn, move.dmg, move.color);
    this.addSector(e, e.x, e.y, aim + offset, arc, move.radius ?? 330, warn, move.dmg, move.color);
  }

  private castMirrorTide(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, aim: number, phase2: boolean): void {
    const dir = { x: Math.cos(aim), y: Math.sin(aim) };
    const refl = { x: -dir.x, y: dir.y };
    const start = { x: p.x - dir.x * 220, y: p.y - dir.y * 220 };
    const mid = { x: p.x + dir.x * 110, y: p.y + dir.y * 110 };
    const end = { x: mid.x + refl.x * 260, y: mid.y + refl.y * 260 };
    this.addLine(e, start.x, start.y, mid.x, mid.y, move.width ?? 30, warn, move.dmg, move.color);
    this.addLine(e, mid.x, mid.y, end.x, end.y, move.width ?? 30, warn, move.dmg, move.color, 0.18);
    if (phase2) {
      const end2 = { x: end.x + dir.x * 220, y: end.y - dir.y * 220 };
      this.addLine(e, end.x, end.y, end2.x, end2.y, move.width ?? 30, warn, move.dmg, move.color, move.p2?.delay ?? 0.34);
    }
  }

  private castMirrorShards(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, aim: number): void {
    const angle = aim + Math.PI / 2;
    const side = { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) };
    const n = move.count ?? 5;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 70;
      this.addLineThrough(e, p.x + side.x * off, p.y + side.y * off, angle + (i % 2 ? 0.12 : -0.12), move.length ?? 520, move.width ?? 28, warn, move.dmg, move.color, i * 0.06);
    }
  }

  private castDawnBeat(e: Enemy, move: BossMoveSpec, warn: number, p: Pt, phase2: boolean): void {
    const n = (move.count ?? 3) + (phase2 ? move.p2?.extra ?? 1 : 0);
    const start = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const a = start + (i / n) * TAU;
      this.addSafeCircle(e, p.x + Math.cos(a) * 110, p.y + Math.sin(a) * 110, move.radius ?? 72, warn, move.dmg, move.color, i * (phase2 ? 0.3 : 0.42));
    }
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.delay > 0) {
        h.delay -= dt;
        if (h.delay > 0) continue;
        h.gfx.setVisible(true);
      }
      h.t -= dt;
      this.drawHazard(h);
      if (h.t <= 0) {
        if (this.hazardHits(h)) {
          this.ctx.damagePlayer(h.dmg, h.source);
          this.ctx.hitStop(0.035);
          SFX.hurt();
        } else {
          SFX.swish();
        }
        h.gfx.destroy();
        this.hazards.splice(i, 1);
      }
    }
  }

  private drawHazard(h: Hazard): void {
    const k = 1 - Math.max(0, h.t) / h.warn;
    const alpha = 0.16 + k * 0.24;
    const g = h.gfx.clear();
    if (h.kind === 'circle') {
      g.fillStyle(h.color, alpha).fillCircle(h.x, h.y, h.r);
      g.lineStyle(3, h.color, 0.7 + k * 0.25).strokeCircle(h.x, h.y, h.r);
    } else if (h.kind === 'line') {
      g.lineStyle(h.width, h.color, alpha + 0.08);
      g.beginPath();
      g.moveTo(h.x1, h.y1);
      g.lineTo(h.x2, h.y2);
      g.strokePath();
      g.lineStyle(2, h.color, 0.75 + k * 0.2);
      g.beginPath();
      g.moveTo(h.x1, h.y1);
      g.lineTo(h.x2, h.y2);
      g.strokePath();
    } else if (h.kind === 'ring') {
      g.lineStyle(h.width, h.color, alpha + 0.05);
      if (h.gapA === undefined || h.gapArc === undefined) {
        this.drawArc(g, h.x, h.y, h.r, 0, TAU);
      } else {
        const a0 = h.gapA - h.gapArc / 2;
        const a1 = h.gapA + h.gapArc / 2;
        this.drawArc(g, h.x, h.y, h.r, a1, a0 + TAU);
      }
      g.lineStyle(2, h.color, 0.75 + k * 0.2);
      this.drawArc(g, h.x, h.y, h.r, 0, TAU);
    } else if (h.kind === 'sector') {
      this.drawSector(g, h.x, h.y, h.angle, h.arc, h.range, h.color, alpha);
    } else {
      g.fillStyle(0xfff2c0, 0.12 + k * 0.14).fillCircle(h.x, h.y, h.r);
      g.lineStyle(4, h.color, 0.75 + k * 0.2).strokeCircle(h.x, h.y, h.r);
      g.lineStyle(1, 0xfff2c0, 0.75).strokeCircle(h.x, h.y, h.r * 0.72);
    }
  }

  private addCircle(source: Enemy, x: number, y: number, r: number, warn: number, dmg: number, color: number, delay = 0): void {
    this.pushHazard({ kind: 'circle', gfx: this.graphics(delay), x, y, r, warn, t: warn, dmg, color, delay, source });
  }

  private addLineThrough(source: Enemy, x: number, y: number, angle: number, len: number, width: number, warn: number, dmg: number, color: number, delay = 0): void {
    const dx = Math.cos(angle) * len / 2;
    const dy = Math.sin(angle) * len / 2;
    this.addLine(source, x - dx, y - dy, x + dx, y + dy, width, warn, dmg, color, delay);
  }

  private addLine(source: Enemy, x1: number, y1: number, x2: number, y2: number, width: number, warn: number, dmg: number, color: number, delay = 0): void {
    this.pushHazard({ kind: 'line', gfx: this.graphics(delay), x1, y1, x2, y2, width, warn, t: warn, dmg, color, delay, source });
  }

  private addRing(source: Enemy, x: number, y: number, r: number, width: number, warn: number, dmg: number, color: number, gapA?: number, gapArc?: number, delay = 0): void {
    this.pushHazard({ kind: 'ring', gfx: this.graphics(delay), x, y, r, width, gapA, gapArc, warn, t: warn, dmg, color, delay, source });
  }

  private addSector(source: Enemy, x: number, y: number, angle: number, arc: number, range: number, warn: number, dmg: number, color: number, delay = 0): void {
    this.pushHazard({ kind: 'sector', gfx: this.graphics(delay), x, y, angle, arc, range, warn, t: warn, dmg, color, delay, source });
  }

  private addSafeCircle(source: Enemy, x: number, y: number, r: number, warn: number, dmg: number, color: number, delay = 0): void {
    this.pushHazard({ kind: 'safeCircle', gfx: this.graphics(delay), x, y, r, warn, t: warn, dmg, color, delay, source });
  }

  private pushHazard(h: Hazard): void {
    this.hazards.push(h);
    if (h.delay <= 0) this.drawHazard(h);
  }

  private graphics(delay: number): Phaser.GameObjects.Graphics {
    return this.ctx.scene.add.graphics().setDepth(8.5e4).setVisible(delay <= 0);
  }

  private hazardHits(h: Hazard): boolean {
    const p = this.playerPt();
    if (h.kind === 'circle') {
      return dist2(p.x, p.y, h.x, h.y) <= (h.r + PLAYER_R) ** 2;
    }
    if (h.kind === 'line') {
      return pointSegmentDist(p.x, p.y, h.x1, h.y1, h.x2, h.y2) <= h.width / 2 + PLAYER_R;
    }
    if (h.kind === 'ring') {
      const d = Math.hypot(p.x - h.x, p.y - h.y);
      if (Math.abs(d - h.r) > h.width / 2 + PLAYER_R) return false;
      if (h.gapA === undefined || h.gapArc === undefined) return true;
      return Math.abs(angleDelta(Math.atan2(p.y - h.y, p.x - h.x), h.gapA)) > h.gapArc / 2;
    }
    if (h.kind === 'sector') {
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      if (dx * dx + dy * dy > (h.range + PLAYER_R) ** 2) return false;
      return Math.abs(angleDelta(Math.atan2(dy, dx), h.angle)) <= h.arc / 2;
    }
    return dist2(p.x, p.y, h.x, h.y) > (h.r + PLAYER_R) ** 2;
  }

  private drawArc(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, a0: number, a1: number): void {
    const steps = Math.max(12, Math.ceil(Math.abs(a1 - a0) / 0.12));
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  }

  private drawSector(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, arc: number, range: number, color: number, alpha: number): void {
    const steps = 18;
    g.fillStyle(color, alpha);
    g.lineStyle(2, color, 0.82);
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i <= steps; i++) {
      const a = angle - arc / 2 + arc * (i / steps);
      g.lineTo(x + Math.cos(a) * range, y + Math.sin(a) * range);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private sampleTrail(dt: number): void {
    this.trailT -= dt;
    if (this.trailT > 0) return;
    this.trailT = PATH_SAMPLE_EVERY;
    this.trail.push(this.playerPt());
    while (this.trail.length > MAX_TRAIL) this.trail.shift();
  }

  private pickTrail(n: number): Pt[] {
    const out: Pt[] = [];
    const src = this.trail.slice(-Math.max(n * 2, 10));
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? src.length - 1 : Math.round((i / (n - 1)) * (src.length - 1));
      out.push(src[Math.max(0, Math.min(src.length - 1, k))]);
    }
    return out;
  }

  private fallbackRing(p: Pt, n: number, r: number, off = 0): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU;
      pts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
    }
    return pts;
  }

  private playerPt(): Pt {
    return { x: this.ctx.player.x, y: this.ctx.player.y };
  }

  private aimToPlayer(e: Enemy): Pt {
    const dx = this.ctx.player.x - e.x;
    const dy = this.ctx.player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  private fireRing(e: Enemy, ring: BossRing, phase2: boolean): void {
    const n = phase2 ? ring.nP2 : ring.n;
    const off = Math.random() * TAU;
    for (let k = 0; k < n; k++) {
      const a = off + (k / n) * TAU;
      this.ctx.spawnEnemyBullet({
        x: e.x, y: e.y, nx: Math.cos(a), ny: Math.sin(a),
        speed: ring.speed, dmg: ring.dmg, timeScaled: true, tex: ring.tex,
      });
    }
    SFX.boom();
    this.pump(e);
  }

  private fireSpread(e: Enemy, sp: BossSpread, nx: number, ny: number): void {
    const base = Math.atan2(ny, nx);
    for (let k = 0; k < sp.n; k++) {
      const a = base + (sp.n === 1 ? 0 : (k / (sp.n - 1) - 0.5) * sp.arc);
      this.ctx.spawnEnemyBullet({
        x: e.x, y: e.y, nx: Math.cos(a), ny: Math.sin(a),
        speed: sp.speed, dmg: sp.dmg, timeScaled: true, tex: sp.tex,
      });
    }
    SFX.zap();
    this.pump(e);
  }

  /** 施放鼓胀回弹（攻击前摇视觉） */
  private pump(e: Enemy): void {
    e.setScale(e.baseScale * 1.12);
    this.ctx.scene.tweens.add({ targets: e, scaleX: e.baseScale, scaleY: e.baseScale, duration: 300 });
  }
}

function dist2(x1: number, y1: number, x2: number, y2: number): number {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}

function pointSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function angleDelta(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
