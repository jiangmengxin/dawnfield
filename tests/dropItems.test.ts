// M19 掉落道具数据 sanity：通用池规模 / 每图专属 ≥2 / scope 归属 / id↔图标↔效果配齐 / 加权抽取有效
// 这些是「五种以上通用 + 每图至少两种专属」的验收口径，调表后若有意变更需同步本文件
import { describe, expect, it } from 'vitest';
import { ALL_DROPS, COMMON_DROPS, DROP_ITEMS, rollCommonDrop, weightedDrop } from '../src/content/dropItems';
import { MAPS } from '../src/content/maps';
import type { DropItemId } from '../src/content/ids';

describe('掉落道具数据表', () => {
  it('每个 id 的 icon = drop_<id>，kind 合法，持续型必带 dur', () => {
    for (const id of ALL_DROPS) {
      const s = DROP_ITEMS[id];
      expect(s.id).toBe(id);
      expect(s.icon).toBe('drop_' + id);
      expect(['instant', 'timed']).toContain(s.kind);
      if (s.kind === 'timed') expect(s.dur && s.dur > 0).toBe(true);
      expect(s.weight).toBeGreaterThan(0);
    }
  });

  it('通用道具 ≥5 种（需求：五种以上），且全为 scope=common', () => {
    expect(COMMON_DROPS.length).toBeGreaterThanOrEqual(5);
    for (const id of COMMON_DROPS) expect(DROP_ITEMS[id].scope).toBe('common');
  });

  it('rollCommonDrop / weightedDrop 只产出池内合法 id', () => {
    let seed = 1;
    const rng = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 200; i++) {
      expect(COMMON_DROPS).toContain(rollCommonDrop(rng));
    }
    const pool: DropItemId[] = ['nuke', 'heal', 'magnet'];
    for (let i = 0; i < 50; i++) expect(pool).toContain(weightedDrop(pool, rng));
  });
});

describe('地图专属道具', () => {
  it('每张地图 ≥2 种专属道具（需求），且全为 scope=map', () => {
    for (const m of MAPS) {
      expect(m.drops, `map ${m.id} 缺 drops`).toBeDefined();
      expect(m.drops!.length, `map ${m.id} 专属道具不足 2`).toBeGreaterThanOrEqual(2);
      for (const id of m.drops!) expect(DROP_ITEMS[id].scope, `${id} 应为 map 专属`).toBe('map');
    }
  });

  it('全部 scope=map 道具恰好被各图引用一次（无遗漏/无串用）', () => {
    const mapScoped = ALL_DROPS.filter((id) => DROP_ITEMS[id].scope === 'map').sort();
    const referenced = MAPS.flatMap((m) => m.drops ?? []).sort();
    expect(referenced).toEqual(mapScoped);
    expect(new Set(referenced).size).toBe(referenced.length); // 无重复
  });
});
