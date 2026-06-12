// 全游戏唯一色彩来源
// 浅色主调：暖纸白背景，粉彩实体 + 同系深一阶描边保证可读性
// M5 起按地图分主题色组：MAP_PAL（纸底/装饰）+ 每图敌人池配色

export const PAL = {
  // 环境（晨光草甸基准）
  paper: 0xfaf5ea,
  paperCss: '#FAF5EA',
  grass: 0xcbe3b3,
  grassDark: 0xa8cd8c,
  pebble: 0xe8e0d0,
  ink: 0x5a5248, // 全局描边/文字 暖深灰
  inkCss: '#5A5248',
  inkSoft: '#8A8276',

  // 玩家：萤光小精灵
  playerBody: 0xffe9a8,
  playerEdge: 0xe2b452,
  playerGlow: 0xfff6d8,

  // 敌人（粉彩 + 深一阶描边）
  blob: 0xb9a8d4, blobEdge: 0x8a77a8,
  midge: 0xa8cbe8, midgeEdge: 0x7aa3c8,
  shelly: 0xa9c8a0, shellyEdge: 0x7da876, shellySpiral: 0xd8c8a0,
  spitter: 0xe2a8b8, spitterEdge: 0xc07890,
  dasher: 0xf0bc88, dasherEdge: 0xd08c50,
  splitter: 0x9cd8d0, splitterEdge: 0x68b0a8,
  elite: 0xa090c8, eliteEdge: 0x70609c,
  boss: 0x8a96b8, bossEdge: 0x5a6488,
  inkball: 0x9a88b8,

  // 武器主题色
  blade: 0xffe9b0, bladeDeep: 0xf0c860,
  petal: 0xf8a8c0, petalDeep: 0xe07898,
  prism: 0xffffff,
  rain: 0x90c8f0, rainDeep: 0x5898d0,
  spark: 0xffe070, sparkDeep: 0xf0b830,
  boom: 0x88d8b0, boomDeep: 0x50b080,
  mine: 0xc0a0e8, mineDeep: 0x9068c8,
  puff: 0xf5eedc, puffDeep: 0xb8a878,

  // 被动主题色（新增被动图标用）
  ladybug: 0xe87878, ladybugDeep: 0xb84848,
  honey: 0xf0b850, honeyDeep: 0xc08828,

  // 拾取物
  gem: 0xa8e0f8, gemBig: 0xffd870,
  heart: 0xf89098,
  chest: 0xe8c878,

  // UI
  hp: 0xf09098,
  hpBack: 0xf0e4d4,
  xp: 0xf8d060,
  xpBack: 0xf0e8d6,
  cardBg: 0xfffdf6,
  cardEdge: 0xe0d4bc,
  white: 0xffffff,
  dmgText: '#F08838',
  critText: '#E84838',
} as const;

// 彩虹渐变（棱镜光束用）
export const RAINBOW = [0xf8a0a8, 0xf8c890, 0xf8eea0, 0xb0e8b0, 0xa0d8f0, 0xc0b0e8];

// ---------- 露珠池塘（图 2）：清晨水汽，青绿水蓝 ----------
export const POND = {
  paper: 0xe9f3ec, paperCss: '#E9F3EC',
  lily: 0x9fcfa6, lilyEdge: 0x6fa878, lilyVein: 0x86bd8e,
  reed: 0xa8bf86, reedEdge: 0x82995e, cattail: 0xb08858,
  ripple: 0x9cc8d4,
  lotus: 0xf2b8cc, lotusDeep: 0xd88aa8, lotusCore: 0xf7dd8a,
  shell: 0xe0d2bc, shellEdge: 0xb09c7c,
  pool: 0x9ed0dc, poolDeep: 0x68a8bc,

  // 敌人池
  tad: 0x8fb8d8, tadEdge: 0x6088b0,
  bubble: 0xc2e2ee, bubbleEdge: 0x86bcd0,
  snail: 0xd8b890, snailEdge: 0xa8845c, snailShell: 0xead8b4,
  frog: 0xa6d488, frogEdge: 0x72a858,
  squirt: 0x86c2d6, squirtEdge: 0x5694b0,
  jelly: 0xd8b8e0, jellyEdge: 0xa888c0,
  bigbubble: 0xa6d2e8, bigbubbleEdge: 0x6aa4c8,
  bubbleking: 0x7caac8, bubblekingEdge: 0x4c7aa0,
} as const;

