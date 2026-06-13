// 一次性掉落道具数据表（M19，纯数据层，禁止依赖 Phaser）
// VS 式踩到即触发：瞬发型立即结算，持续型立刻开始计时（HUD 显示倒计时）。
// 效果实现在 systems/dropItems.ts（DROP_EFFECTS）；图标在 gfx/textures/misc.ts 按本表生成。
import type { DropItemId } from './ids';

/** 图标字形（gfx 侧据此画白色徽记，配 spec.color 玻璃质令牌底） */
export type DropGlyph =
  | 'magnet' | 'burst' | 'clock' | 'heart' | 'wind' | 'shield' | 'star'
  | 'leaf' | 'drop' | 'wave' | 'swirl' | 'bee' | 'moon' | 'flame' | 'beacon';

export interface DropItemSpec {
  id: DropItemId;
  icon: string; // 贴图 key（= 'drop_' + id）
  color: number; // 令牌底/粒子主题色
  glyph: DropGlyph; // 图标徽记
  scope: 'common' | 'map'; // 通用池 / 地图专属（由 MapSpec.drops 提供）
  weight: number; // 同池内相对掉落权重
  kind: 'instant' | 'timed';
  dur?: number; // 持续型时长（秒）
  // 以下为效果调参（按 id 取用；× 玩家属性在 handler 内处理）
  dmg?: number; // 基础伤害（× stats.dmg）
  heal?: number; // 回血量（瞬发）/ 每秒回血（持续 onTick）
  xp?: number; // 立即获得经验
  radius?: number; // 效果半径
  kb?: number; // 击退力度
  cdMul?: number; // 攻速 buff（冷却乘子 <1）
  moveMul?: number; // 移速 buff（>1）
  dmgMul?: number; // 伤害 buff（>1）
  areaMul?: number; // 范围 buff（>1）
  gemN?: number; // 散落经验团数量
  gemV?: number; // 单团经验值
}

/** 各掉落来源的基础概率（× run.dropRateMul 由商店 fortune 提升） */
export const DROP_RATES = {
  kill: 0.006, // 普通敌人击杀掉通用道具（移除可破坏容器后小幅上调补偿）
  eliteCommon: 0.55, // 精英额外掉通用道具
  bossCommon: 1, // Boss（无尽）必掉通用道具
  mapDrop: 0.3, // 地图机制产物掉专属道具
} as const;

