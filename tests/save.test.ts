// 存档 sanitize 宽容性回归：M10 新 PowerUpId 不迁移版本，依赖 entries 遍历无白名单的保留语义
import { describe, expect, it } from 'vitest';
import { defaultSave, sanitize, SAVE_VERSION } from '../src/core/save/schema';

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
