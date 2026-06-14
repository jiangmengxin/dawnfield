// 3. 棱镜光束 / 虹折射
import { W_PRISM } from '../../content/weapons';
import { RAINBOW } from '../../gfx/palette';
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
    const hitW = this.width();
    const w = hitW * (this.evolved ? 1.22 : 1);
    const gr = ctx.scene.add.graphics().setDepth(1e6);
    const line = (lx0: number, ly0: number, lx1: number, ly1: number) => {
      gr.beginPath();
      gr.moveTo(lx0, ly0);
      gr.lineTo(lx1, ly1);
      gr.strokePath();
    };
    // 柔光底带（纸白晕开，融入画风不刺眼）
    gr.lineStyle(w * 2.6, 0xfff6e8, 0.1);
    line(x0, y0, x1, y1);
    // 彩虹层（更柔、相互叠融的粉彩条带）
    RAINBOW.forEach((c, i) => {
      const off = (i - (RAINBOW.length - 1) / 2) * (w / RAINBOW.length);
      gr.lineStyle(w / RAINBOW.length + 3, c, 0.4);
      line(x0 - sa * off, y0 + ca * off, x1 - sa * off, y1 + ca * off);
    });
    // 柔和暖芯（暖纸白替代刺眼纯白）
    gr.lineStyle(2.6, 0xfff6d8, 0.85);
    line(x0, y0, x1, y1);
    ctx.scene.tweens.add({ targets: gr, alpha: 0, duration: 300, ease: 'Cubic.easeIn', onComplete: () => gr.destroy() });
    ctx.fx.burst(x1, y1, { tex: 'p_dot', color: 0xfff0d8, count: 5, speed: 70, life: 0.4, scale: 0.9, alpha: 0.9 });

    // 线段命中
    for (const e of ctx.enemies.actives) {
      if (!e.active || e.dying) continue;
      const ex = e.x - x0;
      const ey = e.y - y0;
      const proj = ex * ca + ey * sa;
      if (proj < -e.radius || proj > len + e.radius) continue;
      const perp = Math.abs(-ex * sa + ey * ca);
      if (perp < hitW + e.radius) {
        ctx.hitEnemy(e, dmg, { kb: 60, kx: ca, ky: sa, pitch: 1.6 });
      }
    }
    // 进化：末端折射
    if (refract && this.evolved) {
      ctx.fx.ring(x1, y1, 0xf8c8e0, 1.25, 0.28);
      ctx.fx.burst(x1, y1, { tex: 'p_dot', color: 0xf8c8e0, count: 6, speed: 90, life: 0.4, alpha: 0.9 });
      for (const s of [-1, 1]) {
        this.beam(x1, y1, a + s * 0.7, 280, dmg * W_PRISM.evoRefractK, false);
      }
    }
  }
}
