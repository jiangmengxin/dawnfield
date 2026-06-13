// 旧区域机制（M6/M7）：M18 降级为各图次要风味，行为不变，从 MapMechanicSystem 平移至模块。
// puddles 减速水皮 / springs 治愈泉 / gusts 顺风带 / storm 定时大风 / brambles 荆棘地皮 /
// starfall 流星雨 / dawnpillar 晨光柱（后两者将于批次2被 thornwall/beacon 吸收）
import Phaser from 'phaser';
import type { MechanicSpec } from '../../content/maps';
import { dmgScale, hpScale } from '../../content/enemies';
import { BRAMBLE, GROVE, HILLS, NOCTURNE, SUMMIT } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { emitEvent } from '../../core/events';
import { getSettings } from '../../core/settings';
import type { CombatContext } from '../context';
import { queryOut } from '../weapons/base';
import { aroundPlayer, effMin, Mechanic, Patch } from './types';

// ---------- 减速水皮（pond 风味） ----------

export class PuddlesMechanic implements Mechanic {
  private t: number;
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'puddles' }>) {
    this.t = spec.first;
  }
  update(dt: number): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.spec.interval;
    const ctx = this.ctx;
    for (let i = 0; i < this.spec.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 110 + Math.random() * 290;
      ctx.addZone({
        x: ctx.player.x + Math.cos(a) * d,
        y: ctx.player.y + Math.sin(a) * d,
        r: this.spec.r * (0.85 + Math.random() * 0.3),
        dur: this.spec.dur,
        effect: 'slow',
        mul: this.spec.playerSlow, // M18：玩家减速乘子随 zone 携带，PlayerSystem 不再硬编码 kind
        tex: 'pz_pool',
        affectsPlayer: true,
      });
    }
  }
  destroy(): void { /* zone 由 ZoneSystem 自管 */ }
}

// ---------- 治愈泉（grove 风味） ----------

export class SpringsMechanic implements Mechanic {
  private t: number;
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'springs' }>) {
    this.t = spec.first;
  }
  update(dt: number): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.spec.interval;
    const ctx = this.ctx;
    for (let i = 0; i < this.spec.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 130 + Math.random() * 200;
      const x = ctx.player.x + Math.cos(a) * d;
      const y = ctx.player.y + Math.sin(a) * d;
      ctx.addZone({ x, y, r: this.spec.r, dur: this.spec.dur, effect: 'heal', dps: this.spec.hps, tex: 'gz_spring' });
      ctx.fx.ring(x, y, GROVE.springDeep, 2.2, 0.6);
    }
    SFX.heal();
  }
  destroy(): void { /* zone 由 ZoneSystem 自管 */ }
}

// ---------- 花浪阵风（lavender 风味） ----------

export class GustsMechanic implements Mechanic {
  private t: number;
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'gusts' }>) {
    this.t = spec.first;
  }
  update(dt: number): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.spec.interval;
    const ctx = this.ctx;
    for (let i = 0; i < this.spec.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 90 + Math.random() * 260;
      ctx.addZone({
        x: ctx.player.x + Math.cos(a) * d,
        y: ctx.player.y + Math.sin(a) * d,
        r: this.spec.r * (0.85 + Math.random() * 0.3),
        dur: this.spec.dur,
        effect: 'haste',
        mul: this.spec.mul,
        tex: 'lz_breeze',
      });
    }
    SFX.windGust();
  }
  destroy(): void { /* zone 由 ZoneSystem 自管 */ }
}

// ---------- 定时大风（hills 高潮，与 wind 并存） ----------

