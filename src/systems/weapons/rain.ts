// 4. 细雨 / 倾盆
import Phaser from 'phaser';
import { W_RAIN } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { Weapon, queryOut } from './base';

export class RainWeapon extends Weapon {
  private cloud: Phaser.GameObjects.Image | null = null;
  private cloudBob = 0;
  // 进化雨云的固定停驻点（不随玩家；周期挪到新的敌群上空）
  private cgx = 0;
  private cgy = 0;
  private relocT = 0;

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
      // 在固定雨云下方落雨（不再以玩家为中心）
      this.drop(this.cgx + (Math.random() - 0.5) * 150, this.cgy + (Math.random() - 0.5) * 110);
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
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 380);
    this.cgx = near ? near.x : ctx.player.x;
    this.cgy = near ? near.y : ctx.player.y;
    this.relocT = 3;
    this.cloud = ctx.scene.add.image(this.cgx, this.cgy - 90, 'w_cloud').setDepth(1e6 + 5).setAlpha(0.92);
  }

  protected tick(dt: number): void {
    if (!this.cloud) return;
    const ctx = this.ctx;
    this.cloudBob += dt * 2;
    // 雨云停驻在固定点、只原地轻浮（不随玩家移动）
    this.cloud.x += (this.cgx - this.cloud.x) * Math.min(1, dt * 3);
    this.cloud.y += (this.cgy - 92 + Math.sin(this.cloudBob) * 6 - this.cloud.y) * Math.min(1, dt * 3);
    // 周期挪到新的敌群上空（无敌则落在玩家附近一处，仍不黏身）
    this.relocT -= dt;
    if (this.relocT <= 0) {
      this.relocT = 3.5;
      const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 460);
      if (near) {
        this.cgx = near.x;
        this.cgy = near.y;
      } else {
        const a = Math.random() * Math.PI * 2;
        const d = 120 + Math.random() * 160;
        this.cgx = ctx.player.x + Math.cos(a) * d;
        this.cgy = ctx.player.y + Math.sin(a) * d;
      }
    }
  }

  destroy(): void { this.cloud?.destroy(); }
}
