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
  kind: 'weapon' | 'passive' | 'heal' | 'gold';
  id?: WeaponId | PassiveId;
  isNew: boolean;
  toLevel: number;
}

/** 宝箱分层结果：可进化 → 进化；否则概率再得规则卡（M9）；否则 → 已持有项升级×N；无可升级 → 金币 */
export type ChestReward =
  | { kind: 'evolve'; weapon: WeaponId }
  | { kind: 'arcana'; card: ArcanaId }
  | { kind: 'upgrade'; items: Offer[] }
  | { kind: 'gold'; coins: number; heal: number };

/** 运行模式（公共契约：M11 实装无尽） */
export type RunMode = 'normal' | 'endless';

/** 场景启动参数（公共契约：M10 预留 mode/diff，M11 实装无尽与狂暴档位） */
export interface RunLaunchData {
  charId: string;
  mapId: string;
  mode?: RunMode; // 缺省 'normal'
  diff?: 0 | 1 | 2; // 狂暴档位，缺省 0
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
  build: Array<{ id: WeaponId; level: number; evolved: boolean }>;
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
  /** 伤害归账（M8 武器 DPS 统计；调试面板显示） */
  dmgLog(src: string, dmg: number): void;
  onEnemyKilled(e: Enemy): void;
  damagePlayer(d: number): void;
  hitStop(sec: number): void;
  addZone(z: ZoneSpec): void;
  slowAt(x: number, y: number): boolean;
  /** 该点是否有「减速玩家」的水皮（地图机制；武器水洼不算） */
  playerSlowAt(x: number, y: number): boolean;
  /** 该点顺风加速乘子（花浪阵风机制，敌我同加速），无则 1 */
  hasteMulAt(x: number, y: number): number;
  magnetizeGems(x: number, y: number, r: number): void;
  spawnEnemyBullet(spec: EnemyBulletSpec): void;
  spawnGem(x: number, y: number, value: number): void;
  spawnCoin(x: number, y: number, value: number): void;
  spawnPickup(kind: 'heart' | 'chest', x: number, y: number): void;
  recomputeStats(): void;
}

/** 规则卡钩子（10 张 Arcana，M9 实装于 systems/arcana.ts；调用点 M2 起全挂） */
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
}
