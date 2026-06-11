// 全部平衡数值集中此处
export type WeaponId = 'blade' | 'petal' | 'prism' | 'rain' | 'spark' | 'boomerang' | 'mine';
export type PassiveId = 'power' | 'bloom' | 'lens' | 'cloud' | 'battery' | 'wind';
export type EnemyId =
  | 'blob' | 'midge' | 'shelly' | 'spitter' | 'dasher' | 'splitter' | 'mini' | 'elite' | 'boss';

export const PLAYER = {
  hp: 100,
  speed: 175,
  pickup: 65,
  radius: 14,
  iframe: 0.6, // 受击无敌秒数
  touchTick: 0.45, // 接触伤害结算间隔
};

export const RUN_SECONDS = 12 * 60;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
export const WEAPON_MAX_LEVEL = 5;
export const PASSIVE_MAX_LEVEL = 5;

export function xpForLevel(level: number): number {
  // level: 当前等级，返回升到下一级所需 xp
  return Math.round(6 + (level - 1) * 7 + Math.pow(level - 1, 1.85) * 1.1);
}

// ---------- 敌人 ----------
export interface EnemySpec {
  hp: number;
  speed: number;
  dmg: number; // 接触伤害
  xp: number;
  radius: number;
  tex: string;
  knockMul: number; // 受击退系数（壳壳/精英/Boss 低）
}

export const ENEMIES: Record<EnemyId, EnemySpec> = {
  blob:     { hp: 14,   speed: 56,  dmg: 8,  xp: 1,  radius: 14, tex: 'e_blob',     knockMul: 1 },
  midge:    { hp: 6,    speed: 98,  dmg: 5,  xp: 1,  radius: 9,  tex: 'e_midge',    knockMul: 1.3 },
  shelly:   { hp: 70,   speed: 36,  dmg: 13, xp: 3,  radius: 17, tex: 'e_shelly',   knockMul: 0.15 },
  spitter:  { hp: 24,   speed: 50,  dmg: 7,  xp: 2,  radius: 14, tex: 'e_spitter',  knockMul: 0.9 },
  dasher:   { hp: 28,   speed: 62,  dmg: 14, xp: 2,  radius: 13, tex: 'e_dasher',   knockMul: 0.8 },
  splitter: { hp: 34,   speed: 64,  dmg: 9,  xp: 2,  radius: 15, tex: 'e_splitter', knockMul: 0.9 },
  mini:     { hp: 8,    speed: 88,  dmg: 5,  xp: 1,  radius: 9,  tex: 'e_mini',     knockMul: 1.2 },
  elite:    { hp: 900,  speed: 42,  dmg: 18, xp: 30, radius: 40, tex: 'e_elite',    knockMul: 0.05 },
  boss:     { hp: 3600, speed: 64,  dmg: 24, xp: 0,  radius: 62, tex: 'e_boss',     knockMul: 0 },
};

// 随时间成长（min 为分钟数）
export function hpScale(min: number): number {
  return 1 + min * 0.22 + Math.max(0, min - 8) * 0.18;
}
export function dmgScale(min: number): number {
  return 1 + min * 0.055;
}

export const SPITTER = { range: 270, fireCd: 3.0, bulletSpeed: 150, bulletDmg: 10 };
export const DASHER = { triggerDist: 300, telegraph: 0.55, dashSpeed: 340, dashTime: 0.45, recover: 1.1 };

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

// ---------- 武器/被动元数据 ----------
export interface WeaponMeta {
  id: WeaponId;
  color: number;
  icon: string; // 纹理 key
  evolvesWith: PassiveId | null; // null = 任意被动满级
}

export const WEAPON_META: WeaponMeta[] = [
  { id: 'blade',     color: 0xf0c860, icon: 'icon_blade',     evolvesWith: 'power' },
  { id: 'petal',     color: 0xf8a8c0, icon: 'icon_petal',     evolvesWith: 'bloom' },
  { id: 'prism',     color: 0xa0d8f0, icon: 'icon_prism',     evolvesWith: 'lens' },
  { id: 'rain',      color: 0x90c8f0, icon: 'icon_rain',      evolvesWith: 'cloud' },
  { id: 'spark',     color: 0xffe070, icon: 'icon_spark',     evolvesWith: 'battery' },
  { id: 'boomerang', color: 0x88d8b0, icon: 'icon_boomerang', evolvesWith: 'wind' },
  { id: 'mine',      color: 0xc0a0e8, icon: 'icon_mine',      evolvesWith: null },
];

export interface PassiveMeta {
  id: PassiveId;
  color: number;
  icon: string;
}

export const PASSIVE_META: PassiveMeta[] = [
  { id: 'power',   color: 0xf09078, icon: 'icon_power' },
  { id: 'bloom',   color: 0xf8b8c8, icon: 'icon_bloom' },
  { id: 'lens',    color: 0xb8d8f0, icon: 'icon_lens' },
  { id: 'cloud',   color: 0xd8e8f8, icon: 'icon_cloud' },
  { id: 'battery', color: 0xf8e090, icon: 'icon_battery' },
  { id: 'wind',    color: 0xc0e8c8, icon: 'icon_wind' },
];

// 被动数值（每级）
export const PASSIVE_FX = {
  power: 0.15,   // 伤害 +15%/级
  bloomHp: 20,   // 最大生命 +20/级
  lens: 0.08,    // 冷却 -8%/级
  cloud: 0.12,   // 范围 +12%/级
  battery: 0.3,  // 磁吸 +30%/级
  windMove: 0.07,
  windProj: 0.1,
};

export const DROPS = {
  heartChance: 0.035,
  heartHeal: 25,
  gemMergeCap: 260, // 场上光珠超过此数合并
};

export const CRIT = { chance: 0.1, mul: 1.6 };
