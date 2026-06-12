// 3. 棱镜光束 / 虹折射
import { W_PRISM } from '../../content/weapons';
import { PAL, RAINBOW } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { Weapon, nearestK } from './base';

export class PrismWeapon extends Weapon {
  protected cooldown(): number {
    return this.evolved ? W_PRISM.evoCd : W_PRISM.cd[this.level - 1];
  }

  private dmg(): number {
    return (this.evolved ? W_PRISM.evoDmg : W_PRISM.dmg[this.level - 1]) * this.ctx.stats.dmg;
  }

  private width(): number {
    return (this.level >= 3 ? 17 : 13) * this.ctx.stats.area;
  }

  protected fire(): void {
    const ctx = this.ctx;
    const k = this.level >= 2 ? 2 : 1;
    const targets = nearestK(ctx, ctx.player.x, ctx.player.y, k, 560);
    if (targets.length === 0) {
      this.cdT = 0.3;
      return;
    }
    // 蓄能光点
    const glow = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'p_dot').setDepth(1e6).setScale(0.5).setAlpha(0.8);
    ctx.scene.tweens.add({
      targets: glow, scale: 2.2, alpha: 0, duration: 180,
      onComplete: () => glow.destroy(),
    });
    ctx.scene.time.delayedCall(170, () => {
      if (!ctx.run.running) return;
      SFX.beam();
      for (const t of targets) {
        if (!t.active) continue;
        const a = Math.atan2(t.y - ctx.player.y, t.x - ctx.player.x);
        this.beam(ctx.player.x, ctx.player.y, a, 540, this.dmg(), true);
      }
    });
  }

  /** 绘制 + 判定一道彩虹光束 */
  private beam(x0: number, y0: number, a: number, len: number, dmg: number, refract: boolean): void {
    const ctx = this.ctx;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const x1 = x0 + ca * len;
    const y1 = y0 + sa * len;
    const w = this.width();
    const gr = ctx.scene.add.graphics().setDepth(1e6);
    // 彩虹层
    RAINBOW.forEach((c, i) => {
      const off = (i - (RAINBOW.length - 1) / 2) * (w / RAINBOW.length) * 0.9;
      gr.lineStyle(w / RAINBOW.length + 1.5, c, 0.55);
      gr.beginPath();
      gr.moveTo(x0 - sa * off, y0 + ca * off);
      gr.lineTo(x1 - sa * off, y1 + ca * off);
      gr.strokePath();
    });
    gr.lineStyle(3.5, 0xffffff, 0.95);
    gr.beginPath();
    gr.moveTo(x0, y0);
    gr.lineTo(x1, y1);
    gr.strokePath();
    ctx.scene.tweens.add({ targets: gr, alpha: 0, duration: 260, ease: 'Cubic.easeIn', onComplete: () => gr.destroy() });
    ctx.fx.burst(x1, y1, { tex: 'p_star', color: 0xffffff, count: 4, speed: 60, life: 0.35, scale: 0.9 });

    // 线段命中
    for (const e of ctx.enemies.actives) {
      if (!e.active || e.dying) continue;
      const ex = e.x - x0;
      const ey = e.y - y0;
      const proj = ex * ca + ey * sa;
      if (proj < -e.radius || proj > len + e.radius) continue;
      const perp = Math.abs(-ex * sa + ey * ca);
      if (perp < w + e.radius) {
        ctx.hitEnemy(e, dmg, { kb: 60, kx: ca, ky: sa, pitch: 1.6 });
      }
    }
    // 进化：末端折射
    if (refract && this.evolved) {
      ctx.fx.burst(x1, y1, { tex: 'p_star', color: PAL.mine, count: 6, speed: 90, life: 0.4 });
      for (const s of [-1, 1]) {
        this.beam(x1, y1, a + s * 0.7, 280, dmg * 0.7, false);
      }
    }
  }
}
