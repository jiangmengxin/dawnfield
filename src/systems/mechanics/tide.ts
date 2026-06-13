// pond 涨潮退潮（M18 核心）：周期涨水，荷叶岛之外全场重减速 + 滴血（敌人不受影响），退潮回常态。
// 策略轴：周期性领土收缩——涨潮来临时跑到最近荷叶岛守住，退潮换岛。预警 ≥warnT 秒、岛绕玩家生成保证可达。
// 旧 puddles 被吸收为退潮期残留积水风味。岛外减速复用 ctx.setEnvSlow（PlayerSystem 的 ripple 自动触发）。
import type { MechanicSpec } from '../../content/maps';
import { dmgScale } from '../../content/enemies';
import { POND } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { emitEvent } from '../../core/events';
import type { CombatContext } from '../context';
import { aroundPlayer, effMin, Mechanic, Patch } from './types';

export class TideMechanic implements Mechanic {
  private state: 'low' | 'high' = 'low';
  private t: number;
  private warned = false;
  private islands: Patch[] = [];
  private dmgT = 0;
  private puddleT = 6; // 退潮期残留积水风味节流
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'tide' }>) {
    // 首次低潮时长 = 周期 − 高潮（涨潮前给足喘息）
    this.t = Math.max(spec.warnT + 4, spec.period - spec.highT);
  }

  update(dt: number): void {
    this.t -= dt;
    if (this.state === 'low') this.updateLow(dt);
    else this.updateHigh(dt);
  }

  private updateLow(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    // 涨潮预警
    if (!this.warned && this.t <= spec.warnT) {
      this.warned = true;
      emitEvent(ctx.scene.game, 'hud:warn', 'tideWarn');
      SFX.warning();
    }
    // 退潮期残留积水（puddles 吸收为风味；温和减速，affectsPlayer）
    this.puddleT -= dt;
    if (this.puddleT <= 0) {
      this.puddleT = 7;
      const [x, y] = aroundPlayer(ctx, 120, 300);
      ctx.addZone({ x, y, r: 64, dur: 6, effect: 'slow', mul: 0.78, tex: 'pz_pool', affectsPlayer: true });
    }
    if (this.t <= 0) this.startHigh();
  }

  private updateHigh(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    const px = ctx.player.x;
    const py = ctx.player.y;
    const onIsland = this.onAnyIsland(px, py);
    // 岛外：环境减速（PlayerSystem 据此触发涟漪）+ 周期滴血（节流配合 iframe）
    ctx.setEnvSlow(onIsland ? 1 : spec.slow);
    if (!onIsland) {
      this.dmgT -= dt;
      if (this.dmgT <= 0) {
        this.dmgT = 0.5;
        ctx.damagePlayer(spec.dps * 0.5 * dmgScale(effMin(ctx)));
      }
    }
    // 岛高亮呼吸
    for (const isl of this.islands) isl.img.setAlpha(0.85 + Math.sin(ctx.run.elapsed * 4) * 0.12);
    if (this.t <= 0) this.endHigh();
  }

  private startHigh(): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.state = 'high';
    this.t = spec.highT;
    this.dmgT = 0;
    // 围绕玩家当前位置环形生成荷叶岛（保证可达），复用 pond 荷叶装饰贴图
    for (let i = 0; i < spec.islandN; i++) {
      const a = (i / spec.islandN) * Math.PI * 2 + Math.random() * 0.4;
      const x = ctx.player.x + Math.cos(a) * spec.islandR;
      const y = ctx.player.y + Math.sin(a) * spec.islandR;
      const img = ctx.scene.add.image(x, y, 'pd_lily0').setDepth(6).setAlpha(0);
      img.setDisplaySize(spec.islandR * 1.15, spec.islandR * 1.15 * (img.height / img.width));
      ctx.scene.tweens.add({ targets: img, alpha: 0.9, duration: 300 });
      ctx.fx.ring(x, y, POND.pool, 3, 0.6);
      this.islands.push({ img, x, y, r: spec.islandR * 0.6, t: 0, tick: 0 });
    }
    SFX.warning();
  }

  private endHigh(): void {
    const ctx = this.ctx;
    this.state = 'low';
    this.warned = false;
    this.t = Math.max(this.spec.warnT + 4, this.spec.period - this.spec.highT);
    ctx.setEnvSlow(1);
    ctx.spawnMapDrop(ctx.player.x, ctx.player.y); // M19 守住高潮的奖励：本图专属道具（内部按掉率随机）
    for (const isl of this.islands) {
      const img = isl.img;
      ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 400, onComplete: () => img.destroy() });
    }
    this.islands.length = 0;
  }

  private onAnyIsland(x: number, y: number): boolean {
    for (const isl of this.islands) {
      if ((x - isl.x) ** 2 + (y - isl.y) ** 2 < isl.r * isl.r) return true;
    }
    return false;
  }

  destroy(): void {
    this.ctx.setEnvSlow(1);
    this.islands.forEach((isl) => isl.img.destroy());
    this.islands.length = 0;
  }
}
