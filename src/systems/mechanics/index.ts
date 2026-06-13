// 机制模块注册表（M18）：MapMechanicSystem 调度器经此工厂按 kind 实例化机制模块。
// 新增机制：实现 Mechanic 接口的模块 → 在此 switch 注册一行。
import type { MechanicSpec } from '../../content/maps';
import type { CombatContext } from '../context';
import { Mechanic } from './types';
import {
  BramblesMechanic, DawnpillarMechanic, GustsMechanic, PuddlesMechanic,
  SpringsMechanic, StarfallMechanic, StormMechanic,
} from './legacy';
import { BloomfieldMechanic } from './bloomfield';
import { TideMechanic } from './tide';
import { WindMechanic } from './wind';
import { SporechainMechanic } from './sporechain';

/** 占位机制（核心 kind 尚未接入时）：批次2 接入后移除命中 */
const NOOP: Mechanic = { update() { /* noop */ }, destroy() { /* noop */ } };

export function createMechanic(ctx: CombatContext, spec: MechanicSpec): Mechanic {
  switch (spec.kind) {
    // 旧区域机制（降级为各图次要风味）
    case 'puddles': return new PuddlesMechanic(ctx, spec);
    case 'springs': return new SpringsMechanic(ctx, spec);
    case 'gusts': return new GustsMechanic(ctx, spec);
    case 'storm': return new StormMechanic(ctx, spec);
    case 'brambles': return new BramblesMechanic(ctx, spec);
    case 'starfall': return new StarfallMechanic(ctx, spec);
    case 'dawnpillar': return new DawnpillarMechanic(ctx, spec);
    // M18 批次1 核心机制
    case 'bloomfield': return new BloomfieldMechanic(ctx, spec);
    case 'tide': return new TideMechanic(ctx, spec);
    case 'wind': return new WindMechanic(ctx, spec);
    case 'sporechain': return new SporechainMechanic(ctx, spec);
    // M18 批次2（pollen/thornwall/nightfall/beacon）：接入前数据层不引用，故不会命中 NOOP
    default: return NOOP;
  }
}
