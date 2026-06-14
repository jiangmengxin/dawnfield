// 商店永久强化表（纯数据层，禁止依赖 Phaser）
// M23 长期成长：基础花圃 + 进阶工坊 + 地图精研；金币单货币，可全额重置返还。
import type { AchievementId, MapId, PowerUpId } from './ids';
import { MAPS } from './maps';

export type ShopTabId = 'basic' | 'advanced' | 'maps';
export type ShopGroupKey =
  | 'shop_grpControl' | 'shop_grpCombat' | 'shop_grpEconomy'
  | 'shop_grpAdvCombat' | 'shop_grpAdvSurvive' | 'shop_grpAdvControl' | 'shop_grpAdvResource'
  | 'shop_grpMap';
export type MapMasteryKind = 'survey' | 'tune' | 'keepsake';
export type ShopBuyMode = 'one' | 'node' | 'max';

export interface PowerUpSpec {
  id: PowerUpId;
  icon: string; // 纹理 key
  max: number; // 最高等级
  base: number; // 第 n 级（0 起）价格 = base × (n+1)，除非显式 costs 覆盖
  costs?: number[];
}

export type ShopUnlockSpec =
  | { kind: 'always' }
  | { kind: 'advanced' }
  | { kind: 'mapUnlocked'; mapId: MapId }
  | { kind: 'mapClear'; mapId: MapId }
  | { kind: 'mapChallenge'; mapId: MapId };

export interface ShopUpgradeSpec extends PowerUpSpec {
  tab: ShopTabId;
  groupKey: ShopGroupKey;
  titleKey: string;
  descKey: string;
  unlock: ShopUnlockSpec;
  mapId?: MapId;
  mastery?: MapMasteryKind;
  color?: number;
}

export interface ShopTabSpec {
  id: ShopTabId;
  labelKey: string;
  descKey: string;
}

export interface ShopProgressView {
  achievements: string[];
  unlocked: { maps: string[] };
  hyper: Partial<Record<MapId, number>>;
  endless: Partial<Record<MapId, { cycle: number }>>;
  settings?: { unlockAll?: boolean };
}

export interface ShopBulkPlan {
  levels: number;
  cost: number;
  targetLevel: number;
  lockedAt: number;
}

export interface MapMasteryBonus {
  coinGain: number; // 本图金币乘区增量
  dropRate: number; // 本图掉落道具掉率增量
  mechanicEase: number; // 本图机制舒适度 0..1，系统按语义削弱压力
  globalCoinGain: number; // 纪念物提供的极小全局金币增量
}

export const SHOP_TABS: ShopTabSpec[] = [
  { id: 'basic', labelKey: 'shop_tabBasic', descKey: 'shop_tabBasic_d' },
  { id: 'advanced', labelKey: 'shop_tabAdvanced', descKey: 'shop_tabAdvanced_d' },
  { id: 'maps', labelKey: 'shop_tabMaps', descKey: 'shop_tabMaps_d' },
];

// M10/M12/M19 基础池：旧 ID、旧效果和旧价格全部保留。总池 = 9,195 金币。
export const POWERUPS: PowerUpSpec[] = [
  { id: 'revive',   icon: 'icon_revive',  max: 2, base: 600, costs: [600, 900] },
  { id: 'reroll',   icon: 'icon_reroll',  max: 3, base: 120, costs: [120, 240, 360] },
  { id: 'banish',   icon: 'icon_banish',  max: 3, base: 100, costs: [100, 200, 300] },
  { id: 'skip',     icon: 'icon_skip',    max: 2, base: 60,  costs: [60, 120] },
  { id: 'power',    icon: 'icon_power',   max: 8, base: 10 },
  { id: 'vitality', icon: 'icon_heal',    max: 8, base: 10 },
  { id: 'haste',    icon: 'icon_lens',    max: 8, base: 12 },
  { id: 'area',     icon: 'icon_cloud',   max: 8, base: 12 },
  { id: 'speed',    icon: 'icon_wind',    max: 5, base: 10 },
  { id: 'magnet',   icon: 'icon_battery', max: 5, base: 8 },
  { id: 'growth',   icon: 'icon_growth',  max: 8, base: 8 },
  { id: 'greed',    icon: 'icon_greed',   max: 5, base: 8 },
  { id: 'armor',    icon: 'icon_armor',   max: 3, base: 15 },
  { id: 'regen',    icon: 'icon_regen',   max: 3, base: 15 },
  { id: 'luck',     icon: 'icon_luck',    max: 8, base: 12 },
  { id: 'fortune',  icon: 'chest',        max: 5, base: 25, costs: [25, 50, 90, 140, 200] },
];

