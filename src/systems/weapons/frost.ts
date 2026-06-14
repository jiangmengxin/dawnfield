// 31. 晨霜 / 霜华（射出霜锥，命中碎裂溅射；未进化留减速霜地，进化改碎裂成多枚飞散冰碎片）
import Phaser from 'phaser';
import { W_FROST } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { nearestK, Weapon, queryOut } from './base';

interface Frag {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  hit: Set<Enemy>;
}

const FROST_COLOR = 0xa8e0f0;

class Icicle {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life: number;

  constructor(private ctx: CombatContext, a: number, speed: number, life: number, private onHit: (x: number, y: number) => void) {
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.life = life;
    this.img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_icicle').setDepth(1e6).setRotation(a);
  }

  update(dt: number): boolean {
    const ctx = this.ctx;
    const sub = dt > 1 / 30 ? 2 : 1;
    for (let s = 0; s < sub; s++) {
      this.life -= dt / sub;
      if (this.life <= 0) {
        this.img.destroy();
        return false;
      }
      this.img.x += this.vx * (dt / sub);
      this.img.y += this.vy * (dt / sub);
      ctx.grid.queryCircle(this.img.x, this.img.y, W_FROST.hitR, queryOut);
      if (queryOut.length > 0) {
        this.onHit(this.img.x, this.img.y);
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

export class FrostWeapon extends Weapon {
  private shards: Icicle[] = [];
  private frags: Frag[] = [];

  protected cooldown(): number {
    return this.evolved ? W_FROST.evoCd : W_FROST.cd[this.level - 1];
  }

  private dmg(): number {
    return W_FROST.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_FROST.evoDmgMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_FROST.evoN : W_FROST.n[this.level - 1];
    const targets = nearestK(ctx, ctx.player.x, ctx.player.y, n, 420);
    const speed = W_FROST.speed * ctx.stats.projSpeed;
    const life = W_FROST.life * ctx.stats.area;
    SFX.swish();
    for (let i = 0; i < n; i++) {
      const tgt = targets[i % Math.max(1, targets.length)];
      const a = tgt
        ? Math.atan2(tgt.y - ctx.player.y, tgt.x - ctx.player.x)
        : Math.atan2(ctx.facing.y, ctx.facing.x) + (i - (n - 1) / 2) * 0.22;
      this.shards.push(new Icicle(ctx, a, speed, life, (x, y) => this.shatter(x, y)));
    }
  }

  private shatter(x: number, y: number): void {
    const ctx = this.ctx;
    const r = W_FROST.shatterR * ctx.stats.area * (this.evolved ? W_FROST.evoShatterMul : 1);
    SFX.hit(1.5);
    ctx.fx.ring(x, y, FROST_COLOR, r / 42, 0.35);
    ctx.fx.burst(x, y, { tex: 'p_star', color: FROST_COLOR, count: 7, speed: 160, life: 0.4, scale: 0.9, spin: true });
    const dmg = this.dmg();
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (let i = 0; i < queryOut.length; i++) {
      const e = queryOut[i];
      const ea = Math.atan2(e.y - y, e.x - x);
      // 直击目标全伤，溅射余敌折损
      const d = Math.hypot(e.x - x, e.y - y);
      const mul = d < W_FROST.hitR + e.radius ? 1 : W_FROST.shatterK;
      ctx.hitEnemy(e, dmg * mul, { kb: 80, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 1.6 });
    }
    if (this.evolved) {
      // 进化「霜华」：不再留减速霜地，改为碎裂成多枚向四周飞散的冰碎片
      const fn = 6;
      const sp = 320 * ctx.stats.projSpeed;
      const a0 = ctx.rng() * Math.PI * 2;
      for (let i = 0; i < fn; i++) {
        const a = a0 + (i / fn) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const img = ctx.scene.add.image(x, y, 'w_icicle').setDepth(1e6).setRotation(a).setScale(0.9);
        this.frags.push({ img, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, hit: new Set() });
      }
    } else {
      // 未进化：留减速霜地
      ctx.addZone({ x, y, r: W_FROST.slowR * ctx.stats.area, dur: W_FROST.slowDur, effect: 'slow', tex: 'w_frost' });
    }
  }

  protected tick(dt: number): void {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      if (!this.shards[i].update(dt)) this.shards.splice(i, 1);
    }
    // 进化冰碎片（直线飞散，命中即碎）
    const ctx = this.ctx;
    const fragDmg = this.dmg() * W_FROST.shatterK;
    for (let i = this.frags.length - 1; i >= 0; i--) {
      const f = this.frags[i];
      f.life -= dt;
      if (f.life <= 0) {
        f.img.destroy();
        this.frags.splice(i, 1);
        continue;
      }
      f.img.x += f.vx * dt;
      f.img.y += f.vy * dt;
      ctx.grid.queryCircle(f.img.x, f.img.y, 12, queryOut);
      let dead = false;
      const sp = Math.hypot(f.vx, f.vy) || 1;
      for (const e of queryOut) {
        if (f.hit.has(e)) continue;
        f.hit.add(e);
        ctx.hitEnemy(e, fragDmg, { kb: 50, kx: f.vx / sp, ky: f.vy / sp, pitch: 1.8 });
        dead = true;
        break;
      }
      if (dead) {
        ctx.fx.burst(f.img.x, f.img.y, { tex: 'p_dot', color: FROST_COLOR, count: 3, speed: 60, life: 0.25, scale: 0.6, alpha: 0.8 });
        f.img.destroy();
        this.frags.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.shards.forEach((s) => s.kill());
    this.frags.forEach((f) => f.img.destroy());
  }
}
