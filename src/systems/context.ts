// 局内核心接口：CombatContext（武器/敌人系统看到的世界，GameScene 实现）
// + RunSystem（系统统一更新接口）+ RunModifier（规则卡钩子，M9 实装，M2 空挂）
import type Phaser from 'phaser';
import type { ArcanaId, PassiveId, WeaponId } from '../content/ids';
import type { MapSpec } from '../content/maps';
import type { RunState, Stats } from '../core/RunState';
import type { Effects } from './effects';
import type { Enemy, EnemySystem } from './EnemySystem';
import type { SpatialGrid } from './grid';

export interface HitOpts {
  kb?: number; // 击退力度
  kx?: number;
  ky?: number;
  pitch?: number; // 命中音效音高
  quiet?: boolean; // 不出闪白/飘字/音效（DoT 用）
  noHook?: boolean; // 不触发 onWeaponHit 钩子（M13：钩子衍生伤害防连锁递归——光屑/荆棘新星/灼光领域）
}

/** 地面区域：水洼减速 / 星尘灼烧 / 治愈泉 / 顺风加速（M6 机制：springs→heal，gusts→haste） */
export interface ZoneSpec {
  x: number;
  y: number;
  r: number;
  dur: number; // 秒
  effect: 'slow' | 'heal' | 'burn' | 'haste';
  dps?: number; // burn 伤害 / heal 治疗（每秒）
  mul?: number; // haste 加速乘子（默认 1）
  tex?: string; // 区域自定义贴图（地图机制水皮/泉眼/顺风带用）
  affectsPlayer?: boolean; // slow 是否也减速玩家（武器水洼不减速玩家，机制水皮减速）
  src?: string; // 伤害归账来源（武器 id，DPS 调试统计用；武器子上下文自动注入）
}

/** 敌方弹幕（参数化，供喷喷与 8 个 Boss 复用） */
export interface EnemyBulletSpec {
  x: number;
  y: number;
  nx: number; // 单位方向
  ny: number;
  speed: number;
  dmg: number; // 基础伤害；timeScaled 时命中刻按 dmgScale(elapsed) 放大
  timeScaled?: boolean;
  tex?: string; // 默认 'inkball'
  life?: number; // 默认 5 秒
}

export interface Offer {
  kind: 'weapon' | 'passive' | 'heal' | 'gold' | 'essence';
  id?: WeaponId | PassiveId;
  /** 晨露精华轴向（M12，kind='essence'）：满构筑后升级溢出的微量永续成长 */
  essence?: 'dmg' | 'cd' | 'area';
  isNew: boolean;
  toLevel: number;
}

/** 宝箱单件物品：按 进化 > 规则卡 > 升级 > 金币 的优先级装箱 */
export type ChestItem =
  | { kind: 'evolve'; weapon: WeaponId }
  | { kind: 'arcana'; cards: ArcanaId[] } // 候选 = 全部未持有卡（与开局选卡一致，任选 1）
  | { kind: 'upgrade'; offer: Offer }
  | { kind: 'gold'; coins: number; heal: number };

/** 宝箱开箱结果：1 件常见，3/5 件稀有惊喜（CHEST.tripleChance/pentaChance） */
export interface ChestReward {
  items: ChestItem[];
}

/** 运行模式（公共契约：M11 实装无尽） */
export type RunMode = 'normal' | 'endless';

/** 场景启动参数（公共契约：M10 预留 mode/diff，M11 实装无尽与狂暴档位） */
export interface RunLaunchData {
  charId: string;
  mapId: string;
  mode?: RunMode; // 缺省 'normal'
  diff?: 0 | 1 | 2; // 狂暴档位，缺省 0
  bench?: boolean; // M12 DPS 基准模式（仅 DEV 响应）
}

