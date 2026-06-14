// 武器系统：32 种机制完全不同的武器 + 各自的进化形态
// 行为代码按武器分文件；平衡数值在 content/weapons.ts
import { PASSIVE_MAX_LEVEL } from '../../content/passives';
import { BREAKTHROUGH, evolvedWeaponCodexId, WEAPON_MAX_LEVEL, WEAPON_META } from '../../content/weapons';
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
import { VineWeapon } from './vine';
import { SlingWeapon } from './sling';
import { WispWeapon } from './wisp';
import { BugleWeapon } from './bugle';
import { DaggerWeapon } from './dagger';
import { AxeWeapon } from './axe';
import { FireballWeapon } from './fireball';
import { FlaskWeapon } from './flask';
import { BoltWeapon } from './bolt';
import { BirdWeapon } from './bird';
import { RicochetWeapon } from './ricochet';
import { WandWeapon } from './wand';
import { BreathWeapon } from './breath';
import { BombWeapon } from './bomb';
import { GravityWeapon } from './gravity';
import { SwordWeapon } from './sword';
import { SwarmWeapon } from './swarm';
import { MeteorWeapon } from './meteor';
import { FrostWeapon } from './frost';
import { TornadoWeapon } from './tornado';

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
  vine: VineWeapon,
  sling: SlingWeapon,
  wisp: WispWeapon,
  bugle: BugleWeapon,
  dagger: DaggerWeapon,
  axe: AxeWeapon,
  fireball: FireballWeapon,
  flask: FlaskWeapon,
  bolt: BoltWeapon,
  bird: BirdWeapon,
  ricochet: RicochetWeapon,
  wand: WandWeapon,
  breath: BreathWeapon,
  bomb: BombWeapon,
  gravity: GravityWeapon,
  sword: SwordWeapon,
  swarm: SwarmWeapon,
  meteor: MeteorWeapon,
  frost: FrostWeapon,
  tornado: TornadoWeapon,
};

export class WeaponManager implements RunSystem {
  list: Weapon[] = [];

  constructor(private ctx: CombatContext) {}

  /** 武器归账子上下文（M8 DPS 统计）：hitEnemy 记账到该武器，addZone 自动注入伤害来源；
   *  原型链委托其余成员，武器行为代码零改动 */
  private wrapCtx(id: WeaponId): CombatContext {
    const base = this.ctx;
    const sub = Object.create(base) as CombatContext;
    // 突破模式（M20）：按本武器突破层在结算前放大伤害（中央乘区，覆盖该武器全部 hitEnemy 出口）；
    // self 首次命中时缓存（武器实例在 wrapCtx 之后构造，故惰性查）
    let self: Weapon | undefined;
    sub.hitEnemy = (e, dmg, opts) => {
      if (!self) self = this.get(id);
      const bt = self && self.breakthrough > 0 ? 1 + BREAKTHROUGH.dmgPerLevel * self.breakthrough : 1;
      const applied = base.hitEnemy(e, dmg * bt, opts);
      if (applied > 0) base.dmgLog(id, applied);
      return applied;
    };
    sub.addZone = (z) => base.addZone(z.src === undefined ? { ...z, src: id } : z);
    return sub;
  }

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
      } else if (w.evolved && this.ctx.run.breakthrough) {
        // 突破模式（M20）：满级且已进化的超武继续升级 = 累加突破层（level 仍封顶 5，不越界数组）
        w.breakthrough++;
        w.onLevelUp();
      }
    } else {
      this.list.push(new FACTORY[id](this.wrapCtx(id), id));
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
    const w = this.get(id);
    if (!w) return;
    w.onEvolve();
    Meta.codexLight('weapons', evolvedWeaponCodexId(id));
    this.ctx.notifyEvolve(id); // M13：onEvolve 钩子 + firstEvolveAt 埋点（进化唯一入口）
  }

  /** 清空全部武器（M12 bench 配置切换用） */
  removeAll(): void {
    this.list.forEach((w) => w.destroy());
    this.list.length = 0;
  }

  update(dt: number): void {
    for (const w of this.list) w.update(dt);
  }

  destroy(): void {
    this.list.forEach((w) => w.destroy());
  }
}
