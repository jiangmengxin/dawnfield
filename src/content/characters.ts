// 角色表（纯数据层，禁止依赖 Phaser）
// VS 式差异化：初始武器 + 基础体格（HP/移速/体积）+ 属性偏移；16 角色 ↔ 16 武器一一配对
// M17 视觉/碰撞解耦：artR 决定纹理观感（画进贴图），radius 仅接触判定；数值调参只改此处
// 体型阶梯：蜂群杂兵 8–9 < 标准杂兵 11–15 < 中坚 15–19 < 玩家 artR 16–26 < 精英 40+ < Boss 60+
import type { AchievementId, CharacterId, TraitId, WeaponId } from './ids';

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
  radius: number;            // 接触判定半径（仅碰撞，不再决定观感）
  artR: number;              // 视觉半径（画进纹理；≈ radius × 1.3，面积感约为旧版 2 倍）
  trail: CharTrail;
  mods?: CharMods;
  /** 角色专属机制（M14）：后期角色独有，行为在 systems/traits.ts，数值在下方 TRAIT_FX */
  trait?: TraitId;
  /** 隐藏角色（M16）：未解锁时选择页/图鉴不占位不显示（存在本身就是秘密），彩蛋链解锁 */
  secret?: boolean;
  unlockAch: AchievementId | null; // null = 默认解锁
}

/** 角色 trait 数值表（M14）：调参只改此处，不碰 systems/traits.ts 行为代码 */
export const TRAIT_FX = {
  // wisp 轻盈残影：每 cd 秒蓄一次闪避，受击完全免疫并朝移动方向闪现
  flickerCd: 12,
  flickerDist: 90,
  // berry 甜食小铺：每 per 枚金币在最近敌人处果酱爆炸 + 减速果酱
  sweetPer: 8,
  sweetSeekR: 600, // 找最近敌人的搜索半径（无敌人则保留计数待发）
  sweetDmg: 30,    // × stats.dmg
  sweetR: 90,      // 爆炸半径
  sweetJamR: 60,   // 果酱减速区半径
  sweetJamDur: 3,  // 果酱持续（秒）
  // toot 晨光大合奏：每 every 秒全部武器立即同时施放一次
  fanfareEvery: 40,
  // ivy 收集家：升级候选张数
  collectorOffers: 4,
  // jingle 进化共鸣：每次进化随机未满级被动 +1 + 钟鸣新星
  resonanceDmg: 40, // × stats.dmg
  resonanceR: 220,
  // M16 blobby 软软弹弹：受击把来源敌人弹开（不减伤）
  bouncyKb: 240,
  // M16 nova 流星之躯：持续移动 moveT 秒后获得 dr 减伤
  cometMoveT: 0.8,
  cometDr: 0.1,
};

