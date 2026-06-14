// 17. 飞刀 / 千刃（朝移动方向连射高速穿透飞刀，区域封锁；进化连发成钢铁洪流）
import Phaser from 'phaser';
import { W_DAGGER } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const DAGGER_COLOR = 0x9cc878;

interface Knife {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  trailT: number;
  hit: Set<Enemy>;
}

export class DaggerWeapon extends Weapon {
  private knives: Knife[] = [];

  protected cooldown(): number {
    return this.evolved ? W_DAGGER.evoCd : W_DAGGER.cd[this.level - 1];
  }

  private dmg(): number {
    return W_DAGGER.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_DAGGER.evoDmgMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_DAGGER.evoN : W_DAGGER.n[this.level - 1];
    const speed = W_DAGGER.speed * ctx.stats.projSpeed;
    const life = W_DAGGER.life * ctx.stats.area;
    // 朝移动方向（静止时退而朝最近敌人）
    let aim = Math.atan2(ctx.facing.y, ctx.facing.x);
    if (ctx.facing.x === 0 && ctx.facing.y === 0) {
      const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 420);
      if (near) aim = Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x);
    }
    SFX.swish();
    for (let i = 0; i < n; i++) {
      const a = aim + (i - (n - 1) / 2) * W_DAGGER.spread;
      const img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_dagger')
        .setDepth(1e6)
        .setRotation(a)
        .setScale(this.evolved ? 1.24 : 1.1);
      this.knives.push({ img, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life, trailT: 0, hit: new Set() });
    }
  }

  protected tick(dt: number): void {
    const sub = dt > 1 / 30 ? 2 : 1;
    const pierce = this.evolved ? W_DAGGER.evoPierce : W_DAGGER.pierce;
    for (let i = this.knives.length - 1; i >= 0; i--) {
      const k = this.knives[i];
      let alive = true;
      for (let s = 0; s < sub && alive; s++) alive = this.step(k, dt / sub, pierce);
      if (!alive) {
        k.img.destroy();
        this.knives.splice(i, 1);
      }
    }
  }

  private step(k: Knife, dt: number, pierce: number): boolean {
    const ctx = this.ctx;
    k.life -= dt;
    if (k.life <= 0) return false;
    k.img.x += k.vx * dt;
    k.img.y += k.vy * dt;
    const sp = Math.hypot(k.vx, k.vy) || 1;
    k.trailT -= dt;
    if (k.trailT <= 0) {
      k.trailT = this.evolved ? 0.035 : 0.055;
      ctx.fx.burst(k.img.x - (k.vx / sp) * 10, k.img.y - (k.vy / sp) * 10, {
        tex: 'p_petal', color: DAGGER_COLOR, count: 1, speed: 18, life: 0.24,
        scale: this.evolved ? 0.65 : 0.5, alpha: 0.72, spin: true,
      });
    }
    ctx.grid.queryCircle(k.img.x, k.img.y, 12, queryOut);
    for (const e of queryOut) {
      if (k.hit.has(e)) continue;
      k.hit.add(e);
      ctx.hitEnemy(e, this.dmg(), { kb: 90, kx: k.vx / sp, ky: k.vy / sp, pitch: 1.6 });
      ctx.fx.burst(k.img.x, k.img.y, { tex: 'p_petal', color: DAGGER_COLOR, count: 2, speed: 62, life: 0.22, scale: 0.54, alpha: 0.78, spin: true });
      if (k.hit.size >= pierce) {
        ctx.fx.burst(k.img.x, k.img.y, { tex: 'p_petal', color: DAGGER_COLOR, count: 5, speed: 82, life: 0.26, scale: 0.68, alpha: 0.86, spin: true });
        return false;
      }
    }
    return true;
  }

  destroy(): void {
    this.knives.forEach((k) => k.img.destroy());
  }
}
