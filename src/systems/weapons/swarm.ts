// 29. 群蜂 / 蜂巢（放出一群乱舞的蜂在身周反复叮咬；进化蜂更多飞更久蜇更凶）
import Phaser from 'phaser';
import { W_SWARM } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

class Bee {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life: number;
  private wanderT = 0;
  private trailT = 0;
  private hit = new Map<Enemy, number>();
  private hits = 0;

  constructor(
    private ctx: CombatContext,
    a: number,
    speed: number,
    life: number,
    private dmg: number,
    private hitLimit: number,
    private targetHit: Map<Enemy, number>,
    private evolved: boolean,
  ) {
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.life = life;
    this.img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_bee').setDepth(1e6);
  }

  update(dt: number, now: number): boolean {
    const ctx = this.ctx;
    this.life -= dt;
    if (this.life <= 0) {
      this.img.destroy();
      return false;
    }
    const speed = Math.hypot(this.vx, this.vy) || 1;
    // 松散索敌：偏向最近敌人，叠加乱舞抖动
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 0.12 + Math.random() * 0.12;
      const near = ctx.enemies.nearest(this.img.x, this.img.y, W_SWARM.seek);
      let a = Math.atan2(this.vy, this.vx) + (Math.random() - 0.5) * 1.6;
      if (near) {
        const seekA = Math.atan2(near.y - this.img.y, near.x - this.img.x);
        a = seekA + (Math.random() - 0.5) * 1.0;
      }
      this.vx = Math.cos(a) * speed;
      this.vy = Math.sin(a) * speed;
    }
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.img.setFlipX(this.vx < 0);
    // 嗡鸣抖动
    this.img.setScale(0.92 + Math.sin(now * 40 + this.life * 13) * 0.12);
    this.img.setAlpha(Math.min(1, this.life * 3));
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = this.evolved ? 0.07 : 0.11;
      ctx.fx.burst(this.img.x, this.img.y, {
        tex: this.evolved ? 'p_star' : 'p_dot', color: 0xf0c850,
        count: 1, speed: this.evolved ? 28 : 14, life: 0.28,
        scale: this.evolved ? 0.5 : 0.4, alpha: 0.68, spin: this.evolved,
      });
    }
    // 反复叮咬
    ctx.grid.queryCircle(this.img.x, this.img.y, W_SWARM.hitR, queryOut);
    for (const e of queryOut) {
      const last = this.hit.get(e) ?? -9;
      if (now - last < W_SWARM.hitCd) continue;
      const globalLast = this.targetHit.get(e) ?? -9;
      if (now - globalLast < W_SWARM.targetHitCd) continue;
      this.hit.set(e, now);
      this.targetHit.set(e, now);
      this.hits++;
      ctx.hitEnemy(e, this.dmg, { kb: 36, kx: this.vx / speed, ky: this.vy / speed, pitch: 1.8 });
      ctx.fx.burst(e.x, e.y, { tex: 'p_star', color: 0xf0c850, count: this.evolved ? 3 : 2, speed: 74, life: 0.24, scale: 0.52, alpha: 0.82, spin: true });
      if (this.hits >= this.hitLimit) {
        this.img.destroy();
        return false;
      }
    }
    return true;
  }

  kill(): void {
    this.img.destroy();
  }
}

export class SwarmWeapon extends Weapon {
  private bees: Bee[] = [];
  private targetHit = new Map<Enemy, number>();

  protected cooldown(): number {
    return this.evolved ? W_SWARM.evoCd : W_SWARM.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_SWARM.evoN : W_SWARM.n[this.level - 1];
    const dmg = W_SWARM.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_SWARM.evoDmgMul : 1);
    const life = (this.evolved ? W_SWARM.evoLife : W_SWARM.life) * ctx.stats.area;
    const speed = W_SWARM.speed * ctx.stats.projSpeed;
    const hitLimit = this.evolved ? W_SWARM.evoHitLimit : W_SWARM.hitLimit;
    SFX.throwSfx();
    ctx.fx.ring(ctx.player.x, ctx.player.y, 0xf0c850, this.evolved ? 1.9 : 1.35, 0.34);
    for (let i = 0; i < n; i++) {
      this.bees.push(new Bee(ctx, Math.random() * Math.PI * 2, speed * (0.85 + Math.random() * 0.3), life, dmg, hitLimit, this.targetHit, this.evolved));
    }
  }

  protected tick(dt: number): void {
    const now = this.ctx.run.elapsed;
    for (let i = this.bees.length - 1; i >= 0; i--) {
      if (!this.bees[i].update(dt, now)) this.bees.splice(i, 1);
    }
    if (this.ctx.run.frame % 300 === 0) {
      for (const [e, t0] of this.targetHit) if (!e.active || e.dying || now - t0 > 3) this.targetHit.delete(e);
    }
  }

  destroy(): void {
    this.bees.forEach((b) => b.kill());
    this.targetHit.clear();
  }
}
