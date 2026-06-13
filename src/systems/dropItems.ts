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

const DEFAULT_STATE: DropState = { cdMul: 1, moveMul: 1, dmgMul: 1, areaMul: 1, invuln: false, freeze: false };

/** 单件掉落道具效果：瞬发 apply / 持续 tick+end + 静态 invuln/freeze 标记（buff 乘子读 spec） */
interface DropEffect {
  apply?(ctx: CombatContext, spec: DropItemSpec): void;
  tick?(ctx: CombatContext, spec: DropItemSpec, dt: number): void;
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
      if (existing) existing.remain = spec.dur;
      else this.active.push({ id, spec, eff, remain: spec.dur, dur: spec.dur });
      this.recomputeState();
    }
  }

  update(dt: number): void {
    // 持续效果计时（时停不暂停本系统：active.remain 走真实 dt）
    let changed = false;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.remain -= dt;
      a.eff.tick?.(this.ctx, a.spec, dt);
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