export const CHARACTERS: CharacterSpec[] = [
  // 小萤：均衡基准（与旧版玩家数值一致）
  { id: 'spark', weapon: 'blade', tex: 'player', texScale: 1.05, color: 0xe2b452,
    hp: 100, speed: 175, radius: 15, artR: 20,
    trail: { tex: 'p_dot', color: 0xffe9a8, every: 0.1 }, unlockAch: null },
  // 蔷蔷：轻盈舞者 — 小体积高暴击，花环更大
  { id: 'rosa', weapon: 'petal', tex: 'char_rosa', texScale: 1.05, color: 0xe07898,
    hp: 85, speed: 190, radius: 13, artR: 17,
    trail: { tex: 'p_petal', color: 0xf8a8c0, every: 0.14 },
    mods: { area: 1.12, crit: 0.05 }, unlockAch: 'survive5' },
  // 露露：丰润水珠 — 厚血慢速自带回复，雨洼更大
  { id: 'dew', weapon: 'rain', tex: 'char_dew', texScale: 0.9, color: 0x5898d0,
    hp: 140, speed: 150, radius: 19, artR: 25,
    trail: { tex: 'p_dot', color: 0x90c8f0, every: 0.13 },
    mods: { area: 1.1, regen: 0.6 }, unlockAch: 'swarm100' },
  // 风风：疾跑者 — 全场最快，弹速快但拳头软
  { id: 'gale', weapon: 'boomerang', tex: 'char_gale', texScale: 1.05, color: 0x50b080,
    hp: 90, speed: 215, radius: 13, artR: 17,
    trail: { tex: 'p_dot', color: 0xa8e0c0, every: 0.06 },
    mods: { projSpeed: 1.25, dmg: 0.95 }, unlockAch: 'eliteSlayer' },
  // 琉璃：玻璃大炮 — 伤害爆表，身板最脆
  { id: 'lumen', weapon: 'prism', tex: 'char_lumen', texScale: 1.05, color: 0x9a8cc8,
    hp: 70, speed: 165, radius: 14, artR: 19,
    trail: { tex: 'p_star', color: 0xd8d0f0, every: 0.12 },
    mods: { dmg: 1.32 }, unlockAch: 'level20' },
  // 闪闪：急速施法 — 冷却短、磁吸大
  { id: 'volt', weapon: 'spark', tex: 'char_volt', texScale: 1.05, color: 0xe0a830,
    hp: 85, speed: 185, radius: 13, artR: 17,
    trail: { tex: 'p_star', color: 0xffe070, every: 0.09 },
    mods: { cd: 0.85, magnet: 1.25 }, unlockAch: 'firstEvolve' },
  // 墩墩：重装坦克 — 生命护甲超厚，全场最大最慢
  { id: 'pebble', weapon: 'mine', tex: 'char_pebble', texScale: 0.85, color: 0xa88860,
    hp: 170, speed: 142, radius: 20, artR: 26,
    trail: { tex: 'p_dot', color: 0xd8c0a0, every: 0.2 },
    mods: { armor: 2, dmg: 1.08 }, unlockAch: 'meadowClear' },
  // 蒲蒲：幸运收集者 — 金币经验双修，小有暴击
  { id: 'fluff', weapon: 'puff', tex: 'char_fluff', texScale: 1.05, color: 0xb8a878,
    hp: 95, speed: 180, radius: 14, artR: 19,
    trail: { tex: 'p_dot', color: 0xffffff, every: 0.11 },
    mods: { coinGain: 1.35, xpGain: 1.15, crit: 0.03 }, unlockAch: 'coins500' },
  // ---------- M6 批次 B ----------
  // 暖暖：提灯暖灵 — 厚实自愈，光圈更大
  { id: 'ember', weapon: 'lantern', tex: 'char_ember', texScale: 0.95, color: 0xd08848,
    hp: 125, speed: 158, radius: 17, artR: 22,
    trail: { tex: 'p_dot', color: 0xffd9a0, every: 0.12 },
    mods: { area: 1.15, regen: 0.5 }, unlockAch: 'survive15' },
  // 月月：眠月小灵 — 星星转得快，磁吸略大
  { id: 'luna', weapon: 'star', tex: 'char_luna', texScale: 1.05, color: 0x8a90c8,
    hp: 90, speed: 178, radius: 14, artR: 19,
    trail: { tex: 'p_star', color: 0xc8ccf0, every: 0.11 },
    mods: { projSpeed: 1.12, cd: 0.92, magnet: 1.1 }, unlockAch: 'level30' },
  // 栗栗：硬壳小栗 — 力大皮实，走得稳
  { id: 'conker', weapon: 'mallet', tex: 'char_conker', texScale: 0.9, color: 0xa07048,
    hp: 135, speed: 156, radius: 18, artR: 23,
    trail: { tex: 'p_dot', color: 0xd8a878, every: 0.16 },
    mods: { dmg: 1.15, armor: 1 }, unlockAch: 'kills300' },
  // 铃铃：爱唱歌的小铃铛 — 轻快灵巧，铃声更远
  { id: 'jingle', weapon: 'chime', tex: 'char_jingle', texScale: 1.05, color: 0x80b8a8,
    hp: 80, speed: 192, radius: 13, artR: 17,
    trail: { tex: 'p_dot', color: 0xd8f0e8, every: 0.09 },
    mods: { area: 1.12, cd: 0.94 }, trait: 'resonance', unlockAch: 'evolve3' },
  // ---------- M7 批次 C ----------
  // 藤藤：爱收集的小藤灵 — 捡得远长得快
  { id: 'ivy', weapon: 'vine', tex: 'char_ivy', texScale: 0.95, color: 0x74a858,
    hp: 115, speed: 166, radius: 15, artR: 20,
    trail: { tex: 'p_dot', color: 0xb0d890, every: 0.13 },
    mods: { magnet: 1.2, xpGain: 1.1 }, trait: 'collector', unlockAch: 'survive20' },
  // 莓莓：甜甜的小莓果 — 运气和零钱都不少
  { id: 'berry', weapon: 'sling', tex: 'char_berry', texScale: 1.05, color: 0xc86878,
    hp: 100, speed: 176, radius: 14, artR: 19,
    trail: { tex: 'p_dot', color: 0xf8b8c0, every: 0.11 },
    mods: { crit: 0.06, coinGain: 1.1 }, trait: 'sweettooth', unlockAch: 'coins2000' },
  // 悠悠：轻飘飘的小幽光 — 施法飞快身子轻，全场最小
  { id: 'wisp', weapon: 'wisp', tex: 'char_wisp', texScale: 1.05, color: 0x76b896,
    hp: 75, speed: 196, radius: 12, artR: 16,
    trail: { tex: 'p_star', color: 0xc6ecd8, every: 0.08 },
    mods: { cd: 0.88, dmg: 0.95 }, trait: 'flicker', unlockAch: 'wins5' },
  // 嘟嘟：吹号的小乐手 — 嗓门大皮也厚
  { id: 'toot', weapon: 'bugle', tex: 'char_toot', texScale: 0.95, color: 0x7088c8,
    hp: 130, speed: 158, radius: 18, artR: 23,
    trail: { tex: 'p_dot', color: 0xb8c8f0, every: 0.14 },
    mods: { area: 1.18, armor: 1 }, trait: 'fanfare', unlockAch: 'kills500' },
  // ---------- M16 隐藏角色（secret：未解锁不占位不显示；解锁走彩蛋链隐藏成就） ----------
  // 小蓝团：草甸花圃里睡醒的蓝色小团子 — 厚实软弹，提灯暖光更大
  { id: 'blobby', weapon: 'lantern', tex: 'char_blobby', texScale: 0.9, color: 0x6a98c8,
    hp: 160, speed: 150, radius: 18, artR: 23,
    trail: { tex: 'p_dot', color: 0x9cc8ec, every: 0.13 },
    mods: { area: 1.1, dmg: 0.92 }, trait: 'bouncy', secret: true, unlockAch: 'secretBloom' },
  // 小流星：被流星雨砸出来的小火花 — 跑得快弹得急，跑起来更耐砸
  { id: 'nova', weapon: 'star', tex: 'char_nova', texScale: 1.05, color: 0xe0a040,
    hp: 78, speed: 200, radius: 13, artR: 17,
    trail: { tex: 'p_star', color: 0xffe070, every: 0.07 },
    mods: { projSpeed: 1.2, cd: 0.9, dmg: 0.92 }, trait: 'comet', secret: true, unlockAch: 'stargazer' },
];

/** 按 id 取角色；未知 id 兜底为小萤（防坏档/旧链接） */
export function getCharacter(id: string): CharacterSpec {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
