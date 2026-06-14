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

  it('surge 是一次性事件，不得落入无尽重放窗口（M12）', () => {
    for (const m of MAPS) {
      const bossT = m.minutes * 60;
      for (const ev of m.events.filter((e) => e.kind === 'surge')) {
        expect(ev.t, m.id).toBeLessThan(bossT - ENDLESS.cycleLen);
      }
    }
  });
});

describe('地图时长三档与升级节奏（M12）', () => {
  it('全部地图时长 ∈ {10, 20, 30}，timeK = 12/minutes', () => {
    for (const m of MAPS) {
      expect([10, 20, 30], m.id).toContain(m.minutes);
      expect(m.timeK, m.id).toBeCloseTo(12 / m.minutes);
    }
  });

  it('短图升级节奏加快（xpK ≥ 1.2），长图不快于基准', () => {
    for (const m of MAPS) {
      if (m.minutes === 10) expect(m.xpK, m.id).toBeGreaterThanOrEqual(1.2);
      if (m.minutes === 30) expect(m.xpK, m.id).toBeLessThanOrEqual(1);
    }
  });

  it('第 5 张及之后各有一个 surge（中点），前 4 图没有', () => {
    for (const [i, m] of MAPS.entries()) {
      const surges = m.events.filter((e) => e.kind === 'surge');
      const hasMidSurge = i >= 4;
      expect(surges.length, m.id).toBe(hasMidSurge ? 1 : 0);
      if (hasMidSurge) expect(surges[0].t, m.id).toBe(m.minutes * 30);
    }
  });
});

describe('地图机制参数 sanity（M18）', () => {
  it('每图至少一条机制；首项为核心机制（meadow 起全图差异化）', () => {
    for (const m of MAPS) {
      expect(m.mechanics.length, m.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('机制计时/数量/半径参数均为正（防 0 间隔死循环或负半径）', () => {
    const posKeys = ['first', 'interval', 'period', 'highT', 'warnT', 'turnEvery', 'dur',
      'count', 'segN', 'islandN', 'maxStacks', 'maxLit', 'igniteT', 'growT', 'starEvery', 'litT',
      'r', 'segR', 'islandR', 'dist', 'chainR', 'maxDepth'] as const;
    for (const m of MAPS) {
      for (const spec of m.mechanics) {
        for (const k of posKeys) {
          const v = (spec as Record<string, unknown>)[k];
          if (typeof v === 'number') expect(v, `${m.id}/${spec.kind}/${k}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('减速/增伤/衰减乘区在合理范围（不致负速度或失控 power creep）', () => {
    for (const m of MAPS) {
      for (const spec of m.mechanics) {
        if (spec.kind === 'tide') expect(spec.slow, m.id).toBeGreaterThan(0.2);
        if (spec.kind === 'pollen') {
          expect(spec.maxStacks * spec.dmgPer, m.id).toBeLessThanOrEqual(0.3); // 总增伤 ≤30%
        }
        if (spec.kind === 'beacon') {
          expect(spec.maxLit * spec.enemyHpPer, m.id).toBeLessThanOrEqual(0.3); // 总 HP 衰减 ≤30%
        }
        if (spec.kind === 'thornwall') expect(spec.gapDeg, m.id).toBeGreaterThanOrEqual(120); // 强制开口防围死
        if (spec.kind === 'nightfall') expect(spec.darkAlpha, m.id).toBeLessThanOrEqual(0.5); // 压暗 ≤50% 保可读
      }
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
