// 地图机制模块统一接口（M18）：MapMechanicSystem 调度器持有多个 Mechanic 并行 update。
// 每图核心机制改变策略轴，旧区域机制降级为次要风味并存；每 kind 一模块。
import type Phaser from 'phaser';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';

export interface Mechanic {
  update(dt: number): void;
  destroy(): void;
  /** M18 grove 孢子连锁：敌人死亡钩子（经 MapMechanicSystem.notifyKill 转发，可选） */
  onEnemyKilled?(e: Enemy): void;
}

/** 机制自管的地皮/落点标记（荆棘丛 / 流星预警 / 晨光柱 / 花苞 / 烽台…） */
export interface Patch {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  r: number;
  t: number;
  tick: number; // DoT 节流（灼烧/治疗刻）
}

/** 有效分钟（成长缩放与敌人同曲线） */
export function effMin(ctx: CombatContext): number {
  return (ctx.run.elapsed / 60) * ctx.map.timeK;
}

/** 玩家四周随机点（min..max 距离环） */
export function aroundPlayer(ctx: CombatContext, min: number, max: number): [number, number] {
  const a = Math.random() * Math.PI * 2;
  const d = min + Math.random() * (max - min);
  return [ctx.player.x + Math.cos(a) * d, ctx.player.y + Math.sin(a) * d];
}
