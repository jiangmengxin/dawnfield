// 11. 松果锤 / 山摇撼（melee：朝身前抡起重锤狠砸，高伤大击退；进化后砸出震波）
import { W_MALLET } from '../../content/weapons';
import { shakeCam } from '../../gfx/shake';
import { SFX } from '../../audio/sound';
import { Weapon, queryOut } from './base';

const MALLET_COLOR = 0xc89058;

export class MalletWeapon extends Weapon {
  protected cooldown(): number {
    return this.evolved ? W_MALLET.evoCd : W_MALLET.cd[this.level - 1];
  }

  private dmg(): number {
    return W_MALLET.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_MALLET.evoDmgMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 260);
    const a = near
      ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x)
      : Math.atan2(ctx.facing.y, ctx.facing.x);
    const reach = W_MALLET.reach * ctx.stats.area;
    const ix = ctx.player.x + Math.cos(a) * reach;
    const iy = ctx.player.y + Math.sin(a) * reach;
    const side = Math.cos(a) < 0 ? -1 : 1;

    // 抡锤前摇：锤头从举起转到砸落
    const img = ctx.scene.add.image(ctx.player.x + Math.cos(a) * reach * 0.4, ctx.player.y + Math.sin(a) * reach * 0.4 - 14, 'w_mallet')
      .setDepth(1e6 + 3)
      .setOrigin(0.5, 0.9)
      .setFlipX(side < 0)
      .setRotation(a - side * 1.9);
    SFX.swish();
    ctx.scene.tweens.add({
      targets: img, rotation: a + side * 0.55, x: ix, y: iy - 6,
      duration: W_MALLET.swingT * 1000, ease: 'Quad.easeIn',
      onComplete: () => {
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 160, onComplete: () => img.destroy() });
        if (!ctx.run.running) return;
        this.smash(ix, iy);
      },
    });
  }

  private smash(x: number, y: number): void {
    const ctx = this.ctx;
    const r = W_MALLET.radius * ctx.stats.area;
    SFX.boom(this.evolved);
    ctx.hitStop(0.03);
    shakeCam(ctx.scene, 110, 0.004);
    ctx.fx.ring(x, y, MALLET_COLOR, r / 42, 0.4);
    ctx.fx.burst(x, y, { tex: 'p_dot', color: 0xe8d0a8, count: 8, speed: 150, life: 0.4, scale: 0.8, grav: 200 });
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      ctx.hitEnemy(e, this.dmg(), { kb: W_MALLET.kb, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.65 });
    }
    // 进化：震波扩散二段
    if (this.evolved) {
      ctx.scene.time.delayedCall(120, () => {
        if (!ctx.run.running) return;
        const wr = W_MALLET.waveR * ctx.stats.area;
        ctx.fx.ring(x, y, MALLET_COLOR, wr / 42, 0.55);
        ctx.fx.burst(x, y, { tex: 'p_star', color: 0xe8d0a8, count: 10, speed: 240, life: 0.5, scale: 1, spin: true });
        ctx.grid.queryCircle(x, y, wr, queryOut);
        for (const e of queryOut) {
          const ea = Math.atan2(e.y - y, e.x - x);
          ctx.hitEnemy(e, this.dmg() * W_MALLET.waveDmgK, { kb: 380, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.7 });
        }
      });
    }
  }
}
