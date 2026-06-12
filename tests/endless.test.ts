// M11 无尽/狂暴数值口径回归：轮次边界、金币衰减地板、狂暴乘区与发行方案对表
// 这些数字是发行方案（docs/发行补强开发方案 §4）的验收口径，调参后若有意变更需同步本文件
import { describe, expect, it } from 'vitest';
import { ENDLESS, endlessCoinMul, endlessCycleAt } from '../src/content/endless';
import { DIFFICULTY } from '../src/content/difficulty';
import { MAPS } from '../src/content/maps';

describe('endlessCycleAt（草甸 bossT=720 为例）', () => {
  const bossT = 720;
  it('Boss 前为 0，Boss 时刻进第 1 轮，每 300s 进一轮', () => {
    expect(endlessCycleAt(0, bossT)).toBe(0);
    expect(endlessCycleAt(719.9, bossT)).toBe(0);
    expect(endlessCycleAt(720, bossT)).toBe(1);
    expect(endlessCycleAt(1019.9, bossT)).toBe(1);
    expect(endlessCycleAt(1020, bossT)).toBe(2); // ~17 分钟 Boss 重临后进第 2 轮
    expect(endlessCycleAt(720 + 300 * 5, bossT)).toBe(6); // endless6 口径
  });
});

describe('endlessCoinMul（防通胀衰减）', () => {
  it('第 0 轮恒 1（普通模式安全），逐轮 −12%，地板 0.4', () => {
    expect(endlessCoinMul(0)).toBe(1);
    expect(endlessCoinMul(1)).toBeCloseTo(0.88);
    expect(endlessCoinMul(2)).toBeCloseTo(0.76); // 第 2 轮明显低于第 1 轮
    expect(endlessCoinMul(5)).toBeCloseTo(0.4);
    expect(endlessCoinMul(10)).toBe(0.4);
  });
});

describe('无尽循环窗口前提', () => {
  it('每图 events 的 boss 时刻 = minutes×60（虚拟时间窗右端对齐）', () => {
    for (const m of MAPS) {
      const boss = m.events.find((e) => e.kind === 'boss');
      expect(boss, m.id).toBeDefined();
      expect(boss!.t, m.id).toBe(m.minutes * 60);
    }
  });

  it('每图循环窗口 [bossT−300, bossT] 内至少含 1 个事件 + 末位 Boss', () => {
    for (const m of MAPS) {
      const bossT = m.minutes * 60;
      const win = m.events.filter((e) => e.t >= bossT - ENDLESS.cycleLen && e.t <= bossT);
      expect(win.length, m.id).toBeGreaterThanOrEqual(2);
      expect(win[win.length - 1].kind, m.id).toBe('boss');
    }
  });
});

describe('狂暴乘区表（发行方案 §4.2 对表）', () => {
  it('普通档全 1，狂暴 I/II 与方案一致', () => {
    expect(DIFFICULTY[0]).toEqual({
      hpMul: 1, dmgMul: 1, speedMul: 1, intervalMul: 1, aliveMul: 1,
      eliteDouble: false, coinMul: 1, xpMul: 1,
    });
    expect(DIFFICULTY[1].hpMul).toBe(1.4);
    expect(DIFFICULTY[1].coinMul).toBe(1.5);
    expect(DIFFICULTY[1].eliteDouble).toBe(false);
    expect(DIFFICULTY[2].hpMul).toBe(1.9);
    expect(DIFFICULTY[2].coinMul).toBe(2);
    expect(DIFFICULTY[2].eliteDouble).toBe(true);
  });
});
