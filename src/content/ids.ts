// 全部内容 ID 类型（纯数据层，禁止依赖 Phaser）
export type WeaponId = 'blade' | 'petal' | 'prism' | 'rain' | 'spark' | 'boomerang' | 'mine' | 'puff';
export type PassiveId = 'power' | 'bloom' | 'lens' | 'cloud' | 'battery' | 'wind' | 'ladybug' | 'honey';

/** 敌人：每图专属敌人池（行为模板 × 换皮调色） */
export type EnemyId =
  // 晨光草甸
  | 'blob' | 'midge' | 'shelly' | 'spitter' | 'dasher' | 'splitter' | 'mini' | 'elite' | 'boss'
  // 露珠池塘（M5）
  | 'tad' | 'bubble' | 'snail' | 'frog' | 'squirt' | 'jelly' | 'bigbubble' | 'bubbleking'
  // 晚霞山岗（M5）
  | 'leafy' | 'grain' | 'crow' | 'thistle' | 'wheatling' | 'cone' | 'gust' | 'bigthistle' | 'galecrow';

/** 角色（M4 批次 A：8 个；M6/M7 扩到 12/16） */
export type CharacterId =
  | 'spark' | 'rosa' | 'dew' | 'gale' | 'lumen' | 'volt' | 'pebble' | 'fluff';

/** 地图（M5：3 张；M6/M7 扩到 5/8） */
export type MapId = 'meadow' | 'pond' | 'hills';

/** 敌人移动行为模板（M5 起 12 种） */
export type BehaviorId =
  | 'chase' | 'wobble' | 'strafeShoot' | 'dash'
  | 'drift' | 'hop' | 'orbit' | 'swoop' | 'blink' | 'pulse' | 'turret' | 'zigzag';

/** 商店永久强化（金币唯一用途，可全额重置） */
export type PowerUpId =
  | 'power' | 'vitality' | 'haste' | 'area' | 'speed' | 'magnet'
  | 'growth' | 'greed' | 'armor' | 'regen' | 'luck';

/** 成就（M5：14 个，M6/M7 扩到 28/40） */
export type AchievementId =
  | 'swarm100' | 'survive5' | 'level20' | 'eliteSlayer' | 'firstEvolve' | 'maxWeapon'
  | 'fullArsenal' | 'fullCharms' | 'meadowClear' | 'kills1000' | 'coins500' | 'firstBuy'
  | 'pondClear' | 'hillsClear';
