// 16. 喇叭花号手 / 晨光号角（哨塔：种下喇叭花朝最近敌人连射种子；进化双株齐奏更快）
import Phaser from 'phaser';
import { W_BUGLE } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const BUGLE_COLOR = 0x8898d8;

interface SeedShot {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  hit: Set<Enemy>;
}

class Sentry {
  private img: Phaser.GameObjects.Image;
  private t: number;
  private fireT = 0.3;

  constructor(
    private ctx: CombatContext,
    private x: number,
    private y: number,
    dur: number,
    private fireCd: number,
    private onShoot: (x: number, y: number, a: number) => void,
  ) {
    this.t = dur;
    this.img = ctx.scene.add.image(x, y, 'w_bugle').setDepth(900 + y * 0.01).setAlpha(0).setScale(0.5);
    ctx.scene.tweens.add({ targets: this.img, alpha: 1, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
    ctx.fx.ring(x, y, BUGLE_COLOR, 1.6, 0.4);
  }

  update(dt: number): boolean {
    const ctx = this.ctx;
    this.t -= dt;
    if (this.t <= 0) {
      const img = this.img;
      ctx.scene.tweens.add({ targets: img, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 220, onComplete: () => img.destroy() });
      return false;
    }
    this.fireT -= dt;
    if (this.fireT <= 0) {
      const near = ctx.enemies.nearest(this.x, this.y, W_BUGLE.range * ctx.stats.area);
      if (near) {
        this.fireT = this.fireCd;
        const a = Math.atan2(near.y - this.y, near.x - this.x);
        // 吹号弹一弹（朝向目标侧倾）
        this.img.setRotation(Math.sin(a) * 0.15 + (Math.cos(a) < 0 ? -0.12 : 0.12));
        this.img.setScale(1.15);
        ctx.scene.tweens.add({ targets: this.img, scaleX: 1, scaleY: 1, duration: 150 });
        this.onShoot(this.x, this.y - 14, a);
      } else {
        this.fireT = 0.18; // 没目标时频繁重查
      }
    }
    return true;
  }

  kill(): void {
    this.img.destroy();
  }
}

export class BugleWeapon extends Weapon {
  private sentries: Sentry[] = [];
  private shots: SeedShot[] = [];

  protected cooldown(): number {
    return this.evolved ? W_BUGLE.evoCd : W_BUGLE.cd[this.level - 1];
  }

  private dmg(): number {
    return W_BUGLE.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_BUGLE.evoDmgMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    SFX.chime();
    const n = this.evolved ? W_BUGLE.evoCount : 1;
    const dur = this.evolved ? W_BUGLE.evoDur : W_BUGLE.dur;
    const fireCd = this.evolved ? W_BUGLE.evoFireCd : W_BUGLE.fireCd;
    const baseA = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : W_BUGLE.plantGap / 2;
      const a = baseA + (i / n) * Math.PI * 2;
      this.sentries.push(new Sentry(
        ctx,
        ctx.player.x + Math.cos(a) * off,
        ctx.player.y + Math.sin(a) * off,
        dur, fireCd,
        (x, y, sa) => this.shoot(x, y, sa),
      ));
    }
  }

  private shoot(x: number, y: number, a: number): void {
    const ctx = this.ctx;
    const speed = W_BUGLE.bulletSpeed * ctx.stats.projSpeed;
    const img = ctx.scene.add.image(x, y, 'w_bugleseed').setDepth(1e6).setRotation(a + Math.PI / 2);
    this.shots.push({ img, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1.1, hit: new Set() });
  }

  protected tick(dt: number): void {
    for (let i = this.sentries.length - 1; i >= 0; i--) {
      if (!this.sentries[i].update(dt)) this.sentries.splice(i, 1);
    }
    // 种子弹：倍速穿隧细化（effDt > 1/30 分两半步）
    const sub = dt > 1 / 30 ? 2 : 1;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      let alive = true;
      for (let s = 0; s < sub && alive; s++) {
        alive = this.stepShot(this.shots[i], dt / sub);
      }
      if (!alive) {
        this.shots[i].img.destroy();
        this.shots.splice(i, 1);
      }
    }
  }

  private stepShot(b: SeedShot, dt: number): boolean {
    const ctx = this.ctx;
    b.life -= dt;
    if (b.life <= 0) return false;
    b.img.x += b.vx * dt;
    b.img.y += b.vy * dt;
    ctx.grid.queryCircle(b.img.x, b.img.y, 11, queryOut);
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const pierce = this.evolved ? 2 : 1;
    for (const e of queryOut) {
      if (b.hit.has(e)) continue;
      b.hit.add(e);
      ctx.hitEnemy(e, this.dmg(), { kb: W_BUGLE.kb, kx: b.vx / sp, ky: b.vy / sp, pitch: 1.3 });
      if (b.hit.size >= pierce) {
        ctx.fx.burst(b.img.x, b.img.y, { tex: 'p_dot', color: BUGLE_COLOR, count: 3, speed: 60, life: 0.25, scale: 0.6, alpha: 0.8 });
        return false;
      }
    }
    return true;
  }

  destroy(): void {
    this.sentries.forEach((s) => s.kill());
    this.shots.forEach((b) => b.img.destroy());
  }
}
