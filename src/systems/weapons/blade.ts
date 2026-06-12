// 1. 光刃 / 晨曦
import Phaser from 'phaser';
import { W_BLADE } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { Weapon, queryOut } from './base';

export class BladeWeapon extends Weapon {
  protected cooldown(): number {
    return this.evolved ? W_BLADE.evoCd : W_BLADE.cd[this.level - 1];
  }

  private radius(): number {
    return (this.evolved ? W_BLADE.evoRadius : W_BLADE.radius * (this.level >= 3 ? W_BLADE.radiusLv3Mul : 1)) * this.ctx.stats.area;
  }

  private dmg(): number {
    return (this.evolved ? W_BLADE.evoDmg : W_BLADE.dmg[this.level - 1]) * this.ctx.stats.dmg;
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 300);
    const aim = near
      ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x)
      : Math.atan2(ctx.facing.y, ctx.facing.x);
    if (this.evolved) {
      this.spinSlash();
      return;
    }
    this.slash(aim, 0);
    if (this.level >= 2) this.slash(aim + Math.PI, 0.13);
  }

  private slash(angle: number, delay: number): void {
    const ctx = this.ctx;
    ctx.scene.time.delayedCall(delay * 1000, () => {
      if (!ctx.run.running) return;
      const r = this.radius();
      const img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_arc')
        .setRotation(angle - 0.45)
        .setScale(r / 46)
        .setDepth(1e6)
        .setAlpha(0.95);
      ctx.scene.tweens.add({
        targets: img, rotation: angle + 0.45, alpha: 0,
        duration: 200, ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
      });
      SFX.swish();
      // 扇形判定
      ctx.grid.queryCircle(ctx.player.x, ctx.player.y, r, queryOut);
      for (const e of queryOut) {
        const ea = Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x);
        const da = Math.abs(Phaser.Math.Angle.Wrap(ea - angle));
        if (da < 1.15) {
          ctx.hitEnemy(e, this.dmg(), { kb: 220, kx: Math.cos(ea), ky: Math.sin(ea) });
        }
      }
    });
  }

  private spinSlash(): void {
    const ctx = this.ctx;
    const r = this.radius();
    const img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_arc_full')
      .setScale(r / 54).setDepth(1e6).setAlpha(0.9);
    ctx.scene.tweens.add({
      targets: img, rotation: Math.PI, alpha: 0, scale: (r / 54) * 1.15,
      duration: 280, ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
    });
    SFX.swish();
    ctx.grid.queryCircle(ctx.player.x, ctx.player.y, r, queryOut);
    const hitNow = [...queryOut];
    for (const e of hitNow) {
      const ea = Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x);
      ctx.hitEnemy(e, this.dmg(), { kb: 260, kx: Math.cos(ea), ky: Math.sin(ea) });
    }
    // 0.16s 后扩散冲击环（二段伤害）
    ctx.scene.time.delayedCall(160, () => {
      if (!ctx.run.running) return;
      ctx.fx.ring(ctx.player.x, ctx.player.y, PAL.bladeDeep, (r * 1.6) / 42, 0.4);
      ctx.grid.queryCircle(ctx.player.x, ctx.player.y, r * 1.6, queryOut);
      for (const e of queryOut) {
        const ea = Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x);
        ctx.hitEnemy(e, this.dmg() * 0.6, { kb: 320, kx: Math.cos(ea), ky: Math.sin(ea) });
      }
    });
  }
}
