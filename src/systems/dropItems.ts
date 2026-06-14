// 一次性掉落道具系统（M19）：效果注册表 + 在场持续效果计时
// 拾取（PickupSystem）命中玩家 → collect(id)：瞬发立即结算，持续型入 active 列计时。
// 持续型的 buff/无敌/时停经 recomputeState 聚合后一次性写入 ctx.setDropState。
// 掉落来源：击杀 / 精英·Boss / 地图机制产物（直接以各自专属图标落地，无中间容器）。
import { DROP_ITEMS, DropItemSpec } from '../content/dropItems';
import type { DropItemId } from '../content/ids';
import { shakeCam } from '../gfx/shake';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { Meta } from '../core/MetaState';
import { t } from '../i18n';
import type { CombatContext, DropState, RunSystem } from './context';
import type { Enemy } from './EnemySystem';

const DEFAULT_STATE: DropState = { cdMul: 1, moveMul: 1, dmgMul: 1, areaMul: 1, invuln: false, freeze: false };

/** 单件掉落道具效果：瞬发 apply / 持续 tick+end + 静态 invuln/freeze 标记（buff 乘子读 spec） */
interface DropEffect {
  apply?(ctx: CombatContext, spec: DropItemSpec): void;
  tick?(ctx: CombatContext, spec: DropItemSpec, dt: number, active: ActiveEffect): void;
  end?(ctx: CombatContext, spec: DropItemSpec): void;
  invuln?: boolean;
  freeze?: boolean;
}

interface ActiveEffect {
  id: DropItemId;
  spec: DropItemSpec;
  eff: DropEffect;
  remain: number;
  dur: number;
  elapsed: number;
  step: number;
  tickT: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  marked?: WeakSet<Enemy>;
}

// ---------- 效果原语 ----------

const ringFx = (ctx: CombatContext, x: number, y: number, color: number, r: number, dur = 0.5): void => {
  ctx.fx.ring(x, y, color, r / 42, dur);
};

/** 圆内全体敌人范围伤害（dmg 为基础值，× stats.dmg 随构筑成长） */
function aoeDamage(ctx: CombatContext, x: number, y: number, r: number, dmg: number, kb = 0, quiet = false): void {
  const r2 = r * r;
  const d = dmg * ctx.stats.dmg;
  for (const e of ctx.enemies.actives) {
    if (!e.active || e.dying) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy > r2) continue;
    const dist = Math.hypot(dx, dy) || 1;
    ctx.hitEnemy(e, d, { kb, kx: dx / dist, ky: dy / dist, noHook: true, quiet });
  }
}

/** 圆内全体敌人向心/离心位移（kb<0 = 吸入；Boss knockMul=0 不受） */
function aoeKnock(ctx: CombatContext, x: number, y: number, r: number, kb: number, dmg = 0): void {
  const r2 = r * r;
  for (const e of ctx.enemies.actives) {
    if (!e.active || e.dying) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    const dist = Math.sqrt(d2) || 1;
    if (e.knockMul > 0) {
      e.kvx += (dx / dist) * kb * e.knockMul;
      e.kvy += (dy / dist) * kb * e.knockMul;
    }
    if (dmg > 0) ctx.hitEnemy(e, dmg * ctx.stats.dmg, { noHook: true });
  }
}

function scatterGems(ctx: CombatContext, x: number, y: number, n: number, v: number, radius: number): void {
  for (let i = 0; i < n; i++) {
    const a = ctx.rng() * Math.PI * 2;
    const r = ctx.rng() * radius;
    ctx.spawnGem(x + Math.cos(a) * r, y + Math.sin(a) * r, v);
  }
}

const queryOut: Enemy[] = [];

function lethalDamage(ctx: CombatContext, e: Enemy, base: number, bossCap = 0.06, eliteCap = 0.55): number {
  const raw = base * ctx.stats.dmg;
  if (e.isBoss) return Math.min(raw, e.maxHp * bossCap);
  if (e.isElite) return Math.min(raw, e.maxHp * eliteCap);
  return raw;
}

function hitLethal(
  ctx: CombatContext,
  e: Enemy,
  base: number,
  opts: { kb?: number; kx?: number; ky?: number; quiet?: boolean; bossCap?: number; eliteCap?: number } = {},
): number {
  return ctx.hitEnemy(e, lethalDamage(ctx, e, base, opts.bossCap, opts.eliteCap), {
    kb: opts.kb,
    kx: opts.kx,
    ky: opts.ky,
    quiet: opts.quiet,
    noHook: true,
  });
}

