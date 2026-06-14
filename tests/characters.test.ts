import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { CHARACTERS } from '../src/content/characters';
import { WEAPON_META } from '../src/content/weapons';
import { CHAR_PAL } from '../src/gfx/palette';

const NEW_REGULAR = [
  'willow', 'samara', 'cinder', 'tidey', 'ray', 'pipit', 'beanie', 'wish',
  'pollen', 'vorty', 'lancey', 'beebee', 'frosty', 'twirl',
] as const;

describe('32 角色扩展矩阵', () => {
  const achIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const charIds = new Set(CHARACTERS.map((c) => c.id));

  it('总数为 32：30 常规 + 2 隐藏', () => {
    expect(CHARACTERS).toHaveLength(32);
    expect(CHARACTERS.filter((c) => c.secret === true).map((c) => c.id).sort()).toEqual(['blobby', 'nova']);
    expect(CHARACTERS.filter((c) => c.secret !== true)).toHaveLength(30);
    for (const id of NEW_REGULAR) expect(charIds.has(id), id).toBe(true);
  });

  it('32 把基础武器与 32 位角色一一配对', () => {
    const weapons = CHARACTERS.map((c) => c.weapon);
    expect(new Set(weapons).size).toBe(WEAPON_META.length);
    expect(weapons.sort()).toEqual(WEAPON_META.map((m) => m.id).sort());
    expect(CHARACTERS.find((c) => c.id === 'blobby')!.weapon).toBe('bomb');
    expect(CHARACTERS.find((c) => c.id === 'nova')!.weapon).toBe('meteor');
  });

  it('角色解锁与成就 unlockChar 双向引用合法', () => {
    for (const c of CHARACTERS) {
      if (c.unlockAch !== null) expect(achIds.has(c.unlockAch), `${c.id} unlockAch`).toBe(true);
    }
    for (const a of ACHIEVEMENTS) {
      if (a.unlockChar) expect(charIds.has(a.unlockChar), `${a.id} unlockChar`).toBe(true);
    }
  });

  it('新增 trait 落在计划角色上', () => {
    expect(CHARACTERS.find((c) => c.id === 'vorty')!.trait).toBe('moonwell');
    expect(CHARACTERS.find((c) => c.id === 'lancey')!.trait).toBe('sunlance');
    expect(CHARACTERS.find((c) => c.id === 'beebee')!.trait).toBe('hivecall');
    expect(CHARACTERS.find((c) => c.id === 'frosty')!.trait).toBe('frostguard');
  });

  it('palette 与程序化纹理配方覆盖每个角色 tex', () => {
    const textureSrc = readFileSync(new URL('../src/gfx/textures/characters.ts', import.meta.url), 'utf8');
    for (const c of CHARACTERS) {
      if (c.id !== 'spark') expect(CHAR_PAL[c.id], `${c.id} palette`).toBeDefined();
      expect(textureSrc, `${c.id} texture ${c.tex}`).toContain(`makeCharacter(scene, '${c.tex}'`);
    }
  });
});
