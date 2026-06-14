// 18. 飞斧 / 裂空斧（抛物线上抛旋转斧、下落穿透高伤；进化扇形多斧覆盖更广）
import Phaser from 'phaser';
import { W_AXE } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const AXE_COLOR = 0xc8a860;

interface Axe {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  hit: Set<Enemy>;
}

export class AxeWeapon extends Weapon {
  private axes: Axe[] = [];

  protected cooldown(): number {
    return this.evolved ? W_AXE.evoCd : W_AXE.cd[this.level - 1];
  }

  private dmg(): number {
    return W_AXE.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_AXE.evoDmgMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_AXE.evoN : W_AXE.n[this.level - 1];
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 360);
    // 横向偏向：朝最近敌人那侧抛，否则随机
    const sideBias = near ? Math.sign(near.x - ctx.player.x) || 1 : (Math.random() < 0.5 ? -1 : 1);
    SFX.swish();
    for (let i = 0; i < n; i++) {
      // 进化：横速扇形对称铺开；未进化：紧贴抛向最近敌侧
      const vx = this.evolved
        ? ((i - (n - 1) / 2) / Math.max(1, (n - 1) / 2)) * W_AXE.spreadVx
        : sideBias * (70 + Math.random() * W_AXE.spreadVx * 0.5);
      const img = ctx.scene.add.image(ctx.player.x, ctx.player.y - 6, 'w_axe').setDepth(1e6 + 2).setScale(this.evolved ? 1.2 : 1);
      this.axes.push({ img, vx, vy: -W_AXE.vy0, spin: (vx >= 0 ? 1 : -1) * 16, life: 1.7, hit: new Set() });
    }
  }

  protected tick(dt: number): void {
    const pierce = this.evolved ? W_AXE.evoPierce : W_AXE.pierce;
    const grav = W_AXE.grav;
    for (let i = this.axes.length - 1; i >= 0; i--) {
      const a = this.axes[i];
      a.life -= dt;
      a.vy += grav * dt;
      a.img.x += a.vx * dt;
      a.img.y += a.vy * dt;
      a.img.rotation += a.spin * dt;
      if (a.life <= 0) {
        a.img.destroy();
        this.axes.splice(i, 1);
        continue;
      }
      const ctx = this.ctx;
      ctx.grid.queryCircle(a.img.x, a.img.y, W_AXE.hitR, queryOut);
      let dead = false;
      for (const e of queryOut) {
        if (a.hit.has(e)) continue;
        a.hit.add(e);
        ctx.hitEnemy(e, this.dmg(), { kb: 180, kx: Math.sign(a.vx) || 0, ky: 0.4, pitch: 0.8 });
        ctx.fx.burst(e.x, e.y, { tex: 'p_dot', color: AXE_COLOR, count: 3, speed: 90, life: 0.3, scale: 0.7 });
        if (a.hit.size >= pierce) {
          dead = true;
          break;
        }
      }
      if (dead) {
        a.img.destroy();
        this.axes.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.axes.forEach((a) => a.img.destroy());
  }
}