function aoeLethal(
  ctx: CombatContext,
  x: number,
  y: number,
  r: number,
  base: number,
  kb = 0,
  opts: { bossCap?: number; eliteCap?: number; quiet?: boolean; inward?: boolean } = {},
): number {
  let applied = 0;
  ctx.grid.queryCircle(x, y, r, queryOut);
  for (const e of queryOut) {
    if (!e.active || e.dying) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = Math.hypot(dx, dy) || 1;
    const k = opts.inward ? -1 : 1;
    applied += hitLethal(ctx, e, base, {
      kb,
      kx: (dx / d) * k,
      ky: (dy / d) * k,
      quiet: opts.quiet,
      bossCap: opts.bossCap,
      eliteCap: opts.eliteCap,
    });
  }
  return applied;
}

function lineLethal(
  ctx: CombatContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  base: number,
  kb: number,
  opts: { bossCap?: number; eliteCap?: number; quiet?: boolean } = {},
): number {
  let applied = 0;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const len = Math.sqrt(len2);
  for (const e of ctx.enemies.actives) {
    if (!e.active || e.dying) continue;
    const t = Math.max(0, Math.min(1, ((e.x - x1) * dx + (e.y - y1) * dy) / len2));
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const ex = e.x - px;
    const ey = e.y - py;
    if (ex * ex + ey * ey > (width + e.radius) * (width + e.radius)) continue;
    applied += hitLethal(ctx, e, base, {
      kb,
      kx: dx / len,
      ky: dy / len,
      quiet: opts.quiet,
      bossCap: opts.bossCap,
      eliteCap: opts.eliteCap,
    });
  }
  return applied;
}

