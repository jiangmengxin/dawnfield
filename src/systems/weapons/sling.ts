// 14. 莓果弹弓 / 果酱风暴（炮射：抛物线弹出莓果，落地范围爆炸；进化留黏滞果酱减速区）
import Phaser from 'phaser';
import { W_SLING } from '../../content/weapons';
import { shakeCam } from '../../gfx/shake';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { nearestK, Weapon, queryOut } from './base';

const BERRY_COLOR = 0xd87888;

class Berry {
  private img: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private t = 0;
  private sx: number;
  private sy: number;

  constructor(
    ctx: CombatContext,
    private tx: number,
    private ty: number,
    private flyT: number,
    private onLand: (x: number, y: number) => void,
  ) {
    this.sx = ctx.player.x;
    this.sy = ctx.player.y;
    // 落点预告小影
    this.shadow = ctx.scene.add.image(tx, ty, 'shadow').setDepth(6).setAlpha(0.5).setScale(0.9, 0.55);
    this.img = ctx.scene.add.image(this.sx, this.sy, 'w_berry').setDepth(1e6 + 2).setScale(1);
  }

  /** 抛物线：位置线性插值 + 正弦抬升 + 近大远小 */
  update(dt: number): boolean {
    this.t += dt;
    const k = Math.min(1, this.t / this.flyT);
    const lift = Math.sin(k * Math.PI) * W_SLING.arcH;
    this.img.x = this.sx + (this.tx - this.sx) * k;
    this.img.y = this.sy + (this.ty - this.sy) * k - lift;
    this.img.setScale(1 + Math.sin(k * Math.PI) * 0.55);
    this.img.rotation += dt * 7;
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
  }
}

export class SlingWeapon extends Weapon {
  private berries: Berry[] = [];

  protected cooldown(): number {
    return this.evolved ? W_SLING.evoCd : W_SLING.cd[this.level - 1];
  }

  private dmg(): number {
    return W_SLING.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_SLING.evoDmgMul : 1);
  }

  private blastR(): number {
    return W_SLING.blastR * this.ctx.stats.area * (this.evolved ? W_SLING.evoBlastMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = W_SLING.n[this.level - 1] + (this.evolved ? 1 : 0);
    const targets = nearestK(ctx, ctx.player.x, ctx.player.y, n, W_SLING.range);
    SFX.throwSfx();
    const flyT = W_SLING.flyT / Math.max(0.6, ctx.stats.projSpeed);
    for (let i = 0; i < n; i++) {
      const tgt = targets[i % Math.max(1, targets.length)];
      let tx: number;
      let ty: number;
      if (tgt) {
        // 轻微预判 + 散布
        tx = tgt.x + (Math.random() - 0.5) * 40;
        ty = tgt.y + (Math.random() - 0.5) * 40;
      } else {
        const a = Math.atan2(ctx.facing.y, ctx.facing.x) + (Math.random() - 0.5) * 0.7;
        const d = 160 + Math.random() * 140;
        tx = ctx.player.x + Math.cos(a) * d;
        ty = ctx.player.y + Math.sin(a) * d;
      }
      this.berries.push(new Berry(ctx, tx, ty, flyT * (0.92 + i * 0.1), (x, y) => this.burst(x, y)));
    }
  }

  /** 落地爆炸（进化追加果酱减速区） */
  private burst(x: number, y: number): void {
    const ctx = this.ctx;
    if (!ctx.run.running) return;
    const r = this.blastR();
    SFX.boom();
    shakeCam(ctx.scene, 90, 0.003);
    ctx.fx.ring(x, y, BERRY_COLOR, r / 42, 0.45);
    ctx.fx.burst(x, y, { tex: 'p_dot', color: BERRY_COLOR, count: 10, speed: 170, life: 0.45, scale: 0.9, grav: 160 });
    const dmg = this.dmg();
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      ctx.hitEnemy(e, dmg, { kb: W_SLING.kb, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.85 });
    }
    if (this.evolved) {
      ctx.addZone({ x, y, r: W_SLING.jamR * ctx.stats.area, dur: W_SLING.jamDur, effect: 'slow', tex: 'w_jam' });
    }
  }

  protected tick(dt: number): void {
    for (let i = this.berries.length - 1; i >= 0; i--) {
      if (!this.berries[i].update(dt)) this.berries.splice(i, 1);
    }
  }

  destroy(): void {
    this.berries.forEach((b) => b.kill());
  }
}
