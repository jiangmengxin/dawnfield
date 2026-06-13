// lavender 花粉积蓄（M18 核心）：站花粉带内每秒积 1 层（上限 maxStacks），每层 +dmgPer 伤害；
// 离开衰减。策略轴：贪 buff vs 安全——花粉带常刷在怪堆里，要增伤就得往险处站。gusts 顺风带保留并存。
import type { MechanicSpec } from '../../content/maps';
import type { CombatContext } from '../context';
import { aroundPlayer, Mechanic, Patch } from './types';

const POLLEN = 0xc89ce0; // 花粉紫

export class PollenMechanic implements Mechanic {
  private t: number;
  private bands: Patch[] = [];
  private stacks = 0;
  private accum = 0; // 在带内积层计时
  private decay = 0; // 离带衰减计时
  private fxT = 0;
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'pollen' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    // 周期铺花粉带
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = aroundPlayer(ctx, 90, 280);
        const img = ctx.scene.add.image(x, y, 'p_dot').setDepth(5).setTint(POLLEN)
          .setAlpha(0).setScale((spec.r * 2) / 16);
        ctx.scene.tweens.add({ targets: img, alpha: 0.26, duration: 300 });
        this.bands.push({ img, x, y, r: spec.r, t: spec.dur, tick: 0 });
      }
    }
    // 积层 / 衰减
    const px = ctx.player.x;
    const py = ctx.player.y;
    const inBand = this.bands.some((b) => (px - b.x) ** 2 + (py - b.y) ** 2 < b.r * b.r);
    if (inBand) {
      this.decay = 0;
      this.accum += dt;
      while (this.accum >= 1 && this.stacks < spec.maxStacks) {
        this.accum -= 1;
        this.stacks++;
        if (this.stacks === spec.maxStacks) ctx.spawnMapDrop(px, py); // M19 满层奖励：本图专属道具（内部按掉率随机）
      }
    } else {
      this.accum = 0;
      this.decay += dt;
      while (this.decay >= 1.5 && this.stacks > 0) {
        this.decay -= 1.5;
        this.stacks--;
      }
    }
    ctx.setMechDmgMul(1 + this.stacks * spec.dmgPer);
    // 身上花粉光点提示层数（越高越密）
    if (this.stacks > 0) {
      this.fxT -= dt;
      if (this.fxT <= 0) {
        this.fxT = 0.5 - this.stacks * 0.06;
        ctx.fx.burst(px + (Math.random() - 0.5) * 24, py - 8, { tex: 'p_dot', color: POLLEN, count: 1, speed: 26, life: 0.5, scale: 0.5, alpha: 0.8 });
      }
    }
    // 带过期
    for (let i = this.bands.length - 1; i >= 0; i--) {
      const b = this.bands[i];
      b.t -= dt;
      b.img.setAlpha(0.2 + Math.sin(ctx.run.elapsed * 3 + i) * 0.07);
      if (b.t <= 0) {
        const img = b.img;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
        this.bands.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.ctx.setMechDmgMul(1);
    this.bands.forEach((b) => b.img.destroy());
    this.bands.length = 0;
  }
}
