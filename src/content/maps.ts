// 地图表（纯数据层，禁止依赖 Phaser）：MapSpec 全链路
// 每图差异化：时长（12/15/18 分钟）/ 纸底配色 / 装饰层 / 专属敌人池与波次节奏 /
// 轻量机制（无→减速水皮→定时大风）/ BGM 主题（调式/速度/音色/打击乐）/ Boss / 解锁链
import type { AchievementId, EnemyId, MapId } from './ids';

// ---------- 波次 ----------

export interface WavePhase {
  from: number; // 秒
  interval: number; // 刷怪间隔（秒）
  burst: number; // 每次刷几只
  maxAlive: number;
  types: Array<[EnemyId, number]>; // [类型, 权重]
}

export interface WaveEvent {
  t: number;
  kind: 'ring' | 'elite' | 'boss';
  enemy?: EnemyId; // ring 必填；elite 缺省用 MapSpec.eliteId
  n?: number;
}

// ---------- 装饰 ----------

/** 每 chunk 装饰层：keys 内随机挑一种纹理铺 nMin..nMax 个 */
export interface DecorLayer {
  keys: string[];
  nMin: number;
  nMax: number;
  chance: number; // 该层在 chunk 出现的概率
}

// ---------- 地图机制 ----------

export type MechanicSpec =
  | { kind: 'puddles'; first: number; interval: number; count: number; r: number; dur: number; playerSlow: number }
  | { kind: 'storm'; first: number; interval: number; warnT: number; dur: number; pushPlayer: number; pushEnemy: number };

// ---------- BGM 主题（WebAudio 生成式，audio/sound.ts 消费） ----------

export interface BgmSpec {
  bpm: number;
  scale: number[]; // 拨弦音池（Hz）
  bass: number[]; // 低音根音循环
  chords: number[][]; // pad 和弦循环
  pluckType: OscillatorType;
  pluckVol: number;
  density: number; // 拨弦基础密度
  densityK: number; // 强度对密度的加成
  perc: 'tick' | 'drip' | 'shaker';
  echo: number; // 回声湿度 0..1
}

// ---------- MapSpec ----------

export interface MapSpec {
  id: MapId;
  minutes: number; // 名义时长（Boss 苏醒时刻）
  timeK: number; // 成长曲线时间缩放（= 12/minutes，长图成长更平缓）
  icon: string;
  iconScale: number;
  color: number; // UI 卡片主题色
  paperCss: string; // 战场纸底
  bossId: EnemyId;
  eliteId: EnemyId;
  waves: WavePhase[];
  events: WaveEvent[];
  decor: DecorLayer[];
  mechanic: MechanicSpec | null;
  bgm: BgmSpec;
  unlockAch: AchievementId | null; // null = 默认解锁（解锁链：通关上一图）
}

// C 大调五声（晨光草甸沿用 M1 配置）
const MEADOW_BGM: BgmSpec = {
  bpm: 96,
  scale: [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3],
  bass: [130.8, 98.0, 110.0, 146.8],
  chords: [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [196.0, 246.9, 293.7], [261.6, 349.2, 440.0]],
  pluckType: 'triangle',
  pluckVol: 0.045,
  density: 0.32,
  densityK: 0.3,
  perc: 'tick',
  echo: 0.35,
};

// A 小调五声低八度：慢板水汽感，正弦拨弦 + 重回声 + 水滴打点
const POND_BGM: BgmSpec = {
  bpm: 76,
  scale: [220.0, 261.6, 293.7, 329.6, 392.0, 440.0, 523.3],
  bass: [110.0, 87.3, 98.0, 73.4],
  chords: [[220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7], [164.8, 220.0, 261.6]],
  pluckType: 'sine',
  pluckVol: 0.055,
  density: 0.24,
  densityK: 0.24,
  perc: 'drip',
  echo: 0.55,
};

