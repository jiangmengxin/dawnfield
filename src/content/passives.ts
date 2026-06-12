// 被动元数据与数值（纯数据层，禁止依赖 Phaser）
import type { PassiveId } from './ids';

export const PASSIVE_MAX_LEVEL = 5;

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
  { id: 'ladybug', color: 0xf09898, icon: 'icon_ladybug' },
  { id: 'honey',   color: 0xf0c878, icon: 'icon_honey' },
  // M6
  { id: 'acorn',    color: 0xc09858, icon: 'icon_acorn' },
  { id: 'stardust', color: 0xa8b4e8, icon: 'icon_stardust' },
  { id: 'sprout',   color: 0xa8d890, icon: 'icon_sprout' },
  { id: 'pouch',    color: 0xd8b060, icon: 'icon_pouch' },
  // M7
  { id: 'feather',  color: 0xc8dce8, icon: 'icon_feather' },
  { id: 'snack',    color: 0xe89098, icon: 'icon_snack' },
  { id: 'whistle',  color: 0x98c878, icon: 'icon_whistle' },
  { id: 'trellis',  color: 0xb898d0, icon: 'icon_trellis' },
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
  ladybugCrit: 0.04, // 暴击率 +4%/级
  honeyRegen: 0.5,   // 每秒回复 +0.5/级
  acornArmor: 1,     // 受到伤害 -1/级
  stardustProj: 0.1, // 弹速 +10%/级
  sproutXp: 0.08,    // 经验获取 +8%/级
  pouchCoin: 0.1,    // 金币获取 +10%/级
  featherMove: 0.06,   // 移速 +6%/级
  snackHp: 10,         // 生命上限 +10/级（获得时同时回复）
  snackRegen: 0.2,     // 每秒回复 +0.2/级
  whistleArea: 0.06,   // 范围 +6%/级
  whistleProj: 0.06,   // 弹速 +6%/级
  trellisMagnet: 0.15, // 磁吸 +15%/级
  trellisXp: 0.04,     // 经验获取 +4%/级
};
