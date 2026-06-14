// 23. 跳跳豆 / 乱弹（弹珠撞屏边反弹、久留场中乱窜可重复命中；进化更多更久撞点迸火星）
import Phaser from 'phaser';
import { W_RICOCHET } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const BEAD_COLOR = 0xe87cc0;

class Bead {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life: number;
  private hit = new Map<Enemy, number>();

  constructor(
    private ctx: CombatContext,
    a: number,
    speed: number,
    life: number,
    private dmg: number,
    private evolved: boolean,
  ) {
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.life = life;
    this.img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_bead').setDepth(1e6).setScale(1.6);
  }

  update(dt: number, now: number): boolean {
    const ctx = this.ctx;
    this.life -= dt;
    if (this.life <= 0) {
      ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: BEAD_COLOR, count: 4, speed: 80, life: 0.3, scale: 0.6, alpha: 0.8 });
      this.img.destroy();
      return false;
    }
    const sub = dt > 1 / 30 ? 2 : 1;
    for (let s = 0; s < sub; s++) this.step(dt / sub);
    this.img.rotation += dt * 6;
    // 命中（久留可对同敌重复打，带间隔）
    ctx.grid.queryCircle(this.img.x, this.img.y, W_RICOCHET.hitR, queryOut);
    const sp = Math.hypot(this.vx, this.vy) || 1;
    for (const e of queryOut) {
      const last = this.hit.get(e) ?? -9;
      if (now - last < W_RICOCHET.hitCd) continue;
      this.hit.set(e, now);
      ctx.hitEnemy(e, this.dmg, { kb: 110, kx: this.vx / sp, ky: this.vy / sp, pitch: 1.5 });
    }
    return true;
  }

  private step(dt: number): void {
    const view = this.ctx.scene.cameras.main.worldView;
    const pad = 8;
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    let bounced = false;
    if (this.img.x < view.x + pad && this.vx < 0) { this.vx = -this.vx; this.img.x = view.x + pad; bounced = true; }
    else if (this.img.x > view.right - pad && this.vx > 0) { this.vx = -this.vx; this.img.x = view.right - pad; bounced = true; }
    if (this.img.y < view.y + pad && this.vy < 0) { this.vy = -this.vy; this.img.y = view.y + pad; bounced = true; }
    else if (this.img.y > view.bottom - pad && this.vy > 0) { this.vy = -this.vy; this.img.y = view.bottom - pad; bounced = true; }
    if (bounced) {
      SFX.hit(1.4);
      if (this.evolved) {
        this.ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_star', color: BEAD_COLOR, count: 4, speed: 120, life: 0.3, scale: 0.7, spin: true });
      }
    }
  }

  kill(): void {
    this.img.destroy();
  }
}

export class RicochetWeapon extends Weapon {
  private beads: Bead[] = [];

  protected cooldown(): number {
    return this.evolved ? W_RICOCHET.evoCd : W_RICOCHET.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_RICOCHET.evoN : W_RICOCHET.n[this.level - 1];
    const dmg = W_RICOCHET.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_RICOCHET.evoDmgMul : 1);
    const life = (this.evolved ? W_RICOCHET.evoLife : W_RICOCHET.life) * ctx.stats.area;
    const speed = W_RICOCHET.speed * ctx.stats.projSpeed;
    SFX.throwSfx();
    const a0 = ctx.rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      this.beads.push(new Bead(ctx, a0 + (i / n) * Math.PI * 2, speed, life, dmg, this.evolved));
    }
  }

  protected tick(dt: number): void {
    const now = this.ctx.run.elapsed;
    for (let i = this.beads.length - 1; i >= 0; i--) {
      if (!this.beads[i].update(dt, now)) this.beads.splice(i, 1);
    }
  }

  destroy(): void {
    this.beads.forEach((b) => b.kill());
  }
}