// ---------- 晚霞山岗（图 3）：金色麦浪，霞光暖橙 ----------
export const HILLS = {
  paper: 0xfaefdf, paperCss: '#FAEFDF',
  wheat: 0xe8c878, wheatEdge: 0xc09c48, wheatDark: 0xd4ae5c,
  tuft: 0xd8bc74, tuftEdge: 0xb09452,
  daisy: 0xf2a868, daisyDeep: 0xd07e3e, daisyCore: 0x8a5c30,
  leafFall: 0xe09858, leafFallEdge: 0xb87038,
  stone: 0xe2d4bc,
  windStreak: 0xf2e2c2,

  // 敌人池
  leafy: 0xb6cc7a, leafyEdge: 0x88a44e,
  grain: 0xf0d490, grainEdge: 0xc8a050,
  crow: 0x9890b4, crowEdge: 0x686088, crowBeak: 0xf0b860,
  thistle: 0xcfae84, thistleEdge: 0x9c7a4e,
  wheatling: 0xf0cc88, wheatlingEdge: 0xc89c50,
  cone: 0xb89068, coneEdge: 0x886240,
  gust: 0xc6d6e6, gustEdge: 0x8ca8c4,
  bigthistle: 0xc8a070, bigthistleEdge: 0x927042,
  galecrow: 0x8088a8, galecrowEdge: 0x525a80,
  feather: 0xaab0cc,
} as const;

// ---------- 萤暮林地（图 4）：暮色苔绿，蘑菇与萤光 ----------
export const GROVE = {
  paper: 0xe7eedd, paperCss: '#E7EEDD',
  fern: 0x9cc294, fernEdge: 0x6f9a68,
  mossrock: 0xc2cbb0, mossrockEdge: 0x939e80,
  glowdot: 0xfff2b0,
  twig: 0xb09878, twigEdge: 0x80684c,
  decorShroom: 0xe0b0a0, decorShroomEdge: 0xb07c68, decorShroomDot: 0xfaf0e0,
  spring: 0xa8dcd0, springDeep: 0x68b0a4, springGold: 0xf2dd9a,

  // 敌人池
  shroom: 0xe8c0b0, shroomEdge: 0xb88878, shroomCap: 0xd89888,
  glimmer: 0xf4e4a0, glimmerEdge: 0xc4ac58,
  mottle: 0xc4b4d8, mottleEdge: 0x9080ac, mottleSpot: 0xe8d8a8,
  snapcap: 0xd8a8b8, snapcapEdge: 0xa87088, snapcapCap: 0xc08098,
  puffcap: 0xc8c8a0, puffcapEdge: 0x989868, puffcapCap: 0xb8b884,
  roller: 0xa89cc0, rollerEdge: 0x786c94,
  eldercap: 0xc89888, eldercapEdge: 0x906050, eldercapCap: 0xb87c68,
  sporeking: 0xb08878, sporekingEdge: 0x7c5848, sporekingCap: 0xcc9684,
  spore: 0xd8d0a8, sporeDeep: 0xa89c70,
} as const;

