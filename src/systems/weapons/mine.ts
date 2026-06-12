// 7. 星尘雷 / 新星
import Phaser from 'phaser';
import { W_MINE } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { getSettings } from '../../core/settings';
import { Weapon, queryOut } from './base';

interface Mine {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  arm: number;
  life: number;
}

export class MineWeapon extends Weapon {
  private mines: Mine[] = [];

  protected cooldown(): number { return W_MINE.cd[this.level - 1]; }

  private dmg(): number {
    return W_MINE.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_MINE.evoDmgMul : 1);
  }

  private radius(): number {
    return 92 * this.ctx.stats.area * (this.evolved ? W_MINE.evoRadiusMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    if (this.mines.length >= W_MINE.max[this.level - 1]) return;
    const x = ctx.player.x + (Math.random() - 0.5) * 72;
    const y = ctx.player.y + (Math.random() - 0.5) * 72;
    const img = ctx.scene.add.image(x, y, 'w_mine').setDepth(900).setScale(0);
    const glow = ctx.scene.add.image(x, y, 'p_dot').setDepth(899).setTint(PAL.mine).setScale(2).setAlpha(0.25);
    ctx.scene.tweens.add({ targets: img, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.mines.push({ img, glow, arm: 0.4, life: 9 });
  }

  protected tick(dt: number): void {
    const ctx = this.ctx;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.arm -= dt;
      m.life -= dt;
      m.img.rotation += dt * 1.5;
      m.glow.setAlpha(0.18 + Math.sin(ctx.run.elapsed * 6) * 0.1);
      if (m.life <= 0) {
        // 过期：安静消失
        ctx.scene.tweens.add({ targets: [m.img, m.glow], alpha: 0, scale: 0, duration: 300, onComplete: () => { m.img.destroy(); m.glow.destroy(); } });
        this.mines.splice(i, 1);
        continue;
      }
      if (m.arm <= 0) {
        ctx.grid.queryCircle(m.img.x, m.img.y, 46, queryOut);
        if (queryOut.length > 0) {
          this.explode(m);
          this.mines.splice(i, 1);
        }
      }
    }
  }

  private explode(m: Mine): void {
    const ctx = this.ctx;
    const r = this.radius();
    const x = m.img.x;
    const y = m.img.y;
    m.img.destroy();
    m.glow.destroy();
    SFX.boom(this.evolved);
    ctx.fx.ring(x, y, PAL.mine, r / 42, 0.4);
    ctx.fx.burst(x, y, { tex: 'p_star', color: PAL.mine, count: this.evolved ? 16 : 10, speed: 200, life: 0.55, scale: 1.1, spin: true });
    ctx.fx.burst(x, y, { tex: 'p_dot', color: 0xffffff, count: 6, speed: 120, life: 0.3 });
    if (getSettings().shake) ctx.scene.cameras.main.shake(120, 0.0035);
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      ctx.hitEnemy(e, this.dmg(), { kb: 300, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.7 });
    }
    if (this.evolved) {
      ctx.addZone({ x, y, r: r * 0.75, dur: 2.5, effect: 'burn', dps: 9 * ctx.stats.dmg });
    }
  }

  destroy(): void {
    this.mines.forEach((m) => { m.img.destroy(); m.glow.destroy(); });
  }
}
