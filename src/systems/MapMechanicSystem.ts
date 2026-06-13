// 地图轻量机制系统（每图一条，不引入碰撞）：
// puddles（露珠池塘）— 周期在玩家四周生成减速水皮，敌我同减速，逼迫规划走位
// storm（晚霞山岗）— 定时大风：预警横幅后全场持续推挤（玩家+敌人按受击退系数），打乱站位
// springs（萤暮林地）— 治愈泉：周期在四周涌出泉眼，站进去回血——为了回血要冒险走位
// gusts（紫露花田）— 花浪阵风：周期铺开顺风带，敌我踩上同加速——借风跑路或被风追身
// brambles（莓果灌丛）— 荆棘地皮：周期长出刺丛扎玩家的脚（敌人毫不在意），挤压走位空间
// starfall（星语夜原）— 流星雨：预警光圈→流星砸落，敌我同伤——躲开它或借它清群
// dawnpillar（破晓之巅）— 晨光柱：站入回血且灼烧柱中敌人，黎明前的安全岛
import Phaser from 'phaser';
import type { MechanicSpec } from '../content/maps';
import { dmgScale, hpScale } from '../content/enemies';
import { BRAMBLE, GROVE, HILLS, NOCTURNE, SUMMIT } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { getSettings } from '../core/settings';
import type { CombatContext, RunSystem } from './context';
import { queryOut } from './weapons/base';

/** 机制自管的地皮/落点标记（荆棘丛 / 流星预警 / 晨光柱） */
interface Patch {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  r: number;
  t: number;
  tick: number; // DoT 节流（晨光柱灼烧用）
}

export class MapMechanicSystem implements RunSystem {
  private t: number;
  private warned = false;
  private stormLeft = 0;
  private stormAngle = 0;
  private streakT = 0;
  private gustSfxT = 0;
  private patches: Patch[] = [];