const ADV_COSTS = [150, 300, 600, 900];
const MAP_SURVEY_COSTS = [120, 240, 480];
const MAP_TUNE_COSTS = [160, 320, 640];
const MAP_KEEP_COSTS = [520];

const BASIC_GROUPS: Array<{ key: ShopGroupKey; ids: PowerUpId[] }> = [
  { key: 'shop_grpControl', ids: ['revive', 'reroll', 'banish', 'skip'] },
  { key: 'shop_grpCombat', ids: ['power', 'vitality', 'haste', 'area', 'speed', 'armor', 'regen', 'luck'] },
  { key: 'shop_grpEconomy', ids: ['magnet', 'growth', 'greed', 'fortune'] },
];

const basicGroup = (id: PowerUpId): ShopGroupKey => BASIC_GROUPS.find((g) => g.ids.includes(id))?.key ?? 'shop_grpCombat';

const ADVANCED_POWERUPS: ShopUpgradeSpec[] = [
  { id: 'adv_power',    icon: 'icon_power',   max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvCombat', titleKey: 'pu_adv_power', descKey: 'pu_adv_power_d', unlock: { kind: 'advanced' } },
  { id: 'adv_haste',    icon: 'icon_lens',    max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvCombat', titleKey: 'pu_adv_haste', descKey: 'pu_adv_haste_d', unlock: { kind: 'advanced' } },
  { id: 'adv_area',     icon: 'icon_cloud',   max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvCombat', titleKey: 'pu_adv_area', descKey: 'pu_adv_area_d', unlock: { kind: 'advanced' } },
  { id: 'adv_luck',     icon: 'icon_luck',    max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvCombat', titleKey: 'pu_adv_luck', descKey: 'pu_adv_luck_d', unlock: { kind: 'advanced' } },
  { id: 'adv_vitality', icon: 'icon_heal',    max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvSurvive', titleKey: 'pu_adv_vitality', descKey: 'pu_adv_vitality_d', unlock: { kind: 'advanced' } },
  { id: 'adv_armor',    icon: 'icon_armor',   max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvSurvive', titleKey: 'pu_adv_armor', descKey: 'pu_adv_armor_d', unlock: { kind: 'advanced' } },
  { id: 'adv_regen',    icon: 'icon_regen',   max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvSurvive', titleKey: 'pu_adv_regen', descKey: 'pu_adv_regen_d', unlock: { kind: 'advanced' } },
  { id: 'adv_speed',    icon: 'icon_wind',    max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvSurvive', titleKey: 'pu_adv_speed', descKey: 'pu_adv_speed_d', unlock: { kind: 'advanced' } },
  { id: 'adv_reroll',   icon: 'icon_reroll',  max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvControl', titleKey: 'pu_adv_reroll', descKey: 'pu_adv_reroll_d', unlock: { kind: 'advanced' } },
  { id: 'adv_banish',   icon: 'icon_banish',  max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvControl', titleKey: 'pu_adv_banish', descKey: 'pu_adv_banish_d', unlock: { kind: 'advanced' } },
  { id: 'adv_skip',     icon: 'icon_skip',    max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvControl', titleKey: 'pu_adv_skip', descKey: 'pu_adv_skip_d', unlock: { kind: 'advanced' } },
  { id: 'adv_revive',   icon: 'icon_revive',  max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvControl', titleKey: 'pu_adv_revive', descKey: 'pu_adv_revive_d', unlock: { kind: 'advanced' } },
  { id: 'adv_magnet',   icon: 'icon_battery', max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvResource', titleKey: 'pu_adv_magnet', descKey: 'pu_adv_magnet_d', unlock: { kind: 'advanced' } },
  { id: 'adv_growth',   icon: 'icon_growth',  max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvResource', titleKey: 'pu_adv_growth', descKey: 'pu_adv_growth_d', unlock: { kind: 'advanced' } },
  { id: 'adv_greed',    icon: 'icon_greed',   max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvResource', titleKey: 'pu_adv_greed', descKey: 'pu_adv_greed_d', unlock: { kind: 'advanced' } },
  { id: 'adv_fortune',  icon: 'chest',        max: 4, base: 150, costs: ADV_COSTS, tab: 'advanced', groupKey: 'shop_grpAdvResource', titleKey: 'pu_adv_fortune', descKey: 'pu_adv_fortune_d', unlock: { kind: 'advanced' } },
];

export const MAP_CLEAR_ACHIEVEMENTS: Record<MapId, AchievementId> = {
  meadow: 'meadowClear',
  pond: 'pondClear',
  hills: 'hillsClear',
  grove: 'groveClear',
  lavender: 'lavenderClear',
  bramble: 'brambleClear',
  nocturne: 'nocturneClear',
  summit: 'summitClear',
  orchard: 'orchardClear',
  snowbell: 'snowbellClear',
  mirage: 'mirageClear',
  clockwork: 'clockworkClear',
};

export function mapMasteryId(mapId: MapId, kind: MapMasteryKind): PowerUpId {
  return ('map_' + mapId + '_' + kind) as PowerUpId;
}

const MAP_MASTERY_POWERUPS: ShopUpgradeSpec[] = MAPS.flatMap((m) => [
  {
    id: mapMasteryId(m.id, 'survey'), icon: m.icon, max: 3, base: 120, costs: MAP_SURVEY_COSTS,
    tab: 'maps', groupKey: 'shop_grpMap', titleKey: 'pu_' + mapMasteryId(m.id, 'survey'),
    descKey: 'pu_' + mapMasteryId(m.id, 'survey') + '_d', unlock: { kind: 'mapUnlocked', mapId: m.id },
    mapId: m.id, mastery: 'survey', color: m.color,
  },
  {
    id: mapMasteryId(m.id, 'tune'), icon: m.icon, max: 3, base: 160, costs: MAP_TUNE_COSTS,
    tab: 'maps', groupKey: 'shop_grpMap', titleKey: 'pu_' + mapMasteryId(m.id, 'tune'),
    descKey: 'pu_' + mapMasteryId(m.id, 'tune') + '_d', unlock: { kind: 'mapClear', mapId: m.id },
    mapId: m.id, mastery: 'tune', color: m.color,
  },
  {
    id: mapMasteryId(m.id, 'keepsake'), icon: m.icon, max: 1, base: 520, costs: MAP_KEEP_COSTS,
    tab: 'maps', groupKey: 'shop_grpMap', titleKey: 'pu_' + mapMasteryId(m.id, 'keepsake'),
    descKey: 'pu_' + mapMasteryId(m.id, 'keepsake') + '_d', unlock: { kind: 'mapChallenge', mapId: m.id },
    mapId: m.id, mastery: 'keepsake', color: m.color,
  },
]);

export const SHOP_UPGRADES: ShopUpgradeSpec[] = [
  ...POWERUPS.map((s): ShopUpgradeSpec => ({
    ...s,
    tab: 'basic',
    groupKey: basicGroup(s.id),
    titleKey: 'pu_' + s.id,
    descKey: 'pu_' + s.id + '_d',
    unlock: { kind: 'always' },
  })),
  ...ADVANCED_POWERUPS,
  ...MAP_MASTERY_POWERUPS,
];

export function getShopUpgrade(id: PowerUpId): ShopUpgradeSpec | undefined {
  return SHOP_UPGRADES.find((s) => s.id === id);
}

/** 第 lv 级（0 起）→ lv+1 级的价格。 */
export function powerUpPrice(spec: PowerUpSpec, lv: number): number {
  if (spec.costs) return spec.costs[Math.min(lv, spec.costs.length - 1)];
  return spec.base * (lv + 1) * (lv >= 5 ? lv - 3 : 1);
}

export function totalCostFor(spec: PowerUpSpec, lv = spec.max): number {
  let sum = 0;
  for (let i = 0; i < Math.min(lv, spec.max); i++) sum += powerUpPrice(spec, i);
  return sum;
}

export function getShopTotalCost(tab?: ShopTabId): number {
  return SHOP_UPGRADES
    .filter((s) => !tab || s.tab === tab)
    .reduce((sum, s) => sum + totalCostFor(s), 0);
}

export function getShopSpent(levels: Partial<Record<PowerUpId, number>>, tab?: ShopTabId): number {
  let sum = 0;
  for (const spec of SHOP_UPGRADES) {
    if (tab && spec.tab !== tab) continue;
    sum += totalCostFor(spec, levels[spec.id] ?? 0);
  }
  return sum;
}

function hasClear(view: ShopProgressView, mapId: MapId): boolean {
  return !!view.settings?.unlockAll
    || view.achievements.includes(MAP_CLEAR_ACHIEVEMENTS[mapId])
    || (view.hyper[mapId] ?? 0) > 0;
}

function hasMapChallenge(view: ShopProgressView, mapId: MapId): boolean {
  return !!view.settings?.unlockAll || (view.hyper[mapId] ?? 0) >= 1 || (view.endless[mapId]?.cycle ?? 0) >= 3;
}

export function getClearedMapCount(view: ShopProgressView): number {
  if (view.settings?.unlockAll) return MAPS.length;
  return MAPS.filter((m) => hasClear(view, m.id)).length;
}

export function getAdvancedLevelCap(view: ShopProgressView): number {
  const clears = getClearedMapCount(view);
  let cap = 0;
  if (clears >= 1) cap = 1;
  if (clears >= 4) cap = 2;
  if (clears >= 8) cap = 3;
  if (MAPS.some((m) => hasMapChallenge(view, m.id))) cap = 4;
  return cap;
}

export function getUnlockedLevelCap(spec: ShopUpgradeSpec, view: ShopProgressView): number {
  const u = spec.unlock;
  if (u.kind === 'always') return spec.max;
  if (u.kind === 'advanced') return Math.min(spec.max, getAdvancedLevelCap(view));
  if (u.kind === 'mapUnlocked') return view.settings?.unlockAll || view.unlocked.maps.includes(u.mapId) ? spec.max : 0;
  if (u.kind === 'mapClear') return hasClear(view, u.mapId) ? spec.max : 0;
  return hasMapChallenge(view, u.mapId) ? spec.max : 0;
}

export function getNextShopUnlock(view: ShopProgressView): { key: string; n?: number } | null {
  const cap = getAdvancedLevelCap(view);
  if (cap === 0) return { key: 'shop_goalFirstClear' };
  if (cap === 1) return { key: 'shop_goalClearCount', n: 4 };
  if (cap === 2) return { key: 'shop_goalClearCount', n: 8 };
  if (cap === 3) return { key: 'shop_goalChallenge' };
  if (!view.settings?.unlockAll && MAPS.some((m) => !view.unlocked.maps.includes(m.id))) return { key: 'shop_goalUnlockMaps' };
  const lockedMap = MAPS.find((m) => view.unlocked.maps.includes(m.id) && !hasMapChallenge(view, m.id));
  return lockedMap ? { key: 'shop_goalMapChallenge' } : null;
}

function nextMilestone(spec: ShopUpgradeSpec, lv: number): number {
  if (spec.tab === 'basic' && spec.max >= 8) return lv < 5 ? 5 : spec.max;
  if (spec.tab === 'maps' && spec.mastery !== 'keepsake') return spec.max;
  return lv + 1;
}

export function getAffordableBulkBuy(
  spec: ShopUpgradeSpec,
  currentLevel: number,
  coins: number,
  unlockedCap: number,
  mode: ShopBuyMode = 'one',
): ShopBulkPlan {
  const lockedAt = Math.min(spec.max, unlockedCap);
  const desired = mode === 'one' ? currentLevel + 1 : mode === 'node' ? nextMilestone(spec, currentLevel) : spec.max;
  const target = Math.min(spec.max, lockedAt, desired);
  let cost = 0;
  let levels = 0;
  for (let lv = currentLevel; lv < target; lv++) {
    const price = powerUpPrice(spec, lv);
    if (cost + price > coins) break;
    cost += price;
    levels++;
  }
  return { levels, cost, targetLevel: currentLevel + levels, lockedAt };
}

// 每级效果数值（调参只改此处）
export const POWERUP_FX = {
  power: 0.04,
  vitality: 10,
  haste: 0.025,
  area: 0.04,
  speed: 0.025,
  magnet: 0.12,
  growth: 0.04,
  greed: 0.12,
  armor: 1,
  regen: 0.3,
  luck: 0.02,
  fortune: 0.2,
  advPower: 0.015,
  advVitality: 5,
  advHaste: 0.0075,
  advArea: 0.015,
  advSpeed: 0.0075,
  advMagnet: 0.04,
  advGrowth: 0.015,
  advGreed: 0.02,
  advArmor: 0.25,
  advRegen: 0.08,
  advLuck: 0.005,
  advFortune: 0.05,
  mapSurveyCoin: 0.03,
  mapSurveyDrop: 0.04,
  mapTuneEase: 0.08,
  mapKeepsakeCoin: 0.0025,
};

/** 永久强化聚合加成（RunState.computeStats 消费） */
export interface PowerUpBonus {
  dmg: number;
  hp: number;
  cdMul: number;
  area: number;
  speed: number;
  magnet: number;
  xpGain: number;
  coinGain: number;
  armor: number;
  regen: number;
  crit: number;
  dropRate: number;
  rerolls: number;
  banishes: number;
  skips: number;
  revives: number;
}

export function powerUpBonus(levels: Partial<Record<PowerUpId, number>>): PowerUpBonus {
  const lv = (id: PowerUpId): number => levels[id] ?? 0;
  return {
    dmg: POWERUP_FX.power * lv('power') + POWERUP_FX.advPower * lv('adv_power'),
    hp: POWERUP_FX.vitality * lv('vitality') + POWERUP_FX.advVitality * lv('adv_vitality'),
    cdMul: 1 - POWERUP_FX.haste * lv('haste') - POWERUP_FX.advHaste * lv('adv_haste'),
    area: POWERUP_FX.area * lv('area') + POWERUP_FX.advArea * lv('adv_area'),
    speed: POWERUP_FX.speed * lv('speed') + POWERUP_FX.advSpeed * lv('adv_speed'),
    magnet: POWERUP_FX.magnet * lv('magnet') + POWERUP_FX.advMagnet * lv('adv_magnet'),
    xpGain: POWERUP_FX.growth * lv('growth') + POWERUP_FX.advGrowth * lv('adv_growth'),
    coinGain: POWERUP_FX.greed * lv('greed') + POWERUP_FX.advGreed * lv('adv_greed'),
    armor: POWERUP_FX.armor * lv('armor') + POWERUP_FX.advArmor * lv('adv_armor'),
    regen: POWERUP_FX.regen * lv('regen') + POWERUP_FX.advRegen * lv('adv_regen'),
    crit: POWERUP_FX.luck * lv('luck') + POWERUP_FX.advLuck * lv('adv_luck'),
    dropRate: POWERUP_FX.fortune * lv('fortune') + POWERUP_FX.advFortune * lv('adv_fortune'),
    rerolls: Math.floor(lv('adv_reroll') / 2),
    banishes: Math.floor(lv('adv_banish') / 2),
    skips: Math.floor(lv('adv_skip') / 2),
    revives: lv('adv_revive') >= 4 ? 1 : 0,
  };
}

export function getMapMasteryBonus(levels: Partial<Record<PowerUpId, number>>, mapId?: MapId): MapMasteryBonus {
  const keepsakes = MAPS.reduce((sum, m) => sum + (levels[mapMasteryId(m.id, 'keepsake')] ?? 0), 0);
  const survey = mapId ? levels[mapMasteryId(mapId, 'survey')] ?? 0 : 0;
  const tune = mapId ? levels[mapMasteryId(mapId, 'tune')] ?? 0 : 0;
  return {
    coinGain: POWERUP_FX.mapSurveyCoin * survey,
    dropRate: POWERUP_FX.mapSurveyDrop * survey,
    mechanicEase: POWERUP_FX.mapTuneEase * tune,
    globalCoinGain: POWERUP_FX.mapKeepsakeCoin * keepsakes,
  };
}