function selectDenseTargets(ctx: CombatContext, n: number, range: number, clusterR: number): Enemy[] {
  const px = ctx.player.x;
  const py = ctx.player.y;
  const candidates = ctx.enemies.actives
    .filter((e) => e.active && !e.dying && (e.x - px) * (e.x - px) + (e.y - py) * (e.y - py) <= range * range)
    .map((e) => {
      let score = e.isBoss ? 8 : e.isElite ? 5 : 1;
      for (const o of ctx.enemies.actives) {
        if (!o.active || o.dying || o === e) continue;
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        if (dx * dx + dy * dy <= clusterR * clusterR) score += o.isBoss ? 6 : o.isElite ? 4 : 1;
      }
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);
  const picked: Enemy[] = [];
  for (const c of candidates) {
    if (picked.some((p) => (p.x - c.e.x) * (p.x - c.e.x) + (p.y - c.e.y) * (p.y - c.e.y) < clusterR * clusterR)) continue;
    picked.push(c.e);
    if (picked.length >= n) break;
  }
  return picked;
}

function priorityTarget(ctx: CombatContext, range: number): Enemy | null {
  const px = ctx.player.x;
  const py = ctx.player.y;
  let best: Enemy | null = null;
  let bestScore = -Infinity;
  for (const e of ctx.enemies.actives) {
    if (!e.active || e.dying) continue;
    const dx = e.x - px;
    const dy = e.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > range * range) continue;
    const score = (e.isBoss ? 10000 : e.isElite ? 4000 : e.maxHp) - Math.sqrt(d2) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

// ---------- 效果注册表 ----------

export const DROP_EFFECTS: Record<DropItemId, DropEffect> = {
  // ===== 通用 =====
  magnet: {
    apply: (ctx, s) => { ctx.magnetizeAll(); ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 220, 0.6); },
  },
  nuke: {
    apply: (ctx, s) => {
      aoeDamage(ctx, ctx.player.x, ctx.player.y, s.radius ?? 560, s.dmg ?? 200, s.kb ?? 280);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 560, 0.6);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: s.color, count: 18, speed: 360, life: 0.5, scale: 1, grav: 120 });
      shakeCam(ctx.scene, 260, 0.008);
      SFX.boom(true);
    },
  },
  timestop: {
    freeze: true,
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 360, 0.7); SFX.chime(); },
    end: (ctx, s) => ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 200, 0.4),
  },
  heal: {
    apply: (ctx, s) => {
      ctx.run.heal(s.heal ?? 60);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: s.color, count: 12, speed: 90, life: 0.6, grav: -90 });
      SFX.heal();
    },
  },
  frenzy: {
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 120, 0.5); SFX.chime(); },
  },
  aegis: {
    invuln: true,
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 90, 0.5); SFX.chime(); },
    tick: (ctx, s) => { if (ctx.rng() < 0.3) ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 1, speed: 40, life: 0.5, scale: 0.7, alpha: 0.8 }); },
  },
  xpburst: {
    apply: (ctx, s) => {
      ctx.run.addXp(s.xp ?? 80);
      scatterGems(ctx, ctx.player.x, ctx.player.y, s.gemN ?? 5, s.gemV ?? 4, 90);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 10, speed: 140, life: 0.6, scale: 0.8 });
    },
  },

  // ===== meadow 晨光草甸 =====
  bloomburst: {
    apply: (ctx, s) => {
      scatterGems(ctx, ctx.player.x, ctx.player.y, s.gemN ?? 10, s.gemV ?? 5, s.radius ?? 220);
      ctx.run.heal(s.heal ?? 30);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_petal', color: s.color, count: 22, speed: 220, life: 0.8, scale: 1.1, spin: true, grav: 60 });
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 220, 0.7);
    },
  },
  verdant: {
    tick: (ctx, s, dt) => {
      ctx.run.heal((s.heal ?? 8) * dt);
      if (ctx.rng() < dt * 5) ctx.fx.burst(ctx.player.x + (ctx.rng() - 0.5) * 60, ctx.player.y, { tex: 'p_petal', color: s.color, count: 1, speed: 30, life: 0.6, scale: 0.8, grav: -40 });
    },
    apply: (ctx, s) => ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 120, 0.5),
  },
  blossomsalvo: {
    apply: (ctx, s) => {
      const targets = selectDenseTargets(ctx, 7, s.radius ?? 760, 150);
      for (const t of targets) {
        const x = t.x;
        const y = t.y;
        aoeLethal(ctx, x, y, 150, s.dmg ?? 210, s.kb ?? 160, { bossCap: 0.035, eliteCap: 0.5 });
        ringFx(ctx, x, y, s.color, 150, 0.42);
        ctx.fx.burst(x, y, { tex: 'p_petal', color: s.color, count: 16, speed: 240, life: 0.55, scale: 0.95, spin: true, grav: 90 });
        if (t.dying) {
          aoeLethal(ctx, x, y, 95, 95, 90, { bossCap: 0.015, eliteCap: 0.25, quiet: true });
          ctx.fx.burst(x, y, { tex: 'p_star', color: 0xfff2c0, count: 7, speed: 150, life: 0.42, scale: 0.75 });
        }
      }
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 260, 0.75);
      shakeCam(ctx.scene, 220, 0.007);
      SFX.boom(true);
    },
  },

  // ===== pond 露珠池塘 =====
  ebbaegis: {
    invuln: true,
    apply: (ctx, s) => {
      ctx.addZone({ x: ctx.player.x, y: ctx.player.y, r: s.radius ?? 520, dur: s.dur ?? 6, effect: 'slow', affectsPlayer: false, tex: 'p_ring' });
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 520, 0.8);
      SFX.chime();
    },
  },
  ripple: {
    apply: (ctx, s) => {
      aoeKnock(ctx, ctx.player.x, ctx.player.y, s.radius ?? 600, s.kb ?? 620, s.dmg ?? 60);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, (s.radius ?? 600) * 0.6, 0.5);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 600, 0.8);
      shakeCam(ctx.scene, 180, 0.006);
      SFX.boom(false);
    },
  },
  tidalcrush: {
    apply: (ctx, s) => {
      const px = ctx.player.x;
      const py = ctx.player.y;
      for (const side of [-1, 1]) {
        const x = px + side * 280;
        aoeLethal(ctx, x, py, 330, s.dmg ?? 240, s.kb ?? 420, { bossCap: 0.035, eliteCap: 0.45 });
        ringFx(ctx, x, py, s.color, 330, 0.48);
        ctx.fx.burst(x, py, { tex: 'p_dot', color: s.color, count: 18, speed: 300, life: 0.5, scale: 0.9, grav: 80 });
      }
      aoeLethal(ctx, px, py, 390, 160, 240, { bossCap: 0.055, eliteCap: 0.35 });
      ctx.addZone({ x: px, y: py, r: 290, dur: 4, effect: 'slow', mul: 0.55, affectsPlayer: false, tex: 'pz_pool' });
      ringFx(ctx, px, py, 0xd8f6ff, 420, 0.82);
      shakeCam(ctx.scene, 300, 0.009);
      SFX.boom(true);
    },
  },

  // ===== hills 晚霞山岗 =====
  tailwind: {
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 130, 0.5); SFX.chime(); },
    tick: (ctx, s) => { if (ctx.rng() < 0.4) ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_petal', color: s.color, count: 1, speed: 120, life: 0.5, scale: 0.7, alpha: 0.8 }); },
  },
  whirlwind: {
    apply: (ctx, s) => {
      aoeKnock(ctx, ctx.player.x, ctx.player.y, s.radius ?? 420, -(s.kb ?? 260), s.dmg ?? 120);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 420, 0.6);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: s.color, count: 16, speed: 200, life: 0.6, scale: 0.9, spin: true });
      SFX.boom(false);
    },
  },
  galeblades: {
    apply: (ctx, s) => {
      let nx = ctx.windVec.x;
      let ny = ctx.windVec.y;
      if (nx * nx + ny * ny < 0.01) {
        nx = ctx.facing.x || 1;
        ny = ctx.facing.y || 0;
      }
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      const px = ctx.player.x;
      const py = ctx.player.y;
      const tx = -ny;
      const ty = nx;
      for (const off of [-220, -110, 0, 110, 220]) {
        const cx = px + tx * off;
        const cy = py + ty * off;
        lineLethal(ctx, cx - nx * 430, cy - ny * 430, cx + nx * 430, cy + ny * 430, 58, s.dmg ?? 230, s.kb ?? 300, { bossCap: 0.026, eliteCap: 0.38 });
        for (const k of [-0.5, 0, 0.5]) ctx.fx.burst(cx + nx * 430 * k, cy + ny * 430 * k, { tex: 'p_petal', color: s.color, count: 5, speed: 220, life: 0.35, scale: 0.7, alpha: 0.85 });
      }
      ringFx(ctx, px, py, s.color, 360, 0.58);
      shakeCam(ctx.scene, 220, 0.006);
      SFX.boom(false);
    },
  },

  // ===== grove 萤暮林地 =====
  sporebloom: {
    apply: (ctx, s) => {
      const px = ctx.player.x;
      const py = ctx.player.y;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const zx = px + Math.cos(a) * (s.radius ?? 320) * 0.55;
        const zy = py + Math.sin(a) * (s.radius ?? 320) * 0.55;
        ctx.addZone({ x: zx, y: zy, r: (s.radius ?? 320) * 0.5, dur: 3, effect: 'burn', dps: (s.dmg ?? 30) * ctx.stats.dmg, tex: 'p_ring' });
      }
      ringFx(ctx, px, py, s.color, s.radius ?? 320, 0.6);
    },
  },
  fireflies: {
    apply: (ctx, s) => ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 130, 0.5),
    tick: (ctx, s) => {
      ctx.magnetizeAll();
      if (ctx.rng() < 0.5) ctx.fx.burst(ctx.player.x + (ctx.rng() - 0.5) * 80, ctx.player.y + (ctx.rng() - 0.5) * 60, { tex: 'p_star', color: s.color, count: 1, speed: 30, life: 0.6, scale: 0.7, alpha: 0.9 });
    },
  },
  sporecascade: {
    apply: (ctx, s) => {
      const seeds = selectDenseTargets(ctx, 5, s.radius ?? 720, 170);
      const seen = new Set<Enemy>();
      const queue = seeds.map((e) => ({ e, depth: 0 }));
      let hits = 0;
      for (let qi = 0; qi < queue.length && hits < 34; qi++) {
        const { e, depth } = queue[qi];
        if (!e.active || e.dying || seen.has(e) || depth > 3) continue;
        seen.add(e);
        hits++;
        const base = (s.dmg ?? 180) * Math.pow(0.72, depth);
        hitLethal(ctx, e, base, { kb: 120, kx: 0, ky: 0, bossCap: 0.026, eliteCap: 0.36, quiet: depth > 0 });
        ringFx(ctx, e.x, e.y, s.color, 130 - depth * 16, 0.38);
        ctx.fx.burst(e.x, e.y, { tex: 'p_dot', color: s.color, count: 8 - depth, speed: 190, life: 0.42, scale: 0.75, alpha: 0.9 });
        ctx.grid.queryCircle(e.x, e.y, 155, queryOut);
        for (const n of queryOut) if (!seen.has(n) && n.active && !n.dying) queue.push({ e: n, depth: depth + 1 });
      }
      shakeCam(ctx.scene, 240, 0.007);
      SFX.boom(true);
    },
  },

  // ===== lavender 紫露花田 =====
  pollenfrenzy: {
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 140, 0.5); SFX.chime(); },
    tick: (ctx, s) => { if (ctx.rng() < 0.3) ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_petal', color: s.color, count: 1, speed: 50, life: 0.6, scale: 0.8 }); },
  },
  beeswarm: {
    apply: (ctx, s) => ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 120, 0.5),
    tick: (ctx, s, dt) => {
      if (ctx.rng() >= dt * 5) return; // ~5 次/秒蜂蜇
      const target = ctx.enemies.nearest(ctx.player.x, ctx.player.y, s.radius ?? 240);
      if (!target) return;
      ctx.hitEnemy(target, (s.dmg ?? 22) * ctx.stats.dmg, { noHook: true });
      ctx.fx.burst(target.x, target.y, { tex: 'p_dot', color: s.color, count: 3, speed: 90, life: 0.3, scale: 0.6 });
    },
  },
  honeytempest: {
    apply: (ctx, s) => {
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 260, 0.55);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: s.color, count: 22, speed: 260, life: 0.55, scale: 0.85, spin: true });
      SFX.chime();
    },
    tick: (ctx, s, dt, a) => {
      a.tickT -= dt;
      if (a.tickT > 0) return;
      a.tickT = 0.16;
      const target = priorityTarget(ctx, s.radius ?? 620);
      if (!target) return;
      hitLethal(ctx, target, s.dmg ?? 48, { kb: 60, kx: 0, ky: 0, bossCap: 0.006, eliteCap: 0.1, quiet: true });
      aoeLethal(ctx, target.x, target.y, 90, 24, 35, { bossCap: 0.003, eliteCap: 0.06, quiet: true });
      ctx.fx.burst(target.x, target.y, { tex: 'p_dot', color: s.color, count: 5, speed: 130, life: 0.28, scale: 0.65 });
      if (ctx.rng() < 0.45) ctx.fx.burst(target.x, target.y, { tex: 'p_petal', color: 0xc8a8e0, count: 3, speed: 80, life: 0.35, scale: 0.65 });
    },
  },

  // ===== bramble 莓果灌丛 =====
  thornnova: {
    apply: (ctx, s) => {
      aoeDamage(ctx, ctx.player.x, ctx.player.y, s.radius ?? 360, s.dmg ?? 150, s.kb ?? 420);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 360, 0.6);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_petal', color: s.color, count: 20, speed: 320, life: 0.6, scale: 1, spin: true });
      shakeCam(ctx.scene, 180, 0.006);
      SFX.boom(true);
    },
  },
  berryfeast: {
    apply: (ctx, s) => {
      ctx.run.heal(s.heal ?? 70);
      for (let i = 0; i < 6; i++) ctx.spawnCoin(ctx.player.x + (ctx.rng() - 0.5) * 70, ctx.player.y + (ctx.rng() - 0.5) * 70, 3);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: s.color, count: 14, speed: 120, life: 0.6, grav: -60 });
      SFX.heal();
    },
  },
  bramblecrown: {
    apply: (ctx, s) => {
      const px = ctx.player.x;
      const py = ctx.player.y;
      for (const r of [s.radius ?? 620, 470, 320]) {
        aoeLethal(ctx, px, py, r, r > 500 ? s.dmg ?? 250 : 120, s.kb ?? 360, { bossCap: r > 500 ? 0.04 : 0.018, eliteCap: 0.38, inward: r > 350 });
        ringFx(ctx, px, py, s.color, r, 0.48);
      }
      ctx.addZone({ x: px, y: py, r: 240, dur: 3, effect: 'slow', mul: 0.45, affectsPlayer: false, tex: 'w_jam' });
      ctx.fx.burst(px, py, { tex: 'p_petal', color: s.color, count: 32, speed: 330, life: 0.6, scale: 1, spin: true });
      shakeCam(ctx.scene, 300, 0.009);
      SFX.boom(true);
    },
  },

  // ===== nocturne 星语夜原 =====
  fullmoon: {
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, 0xfffef0, 360, 0.9); SFX.chime(); },
    tick: (ctx, s) => { if (ctx.rng() < 0.2) ctx.fx.burst(ctx.player.x + (ctx.rng() - 0.5) * 120, ctx.player.y + (ctx.rng() - 0.5) * 90, { tex: 'p_star', color: 0xfffef0, count: 1, speed: 20, life: 0.7, scale: 0.7, alpha: 0.8 }); },
  },
  meteor: {
    apply: (ctx, s) => {
      const px = ctx.player.x;
      const py = ctx.player.y;
      const radius = s.radius ?? 480;
      for (let i = 0; i < 8; i++) {
        const a = ctx.rng() * Math.PI * 2;
        const r = ctx.rng() * radius;
        const mx = px + Math.cos(a) * r;
        const my = py + Math.sin(a) * r;
        aoeDamage(ctx, mx, my, 120, s.dmg ?? 90);
        ringFx(ctx, mx, my, s.color, 120, 0.4);
        ctx.fx.burst(mx, my, { tex: 'p_star', color: s.color, count: 4, speed: 120, life: 0.4, scale: 0.8 });
      }
      shakeCam(ctx.scene, 240, 0.007);
      SFX.boom(true);
    },
  },
  constellationfall: {
    apply: (ctx, s) => {
      const pts = selectDenseTargets(ctx, 8, s.radius ?? 780, 160);
      if (pts.length < 2) {
        aoeLethal(ctx, ctx.player.x, ctx.player.y, 520, s.dmg ?? 260, s.kb ?? 120, { bossCap: 0.06, eliteCap: 0.5 });
      } else {
        pts.sort((a, b) => Math.atan2(a.y - ctx.player.y, a.x - ctx.player.x) - Math.atan2(b.y - ctx.player.y, b.x - ctx.player.x));
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          lineLethal(ctx, a.x, a.y, b.x, b.y, 76, s.dmg ?? 260, s.kb ?? 120, { bossCap: 0.025, eliteCap: 0.35 });
          ctx.fx.burst(a.x, a.y, { tex: 'p_star', color: s.color, count: 9, speed: 210, life: 0.45, scale: 0.85, spin: true });
          ringFx(ctx, a.x, a.y, 0xfffef0, 90, 0.32);
        }
      }
      ctx.scene.cameras.main.flash(220, 238, 242, 255);
      shakeCam(ctx.scene, 260, 0.008);
      SFX.boom(true);
    },
  },

  // ===== summit 破晓之巅 =====
  beaconsurge: {
    apply: (ctx, s) => {
      aoeDamage(ctx, ctx.player.x, ctx.player.y, s.radius ?? 600, s.dmg ?? 80);
      ctx.run.heal(20);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 600, 0.7);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 16, speed: 220, life: 0.7, scale: 1, spin: true });
      SFX.boom(true);
    },
  },
  dawnnova: {
    apply: (ctx, s) => {
      aoeDamage(ctx, ctx.player.x, ctx.player.y, s.radius ?? 640, s.dmg ?? 200, 200);
      ringFx(ctx, ctx.player.x, ctx.player.y, 0xfff2c0, (s.radius ?? 640) * 0.6, 0.5);
      ringFx(ctx, ctx.player.x, ctx.player.y, 0xfff2c0, s.radius ?? 640, 0.9);
      ctx.scene.cameras.main.flash(300, 255, 252, 230);
      shakeCam(ctx.scene, 300, 0.009);
      SFX.boom(true);
    },
  },
  dawnlance: {
    apply: (ctx, s) => {
      const targets = selectDenseTargets(ctx, 6, s.radius ?? 650, 180)
        .sort((a, b) => Number(b.isBoss) - Number(a.isBoss) || Number(b.isElite) - Number(a.isElite));
      for (const t of targets.slice(0, 6)) {
        hitLethal(ctx, t, s.dmg ?? 340, { kb: s.kb ?? 180, kx: 0, ky: 1, bossCap: 0.065, eliteCap: 0.62 });
        aoeLethal(ctx, t.x, t.y, 145, 105, 80, { bossCap: 0.012, eliteCap: 0.2, quiet: true });
        ctx.addZone({ x: t.x, y: t.y, r: 130, dur: 2.5, effect: 'burn', dps: 42 * ctx.stats.dmg, tex: 'p_ring' });
        ringFx(ctx, t.x, t.y, s.color, 160, 0.45);
        ctx.fx.burst(t.x, t.y, { tex: 'p_star', color: 0xfff2c0, count: 14, speed: 270, life: 0.48, scale: 0.95, spin: true });
      }
      ctx.scene.cameras.main.flash(260, 255, 244, 200);
      shakeCam(ctx.scene, 280, 0.008);
      SFX.boom(true);
    },
  },

  // ===== orchard 琥珀果园 =====
  goldapple: {
    apply: (ctx, s) => {
      ctx.run.heal(s.heal ?? 50);
      scatterGems(ctx, ctx.player.x, ctx.player.y, s.gemN ?? 6, s.gemV ?? 5, 90);
      for (let i = 0; i < 5; i++) ctx.spawnCoin(ctx.player.x + (ctx.rng() - 0.5) * 80, ctx.player.y + (ctx.rng() - 0.5) * 80, 2);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: s.color, count: 14, speed: 130, life: 0.6, grav: -70 });
      SFX.heal();
    },
  },
  seedwhirl: {
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 160, 0.5); SFX.chime(); },
    tick: (ctx, s, dt) => {
      if (ctx.rng() >= dt * 7) return;
      const target = ctx.enemies.nearest(ctx.player.x, ctx.player.y, s.radius ?? 260);
      if (!target) return;
      ctx.hitEnemy(target, (s.dmg ?? 28) * ctx.stats.dmg, { noHook: true });
      ctx.fx.burst(target.x, target.y, { tex: 'p_dot', color: s.color, count: 4, speed: 100, life: 0.35, scale: 0.65 });
    },
  },
  harvestcomet: {
    apply: (ctx, s) => {
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 260, 0.55);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: s.color, count: 20, speed: 260, life: 0.55, scale: 0.9, grav: 140 });
      SFX.boom(false);
    },
    tick: (ctx, s, dt, a) => {
      if (a.elapsed === 0) {
        a.x = ctx.player.x - 360;
        a.y = ctx.player.y - 180;
        a.vx = 560;
        a.vy = 260;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      const dx = a.x - ctx.player.x;
      const dy = a.y - ctx.player.y;
      if (Math.abs(dx) > 540) a.vx *= -1;
      if (Math.abs(dy) > 360) a.vy *= -1;
      a.tickT -= dt;
      if (a.tickT > 0) return;
      a.tickT = 0.12;
      aoeLethal(ctx, a.x, a.y, 125, s.dmg ?? 92, 160, { bossCap: 0.009, eliteCap: 0.12 });
      for (let i = 0; i < 4; i++) {
        const ang = ctx.rng() * Math.PI * 2;
        const x = a.x + Math.cos(ang) * 110;
        const y = a.y + Math.sin(ang) * 110;
        aoeLethal(ctx, x, y, 58, 32, 80, { bossCap: 0.0025, eliteCap: 0.04, quiet: true });
      }
      ringFx(ctx, a.x, a.y, s.color, 130, 0.25);
      ctx.fx.burst(a.x, a.y, { tex: 'p_dot', color: s.color, count: 10, speed: 180, life: 0.32, scale: 0.78, grav: 160 });
    },
  },

  // ===== snowbell 雪铃庭院 =====
  snowglobe: {
    freeze: true,
    invuln: true,
    apply: (ctx, s) => {
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 280, 0.65);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 14, speed: 110, life: 0.6, scale: 0.8 });
      SFX.chime();
    },
    end: (ctx, s) => ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 150, 0.35),
  },
  frostbell: {
    apply: (ctx, s) => {
      aoeDamage(ctx, ctx.player.x, ctx.player.y, s.radius ?? 460, s.dmg ?? 120, s.kb ?? 260);
      ctx.addZone({ x: ctx.player.x, y: ctx.player.y, r: 220, dur: 4, effect: 'slow', mul: 0.5, affectsPlayer: false, tex: 'wz_frost' });
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 460, 0.7);
      shakeCam(ctx.scene, 180, 0.006);
      SFX.boom(false);
    },
  },
  frostcarillon: {
    freeze: true,
    apply: (ctx, s) => {
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 300, 0.55);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 20, speed: 180, life: 0.55, scale: 0.85, spin: true });
      SFX.chime();
    },
    tick: (ctx, s, _dt, a) => {
      const pulses = [0.15, 1.35, 2.55];
      if (a.step >= pulses.length || a.elapsed < pulses[a.step]) return;
      const r = [260, 430, s.radius ?? 620][a.step];
      const dmg = [115, s.dmg ?? 160, 260][a.step];
      aoeLethal(ctx, ctx.player.x, ctx.player.y, r, dmg, s.kb ?? 260, { bossCap: [0.025, 0.04, 0.065][a.step], eliteCap: 0.45 });
      ctx.addZone({ x: ctx.player.x, y: ctx.player.y, r: Math.max(180, r * 0.45), dur: 4, effect: 'slow', mul: 0.45, affectsPlayer: false, tex: 'wz_frost' });
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, r, 0.5);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: 0xe8fbff, count: 14 + a.step * 8, speed: 180 + a.step * 70, life: 0.45, scale: 0.85 });
      shakeCam(ctx.scene, 160 + a.step * 70, 0.005 + a.step * 0.002);
      SFX.boom(a.step === 2);
      a.step++;
    },
  },

  // ===== mirage 彩镜沙洲 =====
  prismshard: {
    apply: (ctx, s) => {
      aoeDamage(ctx, ctx.player.x, ctx.player.y, s.radius ?? 520, s.dmg ?? 70, 90);
      scatterGems(ctx, ctx.player.x, ctx.player.y, s.gemN ?? 4, s.gemV ?? 6, 120);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = ctx.player.x + Math.cos(a) * 120;
        const y = ctx.player.y + Math.sin(a) * 120;
        ctx.fx.burst(x, y, { tex: 'p_star', color: s.color, count: 2, speed: 80, life: 0.4, scale: 0.65 });
      }
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 520, 0.6);
      SFX.chime();
    },
  },
  mirrorbloom: {
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 150, 0.5); SFX.chime(); },
    tick: (ctx, s, dt) => {
      if (ctx.rng() >= dt * 4) return;
      const target = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 360);
      if (!target) return;
      ctx.hitEnemy(target, 34 * ctx.stats.dmg, { noHook: true });
      ctx.fx.burst(target.x, target.y, { tex: 'p_star', color: s.color, count: 3, speed: 90, life: 0.35, scale: 0.7 });
    },
  },
  prismstorm: {
    apply: (ctx, s) => {
      const px = ctx.player.x;
      const py = ctx.player.y;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + ctx.rng() * 0.18;
        const r = 230 + ctx.rng() * 170;
        return { x: px + Math.cos(a) * r, y: py + Math.sin(a) * r };
      });
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 2) % pts.length];
        lineLethal(ctx, a.x, a.y, b.x, b.y, 66, s.dmg ?? 190, s.kb ?? 100, { bossCap: 0.022, eliteCap: 0.32 });
        ctx.fx.burst(a.x, a.y, { tex: 'p_star', color: s.color, count: 7, speed: 170, life: 0.42, scale: 0.78, spin: true });
      }
      const focus = selectDenseTargets(ctx, 1, s.radius ?? 760, 220)[0];
      if (focus) {
        aoeLethal(ctx, focus.x, focus.y, 210, 280, 120, { bossCap: 0.065, eliteCap: 0.5 });
        ringFx(ctx, focus.x, focus.y, 0xfff2ff, 230, 0.62);
      }
      ctx.scene.cameras.main.flash(180, 246, 232, 255);
      shakeCam(ctx.scene, 260, 0.007);
      SFX.boom(true);
    },
  },

  // ===== clockwork 晨钟庭 =====
  clockkey: {
    apply: (ctx, s) => { ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 130, 0.5); SFX.chime(); },
    tick: (ctx, s) => {
      if (ctx.rng() < 0.35) ctx.fx.burst(ctx.player.x + (ctx.rng() - 0.5) * 70, ctx.player.y + (ctx.rng() - 0.5) * 45, { tex: 'p_star', color: s.color, count: 1, speed: 40, life: 0.45, scale: 0.65 });
    },
  },
  bellnova: {
    apply: (ctx, s) => {
      aoeDamage(ctx, ctx.player.x, ctx.player.y, s.radius ?? 560, s.dmg ?? 170, s.kb ?? 340);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, (s.radius ?? 560) * 0.65, 0.45);
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, s.radius ?? 560, 0.75);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 18, speed: 260, life: 0.65, scale: 0.9, spin: true });
      shakeCam(ctx.scene, 220, 0.007);
      SFX.boom(true);
    },
  },
  grandchime: {
    apply: (ctx, s) => {
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, 220, 0.5);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 18, speed: 210, life: 0.5, scale: 0.8, spin: true });
      SFX.chime();
    },
    tick: (ctx, s, _dt, a) => {
      const beats = [0.2, 1.25, 2.3];
      if (a.step >= beats.length || a.elapsed < beats[a.step]) return;
      if (!a.marked) a.marked = new WeakSet<Enemy>();
      const r = [280, 450, s.radius ?? 620][a.step];
      ctx.grid.queryCircle(ctx.player.x, ctx.player.y, r, queryOut);
      for (const e of queryOut) {
        if (!e.active || e.dying) continue;
        const dx = e.x - ctx.player.x;
        const dy = e.y - ctx.player.y;
        const d = Math.hypot(dx, dy) || 1;
        const echoed = a.marked.has(e);
        hitLethal(ctx, e, (s.dmg ?? 170) * (echoed ? 1.65 : 1), {
          kb: s.kb ?? 300,
          kx: dx / d,
          ky: dy / d,
          bossCap: echoed ? 0.055 : 0.032,
          eliteCap: echoed ? 0.55 : 0.34,
        });
        a.marked.add(e);
      }
      ringFx(ctx, ctx.player.x, ctx.player.y, s.color, r, 0.55);
      ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: s.color, count: 16 + a.step * 10, speed: 220 + a.step * 70, life: 0.5, scale: 0.9, spin: true });
      shakeCam(ctx.scene, 170 + a.step * 80, 0.005 + a.step * 0.002);
      SFX.boom(a.step === 2);
      a.step++;
    },
  },
};

