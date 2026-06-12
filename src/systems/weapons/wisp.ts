// 15. 流萤珠 / 萤光长河（追踪：放出转向追敌的小萤光，命中即灭；进化更多更快可穿透）
import Phaser from 'phaser';
import { W_WISP } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const WISP_COLOR = 0x9adcc0;

class Mote {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life: number;
  private trailT = 0;
  private hit = new Set<Enemy>();

  constructor(
    private ctx: CombatContext,
    a: number,
    speed: number,
    life: number,
    private dmg: number,
    private turn: number,
    private pierce: number,
  ) {
    this.img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_wisp').setDepth(1e6).setScale(1);
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.life = life;
  }

  /** 倍速穿隧细化：effDt > 1/30 时分两半步推进+判定 */
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
      ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: WISP_COLOR, count: 3, speed: 30, life: 0.3, scale: 0.6, alpha: 0.7 });
      this.kill();
      return false;
    }
    // 转向追踪最近敌人（保持速率，改方向）
    const near = ctx.enemies.nearest(this.img.x, this.img.y, W_WISP.seek);
    const sp = Math.hypot(this.vx, this.vy) || 1;
    if (near) {
      const dx = near.x - this.img.x;
      const dy = near.y - this.img.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vx += (dx / d) * this.turn * dt;
      this.vy += (dy / d) * this.turn * dt;
      const sp2 = Math.hypot(this.vx, this.vy) || 1;
      this.vx = (this.vx / sp2) * sp;
      this.vy = (this.vy / sp2) * sp;
    }
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.img.setAlpha(Math.min(1, this.life * 3) * (0.8 + Math.sin(this.life * 18) * 0.2));
    // 萤光尾迹
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.05;
      ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: WISP_COLOR, count: 1, speed: 8, life: 0.3, scale: 0.5, alpha: 0.6 });
    }

    ctx.grid.queryCircle(this.img.x, this.img.y, 12, queryOut);
    for (const e of queryOut) {
      if (this.hit.has(e)) continue;
      this.hit.add(e);
      ctx.hitEnemy(e, this.dmg, { kb: 70, kx: this.vx / sp, ky: this.vy / sp, pitch: 1.5 });
      if (this.hit.size >= this.pierce) {
        ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_star', color: WISP_COLOR, count: 4, speed: 70, life: 0.3, scale: 0.7, alpha: 0.9 });
        this.kill();
        return false;
      }
    }
    return true;
  }

  kill(): void {
    this.img.destroy();
  }
}

export class WispWeapon extends Weapon {
  private motes: Mote[] = [];

  protected cooldown(): number {
    return this.evolved ? W_WISP.evoCd : W_WISP.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_WISP.evoN : W_WISP.n[this.level - 1];
    const dmg = W_WISP.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_WISP.evoDmgMul : 1);
    const speed = W_WISP.speed * ctx.stats.projSpeed;
    const life = W_WISP.life * ctx.stats.area;
    const turn = this.evolved ? W_WISP.evoTurn : W_WISP.turn;
    const pierce = this.evolved ? W_WISP.evoPierce : 1;
    SFX.throwSfx();
    // 从身侧扇形飘出，随后各自转向追敌
    const a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      this.motes.push(new Mote(ctx, a, speed * (0.9 + Math.random() * 0.2), life, dmg, turn, pierce));
    }
  }

  protected tick(dt: number): void {
    for (let i = this.motes.length - 1; i >= 0; i--) {
      if (!this.motes[i].update(dt)) this.motes.splice(i, 1);
    }
  }

  destroy(): void {
    this.motes.forEach((m) => m.kill());
  }
}
