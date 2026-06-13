// M10 商店经济回归：价格曲线 / 总池 / 新手前期体验零变化锚点 / 满级总效果
// 这些数字是发行方案的验收口径，调参（content/shop.ts）后若有意变更需同步本文件
import { describe, expect, it } from 'vitest';
import { POWERUPS, powerUpBonus, powerUpPrice } from '../src/content/shop';
import type { PowerUpId } from '../src/content/ids';

const spec = (id: PowerUpId) => {
  const s = POWERUPS.find((p) => p.id === id);
  if (!s) throw new Error('missing powerup: ' + id);
  return s;
};

/** 0..lv-1 级累计价格（与 MetaState.powerUpSpent 同口径） */
const totalCost = (id: PowerUpId, lv: number): number => {
  let sum = 0;
  for (let i = 0; i < lv; i++) sum += powerUpPrice(spec(id), i);
  return sum;
};

describe('powerUpPrice', () => {
  it('显式价格表优先于公式（M10 新条目）', () => {
    expect(powerUpPrice(spec('revive'), 0)).toBe(600);
    expect(powerUpPrice(spec('revive'), 1)).toBe(900);
    expect(powerUpPrice(spec('reroll'), 2)).toBe(360);
    expect(powerUpPrice(spec('banish'), 1)).toBe(200);
    expect(powerUpPrice(spec('skip'), 1)).toBe(120);
  });

  it('公式条目前 5 级曲线 = base × (lv+1)，与 M9 一致', () => {
    for (const s of POWERUPS.filter((p) => !p.costs)) {
      for (let lv = 0; lv < Math.min(5, s.max); lv++) {
        expect(powerUpPrice(s, lv)).toBe(s.base * (lv + 1));
      }
    }
  });

  it('lv≥5 高阶区间阶梯溢价 ×2/×3/×4（M12 削平断崖）', () => {
    expect(powerUpPrice(spec('power'), 5)).toBe(120);
    expect(powerUpPrice(spec('power'), 6)).toBe(210);
    expect(powerUpPrice(spec('power'), 7)).toBe(320);
    expect(powerUpPrice(spec('haste'), 7)).toBe(384);
  });
});

describe('经济总池（发行方案 3.3 验收口径）', () => {
  it('M9 基础 11 项前 5 级总池 = 1,530（新手前 2 小时体验零变化锚点）', () => {
    const legacy: PowerUpId[] = [
      'power', 'vitality', 'haste', 'area', 'speed', 'magnet',
      'growth', 'greed', 'armor', 'regen', 'luck',
    ];
    const sum = legacy.reduce((acc, id) => acc + totalCost(id, Math.min(5, spec(id).max)), 0);
    expect(sum).toBe(1530);
  });

  it('全部 16 项买满 = 9,195（M19 fortune 掉率项 +505）', () => {
    const sum = POWERUPS.reduce((acc, s) => acc + totalCost(s.id, s.max), 0);
    expect(sum).toBe(9195);
  });

  it('M10 新 4 条目小计 = 3,000', () => {
    const ids: PowerUpId[] = ['revive', 'reroll', 'banish', 'skip'];
    const sum = ids.reduce((acc, id) => acc + totalCost(id, spec(id).max), 0);
    expect(sum).toBe(3000);
  });
});

describe('powerUpBonus 满级总效果（发行方案 3.3 表）', () => {
  it('扩档 6 项满级效果与方案一致', () => {
    const b = powerUpBonus({ power: 8, vitality: 8, haste: 8, area: 8, growth: 8, luck: 8 });
    expect(b.dmg).toBeCloseTo(0.32);    // 伤害 +32%
    expect(b.hp).toBe(80);              // HP +80
    expect(b.cdMul).toBeCloseTo(0.8);   // 冷却 -20%
    expect(b.area).toBeCloseTo(0.32);   // 范围 +32%
    expect(b.xpGain).toBeCloseTo(0.32); // 经验 +32%
    expect(b.crit).toBeCloseTo(0.16);   // 暴击 +16%
  });

  it('零等级 → 全部中性值', () => {
    const b = powerUpBonus({});
    expect(b.dmg).toBe(0);
    expect(b.cdMul).toBe(1);
    expect(b.armor).toBe(0);
  });
});