export class DropItemSystem implements RunSystem {
  private active: ActiveEffect[] = [];

  constructor(private ctx: CombatContext) {}

  /** HUD 持续道具倒计时读此（只含 timed） */
  get activeEffects(): ReadonlyArray<{ id: DropItemId; icon: string; color: number; k: number }> {
    return this.active.map((a) => ({ id: a.id, icon: a.spec.icon, color: a.spec.color, k: a.remain / a.dur }));
  }

  /** 拾取触发：瞬发立即结算，持续型入计时 */
  collect(id: DropItemId): void {
    const spec = DROP_ITEMS[id];
    if (!spec) return;
    const eff = DROP_EFFECTS[id] ?? {};
    Meta.codexLight('passives', id); // 图鉴首遇点亮（与被动同页）
    emitEvent(this.ctx.scene.game, 'hud:drop', t('drop_' + id), spec.color);
    eff.apply?.(this.ctx, spec);
    if (spec.kind === 'timed' && spec.dur) {
      const existing = this.active.find((a) => a.id === id);
      if (existing) {
        existing.remain = spec.dur;
        existing.elapsed = 0;
        existing.step = 0;
        existing.tickT = 0;
        existing.marked = undefined;
      } else {
        this.active.push({ id, spec, eff, remain: spec.dur, dur: spec.dur, elapsed: 0, step: 0, tickT: 0, x: 0, y: 0, vx: 0, vy: 0 });
      }
      this.recomputeState();
    }
  }

