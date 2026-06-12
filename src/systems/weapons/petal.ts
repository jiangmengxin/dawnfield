// 2. 花瓣环 / 百花
import Phaser from 'phaser';
import { W_PETAL } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

export class PetalWeapon extends Weapon {
  private petals: Phaser.GameObjects.Image[] = [];
  private outer: Phaser.GameObjects.Image[] = [];
  private angle = 0;
  private hitMap = new Map<Enemy, number>();
  private burstT = W_PETAL.burstCd;
  private shots: PetalShot[] = [];

  protected cooldown(): number { return 999; }
  protected fire(): void { /* 持续型武器 */ }

  private radius(): number {
    return (this.level >= 5 ? W_PETAL.radiusLv5 : W_PETAL.radius) * this.ctx.stats.area;
  }

  private dmg(): number {
    return W_PETAL.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_PETAL.evoDmgMul : 1);
  }

  private ensure(): void {
    const want = W_PETAL.count[this.level - 1];
    while (this.petals.length < want) {
      this.petals.push(this.ctx.scene.add.image(0, 0, 'w_petal').setDepth(1e6));
    }
    if (this.evolved) {
      const wantO = want + W_PETAL.evoExtraPetals;
      while (this.outer.length < wantO) {
        this.outer.push(this.ctx.scene.add.image(0, 0, 'w_petal').setDepth(1e6).setScale(1.15));
      }
    }
  }

  onLevelUp(): void { this.ensure(); }
  onEvolve(): void {
    super.onEvolve();
    this.ensure();
  }

  protected tick(dt: number): void {
    this.ensure();
    const ctx = this.ctx;
    this.angle += dt * 2.7;
    const r = this.radius();
    const now = ctx.run.elapsed;
    const ringDamage = (imgs: Phaser.GameObjects.Image[], rad: number, dir: number, phase: number) => {
      imgs.forEach((p, i) => {
        const a = phase + dir * this.angle + (i / imgs.length) * Math.PI * 2;
        p.setPosition(ctx.player.x + Math.cos(a) * rad, ctx.player.y + Math.sin(a) * rad);
        p.setRotation(a + Math.PI / 2);
        ctx.grid.queryCircle(p.x, p.y, 13, queryOut);
        for (const e of queryOut) {
          const last = this.hitMap.get(e) ?? -9;
          if (now - last > 0.5) {
            this.hitMap.set(e, now);
            const ea = Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x);
            ctx.hitEnemy(e, this.dmg(), { kb: 240, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 1.3 });
          }
        }
      });
    };
    ringDamage(this.petals, r, 1, 0);
    if (this.evolved) {
      ringDamage(this.outer, r * 1.6, -1, 0.4);
      // 周期性花瓣弹幕
      this.burstT -= dt;
      if (this.burstT <= 0) {
        this.burstT = W_PETAL.burstCd;
        SFX.throwSfx();
        const n = this.outer.length;
        for (let i = 0; i < n; i++) {
          const a = -this.angle + 0.4 + (i / n) * Math.PI * 2;
          this.shots.push(new PetalShot(ctx, ctx.player.x + Math.cos(a) * r * 1.6, ctx.player.y + Math.sin(a) * r * 1.6, a, this.dmg() * 1.2));
        }
      }
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      if (!this.shots[i].update(dt)) this.shots.splice(i, 1);
    }
    // 清理 hitMap（防泄漏）
    if (ctx.run.frame % 300 === 0) {
      for (const [e, t0] of this.hitMap) if (now - t0 > 3) this.hitMap.delete(e);
    }
  }

  destroy(): void {
    this.petals.forEach((p) => p.destroy());
    this.outer.forEach((p) => p.destroy());
    this.shots.forEach((s) => s.kill());
  }
}

class PetalShot {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life = 0.9;
  private hit = new Set<Enemy>();

  constructor(private ctx: CombatContext, x: number, y: number, a: number, private dmg: number) {
    this.img = ctx.scene.add.image(x, y, 'w_petal').setDepth(1e6).setRotation(a + Math.PI / 2).setScale(1.2);
    this.vx = Math.cos(a) * 270 * ctx.stats.projSpeed;
    this.vy = Math.sin(a) * 270 * ctx.stats.projSpeed;
  }

  update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) {
      this.kill();
      return false;
    }
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.img.setAlpha(Math.min(1, this.life * 3));
    this.ctx.grid.queryCircle(this.img.x, this.img.y, 12, queryOut);
    for (const e of queryOut) {
      if (this.hit.has(e)) continue;
      this.hit.add(e);
      this.ctx.hitEnemy(e, this.dmg, { kb: 120, kx: this.vx / 300, ky: this.vy / 300, pitch: 1.3 });
      if (this.hit.size >= 3) {
        this.kill();
        return false;
      }
    }
    return true;
  }

  kill(): void { this.img.destroy(); }
}
