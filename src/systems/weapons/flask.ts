// 20. 朝露瓶 / 朝露潮（抛瓶碎裂，留持续灼蚀的露洼 DoT 池；进化池更大更久漫地）
import Phaser from 'phaser';
import { W_FLASK } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { nearestK, Weapon, queryOut } from './base';

const DEW_COLOR = 0x88d0c8;

class Flask {
  private img: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Image;
  private t = 0;
  private sx: number;
  private sy: number;
  private trailT = 0;

  constructor(
    private ctx: CombatContext,
    private tx: number,
    private ty: number,
    private flyT: number,
    private onLand: (x: number, y: number) => void,
  ) {
    this.sx = ctx.player.x;
    this.sy = ctx.player.y;
    this.shadow = ctx.scene.add.image(tx, ty, 'shadow').setDepth(6).setAlpha(0.5).setScale(0.8, 0.5);
    this.marker = ctx.scene.add.image(tx, ty, 'p_ring').setDepth(7).setTint(DEW_COLOR).setAlpha(0.3).setScale(0.28);
    this.img = ctx.scene.add.image(this.sx, this.sy, 'w_flaskbottle').setDepth(1e6 + 2).setScale(1.12);
  }

  update(dt: number): boolean {
    this.t += dt;
    const k = Math.min(1, this.t / this.flyT);
    const lift = Math.sin(k * Math.PI) * W_FLASK.arcH;
    this.img.x = this.sx + (this.tx - this.sx) * k;
    this.img.y = this.sy + (this.ty - this.sy) * k - lift;
    this.img.rotation += dt * 6;
    this.marker.setScale(0.28 + Math.sin(this.t * 11) * 0.035).setAlpha(0.2 + Math.sin(this.t * 11) * 0.08);
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.055;
      this.ctx.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: DEW_COLOR, count: 1, speed: 18, life: 0.28, scale: 0.46, alpha: 0.62 });
    }
    if (k >= 1) {
      this.kill();
      this.onLand(this.tx, this.ty);
      return false;
    }
    return true;
  }

  kill(): void {
    this.img.destroy();
    this.shadow.destroy();
    this.marker.destroy();
  }
}

export class FlaskWeapon extends Weapon {
  private flasks: Flask[] = [];

  protected cooldown(): number {
    return this.evolved ? W_FLASK.evoCd : W_FLASK.cd[this.level - 1];
  }

  private poolDps(): number {
    return W_FLASK.poolDps[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_FLASK.evoDmgMul : 1);
  }

  private poolR(): number {
    return W_FLASK.poolR * this.ctx.stats.area * (this.evolved ? W_FLASK.evoPoolRMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = W_FLASK.n[this.level - 1];
    const targets = nearestK(ctx, ctx.player.x, ctx.player.y, n, W_FLASK.range);
    const flyT = W_FLASK.flyT / Math.max(0.6, ctx.stats.projSpeed);
    SFX.throwSfx();
    for (let i = 0; i < n; i++) {
      const tgt = targets[i % Math.max(1, targets.length)];
      let tx: number;
      let ty: number;
      if (tgt) {
        tx = tgt.x + (Math.random() - 0.5) * 50;
        ty = tgt.y + (Math.random() - 0.5) * 50;
      } else {
        const a = Math.atan2(ctx.facing.y, ctx.facing.x) + (Math.random() - 0.5) * 0.8;
        const d = 150 + Math.random() * 130;
        tx = ctx.player.x + Math.cos(a) * d;
        ty = ctx.player.y + Math.sin(a) * d;
      }
      this.flasks.push(new Flask(ctx, tx, ty, flyT * (0.92 + i * 0.08), (x, y) => this.shatter(x, y)));
    }
  }

  private shatter(x: number, y: number): void {
    const ctx = this.ctx;
    if (!ctx.run.running) return;
    const r = this.poolR();
    const dps = this.poolDps();
    SFX.splash();
    ctx.fx.ring(x, y, DEW_COLOR, r / 42, 0.4);
    ctx.fx.ring(x, y, 0xe8fff6, (r * 0.66) / 42, 0.26);
    ctx.fx.burst(x, y, { tex: 'p_dot', color: DEW_COLOR, count: 10, speed: 165, life: 0.44, scale: 0.86, grav: 120 });
    ctx.fx.burst(x, y, { tex: 'p_star', color: 0xe8fff6, count: 5, speed: 94, life: 0.28, scale: 0.58, alpha: 0.8, spin: true });
    // 落地即时轻伤
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) ctx.hitEnemy(e, dps * W_FLASK.impactK, { kb: 60, kx: 0, ky: 0, pitch: 1.0 });
    // 持续灼蚀露洼
    ctx.addZone({
      x, y, r, dur: this.evolved ? W_FLASK.evoPoolDur : W_FLASK.poolDur,
      effect: 'burn', dps, tex: 'w_dewpool',
    });
  }

  protected tick(dt: number): void {
    for (let i = this.flasks.length - 1; i >= 0; i--) {
      if (!this.flasks[i].update(dt)) this.flasks.splice(i, 1);
    }
  }

  destroy(): void {
    this.flasks.forEach((f) => f.kill());
  }
}
