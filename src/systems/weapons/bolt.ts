// 21. 落晖 / 万道霞光（天降晨光柱随机劈落场上数名敌人 + 小范围炸开；进化光柱更多更广）
import { W_BOLT } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import { shakeCam } from '../../gfx/shake';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

const BOLT_COLOR = 0xf8e0a0;

export class BoltWeapon extends Weapon {
  protected cooldown(): number {
    return this.evolved ? W_BOLT.evoCd : W_BOLT.cd[this.level - 1];
  }

  private dmg(): number {
    return W_BOLT.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_BOLT.evoDmgMul : 1);
  }

  private blastR(): number {
    return W_BOLT.blastR * this.ctx.stats.area * (this.evolved ? W_BOLT.evoBlastMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const range = W_BOLT.range * ctx.stats.area;
    const r2 = range * range;
    // 收集玩家周围在场敌人，随机抽 n 个劈
    const cands: Enemy[] = [];
    for (const e of ctx.enemies.actives) {
      if (!e.active || e.dying) continue;
      const dx = e.x - ctx.player.x;
      const dy = e.y - ctx.player.y;
      if (dx * dx + dy * dy < r2) cands.push(e);
    }
    if (cands.length === 0) {
      this.cdT = 0.3;
      return;
    }
    const n = this.evolved ? W_BOLT.evoN : W_BOLT.n[this.level - 1];
    SFX.beam();
    const picks = Math.min(n, cands.length);
    for (let i = 0; i < picks; i++) {
      const idx = Math.floor(ctx.rng() * cands.length);
      const target = cands.splice(idx, 1)[0];
      // 雷点轻微偏移到目标附近（带一点散布）
      const tx = target.x + (Math.random() - 0.5) * 24;
      const ty = target.y + (Math.random() - 0.5) * 24;
      ctx.scene.time.delayedCall(i * 55, () => {
        if (!ctx.run.running) return;
        this.strike(tx, ty);
      });
    }
  }

  /** 单道晨光柱：自天而降的发光光柱（上窄下宽）+ 落点小爆 */
  private strike(x: number, y: number): void {
    const ctx = this.ctx;
    const topY = y - 240;
    const gr = ctx.scene.add.graphics().setDepth(1e6 + 3);
    // 光柱：上窄下宽的发光梯形
    const beam = (halfTop: number, halfBot: number, color: number, alpha: number) => {
      gr.fillStyle(color, alpha);
      gr.beginPath();
      gr.moveTo(x - halfTop, topY);
      gr.lineTo(x + halfTop, topY);
      gr.lineTo(x + halfBot, y);
      gr.lineTo(x - halfBot, y);
      gr.closePath();
      gr.fillPath();
    };
    beam(5, 17, BOLT_COLOR, 0.35);
    beam(1.5, 5, 0xfffbe0, 0.92);
    ctx.scene.tweens.add({ targets: gr, alpha: 0, duration: 230, ease: 'Cubic.easeIn', onComplete: () => gr.destroy() });

    const r = this.blastR();
    ctx.fx.ring(x, y, BOLT_COLOR, r / 42, 0.35);
    ctx.fx.burst(x, y, { tex: 'p_star', color: 0xfff0c0, count: 6, speed: 150, life: 0.35, scale: 0.9, spin: true });
    shakeCam(ctx.scene, 50, 0.0018);
    ctx.grid.queryCircle(x, y, r, queryOut);
    const dmg = this.dmg();
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      ctx.hitEnemy(e, dmg, { kb: W_BOLT.kb, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 1.5 });
    }
  }
}
