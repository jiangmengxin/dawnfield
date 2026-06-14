// 22. 候鸟 / 双飞（远轨巡飞的小鸟伙伴 + 周期俯冲扫穿敌阵；进化加鸟更快更频）
import Phaser from 'phaser';
import { W_BIRD } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const BIRD_COLOR = 0xb8c8ec;

interface Bird {
  img: Phaser.GameObjects.Image;
  slot: number; // 轨道相位偏移
  mode: 'orbit' | 'dive' | 'return';
  tx: number;
  ty: number;
  diveT: number;
}

export class BirdWeapon extends Weapon {
  private birds: Bird[] = [];
  private angle = 0;
  private hitMap = new Map<Enemy, number>();
  private spawned = false;

  protected cooldown(): number {
    return this.evolved ? W_BIRD.diveCd[this.level - 1] * 0.8 : W_BIRD.diveCd[this.level - 1];
  }

  private count(): number {
    return W_BIRD.count[this.level - 1] + (this.evolved ? W_BIRD.evoExtraBirds : 0);
  }

  private dmg(): number {
    return W_BIRD.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_BIRD.evoDmgMul : 1);
  }

  private ensure(): void {
    const want = this.count();
    while (this.birds.length < want) {
      const img = this.ctx.scene.add.image(this.ctx.player.x, this.ctx.player.y, 'w_bird').setDepth(1e6 + 2);
      this.birds.push({ img, slot: this.birds.length, mode: 'orbit', tx: 0, ty: 0, diveT: 0 });
    }
    const scale = this.evolved ? 1.2 : 1;
    for (const b of this.birds) b.img.setScale(scale);
  }

  onLevelUp(): void {
    this.ensure();
  }

  /** fire = 触发空闲鸟俯冲最近敌人 */
  protected fire(): void {
    const ctx = this.ctx;
    this.ensure();
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 460);
    if (!near) {
      this.cdT = 0.4;
      return;
    }
    SFX.swish();
    ctx.fx.ring(ctx.player.x, ctx.player.y, BIRD_COLOR, this.evolved ? 2.0 : 1.45, 0.36);
    let staged = 0;
    for (const b of this.birds) {
      if (b.mode !== 'orbit') continue;
      // 稍微错峰，扫向最近敌人当前位置
      b.mode = 'dive';
      b.tx = near.x;
      b.ty = near.y;
      b.diveT = 0.9 + staged * 0.05;
      staged++;
    }
  }

  protected tick(dt: number): void {
    const ctx = this.ctx;
    if (!this.spawned) {
      this.ensure();
      this.spawned = true;
    }
    const n = this.count();
    const orbitR = W_BIRD.orbitR * ctx.stats.area;
    const orbitSpeed = W_BIRD.orbitSpeed * (this.evolved ? W_BIRD.evoSpeedMul : 1);
    const diveSpeed = W_BIRD.diveSpeed * (this.evolved ? W_BIRD.evoSpeedMul : 1) * ctx.stats.projSpeed;
    this.angle += orbitSpeed * dt;
    const now = ctx.run.elapsed;

    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const orbA = this.angle + (b.slot / Math.max(1, n)) * Math.PI * 2;
      const ox = ctx.player.x + Math.cos(orbA) * orbitR;
      const oy = ctx.player.y + Math.sin(orbA) * orbitR * 0.78;

      if (b.mode === 'orbit') {
        b.img.x = ox;
        b.img.y = oy;
        b.img.setRotation(orbA + Math.PI / 2);
        b.img.setFlipX(Math.cos(orbA + Math.PI / 2) < 0);
      } else if (b.mode === 'dive') {
        b.diveT -= dt;
        const dx = b.tx - b.img.x;
        const dy = b.ty - b.img.y;
        const d = Math.hypot(dx, dy) || 1;
        b.img.x += (dx / d) * diveSpeed * dt;
        b.img.y += (dy / d) * diveSpeed * dt;
        b.img.setRotation(Math.atan2(dy, dx));
        b.img.setFlipX(dx < 0);
        // 俯冲尾羽（进化更猛：更密更亮）
        if (ctx.run.frame % 2 === 0) {
          ctx.fx.burst(b.img.x, b.img.y, {
            tex: 'p_petal', color: BIRD_COLOR, count: this.evolved ? 2 : 1,
            speed: this.evolved ? 34 : 18, life: 0.34, scale: this.evolved ? 0.9 : 0.62, alpha: 0.72, spin: true,
          });
        }
        this.contact(b, now);
        if (b.diveT <= 0 || d < 16) b.mode = 'return';
      } else {
        const dx = ox - b.img.x;
        const dy = oy - b.img.y;
        const d = Math.hypot(dx, dy) || 1;
        b.img.x += (dx / d) * diveSpeed * 0.7 * dt;
        b.img.y += (dy / d) * diveSpeed * 0.7 * dt;
        b.img.setRotation(Math.atan2(dy, dx));
        b.img.setFlipX(dx < 0);
        this.contact(b, now);
        if (d < 14) b.mode = 'orbit';
      }
    }

    if (ctx.run.frame % 300 === 0) {
      for (const [e, t0] of this.hitMap) if (now - t0 > 3) this.hitMap.delete(e);
    }
  }

  private contact(b: Bird, now: number): void {
    const ctx = this.ctx;
    ctx.grid.queryCircle(b.img.x, b.img.y, W_BIRD.hitR, queryOut);
    for (const e of queryOut) {
      const last = this.hitMap.get(e) ?? -9;
      if (now - last < W_BIRD.hitCd) continue;
      this.hitMap.set(e, now);
      const ea = Math.atan2(e.y - b.img.y, e.x - b.img.x);
      ctx.hitEnemy(e, this.dmg(), { kb: 150, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 1.4 });
      ctx.fx.burst(e.x, e.y, { tex: 'p_star', color: BIRD_COLOR, count: this.evolved ? 6 : 3, speed: 112, life: 0.32, scale: 0.78, alpha: 0.9, spin: true });
    }
  }

  destroy(): void {
    this.birds.forEach((b) => b.img.destroy());
  }
}