  update(dt: number): void {
    // 持续效果计时（时停不暂停本系统：active.remain 走真实 dt）
    let changed = false;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.remain -= dt;
      a.eff.tick?.(this.ctx, a.spec, dt, a);
      a.elapsed += dt;
      if (a.remain <= 0) {
        a.eff.end?.(this.ctx, a.spec);
        this.active.splice(i, 1);
        changed = true;
      }
    }
    if (changed) this.recomputeState();
  }

  /** 聚合在场持续效果 → 一次性写入 ctx（属性重算 + 无敌/时停态） */
  private recomputeState(): void {
    const s: DropState = { cdMul: 1, moveMul: 1, dmgMul: 1, areaMul: 1, invuln: false, freeze: false };
    for (const a of this.active) {
      s.cdMul *= a.spec.cdMul ?? 1;
      s.moveMul *= a.spec.moveMul ?? 1;
      s.dmgMul *= a.spec.dmgMul ?? 1;
      s.areaMul *= a.spec.areaMul ?? 1;
      if (a.eff.invuln) s.invuln = true;
      if (a.eff.freeze) s.freeze = true;
    }
    this.ctx.setDropState(s);
  }

  destroy(): void {
    this.ctx.setDropState({ ...DEFAULT_STATE });
    this.active.length = 0;
  }
}
