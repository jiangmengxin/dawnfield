// 晨光草甸配色 — 全游戏唯一色彩来源
// 浅色主调：暖纸白背景，粉彩实体 + 同系深一阶描边保证可读性

export const PAL = {
  // 环境
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

export function cssOf(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}
