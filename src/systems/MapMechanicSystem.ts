// 地图轻量机制系统（每图一条，不引入碰撞）：
// puddles（露珠池塘）— 周期在玩家四周生成减速水皮，敌我同减速，逼迫规划走位
// storm（晚霞山岗）— 定时大风：预警横幅后全场持续推挤（玩家+敌人按受击退系数），打乱站位
// springs（萤暮林地）— 治愈泉：周期在四周涌出泉眼，站进去回血——为了回血要冒险走位
// gusts（紫露花田）— 花浪阵风：周期铺开顺风带，敌我踩上同加速——借风跑路或被风追身
import Phaser from 'phaser';
import type { MechanicSpec } from '../content/maps';
import { GROVE, HILLS } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { getSettings } from '../core/settings';
import type { CombatContext, RunSystem } from './context';

export class MapMechanicSystem implements RunSystem {
  private t: number;
  private warned = false;
  private stormLeft = 0;
  private stormAngle = 0;
  private streakT = 0;
  private gustSfxT = 0;

  constructor(private ctx: CombatContext, private spec: MechanicSpec) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const s = this.spec;
    if (s.kind === 'puddles') this.updatePuddles(dt);
    else if (s.kind === 'storm') this.updateStorm(dt, s);
    else if (s.kind === 'springs') this.updateSprings(dt, s);
    else this.updateGusts(dt, s);
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
