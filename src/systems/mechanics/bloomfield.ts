// meadow 花圃育成（M18 核心）：场上冒出花苞，玩家在旁停留催熟→绽放炸出大团 XP + 治疗；
// 敌人踩近会践踏摧毁。策略轴：守点 vs 风筝——要收益就得守住一块地清场护苗。
// 首图教学友好：first 较晚（前期纯净），花苞数量少、催熟快。
import type { MechanicSpec } from '../../content/maps';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { queryOut } from '../weapons/base';
import { aroundPlayer, Mechanic, Patch } from './types';

const MEADOW_BLOOM = 0xf6c2d8; // 花苞粉
const MEADOW_CORE = 0xf7dd8a; // 花心金

export class BloomfieldMechanic implements Mechanic {
  private t: number;
  // patch.tick 复用为催熟进度 grow（0..growT）；patch.t 为剩余寿命（未催熟自萎）
  private buds: Patch[] = [];
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'bloomfield' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    // 补充花苞（维持场上 <= maxAlive）
    this.t -= dt;
    if (this.t <= 0 && this.buds.length < spec.maxAlive) {
      this.t = spec.interval;
      const [x, y] = aroundPlayer(ctx, 130, 300);
      const img = ctx.scene.add.image(x, y, 'mz_bud').setDepth(6).setAlpha(0).setScale(0.6);
      img.setDisplaySize(spec.r * 1.2, spec.r * 1.2);
      ctx.scene.tweens.add({ targets: img, alpha: 1, scale: 0.6, duration: 300 });
      this.buds.push({ img, x, y, r: spec.r, t: 30, tick: 0 });
      ctx.fx.ring(x, y, MEADOW_BLOOM, 1.8, 0.5);
    }

    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.buds.length - 1; i >= 0; i--) {
      const b = this.buds[i];
      b.t -= dt;
      const pd = (px - b.x) ** 2 + (py - b.y) ** 2;
      // 敌人践踏（核心区内任一敌人即摧毁；给玩家清场护苗的压力）
      ctx.grid.queryCircle(b.x, b.y, b.r * 0.55, queryOut);
      if (queryOut.length > 0) {
        ctx.fx.burst(b.x, b.y, { tex: 'p_dot', color: PAL.ink, count: 5, speed: 80, life: 0.3, scale: 0.5, alpha: 0.6 });
        this.removeBud(i);
        continue;
      }
      // 玩家在旁催熟（在内 +dt，离开缓慢回落，挂机无效但短暂离开不全废）
      if (pd < b.r * b.r) {
        b.tick += dt;
        if (Math.random() < dt * 6) {
          ctx.fx.burst(b.x + (Math.random() - 0.5) * b.r, b.y + (Math.random() - 0.5) * b.r, { tex: 'p_dot', color: MEADOW_BLOOM, count: 1, speed: 24, life: 0.5, scale: 0.6, alpha: 0.8 });
        }
      } else {
        b.tick = Math.max(0, b.tick - dt * 0.5);
      }
      // 催熟进度视觉：长大 + 发亮
      const k = Math.min(1, b.tick / spec.growT);
      b.img.setScale(0.6 + k * 0.5).setAlpha(0.7 + k * 0.3);
      if (b.tick >= spec.growT) {
        this.bloom(b);
        this.buds.splice(i, 1);
        continue;
      }
      if (b.t <= 0) this.removeBud(i); // 超时未催熟自萎
    }
  }

  /** 绽放：炸出大团 XP + 治疗 + 满屏花瓣 */
  private bloom(b: Patch): void {
    const ctx = this.ctx;
    ctx.spawnGem(b.x, b.y, this.spec.xp);
    ctx.run.heal(this.spec.heal);
    ctx.fx.ring(b.x, b.y, MEADOW_CORE, 4, 0.6);
    ctx.fx.ring(b.x, b.y, MEADOW_BLOOM, 5.5, 0.8);
    ctx.fx.burst(b.x, b.y, { tex: 'p_petal', color: MEADOW_BLOOM, count: 18, speed: 200, life: 0.7, scale: 1, spin: true, grav: 120 });
    SFX.heal();
    const img = b.img;
    ctx.scene.tweens.add({ targets: img, scale: 1.4, alpha: 0, duration: 350, onComplete: () => img.destroy() });
  }

  private removeBud(i: number): void {
    const img = this.buds[i].img;
    this.ctx.scene.tweens.add({ targets: img, alpha: 0, scale: 0.4, duration: 250, onComplete: () => img.destroy() });
    this.buds.splice(i, 1);
  }

  destroy(): void {
    this.buds.forEach((b) => b.img.destroy());
    this.buds.length = 0;
  }
}
