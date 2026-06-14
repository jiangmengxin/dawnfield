import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { BOSSES } from '../src/content/bosses';
import { DROP_ITEMS } from '../src/content/dropItems';
import { ENEMIES } from '../src/content/enemies';
import type { DropItemId, EnemyId, MapId } from '../src/content/ids';
import { MAPS } from '../src/content/maps';

const NEW_MAPS: Array<{
  id: MapId;
  mechanic: string;
  boss: EnemyId;
  elite: EnemyId;
  drops: DropItemId[];
  unlockAch: string;
}> = [
  { id: 'orchard', mechanic: 'orchard', boss: 'ciderwyrm', elite: 'harvestorb', drops: ['goldapple', 'seedwhirl'], unlockAch: 'summitClear' },
  { id: 'snowbell', mechanic: 'frostseal', boss: 'frosthare', elite: 'snowwarden', drops: ['snowglobe', 'frostbell'], unlockAch: 'orchardClear' },
  { id: 'mirage', mechanic: 'prismfield', boss: 'miragewhale', elite: 'prismguard', drops: ['prismshard', 'mirrorbloom'], unlockAch: 'snowbellClear' },
  { id: 'clockwork', mechanic: 'bellring', boss: 'clockrooster', elite: 'gearwarden', drops: ['clockkey', 'bellnova'], unlockAch: 'mirageClear' },
];

describe('12 图扩展内容完整性', () => {
  const achievementIds = ACHIEVEMENTS.map((a) => a.id);

  it('地图总数为 12，新增四图按解锁链排在原 8 图之后', () => {
    expect(MAPS).toHaveLength(12);
    expect(MAPS.slice(-4).map((m) => m.id)).toEqual(NEW_MAPS.map((m) => m.id));
  });

  it('新增四图均有核心机制、专属掉落、精英、Boss 与通关成就', () => {
    for (const expected of NEW_MAPS) {
      const map = MAPS.find((m) => m.id === expected.id);
      expect(map, expected.id).toBeDefined();
      expect(map!.mechanics[0].kind).toBe(expected.mechanic);
      expect(map!.bossId).toBe(expected.boss);
      expect(map!.eliteId).toBe(expected.elite);
      expect(map!.drops).toEqual(expected.drops);
      expect(map!.unlockAch).toBe(expected.unlockAch);

      expect(ENEMIES[expected.boss].boss, `${expected.id} boss flag`).toBe(true);
      expect(ENEMIES[expected.elite].elite, `${expected.id} elite flag`).toBe(true);
      expect(BOSSES[expected.id], `${expected.id} boss spec`).toBeDefined();
      for (const drop of expected.drops) expect(DROP_ITEMS[drop].scope, drop).toBe('map');
      expect(achievementIds).toContain(`${expected.id}Clear`);
    }
  });

  it('每张地图引用的波次/事件/Boss 敌人都在 ENEMIES 表中', () => {
    for (const map of MAPS) {
      const referenced = new Set<EnemyId>([map.bossId, map.eliteId]);
      for (const phase of map.waves) {
        for (const [enemy] of phase.types) referenced.add(enemy);
      }
      for (const event of map.events) {
        if (event.enemy) referenced.add(event.enemy);
      }
      const bossSpec = BOSSES[map.id];
      if (bossSpec.summon) referenced.add(bossSpec.summon.id);

      for (const enemy of referenced) expect(ENEMIES[enemy], `${map.id}/${enemy}`).toBeDefined();
      expect(BOSSES[map.id], `${map.id} boss spec`).toBeDefined();
    }
  });

  it('新增机制与新增地图资产入口均已注册', () => {
    const mechanicsIndex = readFileSync(new URL('../src/systems/mechanics/index.ts', import.meta.url), 'utf8');
    const mapAssets = readFileSync(new URL('../src/gfx/textures/mapassets.ts', import.meta.url), 'utf8');
    const miscAssets = readFileSync(new URL('../src/gfx/textures/misc.ts', import.meta.url), 'utf8');

    for (const expected of NEW_MAPS) {
      expect(mechanicsIndex, expected.mechanic).toContain(`case '${expected.mechanic}'`);
      expect(mapAssets, expected.id).toContain(`mapId === '${expected.id}'`);
      for (const drop of expected.drops) expect(miscAssets, drop).toContain(drop);
    }
  });
});
