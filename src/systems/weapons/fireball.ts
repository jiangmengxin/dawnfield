// 19. 流火 / 业火（缓慢大火球穿透全场敌群，沿途留火痕；进化更大更烫痕更毒）
import Phaser from 'phaser';
import { W_FIREBALL } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const FIRE_COLOR = 0xf8c860;

class Fireball {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life: number;
  private trailT = 0;
  private hit = new Map<Enemy, number>();

  constructor(
    private ctx: CombatContext,
    a: number,
    speed: number,
    life: number,
    private dmg: number,
    private r: number,
    private trailDps: number,
    private evolved: boolean,
  ) {
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.life = life;
    this.img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_fireball').setDepth(1e6 + 1).setScale(r / 18);
  }

  update(dt: number, elapsed: number): boolean {
    const ctx = this.ctx;
    this.life -= dt;
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.img.rotation += dt * 4;
    this.img.setScale((this.r / 18) * (0.92 + Math.sin(elapsed * 16) * 0.08));
    // 火痕地皮
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = W_FIREBALL.trailCd;
      ctx.addZone({ x: this.img.x, y: this.img.y, r: W_FIREBALL.trailR * ctx.stats.area, dur: W_FIREBALL.trailDur, effect: 'burn', dps: this.trailDps * ctx.stats.dmg, tex: 'w_emberpool' });
    }
    // 穿透命中（rehit 间隔，火球不灭）
    ctx.grid.queryCircle(this.img.x, this.img.y, this.r, queryOut);
    const sp = Math.hypot(this.vx, this.vy) || 1;
    for (const e of queryOut) {
      const last = this.hit.get(e) ?? -9;
      if (elapsed - last < W_FIREBALL.hitCd) continue;
      this.hit.set(e, elapsed);
      ctx.hitEnemy(e, this.dmg, { kb: 120, kx: this.vx / sp, ky: this.vy / sp, pitch: 0.9 });
    }
    if (this.life <= 0) {
      ctx.fx.ring(this.img.x, this.img.y, FIRE_COLOR, (this.r * 2) / 42, 0.4);
      ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: FIRE_COLOR, count: this.evolved ? 10 : 6, speed: 130, life: 0.4, scale: 0.9, grav: 60 });
      this.img.destroy();
      return false;
    }
    return true;
  }

  kill(): void {
    this.img.destroy();
  }
}

export class FireballWeapon extends Weapon {
  private balls: Fireball[] = [];

  protected cooldown(): number {
    return this.evolved ? W_FIREBALL.evoCd : W_FIREBALL.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 460);
    const a = near
      ? Math.atan2(near.y - ctx.player.y, near.x - ctx.player.x)
      : Math.atan2(ctx.facing.y, ctx.facing.x);
    const dmg = W_FIREBALL.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_FIREBALL.evoDmgMul : 1);
    const r = W_FIREBALL.hitR * ctx.stats.area * (this.evolved ? W_FIREBALL.evoRMul : 1);
    const trailDps = this.evolved ? W_FIREBALL.evoTrailDps : W_FIREBALL.trailDps;
    SFX.boom();
    this.balls.push(new Fireball(ctx, a, W_FIREBALL.speed * ctx.stats.projSpeed, W_FIREBALL.life * ctx.stats.area, dmg, r, trailDps, this.evolved));
  }

  protected tick(dt: number): void {
    const elapsed = this.ctx.run.elapsed;
    for (let i = this.balls.length - 1; i >= 0; i--) {
      if (!this.balls[i].update(dt, elapsed)) this.balls.splice(i, 1);
    }
  }

  destroy(): void {
    this.balls.forEach((b) => b.kill());
  }
}
