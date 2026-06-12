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

// ---------- 宝箱分层 ----------
// 可进化 → 进化；否则 → 已持有武器升级 ×N；无可升级 → 金币（M3 前以经验+治疗代币）
export const CHEST = {
  upgradeCount: 1, // 无进化时的升级次数
  goldXp: 80,
  goldHeal: 30,
};
