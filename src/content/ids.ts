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
  | 'shade' | 'gloom' | 'umbra' | 'glint' | 'nightbloom' | 'eclipse' | 'lurker' | 'shadelord' | 'nightowl'
  // M15 新行为敌人（图 4–8 后段波次插入：自爆 / 护盾光环 / 召唤）
  | 'bombcap' | 'hivebud' | 'husker' | 'novamote' | 'duskward' | 'shadowmaw';

/** 角色（M4 批次 A：8 个；M6：12 个；M7：16 个全量；M16：+2 隐藏角色） */
export type CharacterId =
  | 'spark' | 'rosa' | 'dew' | 'gale' | 'lumen' | 'volt' | 'pebble' | 'fluff'
  | 'ember' | 'luna' | 'conker' | 'jingle'
  | 'ivy' | 'berry' | 'wisp' | 'toot'
  // M16 隐藏角色（secret：未解锁不占位不显示，彩蛋链解锁）
  | 'blobby' | 'nova';

/** 地图（M7：8 张全量） */
export type MapId = 'meadow' | 'pond' | 'hills' | 'grove' | 'lavender' | 'bramble' | 'nocturne' | 'summit';

/** 敌人移动行为模板（M7 起 16 种；M15 起 19 种） */
export type BehaviorId =
  | 'chase' | 'wobble' | 'strafeShoot' | 'dash'
  | 'drift' | 'hop' | 'orbit' | 'swoop' | 'blink' | 'pulse' | 'turret' | 'zigzag'
  | 'spiral' | 'ambush'
  | 'burrow' | 'phase'
  | 'exploder' | 'shielder' | 'summoner';

/** 精英词缀（M15）：狂暴 II 全部精英 / 无尽第 2 轮起精英随机携带 1 个（调参在 content/affixes.ts） */
export type AffixId = 'swift' | 'bulwark' | 'splitting' | 'gravitic' | 'volley';

/** 角色专属机制 trait（M14：5 个后期角色；M16：+2 隐藏角色，复用 M13 RunModifier 钩子体系） */
export type TraitId = 'flicker' | 'sweettooth' | 'fanfare' | 'collector' | 'resonance'
  | 'bouncy' | 'comet';

/** 规则卡 Arcana（M9：10 张基础卡；M13：6 张机制卡；M21：扩至 24 张全机制化） */
export type ArcanaId =
  | 'petaltide' | 'tailwind' | 'thornlace' | 'goldbell' | 'starpop'
  | 'moonheart' | 'dewspring' | 'fireflyway' | 'compass' | 'onepath'
  // M13 机制卡（tier=mechanic，拿了之后整局打法都变）
  | 'splinter' | 'thorncore' | 'vow' | 'allin' | 'slowburn' | 'dawnfield'
  // M21 扩展（全机制化）：2 张常驻 + 6 张解锁
  | 'frost' | 'harvest'
  | 'starfall' | 'constellation' | 'daynight' | 'rooted' | 'everbloom' | 'knell';

/** 商店永久强化（金币唯一用途，可全额重置） */
export type PowerUpId =
  | 'power' | 'vitality' | 'haste' | 'area' | 'speed' | 'magnet'
  | 'growth' | 'greed' | 'armor' | 'regen' | 'luck'
  // M10 构筑操控与复活（次数类：等级 → 每局次数，不走 powerUpBonus 乘区）
  | 'revive' | 'reroll' | 'banish' | 'skip'
  // M19 掉落道具掉率（提升随机掉落来源出现概率：击杀/场景物/地图机制）
  | 'fortune';

/** 一次性掉落道具（M19；VS 式踩到即触发）：7 通用 + 8 图×2 专属。
 *  i18n 键公约 drop_<id>(_d)；图鉴并入「物品」页（与被动同 codex.passives）。
 *  通用池 COMMON_DROPS 走击杀/场景物/精英；地图专属由 MapSpec.drops 经机制产物掉落 */
export type DropItemId =
  // 通用（全图）
  | 'magnet' | 'nuke' | 'timestop' | 'heal' | 'frenzy' | 'aegis' | 'xpburst'
  // meadow 晨光草甸
  | 'bloomburst' | 'verdant'
  // pond 露珠池塘
  | 'ebbaegis' | 'ripple'
  // hills 晚霞山岗
  | 'tailwind' | 'whirlwind'
  // grove 萤暮林地
  | 'sporebloom' | 'fireflies'
  // lavender 紫露花田
  | 'pollenfrenzy' | 'beeswarm'
  // bramble 莓果灌丛
  | 'thornnova' | 'berryfeast'
  // nocturne 星语夜原
  | 'fullmoon' | 'meteor'
  // summit 破晓之巅
  | 'beaconsurge' | 'dawnnova';

/** 成就（M7：40 个全量；M13：7 个纯计数移入 LEGACY，7 个结构性挑战顶替，总量不变）
 *  legacy id（kills5000/kills10000/coins5000/runs20/runs50/buy10/buy25）保留在联合类型：
 *  已解锁的旧档仍要渲染（legacy 区），i18n 键照常受 check-i18n 约束 */
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
  | 'hyperClear1' | 'hyperAll' | 'endless3' | 'endless6'
  // M13（结构性挑战，顶替 7 个纯计数）
  | 'flawlessBoss' | 'fiveCharWins' | 'noPassiveClear' | 'untouchable10'
  | 'evolveRush' | 'soloWeaponClear' | 'arcanaTrio'
  // M15（精英词缀）
  | 'affixSlayer' | 'graviticEscape'
  // M16（隐藏成就：未达成时成就页显示 ？？？，达成解锁隐藏角色）
  | 'secretBloom' | 'stargazer';
