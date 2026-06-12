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
};
