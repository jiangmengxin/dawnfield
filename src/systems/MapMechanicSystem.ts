// 地图机制调度器（M18）：持有本图全部机制模块（核心 + 风味）并行 update。
// 每图核心机制改变策略轴，旧区域机制降级为次要风味；具体逻辑在 systems/mechanics/<kind>.ts，
// 经 mechanics/index.ts 的 createMechanic 工厂按 kind 实例化。
import type { MechanicSpec } from '../content/maps';
import type { CombatContext, RunSystem } from './context';
import type { Enemy } from './EnemySystem';
import { createMechanic } from './mechanics';
import type { Mechanic } from './mechanics/types';

export class MapMechanicSystem implements RunSystem {
  private mechanics: Mechanic[];

  constructor(ctx: CombatContext, specs: MechanicSpec[]) {
    this.mechanics = specs.map((s) => createMechanic(ctx, s));
  }

  update(dt: number): void {
    for (const m of this.mechanics) m.update(dt);
  }

  /** 敌人死亡转发（grove 孢子连锁等击杀钩子；GameScene.onEnemyKilled 调用） */
  notifyKill(e: Enemy): void {
    for (const m of this.mechanics) m.onEnemyKilled?.(e);
  }

  destroy(): void {
    for (const m of this.mechanics) m.destroy();
  }
}
