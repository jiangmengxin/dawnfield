// 28. 突刺剑 / 贯日（朝面前猛然直线突刺，细长高单体；进化突刺后追射延伸光刃）
import { W_SWORD } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { Weapon, queryOut } from './base';

const SWORD_COLOR = 0xf8eec0;

export class SwordWeapon extends Weapon {
  protected cooldown(): number {
    return this.evolved ? W_SWORD.evoCd : W_SWORD.cd[this.level - 1];
  }

  private dmg(): number {
    return W_SWORD.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_SWORD.evoDmgMul : 1);
  }

  private len(): number {
    return W_SWORD.len * this.ctx.stats.area * (this.evolved ? W_SWORD.evoLenMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, this.len() + 120);
    const a = near
      ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x)
      : Math.atan2(ctx.facing.y, ctx.facing.x);
    this.thrust(a);
  }

  private thrust(a: number): void {
    const ctx = this.ctx;
    const len = this.len();
    const px = ctx.player.x;
    const py = ctx.player.y;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    SFX.swish();

    // 剑体：从身侧探出 → 猛刺 → 收回
    const img = ctx.scene.add.image(px, py, 'w_sword')
      .setDepth(1e6 + 2)
      .setOrigin(0.12, 0.5)
      .setRotation(a)
      .setAlpha(0.96);
    img.setDisplaySize(len * 1.05, 22);
    img.setPosition(px - cos * len * 0.22, py - sin * len * 0.22);
    ctx.scene.tweens.add({
      targets: img, x: px + cos * len * 0.12, y: py + sin * len * 0.12,
      duration: W_SWORD.thrustT * 1000, ease: 'Quad.easeOut',
      onComplete: () => {
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 130, onComplete: () => img.destroy() });
      },
    });

    // 突刺命中（细长长条）
    ctx.scene.time.delayedCall(W_SWORD.thrustT * 1000, () => {
      if (!ctx.run.running) return;
      this.lineHit(px, py, cos, sin, len, W_SWORD.wid * ctx.stats.area, this.dmg());
      // 贯日：延伸光刃
      if (this.evolved) {
        const beamLen = len + W_SWORD.evoBeamLen * ctx.stats.area;
        const gr = ctx.scene.add.graphics().setDepth(1e6 + 1);
        gr.lineStyle(10, SWORD_COLOR, 0.5);
        gr.lineBetween(px + cos * len * 0.6, py + sin * len * 0.6, px + cos * beamLen, py + sin * beamLen);
        gr.lineStyle(3, 0xfffbe0, 0.95);
        gr.lineBetween(px + cos * len * 0.6, py + sin * len * 0.6, px + cos * beamLen, py + sin * beamLen);
        ctx.scene.tweens.add({ targets: gr, alpha: 0, duration: 220, ease: 'Cubic.easeIn', onComplete: () => gr.destroy() });
        this.lineHit(px, py, cos, sin, beamLen, W_SWORD.wid * 0.7 * ctx.stats.area, this.dmg() * W_SWORD.evoBeamDmgK);
      }
    });
  }

  /** 玩家前方 len×2wid 长条命中（投影到突刺轴） */
  private lineHit(px: number, py: number, cos: number, sin: number, len: number, wid: number, dmg: number): void {
    const ctx = this.ctx;
    ctx.grid.queryCircle(px + cos * len * 0.5, py + sin * len * 0.5, len * 0.5 + wid, queryOut);
    for (const e of queryOut) {
      const dx = e.x - px;
      const dy = e.y - py;
      const along = dx * cos + dy * sin;
      if (along < -e.radius || along > len + e.radius) continue;
      const aside = Math.abs(-dx * sin + dy * cos);
      if (aside > wid + e.radius) continue;
      ctx.hitEnemy(e, dmg, { kb: W_SWORD.kb, kx: cos, ky: sin, pitch: 1.0 });
      ctx.fx.burst(e.x, e.y, { tex: 'p_dot', color: PAL.blade, count: 3, speed: 90, life: 0.3, scale: 0.6 });
    }
  }
}
