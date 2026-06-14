// 24. 晨星杖 / 圣星杖（自动锁定最近敌人，高频射出单发星弹；进化近无冷却 + 穿透）
import Phaser from 'phaser';
import { W_WAND } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import type { Enemy } from '../EnemySystem';
import { nearestK, Weapon, queryOut } from './base';

const WAND_COLOR = 0xffe0a0;

interface Bolt {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  hit: Set<Enemy>;
}

export class WandWeapon extends Weapon {
  private bolts: Bolt[] = [];

  protected cooldown(): number {
    return this.evolved ? W_WAND.evoCd : W_WAND.cd[this.level - 1];
  }

  private dmg(): number {
    return W_WAND.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_WAND.evoDmgMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_WAND.evoN : W_WAND.n[this.level - 1];
    const targets = nearestK(ctx, ctx.player.x, ctx.player.y, n, W_WAND.range * ctx.stats.area);
    if (targets.length === 0) {
      this.cdT = 0.25;
      return;
    }
    SFX.hit(1.9);
    const speed = W_WAND.speed * ctx.stats.projSpeed;
    ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_star', color: WAND_COLOR, count: this.evolved ? 8 : 4, speed: this.evolved ? 110 : 70, life: 0.28, scale: this.evolved ? 0.95 : 0.7, alpha: 0.9, spin: true });
    const sigil = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'p_ring')
      .setDepth(1e6 - 1)
      .setTint(WAND_COLOR)
      .setScale(this.evolved ? 1.15 : 0.78)
      .setAlpha(this.evolved ? 0.72 : 0.48);
    ctx.scene.tweens.add({
      targets: sigil,
      scale: this.evolved ? 1.55 : 1.05,
      rotation: this.evolved ? Math.PI * 0.35 : Math.PI * 0.18,
      alpha: 0,
      duration: this.evolved ? 320 : 220,
      ease: 'Cubic.easeOut',
      onComplete: () => sigil.destroy(),
    });
    for (let i = 0; i < n; i++) {
      const tgt = targets[i % targets.length];
      const a = Math.atan2(tgt.y - ctx.player.y, tgt.x - ctx.player.x) + (i >= targets.length ? (Math.random() - 0.5) * 0.3 : 0);
      const img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_wandbolt').setDepth(1e6).setRotation(a).setScale(1.35);
      const lock = ctx.scene.add.graphics().setDepth(1e6 - 2);
      lock.lineStyle(this.evolved ? 3 : 2, WAND_COLOR, this.evolved ? 0.32 : 0.2);
      lock.lineBetween(ctx.player.x, ctx.player.y, tgt.x, tgt.y);
      ctx.scene.tweens.add({ targets: lock, alpha: 0, duration: 160, onComplete: () => lock.destroy() });
      this.bolts.push({ img, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: W_WAND.life * ctx.stats.area, hit: new Set() });
    }
  }

  protected tick(dt: number): void {
    const sub = dt > 1 / 30 ? 2 : 1;
    const pierce = this.evolved ? W_WAND.evoPierce : W_WAND.pierce;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      let alive = true;
      for (let s = 0; s < sub && alive; s++) alive = this.step(b, dt / sub, pierce);
      if (!alive) {
        b.img.destroy();
        this.bolts.splice(i, 1);
      }
    }
  }

  private step(b: Bolt, dt: number, pierce: number): boolean {
    const ctx = this.ctx;
    b.life -= dt;
    if (b.life <= 0) return false;
    b.img.x += b.vx * dt;
    b.img.y += b.vy * dt;
    b.img.rotation += dt * 10;
    if (ctx.run.frame % 2 === 0) {
      ctx.fx.burst(b.img.x, b.img.y, { tex: 'p_star', color: WAND_COLOR, count: 1, speed: 10, life: 0.26, scale: 0.62, alpha: 0.72, spin: true });
    }
    const sp = Math.hypot(b.vx, b.vy) || 1;
    ctx.grid.queryCircle(b.img.x, b.img.y, W_WAND.hitR, queryOut);
    for (const e of queryOut) {
      if (b.hit.has(e)) continue;
      b.hit.add(e);
      ctx.hitEnemy(e, this.dmg(), { kb: 100, kx: b.vx / sp, ky: b.vy / sp, pitch: 1.7 });
      if (b.hit.size >= pierce) {
        ctx.fx.ring(b.img.x, b.img.y, WAND_COLOR, 0.8, 0.22);
        ctx.fx.burst(b.img.x, b.img.y, { tex: 'p_star', color: WAND_COLOR, count: 5, speed: 90, life: 0.28, scale: 0.75, alpha: 0.9, spin: true });
        return false;
      }
    }
    return true;
  }

  destroy(): void {
    this.bolts.forEach((b) => b.img.destroy());
  }
}