  constructor(private ctx: CombatContext, private spec: MechanicSpec) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const s = this.spec;
    if (s.kind === 'puddles') this.updatePuddles(dt);
    else if (s.kind === 'storm') this.updateStorm(dt, s);
    else if (s.kind === 'springs') this.updateSprings(dt, s);
    else if (s.kind === 'gusts') this.updateGusts(dt, s);
    else if (s.kind === 'brambles') this.updateBrambles(dt, s);
    else if (s.kind === 'starfall') this.updateStarfall(dt, s);
    else this.updateDawnpillar(dt, s);
  }

  destroy(): void {
    this.patches.forEach((p) => p.img.destroy());
    this.patches.length = 0;
  }

  /** 有效分钟（成长缩放与敌人同曲线） */
  private effMin(): number {
    return (this.ctx.run.elapsed / 60) * this.ctx.map.timeK;
  }

  /** 玩家四周随机点 */
  private aroundPlayer(min: number, max: number): [number, number] {
    const a = Math.random() * Math.PI * 2;
    const d = min + Math.random() * (max - min);
    return [this.ctx.player.x + Math.cos(a) * d, this.ctx.player.y + Math.sin(a) * d];
  }

  // ---------- 荆棘地皮 ----------

  private updateBrambles(dt: number, spec: Extract<MechanicSpec, { kind: 'brambles' }>): void {
    const ctx = this.ctx;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = this.aroundPlayer(100, 320);
        const r = spec.r * (0.85 + Math.random() * 0.3);
        const img = ctx.scene.add.image(x, y, 'bz_thorns').setDepth(6).setAlpha(0);
        img.setDisplaySize(r * 2, r * 2 * (img.height / img.width));
        ctx.scene.tweens.add({ targets: img, alpha: 1, duration: 250 });
        this.patches.push({ img, x, y, r, t: spec.dur, tick: 0 });
      }
    }
    // 扎脚判定（椭圆地皮；damagePlayer 自带无敌帧节流）
    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      p.t -= dt;
      const dx = px - p.x;
      const dy = py - p.y;
      if (dx * dx + dy * dy * 4 < p.r * p.r && ctx.run.iframeT <= 0) {
        ctx.damagePlayer(spec.dmg * dmgScale(this.effMin()));
        ctx.fx.burst(px, py + 8, { tex: 'p_dot', color: BRAMBLE.thornDecor, count: 4, speed: 70, life: 0.3, scale: 0.6 });
      }
      if (p.t <= 0) {
        const img = p.img;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
        this.patches.splice(i, 1);
      }
    }
  }

  // ---------- 流星雨 ----------

  private updateStarfall(dt: number, spec: Extract<MechanicSpec, { kind: 'starfall' }>): void {
    const ctx = this.ctx;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        // 其中一颗瞄向玩家脚边（必须挪窝），其余随机散布
        const [x, y] = i === 0
          ? [ctx.player.x + (Math.random() - 0.5) * 90, ctx.player.y + (Math.random() - 0.5) * 90]
          : this.aroundPlayer(80, 340);
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
      // 砸落：敌我同伤
      p.img.destroy();
      this.patches.splice(i, 1);
      this.impact(p.x, p.y, p.r, spec);
    }
  }

  private impact(x: number, y: number, r: number, spec: Extract<MechanicSpec, { kind: 'starfall' }>): void {
    const ctx = this.ctx;
    const min = this.effMin();
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
      ctx.run.meteorHits++; // M16 stargazer 埋点：被砸中即计数（活到 Tracker 下秒评估 = 仍存活）
      ctx.damagePlayer(spec.dmg * dmgScale(min));
    }
  }

  // ---------- 晨光柱 ----------

  private updateDawnpillar(dt: number, spec: Extract<MechanicSpec, { kind: 'dawnpillar' }>): void {
    const ctx = this.ctx;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = this.aroundPlayer(120, 300);
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
      // 站入回血
      const dx = px - p.x;
      const dy = py - p.y;
      if (dx * dx + dy * dy * 4 < p.r * p.r) {
        ctx.run.heal(spec.hps * dt);
        if (Math.random() < dt * 9) {
          ctx.fx.burst(px + (Math.random() - 0.5) * 20, py, { tex: 'p_dot', color: SUMMIT.pillar, count: 1, speed: 32, life: 0.5, scale: 0.6, alpha: 0.85 });
        }
      }
      // 灼烧柱中敌人（与 ZoneSystem burn 同节流：0.25s 刻）
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

  // ---------- 减速水皮 ----------

  private updatePuddles(dt: number): void {
    const spec = this.spec as Extract<MechanicSpec, { kind: 'puddles' }>;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = spec.interval;
    const ctx = this.ctx;
    for (let i = 0; i < spec.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 110 + Math.random() * 290;
      ctx.addZone({
        x: ctx.player.x + Math.cos(a) * d,
        y: ctx.player.y + Math.sin(a) * d,
        r: spec.r * (0.85 + Math.random() * 0.3),
        dur: spec.dur,
        effect: 'slow',
        tex: 'pz_pool',
        affectsPlayer: true,
      });
    }
  }

  // ---------- 治愈泉 ----------

  private updateSprings(dt: number, spec: Extract<MechanicSpec, { kind: 'springs' }>): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = spec.interval;
    const ctx = this.ctx;
    for (let i = 0; i < spec.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 130 + Math.random() * 200;
      const x = ctx.player.x + Math.cos(a) * d;
      const y = ctx.player.y + Math.sin(a) * d;
      ctx.addZone({ x, y, r: spec.r, dur: spec.dur, effect: 'heal', dps: spec.hps, tex: 'gz_spring' });
      ctx.fx.ring(x, y, GROVE.springDeep, 2.2, 0.6);
    }
    SFX.heal();
  }

  // ---------- 花浪阵风（顺风带） ----------

  private updateGusts(dt: number, spec: Extract<MechanicSpec, { kind: 'gusts' }>): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = spec.interval;
    const ctx = this.ctx;
    for (let i = 0; i < spec.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 90 + Math.random() * 260;
      ctx.addZone({
        x: ctx.player.x + Math.cos(a) * d,
        y: ctx.player.y + Math.sin(a) * d,
        r: spec.r * (0.85 + Math.random() * 0.3),
        dur: spec.dur,
        effect: 'haste',
        mul: spec.mul,
        tex: 'lz_breeze',
      });
    }
    SFX.windGust();
  }

  // ---------- 定时大风 ----------

  private updateStorm(dt: number, spec: Extract<MechanicSpec, { kind: 'storm' }>): void {
    const ctx = this.ctx;
    if (this.stormLeft > 0) {
      this.stormLeft -= dt;
      const cos = Math.cos(this.stormAngle);
      const sin = Math.sin(this.stormAngle);
      // 推挤：玩家恒定，敌人按受击退系数（Boss 0 / 精英 0.05 几乎不动）
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

  /** 风暴期顺风飘叶/风痕（tween 走场景时钟，倍速同步） */
  private spawnStreaks(dt: number, cos: number, sin: number): void {
    this.streakT -= dt;
    if (this.streakT > 0) return;
    this.streakT = 0.05;
    const ctx = this.ctx;
    const cam = ctx.scene.cameras.main;
    const hw = cam.width / 2 / cam.zoom + 60;
    const hh = cam.height / 2 / cam.zoom + 60;
    // 上风向边缘随机起点
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
}
