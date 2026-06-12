// 局内核心接口：CombatContext（武器/敌人系统看到的世界，GameScene 实现）
// + RunSystem（系统统一更新接口）+ RunModifier（规则卡钩子，M9 实装，M2 空挂）
import type Phaser from 'phaser';
import type { PassiveId, WeaponId } from '../content/ids';
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

/** 地面区域：水洼减速 / 星尘灼烧；heal/haste 预留给地图机制（M5） */
export interface ZoneSpec {
  x: number;
  y: number;
  r: number;
  dur: number; // 秒
  effect: 'slow' | 'heal' | 'burn' | 'haste';
  dps?: number; // burn 伤害 / heal 治疗（每秒）
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

/** 宝箱分层结果：可进化 → 进化；否则 → 已持有项升级×N；无可升级 → 金币 */
export type ChestReward =
  | { kind: 'evolve'; weapon: WeaponId }
  | { kind: 'upgrade'; items: Offer[] }
  | { kind: 'gold' };

export interface RunResult {
  win: boolean;
  time: number;
  kills: number;
  level: number;
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
  readonly stats: Stats; // = run.stats 快捷访问
  readonly grid: SpatialGrid<Enemy>;
  readonly enemies: EnemySystem;
  readonly fx: Effects;
  readonly isMobile: boolean;
  readonly enemyCapMul: number;
  hitEnemy(e: Enemy, dmg: number, opts?: HitOpts): void;
  onEnemyKilled(e: Enemy): void;
  damagePlayer(d: number): void;
  hitStop(sec: number): void;
  addZone(z: ZoneSpec): void;
  slowAt(x: number, y: number): boolean;
  magnetizeGems(x: number, y: number, r: number): void;
  spawnEnemyBullet(spec: EnemyBulletSpec): void;
  spawnGem(x: number, y: number, value: number): void;
  spawnPickup(kind: 'heart' | 'chest', x: number, y: number): void;
  recomputeStats(): void;
}

/** 规则卡钩子（10 张 Arcana，M9 实装；M2 起所有调用点空挂） */
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
