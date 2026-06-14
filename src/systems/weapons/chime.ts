// 12. 风铃环 / 晨钟（burst：以自身为心荡开的铃音冲击环，波前扫过每敌一击）
import Phaser from 'phaser';
import { W_CHIME } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

class ChimeWave {
  private img: Phaser.GameObjects.Image;
  private r = 8;
  private hit = new Set<Enemy>();
  private glintT = 0.04;

  constructor(
    private ctx: CombatContext,
    private cx: number,
    private cy: number,
    private maxR: number,
    private dmg: number,
    private kb: number,
  ) {
    this.img = ctx.scene.add.image(cx, cy, 'w_chimering').setDepth(1e6 + 1).setAlpha(0.95);
    this.img.setDisplaySize(16, 16);
  }

  update(dt: number): boolean {
    const ctx = this.ctx;
    this.r += W_CHIME.speed * dt;
    const done = this.r >= this.maxR;
    const r = Math.min(this.r, this.maxR);
    this.img.setDisplaySize(r * 2, r * 2);
    this.img.setAlpha(0.95 * (1 - r / this.maxR) + 0.05);
    this.glintT -= dt;
    if (this.glintT <= 0) {
      this.glintT = 0.08;
      for (const off of [-0.45, 0.45]) {
        const a = ctx.run.elapsed * 3.2 + off + r * 0.012;
        ctx.fx.burst(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, {
          tex: 'p_star', color: 0x90ccc0, count: 1, speed: 22, life: 0.28, scale: 0.58, alpha: 0.82, spin: true,
        });
      }
    }
    // 波前扫过判定：圆内未命中过的敌人各吃一击（波速快，无需环带细分）
    ctx.grid.queryCircle(this.cx, this.cy, r, queryOut);
    for (const e of queryOut) {
      if (this.hit.has(e)) continue;
      this.hit.add(e);
      const ea = Math.atan2(e.y - this.cy, e.x - this.cx);
      ctx.hitEnemy(e, this.dmg, { kb: this.kb, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 1.6 });
    }
    if (done) this.kill();
    return !done;
  }

  kill(): void {
    this.img.destroy();
  }
}

export class ChimeWeapon extends Weapon {
  private waves: ChimeWave[] = [];

  protected cooldown(): number {
    return this.evolved ? W_CHIME.evoCd : W_CHIME.cd[this.level - 1];
  }

  private maxR(): number {
    return (this.evolved ? W_CHIME.evoMaxR : W_CHIME.maxR[this.level - 1]) * this.ctx.stats.area;
  }

  private dmg(): number {
    return W_CHIME.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_CHIME.evoDmgMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    SFX.chime();
    this.ring();
    if (this.evolved) {
      // 晨钟连响两记
      ctx.scene.time.delayedCall(W_CHIME.evoSecondDelay * 1000, () => {
        if (!ctx.run.running) return;
        SFX.chime();
        this.ring();
      });
    }
  }

  private ring(): void {
    const ctx = this.ctx;
    ctx.fx.burst(ctx.player.x, ctx.player.y, {
      tex: 'p_star', color: this.evolved ? 0xfff2c0 : 0x90ccc0,
      count: this.evolved ? 8 : 5, speed: 92, life: 0.36, scale: 0.78, alpha: 0.9, spin: true,
    });
    this.waves.push(new ChimeWave(
      ctx, ctx.player.x, ctx.player.y, this.maxR(), this.dmg(),
      this.evolved ? W_CHIME.evoKb : W_CHIME.kb,
    ));
  }

  protected tick(dt: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      if (!this.waves[i].update(dt)) this.waves.splice(i, 1);
    }
  }

  destroy(): void {
    this.waves.forEach((w) => w.kill());
  }
}
