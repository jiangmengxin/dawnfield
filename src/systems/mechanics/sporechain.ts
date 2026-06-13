// grove 孢子连锁（M18 核心）：机制孢子云内死亡的敌人迸发孢子爆，伤及邻近敌人并可连锁（深度上限）。
// 策略轴：聚怪与击杀顺序——把怪群引进云里再收割。springs 治愈泉保留并存。
import type { MechanicSpec } from '../../content/maps';
import { hpScale } from '../../content/enemies';
import { GROVE } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';
import { queryOut } from '../weapons/base';
import { aroundPlayer, effMin, Mechanic, Patch } from './types';

export class SporechainMechanic implements Mechanic {
  private t: number;
  private clouds: Patch[] = [];
  private inBurst = false; // 连锁期间的击杀已由 BFS 处理，守卫防 onEnemyKilled 重入
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'sporechain' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = aroundPlayer(ctx, 110, 300);
        const img = ctx.scene.add.image(x, y, 'p_dot').setDepth(5).setTint(GROVE.spore)
          .setAlpha(0).setScale((spec.r * 2) / 16);
        ctx.scene.tweens.add({ targets: img, alpha: 0.28, duration: 350 });
        this.clouds.push({ img, x, y, r: spec.r, t: spec.dur, tick: 0 });
      }
    }
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.t -= dt;
      c.img.setAlpha(0.2 + Math.sin(ctx.run.elapsed * 3 + i) * 0.08);
      if (c.t <= 0) {
        const img = c.img;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 350, onComplete: () => img.destroy() });
        this.clouds.splice(i, 1);
      }
    }
  }

  onEnemyKilled(e: Enemy): void {
    if (this.inBurst) return;
    if (!this.inAnyCloud(e.x, e.y)) return;
    this.inBurst = true;
    try {
      this.chain(e.x, e.y);
    } finally {
      this.inBurst = false;
    }
  }

  private inAnyCloud(x: number, y: number): boolean {
    for (const c of this.clouds) {
      if ((x - c.x) ** 2 + (y - c.y) ** 2 < c.r * c.r) return true;
    }
    return false;
  }

  /** BFS 连锁爆：逐层向死亡点周围 chainR 内敌人迸发孢子伤，致死的敌人成为下一层爆心 */
  private chain(x0: number, y0: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    const min = effMin(ctx);
    const hit = new Set<Enemy>();
    let frontier: Array<[number, number]> = [[x0, y0]];
    for (let depth = 0; depth < spec.maxDepth && frontier.length > 0; depth++) {
      const next: Array<[number, number]> = [];
      for (const [x, y] of frontier) {
        ctx.fx.ring(x, y, GROVE.spore, spec.chainR / 28, 0.4);
        ctx.fx.burst(x, y, { tex: 'p_dot', color: GROVE.spore, count: 6, speed: 150, life: 0.4, scale: 0.7, alpha: 0.85 });
        ctx.grid.queryCircle(x, y, spec.chainR, queryOut);
        const found = queryOut.slice(); // 复制：后续 queryCircle 会覆盖共享缓冲
        for (const en of found) {
          if (hit.has(en) || !en.active || en.dying) continue;
          hit.add(en);
          const ea = Math.atan2(en.y - y, en.x - x);
          ctx.hitEnemy(en, spec.edmg * hpScale(min), { noHook: true, kb: 120, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.9 });
          if (!en.active || en.dying || en.hp <= 0) next.push([en.x, en.y]);
        }
      }
      frontier = next;
    }
    SFX.boom();
  }

  destroy(): void {
    this.clouds.forEach((c) => c.img.destroy());
    this.clouds.length = 0;
  }
}
