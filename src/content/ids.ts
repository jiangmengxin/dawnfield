// 全部内容 ID 类型（纯数据层，禁止依赖 Phaser）
export type WeaponId =
  | 'blade' | 'petal' | 'prism' | 'rain' | 'spark' | 'boomerang' | 'mine' | 'puff'
  // M6 批次 B（补 zone/orbit/melee/burst 机制空缺）
  | 'lantern' | 'star' | 'mallet' | 'chime'
  // M7 批次 C（补 whip/炮射/追踪/哨塔 机制空缺）
  | 'vine' | 'sling' | 'wisp' | 'bugle';
export type PassiveId =
  | 'power' | 'bloom' | 'lens' | 'cloud' | 'battery' | 'wind' | 'ladybug' | 'honey'
  // M6
  | 'acorn' | 'stardust' | 'sprout' | 'pouch'
  // M7
  | 'feather' | 'snack' | 'whistle' | 'trellis';

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
  | 'budling' | 'bumble' | 'flutter' | 'snippy' | 'pompon' | 'briar' | 'queenbee' | 'flutterqueen'
  // 莓果灌丛（M7）
  | 'berryling' | 'bristle' | 'mole' | 'magpie' | 'cubby' | 'gourd' | 'bigberry' | 'bramblebear'
  // 星语夜原（M7）
  | 'moonmote' | 'twinkle' | 'nightmoth' | 'lunaling' | 'owlet' | 'sparkler' | 'cometlord' | 'starelk'
  // 破晓之巅（M7）
  | 'shade' | 'gloom' | 'umbra' | 'glint' | 'nightbloom' | 'eclipse' | 'lurker' | 'shadelord' | 'nightowl';

/** 角色（M4 批次 A：8 个；M6：12 个；M7：16 个全量） */
export type CharacterId =
  | 'spark' | 'rosa' | 'dew' | 'gale' | 'lumen' | 'volt' | 'pebble' | 'fluff'
  | 'ember' | 'luna' | 'conker' | 'jingle'
  | 'ivy' | 'berry' | 'wisp' | 'toot';

/** 地图（M7：8 张全量） */
export type MapId = 'meadow' | 'pond' | 'hills' | 'grove' | 'lavender' | 'bramble' | 'nocturne' | 'summit';

/** 敌人移动行为模板（M7 起 16 种） */
export type BehaviorId =
  | 'chase' | 'wobble' | 'strafeShoot' | 'dash'
  | 'drift' | 'hop' | 'orbit' | 'swoop' | 'blink' | 'pulse' | 'turret' | 'zigzag'
  | 'spiral' | 'ambush'
  | 'burrow' | 'phase';

/** 规则卡 Arcana（M9：10 张，开局选 1，精英宝箱可再得） */
export type ArcanaId =
  | 'petaltide' | 'tailwind' | 'thornlace' | 'goldbell' | 'starpop'
  | 'moonheart' | 'dewspring' | 'fireflyway' | 'compass' | 'onepath';

/** 商店永久强化（金币唯一用途，可全额重置） */
export type PowerUpId =
  | 'power' | 'vitality' | 'haste' | 'area' | 'speed' | 'magnet'
  | 'growth' | 'greed' | 'armor' | 'regen' | 'luck'
  // M10 构筑操控与复活（次数类：等级 → 每局次数，不走 powerUpBonus 乘区）
  | 'revive' | 'reroll' | 'banish' | 'skip';

/** 成就（M7：40 个全量） */
export type AchievementId =
  | 'swarm100' | 'survive5' | 'level20' | 'eliteSlayer' | 'firstEvolve' | 'maxWeapon'
  | 'fullArsenal' | 'fullCharms' | 'meadowClear' | 'kills1000' | 'coins500' | 'firstBuy'
  | 'pondClear' | 'hillsClear'
  // M6
  | 'groveClear' | 'lavenderClear' | 'survive15' | 'level30' | 'kills300' | 'evolve3'
  | 'eliteHunter' | 'kills5000' | 'coins2000' | 'wins5' | 'runs20' | 'buy10'
  | 'fullHouse' | 'maxPassive'
  // M7
  | 'brambleClear' | 'nocturneClear' | 'summitClear' | 'survive20' | 'kills500' | 'level40'
  | 'evolve6' | 'coins5000' | 'kills10000' | 'wins10' | 'runs50' | 'buy25'
  // M11（无尽与狂暴）
  | 'hyperClear1' | 'hyperAll' | 'endless3' | 'endless6';
