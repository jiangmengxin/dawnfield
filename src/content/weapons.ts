// 武器元数据与平衡数值表（纯数据层，禁止依赖 Phaser）
// 数组下标 = 等级-1；调参只改此处，不碰 systems/weapons/ 行为代码
import type { PassiveId, WeaponId } from './ids';

export const WEAPON_MAX_LEVEL = 5;

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
  { id: 'puff',      color: 0xd8c8a0, icon: 'icon_puff',      evolvesWith: 'ladybug' },
  // M6 批次 B：zone / orbit / melee / burst
  { id: 'lantern',   color: 0xf8b868, icon: 'icon_lantern',   evolvesWith: 'honey' },
  { id: 'star',      color: 0xb0bce8, icon: 'icon_star',      evolvesWith: 'stardust' },
  { id: 'mallet',    color: 0xc89058, icon: 'icon_mallet',    evolvesWith: 'acorn' },
  { id: 'chime',     color: 0x90ccc0, icon: 'icon_chime',     evolvesWith: 'sprout' },
];

// ---------- 平衡数值（每武器一表） ----------

/** 光刃 / 晨曦 */
export const W_BLADE = {
  dmg: [14, 18, 24, 30, 40],
  cd: [1.15, 1.05, 1.0, 0.92, 0.85],
  radius: 88,
  radiusLv3Mul: 1.22,
  evoDmg: 48,
  evoCd: 1.0,
  evoRadius: 105,
};

/** 花瓣环 / 百花 */
export const W_PETAL = {
  dmg: [10, 12, 14, 16, 22],
  count: [3, 4, 5, 6, 6],
  radius: 74,
  radiusLv5: 88,
  evoDmgMul: 1.3,
  evoExtraPetals: 2, // 进化外圈花瓣数 = count + 2
  burstCd: 4, // 进化弹幕间隔（秒）
};

/** 棱镜光束 / 虹折射 */
export const W_PRISM = {
  dmg: [16, 20, 26, 34, 44],
  cd: [2.3, 2.2, 2.0, 1.7, 1.5],
  evoDmg: 50,
  evoCd: 1.4,
};

/** 细雨 / 倾盆 */
export const W_RAIN = {
  dmg: [15, 19, 24, 30, 38],
  cd: [2.9, 2.6, 2.4, 2.2, 2.0],
  n: [3, 3, 4, 4, 5],
  evoCd: 0.42,
  evoDmgMul: 1.15,
  evoAreaMul: 1.15,
};

/** 跃光 / 雷暴 */
export const W_SPARK = {
  dmg: [14, 17, 21, 26, 34],
  cd: [2.0, 1.9, 1.8, 1.6, 1.5],
  links: [3, 4, 5, 6, 6],
  evoCd: 1.5,
  evoLinks: 12,
  evoDmgMul: 1.2,
};

/** 疾风镖 / 旋风 */
export const W_BOOMERANG = {
  dmg: [16, 20, 26, 34, 42],
  cd: [2.5, 2.4, 2.3, 2.2, 2.0],
  count: [1, 2, 2, 2, 3],
  evoCd: 2.2,
  evoDmgMul: 1.25,
};

/** 星尘雷 / 新星 */
export const W_MINE = {
  dmg: [22, 28, 36, 46, 60],
  cd: [1.7, 1.6, 1.5, 1.4, 1.2],
  max: [8, 9, 10, 11, 12],
  evoDmgMul: 1.4,
  evoRadiusMul: 1.5,
};

/** 蒲公英 / 漫天飞絮 */
export const W_PUFF = {
  dmg: [8, 10, 12, 15, 19], // 单粒种子伤害（齐射伤害靠多粒命中）
  cd: [1.7, 1.6, 1.5, 1.4, 1.25],
  n: [5, 6, 7, 8, 10], // 齐射种子数
  spread: 0.8, // 扇形张角（弧度）
  speed: 330,
  life: 0.85, // 飞行寿命（射程 = speed×life×area）
  pierce: 2, // 单粒最多命中敌人数
  evoCd: 1.15,
  evoN: 16, // 进化：全周环射
  evoDmgMul: 1.3,
  evoHoming: 130, // 进化种子缓追转向力
};

/** 暖灯笼 / 小太阳（zone：贴身暖光圈周期灼噬） */
export const W_LANTERN = {
  dmg: [6, 8, 10, 13, 17], // 每跳伤害
  tick: 0.55, // 灼噬间隔（经 stats.cd 缩放）
  radius: [78, 84, 90, 96, 104],
  evoRadiusMul: 1.35,
  evoDmgMul: 1.3,
  evoKb: 130, // 进化每跳向外推力（未进化只有轻微推力）
  kb: 26,
};

/** 星星环 / 小银河（orbit：周期召出绕身飞旋的星星，远轨快旋有歇） */
export const W_STAR = {
  dmg: [12, 15, 19, 24, 30],
  count: [2, 3, 3, 4, 4],
  radius: 108,
  spin: 2.4, // 公转角速度（rad/s）
  dur: 4, // 在场时长
  gap: [2.4, 2.2, 2.0, 1.8, 1.6], // 休息间隔
  hitCd: 0.45, // 同一敌人重复受击间隔
  breathe: 0.1, // 轨道呼吸幅度
  evoDmgMul: 1.35,
  evoExtraStars: 2,
  evoRadiusMul: 1.18,
};

/** 松果锤 / 山摇撼（melee：朝身前重砸，高伤大击退） */
export const W_MALLET = {
  dmg: [30, 38, 48, 62, 80],
  cd: [2.7, 2.55, 2.4, 2.2, 2.0],
  radius: 66, // 砸击判定半径
  reach: 84, // 砸点离身距离
  swingT: 0.16, // 抡锤前摇（秒）
  kb: 330,
  evoCd: 1.95,
  evoDmgMul: 1.25,
  waveR: 175, // 进化震波半径
  waveDmgK: 0.5, // 震波伤害系数
};

/** 风铃环 / 晨钟（burst：以自身为心荡开的铃音冲击环） */
export const W_CHIME = {
  dmg: [16, 20, 25, 32, 40],
  cd: [3.2, 3.0, 2.8, 2.6, 2.3],
  maxR: [130, 138, 146, 155, 165],
  speed: 380, // 波前扩张速度
  kb: 150,
  evoCd: 2.1,
  evoDmgMul: 1.2,
  evoMaxR: 205,
  evoKb: 300,
  evoSecondDelay: 0.35, // 进化第二记钟声延迟（秒）
};

// ---------- 宝箱分层 ----------
// 可进化 → 进化；否则 → 已持有武器升级 ×N；无可升级 → 金币
export const CHEST = {
  upgradeCount: 1, // 无进化时的升级次数
  goldCoins: 30, // 金币层面值（受金币获取加成）
  goldHeal: 30,
};
