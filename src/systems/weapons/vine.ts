// 13. 卷卷藤 / 荆棘华尔兹（whip：朝身前甩出横扫长鞭；进化加打身后第二鞭且更长）
import { W_VINE } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import { Weapon, queryOut } from './base';

const VINE_COLOR = 0x88b868;

export class VineWeapon extends Weapon {
  protected cooldown(): number {
    return this.evolved ? W_VINE.evoCd : W_VINE.cd[this.level - 1];
  }

  private dmg(): number {
    return W_VINE.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_VINE.evoDmgMul : 1);
  }

  private len(): number {
    return W_VINE.len * this.ctx.stats.area * (this.evolved ? W_VINE.evoLenMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, this.len() + 80);
    const a = near
      ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x)
      : Math.atan2(ctx.facing.y, ctx.facing.x);
    this.lash(a);
    if (this.evolved) {
      // 荆棘华尔兹：身后第二鞭
      ctx.scene.time.delayedCall(W_VINE.evoBackDelay * 1000, () => {
        if (!ctx.run.running) return;
        this.lash(a + Math.PI);
      });
    }
  }

  /** 甩鞭：身前长条判定 + 鞭体快闪 */
  private lash(a: number): void {
    const ctx = this.ctx;
    const len = this.len();
    const wid = W_VINE.wid * ctx.stats.area;
    SFX.swish();

    // 鞭体视觉：从身侧抽出 → 展平 → 淡出
    const img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_vine')
      .setDepth(1e6 + 2)
      .setOrigin(0.02, 0.5)
      .setRotation(a - 0.35)
      .setAlpha(0.95);
    img.setDisplaySize(len * 1.06, 40);
    ctx.scene.tweens.add({ targets: img, rotation: a + 0.18, duration: 110, ease: 'Quad.easeOut' });
    ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 200, delay: 90, onComplete: () => img.destroy() });
    const gr = ctx.scene.add.graphics().setDepth(1e6 + 1);
    gr.lineStyle(wid * 1.15, VINE_COLOR, 0.16);
    gr.lineBetween(ctx.player.x, ctx.player.y, ctx.player.x + Math.cos(a) * len, ctx.player.y + Math.sin(a) * len);
    gr.lineStyle(3, 0xd8f0c8, 0.62);
    gr.lineBetween(ctx.player.x, ctx.player.y, ctx.player.x + Math.cos(a) * len, ctx.player.y + Math.sin(a) * len);
    ctx.scene.tweens.add({ targets: gr, alpha: 0, duration: 180, delay: 80, onComplete: () => gr.destroy() });
    for (const k of [0.32, 0.6, 0.86]) {
      ctx.fx.burst(ctx.player.x + Math.cos(a) * len * k, ctx.player.y + Math.sin(a) * len * k, {
        tex: 'p_petal', color: this.evolved ? 0xd8a8e8 : VINE_COLOR,
        count: 2, speed: 64, life: 0.32, scale: this.evolved ? 0.85 : 0.65, alpha: 0.78, spin: true,
      });
    }

    // 判定：玩家前方 len×2wid 长条（投影到鞭轴）
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const px = ctx.player.x;
    const py = ctx.player.y;
    const cxm = px + cosA * len * 0.5;
    const cym = py + sinA * len * 0.5;
    ctx.grid.queryCircle(cxm, cym, len * 0.5 + wid, queryOut);
    const dmg = this.dmg();
    for (const e of queryOut) {
      const dx = e.x - px;
      const dy = e.y - py;
      const along = dx * cosA + dy * sinA;
      if (along < -e.radius || along > len + e.radius) continue;
      const aside = Math.abs(-dx * sinA + dy * cosA);
      if (aside > wid + e.radius) continue;
      ctx.hitEnemy(e, dmg, { kb: W_VINE.kb, kx: cosA, ky: sinA, pitch: 1.2 });
      ctx.fx.burst(e.x, e.y, { tex: 'p_petal', color: this.evolved ? 0xd8a8e8 : VINE_COLOR, count: 4, speed: 100, life: 0.34, scale: 0.75, spin: true });
    }
  }
}