export interface RunResult {
  win: boolean;
  // time/kills/level/coins 为单局快照；charId/mapId 供谢幕与重开沿用
  time: number;
  kills: number;
  level: number;
  coins: number; // 局内获得金币（结算页入账 MetaState）
  charId: string; // 本局角色/地图（结算页谢幕 + 「再来一局」沿用）
  mapId: string;
  mode: RunMode; // M10 预留；M11 起结算/记录按模式分流
  diff: 0 | 1 | 2; // 狂暴档位（M11 实装）
  cycle: number; // 无尽轮次（M11 实装，普通局恒 0）
  revivesUsed: number; // 本局已用复活次数（M10；M11 无尽记录行旁标注）
  essence: number; // 晨露精华总张数（M12，结算页展示）
  build: Array<{ id: WeaponId; level: number; evolved: boolean }>;
  // M13 成就口径（终局评估用：win 类成就只在 Result 看得到 win=true）
  passives: number; // 持有被动数（noPassiveClear）
  arcana: number; // 持有规则卡数（arcanaTrio 补尾）
  bossNoHit: boolean; // Boss 战期间未受伤（flawlessBoss）
  firstHurtAt: number; // 首次受伤时刻（秒；未受伤 = Infinity）
  firstEvolveAt: number; // 首次进化时刻（秒；未进化 = Infinity）
  // M15 词缀成就埋点
  affixKills: number; // 本局词缀精英击杀数（affixSlayer 累计入档）
  gravSeen: boolean; // 本局是否出现过引力词缀精英（graviticEscape 前提）
  gravHit: boolean; // 本局是否被引力词缀精英碰到过
}

/** 局内系统统一接口：GameScene 持有 systems: RunSystem[] 按序 update */
export interface RunSystem {
  update(dt: number): void;
  destroy?(): void;
}

/** 武器/敌人/拾取等系统看到的世界 */
export interface CombatContext {
  readonly scene: Phaser.Scene;
  readonly player: Phaser.GameObjects.Image;
  readonly facing: { x: number; y: number };
  readonly run: RunState;
  readonly map: MapSpec; // 本局地图（敌池/成长缩放/机制/Boss 配装的索引）
  readonly stats: Stats; // = run.stats 快捷访问
  readonly grid: SpatialGrid<Enemy>;
  readonly enemies: EnemySystem;
  readonly fx: Effects;
  readonly isMobile: boolean;
  readonly enemyCapMul: number;
  /** 返回实际结算伤害（含浮动/暴击；目标已死/无效返回 0）——DPS 统计据此归账 */
  hitEnemy(e: Enemy, dmg: number, opts?: HitOpts): number;
  /** M17 施放反馈：玩家小幅 pop + 武器主题色环（GameScene 内 0.15s 节流，6 武器齐射不闪疯） */
  castFx(id: WeaponId): void;
  /** M18 hills 山风：当前定向风向量（单位向量 × 强度，0..1）；wind 机制每帧写，Player/Enemy 系统读 */
  readonly windVec: { x: number; y: number };
  /** M18 tide 涨潮：玩家环境减速乘子（岛外涨潮 <1，否则 1）；tide 机制每帧写，PlayerSystem 读 */
  readonly envSlow: number;
  setEnvSlow(v: number): void;
  /** M18 grove 孢子连锁：敌人死亡转发给机制模块（GameScene.onEnemyKilled 内调用） */
  mechanicNotifyKill(e: Enemy): void;
  /** M18 lavender 花粉：机制临时伤害乘区（花粉层数→增伤），hitEnemy 读；pollen 机制每帧写 */
  readonly mechDmgMul: number;
  setMechDmgMul(v: number): void;
  /** M18 summit 破晓烽台：敌人生成 HP 乘区（点燃据点→全场衰减），EnemySystem.spawn 读；beacon 机制写 */
  readonly enemyHpMul: number;
  setEnemyHpMul(v: number): void;
  /** M18 bramble 荆棘围栏：实体墙障碍圆（thornwall 机制 mutate），PlayerSystem 移动后推出玩家 */
  readonly obstacles: Array<{ x: number; y: number; r: number }>;
  /** 伤害归账（M8 武器 DPS 统计；调试面板显示） */
  dmgLog(src: string, dmg: number): void;
  onEnemyKilled(e: Enemy): void;
  /** src = 伤害来源敌人（M15 引力词缀成就埋点；弹幕/区域伤害可缺省） */
  damagePlayer(d: number, src?: Enemy): void;
  hitStop(sec: number): void;
  addZone(z: ZoneSpec): void;
  slowAt(x: number, y: number): boolean;
  /** 该点「减速玩家」水皮的速度乘子（无则 1；地图机制，武器水洼不算） */
  playerSlowAt(x: number, y: number): number;
  /** 该点顺风加速乘子（花浪阵风机制，敌我同加速），无则 1 */
  hasteMulAt(x: number, y: number): number;
  magnetizeGems(x: number, y: number, r: number): void;
  spawnEnemyBullet(spec: EnemyBulletSpec): void;
  spawnGem(x: number, y: number, value: number): void;
  spawnCoin(x: number, y: number, value: number): void;
  spawnPickup(kind: 'heart' | 'chest', x: number, y: number): void;
  recomputeStats(): void;
  /** BGM 强度临时抬升（M12 surge 中场事件；M18 Boss 战切换复用此通道） */
  bgmBoost(sec: number): void;
  /** 构筑随机统一入口（M13 契约：暂为 Math.random 包装，M17 注入种子流时只换实现）。
   *  机制卡概率、宝箱规则卡层等「构筑随机」新代码一律走此处；敌人 AI/刷怪位置不在范围内 */
  rng(): number;
  /** 拾取金币时转发（M13 onCoinPicked 钩子；value 为拾取面值，乘区前） */
  notifyCoinPicked(value: number): void;
  /** 武器进化时转发（M13 onEvolve 钩子 + firstEvolveAt 埋点；唯一入口 WeaponManager.evolve） */
  notifyEvolve(id: WeaponId): void;
}

