// 32. 卷叶风 / 落叶旋（唤起游走旋风柱反复卷击敌人并旋舞击退；进化更大更久卷更远）
import Phaser from 'phaser';
import { W_TORNADO } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const TORNADO_COLOR = 0xa8c4a0;

class Twister {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private t: number;
  private tickT = 0;
  private wanderT = 0;
  private hitMap = new Map<Enemy, number>();

  constructor(private ctx: CombatContext, x: number, y: number, private r: number, dur: number, private dmg: number) {
    this.t = dur;
    const a = Math.random() * Math.PI * 2;
    this.vx = Math.cos(a) * W_TORNADO.speed;
    this.vy = Math.sin(a) * W_TORNADO.speed;
    this.img = ctx.scene.add.image(x, y, 'w_tornado').setDepth(1e6).setAlpha(0).setScale((r * 2) / 80 * 0.5);
    ctx.scene.tweens.add({ targets: this.img, alpha: 0.9, scaleX: (r * 2) / 80, scaleY: (r * 2) / 80, duration: 240, ease: 'Back.easeOut' });
  }

  update(dt: number, now: number): boolean {
    const ctx = this.ctx;
    this.t -= dt;
    this.img.rotation += dt * 9;
    if (this.t <= 0) {
      const img = this.img;
      ctx.scene.tweens.add({ targets: img, alpha: 0, scaleX: img.scaleX * 0.5, scaleY: img.scaleY * 0.5, duration: 220, onComplete: () => img.destroy() });
      return false;
    }
    // 游走（偶尔改向，撞屏边折回靠速度自然漂移）
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 0.5 + Math.random() * 0.5;
      const sp = W_TORNADO.speed;
      const a = Math.atan2(this.vy, this.vx) + (Math.random() - 0.5) * 1.4;
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp;
    }
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    // 卷击 + 旋舞击退
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = W_TORNADO.tick;
      ctx.grid.queryCircle(this.img.x, this.img.y, this.r, queryOut);
      for (const e of queryOut) {
        const last = this.hitMap.get(e) ?? -9;
        if (now - last < W_TORNADO.tick * 0.9) continue;
        this.hitMap.set(e, now);
        const dx = e.x - this.img.x;
        const dy = e.y - this.img.y;
        const d = Math.hypot(dx, dy) || 1;
        // 切向旋舞 + 轻微外抛
        const tx = -dy / d;
        const ty = dx / d;
        ctx.hitEnemy(e, this.dmg, { kb: W_TORNADO.kb, kx: tx * 0.8 + (dx / d) * 0.2, ky: ty * 0.8 + (dy / d) * 0.2, pitch: 1.3 });
      }
      if (ctx.run.frame % 2 === 0) {
        ctx.fx.burst(this.img.x + (Math.random() - 0.5) * this.r, this.img.y + (Math.random() - 0.5) * this.r,
          { tex: 'p_petal', color: TORNADO_COLOR, count: 1, speed: 60, life: 0.4, scale: 0.7, spin: true, alpha: 0.8 });
      }
    }
    if (ctx.run.frame % 300 === 0) {
      for (const [e, t0] of this.hitMap) if (now - t0 > 3) this.hitMap.delete(e);
    }
    return true;
  }

  kill(): void {
    this.img.destroy();
  }
}

export class TornadoWeapon extends Weapon {
  private twisters: Twister[] = [];

  protected cooldown(): number {
    return this.evolved ? W_TORNADO.evoCd : W_TORNADO.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const near = ctx.enemies.nearest(ctx.player.x, ctx.player.y, 320);
    const x = near ? near.x : ctx.player.x + (Math.random() - 0.5) * 160;
    const y = near ? near.y : ctx.player.y + (Math.random() - 0.5) * 160;
    const dmg = W_TORNADO.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_TORNADO.evoDmgMul : 1);
    const r = W_TORNADO.r * ctx.stats.area * (this.evolved ? W_TORNADO.evoRMul : 1);
    const dur = this.evolved ? W_TORNADO.evoDur : W_TORNADO.dur;
    SFX.windGust();
    this.twisters.push(new Twister(ctx, x, y, r, dur, dmg));
  }

  protected tick(dt: number): void {
    const now = this.ctx.run.elapsed;
    for (let i = this.twisters.length - 1; i >= 0; i--) {
      if (!this.twisters[i].update(dt, now)) this.twisters.splice(i, 1);
    }
  }

  destroy(): void {
    this.twisters.forEach((t) => t.kill());
  }
}
