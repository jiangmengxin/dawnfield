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
import { PollenMechanic } from './pollen';
import { ThornwallMechanic } from './thornwall';
import { NightfallMechanic } from './nightfall';
import { BeaconMechanic } from './beacon';
import { OrchardMechanic } from './orchard';
import { FrostsealMechanic } from './frostseal';
import { PrismfieldMechanic } from './prismfield';
import { BellringMechanic } from './bellring';

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
    // M18 批次2 核心机制
    case 'pollen': return new PollenMechanic(ctx, spec);
    case 'thornwall': return new ThornwallMechanic(ctx, spec);
    case 'nightfall': return new NightfallMechanic(ctx, spec);
    case 'beacon': return new BeaconMechanic(ctx, spec);
    // 1.0+ 四图扩展机制
    case 'orchard': return new OrchardMechanic(ctx, spec);
    case 'frostseal': return new FrostsealMechanic(ctx, spec);
    case 'prismfield': return new PrismfieldMechanic(ctx, spec);
    case 'bellring': return new BellringMechanic(ctx, spec);
  }
}
