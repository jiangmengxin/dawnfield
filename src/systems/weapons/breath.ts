// 25. 龙息 / 烈焰息（朝面前持续喷吐一片灼热火焰锥；进化锥更宽更远更炽）
import Phaser from 'phaser';
import { W_BREATH } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import { Weapon, queryOut } from './base';

const FLAME_COLOR = 0xf0d878;

export class BreathWeapon extends Weapon {
  private breatheT = 0;
  private tickT = 0;
  private visT = 0;
  private aim = 0;

  protected cooldown(): number {
    return this.evolved ? W_BREATH.evoCd : W_BREATH.cd[this.level - 1];
  }

  private dmg(): number {
    return W_BREATH.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_BREATH.evoDmgMul : 1);
  }

  private range(): number {
    return (this.evolved ? W_BREATH.evoRange : W_BREATH.range) * this.ctx.stats.area;
  }

  private halfAngle(): number {
    return this.evolved ? W_BREATH.evoHalfAngle : W_BREATH.halfAngle;
  }

  protected fire(): void {
    this.breatheT = W_BREATH.dur;
    this.tickT = 0;
    SFX.swish();
  }

  protected tick(dt: number): void {
    if (this.breatheT <= 0) return;
    const ctx = this.ctx;
    this.breatheT -= dt;
    // 跟随当前朝向（静止时锁最近敌人，再不行沿用上次）
    if (ctx.facing.x !== 0 || ctx.facing.y !== 0) {
      this.aim = Math.atan2(ctx.facing.y, ctx.facing.x);
    } else {
      const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, this.range() + 40);
      if (near) this.aim = Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x);
    }
    this.spawnFlames(dt);

    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = W_BREATH.tick;
      this.burn();
    }
  }

  /** 锥形灼伤判定 */
  private burn(): void {
    const ctx = this.ctx;
    const px = ctx.player.x;
    const py = ctx.player.y;
    const range = this.range();
    const half = this.halfAngle();
    const cos = Math.cos(this.aim);
    const sin = Math.sin(this.aim);
    ctx.grid.queryCircle(px + cos * range * 0.5, py + sin * range * 0.5, range * 0.5 + 36, queryOut);
    const dmg = this.dmg();
    for (const e of queryOut) {
      const dx = e.x - px;
      const dy = e.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > range + e.radius) continue;
      const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.aim));
      if (da > half) continue;
      ctx.hitEnemy(e, dmg, { kb: W_BREATH.kb, kx: cos, ky: sin, pitch: 1.1 });
    }
  }

  /** 喷吐火舌视觉（节流投放朝前飞散的火焰） */
  private spawnFlames(dt: number): void {
    this.visT -= dt;
    if (this.visT > 0) return;
    this.visT = 0.035;
    const ctx = this.ctx;
    const range = this.range();
    const half = this.halfAngle();
    const a = this.aim + (Math.random() - 0.5) * half * 1.6;
    const sx = ctx.player.x + Math.cos(this.aim) * 14;
    const sy = ctx.player.y + Math.sin(this.aim) * 14;
    const reach = range * (0.7 + Math.random() * 0.3);
    const img = ctx.scene.add.image(sx, sy, 'w_flame')
      .setDepth(1e6 + 1)
      .setRotation(a)
      .setScale(0.5)
      .setAlpha(0.95)
      .setTint(Math.random() < 0.4 ? 0xffd060 : FLAME_COLOR);
    ctx.scene.tweens.add({
      targets: img,
      x: sx + Math.cos(a) * reach,
      y: sy + Math.sin(a) * reach,
      scale: 1.3,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  }
}