/** 规则卡钩子（M9 六钩子 + M13 五钩子；实装于 systems/arcana.ts，M14 角色 trait 复用同一接口） */
export interface RunModifier {
  /** 属性重算后追加修正 */
  statMods?(stats: Stats): void;
  /** 升级三选一候选生成后过滤/改写 */
  modifyOffers?(offers: Offer[]): Offer[];
  /** 敌人死亡时 */
  onEnemyKilled?(e: Enemy, ctx: CombatContext): void;
  /** 武器伤害结算前改写 */
  modifyDamage?(dmg: number, e: Enemy): number;
  /** 宝箱结果改写 */
  onChest?(reward: ChestReward): ChestReward;
  /** 每帧 */
  onTick?(dt: number, ctx: CombatContext): void;
  // ---------- M13 新钩子（全部可选，零卡持有时零开销） ----------
  /** 武器伤害结算完成后（applied>0）；钩子衍生伤害带 noHook + GameScene inOnHit 守卫防递归 */
  onWeaponHit?(e: Enemy, applied: number, ctx: CombatContext): void;
  /** 玩家实际扣血后、败北判定前（raw=护甲前，applied=实扣） */
  onPlayerDamaged?(raw: number, applied: number, ctx: CombatContext): void;
  /** 玩家受伤结算前改写（返回 ≤0 = 完全免疫，不扣血不进 iframe；闪避类机制用）。
   *  src = 伤害来源敌人（M16 bouncy 反击退用；弹幕/区域伤害缺省） */
  modifyPlayerDamage?(d: number, ctx: CombatContext, src?: Enemy): number;
  /** 拾取金币时 */
  onCoinPicked?(value: number, ctx: CombatContext): void;
  /** 武器进化时 */
  onEvolve?(id: WeaponId, ctx: CombatContext): void;
}
