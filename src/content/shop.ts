// 商店永久强化表（纯数据层，禁止依赖 Phaser）
// VS PowerUp 式：金币购买、逐级涨价、可随时全额重置返还
import type { PowerUpId } from './ids';

export interface PowerUpSpec {
  id: PowerUpId;
  icon: string; // 纹理 key
  max: number; // 最高等级
  base: number; // 首级价格；第 n 级（0 起）价格 = base × (n+1)
  costs?: number[]; // 显式价格表（M10 新条目用，优先于公式）
}

// M10 经济扩展：4 个新条目插列表前部（revive 最贵最显眼即广告位）；
// 现有 6 项 max 5→8；speed/magnet/greed/armor/regen 保持原档（移速与经济类继续扩档会破坏平衡）。
// M12：lv≥5 溢价 ×4 断崖改 ×2/×3/×4 阶梯。总池 1,530 + 3,000 + 4,160 = 8,690 金币
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
];

/** 第 lv 级（0 起）→ lv+1 级的价格：显式价格表优先；
 *  公式条目前 5 级曲线不变（新手前 2 小时体验零变化），lv≥5 高阶区间阶梯溢价
 *  ×2/×3/×4（lv5/6/7；M12 削平原 ×4 断崖） */
export function powerUpPrice(spec: PowerUpSpec, lv: number): number {
  if (spec.costs) return spec.costs[Math.min(lv, spec.costs.length - 1)];
  return spec.base * (lv + 1) * (lv >= 5 ? lv - 3 : 1);
}

// 每级效果数值（调参只改此处）
export const POWERUP_FX = {
  power: 0.04,    // 伤害 +4%/级
  vitality: 10,   // 生命上限 +10/级
  haste: 0.025,   // 冷却 -2.5%/级
  area: 0.04,     // 范围 +4%/级
  speed: 0.025,   // 移速 +2.5%/级
  magnet: 0.12,   // 拾取范围 +12%/级
  growth: 0.04,   // 经验获取 +4%/级
  greed: 0.12,    // 金币获取 +12%/级
  armor: 1,       // 受到伤害 -1/级
  regen: 0.3,     // 每秒回复 +0.3/级
  luck: 0.02,     // 暴击率 +2%/级
};

/** 永久强化聚合加成（RunState.computeStats 消费） */
export interface PowerUpBonus {
  dmg: number; // 伤害乘区增量
  hp: number; // 生命上限加值
  cdMul: number; // 冷却乘子（<1 更快）
  area: number;
  speed: number;
  magnet: number;
  xpGain: number; // 经验乘区增量
  coinGain: number; // 金币乘区增量
  armor: number; // 减伤（平减）
  regen: number; // 每秒回复
  crit: number; // 暴击率增量
}

export function powerUpBonus(levels: Partial<Record<PowerUpId, number>>): PowerUpBonus {
  const lv = (id: PowerUpId): number => levels[id] ?? 0;
  return {
    dmg: POWERUP_FX.power * lv('power'),
    hp: POWERUP_FX.vitality * lv('vitality'),
    cdMul: 1 - POWERUP_FX.haste * lv('haste'),
    area: POWERUP_FX.area * lv('area'),
    speed: POWERUP_FX.speed * lv('speed'),
    magnet: POWERUP_FX.magnet * lv('magnet'),
    xpGain: POWERUP_FX.growth * lv('growth'),
    coinGain: POWERUP_FX.greed * lv('greed'),
    armor: POWERUP_FX.armor * lv('armor'),
    regen: POWERUP_FX.regen * lv('regen'),
    crit: POWERUP_FX.luck * lv('luck'),
  };
}
