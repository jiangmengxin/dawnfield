// 5. 跃光 / 雷暴
import { W_SPARK } from '../../content/weapons';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { Enemy } from '../EnemySystem';
import { Weapon, queryOut } from './base';

export class SparkWeapon extends Weapon {
  protected cooldown(): number {
    return this.evolved ? W_SPARK.evoCd : W_SPARK.cd[this.level - 1];
  }

  protected fire(): void {
    const ctx = this.ctx;
    const first = ctx.enemies.nearest(ctx.player.x, ctx.player.y, W_SPARK.range);
    if (!first) {
      this.cdT = 0.3;
      return;
    }
    SFX.zap();
    const links = this.evolved ? W_SPARK.evoLinks : W_SPARK.links[this.level - 1];
    const decay = this.evolved ? 0.9 : 0.93;
    const baseDmg = W_SPARK.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_SPARK.evoDmgMul : 1);
    const visited = new Set<Enemy>();
    const points: Array<[number, number]> = [[ctx.player.x, ctx.player.y]];
    let cur: Enemy | null = first;
    let i = 0;
    while (cur && i < links) {
      visited.add(cur);
      points.push([cur.x, cur.y]);
      const dmg = baseDmg * Math.pow(decay, i);
      ctx.hitEnemy(cur, dmg, { kb: 30, kx: 0, ky: 0, pitch: 1.8 });
      ctx.fx.burst(cur.x, cur.y, { tex: 'p_star', color: PAL.spark, count: 5, speed: 95, life: 0.32, scale: 1.05, spin: true });
      ctx.fx.burst(cur.x, cur.y, { tex: 'p_dot', color: 0xffffff, count: 2, speed: 50, life: 0.2, scale: 0.7 });
      if (this.evolved) {
        ctx.grid.queryCircle(cur.x, cur.y, W_SPARK.evoBlastR, queryOut);
        for (const e of queryOut) {
          if (e !== cur && !visited.has(e)) ctx.hitEnemy(e, dmg * W_SPARK.evoBlastK, { kb: 20, kx: 0, ky: 0, pitch: 1.8 });
        }
      }
      let next: Enemy | null = null;
      let bd = W_SPARK.chainRange * W_SPARK.chainRange;
      for (const e of ctx.enemies.actives) {
        if (!e.active || e.dying || visited.has(e)) continue;
        const dx = e.x - cur.x;
        const dy = e.y - cur.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bd) {
          bd = d2;
          next = e;
        }
      }
      cur = next;
      i++;
    }
    this.drawBolt(points);
  }

  private drawBolt(points: Array<[number, number]>): void {
    const ctx = this.ctx;
    const gr = ctx.scene.add.graphics().setDepth(1e6 + 2);
    const drawPath = (width: number, color: number, alpha: number, jitter: number) => {
      gr.lineStyle(width, color, alpha);
      gr.beginPath();
      gr.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        // 两段折线 + 抖动
        const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * jitter;
        const my = (y0 + y1) / 2 + (Math.random() - 0.5) * jitter;
        gr.lineTo(mx, my);
        gr.lineTo(x1, y1);
      }
      gr.strokePath();
    };
    drawPath(16, PAL.spark, 0.18, 28); // 柔光外晕，增可见性
    drawPath(9, PAL.sparkDeep, 0.5, 26);
    drawPath(3.5, 0xffffff, 0.98, 26);
    ctx.scene.tweens.add({ targets: gr, alpha: 0, duration: 260, ease: 'Cubic.easeIn', onComplete: () => gr.destroy() });
  }
}
