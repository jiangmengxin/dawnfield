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

  constructor(ctx: CombatContext, specs: MechanicSpec[], mechanicEase = 0) {
    this.mechanics = specs.map((s) => createMechanic(ctx, tuneMechanicSpec(s, mechanicEase)));
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

function tuneMechanicSpec(spec: MechanicSpec, ease: number): MechanicSpec {
  if (ease <= 0) return spec;
  const e = Math.min(0.45, Math.max(0, ease));
  const o = { ...spec } as Record<string, unknown>;
  const mul = (key: string, k: number, min = 0): void => {
    const v = o[key];
    if (typeof v === 'number') o[key] = Math.max(min, v * k);
  };
  const add = (key: string, k: number): void => {
    const v = o[key];
    if (typeof v === 'number') o[key] = v + k;
  };
  switch (spec.kind) {
    case 'puddles':
      mul('interval', 1 + e * 0.6);
      mul('dur', 1 - e * 0.35, 1);
      o.playerSlow = 1 - (1 - spec.playerSlow) * (1 - e);
      break;
    case 'storm':
      mul('interval', 1 + e * 0.65);
      mul('pushPlayer', 1 - e);
      mul('pushEnemy', 1 - e * 0.4);
      add('warnT', e * 0.4);
      break;
    case 'starfall':
      mul('interval', 1 + e * 0.5);
      mul('dmg', 1 - e);
      add('warnT', e * 0.45);
      break;
    case 'brambles':
      mul('interval', 1 + e * 0.6);
      mul('dur', 1 - e * 0.4, 1);
      mul('dmg', 1 - e);
      break;
    case 'tide':
      mul('highT', 1 - e * 0.35, 2);
      mul('dps', 1 - e);
      o.slow = 1 - (1 - spec.slow) * (1 - e);
      break;
    case 'wind':
      mul('speed', 1 - e * 0.3);
      mul('turnEvery', 1 + e * 0.6);
      break;
    case 'thornwall':
      mul('interval', 1 + e * 0.5);
      mul('dur', 1 - e * 0.35, 2);
      add('gapDeg', e * 18);
      break;
    case 'nightfall':
      mul('darkAlpha', 1 - e * 0.45);
      mul('starEvery', 1 - e * 0.25, 4);
      break;
    case 'frostseal':
      mul('interval', 1 + e * 0.45);
      mul('chargeT', 1 - e * 0.25, 0.4);
      break;
    case 'prismfield':
      mul('interval', 1 + e * 0.4);
      mul('chargeT', 1 - e * 0.25, 0.4);
      break;
    case 'bellring':
      mul('interval', 1 + e * 0.45);
      mul('missDmg', 1 - e);
      add('warnT', e * 0.35);
      break;
    default:
      break;
  }
  return o as MechanicSpec;
}
