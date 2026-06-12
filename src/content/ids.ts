// 全部内容 ID 类型（纯数据层，禁止依赖 Phaser）
export type WeaponId = 'blade' | 'petal' | 'prism' | 'rain' | 'spark' | 'boomerang' | 'mine';
export type PassiveId = 'power' | 'bloom' | 'lens' | 'cloud' | 'battery' | 'wind';
export type EnemyId =
  | 'blob' | 'midge' | 'shelly' | 'spitter' | 'dasher' | 'splitter' | 'mini' | 'elite' | 'boss';

/** 敌人移动行为模板（M5 起扩到 ~12 种） */
export type BehaviorId = 'chase' | 'wobble' | 'strafeShoot' | 'dash';