// G 混合利底亚五声高八度：快板明亮，干声拨弦 + 沙锤律动
const HILLS_BGM: BgmSpec = {
  bpm: 116,
  scale: [392.0, 440.0, 493.9, 587.3, 659.3, 784.0, 880.0],
  bass: [98.0, 87.3, 130.8, 110.0],
  chords: [[196.0, 246.9, 293.7], [174.6, 220.0, 261.6], [261.6, 329.6, 392.0], [196.0, 261.6, 293.7]],
  pluckType: 'triangle',
  pluckVol: 0.05,
  density: 0.44,
  densityK: 0.34,
  perc: 'shaker',
  echo: 0.18,
};

export const MAPS: MapSpec[] = [
  // ---------- 1. 晨光草甸：基准节奏，12 分钟（M2 原波次不变） ----------
  {
    id: 'meadow',
    minutes: 12,
    timeK: 1,
    icon: 'd_flower1',
    iconScale: 2.4,
    color: 0xa8cd8c,
    paperCss: '#FAF5EA',
    bossId: 'boss',
    eliteId: 'elite',
    waves: [
      { from: 0,   interval: 1.15, burst: 1, maxAlive: 22,  types: [['blob', 1]] },
      { from: 55,  interval: 1.0,  burst: 2, maxAlive: 42,  types: [['blob', 3], ['midge', 2]] },
      { from: 115, interval: 0.9,  burst: 2, maxAlive: 58,  types: [['blob', 3], ['midge', 2], ['splitter', 1.5]] },
      { from: 175, interval: 0.85, burst: 3, maxAlive: 78,  types: [['blob', 3], ['midge', 2], ['splitter', 1.5], ['shelly', 1]] },
      { from: 235, interval: 0.8,  burst: 3, maxAlive: 100, types: [['blob', 2.5], ['midge', 2], ['splitter', 1.5], ['shelly', 1], ['dasher', 1.2]] },
      { from: 300, interval: 0.75, burst: 3, maxAlive: 120, types: [['blob', 2], ['midge', 2], ['splitter', 1.5], ['shelly', 1.2], ['dasher', 1.2], ['spitter', 1]] },
      { from: 360, interval: 0.6,  burst: 4, maxAlive: 150, types: [['blob', 2], ['midge', 2.5], ['splitter', 1.5], ['shelly', 1.4], ['dasher', 1.4], ['spitter', 1.2]] },
      { from: 480, interval: 0.55, burst: 4, maxAlive: 185, types: [['blob', 1.5], ['midge', 2], ['splitter', 2], ['shelly', 2], ['dasher', 1.6], ['spitter', 1.4]] },
      { from: 600, interval: 0.45, burst: 5, maxAlive: 230, types: [['midge', 2], ['splitter', 2], ['shelly', 2.4], ['dasher', 2], ['spitter', 1.6]] },
      { from: 720, interval: 1.0,  burst: 2, maxAlive: 70,  types: [['midge', 2], ['dasher', 1.5], ['blob', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 200, kind: 'ring', enemy: 'blob', n: 18 },
      { t: 330, kind: 'elite' },
      { t: 430, kind: 'ring', enemy: 'midge', n: 26 },
      { t: 510, kind: 'elite' },
      { t: 565, kind: 'ring', enemy: 'splitter', n: 14 },
      { t: 660, kind: 'ring', enemy: 'shelly', n: 12 },
      { t: 720, kind: 'boss' },
    ],
    decor: [
      { keys: ['d_grass0', 'd_grass1', 'd_grass2'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['d_flower0', 'd_flower1', 'd_flower2'], nMin: 1, nMax: 3, chance: 0.75 },
      { keys: ['d_pebble0', 'd_pebble1'], nMin: 1, nMax: 1, chance: 0.5 },
    ],
    mechanic: null,
    bgm: MEADOW_BGM,
    unlockAch: null,
  },

  // ---------- 2. 露珠池塘：厚重慢节奏 + 减速水皮，15 分钟 ----------
  // 敌人少而硬（蜗蜗 95 血坦克、水枪鱼炮台、水母绕轨），考验集火与水皮间走位
  {
    id: 'pond',
    minutes: 15,
    timeK: 12 / 15,
    icon: 'pd_lotus',
    iconScale: 2.2,
    color: 0x8cc4ce,
    paperCss: '#E9F3EC',
    bossId: 'bubbleking',
    eliteId: 'bigbubble',
    waves: [
      { from: 0,   interval: 1.3,  burst: 1, maxAlive: 20,  types: [['tad', 1]] },
      { from: 50,  interval: 1.1,  burst: 2, maxAlive: 36,  types: [['tad', 3], ['bubble', 2]] },
      { from: 110, interval: 1.0,  burst: 2, maxAlive: 50,  types: [['tad', 3], ['bubble', 2], ['frog', 1.2]] },
      { from: 180, interval: 0.95, burst: 2, maxAlive: 64,  types: [['tad', 2.5], ['bubble', 2], ['frog', 1.5], ['snail', 1]] },
      { from: 255, interval: 0.9,  burst: 3, maxAlive: 80,  types: [['bubble', 2], ['frog', 1.6], ['snail', 1.2], ['jelly', 1.2], ['tad', 1.5]] },
      { from: 330, interval: 0.85, burst: 3, maxAlive: 96,  types: [['frog', 1.6], ['snail', 1.4], ['jelly', 1.4], ['squirt', 1], ['bubble', 1.6]] },
      { from: 420, interval: 0.8,  burst: 3, maxAlive: 115, types: [['frog', 1.6], ['snail', 1.6], ['jelly', 1.6], ['squirt', 1.2], ['tad', 1.6]] },
      { from: 540, interval: 0.7,  burst: 4, maxAlive: 140, types: [['snail', 2], ['jelly', 1.8], ['squirt', 1.4], ['frog', 1.8], ['bubble', 1.5]] },
      { from: 660, interval: 0.6,  burst: 4, maxAlive: 170, types: [['snail', 2.2], ['jelly', 2], ['squirt', 1.6], ['frog', 2], ['tad', 2]] },
      { from: 780, interval: 0.55, burst: 5, maxAlive: 200, types: [['jelly', 2.2], ['snail', 2.4], ['squirt', 1.8], ['frog', 2.2]] },
      { from: 900, interval: 1.1,  burst: 2, maxAlive: 60,  types: [['tad', 2], ['bubble', 1.5], ['frog', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 150, kind: 'ring', enemy: 'bubble', n: 16 },
      { t: 240, kind: 'elite' },
      { t: 350, kind: 'ring', enemy: 'frog', n: 12 },
      { t: 430, kind: 'elite' },
      { t: 520, kind: 'ring', enemy: 'tad', n: 24 },
      { t: 610, kind: 'elite' },
      { t: 700, kind: 'ring', enemy: 'jelly', n: 14 },
      { t: 790, kind: 'elite' },
      { t: 850, kind: 'ring', enemy: 'snail', n: 12 },
      { t: 900, kind: 'boss' },
    ],
    decor: [
      { keys: ['pd_lily0', 'pd_lily1', 'pd_lily2'], nMin: 2, nMax: 4, chance: 1 },
      { keys: ['pd_reed0', 'pd_reed1'], nMin: 1, nMax: 3, chance: 0.7 },
      { keys: ['pd_ripple'], nMin: 1, nMax: 2, chance: 0.6 },
      { keys: ['pd_lotus'], nMin: 1, nMax: 1, chance: 0.3 },
      { keys: ['pd_shell'], nMin: 1, nMax: 1, chance: 0.35 },
    ],
    mechanic: { kind: 'puddles', first: 16, interval: 13, count: 2, r: 72, dur: 11, playerSlow: 0.62 },
    bgm: POND_BGM,
    unlockAch: 'meadowClear',
  },

  // ---------- 3. 晚霞山岗：轻血海量快节奏 + 定时大风，18 分钟 ----------
  // 敌人多而脆（谷粒海、乌鸫俯冲、蓟球冲刺、风灵闪现），大风周期打乱站位
  {
    id: 'hills',
    minutes: 18,
    timeK: 12 / 18,
    icon: 'hd_daisy',
    iconScale: 2.4,
    color: 0xe0a868,
    paperCss: '#FAEFDF',
    bossId: 'galecrow',
    eliteId: 'bigthistle',
    waves: [
      { from: 0,    interval: 0.95, burst: 2, maxAlive: 30,  types: [['leafy', 1]] },
      { from: 45,   interval: 0.85, burst: 2, maxAlive: 50,  types: [['leafy', 3], ['grain', 1.5]] },
      { from: 100,  interval: 0.8,  burst: 3, maxAlive: 70,  types: [['leafy', 3], ['grain', 2], ['crow', 1.2]] },
      { from: 160,  interval: 0.75, burst: 3, maxAlive: 92,  types: [['leafy', 2.5], ['grain', 2], ['crow', 1.4], ['thistle', 1.2]] },
      { from: 230,  interval: 0.7,  burst: 3, maxAlive: 115, types: [['leafy', 2], ['crow', 1.6], ['thistle', 1.4], ['wheatling', 1.4], ['grain', 1.5]] },
      { from: 300,  interval: 0.65, burst: 4, maxAlive: 140, types: [['crow', 1.8], ['thistle', 1.5], ['wheatling', 1.6], ['cone', 1.2], ['leafy', 1.6]] },
      { from: 390,  interval: 0.6,  burst: 4, maxAlive: 165, types: [['thistle', 1.6], ['wheatling', 1.8], ['cone', 1.4], ['gust', 1.2], ['crow', 1.8]] },
      { from: 480,  interval: 0.55, burst: 4, maxAlive: 190, types: [['wheatling', 2], ['cone', 1.6], ['gust', 1.4], ['thistle', 1.8], ['leafy', 1.4]] },
      { from: 600,  interval: 0.5,  burst: 5, maxAlive: 215, types: [['cone', 1.8], ['gust', 1.6], ['thistle', 2], ['wheatling', 2], ['crow', 2]] },
      { from: 750,  interval: 0.45, burst: 5, maxAlive: 245, types: [['gust', 1.8], ['cone', 2], ['thistle', 2.2], ['wheatling', 2.2]] },
      { from: 900,  interval: 0.4,  burst: 6, maxAlive: 270, types: [['gust', 2], ['cone', 2.2], ['thistle', 2.4], ['crow', 2.4], ['grain', 2]] },
      { from: 1080, interval: 0.9,  burst: 3, maxAlive: 80,  types: [['crow', 2], ['leafy', 1.5], ['grain', 1.5]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 120,  kind: 'ring', enemy: 'leafy', n: 18 },
      { t: 210,  kind: 'elite' },
      { t: 300,  kind: 'ring', enemy: 'crow', n: 20 },
      { t: 380,  kind: 'ring', enemy: 'grain', n: 30 },
      { t: 460,  kind: 'elite' },
      { t: 560,  kind: 'ring', enemy: 'thistle', n: 14 },
      { t: 660,  kind: 'ring', enemy: 'cone', n: 12 },
      { t: 740,  kind: 'elite' },
      { t: 830,  kind: 'ring', enemy: 'gust', n: 12 },
      { t: 920,  kind: 'elite' },
      { t: 1000, kind: 'ring', enemy: 'crow', n: 26 },
      { t: 1080, kind: 'boss' },
    ],
    decor: [
      { keys: ['hd_wheat0', 'hd_wheat1', 'hd_wheat2'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['hd_tuft0', 'hd_tuft1'], nMin: 1, nMax: 3, chance: 0.7 },
      { keys: ['hd_leaf0', 'hd_leaf1'], nMin: 1, nMax: 3, chance: 0.6 },
      { keys: ['hd_daisy'], nMin: 1, nMax: 1, chance: 0.35 },
      { keys: ['hd_stone'], nMin: 1, nMax: 1, chance: 0.4 },
    ],
    mechanic: { kind: 'storm', first: 75, interval: 95, warnT: 3, dur: 7, pushPlayer: 95, pushEnemy: 130 },
    bgm: HILLS_BGM,
    unlockAch: 'pondClear',
  },
];

/** 按 id 取地图；未知 id 兜底为草甸（防坏档/旧链接） */
export function getMap(id: string): MapSpec {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
