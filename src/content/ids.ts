// 全部内容 ID 类型（纯数据层，禁止依赖 Phaser）
export type WeaponId =
  | 'blade' | 'petal' | 'prism' | 'rain' | 'spark' | 'boomerang' | 'mine' | 'puff'
  // M6 批次 B（补 zone/orbit/melee/burst 机制空缺）
  | 'lantern' | 'star' | 'mallet' | 'chime';
export type PassiveId =
  | 'power' | 'bloom' | 'lens' | 'cloud' | 'battery' | 'wind' | 'ladybug' | 'honey'
  // M6
  | 'acorn' | 'stardust' | 'sprout' | 'pouch';

/** 敌人：每图专属敌人池（行为模板 × 换皮调色） */
export type EnemyId =
  // 晨光草甸
  | 'blob' | 'midge' | 'shelly' | 'spitter' | 'dasher' | 'splitter' | 'mini' | 'elite' | 'boss'
  // 露珠池塘（M5）
  | 'tad' | 'bubble' | 'snail' | 'frog' | 'squirt' | 'jelly' | 'bigbubble' | 'bubbleking'
  // 晚霞山岗（M5）
  | 'leafy' | 'grain' | 'crow' | 'thistle' | 'wheatling' | 'cone' | 'gust' | 'bigthistle' | 'galecrow'
  // 萤暮林地（M6）
  | 'shroom' | 'glimmer' | 'mottle' | 'snapcap' | 'puffcap' | 'roller' | 'eldercap' | 'sporeking'
  // 紫露花田（M6）
  | 'budling' | 'bumble' | 'flutter' | 'snippy' | 'pompon' | 'briar' | 'queenbee' | 'flutterqueen';

/** 角色（M4 批次 A：8 个；M6：12 个；M7 扩到 16） */
export type CharacterId =
  | 'spark' | 'rosa' | 'dew' | 'gale' | 'lumen' | 'volt' | 'pebble' | 'fluff'
  | 'ember' | 'luna' | 'conker' | 'jingle';

/** 地图（M6：5 张；M7 扩到 8） */
export type MapId = 'meadow' | 'pond' | 'hills' | 'grove' | 'lavender';

/** 敌人移动行为模板（M6 起 14 种） */
export type BehaviorId =
  | 'chase' | 'wobble' | 'strafeShoot' | 'dash'
  | 'drift' | 'hop' | 'orbit' | 'swoop' | 'blink' | 'pulse' | 'turret' | 'zigzag'
  | 'spiral' | 'ambush';

/** 商店永久强化（金币唯一用途，可全额重置） */
export type PowerUpId =
  | 'power' | 'vitality' | 'haste' | 'area' | 'speed' | 'magnet'
  | 'growth' | 'greed' | 'armor' | 'regen' | 'luck';

/** 成就（M6：28 个，M7 扩到 40） */
export type AchievementId =
  | 'swarm100' | 'survive5' | 'level20' | 'eliteSlayer' | 'firstEvolve' | 'maxWeapon'
  | 'fullArsenal' | 'fullCharms' | 'meadowClear' | 'kills1000' | 'coins500' | 'firstBuy'
  | 'pondClear' | 'hillsClear'
  // M6
  | 'groveClear' | 'lavenderClear' | 'survive15' | 'level30' | 'kills300' | 'evolve3'
  | 'eliteHunter' | 'kills5000' | 'coins2000' | 'wins5' | 'runs20' | 'buy10'
  | 'fullHouse' | 'maxPassive';
