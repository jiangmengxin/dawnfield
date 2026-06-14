// 10. 星星环 / 小银河（orbit：周期召出绕身飞旋的小星星，远轨快旋有歇；进化后昼夜不休）
import Phaser from 'phaser';
import { W_STAR } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

export class StarWeapon extends Weapon {
  private stars: Phaser.GameObjects.Image[] = [];
  private activeT = 0;
  private angle = 0;
  private hitMap = new Map<Enemy, number>();

  protected cooldown(): number {
    // 进化后常驻：fire 不再有意义，给个长冷却
    return this.evolved ? 999 : W_STAR.dur + W_STAR.gap[this.level - 1];
  }

  private starCount(): number {
    return W_STAR.count[this.level - 1] + (this.evolved ? W_STAR.evoExtraStars : 0);
  }

  private radius(): number {
    return W_STAR.radius * this.ctx.stats.area * (this.evolved ? W_STAR.evoRadiusMul : 1);
  }

  private dmg(): number {
    return W_STAR.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_STAR.evoDmgMul : 1);
  }

  private ensure(): void {
    const want = this.starCount();
    while (this.stars.length < want) {
      this.stars.push(this.ctx.scene.add.image(0, 0, 'w_orbstar').setDepth(1e6).setVisible(false));
    }
    const scale = this.evolved ? 1.3 : 1;
    for (const s of this.stars) s.setScale(scale);
  }

  protected fire(): void {
    if (this.evolved && this.activeT > 0) return;
    this.ensure();
    this.activeT = this.evolved ? Infinity : W_STAR.dur;
    SFX.throwSfx();
    for (const s of this.stars) s.setVisible(true).setAlpha(0);
    this.ctx.scene.tweens.add({ targets: this.stars, alpha: 1, duration: 250 });
  }

  onEvolve(): void {
    super.onEvolve();
    this.ensure();
    this.activeT = Infinity;
    for (const s of this.stars) s.setVisible(true).setAlpha(1);
    this.ctx.fx.ring(this.ctx.player.x, this.ctx.player.y, PAL.mine, this.radius() / 42, 0.6);
  }

  protected tick(dt: number): void {
    if (this.activeT <= 0) return;
    this.activeT -= dt;
    const ctx = this.ctx;
    const expired = this.activeT <= 0;
    this.angle += dt * W_STAR.spin * ctx.stats.projSpeed;
    const n = this.starCount();
    // 轨道呼吸（吐纳起伏，区别于花瓣环的贴身定轨）
    const r = this.radius() * (1 + Math.sin(this.angle * 1.7) * W_STAR.breathe);
    const now = ctx.run.elapsed;
    for (let i = 0; i < n; i++) {
      const s = this.stars[i];
      if (!s || !s.visible) continue; // 升级瞬间星数可能先于 ensure 增加
      const a = this.angle + (i / n) * Math.PI * 2;
      s.setPosition(ctx.player.x + Math.cos(a) * r, ctx.player.y + Math.sin(a) * r * 0.92);
      s.setRotation(a + Math.PI / 2);
      if (expired) {
        const img = s;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => img.setVisible(false) });
        continue;
      }
      ctx.grid.queryCircle(s.x, s.y, W_STAR.hitR, queryOut);
      for (const e of queryOut) {
        const last = this.hitMap.get(e) ?? -9;
        if (now - last > W_STAR.hitCd) {
          this.hitMap.set(e, now);
          const ea = Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x);
          ctx.hitEnemy(e, this.dmg(), { kb: 200, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 1.5 });
          ctx.fx.burst(s.x, s.y, { tex: 'p_star', color: 0xfff2c0, count: 2, speed: 50, life: 0.3, scale: 0.7, alpha: 0.9 });
        }
      }
    }
    // 清理 hitMap（防泄漏）
    if (ctx.run.frame % 300 === 0) {
      for (const [e, t0] of this.hitMap) if (now - t0 > 3) this.hitMap.delete(e);
    }
  }

  destroy(): void {
    this.stars.forEach((s) => s.destroy());
  }
}