export class StormMechanic implements Mechanic {
  private t: number;
  private warned = false;
  private stormLeft = 0;
  private stormAngle = 0;
  private streakT = 0;
  private gustSfxT = 0;
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'storm' }>) {
    this.t = spec.first;
  }
  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    if (this.stormLeft > 0) {
      this.stormLeft -= dt;
      const cos = Math.cos(this.stormAngle);
      const sin = Math.sin(this.stormAngle);
      ctx.player.x += cos * spec.pushPlayer * dt;
      ctx.player.y += sin * spec.pushPlayer * dt;
      for (const e of ctx.enemies.actives) {
        if (!e.active || e.dying) continue;
        e.x += cos * spec.pushEnemy * e.knockMul * dt;
        e.y += sin * spec.pushEnemy * e.knockMul * dt;
      }
      this.spawnStreaks(dt, cos, sin);
      this.gustSfxT -= dt;
      if (this.gustSfxT <= 0) {
        this.gustSfxT = 2.2;
        SFX.windGust();
      }
      return;
    }
    this.t -= dt;
    if (!this.warned && this.t <= spec.warnT) {
      this.warned = true;
      emitEvent(ctx.scene.game, 'hud:warn', 'stormWarn');
      SFX.warning();
    }
    if (this.t <= 0) {
      this.t = spec.interval;
      this.warned = false;
      this.stormLeft = spec.dur;
      this.stormAngle = Math.random() * Math.PI * 2;
      this.gustSfxT = 0;
      if (getSettings().shake) ctx.scene.cameras.main.shake(280, 0.0035);
    }
  }
  private spawnStreaks(dt: number, cos: number, sin: number): void {
    this.streakT -= dt;
    if (this.streakT > 0) return;
    this.streakT = 0.05;
    const ctx = this.ctx;
    const cam = ctx.scene.cameras.main;
    const hw = cam.width / 2 / cam.zoom + 60;
    const hh = cam.height / 2 / cam.zoom + 60;
    const px = ctx.player.x - cos * hw + (Math.random() - 0.5) * 2 * (Math.abs(sin) * hw + Math.abs(cos) * 80);
    const py = ctx.player.y - sin * hh + (Math.random() - 0.5) * 2 * (Math.abs(cos) * hh + Math.abs(sin) * 80);
    const leaf = Math.random() < 0.45;
    const img = ctx.scene.add.image(px, py, leaf ? 'hz_leaf' : 'p_dot')
      .setDepth(9e5)
      .setAlpha(leaf ? 0.9 : 0.5)
      .setScale(leaf ? 0.9 + Math.random() * 0.5 : Phaser.Math.FloatBetween(0.4, 0.8))
      .setTint(leaf ? 0xffffff : HILLS.windStreak);
    const dist = hw * 2.4;
    ctx.scene.tweens.add({
      targets: img,
      x: px + cos * dist + (Math.random() - 0.5) * 90,
      y: py + sin * dist + (Math.random() - 0.5) * 90,
      rotation: leaf ? (Math.random() - 0.5) * 9 : 0,
      duration: 700 + Math.random() * 500,
      ease: 'Sine.easeIn',
      onComplete: () => img.destroy(),
    });
  }
  destroy(): void { /* streak tween 自销 */ }
}

// ---------- 荆棘地皮（M18 批次2 将被 thornwall 吸收，过渡保留） ----------

export class BramblesMechanic implements Mechanic {
  private t: number;
  private patches: Patch[] = [];
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'brambles' }>) {
    this.t = spec.first;
  }
  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = aroundPlayer(ctx, 100, 320);
        const r = spec.r * (0.85 + Math.random() * 0.3);
        const img = ctx.scene.add.image(x, y, 'bz_thorns').setDepth(6).setAlpha(0);
        img.setDisplaySize(r * 2, r * 2 * (img.height / img.width));
        ctx.scene.tweens.add({ targets: img, alpha: 1, duration: 250 });
        this.patches.push({ img, x, y, r, t: spec.dur, tick: 0 });
      }
    }
    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      p.t -= dt;
      const dx = px - p.x;
      const dy = py - p.y;
      if (dx * dx + dy * dy * 4 < p.r * p.r && ctx.run.iframeT <= 0) {
        ctx.damagePlayer(spec.dmg * dmgScale(effMin(ctx)));
        ctx.fx.burst(px, py + 8, { tex: 'p_dot', color: BRAMBLE.thornDecor, count: 4, speed: 70, life: 0.3, scale: 0.6 });
      }
      if (p.t <= 0) {
        const img = p.img;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
        this.patches.splice(i, 1);
      }
    }
  }
  destroy(): void {
    this.patches.forEach((p) => p.img.destroy());
    this.patches.length = 0;
  }
}

// ---------- 流星雨（nocturne 风味，与 nightfall 并存） ----------

