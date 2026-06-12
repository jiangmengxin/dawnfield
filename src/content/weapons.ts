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
  // M7 批次 C：whip / 炮射 / 追踪 / 哨塔
  { id: 'vine',      color: 0x88b868, icon: 'icon_vine',      evolvesWith: 'trellis' },
  { id: 'sling',     color: 0xd87888, icon: 'icon_sling',     evolvesWith: 'snack' },
  { id: 'wisp',      color: 0x88ccaa, icon: 'icon_wisp',      evolvesWith: 'feather' },
  { id: 'bugle',     color: 0x8898d8, icon: 'icon_bugle',     evolvesWith: 'whistle' },
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

/** 蒲公英 / 漫天飞絮（M8 平衡：实测 DPS 0.47x 中位，小幅提粒伤） */
export const W_PUFF = {
  dmg: [9, 11, 14, 17, 22], // 单粒种子伤害（齐射伤害靠多粒命中）
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

/** 卷卷藤 / 荆棘华尔兹（whip：朝身前甩出横扫长鞭，进化加打身后第二鞭） */
export const W_VINE = {
  dmg: [18, 23, 29, 37, 47],
  cd: [1.6, 1.5, 1.42, 1.32, 1.2],
  len: 150, // 鞭长（受 area 缩放）
  wid: 36, // 判定半宽
  kb: 200,
  evoCd: 1.1,
  evoDmgMul: 1.25,
  evoLenMul: 1.25,
  evoBackDelay: 0.16, // 进化身后第二鞭延迟（秒）
};

/** 莓果弹弓 / 果酱风暴（炮射：抛物线弹出莓果，落地范围爆炸；进化留黏滞果酱） */
export const W_SLING = {
  dmg: [26, 33, 41, 52, 66],
  cd: [2.5, 2.4, 2.25, 2.1, 1.9],
  n: [1, 1, 2, 2, 3], // 每轮抛射莓果数（瞄准最近的 n 个敌人）
  blastR: 78, // 爆炸半径（受 area 缩放）
  range: 380, // 索敌距离
  flyT: 0.55, // 抛物飞行时长（秒）
  arcH: 70, // 抛物线最高点抬升（视觉）
  kb: 170,
  evoCd: 1.7,
  evoDmgMul: 1.3,
  evoBlastMul: 1.25,
  jamR: 62, // 进化果酱减速区半径
  jamDur: 4,
};

/** 流萤珠 / 萤光长河（追踪：放出转向追敌的小萤光，命中即灭；进化更多更快可穿透）
 *  M8 平衡：实测 DPS 仅 0.26x 中位（追踪空耗近半），加弹数/伤害/转向力/弹速 */
export const W_WISP = {
  dmg: [15, 19, 24, 30, 38],
  cd: [2.1, 2.0, 1.9, 1.75, 1.6],
  n: [3, 4, 4, 5, 6],
  speed: 280,
  turn: 520, // 追踪转向力
  life: 2.4, // 飞行寿命（秒，受 area 缩放）
  seek: 420, // 索敌半径
  evoCd: 1.45,
  evoN: 7,
  evoDmgMul: 1.25,
  evoTurn: 540,
  evoPierce: 2, // 进化单粒可穿透敌人数（未进化 1）
};

/** 喇叭花号手 / 晨光号角（哨塔：种下喇叭花朝最近敌人连射种子；进化双株齐奏）
 *  M8 平衡：实测 DPS 0.42x 中位，提弹伤 + 射速 */
export const W_BUGLE = {
  dmg: [14, 17, 21, 26, 33], // 单发种子伤害
  cd: [5.0, 4.8, 4.6, 4.3, 4.0], // 种植间隔
  dur: 6, // 哨塔在场时长（秒）
  fireCd: 0.5, // 哨塔射击间隔
  range: 250, // 哨塔索敌半径（受 area 缩放）
  bulletSpeed: 320,
  kb: 110,
  evoCd: 3.6,
  evoDmgMul: 1.3,
  evoDur: 7,
  evoFireCd: 0.4,
  evoCount: 2, // 进化同时种两株
  plantGap: 56, // 进化双株间距
};

// ---------- 宝箱装箱 ----------
// 件数 1 常见 / 3、5 稀有惊喜；每件按 进化 > 规则卡 > 升级 > 金币 优先级装箱
export const CHEST = {
  tripleChance: 0.2, // 开出 3 件的概率
  pentaChance: 0.05, // 开出 5 件的概率（先判 5 再判 3，其余 1 件）
  goldCoins: 30, // 金币件面值（受金币获取加成；升级候选耗尽时按件兜底）
  goldHeal: 30,
};
