// 4. 细雨 / 倾盆
import Phaser from 'phaser';
import { W_RAIN } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { Weapon, queryOut } from './base';

export class RainWeapon extends Weapon {
  private cloud: Phaser.GameObjects.Image | null = null;
  private cloudBob = 0;

  protected cooldown(): number {
    return this.evolved ? W_RAIN.evoCd : W_RAIN.cd[this.level - 1];
  }

  private dmg(): number {
    return W_RAIN.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_RAIN.evoDmgMul : 1);
  }

  private area(): number {
    return 56 * this.ctx.stats.area * (this.evolved ? W_RAIN.evoAreaMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    if (this.evolved) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 190;
      this.drop(ctx.player.x + Math.cos(a) * d, ctx.player.y + Math.sin(a) * d);
      return;
    }
    const n = W_RAIN.n[this.level - 1];
    const targets = ctx.enemies.randomOnScreen(n);
    SFX.splash();
    for (let i = 0; i < n; i++) {
      const t = targets[i];
      let x: number;
      let y: number;
      if (t) {
        x = t.x + (Math.random() - 0.5) * 30;
        y = t.y + (Math.random() - 0.5) * 30;
      } else {
        const a = Math.random() * Math.PI * 2;
        const d = 80 + Math.random() * 180;
        x = ctx.player.x + Math.cos(a) * d;
        y = ctx.player.y + Math.sin(a) * d;
      }
      ctx.scene.time.delayedCall(i * 90, () => this.drop(x, y));
    }
  }

  private drop(x: number, y: number): void {
    const ctx = this.ctx;
    if (!ctx.run.running) return;
    const img = ctx.scene.add.image(x, y - 180, 'w_drop').setDepth(1e6).setAlpha(0.9).setScale(1.2);
    ctx.scene.tweens.add({
      targets: img, y, duration: 360, ease: 'Quad.easeIn',
      onComplete: () => {
        img.destroy();
        if (!ctx.run.running) return;
        const r = this.area();
        ctx.fx.ring(x, y, PAL.rain, r / 42, 0.3);
        ctx.fx.burst(x, y, { tex: 'p_dot', color: PAL.rain, count: 7, speed: 110, life: 0.4, scale: 0.7, grav: 160 });
        ctx.addZone({ x, y, r: r * 0.95, dur: 2.6, effect: 'slow' });
        ctx.grid.queryCircle(x, y, r, queryOut);
        for (const e of queryOut) {
          ctx.hitEnemy(e, this.dmg(), { kb: 40, kx: 0, ky: 0, pitch: 0.8 });
        }
      },
    });
  }

  onEvolve(): void {
    super.onEvolve();
    this.cloud = this.ctx.scene.add.image(this.ctx.player.x, this.ctx.player.y - 90, 'w_cloud').setDepth(1e6 + 5).setAlpha(0.92);
  }

  protected tick(dt: number): void {
    if (this.cloud) {
      this.cloudBob += dt * 2;
      const ctx = this.ctx;
      this.cloud.x += (ctx.player.x - this.cloud.x) * Math.min(1, dt * 4);
      this.cloud.y += (ctx.player.y - 92 + Math.sin(this.cloudBob) * 6 - this.cloud.y) * Math.min(1, dt * 4);
    }
  }

  destroy(): void { this.cloud?.destroy(); }
}