// ---------- 紫露花田（图 5）：薰衣淡紫，香风与蝶影 ----------
export const LAVENDER = {
  paper: 0xf2ecf6, paperCss: '#F2ECF6',
  lav: 0xb89cd8, lavEdge: 0x8868b0, lavLeaf: 0x9cba8c,
  bloom: 0xd8b8e8, bloomDeep: 0xa888c8, bloomCore: 0xf7dd8a,
  grass: 0xc0d0a8, grassEdge: 0x90a878,
  pebble: 0xe4dce8,
  breeze: 0xd8c8ee, breezeDeep: 0xb0a0d8,

  // 敌人池
  budling: 0xc0a8e0, budlingEdge: 0x9078b8,
  bumble: 0xf0cc78, bumbleEdge: 0xc09c40, bumbleStripe: 0x6a5a48,
  flutter: 0xd0a8e8, flutterEdge: 0xa078c0, flutterSpot: 0xf8e8b0,
  snippy: 0xa8c890, snippyEdge: 0x789860,
  pompon: 0xece4f4, pomponEdge: 0xb0a8c8,
  briar: 0xc08898, briarEdge: 0x906070,
  queenbee: 0xe8b860, queenbeeEdge: 0xb08830,
  flutterqueen: 0xa888d8, flutterqueenEdge: 0x7858a8,
  dust: 0xd8c0f0, thorn: 0xc090a8, thornDeep: 0x906070,
} as const;

// 敌人死亡纸屑颜色（与本体同色）
import type { EnemyId } from '../content/ids';
export const DEATH_COLOR: Record<EnemyId, number> = {
  blob: PAL.blob, midge: PAL.midge, shelly: PAL.shelly, spitter: PAL.spitter,
  dasher: PAL.dasher, splitter: PAL.splitter, mini: PAL.splitter, elite: PAL.elite, boss: PAL.boss,
  tad: POND.tad, bubble: POND.bubble, snail: POND.snail, frog: POND.frog,
  squirt: POND.squirt, jelly: POND.jelly, bigbubble: POND.bigbubble, bubbleking: POND.bubbleking,
  leafy: HILLS.leafy, grain: HILLS.grain, crow: HILLS.crow, thistle: HILLS.thistle,
  wheatling: HILLS.wheatling, cone: HILLS.cone, gust: HILLS.gust,
  bigthistle: HILLS.bigthistle, galecrow: HILLS.galecrow,
  shroom: GROVE.shroom, glimmer: GROVE.glimmer, mottle: GROVE.mottle, snapcap: GROVE.snapcap,
  puffcap: GROVE.puffcap, roller: GROVE.roller, eldercap: GROVE.eldercap, sporeking: GROVE.sporeking,
  budling: LAVENDER.budling, bumble: LAVENDER.bumble, flutter: LAVENDER.flutter, snippy: LAVENDER.snippy,
  pompon: LAVENDER.pompon, briar: LAVENDER.briar, queenbee: LAVENDER.queenbee, flutterqueen: LAVENDER.flutterqueen,
};

// 角色配色（makeCharacter 配方用；body 主体 / edge 描边）
import type { CharacterId } from '../content/ids';
export const CHAR_PAL: Record<Exclude<CharacterId, 'spark'>, { body: number; edge: number }> = {
  rosa:   { body: 0xf8b0c4, edge: 0xd87898 },
  dew:    { body: 0xaad4f0, edge: 0x6ba3d0 },
  gale:   { body: 0xa8e0c0, edge: 0x68b890 },
  lumen:  { body: 0xd8d0f0, edge: 0x9a8cc8 },
  volt:   { body: 0xffe070, edge: 0xe0a830 },
  pebble: { body: 0xd8c0a0, edge: 0xa88860 },
  fluff:  { body: 0xf0e4cc, edge: 0xa89468 }, // 奶油色：与纸底拉开对比，白绒毛圈才显形
  ember:  { body: 0xf8c08a, edge: 0xd08848 },
  luna:   { body: 0xc8ccf0, edge: 0x8a90c8 },
  conker: { body: 0xd8a878, edge: 0xa07048 },
  jingle: { body: 0xc8e8e0, edge: 0x80b8a8 },
};

export function cssOf(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}
