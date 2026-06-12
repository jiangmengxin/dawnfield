// 角色表（纯数据层，禁止依赖 Phaser）
// VS 式差异化：初始武器 + 基础体格（HP/移速/体积）+ 属性偏移；16 角色 ↔ 16 武器一一配对
// 体积（radius）同时决定接触判定与纹理观感；数值调参只改此处
import type { AchievementId, CharacterId, WeaponId } from './ids';

/** 属性偏移：乘子类默认 1，加法类默认 0 */
export interface CharMods {
  dmg?: number;       // 乘
  cd?: number;        // 乘（<1 = 更快）
  area?: number;      // 乘
  magnet?: number;    // 乘
  projSpeed?: number; // 乘
  xpGain?: number;    // 乘
  coinGain?: number;  // 乘
  armor?: number;     // 加
  regen?: number;     // 加（每秒）
  crit?: number;      // 加（暴击率）
}

/** 移动拖尾粒子（主角专属辨识，敌人无） */
export interface CharTrail {
  tex: string;   // 粒子纹理 key
  color: number;
  every: number; // 发射间隔（秒）
}

export interface CharacterSpec {
  id: CharacterId;
  weapon: WeaponId;          // 初始武器（一一配对）
  tex: string;               // 纹理 key（spark 沿用 'player'）
  texScale: number;          // UI 卡片图标缩放提示
  color: number;             // 主题色（卡片描边等）
  hp: number;                // 基础生命（绝对值，差异明显）
  speed: number;             // 基础移速（绝对值）
  radius: number;            // 体积：接触判定半径
  trail: CharTrail;
  mods?: CharMods;
  unlockAch: AchievementId | null; // null = 默认解锁
}

export const CHARACTERS: CharacterSpec[] = [
  // 小萤：均衡基准（与旧版玩家数值一致）
  { id: 'spark', weapon: 'blade', tex: 'player', texScale: 1.5, color: 0xe2b452,
    hp: 100, speed: 175, radius: 14,
    trail: { tex: 'p_dot', color: 0xffe9a8, every: 0.1 }, unlockAch: null },
  // 蔷蔷：轻盈舞者 — 小体积高暴击，花环更大
  { id: 'rosa', weapon: 'petal', tex: 'char_rosa', texScale: 1.5, color: 0xe07898,
    hp: 85, speed: 190, radius: 12,
    trail: { tex: 'p_petal', color: 0xf8a8c0, every: 0.14 },
    mods: { area: 1.12, crit: 0.05 }, unlockAch: 'survive5' },
  // 露露：丰润水珠 — 厚血慢速自带回复，雨洼更大
  { id: 'dew', weapon: 'rain', tex: 'char_dew', texScale: 1.3, color: 0x5898d0,
    hp: 140, speed: 150, radius: 17,
    trail: { tex: 'p_dot', color: 0x90c8f0, every: 0.13 },
    mods: { area: 1.1, regen: 0.6 }, unlockAch: 'swarm100' },
  // 风风：疾跑者 — 全场最快，弹速快但拳头软
  { id: 'gale', weapon: 'boomerang', tex: 'char_gale', texScale: 1.5, color: 0x50b080,
    hp: 90, speed: 215, radius: 12,
    trail: { tex: 'p_dot', color: 0xa8e0c0, every: 0.06 },
    mods: { projSpeed: 1.25, dmg: 0.95 }, unlockAch: 'eliteSlayer' },
  // 琉璃：玻璃大炮 — 伤害爆表，身板最脆
  { id: 'lumen', weapon: 'prism', tex: 'char_lumen', texScale: 1.5, color: 0x9a8cc8,
    hp: 70, speed: 165, radius: 13,
    trail: { tex: 'p_star', color: 0xd8d0f0, every: 0.12 },
    mods: { dmg: 1.32 }, unlockAch: 'level20' },
  // 闪闪：急速施法 — 冷却短、磁吸大
  { id: 'volt', weapon: 'spark', tex: 'char_volt', texScale: 1.5, color: 0xe0a830,
    hp: 85, speed: 185, radius: 12,
    trail: { tex: 'p_star', color: 0xffe070, every: 0.09 },
    mods: { cd: 0.85, magnet: 1.25 }, unlockAch: 'firstEvolve' },
  // 墩墩：重装坦克 — 生命护甲超厚，全场最大最慢
  { id: 'pebble', weapon: 'mine', tex: 'char_pebble', texScale: 1.2, color: 0xa88860,
    hp: 170, speed: 142, radius: 18,
    trail: { tex: 'p_dot', color: 0xd8c0a0, every: 0.2 },
    mods: { armor: 2, dmg: 1.08 }, unlockAch: 'meadowClear' },
  // 蒲蒲：幸运收集者 — 金币经验双修，小有暴击
  { id: 'fluff', weapon: 'puff', tex: 'char_fluff', texScale: 1.5, color: 0xb8a878,
    hp: 95, speed: 180, radius: 13,
    trail: { tex: 'p_dot', color: 0xffffff, every: 0.11 },
    mods: { coinGain: 1.35, xpGain: 1.15, crit: 0.03 }, unlockAch: 'coins500' },
];

/** 按 id 取角色；未知 id 兜底为小萤（防坏档/旧链接） */
export function getCharacter(id: string): CharacterSpec {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
