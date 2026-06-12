// 存档 sanitize 宽容性回归：M10 新 PowerUpId 不迁移版本，依赖 entries 遍历无白名单的保留语义
// M11：v1→v2 迁移链 + endless/hyper/tipsSeen/winsByChar 守卫
import { describe, expect, it } from 'vitest';
import { defaultSave, sanitize, SAVE_VERSION } from '../src/core/save/schema';
import { MIGRATIONS } from '../src/core/save/migrations';

describe('sanitize 对 powerUps 的宽容保留（M10 零迁移的前提）', () => {
  it('M10 新条目键在 v1 档中原样保留', () => {
    const s = sanitize({ ...defaultSave(), powerUps: { power: 3, revive: 1, reroll: 2, banish: 3, skip: 1 } });
    expect(s).not.toBeNull();
    expect(s!.powerUps).toEqual({ power: 3, revive: 1, reroll: 2, banish: 3, skip: 1 });
  });

  it('未来里程碑的未知键同样保留（无 id 白名单）', () => {
    const s = sanitize({ ...defaultSave(), powerUps: { future_unknown: 2 } });
    expect(s!.powerUps).toEqual({ future_unknown: 2 });
  });

  it('非法等级被钳制：负数/0 丢弃，超界压到 99，小数取整', () => {
    const s = sanitize({
      ...defaultSave(),
      powerUps: { power: -3, vitality: 0, haste: 1000, area: 2.6 },
    });
    expect(s!.powerUps.power).toBeUndefined();
    expect(s!.powerUps.vitality).toBeUndefined();
    expect(s!.powerUps.haste).toBe(99);
    expect(s!.powerUps.area).toBe(3);
  });
});

describe('sanitize 基本守卫', () => {
  it('非对象 / 缺版本号 → null（触发损坏自愈路径）', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize('broken')).toBeNull();
    expect(sanitize({})).toBeNull();
  });

  it('空对象 + 版本号 → 回落默认档（初始解锁不丢失）', () => {
    const s = sanitize({ v: SAVE_VERSION });
    expect(s).not.toBeNull();
    expect(s!.unlocked.chars.length).toBeGreaterThan(0);
    expect(s!.coins).toBe(0);
  });
});

describe('v1 → v2 迁移（M11 无尽与狂暴）', () => {
  /** 模拟 M10 时代的 v1 原始档（无 endless/hyper/tipsSeen/winsByChar） */
  const v1Raw = (): Record<string, unknown> => {
    const d = defaultSave() as unknown as Record<string, unknown>;
    d.v = 1;
    delete d.endless;
    delete d.hyper;
    delete d.tipsSeen;
    delete (d.stats as Record<string, unknown>).winsByChar;
    (d.stats as Record<string, unknown>).wins = 7;
    d.coins = 1234;
    d.achievements = ['meadowClear'];
    return d;
  };

  it('迁移链补齐四个新字段并升版本号，原数据零丢失', () => {
    const o = v1Raw();
    MIGRATIONS[1](o);
    expect(o.v).toBe(2);
    const s = sanitize(o);
    expect(s).not.toBeNull();
    expect(s!.endless).toEqual({});
    expect(s!.hyper).toEqual({});
    expect(s!.tipsSeen).toEqual([]);
    expect(s!.stats.winsByChar).toEqual({});
    expect(s!.coins).toBe(1234);
    expect(s!.stats.wins).toBe(7);
    expect(s!.achievements).toEqual(['meadowClear']);
  });

  it('SAVE_VERSION 已升到 2，默认档自带新字段', () => {
    expect(SAVE_VERSION).toBe(2);
    const d = defaultSave();
    expect(d.endless).toEqual({});
    expect(d.hyper).toEqual({});
    expect(d.tipsSeen).toEqual([]);
    expect(d.stats.winsByChar).toEqual({});
  });
});

describe('sanitize 对 v2 新字段的守卫', () => {
  it('endless：MapId 白名单 + 逐项 num；损坏条目丢弃不传染', () => {
    const s = sanitize({
      ...defaultSave(),
      endless: {
        meadow: { sec: 1234.6, kills: 800, cycle: 3, diff: 1 },
        pond: { sec: 0, kills: 1, cycle: 0, diff: 0 }, // sec=0 视为无记录
        nowhere: { sec: 999, kills: 1, cycle: 1, diff: 0 }, // 非法图 id
        hills: 'broken',
        grove: { sec: 600, kills: -5, cycle: 2.7, diff: 9 }, // 越界钳制
      },
    });
    expect(s!.endless.meadow).toEqual({ sec: 1235, kills: 800, cycle: 3, diff: 1 });
    expect(s!.endless.pond).toBeUndefined();
    expect((s!.endless as Record<string, unknown>).nowhere).toBeUndefined();
    expect(s!.endless.hills).toBeUndefined();
    expect(s!.endless.grove).toEqual({ sec: 600, kills: 0, cycle: 3, diff: 2 });
  });

  it('hyper：档位钳制 0–2，0 不落键，非法图 id 丢弃', () => {
    const s = sanitize({
      ...defaultSave(),
      hyper: { meadow: 1, pond: 5, hills: 0, fake: 2, grove: -1 },
    });
    expect(s!.hyper).toEqual({ meadow: 1, pond: 2 });
  });

  it('tipsSeen / winsByChar：类型过滤与正数守卫', () => {
    const d = defaultSave();
    d.stats.winsByChar = { spark: 3.4, rosa: 0, bad: -2 } as Record<string, number>;
    const s = sanitize({ ...d, tipsSeen: ['evolveTip', 42, null] });
    expect(s!.tipsSeen).toEqual(['evolveTip']);
    expect(s!.stats.winsByChar).toEqual({ spark: 3 });
  });
});
