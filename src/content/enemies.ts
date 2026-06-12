// 敌人规格 / 行为模板指派 / 波次时间表 / Boss 数值（纯数据层，禁止依赖 Phaser）
import { defineTable } from '../core/registry';
import type { BehaviorId, EnemyId } from './ids';

export interface EnemySpec {
  hp: number;
  speed: number;
  dmg: number; // 接触伤害
  xp: number;
  radius: number;
  tex: string;
  knockMul: number; // 受击退系数（壳壳/精英/Boss 低）
  behavior: BehaviorId;
  /** 死亡时分裂 */
  split?: { id: EnemyId; n: number };
}

export const ENEMIES = defineTable<EnemyId, EnemySpec>({
  blob:     { hp: 14,   speed: 56,  dmg: 8,  xp: 1,  radius: 14, tex: 'e_blob',     knockMul: 1,    behavior: 'chase' },
  midge:    { hp: 6,    speed: 98,  dmg: 5,  xp: 1,  radius: 9,  tex: 'e_midge',    knockMul: 1.3,  behavior: 'wobble' },
  shelly:   { hp: 70,   speed: 36,  dmg: 13, xp: 3,  radius: 17, tex: 'e_shelly',   knockMul: 0.15, behavior: 'chase' },
  spitter:  { hp: 24,   speed: 50,  dmg: 7,  xp: 2,  radius: 14, tex: 'e_spitter',  knockMul: 0.9,  behavior: 'strafeShoot' },
  dasher:   { hp: 28,   speed: 62,  dmg: 14, xp: 2,  radius: 13, tex: 'e_dasher',   knockMul: 0.8,  behavior: 'dash' },
  splitter: { hp: 34,   speed: 64,  dmg: 9,  xp: 2,  radius: 15, tex: 'e_splitter', knockMul: 0.9,  behavior: 'chase', split: { id: 'mini', n: 2 } },
  mini:     { hp: 8,    speed: 88,  dmg: 5,  xp: 1,  radius: 9,  tex: 'e_mini',     knockMul: 1.2,  behavior: 'wobble' },
  elite:    { hp: 900,  speed: 42,  dmg: 18, xp: 30, radius: 40, tex: 'e_elite',    knockMul: 0.05, behavior: 'chase' },
  boss:     { hp: 3600, speed: 64,  dmg: 24, xp: 0,  radius: 62, tex: 'e_boss',     knockMul: 0,    behavior: 'chase' },
});

// 随时间成长（min 为分钟数）
export function hpScale(min: number): number {
  return 1 + min * 0.22 + Math.max(0, min - 8) * 0.18;
}
export function dmgScale(min: number): number {
  return 1 + min * 0.055;
}

export const SPITTER = { range: 270, fireCd: 3.0, bulletSpeed: 150, bulletDmg: 10 };
export const DASHER = { triggerDist: 300, telegraph: 0.55, dashSpeed: 340, dashTime: 0.45, recover: 1.1 };

/** 墨之王 Boss（二阶段阈值 50%） */
export const BOSS = {
  phase2HpK: 0.5,
  firstAtkCd: 2.5,
  atkCd: 4.5,
  atkCdP2: 3.2,
  ringN: 11,
  ringNP2: 16,
  bulletSpeed: 150, // 与喷喷同款墨弹
  bulletDmg: 10,
  firstSummonCd: 9,
  summonCd: 10, // 仅二阶段
  summonId: 'midge' as EnemyId,
  summonN: 6,
  summonRadius: 90,
  firstDashCd: 6,
  dashCd: 7.5,
  dashCdP2: 5.5,
  dashSpeed: 420,
  dashMinDist: 150,
};

// ---------- 波次 ----------
export interface WavePhase {
  from: number; // 秒
  interval: number; // 刷怪间隔（秒）
  burst: number; // 每次刷几只
  maxAlive: number;
  types: Array<[EnemyId, number]>; // [类型, 权重]
}

export const WAVES: WavePhase[] = [
  { from: 0,   interval: 1.15, burst: 1, maxAlive: 22,  types: [['blob', 1]] },
  { from: 55,  interval: 1.0,  burst: 2, maxAlive: 42,  types: [['blob', 3], ['midge', 2]] },
  { from: 115, interval: 0.9,  burst: 2, maxAlive: 58,  types: [['blob', 3], ['midge', 2], ['splitter', 1.5]] },
  { from: 175, interval: 0.85, burst: 3, maxAlive: 78,  types: [['blob', 3], ['midge', 2], ['splitter', 1.5], ['shelly', 1]] },
  { from: 235, interval: 0.8,  burst: 3, maxAlive: 100, types: [['blob', 2.5], ['midge', 2], ['splitter', 1.5], ['shelly', 1], ['dasher', 1.2]] },
  { from: 300, interval: 0.75, burst: 3, maxAlive: 120, types: [['blob', 2], ['midge', 2], ['splitter', 1.5], ['shelly', 1.2], ['dasher', 1.2], ['spitter', 1]] },
  { from: 360, interval: 0.6,  burst: 4, maxAlive: 150, types: [['blob', 2], ['midge', 2.5], ['splitter', 1.5], ['shelly', 1.4], ['dasher', 1.4], ['spitter', 1.2]] },
  { from: 480, interval: 0.55, burst: 4, maxAlive: 185, types: [['blob', 1.5], ['midge', 2], ['splitter', 2], ['shelly', 2], ['dasher', 1.6], ['spitter', 1.4]] },
  { from: 600, interval: 0.45, burst: 5, maxAlive: 230, types: [['midge', 2], ['splitter', 2], ['shelly', 2.4], ['dasher', 2], ['spitter', 1.6]] },
  { from: 720, interval: 1.0,  burst: 2, maxAlive: 70,  types: [['midge', 2], ['dasher', 1.5], ['blob', 1]] }, // Boss 阶段轻刷
];

export interface WaveEvent {
  t: number;
  kind: 'ring' | 'elite' | 'boss';
  enemy?: EnemyId;
  n?: number;
}

export const EVENTS: WaveEvent[] = [
  { t: 200, kind: 'ring', enemy: 'blob', n: 18 },
  { t: 330, kind: 'elite' },
  { t: 430, kind: 'ring', enemy: 'midge', n: 26 },
  { t: 510, kind: 'elite' },
  { t: 565, kind: 'ring', enemy: 'splitter', n: 14 },
  { t: 660, kind: 'ring', enemy: 'shelly', n: 12 },
  { t: 720, kind: 'boss' },
];
