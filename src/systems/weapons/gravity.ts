// 27. 月华引 / 食蚀井（定点漩涡吸拢敌人并持续灼蚀，消散时猛然内爆；进化吸更广爆更狠）
import Phaser from 'phaser';
import { W_GRAVITY } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import { shakeCam } from '../../gfx/shake';
import type { CombatContext } from '../context';
import { Weapon, queryOut } from './base';

const VOID_COLOR = 0x9878d0;

class Vortex {
  private img: Phaser.GameObjects.Image;
  private t: number;
  private tickT = 0;

  constructor(
    private ctx: CombatContext,
    private x: number,
    private y: number,
    private r: number,
    dur: number,
    private dmg: number,
    private implodeK: number,
  ) {
    this.t = dur;
    this.img = ctx.scene.add.image(x, y, 'w_void').setDepth(8).setAlpha(0).setScale((r * 2) / 96 * 0.6);
    ctx.scene.tweens.add({ targets: this.img, alpha: 0.85, scaleX: (r * 2) / 96, scaleY: (r * 2) / 96, duration: 220, ease: 'Back.easeOut' });
  }

  update(dt: number): boolean {
    const ctx = this.ctx;
    this.t -= dt;
    this.img.rotation += dt * 3.2;
    if (this.t <= 0) {
      this.implode();
      this.img.destroy();
      return false;
    }
    // 吸拢 + 旋入光点
    ctx.grid.queryCircle(this.x, this.y, this.r, queryOut);
    const pull = W_GRAVITY.pull * dt;
    for (const e of queryOut) {
      const dx = this.x - e.x;
      const dy = this.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = Math.min(d, pull * (0.4 + (1 - d / this.r) * 0.8));
      e.x += (dx / d) * step;
      e.y += (dy / d) * step;
    }
    if (ctx.run.frame % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      ctx.fx.burst(this.x + Math.cos(a) * this.r * 0.9, this.y + Math.sin(a) * this.r * 0.9,
        { tex: 'p_dot', color: VOID_COLOR, count: 1, speed: 0, life: 0.3, scale: 0.7, alpha: 0.8 });
    }
    // 持续灼蚀
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = W_GRAVITY.tick;
      ctx.grid.queryCircle(this.x, this.y, this.r, queryOut);
      for (const e of queryOut) ctx.hitEnemy(e, this.dmg, { kb: 0, kx: 0, ky: 0, pitch: 1.3 });
    }
    return true;
  }

  private implode(): void {
    const ctx = this.ctx;
    SFX.boom(true);
    shakeCam(ctx.scene, 140, 0.005);
    ctx.fx.ring(this.x, this.y, VOID_COLOR, this.r / 42, 0.45);
    ctx.fx.burst(this.x, this.y, { tex: 'p_star', color: VOID_COLOR, count: 16, speed: 220, life: 0.5, scale: 1.0, spin: true });
    ctx.grid.queryCircle(this.x, this.y, this.r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - this.y, e.x - this.x);
      ctx.hitEnemy(e, this.dmg * this.implodeK, { kb: 260, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.7 });
    }
  }

  kill(): void {
    this.img.destroy();
  }
}

export class GravityWeapon extends Weapon {
  private vortices: Vortex[] = [];

  protected cooldown(): number {
    return this.evolved ? W_GRAVITY.evoCd : W_GRAVITY.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, W_GRAVITY.range);
    let x: number;
    let y: number;
    if (near) {
      x = near.x;
      y = near.y;
    } else {
      const a = Math.atan2(ctx.facing.y, ctx.facing.x);
      x = ctx.player.x + Math.cos(a) * 160;
      y = ctx.player.y + Math.sin(a) * 160;
    }
    const dmg = W_GRAVITY.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_GRAVITY.evoDmgMul : 1);
    const r = W_GRAVITY.pullR * ctx.stats.area * (this.evolved ? W_GRAVITY.evoPullRMul : 1);
    const implodeK = this.evolved ? W_GRAVITY.evoImplodeK : W_GRAVITY.implodeK;
    SFX.chime();
    this.vortices.push(new Vortex(ctx, x, y, r, W_GRAVITY.dur, dmg, implodeK));
  }

  protected tick(dt: number): void {
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      if (!this.vortices[i].update(dt)) this.vortices.splice(i, 1);
    }
  }

  destroy(): void {
    this.vortices.forEach((v) => v.kill());
  }
}
