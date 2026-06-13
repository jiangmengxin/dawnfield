// 规则卡 Arcana 元数据与数值（纯数据层，禁止依赖 Phaser）
// 行为实现在 systems/arcana.ts 的 createArcanaModifier（RunModifier 六钩子）；调参只改此处
import type { ArcanaId } from './ids';

export interface ArcanaMeta {
  id: ArcanaId;
  color: number;
  icon: string; // 纹理 key
  /** M13 分级：basic 恒在池；mechanic 成就解锁后入池（isArcanaUnlocked 查 unlockArcana 挂钩） */
  tier: 'basic' | 'mechanic';
}

export const ARCANA_META: ArcanaMeta[] = [
  { id: 'petaltide',  color: 0xf8a8c0, icon: 'icon_arc_petaltide',  tier: 'basic' },
  { id: 'tailwind',   color: 0xa8d8c0, icon: 'icon_arc_tailwind',   tier: 'basic' },
  { id: 'thornlace',  color: 0xe88898, icon: 'icon_arc_thornlace',  tier: 'basic' },
  { id: 'goldbell',   color: 0xf0c860, icon: 'icon_arc_goldbell',   tier: 'basic' },
  { id: 'starpop',    color: 0xb0bce8, icon: 'icon_arc_starpop',    tier: 'basic' },
  { id: 'moonheart',  color: 0x9aa8d8, icon: 'icon_arc_moonheart',  tier: 'basic' },
  { id: 'dewspring',  color: 0x90c8e8, icon: 'icon_arc_dewspring',  tier: 'basic' },
  { id: 'fireflyway', color: 0xc8d878, icon: 'icon_arc_fireflyway', tier: 'basic' },
  { id: 'compass',    color: 0xd8b060, icon: 'icon_arc_compass',    tier: 'basic' },
  { id: 'onepath',    color: 0xb898d0, icon: 'icon_arc_onepath',    tier: 'basic' },
  // M21 扩展常驻卡（全机制化）
  { id: 'frost',      color: 0xbfe3f0, icon: 'icon_arc_frost',      tier: 'basic' },
  { id: 'harvest',    color: 0xe8c878, icon: 'icon_arc_harvest',    tier: 'basic' },
  // ---------- M13 机制卡（拿了之后整局打法都变；成就解锁，见 achievements.ts unlockArcana） ----------
  { id: 'splinter',   color: 0xf0d878, icon: 'icon_arc_splinter',   tier: 'mechanic' },
  { id: 'thorncore',  color: 0xd87884, icon: 'icon_arc_thorncore',  tier: 'mechanic' },
  { id: 'vow',        color: 0xe89860, icon: 'icon_arc_vow',        tier: 'mechanic' },
  { id: 'allin',      color: 0xb890d8, icon: 'icon_arc_allin',      tier: 'mechanic' },
  { id: 'slowburn',   color: 0x90b8e0, icon: 'icon_arc_slowburn',   tier: 'mechanic' },
  { id: 'dawnfield',  color: 0xf2cf6e, icon: 'icon_arc_dawnfield',  tier: 'mechanic' },
  // M21 扩展机制卡（成就解锁，见 achievements.ts unlockArcana）
  { id: 'starfall',      color: 0x9fb0e8, icon: 'icon_arc_starfall',      tier: 'mechanic' },
  { id: 'constellation', color: 0xc8b8f0, icon: 'icon_arc_constellation', tier: 'mechanic' },
  { id: 'daynight',      color: 0x8fb0d8, icon: 'icon_arc_daynight',      tier: 'mechanic' },
  { id: 'rooted',        color: 0x9ad07a, icon: 'icon_arc_rooted',        tier: 'mechanic' },
  { id: 'everbloom',     color: 0xf6b8c8, icon: 'icon_arc_everbloom',     tier: 'mechanic' },
  { id: 'knell',         color: 0xe0c060, icon: 'icon_arc_knell',         tier: 'mechanic' },
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
  petaltideVuln: 1.18, // 花环内敌人受伤乘子（易伤光环）
  petaltideRingK: 0.9, // 花环半径 = 磁吸 ×K
  tailwindMove: 1.12, // 移速 ×1.12
  tailwindCd: 0.9, // 冷却 ×0.9
  tailwindGust: 0.3, // 风势满层增伤/弹速上限（+30%）
  tailwindRamp: 0.6, // 每秒风势爬升（约 1.7s 满）
  thornlaceCrit: 0.1, // 暴击率 +10%
  thornlaceDmg: 1.08, // 伤害 ×1.08
  thornlaceBleedDur: 3, // 暴击流血持续（秒）
  thornlaceBleedK: 0.4, // 每秒流血 = 该次暴击伤害 ×K
  thornlaceTick: 0.5, // 流血结算周期（秒）
  thornlaceBurstN: 2, // 流血敌死亡迸裂尖刺枚数
  thornlaceBurstDmg: 14, // 迸裂尖刺伤害 ×stats.dmg
  thornlaceBurstR: 180, // 迸裂索敌半径
  goldbellCoin: 1.25, // 金币获取 ×1.25
  goldbellSonicEvery: 8, // 金铃声波所需拾币枚数
  goldbellSonicR: 200, // 声波半径
  goldbellSonicDmg: 30, // 声波伤害 ×stats.dmg
  goldbellSonicKb: 220, // 声波击退
  goldbellSonicCoins: 3, // 声波撒落金币枚数
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
  fireflyN: 3, // 环绕萤火数量
  fireflyOrbitR: 46, // 公转半径
  fireflyEveryHit: 0.8, // 萤火扑击间隔（秒）
  fireflySeekR: 220, // 扑击索敌半径
  fireflyDmgK: 0.5, // 萤火伤害 = stats.dmg ×K
  compassGoldMul: 2, // 宝箱金币层 ×2
  onepathCd: 0.92, // 冷却 ×0.92
  // ---------- M13 机制卡 ----------
  splinterChance: 0.25, // 武器命中触发概率
  splinterN: 3, // 光屑枚数
  splinterDmgK: 0.35, // 光屑伤害 = 本次命中 ×0.35
  splinterSeekR: 260, // 索敌半径
  thorncoreThreshold: 0.35, // 蓄能阈值 = 最大生命 ×0.35（按护甲前承伤累计）
  thorncoreBurstK: 8, // 爆发 = 累计承伤 ×8
  thorncoreCapDmg: 1500, // 爆发上限 ×stats.dmg（防狂暴/无尽高伤下爆炸失控）
  thorncoreR: 260, // 荆棘新星半径
  thorncoreKb: 320, // 新星击退
  vowDmg: 1.45, // 伤害 ×1.45
  vowArea: 1.15, // 范围 ×1.15
  vowHeartCoins: 2, // 爱心转金币面值
  allinCap: 4, // 武器槽上限
  allinCd: 0.6, // 全武器冷却 ×0.6
  slowburnCd: 1.6, // 冷却 ×1.6（"大招化"）
  slowburnDmg: 2.2, // 伤害 ×2.2
  slowburnArea: 1.25, // 范围 ×1.25
  dawnfieldDps: 6, // 域内每秒灼烧 ×stats.dmg
  dawnfieldRK: 0.9, // 领域半径 = 磁吸 ×0.9
  dawnfieldTick: 0.5, // 灼烧结算周期（秒）
  dawnfieldMagnet: 1.15, // 磁吸 ×1.15
  // ---------- M21 扩展卡 ----------
  frostR: 150, // 晨霜半径
  frostSlowDur: 2.5, // 减速区持续（秒；区内敌人减速由 ZoneSystem 固定 0.55×）
  frostCd: 4, // 内置冷却（秒，防连击刷屏）
  harvestChance: 0.25, // 拾取复制概率（金币/经验）
  starfallEvery: 6, // 坠星间隔（秒）
  starfallR: 180, // 坠星爆发半径
  starfallDmg: 80, // 坠星伤害 ×stats.dmg
  starfallKb: 220, // 坠星击退
  starfallSeekR: 600, // 选靶半径（落在最近敌人）
  constellationPer: 0.1, // 每把武器全员增伤（+10%/把）
  daynightEvery: 12, // 昼夜切换间隔（秒）
  daynightDayDmg: 1.25, // 昼：伤害 ×1.25
  daynightDayArea: 1.15, // 昼：范围 ×1.15
  daynightNightCd: 0.8, // 夜：冷却 ×0.8
  daynightNightCrit: 0.15, // 夜：暴击 +15%
  rootedDelay: 3, // 静止满 N 秒进入生根态
  rootedMove: 1.5, // 判定为「移动」的每帧位移阈值（像素/帧）
  rootedDmg: 1.6, // 生根态伤害 ×1.6
  rootedArea: 1.35, // 生根态范围 ×1.35
  everbloomThresholds: [0.5, 0.25] as number[], // 生命跌破阈值（各触发一次）
  everbloomR: 520, // 绽放清场半径
  everbloomDmg: 200, // 绽放伤害 ×stats.dmg
  everbloomKb: 260, // 绽放击退
  everbloomInvuln: 1.5, // 绽放后无敌时长（秒）
  knellEvery: 5, // 每第 N 次命中钟鸣
  knellR: 120, // 钟鸣回响半径
  knellK: 0.5, // 钟鸣回响伤害 = 该次命中 ×0.5
};