export const DROP_ITEMS: Record<DropItemId, DropItemSpec> = {
  // ---------- 通用道具 ----------
  magnet:   { id: 'magnet',   icon: 'drop_magnet',   color: 0x6ec0e8, glyph: 'magnet', scope: 'common', weight: 12, kind: 'instant' },
  nuke:     { id: 'nuke',     icon: 'drop_nuke',     color: 0xf08850, glyph: 'burst',  scope: 'common', weight: 8,  kind: 'instant', dmg: 240, radius: 560, kb: 280 },
  timestop: { id: 'timestop', icon: 'drop_timestop', color: 0x9aa8e0, glyph: 'clock',  scope: 'common', weight: 5,  kind: 'timed', dur: 4 },
  heal:     { id: 'heal',     icon: 'drop_heal',     color: 0xf08898, glyph: 'heart',  scope: 'common', weight: 11, kind: 'instant', heal: 60 },
  frenzy:   { id: 'frenzy',   icon: 'drop_frenzy',   color: 0xf0c860, glyph: 'wind',   scope: 'common', weight: 8,  kind: 'timed', dur: 8, cdMul: 0.55, moveMul: 1.3 },
  aegis:    { id: 'aegis',    icon: 'drop_aegis',    color: 0xe8d878, glyph: 'shield', scope: 'common', weight: 6,  kind: 'timed', dur: 5 },
  xpburst:  { id: 'xpburst',  icon: 'drop_xpburst',  color: 0xc0a8f0, glyph: 'star',   scope: 'common', weight: 10, kind: 'instant', xp: 80, gemN: 5, gemV: 4 },

  // ---------- meadow 晨光草甸（bloomfield） ----------
  bloomburst: { id: 'bloomburst', icon: 'drop_bloomburst', color: 0xf6b8c8, glyph: 'burst', scope: 'map', weight: 1, kind: 'instant', heal: 30, gemN: 10, gemV: 5, radius: 220 },
  verdant:    { id: 'verdant',    icon: 'drop_verdant',    color: 0x9ad07a, glyph: 'leaf',  scope: 'map', weight: 1, kind: 'timed', dur: 8, heal: 8 },

  // ---------- pond 露珠池塘（tide） ----------
  ebbaegis: { id: 'ebbaegis', icon: 'drop_ebbaegis', color: 0x78c0d8, glyph: 'drop', scope: 'map', weight: 1, kind: 'timed', dur: 6, radius: 520 },
  ripple:   { id: 'ripple',   icon: 'drop_ripple',   color: 0x88c8e8, glyph: 'wave', scope: 'map', weight: 1, kind: 'instant', dmg: 60, radius: 600, kb: 620 },

  // ---------- hills 晚霞山岗（wind） ----------
  tailwind:  { id: 'tailwind',  icon: 'drop_tailwind',  color: 0xd8e09a, glyph: 'wind',  scope: 'map', weight: 1, kind: 'timed', dur: 8, moveMul: 1.5, cdMul: 0.8 },
  whirlwind: { id: 'whirlwind', icon: 'drop_whirlwind', color: 0xb8d8c0, glyph: 'swirl', scope: 'map', weight: 1, kind: 'instant', dmg: 120, radius: 420, kb: 260 },

  // ---------- grove 萤暮林地（sporechain） ----------
  sporebloom: { id: 'sporebloom', icon: 'drop_sporebloom', color: 0x9ac888, glyph: 'burst', scope: 'map', weight: 1, kind: 'instant', dmg: 30, radius: 320 },
  fireflies:  { id: 'fireflies',  icon: 'drop_fireflies',  color: 0xf0e088, glyph: 'star',  scope: 'map', weight: 1, kind: 'timed', dur: 8 },

  // ---------- lavender 紫露花田（pollen） ----------
  pollenfrenzy: { id: 'pollenfrenzy', icon: 'drop_pollenfrenzy', color: 0xc8a8e0, glyph: 'flame', scope: 'map', weight: 1, kind: 'timed', dur: 8, dmgMul: 1.6, areaMul: 1.25 },
  beeswarm:     { id: 'beeswarm',     icon: 'drop_beeswarm',     color: 0xf0c860, glyph: 'bee',   scope: 'map', weight: 1, kind: 'timed', dur: 8, dmg: 22, radius: 240 },

  // ---------- bramble 莓果灌丛（thornwall） ----------
  thornnova:  { id: 'thornnova',  icon: 'drop_thornnova',  color: 0xc86880, glyph: 'burst', scope: 'map', weight: 1, kind: 'instant', dmg: 150, radius: 360, kb: 420 },
  berryfeast: { id: 'berryfeast', icon: 'drop_berryfeast', color: 0xd86890, glyph: 'heart', scope: 'map', weight: 1, kind: 'instant', heal: 70 },

  // ---------- nocturne 星语夜原（nightfall） ----------
  fullmoon: { id: 'fullmoon', icon: 'drop_fullmoon', color: 0xe8e8f0, glyph: 'moon',  scope: 'map', weight: 1, kind: 'timed', dur: 8, moveMul: 1.15 },
  meteor:   { id: 'meteor',   icon: 'drop_meteor',   color: 0xa8b4e8, glyph: 'star',  scope: 'map', weight: 1, kind: 'instant', dmg: 90, radius: 480 },

  // ---------- summit 破晓之巅（beacon） ----------
  beaconsurge: { id: 'beaconsurge', icon: 'drop_beaconsurge', color: 0xf0d878, glyph: 'beacon', scope: 'map', weight: 1, kind: 'instant', dmg: 80, radius: 600 },
  dawnnova:    { id: 'dawnnova',    icon: 'drop_dawnnova',    color: 0xfff2c0, glyph: 'flame',  scope: 'map', weight: 1, kind: 'instant', dmg: 200, radius: 640 },
};

/** 通用道具池（击杀/场景物/精英来源按 weight 加权抽取） */
export const COMMON_DROPS: DropItemId[] = (Object.keys(DROP_ITEMS) as DropItemId[])
  .filter((id) => DROP_ITEMS[id].scope === 'common');

/** 全部掉落道具 id（图鉴遍历用，保持声明顺序） */
export const ALL_DROPS: DropItemId[] = Object.keys(DROP_ITEMS) as DropItemId[];

/** 按 weight 从给定池加权随机一项（rng 注入，遵循 M17 种子契约） */
export function weightedDrop(pool: DropItemId[], rng: () => number): DropItemId {
  let total = 0;
  for (const id of pool) total += DROP_ITEMS[id].weight;
  let r = rng() * total;
  for (const id of pool) {
    r -= DROP_ITEMS[id].weight;
    if (r <= 0) return id;
  }
  return pool[pool.length - 1];
}

/** 通用池加权抽取（击杀/场景物/精英来源） */
export function rollCommonDrop(rng: () => number): DropItemId {
  return weightedDrop(COMMON_DROPS, rng);
}
