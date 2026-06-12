// 规则卡 Arcana 元数据与数值（纯数据层，禁止依赖 Phaser）
// 行为实现在 systems/arcana.ts 的 createArcanaModifier（RunModifier 六钩子）；调参只改此处
import type { ArcanaId } from './ids';

export interface ArcanaMeta {
  id: ArcanaId;
  color: number;
  icon: string; // 纹理 key
}

export const ARCANA_META: ArcanaMeta[] = [
  { id: 'petaltide',  color: 0xf8a8c0, icon: 'icon_arc_petaltide' },
  { id: 'tailwind',   color: 0xa8d8c0, icon: 'icon_arc_tailwind' },
  { id: 'thornlace',  color: 0xe88898, icon: 'icon_arc_thornlace' },
  { id: 'goldbell',   color: 0xf0c860, icon: 'icon_arc_goldbell' },
  { id: 'starpop',    color: 0xb0bce8, icon: 'icon_arc_starpop' },
  { id: 'moonheart',  color: 0x9aa8d8, icon: 'icon_arc_moonheart' },
  { id: 'dewspring',  color: 0x90c8e8, icon: 'icon_arc_dewspring' },
  { id: 'fireflyway', color: 0xc8d878, icon: 'icon_arc_fireflyway' },
  { id: 'compass',    color: 0xd8b060, icon: 'icon_arc_compass' },
  { id: 'onepath',    color: 0xb898d0, icon: 'icon_arc_onepath' },
];

/** 获取规则：开局从全部未持有卡中任选 1（设置可关）；精英宝箱有概率再得，单局至多 maxPerRun 张 */
export const ARCANA = {
  maxPerRun: 3, // 单局持有上限（调试面板直给不受限）
  chestChance: 0.3, // 宝箱「再得一张」件概率（进化件之后；候选 = 全部未持有卡，与开局一致）
};

// 规则卡数值（卡牌平衡只改此处）
export const ARC_FX = {
  petaltideArea: 1.25, // 范围 ×1.25
  petaltideProj: 1.1, // 弹速 ×1.1
  tailwindMove: 1.12, // 移速 ×1.12
  tailwindCd: 0.9, // 冷却 ×0.9
  thornlaceCrit: 0.1, // 暴击率 +10%
  thornlaceDmg: 1.08, // 伤害 ×1.08
  goldbellCoin: 1.25, // 金币获取 ×1.25
  goldbellChance: 0.12, // 击杀掉币概率
  goldbellValue: 1, // 掉币面值
  starpopChance: 0.15, // 击杀星屑爆炸概率
  starpopR: 90, // 爆炸半径
  starpopDmg: 16, // 爆炸伤害（×stats.dmg）
  moonheartMax: 0.4, // 伤害加成上限
  moonheartK: 0.5, // 加成 = min(上限, 损失生命比例 × K)
  dewspringEvery: 25, // 涌泉间隔（秒）
  dewspringR: 70,
  dewspringDur: 6,
  dewspringHps: 8, // 每秒治疗
  fireflyMagnet: 1.35, // 磁吸 ×1.35
  fireflyEvery: 30, // 全场磁吸间隔（秒）
  compassGoldMul: 2, // 宝箱金币层 ×2
  onepathCd: 0.92, // 冷却 ×0.92
};
