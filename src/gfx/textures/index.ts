// 纹理工厂统一入口（M4 起按域拆分：core/characters/enemies/weapons/icons/misc）
import { Viewport } from '../../ui/Viewport';
import { setTexScale } from './core';
import { createCharacterTextures } from './characters';
import { createEnemyTextures } from './enemies';
import { createWeaponTextures } from './weapons';
import { createMiscTextures } from './misc';
import { createIcons } from './icons';
import { createBossTextures } from './bosses';

export { makeTex } from './core';
export { makeCharacter } from './characters';
export type { CharRecipe } from './characters';
export { BOSS_ART_BY_ENEMY, BOSS_ART_BY_KEY, BOSS_ART_BY_MAP, BOSS_ART_SPECS, bossFrameKeysFor, bossTextureKey } from './bosses';
export type { BossFrameState, BossTelegraphStyle } from './bosses';
export { ensureMapAssets, makeEnemy, releaseMapAssets } from './mapassets';
export type { EnemyRecipe } from './mapassets';

export function createAllTextures(scene: Phaser.Scene): void {
  // dpr1→2x、dpr2→3x、dpr3→4x；纹理都很小，显存开销可忽略
  setTexScale(Math.min(4, Math.ceil(Viewport.dprNow() * 1.25)));

  createCharacterTextures(scene);
  createEnemyTextures(scene);
  createBossTextures(scene, 'meadow');
  createWeaponTextures(scene);
  createMiscTextures(scene);
  createIcons(scene);
}