export class StarfallMechanic implements Mechanic {
  private t: number;
  private patches: Patch[] = [];
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'starfall' }>) {
    this.t = spec.first;
  }
  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = i === 0
          ? [ctx.player.x + (Math.random() - 0.5) * 90, ctx.player.y + (Math.random() - 0.5) * 90]
          : aroundPlayer(ctx, 80, 340);
        const img = ctx.scene.add.image(x, y, 'nz_warn').setDepth(7).setAlpha(0);
        img.setDisplaySize(spec.r * 2, spec.r * 2);
        ctx.scene.tweens.add({ targets: img, alpha: 0.9, duration: 200 });
        this.patches.push({ img, x, y, r: spec.r, t: spec.warnT + i * 0.22, tick: 0 });
      }
      SFX.warning();
    }
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      p.t -= dt;
      p.img.setAlpha(0.55 + Math.sin(ctx.run.elapsed * 16) * 0.3);
      if (p.t > 0) continue;
      p.img.destroy();
      this.patches.splice(i, 1);
      this.impact(p.x, p.y, p.r);
    }
  }
  private impact(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    const min = effMin(ctx);
    SFX.boom();
    ctx.fx.ring(x, y, NOCTURNE.starGlow, r / 42, 0.5);
    ctx.fx.burst(x, y, { tex: 'p_star', color: NOCTURNE.starShot, count: 14, speed: 220, life: 0.5, scale: 1, spin: true });
    if (getSettings().shake) ctx.scene.cameras.main.shake(120, 0.004);
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      ctx.hitEnemy(e, spec.edmg * hpScale(min), { kb: 240, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.8 });
    }
    const dx = ctx.player.x - x;
    const dy = ctx.player.y - y;
    if (dx * dx + dy * dy < r * r) {
      ctx.run.meteorHits++;
      ctx.damagePlayer(spec.dmg * dmgScale(min));
    }
  }
  destroy(): void {
    this.patches.forEach((p) => p.img.destroy());
    this.patches.length = 0;
  }
}

// ---------- 晨光柱（M18 批次2 将被 beacon 吸收，过渡保留） ----------

export class DawnpillarMechanic implements Mechanic {
  private t: number;
  private patches: Patch[] = [];
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'dawnpillar' }>) {
    this.t = spec.first;
  }
  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = aroundPlayer(ctx, 120, 300);
        const img = ctx.scene.add.image(x, y, 'sz_pillar').setDepth(6).setAlpha(0);
        img.setDisplaySize(spec.r * 2, spec.r * 2 * (img.height / img.width));
        ctx.scene.tweens.add({ targets: img, alpha: 0.95, duration: 350 });
        this.patches.push({ img, x, y, r: spec.r, t: spec.dur, tick: 0 });
        ctx.fx.ring(x, y, SUMMIT.pillarDeep, 2.4, 0.6);
      }
      SFX.heal();
    }
    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      p.t -= dt;
      p.img.setAlpha(0.85 + Math.sin(ctx.run.elapsed * 5) * 0.1);
      const dx = px - p.x;
      const dy = py - p.y;
      if (dx * dx + dy * dy * 4 < p.r * p.r) {
        ctx.run.heal(spec.hps * dt);
        if (Math.random() < dt * 9) {
          ctx.fx.burst(px + (Math.random() - 0.5) * 20, py, { tex: 'p_dot', color: SUMMIT.pillar, count: 1, speed: 32, life: 0.5, scale: 0.6, alpha: 0.85 });
        }
      }
      p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = 0.25;
        ctx.grid.queryCircle(p.x, p.y, p.r, queryOut);
        for (const e of queryOut) ctx.hitEnemy(e, spec.dps * 0.25, { quiet: true });
        if (Math.random() < 0.5) {
          ctx.fx.burst(p.x + (Math.random() - 0.5) * p.r, p.y + (Math.random() - 0.5) * p.r * 0.5,
            { tex: 'p_star', color: SUMMIT.pillar, count: 1, speed: 24, life: 0.4, scale: 0.7, alpha: 0.8 });
        }
      }
      if (p.t <= 0) {
        const img = p.img;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 350, onComplete: () => img.destroy() });
        this.patches.splice(i, 1);
      }
    }
  }
  destroy(): void {
    this.patches.forEach((p) => p.img.destroy());
    this.patches.length = 0;
  }
}
