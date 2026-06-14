// 8. 蒲公英 / 漫天飞絮
// 扇形齐射飘忽的种子，单粒可穿透 2 敌；进化后全周环射且种子缓追敌人
import Phaser from 'phaser';
import { W_PUFF } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

class Seed {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life: number;
  private wave: number; // 飘忽相位
  private trailT = 0;
  private hit = new Set<Enemy>();

  constructor(
    private ctx: CombatContext,
    a: number,
    speed: number,
    life: number,
    private dmg: number,
    private homing: number,
    private evolved: boolean,
  ) {
    this.img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_seed')
      .setDepth(1e6).setRotation(a + Math.PI / 2).setScale(evolved ? 1.45 : 1.25);
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.life = life;
    this.wave = Math.random() * Math.PI * 2;
  }

  /** 倍速穿隧细化：effDt > 1/30 时分两半步推进+判定（2x 下种子不穿小怪） */
  update(dt: number): boolean {
    const sub = dt > 1 / 30 ? 2 : 1;
    for (let s = 0; s < sub; s++) {
      if (!this.step(dt / sub)) return false;
    }
    return true;
  }

  private step(dt: number): boolean {
    const ctx = this.ctx;
    this.life -= dt;
    if (this.life <= 0) {
      // 落地化作一缕小绒光
      ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: PAL.puff, count: 2, speed: 24, life: 0.3, scale: 0.5, alpha: 0.7 });
      this.kill();
      return false;
    }
    // 飘忽：速度方向的法向轻微摆动（蒲公英随风感）
    this.wave += dt * 9;
    const sp = Math.hypot(this.vx, this.vy) || 1;
    const drift = Math.sin(this.wave) * 60;
    let ax = (-this.vy / sp) * drift;
    let ay = (this.vx / sp) * drift;
    // 进化：缓追最近敌人
    if (this.homing > 0) {
      const near = ctx.enemies.nearest(this.img.x, this.img.y, W_PUFF.homingRange);
      if (near) {
        const dx = near.x - this.img.x;
        const dy = near.y - this.img.y;
        const d = Math.hypot(dx, dy) || 1;
        ax += (dx / d) * this.homing;
        ay += (dy / d) * this.homing;
      }
    }
    this.vx += ax * dt;
    this.vy += ay * dt;
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.img.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    this.img.setAlpha(Math.min(1, this.life * 4));
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = this.evolved ? 0.045 : 0.07;
      ctx.fx.burst(this.img.x, this.img.y, {
        tex: this.evolved ? 'p_petal' : 'p_dot',
        color: PAL.puff,
        count: this.evolved ? 2 : 1,
        speed: this.evolved ? 34 : 18,
        life: this.evolved ? 0.38 : 0.28,
        scale: this.evolved ? 0.75 : 0.55,
        alpha: 0.82,
        spin: this.evolved,
      });
    }

    ctx.grid.queryCircle(this.img.x, this.img.y, 13, queryOut);
    for (const e of queryOut) {
      if (this.hit.has(e)) continue;
      this.hit.add(e);
      ctx.hitEnemy(e, this.dmg, { kb: 90, kx: this.vx / sp, ky: this.vy / sp, pitch: 1.4 });
      if (this.hit.size >= W_PUFF.pierce) {
        ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: PAL.puff, count: 3, speed: 50, life: 0.25, scale: 0.55, alpha: 0.8 });
        this.kill();
        return false;
      }
    }
    return true;
  }

  kill(): void { this.img.destroy(); }
}

export class PuffWeapon extends Weapon {
  private seeds: Seed[] = [];

  protected cooldown(): number {
    return this.evolved ? W_PUFF.evoCd : W_PUFF.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const dmg = W_PUFF.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_PUFF.evoDmgMul : 1);
    const speed = W_PUFF.speed * ctx.stats.projSpeed;
    const life = W_PUFF.life * ctx.stats.area;
    SFX.throwSfx();
    if (this.evolved) {
      // 全周环射仍保留，但半数种子先压向近目标，避免单体进化后反而散火。
      const n = W_PUFF.evoN;
      const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 520);
      const baseA = near ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x) : ctx.rng() * Math.PI * 2;
      const focusN = near ? Math.ceil(n * 0.55) : 0;
      const a0 = ctx.rng() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = i < focusN
          ? baseA + (focusN === 1 ? 0 : (i / (focusN - 1) - 0.5) * 0.9) + (ctx.rng() - 0.5) * 0.08
          : a0 + ((i - focusN) / Math.max(1, n - focusN)) * Math.PI * 2;
        this.seeds.push(new Seed(ctx, a, speed, life, dmg, W_PUFF.evoHoming, true));
      }
      ctx.fx.ring(ctx.player.x, ctx.player.y, PAL.puff, 2.3, 0.48);
      return;
    }
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 460);
    const baseA = near
      ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x)
      : Math.atan2(ctx.facing.y, ctx.facing.x);
    const n = W_PUFF.n[this.level - 1];
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * W_PUFF.spread;
      this.seeds.push(new Seed(ctx, baseA + off + (Math.random() - 0.5) * 0.08, speed * (0.92 + Math.random() * 0.16), life, dmg, W_PUFF.homing, false));
    }
  }

  protected tick(dt: number): void {
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      if (!this.seeds[i].update(dt)) this.seeds.splice(i, 1);
    }
  }

  destroy(): void { this.seeds.forEach((s) => s.kill()); }
}
