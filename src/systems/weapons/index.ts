// 武器系统：8 种机制完全不同的武器 + 各自的进化形态
// 行为代码按武器分文件；平衡数值在 content/weapons.ts
import { PASSIVE_MAX_LEVEL } from '../../content/passives';
import { WEAPON_MAX_LEVEL, WEAPON_META } from '../../content/weapons';
import type { WeaponId } from '../../content/ids';
import { Meta } from '../../core/MetaState';
import type { CombatContext, RunSystem } from '../context';
import { Weapon } from './base';
import { BladeWeapon } from './blade';
import { PetalWeapon } from './petal';
import { PrismWeapon } from './prism';
import { RainWeapon } from './rain';
import { SparkWeapon } from './spark';
import { BoomerangWeapon } from './boomerang';
import { MineWeapon } from './mine';
import { PuffWeapon } from './puff';
import { LanternWeapon } from './lantern';
import { StarWeapon } from './star';
import { MalletWeapon } from './mallet';
import { ChimeWeapon } from './chime';

export { Weapon } from './base';

const FACTORY: Record<WeaponId, new (ctx: CombatContext, id: WeaponId) => Weapon> = {
  blade: BladeWeapon,
  petal: PetalWeapon,
  prism: PrismWeapon,
  rain: RainWeapon,
  spark: SparkWeapon,
  boomerang: BoomerangWeapon,
  mine: MineWeapon,
  puff: PuffWeapon,
  lantern: LanternWeapon,
  star: StarWeapon,
  mallet: MalletWeapon,
  chime: ChimeWeapon,
};

export class WeaponManager implements RunSystem {
  list: Weapon[] = [];

  constructor(private ctx: CombatContext) {}

  has(id: WeaponId): boolean {
    return this.list.some((w) => w.id === id);
  }

  get(id: WeaponId): Weapon | undefined {
    return this.list.find((w) => w.id === id);
  }

  addOrUpgrade(id: WeaponId): void {
    const w = this.get(id);
    if (w) {
      if (w.level < WEAPON_MAX_LEVEL) {
        w.level++;
        w.onLevelUp();
      }
    } else {
      this.list.push(new FACTORY[id](this.ctx, id));
      Meta.codexLight('weapons', id); // 图鉴首遇点亮
    }
  }

  /** 可进化的武器列表（满级 + 对应被动已持有） */
  evolvable(): WeaponId[] {
    const out: WeaponId[] = [];
    const passives = this.ctx.run.passives;
    for (const w of this.list) {
      if (w.evolved || w.level < WEAPON_MAX_LEVEL) continue;
      const meta = WEAPON_META.find((m) => m.id === w.id);
      if (!meta) continue;
      if (meta.evolvesWith === null) {
        // 任意被动满级
        for (const lv of passives.values()) {
          if (lv >= PASSIVE_MAX_LEVEL) {
            out.push(w.id);
            break;
          }
        }
      } else if ((passives.get(meta.evolvesWith) ?? 0) > 0) {
        out.push(w.id);
      }
    }
    return out;
  }

  evolve(id: WeaponId): void {
    this.get(id)?.onEvolve();
  }

  update(dt: number): void {
    for (const w of this.list) w.update(dt);
  }

  destroy(): void {
    this.list.forEach((w) => w.destroy());
  }
}
