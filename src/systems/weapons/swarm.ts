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
  private hit = new Map<Enemy, number>();

  constructor(private ctx: CombatContext, a: number, speed: number, life: number, private dmg: number) {
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
    // 反复叮咬
    ctx.grid.queryCircle(this.img.x, this.img.y, W_SWARM.hitR, queryOut);
    for (const e of queryOut) {
      const last = this.hit.get(e) ?? -9;
      if (now - last < W_SWARM.hitCd) continue;
      this.hit.set(e, now);
      ctx.hitEnemy(e, this.dmg, { kb: 36, kx: this.vx / speed, ky: this.vy / speed, pitch: 1.8 });
    }
    return true;
  }

  kill(): void {
    this.img.destroy();
  }
}

export class SwarmWeapon extends Weapon {
  private bees: Bee[] = [];

  protected cooldown(): number {
    return this.evolved ? W_SWARM.evoCd : W_SWARM.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_SWARM.evoN : W_SWARM.n[this.level - 1];
    const dmg = W_SWARM.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_SWARM.evoDmgMul : 1);
    const life = (this.evolved ? W_SWARM.evoLife : W_SWARM.life) * ctx.stats.area;
    const speed = W_SWARM.speed * ctx.stats.projSpeed;
    SFX.throwSfx();
    for (let i = 0; i < n; i++) {
      this.bees.push(new Bee(ctx, Math.random() * Math.PI * 2, speed * (0.85 + Math.random() * 0.3), life, dmg));
    }
  }

  protected tick(dt: number): void {
    const now = this.ctx.run.elapsed;
    for (let i = this.bees.length - 1; i >= 0; i--) {
      if (!this.bees[i].update(dt, now)) this.bees.splice(i, 1);
    }
  }

  destroy(): void {
    this.bees.forEach((b) => b.kill());
  }
}
