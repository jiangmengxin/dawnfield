// 6. 疾风镖 / 旋风
import Phaser from 'phaser';
import { W_BOOMERANG } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

class BoomShot {
  img: Phaser.GameObjects.Image;
  private state: 'out' | 'back' = 'out';
  private vx: number;
  private vy: number;
  private decel: number;
  private dirX: number;
  private dirY: number;
  private hit = new Set<Enemy>();
  private trailT = 0;

  constructor(private ctx: CombatContext, a: number, speed: number, dist: number, private dmg: number, private magnet: boolean) {
    this.img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_boom').setDepth(1e6).setScale(magnet ? 1.46 : 1.25);
    this.dirX = Math.cos(a);
    this.dirY = Math.sin(a);
    this.vx = this.dirX * speed;
    this.vy = this.dirY * speed;
    // v²/(2d) 让它在 dist 处速度归零
    this.decel = (speed * speed) / (2 * dist);
  }

  /** 倍速穿隧细化：effDt > 1/30 时分两半步推进+判定（2x 下高速折返不漏帧） */
  update(dt: number): boolean {
    const sub = dt > 1 / 30 ? 2 : 1;
    for (let s = 0; s < sub; s++) {
      if (!this.step(dt / sub)) return false;
    }
    return true;
  }

  private step(dt: number): boolean {
    const ctx = this.ctx;
    this.img.rotation += dt * 14;
    if (this.state === 'out') {
      this.vx -= this.dirX * this.decel * dt;
      this.vy -= this.dirY * this.decel * dt;
      if (this.vx * this.dirX + this.vy * this.dirY <= 0) {
        this.state = 'back';
        this.hit.clear();
        ctx.fx.ring(this.img.x, this.img.y, PAL.boom, this.magnet ? 1.35 : 0.95, 0.28);
        ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_petal', color: PAL.boom, count: this.magnet ? 7 : 4, speed: 92, life: 0.32, scale: 0.72, alpha: 0.84, spin: true });
      }
    } else {
      const dx = ctx.player.x - this.img.x;
      const dy = ctx.player.y - this.img.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 480 * ctx.stats.projSpeed;
      this.vx += ((dx / d) * sp - this.vx) * Math.min(1, dt * 6);
      this.vy += ((dy / d) * sp - this.vy) * Math.min(1, dt * 6);
      if (d < 28) {
        this.img.destroy();
        return false;
      }
      if (this.magnet) ctx.magnetizeGems(this.img.x, this.img.y, 95);
    }
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = this.magnet ? 0.035 : 0.05;
      ctx.fx.burst(this.img.x, this.img.y, {
        tex: this.state === 'back' ? 'p_petal' : 'p_dot', color: PAL.boom,
        count: 1, speed: this.state === 'back' ? 28 : 12, life: 0.3,
        scale: this.magnet ? 0.72 : 0.55, alpha: 0.66, spin: this.state === 'back',
      });
    }
    ctx.grid.queryCircle(this.img.x, this.img.y, 18, queryOut);
    for (const e of queryOut) {
      if (this.hit.has(e)) continue;
      this.hit.add(e);
      ctx.hitEnemy(e, this.dmg, { kb: 130, kx: this.vx / 400, ky: this.vy / 400, pitch: 1.1 });
      ctx.fx.burst(e.x, e.y, { tex: 'p_dot', color: PAL.boom, count: this.magnet ? 3 : 2, speed: 70, life: 0.24, scale: 0.52, alpha: 0.78 });
    }
    return true;
  }

  kill(): void { this.img.destroy(); }
}

export class BoomerangWeapon extends Weapon {
  private shots: BoomShot[] = [];

  protected cooldown(): number {
    return this.evolved ? W_BOOMERANG.evoCd : W_BOOMERANG.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 480);
    const baseA = near
      ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x)
      : Math.atan2(ctx.facing.y, ctx.facing.x);
    const dmg = W_BOOMERANG.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_BOOMERANG.evoDmgMul : 1);
    const dist = (250 + (this.level >= 4 ? 60 : 0)) * ctx.stats.area;
    const speed = 380 * ctx.stats.projSpeed;
    if (this.evolved) {
      for (const off of [-0.45, 0, 0.45]) {
        this.shots.push(new BoomShot(ctx, baseA + off, speed, dist, dmg, true));
      }
      SFX.throwSfx();
    } else {
      const n = W_BOOMERANG.count[this.level - 1];
      for (let i = 0; i < n; i++) {
        ctx.scene.time.delayedCall(i * 150, () => {
          if (ctx.run.running) {
            this.shots.push(new BoomShot(ctx, baseA + (Math.random() - 0.5) * 0.3, speed, dist, dmg, false));
            SFX.throwSfx();
          }
        });
      }
    }
  }

  protected tick(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      if (!this.shots[i].update(dt)) this.shots.splice(i, 1);
    }
  }

  destroy(): void { this.shots.forEach((s) => s.kill()); }
}
