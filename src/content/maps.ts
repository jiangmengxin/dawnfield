// 地图表（纯数据层，禁止依赖 Phaser）：MapSpec 全链路
// 每图差异化：时长（M12 起三档：10 / 20 / 30 分钟）/ 纸底配色 / 装饰层 / 专属敌人池与波次节奏 /
// 轻量机制（无→减速水皮→定时大风）/ BGM 主题（调式/速度/音色/打击乐）/ Boss / 解锁链
import type { AchievementId, DropItemId, EnemyId, MapId } from './ids';

// ---------- 波次 ----------

export interface WavePhase {
  from: number; // 秒
  interval: number; // 刷怪间隔（秒）
  burst: number; // 每次刷几只
  maxAlive: number;
  types: Array<[EnemyId, number]>; // [类型, 权重]
}

// surge（M12）：中场强敌成群——n 只精英环形包围 + 横幅 + 保底宝箱兜底；
// 一次性事件，时点必须落在无尽重放窗口 [bossT−300, bossT] 之外（tests/endless.test.ts 卡口）
export interface WaveEvent {
  t: number;
  kind: 'ring' | 'elite' | 'boss' | 'surge';
  enemy?: EnemyId; // ring 必填；elite/surge 缺省用 MapSpec.eliteId
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

// M18：每图核心机制差异化——核心机制改变策略轴，旧区域机制降级为次要风味并存（mechanic 改数组）。
// 调度器在 systems/MapMechanicSystem.ts，每 kind 一模块 systems/mechanics/<kind>.ts。
export type MechanicSpec =
  // ---------- 旧区域机制（M6/M7；降级为各图次要风味，行为不变） ----------
  | { kind: 'puddles'; first: number; interval: number; count: number; r: number; dur: number; playerSlow: number }
  | { kind: 'storm'; first: number; interval: number; warnT: number; dur: number; pushPlayer: number; pushEnemy: number }
  | { kind: 'springs'; first: number; interval: number; count: number; r: number; dur: number; hps: number }
  | { kind: 'gusts'; first: number; interval: number; count: number; r: number; dur: number; mul: number }
  | { kind: 'starfall'; first: number; interval: number; count: number; r: number; warnT: number; dmg: number; edmg: number }
  // M18 将被 thornwall/beacon 吸收（保留至批次2 切换）
  | { kind: 'brambles'; first: number; interval: number; count: number; r: number; dur: number; dmg: number }
  | { kind: 'dawnpillar'; first: number; interval: number; count: number; r: number; dur: number; hps: number; dps: number }
  // ---------- M18 核心机制（每图一条，改变策略轴） ----------
  // meadow 花圃育成：花苞旁停留催熟→绽放炸 XP/治疗团；敌人践踏摧毁（守点 vs 风筝）
  | { kind: 'bloomfield'; first: number; interval: number; maxAlive: number; r: number; growT: number; xp: number; heal: number }
  // pond 涨潮退潮：周期涨水，荷叶岛外重减速+滴血（敌人不受影响）（领土收缩→选岛守岛换岛）
  | { kind: 'tide'; period: number; highT: number; warnT: number; islandN: number; islandR: number; slow: number; dps: number }
  // hills 山风走向：常驻定向风（缓慢转向），顺风加速逆风减速，敌人按 knockMul 同理（路线核算）
  | { kind: 'wind'; turnEvery: number; speed: number; accel: number }
  // grove 孢子连锁：机制孢子云内死亡的敌人迸发孢子爆，连锁伤邻怪（聚怪与击杀顺序）
  | { kind: 'sporechain'; first: number; interval: number; count: number; r: number; dur: number; edmg: number; chainR: number; maxDepth: number }
  // lavender 花粉积蓄：花粉带内每秒积 1 层（上限 maxStacks），每层增伤+范围，离开衰减（贪 buff vs 安全）
  | { kind: 'pollen'; first: number; interval: number; count: number; r: number; dur: number; maxStacks: number; dmgPer: number }
  // bramble 荆棘围栏：刺篱成弧生长为实体墙，阻挡玩家（敌人穿行、弹体飞越）（空间管理，防被围死）
  | { kind: 'thornwall'; first: number; interval: number; segR: number; segN: number; gapDeg: number; dur: number; dist: number }
  // nocturne 夜幕与光界：全场罩暗、玩家光圈内正常，拾星屑临时照亮全场（光圈即资源）
  | { kind: 'nightfall'; darkAlpha: number; starEvery: number; litT: number }
  // summit 破晓烽台：晨光柱累计停留点燃→永久据点网（上限 maxLit），每点燃 1 座敌人生成 HP 衰减（推进点灯 vs 苟刷）
  | { kind: 'beacon'; first: number; interval: number; count: number; r: number; igniteT: number; maxLit: number; hps: number; dps: number; enemyHpPer: number }
  // orchard 丰收落果：果实预警后坠落，伤敌并产出经验/金币（引怪进落点）
  | { kind: 'orchard'; first: number; interval: number; count: number; r: number; warnT: number; dmg: number; xp: number; coin: number; dropHits: number }
  // snowbell 雪铃寒印：玩家踩入寒印充能，碎裂后减速地皮 + 冰爆控场（选择何时引爆）
  | { kind: 'frostseal'; first: number; interval: number; count: number; r: number; dur: number; chargeT: number; dmg: number; slowMul: number }
  // mirage 彩镜折光：镜场内蓄能，满能折射多段光束（站位贪能量 vs 安全）
  | { kind: 'prismfield'; first: number; interval: number; count: number; r: number; dur: number; chargeT: number; dmg: number; beams: number }
  // clockwork 晨钟节拍：钟印倒计时，踩中节拍则友方钟波清场，否则小额惩罚（读拍与走位）
  | { kind: 'bellring'; first: number; interval: number; count: number; r: number; warnT: number; dmg: number; missDmg: number };

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
  minutes: number; // 名义时长（Boss 苏醒时刻；M12 起三档 10/20/30）
  timeK: number; // 成长曲线时间缩放（= 12/minutes，长图成长更平缓）
  xpK: number; // 升级节奏乘子（M12）：短图加快补偿总刷怪量缩减，长图微缓——避免短图升级慢
  icon: string;
  iconScale: number;
  color: number; // UI 卡片主题色
  paperCss: string; // 战场纸底
  bossId: EnemyId;
  eliteId: EnemyId;
  waves: WavePhase[];
  events: WaveEvent[];
  decor: DecorLayer[];
  mechanics: MechanicSpec[]; // M18：核心机制 + 次要风味并存（首项为核心，决定 BGM/文案基调）
  drops?: DropItemId[]; // M19：本图专属掉落道具池（≥2 种，由机制产物经 ctx.spawnMapDrop 产出）
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

// D 小调五声低回：暮色虫鸣，正弦拨弦 + 重回声
const GROVE_BGM: BgmSpec = {
  bpm: 84,
  scale: [293.7, 349.2, 392.0, 440.0, 523.3, 587.3],
  bass: [73.4, 87.3, 98.0, 65.4],
  chords: [[293.7, 349.2, 440.0], [233.1, 293.7, 349.2], [261.6, 329.6, 392.0], [220.0, 293.7, 349.2]],
  pluckType: 'sine',
  pluckVol: 0.052,
  density: 0.26,
  densityK: 0.26,
  perc: 'tick',
  echo: 0.5,
};

// E 大调五声明快：花田香风，三角波拨弦 + 沙锤摇曳
const LAVENDER_BGM: BgmSpec = {
  bpm: 108,
  scale: [329.6, 370.0, 415.3, 493.9, 554.4, 659.3],
  bass: [82.4, 92.5, 110.0, 103.8],
  chords: [[164.8, 207.7, 246.9], [138.6, 174.6, 207.7], [185.0, 233.1, 277.2], [164.8, 220.0, 246.9]],
  pluckType: 'triangle',
  pluckVol: 0.048,
  density: 0.4,
  densityK: 0.3,
  perc: 'shaker',
  echo: 0.25,
};

// F 大调五声中板：莓香丰收感，三角波拨弦 + 沙锤
const BRAMBLE_BGM: BgmSpec = {
  bpm: 92,
  scale: [349.2, 392.0, 440.0, 523.3, 587.3, 698.5],
  bass: [87.3, 98.0, 116.5, 110.0],
  chords: [[174.6, 220.0, 261.6], [146.8, 174.6, 220.0], [196.0, 233.1, 293.7], [174.6, 233.1, 261.6]],
  pluckType: 'triangle',
  pluckVol: 0.05,
  density: 0.34,
  densityK: 0.3,
  perc: 'shaker',
  echo: 0.3,
};

// B 小调五声高八度疏点：午夜星光，正弦拨弦 + 极重回声 + 水滴星点
const NOCTURNE_BGM: BgmSpec = {
  bpm: 72,
  scale: [493.9, 554.4, 659.3, 740.0, 880.0, 987.8],
  bass: [61.7, 73.4, 82.4, 55.0],
  chords: [[246.9, 293.7, 370.0], [196.0, 246.9, 293.7], [220.0, 277.2, 329.6], [185.0, 246.9, 277.2]],
  pluckType: 'sine',
  pluckVol: 0.055,
  density: 0.2,
  densityK: 0.26,
  perc: 'drip',
  echo: 0.65,
};

// C 大调五声跨两个八度：破晓昂扬，三角波拨弦 + 沙锤推进
const SUMMIT_BGM: BgmSpec = {
  bpm: 100,
  scale: [261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1046.5],
  bass: [65.4, 98.0, 87.3, 130.8],
  chords: [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 261.6, 293.7]],
  pluckType: 'triangle',
  pluckVol: 0.05,
  density: 0.38,
  densityK: 0.34,
  perc: 'shaker',
  echo: 0.4,
};

// G 大调五声中快：果园丰收，木质拨弦 + 轻沙锤
const ORCHARD_BGM: BgmSpec = {
  bpm: 104,
  scale: [196.0, 246.9, 293.7, 392.0, 493.9, 587.3, 784.0],
  bass: [98.0, 130.8, 110.0, 146.8],
  chords: [[196.0, 246.9, 293.7], [261.6, 329.6, 392.0], [220.0, 293.7, 349.2], [196.0, 293.7, 392.0]],
  pluckType: 'triangle',
  pluckVol: 0.05,
  density: 0.38,
  densityK: 0.32,
  perc: 'shaker',
  echo: 0.28,
};

// F 大调五声慢中板：雪铃清亮，正弦拨弦 + 高回声
const SNOWBELL_BGM: BgmSpec = {
  bpm: 82,
  scale: [349.2, 392.0, 440.0, 523.3, 587.3, 698.5, 880.0],
  bass: [87.3, 116.5, 98.0, 130.8],
  chords: [[174.6, 220.0, 261.6], [196.0, 246.9, 293.7], [146.8, 196.0, 246.9], [174.6, 261.6, 349.2]],
  pluckType: 'sine',
  pluckVol: 0.054,
  density: 0.24,
  densityK: 0.26,
  perc: 'drip',
  echo: 0.6,
};

// C 利底亚色彩：玻璃折光，明亮三角波 + 水滴点
const MIRAGE_BGM: BgmSpec = {
  bpm: 112,
  scale: [261.6, 329.6, 370.0, 392.0, 523.3, 659.3, 740.0, 784.0],
  bass: [65.4, 98.0, 92.5, 110.0],
  chords: [[261.6, 329.6, 392.0], [293.7, 370.0, 440.0], [246.9, 329.6, 392.0], [220.0, 293.7, 370.0]],
  pluckType: 'triangle',
  pluckVol: 0.046,
  density: 0.42,
  densityK: 0.34,
  perc: 'drip',
  echo: 0.42,
};

// D 大调五声快板：晨钟节拍，干净拨弦 + tick 打点
const CLOCKWORK_BGM: BgmSpec = {
  bpm: 120,
  scale: [293.7, 329.6, 370.0, 440.0, 493.9, 587.3, 659.3, 880.0],
  bass: [73.4, 110.0, 98.0, 146.8],
  chords: [[293.7, 370.0, 440.0], [246.9, 329.6, 392.0], [220.0, 293.7, 370.0], [293.7, 440.0, 587.3]],
  pluckType: 'triangle',
  pluckVol: 0.048,
  density: 0.5,
  densityK: 0.36,
  perc: 'tick',
  echo: 0.22,
};

export const MAPS: MapSpec[] = [
  // ---------- 1. 晨光草甸：基准节奏，10 分钟（M12 短档；波次自 M2 表等比压缩） ----------
  {
    id: 'meadow',
    drops: ['bloomburst', 'verdant', 'blossomsalvo'],
    minutes: 10,
    timeK: 12 / 10,
    xpK: 1.2,
    icon: 'd_flower1',
    iconScale: 2.4,
    color: 0xa8cd8c,
    paperCss: '#FAF5EA',
    bossId: 'boss',
    eliteId: 'elite',
    waves: [
      { from: 0,   interval: 1.15, burst: 1, maxAlive: 22,  types: [['blob', 1]] },
      { from: 45,  interval: 1.0,  burst: 2, maxAlive: 42,  types: [['blob', 3], ['midge', 2]] },
      { from: 95,  interval: 0.9,  burst: 2, maxAlive: 58,  types: [['blob', 3], ['midge', 2], ['splitter', 1.5]] },
      { from: 145, interval: 0.85, burst: 3, maxAlive: 78,  types: [['blob', 3], ['midge', 2], ['splitter', 1.5], ['shelly', 1]] },
      { from: 195, interval: 0.8,  burst: 3, maxAlive: 100, types: [['blob', 2.5], ['midge', 2], ['splitter', 1.5], ['shelly', 1], ['dasher', 1.2]] },
      { from: 250, interval: 0.75, burst: 3, maxAlive: 120, types: [['blob', 2], ['midge', 2], ['splitter', 1.5], ['shelly', 1.2], ['dasher', 1.2], ['spitter', 1]] },
      { from: 300, interval: 0.6,  burst: 4, maxAlive: 150, types: [['blob', 2], ['midge', 2.5], ['splitter', 1.5], ['shelly', 1.4], ['dasher', 1.4], ['spitter', 1.2]] },
      { from: 400, interval: 0.55, burst: 4, maxAlive: 185, types: [['blob', 1.5], ['midge', 2], ['splitter', 2], ['shelly', 2], ['dasher', 1.6], ['spitter', 1.4]] },
      { from: 500, interval: 0.45, burst: 5, maxAlive: 230, types: [['midge', 2], ['splitter', 2], ['shelly', 2.4], ['dasher', 2], ['spitter', 1.6]] },
      { from: 600, interval: 1.0,  burst: 2, maxAlive: 70,  types: [['midge', 2], ['dasher', 1.5], ['blob', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 165, kind: 'ring', enemy: 'blob', n: 18 },
      { t: 275, kind: 'elite' },
      { t: 355, kind: 'ring', enemy: 'midge', n: 26 },
      { t: 425, kind: 'elite' },
      { t: 470, kind: 'ring', enemy: 'splitter', n: 14 },
      { t: 550, kind: 'ring', enemy: 'shelly', n: 12 },
      { t: 600, kind: 'boss' },
    ],
    decor: [
      { keys: ['d_grass0', 'd_grass1', 'd_grass2'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['d_flower0', 'd_flower1', 'd_flower2'], nMin: 1, nMax: 3, chance: 0.75 },
      { keys: ['d_pebble0', 'd_pebble1'], nMin: 1, nMax: 1, chance: 0.5 },
    ],
    // M18 核心：花圃育成（首图 first 晚=前期纯净教学；守苗炸 XP/治疗 vs 风筝）
    mechanics: [{ kind: 'bloomfield', first: 90, interval: 14, maxAlive: 3, r: 46, growT: 4.5, xp: 24, heal: 18 }],
    bgm: MEADOW_BGM,
    unlockAch: null,
  },

  // ---------- 2. 露珠池塘：厚重慢节奏 + 减速水皮，10 分钟（M12 短档） ----------
  // 敌人少而硬（蜗蜗 95 血坦克、水枪鱼炮台、水母绕轨），考验集火与水皮间走位
  {
    id: 'pond',
    drops: ['ebbaegis', 'ripple', 'tidalcrush'],
    minutes: 10,
    timeK: 12 / 10,
    xpK: 1.5,
    icon: 'pd_lotus',
    iconScale: 2.2,
    color: 0x8cc4ce,
    paperCss: '#E9F3EC',
    bossId: 'bubbleking',
    eliteId: 'bigbubble',
    waves: [
      { from: 0,   interval: 1.3,  burst: 1, maxAlive: 20,  types: [['tad', 1]] },
      { from: 35,  interval: 1.1,  burst: 2, maxAlive: 36,  types: [['tad', 3], ['bubble', 2]] },
      { from: 75,  interval: 1.0,  burst: 2, maxAlive: 50,  types: [['tad', 3], ['bubble', 2], ['frog', 1.2]] },
      { from: 120, interval: 0.95, burst: 2, maxAlive: 64,  types: [['tad', 2.5], ['bubble', 2], ['frog', 1.5], ['snail', 1]] },
      { from: 170, interval: 0.9,  burst: 3, maxAlive: 80,  types: [['bubble', 2], ['frog', 1.6], ['snail', 1.2], ['jelly', 1.2], ['tad', 1.5]] },
      { from: 220, interval: 0.85, burst: 3, maxAlive: 96,  types: [['frog', 1.6], ['snail', 1.4], ['jelly', 1.4], ['squirt', 1], ['bubble', 1.6]] },
      { from: 280, interval: 0.8,  burst: 3, maxAlive: 115, types: [['frog', 1.6], ['snail', 1.6], ['jelly', 1.6], ['squirt', 1.2], ['tad', 1.6]] },
      { from: 360, interval: 0.7,  burst: 4, maxAlive: 140, types: [['snail', 2], ['jelly', 1.8], ['squirt', 1.4], ['frog', 1.8], ['bubble', 1.5]] },
      { from: 440, interval: 0.6,  burst: 4, maxAlive: 170, types: [['snail', 2.2], ['jelly', 2], ['squirt', 1.6], ['frog', 2], ['tad', 2]] },
      { from: 520, interval: 0.55, burst: 5, maxAlive: 200, types: [['jelly', 2.2], ['snail', 2.4], ['squirt', 1.8], ['frog', 2.2]] },
      { from: 600, interval: 1.1,  burst: 2, maxAlive: 60,  types: [['tad', 2], ['bubble', 1.5], ['frog', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 100, kind: 'ring', enemy: 'bubble', n: 16 },
      { t: 160, kind: 'elite' },
      { t: 235, kind: 'ring', enemy: 'frog', n: 12 },
      { t: 285, kind: 'elite' },
      { t: 345, kind: 'ring', enemy: 'tad', n: 24 },
      { t: 405, kind: 'elite' },
      { t: 465, kind: 'ring', enemy: 'jelly', n: 14 },
      { t: 525, kind: 'elite' },
      { t: 565, kind: 'ring', enemy: 'snail', n: 12 },
      { t: 600, kind: 'boss' },
    ],
    decor: [
      { keys: ['pd_lily0', 'pd_lily1', 'pd_lily2'], nMin: 2, nMax: 4, chance: 1 },
      { keys: ['pd_reed0', 'pd_reed1'], nMin: 1, nMax: 3, chance: 0.7 },
      { keys: ['pd_ripple'], nMin: 1, nMax: 2, chance: 0.6 },
      { keys: ['pd_lotus'], nMin: 1, nMax: 1, chance: 0.3 },
      { keys: ['pd_shell'], nMin: 1, nMax: 1, chance: 0.35 },
    ],
    // M18 核心：涨潮退潮（岛外重减速滴血，puddles 吸收为退潮残留积水；选岛守岛换岛）
    mechanics: [{ kind: 'tide', period: 30, highT: 9, warnT: 4.5, islandN: 3, islandR: 95, slow: 0.5, dps: 4 }],
    bgm: POND_BGM,
    unlockAch: 'meadowClear',
  },

  // ---------- 3. 晚霞山岗：轻血海量快节奏 + 定时大风，10 分钟（M12 短档） ----------
  // 敌人多而脆（谷粒海、乌鸫俯冲、蓟球冲刺、风灵闪现），大风周期打乱站位
  {
    id: 'hills',
    drops: ['tailwind', 'whirlwind', 'galeblades'],
    minutes: 10,
    timeK: 12 / 10,
    xpK: 1.8,
    icon: 'hd_daisy',
    iconScale: 2.4,
    color: 0xe0a868,
    paperCss: '#FAEFDF',
    bossId: 'galecrow',
    eliteId: 'bigthistle',
    waves: [
      { from: 0,   interval: 0.95, burst: 2, maxAlive: 30,  types: [['leafy', 1]] },
      { from: 25,  interval: 0.85, burst: 2, maxAlive: 50,  types: [['leafy', 3], ['grain', 1.5]] },
      { from: 55,  interval: 0.8,  burst: 3, maxAlive: 70,  types: [['leafy', 3], ['grain', 2], ['crow', 1.2]] },
      { from: 90,  interval: 0.75, burst: 3, maxAlive: 92,  types: [['leafy', 2.5], ['grain', 2], ['crow', 1.4], ['thistle', 1.2]] },
      { from: 130, interval: 0.7,  burst: 3, maxAlive: 115, types: [['leafy', 2], ['crow', 1.6], ['thistle', 1.4], ['wheatling', 1.4], ['grain', 1.5]] },
      { from: 165, interval: 0.65, burst: 4, maxAlive: 140, types: [['crow', 1.8], ['thistle', 1.5], ['wheatling', 1.6], ['cone', 1.2], ['leafy', 1.6]] },
      { from: 215, interval: 0.6,  burst: 4, maxAlive: 165, types: [['thistle', 1.6], ['wheatling', 1.8], ['cone', 1.4], ['gust', 1.2], ['crow', 1.8]] },
      { from: 265, interval: 0.55, burst: 4, maxAlive: 190, types: [['wheatling', 2], ['cone', 1.6], ['gust', 1.4], ['thistle', 1.8], ['leafy', 1.4]] },
      { from: 335, interval: 0.5,  burst: 5, maxAlive: 215, types: [['cone', 1.8], ['gust', 1.6], ['thistle', 2], ['wheatling', 2], ['crow', 2]] },
      { from: 415, interval: 0.45, burst: 5, maxAlive: 245, types: [['gust', 1.8], ['cone', 2], ['thistle', 2.2], ['wheatling', 2.2]] },
      { from: 500, interval: 0.4,  burst: 6, maxAlive: 270, types: [['gust', 2], ['cone', 2.2], ['thistle', 2.4], ['crow', 2.4], ['grain', 2]] },
      { from: 600, interval: 0.9,  burst: 3, maxAlive: 80,  types: [['crow', 2], ['leafy', 1.5], ['grain', 1.5]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 65,  kind: 'ring', enemy: 'leafy', n: 18 },
      { t: 115, kind: 'elite' },
      { t: 165, kind: 'ring', enemy: 'crow', n: 20 },
      { t: 210, kind: 'ring', enemy: 'grain', n: 30 },
      { t: 255, kind: 'elite' },
      { t: 310, kind: 'ring', enemy: 'thistle', n: 14 },
      { t: 365, kind: 'ring', enemy: 'cone', n: 12 },
      { t: 410, kind: 'elite' },
      { t: 460, kind: 'ring', enemy: 'gust', n: 12 },
      { t: 510, kind: 'elite' },
      { t: 555, kind: 'ring', enemy: 'crow', n: 26 },
      { t: 600, kind: 'boss' },
    ],
    decor: [
      { keys: ['hd_wheat0', 'hd_wheat1', 'hd_wheat2'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['hd_tuft0', 'hd_tuft1'], nMin: 1, nMax: 3, chance: 0.7 },
      { keys: ['hd_leaf0', 'hd_leaf1'], nMin: 1, nMax: 3, chance: 0.6 },
      { keys: ['hd_daisy'], nMin: 1, nMax: 1, chance: 0.35 },
      { keys: ['hd_stone'], nMin: 1, nMax: 1, chance: 0.4 },
    ],
    // M18 核心：山风走向（常驻定向风，顺逆风调速）+ storm 保留为周期高潮
    mechanics: [
      { kind: 'wind', turnEvery: 14, speed: 0.3, accel: 0.5 },
      { kind: 'storm', first: 75, interval: 95, warnT: 3, dur: 7, pushPlayer: 95, pushEnemy: 130 },
    ],
    bgm: HILLS_BGM,
    unlockAch: 'pondClear',
  },

  // ---------- 4. 萤暮林地：中速韧性 + 治愈泉，20 分钟（M12 中档） ----------
  // 敌人有黏性（害羞菇潜伏惊醒、孢孢菇炮台、滚滚甲冲滚），治愈泉逼迫主动走位换血
  {
    id: 'grove',
    drops: ['sporebloom', 'fireflies', 'sporecascade'],
    minutes: 20,
    timeK: 12 / 20,
    xpK: 1.05,
    icon: 'gd_shroom0',
    iconScale: 2.2,
    color: 0x9cb887,
    paperCss: '#E7EEDD',
    bossId: 'sporeking',
    eliteId: 'eldercap',
    waves: [
      { from: 0,    interval: 1.2,  burst: 1, maxAlive: 24,  types: [['shroom', 1]] },
      { from: 48,   interval: 1.05, burst: 2, maxAlive: 40,  types: [['shroom', 3], ['glimmer', 2]] },
      { from: 105,  interval: 0.95, burst: 2, maxAlive: 56,  types: [['shroom', 3], ['glimmer', 2], ['mottle', 1.2]] },
      { from: 170,  interval: 0.9,  burst: 3, maxAlive: 75,  types: [['shroom', 2.5], ['glimmer', 2], ['mottle', 1.5], ['snapcap', 1]] },
      { from: 250,  interval: 0.85, burst: 3, maxAlive: 95,  types: [['glimmer', 2], ['mottle', 1.6], ['snapcap', 1.3], ['roller', 1.2], ['shroom', 1.6]] },
      { from: 335,  interval: 0.8,  burst: 3, maxAlive: 115, types: [['mottle', 1.6], ['snapcap', 1.5], ['roller', 1.4], ['puffcap', 1], ['glimmer', 1.6]] },
      { from: 430,  interval: 0.72, burst: 4, maxAlive: 140, types: [['snapcap', 1.7], ['roller', 1.6], ['puffcap', 1.2], ['mottle', 1.8], ['shroom', 1.4]] },
      { from: 545,  interval: 0.65, burst: 4, maxAlive: 165, types: [['roller', 1.8], ['puffcap', 1.4], ['snapcap', 1.9], ['mottle', 2], ['glimmer', 1.7]] },
      { from: 665,  interval: 0.6,  burst: 4, maxAlive: 190, types: [['puffcap', 1.6], ['snapcap', 2.1], ['roller', 2], ['mottle', 2.2]] },
      // M15 后段新面孔：t=700（56%）起自爆菇入池（A1：后 75% 无新刺激）
      { from: 700,  interval: 0.6,  burst: 4, maxAlive: 190, types: [['puffcap', 1.6], ['snapcap', 2.1], ['roller', 2], ['mottle', 2.2], ['bombcap', 1]] },
      { from: 810,  interval: 0.55, burst: 5, maxAlive: 215, types: [['snapcap', 2.2], ['roller', 2.2], ['puffcap', 1.8], ['mottle', 2.4], ['glimmer', 2], ['bombcap', 1.1]] },
      { from: 970,  interval: 0.5,  burst: 5, maxAlive: 240, types: [['roller', 2.4], ['puffcap', 2], ['snapcap', 2.4], ['mottle', 2.6], ['shroom', 2], ['bombcap', 1.2]] },
      { from: 1200, interval: 1.0,  burst: 2, maxAlive: 70,  types: [['glimmer', 2], ['shroom', 1.5], ['mottle', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 135,  kind: 'ring', enemy: 'shroom', n: 16 },
      { t: 220,  kind: 'elite' },
      { t: 315,  kind: 'ring', enemy: 'glimmer', n: 24 },
      { t: 400,  kind: 'elite' },
      { t: 495,  kind: 'ring', enemy: 'mottle', n: 14 },
      { t: 590,  kind: 'elite' },
      { t: 685,  kind: 'ring', enemy: 'snapcap', n: 12 },
      { t: 780,  kind: 'elite' },
      { t: 885,  kind: 'ring', enemy: 'roller', n: 12 },
      { t: 990,  kind: 'elite' },
      { t: 1095, kind: 'ring', enemy: 'mottle', n: 24 },
      { t: 1200, kind: 'boss' },
    ],
    decor: [
      { keys: ['gd_fern0', 'gd_fern1'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['gd_shroom0', 'gd_shroom1'], nMin: 1, nMax: 3, chance: 0.7 },
      { keys: ['gd_glow'], nMin: 1, nMax: 2, chance: 0.5 },
      { keys: ['gd_mossrock'], nMin: 1, nMax: 1, chance: 0.4 },
      { keys: ['gd_twig'], nMin: 1, nMax: 1, chance: 0.35 },
    ],
    // M18 核心：孢子连锁（云内击杀连锁爆，聚怪收割）+ springs 治愈泉保留
    mechanics: [
      { kind: 'sporechain', first: 40, interval: 16, count: 1, r: 90, dur: 12, edmg: 18, chainR: 70, maxDepth: 3 },
      { kind: 'springs', first: 25, interval: 24, count: 1, r: 66, dur: 9, hps: 8 },
    ],
    bgm: GROVE_BGM,
    unlockAch: 'hillsClear',
  },

  // ---------- 5. 紫露花田：轻快缠绕 + 花浪阵风，20 分钟（M12 中档 + 中点 surge） ----------
  // 敌人轻而缠人（紫蝶螺旋盘入、嗡嗡蜂俯冲、绒球弹跳），顺风带敌我同加速
  {
    id: 'lavender',
    drops: ['pollenfrenzy', 'beeswarm', 'honeytempest'],
    minutes: 20,
    timeK: 12 / 20,
    xpK: 1.2,
    icon: 'ld_lav0',
    iconScale: 2.0,
    color: 0xa888cc,
    paperCss: '#F2ECF6',
    bossId: 'flutterqueen',
    eliteId: 'queenbee',
    waves: [
      { from: 0,    interval: 0.9,  burst: 2, maxAlive: 32,  types: [['budling', 1]] },
      { from: 40,   interval: 0.8,  burst: 2, maxAlive: 52,  types: [['budling', 3], ['bumble', 1.5]] },
      { from: 85,   interval: 0.75, burst: 3, maxAlive: 75,  types: [['budling', 3], ['bumble', 2], ['flutter', 1.2]] },
      { from: 140,  interval: 0.7,  burst: 3, maxAlive: 98,  types: [['budling', 2.5], ['bumble', 2], ['flutter', 1.5], ['pompon', 1.2]] },
      { from: 200,  interval: 0.65, burst: 3, maxAlive: 120, types: [['bumble', 2], ['flutter', 1.7], ['pompon', 1.5], ['snippy', 1.3], ['budling', 1.6]] },
      { from: 265,  interval: 0.6,  burst: 4, maxAlive: 145, types: [['flutter', 1.8], ['pompon', 1.6], ['snippy', 1.5], ['briar', 1.1], ['budling', 1.5]] },
      { from: 350,  interval: 0.55, burst: 4, maxAlive: 170, types: [['snippy', 1.7], ['briar', 1.3], ['flutter', 2], ['pompon', 1.8], ['bumble', 1.8]] },
      { from: 450,  interval: 0.5,  burst: 4, maxAlive: 195, types: [['briar', 1.5], ['snippy', 1.9], ['pompon', 2], ['flutter', 2.2], ['budling', 1.4]] },
      { from: 565,  interval: 0.48, burst: 5, maxAlive: 220, types: [['snippy', 2.1], ['briar', 1.7], ['flutter', 2.4], ['pompon', 2.2], ['bumble', 2]] },
      // M15 后段新面孔：t=680（47%）起蜂巢芽入池（召唤者，权重克制）
      { from: 680,  interval: 0.48, burst: 5, maxAlive: 220, types: [['snippy', 2.1], ['briar', 1.7], ['flutter', 2.4], ['pompon', 2.2], ['bumble', 2], ['hivebud', 0.8]] },
      { from: 700,  interval: 0.45, burst: 5, maxAlive: 245, types: [['briar', 1.9], ['snippy', 2.3], ['flutter', 2.6], ['pompon', 2.4], ['hivebud', 0.9]] },
      { from: 850,  interval: 0.42, burst: 6, maxAlive: 265, types: [['snippy', 2.5], ['briar', 2.1], ['flutter', 2.8], ['bumble', 2.4], ['budling', 2], ['hivebud', 1]] },
      { from: 1015, interval: 0.4,  burst: 6, maxAlive: 285, types: [['briar', 2.3], ['snippy', 2.7], ['flutter', 3], ['pompon', 2.6], ['hivebud', 1]] },
      { from: 1200, interval: 0.9,  burst: 3, maxAlive: 85,  types: [['bumble', 2], ['budling', 1.5], ['flutter', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 100,  kind: 'ring', enemy: 'budling', n: 18 },
      { t: 165,  kind: 'elite' },
      { t: 240,  kind: 'ring', enemy: 'bumble', n: 20 },
      { t: 315,  kind: 'ring', enemy: 'flutter', n: 22 },
      { t: 390,  kind: 'elite' },
      { t: 475,  kind: 'ring', enemy: 'pompon', n: 14 },
      { t: 555,  kind: 'elite' },
      { t: 600,  kind: 'surge', n: 2 }, // M12 中场事件（中点；不进无尽重放窗口）
      { t: 640,  kind: 'ring', enemy: 'snippy', n: 14 },
      { t: 725,  kind: 'elite' },
      { t: 810,  kind: 'ring', enemy: 'briar', n: 12 },
      { t: 890,  kind: 'elite' },
      { t: 975,  kind: 'ring', enemy: 'flutter', n: 28 },
      { t: 1065, kind: 'elite' },
      { t: 1140, kind: 'ring', enemy: 'bumble', n: 26 },
      { t: 1200, kind: 'boss' },
    ],
    decor: [
      { keys: ['ld_lav0', 'ld_lav1', 'ld_lav2'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['ld_grass0', 'ld_grass1'], nMin: 1, nMax: 3, chance: 0.7 },
      { keys: ['ld_bloom'], nMin: 1, nMax: 2, chance: 0.5 },
      { keys: ['ld_pebble'], nMin: 1, nMax: 1, chance: 0.4 },
      { keys: ['ld_bfly'], nMin: 1, nMax: 1, chance: 0.3 },
    ],
    // M18 核心：花粉积蓄（站花粉带增伤，贪 buff vs 安全）+ gusts 顺风带保留
    mechanics: [
      { kind: 'pollen', first: 35, interval: 18, count: 1, r: 95, dur: 14, maxStacks: 5, dmgPer: 0.04 },
      { kind: 'gusts', first: 40, interval: 30, count: 3, r: 105, dur: 9, mul: 1.4 },
    ],
    bgm: LAVENDER_BGM,
    unlockAch: 'groveClear',
  },

  // ---------- 6. 莓果灌丛：中坚黏人 + 荆棘地皮，20 分钟（M12 中档 + 中点 surge） ----------
  // 敌人结实缠斗（钻钻鼠地下突进、莓爪崽扑袭、浆果炮手压制），刺丛挤压走位空间
  {
    id: 'bramble',
    drops: ['thornnova', 'berryfeast', 'bramblecrown'],
    minutes: 20,
    timeK: 12 / 20,
    xpK: 1.3,
    icon: 'bd_berry',
    iconScale: 2.2,
    color: 0xc07888,
    paperCss: '#F1EFE0',
    bossId: 'bramblebear',
    eliteId: 'bigberry',
    waves: [
      { from: 0,    interval: 1.0,  burst: 2, maxAlive: 30,  types: [['berryling', 1]] },
      { from: 40,   interval: 0.9,  burst: 2, maxAlive: 52,  types: [['berryling', 3], ['bristle', 1.5]] },
      { from: 85,   interval: 0.85, burst: 3, maxAlive: 75,  types: [['berryling', 3], ['bristle', 2], ['magpie', 1.2]] },
      { from: 140,  interval: 0.8,  burst: 3, maxAlive: 98,  types: [['berryling', 2.5], ['bristle', 2], ['magpie', 1.5], ['mole', 1.2]] },
      { from: 200,  interval: 0.75, burst: 3, maxAlive: 120, types: [['bristle', 2], ['magpie', 1.7], ['mole', 1.5], ['cubby', 1.2], ['berryling', 1.6]] },
      { from: 270,  interval: 0.7,  burst: 4, maxAlive: 145, types: [['magpie', 1.8], ['mole', 1.6], ['cubby', 1.5], ['gourd', 1.1], ['berryling', 1.5]] },
      { from: 345,  interval: 0.62, burst: 4, maxAlive: 170, types: [['mole', 1.7], ['cubby', 1.7], ['gourd', 1.3], ['bristle', 1.8], ['magpie', 1.8]] },
      { from: 440,  interval: 0.58, burst: 4, maxAlive: 195, types: [['cubby', 1.9], ['gourd', 1.5], ['mole', 1.9], ['bristle', 2], ['magpie', 2]] },
      { from: 540,  interval: 0.54, burst: 5, maxAlive: 220, types: [['gourd', 1.7], ['cubby', 2.1], ['mole', 2.1], ['bristle', 2.2]] },
      { from: 655,  interval: 0.5,  burst: 5, maxAlive: 245, types: [['cubby', 2.3], ['gourd', 1.9], ['mole', 2.3], ['magpie', 2.4], ['berryling', 2]] },
      // M15 后段新面孔：t=700（45%）起果壳卫入池（护盾光环，先点名击杀）
      { from: 700,  interval: 0.5,  burst: 5, maxAlive: 245, types: [['cubby', 2.3], ['gourd', 1.9], ['mole', 2.3], ['magpie', 2.4], ['berryling', 2], ['husker', 0.9]] },
      { from: 785,  interval: 0.46, burst: 6, maxAlive: 268, types: [['gourd', 2.1], ['cubby', 2.5], ['bristle', 2.6], ['mole', 2.5], ['husker', 1]] },
      { from: 925,  interval: 0.44, burst: 6, maxAlive: 288, types: [['cubby', 2.7], ['gourd', 2.3], ['magpie', 2.8], ['mole', 2.7], ['berryling', 2.2], ['husker', 1.1]] },
      { from: 1060, interval: 0.42, burst: 6, maxAlive: 300, types: [['gourd', 2.5], ['cubby', 2.9], ['bristle', 3], ['mole', 2.9], ['husker', 1.2]] },
      { from: 1200, interval: 0.95, burst: 3, maxAlive: 85,  types: [['berryling', 2], ['magpie', 1.5], ['bristle', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 100,  kind: 'ring', enemy: 'berryling', n: 18 },
      { t: 160,  kind: 'elite' },
      { t: 230,  kind: 'ring', enemy: 'magpie', n: 20 },
      { t: 300,  kind: 'ring', enemy: 'bristle', n: 16 },
      { t: 370,  kind: 'elite' },
      { t: 445,  kind: 'ring', enemy: 'mole', n: 14 },
      { t: 525,  kind: 'elite' },
      { t: 580,  kind: 'ring', enemy: 'cubby', n: 12 },
      { t: 600,  kind: 'surge', n: 2 }, // M12 中场事件（中点；不进无尽重放窗口）
      { t: 675,  kind: 'elite' },
      { t: 760,  kind: 'ring', enemy: 'gourd', n: 12 },
      { t: 845,  kind: 'elite' },
      { t: 930,  kind: 'ring', enemy: 'magpie', n: 26 },
      { t: 1015, kind: 'elite' },
      { t: 1100, kind: 'ring', enemy: 'berryling', n: 30 },
      { t: 1200, kind: 'boss' },
    ],
    decor: [
      { keys: ['bd_bush0', 'bd_bush1'], nMin: 3, nMax: 5, chance: 1 },
      { keys: ['bd_berry'], nMin: 1, nMax: 3, chance: 0.65 },
      { keys: ['bd_thorn'], nMin: 1, nMax: 2, chance: 0.55 },
      { keys: ['bd_clover'], nMin: 1, nMax: 2, chance: 0.5 },
      { keys: ['bd_stump'], nMin: 1, nMax: 1, chance: 0.3 },
    ],
    // M18 核心：荆棘围栏（实体墙阻挡玩家，留开口防围死；旧 brambles 扎脚地皮被吸收）
    mechanics: [{ kind: 'thornwall', first: 30, interval: 22, segR: 26, segN: 5, gapDeg: 140, dur: 10, dist: 150 }],
    bgm: BRAMBLE_BGM,
    unlockAch: 'lavenderClear',
  },

  // ---------- 7. 星语夜原：夜行游击 + 流星雨，30 分钟（M12 长档 + 中点 surge） ----------
  // 敌人忽明忽暗（星闪闪闪现、月相灵变速、小枭枭绕飞），流星敌我同伤可借力清群
  {
    id: 'nocturne',
    drops: ['fullmoon', 'meteor', 'constellationfall'],
    minutes: 30,
    timeK: 12 / 30,
    xpK: 0.95,
    icon: 'nd_bell',
    iconScale: 2.2,
    color: 0x8890c8,
    paperCss: '#E9EAF5',
    bossId: 'starelk',
    eliteId: 'cometlord',
    waves: [
      { from: 0,    interval: 0.95, burst: 2, maxAlive: 32,  types: [['moonmote', 1]] },
      { from: 55,   interval: 0.85, burst: 2, maxAlive: 54,  types: [['moonmote', 3], ['nightmoth', 1.5]] },
      { from: 120,  interval: 0.8,  burst: 3, maxAlive: 78,  types: [['moonmote', 3], ['nightmoth', 2], ['owlet', 1.2]] },
      { from: 195,  interval: 0.75, burst: 3, maxAlive: 100, types: [['moonmote', 2.5], ['nightmoth', 2], ['owlet', 1.5], ['twinkle', 1.2]] },
      { from: 280,  interval: 0.7,  burst: 3, maxAlive: 124, types: [['nightmoth', 2], ['owlet', 1.7], ['twinkle', 1.5], ['lunaling', 1.2], ['moonmote', 1.6]] },
      { from: 375,  interval: 0.65, burst: 4, maxAlive: 148, types: [['owlet', 1.8], ['twinkle', 1.6], ['lunaling', 1.5], ['sparkler', 1.1], ['moonmote', 1.5]] },
      { from: 495,  interval: 0.6,  burst: 4, maxAlive: 172, types: [['twinkle', 1.7], ['lunaling', 1.7], ['sparkler', 1.3], ['nightmoth', 1.9], ['owlet', 1.9]] },
      { from: 620,  interval: 0.56, burst: 4, maxAlive: 196, types: [['lunaling', 1.9], ['sparkler', 1.5], ['twinkle', 1.9], ['owlet', 2.1], ['nightmoth', 2]] },
      { from: 770,  interval: 0.52, burst: 5, maxAlive: 220, types: [['sparkler', 1.7], ['lunaling', 2.1], ['twinkle', 2.1], ['owlet', 2.2]] },
      // M15 后段新面孔：t=880（52%）起星爆尘入池（自爆，与流星雨同享敌我同伤趣味）
      { from: 880,  interval: 0.52, burst: 5, maxAlive: 220, types: [['sparkler', 1.7], ['lunaling', 2.1], ['twinkle', 2.1], ['owlet', 2.2], ['novamote', 1]] },
      { from: 945,  interval: 0.48, burst: 5, maxAlive: 245, types: [['lunaling', 2.3], ['sparkler', 1.9], ['nightmoth', 2.5], ['twinkle', 2.3], ['moonmote', 2], ['novamote', 1.1]] },
      { from: 1135, interval: 0.45, burst: 6, maxAlive: 268, types: [['sparkler', 2.1], ['lunaling', 2.5], ['owlet', 2.6], ['twinkle', 2.5], ['novamote', 1.2]] },
      { from: 1340, interval: 0.43, burst: 6, maxAlive: 288, types: [['lunaling', 2.7], ['sparkler', 2.3], ['nightmoth', 2.9], ['owlet', 2.8], ['moonmote', 2.2], ['novamote', 1.2]] },
      { from: 1565, interval: 0.41, burst: 6, maxAlive: 305, types: [['sparkler', 2.5], ['lunaling', 2.9], ['twinkle', 2.9], ['owlet', 3], ['novamote', 1.2]] },
      { from: 1800, interval: 0.9,  burst: 3, maxAlive: 90,  types: [['moonmote', 2], ['nightmoth', 1.5], ['owlet', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 140,  kind: 'ring', enemy: 'moonmote', n: 20 },
      { t: 235,  kind: 'elite' },
      { t: 330,  kind: 'ring', enemy: 'nightmoth', n: 20 },
      { t: 430,  kind: 'ring', enemy: 'owlet', n: 16 },
      { t: 525,  kind: 'elite' },
      { t: 645,  kind: 'ring', enemy: 'twinkle', n: 14 },
      { t: 760,  kind: 'elite' },
      { t: 870,  kind: 'ring', enemy: 'lunaling', n: 14 },
      { t: 900,  kind: 'surge', n: 3 }, // M12 中场事件（中点；不进无尽重放窗口）
      { t: 995,  kind: 'elite' },
      { t: 1115, kind: 'ring', enemy: 'sparkler', n: 12 },
      { t: 1230, kind: 'elite' },
      { t: 1350, kind: 'ring', enemy: 'nightmoth', n: 28 },
      { t: 1480, kind: 'elite' },
      { t: 1605, kind: 'ring', enemy: 'moonmote', n: 32 },
      { t: 1715, kind: 'elite' },
      { t: 1800, kind: 'boss' },
    ],
    decor: [
      { keys: ['nd_grass0', 'nd_grass1'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['nd_star'], nMin: 1, nMax: 3, chance: 0.6 },
      { keys: ['nd_bell'], nMin: 1, nMax: 2, chance: 0.45 },
      { keys: ['nd_crystal'], nMin: 1, nMax: 1, chance: 0.4 },
      { keys: ['nd_pebble'], nMin: 1, nMax: 1, chance: 0.4 },
    ],
    // M18 核心：夜幕与光界（全场罩暗、拾星屑照亮，光圈即资源）+ starfall 流星雨保留（瞬间照亮正反馈）
    mechanics: [
      { kind: 'nightfall', darkAlpha: 0.35, starEvery: 10, litT: 6 },
      { kind: 'starfall', first: 30, interval: 24, count: 3, r: 82, warnT: 1.25, dmg: 12, edmg: 80 },
    ],
    bgm: NOCTURNE_BGM,
    unlockAch: 'brambleClear',
  },

  // ---------- 8. 破晓之巅：终局长夜 + 晨光柱，30 分钟（M12 长档 + 中点 surge） ----------
  // 影群海量缠斗（影伏伏伏击、蚀月轮滚撞、夜昙昙压制），晨光柱是黎明前的安全岛
  {
    id: 'summit',
    drops: ['beaconsurge', 'dawnnova', 'dawnlance'],
    minutes: 30,
    timeK: 12 / 30,
    xpK: 0.9,
    icon: 'sd_bloom',
    iconScale: 2.2,
    color: 0xc8a050,
    paperCss: '#FBF2E2',
    bossId: 'nightowl',
    eliteId: 'shadelord',
    waves: [
      { from: 0,    interval: 0.9,  burst: 2, maxAlive: 34,  types: [['shade', 1]] },
      { from: 45,   interval: 0.8,  burst: 2, maxAlive: 56,  types: [['shade', 3], ['glint', 1.5]] },
      { from: 100,  interval: 0.75, burst: 3, maxAlive: 80,  types: [['shade', 3], ['glint', 2], ['gloom', 1.2]] },
      { from: 170,  interval: 0.7,  burst: 3, maxAlive: 104, types: [['shade', 2.5], ['glint', 2], ['gloom', 1.5], ['umbra', 1.2]] },
      { from: 250,  interval: 0.65, burst: 3, maxAlive: 128, types: [['glint', 2], ['gloom', 1.7], ['umbra', 1.5], ['lurker', 1.2], ['shade', 1.6]] },
      { from: 340,  interval: 0.6,  burst: 4, maxAlive: 152, types: [['gloom', 1.8], ['umbra', 1.6], ['lurker', 1.5], ['nightbloom', 1.1], ['shade', 1.5]] },
      { from: 450,  interval: 0.56, burst: 4, maxAlive: 178, types: [['umbra', 1.8], ['lurker', 1.7], ['nightbloom', 1.3], ['eclipse', 1.1], ['gloom', 1.7]] },
      { from: 570,  interval: 0.52, burst: 4, maxAlive: 202, types: [['lurker', 1.9], ['nightbloom', 1.5], ['eclipse', 1.3], ['umbra', 2], ['glint', 1.8]] },
      { from: 700,  interval: 0.5,  burst: 5, maxAlive: 226, types: [['nightbloom', 1.7], ['eclipse', 1.5], ['lurker', 2.1], ['umbra', 2.2]] },
      // M15 后段新面孔：t=860（48%）起暗幕守入池；t=1230（68%）影隙口再添一张新面孔
      { from: 860,  interval: 0.47, burst: 5, maxAlive: 250, types: [['eclipse', 1.7], ['nightbloom', 1.9], ['lurker', 2.3], ['gloom', 2.2], ['shade', 2], ['duskward', 0.9]] },
      { from: 1040, interval: 0.44, burst: 6, maxAlive: 272, types: [['nightbloom', 2.1], ['eclipse', 1.9], ['umbra', 2.6], ['lurker', 2.5], ['duskward', 1]] },
      { from: 1230, interval: 0.42, burst: 6, maxAlive: 292, types: [['eclipse', 2.1], ['nightbloom', 2.3], ['lurker', 2.7], ['glint', 2.6], ['shade', 2.2], ['duskward', 1], ['shadowmaw', 0.8]] },
      { from: 1430, interval: 0.4,  burst: 7, maxAlive: 308, types: [['nightbloom', 2.5], ['eclipse', 2.3], ['umbra', 3], ['lurker', 2.9], ['duskward', 1.1], ['shadowmaw', 0.9]] },
      { from: 1620, interval: 0.38, burst: 7, maxAlive: 320, types: [['eclipse', 2.5], ['lurker', 3.1], ['nightbloom', 2.7], ['gloom', 2.6], ['glint', 2.8], ['duskward', 1.1], ['shadowmaw', 0.9]] },
      { from: 1800, interval: 0.85, burst: 3, maxAlive: 95,  types: [['shade', 2], ['glint', 1.5], ['gloom', 1]] }, // Boss 阶段轻刷
    ],
    events: [
      { t: 120,  kind: 'ring', enemy: 'shade', n: 20 },
      { t: 200,  kind: 'elite' },
      { t: 290,  kind: 'ring', enemy: 'glint', n: 24 },
      { t: 380,  kind: 'ring', enemy: 'umbra', n: 18 },
      { t: 470,  kind: 'elite' },
      { t: 580,  kind: 'ring', enemy: 'gloom', n: 16 },
      { t: 690,  kind: 'elite' },
      { t: 800,  kind: 'ring', enemy: 'lurker', n: 12 },
      { t: 900,  kind: 'surge', n: 3 }, // M12 中场事件（中点；不进无尽重放窗口）
      { t: 950,  kind: 'elite' },
      { t: 1020, kind: 'ring', enemy: 'eclipse', n: 12 },
      { t: 1130, kind: 'elite' },
      { t: 1240, kind: 'ring', enemy: 'nightbloom', n: 12 },
      { t: 1350, kind: 'elite' },
      { t: 1460, kind: 'ring', enemy: 'umbra', n: 28 },
      { t: 1570, kind: 'elite' },
      { t: 1680, kind: 'ring', enemy: 'shade', n: 34 },
      { t: 1800, kind: 'boss' },
    ],
    decor: [
      { keys: ['sd_tuft0', 'sd_tuft1'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['sd_bloom'], nMin: 1, nMax: 2, chance: 0.55 },
      { keys: ['sd_ray'], nMin: 1, nMax: 2, chance: 0.45 },
      { keys: ['sd_rock'], nMin: 1, nMax: 1, chance: 0.45 },
      { keys: ['sd_glow'], nMin: 1, nMax: 1, chance: 0.35 },
    ],
    // M18 核心：破晓烽台（累计点燃永久据点网 + 每座敌人 HP 衰减；dawnpillar 升级吸收）
    mechanics: [{ kind: 'beacon', first: 25, interval: 18, count: 1, r: 70, igniteT: 4, maxLit: 3, hps: 7, dps: 30, enemyHpPer: 0.05 }],
    bgm: SUMMIT_BGM,
    unlockAch: 'nocturneClear',
  },

  // ---------- 9. 琥珀果园：落果诱导 + 果核压制，20 分钟（1.0+ 扩展 + 中点 surge） ----------
  // 果实落点可借力清群，但炮台与护盾怪会逼迫玩家主动引怪换位
  {
    id: 'orchard',
    drops: ['goldapple', 'seedwhirl', 'harvestcomet'],
    minutes: 20,
    timeK: 12 / 20,
    xpK: 1.08,
    icon: 'od_apple',
    iconScale: 2.25,
    color: 0xd8a058,
    paperCss: '#F8F0DE',
    bossId: 'ciderwyrm',
    eliteId: 'harvestorb',
    waves: [
      { from: 0,    interval: 0.95, burst: 2, maxAlive: 34,  types: [['pip', 1]] },
      { from: 40,   interval: 0.86, burst: 2, maxAlive: 56,  types: [['pip', 3], ['ciderfly', 1.5]] },
      { from: 90,   interval: 0.8,  burst: 3, maxAlive: 82,  types: [['pip', 3], ['ciderfly', 2], ['wormlet', 1.2]] },
      { from: 150,  interval: 0.74, burst: 3, maxAlive: 106, types: [['pip', 2.5], ['ciderfly', 2], ['wormlet', 1.5], ['appleling', 1.2]] },
      { from: 220,  interval: 0.68, burst: 4, maxAlive: 132, types: [['ciderfly', 2], ['wormlet', 1.7], ['appleling', 1.5], ['scareseed', 1.1], ['pip', 1.7]] },
      { from: 310,  interval: 0.62, burst: 4, maxAlive: 158, types: [['wormlet', 1.9], ['appleling', 1.8], ['scareseed', 1.3], ['ciderfly', 2.1]] },
      { from: 420,  interval: 0.56, burst: 5, maxAlive: 184, types: [['appleling', 2], ['scareseed', 1.5], ['wormlet', 2.1], ['pip', 2]] },
      { from: 560,  interval: 0.52, burst: 5, maxAlive: 210, types: [['scareseed', 1.7], ['appleling', 2.2], ['ciderfly', 2.3], ['wormlet', 2.2]] },
      { from: 700,  interval: 0.48, burst: 6, maxAlive: 238, types: [['appleling', 2.4], ['scareseed', 1.9], ['nutkin', 0.8], ['wormlet', 2.4], ['pip', 2.2]] },
      { from: 840,  interval: 0.45, burst: 6, maxAlive: 264, types: [['scareseed', 2.1], ['appleling', 2.6], ['nutkin', 1], ['ciderfly', 2.6], ['wormlet', 2.5]] },
      { from: 1010, interval: 0.42, burst: 7, maxAlive: 292, types: [['appleling', 2.8], ['scareseed', 2.3], ['nutkin', 1.1], ['wormlet', 2.8], ['pip', 2.4]] },
      { from: 1200, interval: 0.9,  burst: 3, maxAlive: 90,  types: [['pip', 2], ['ciderfly', 1.5], ['wormlet', 1]] },
    ],
    events: [
      { t: 110,  kind: 'ring', enemy: 'pip', n: 22 },
      { t: 190,  kind: 'elite' },
      { t: 280,  kind: 'ring', enemy: 'ciderfly', n: 22 },
      { t: 375,  kind: 'ring', enemy: 'wormlet', n: 18 },
      { t: 470,  kind: 'elite' },
      { t: 585,  kind: 'ring', enemy: 'appleling', n: 16 },
      { t: 600,  kind: 'surge', n: 2 },
      { t: 700,  kind: 'elite' },
      { t: 800,  kind: 'ring', enemy: 'scareseed', n: 12 },
      { t: 900,  kind: 'elite' },
      { t: 1010, kind: 'ring', enemy: 'nutkin', n: 10 },
      { t: 1110, kind: 'ring', enemy: 'pip', n: 34 },
      { t: 1200, kind: 'boss' },
    ],
    decor: [
      { keys: ['od_tree0', 'od_tree1'], nMin: 1, nMax: 2, chance: 0.8 },
      { keys: ['od_grass0', 'od_grass1'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['od_apple'], nMin: 1, nMax: 3, chance: 0.7 },
      { keys: ['od_leaf'], nMin: 1, nMax: 3, chance: 0.55 },
      { keys: ['od_crate'], nMin: 1, nMax: 1, chance: 0.3 },
    ],
    mechanics: [{ kind: 'orchard', first: 28, interval: 15, count: 2, r: 82, warnT: 1.3, dmg: 92, xp: 8, coin: 2, dropHits: 4 }],
    bgm: ORCHARD_BGM,
    unlockAch: 'summitClear',
  },

  // ---------- 10. 雪铃庭院：寒印手动引爆，20 分钟（1.0+ 扩展 + 中点 surge） ----------
  // 敌人机动性高，玩家需要把追兵带进寒印后踩碎控场
  {
    id: 'snowbell',
    drops: ['snowglobe', 'frostbell', 'frostcarillon'],
    minutes: 20,
    timeK: 12 / 20,
    xpK: 1.02,
    icon: 'wd_bell',
    iconScale: 2.15,
    color: 0x98c8dc,
    paperCss: '#EEF6F4',
    bossId: 'frosthare',
    eliteId: 'snowwarden',
    waves: [
      { from: 0,    interval: 1.0,  burst: 2, maxAlive: 32,  types: [['snowdrop', 1]] },
      { from: 45,   interval: 0.9,  burst: 2, maxAlive: 54,  types: [['snowdrop', 3], ['flakebunny', 1.4]] },
      { from: 95,   interval: 0.84, burst: 3, maxAlive: 78,  types: [['snowdrop', 3], ['flakebunny', 1.8], ['sleetwing', 1.2]] },
      { from: 155,  interval: 0.78, burst: 3, maxAlive: 102, types: [['snowdrop', 2.4], ['flakebunny', 2], ['sleetwing', 1.5], ['frostcap', 1.1]] },
      { from: 230,  interval: 0.72, burst: 4, maxAlive: 128, types: [['flakebunny', 2.1], ['sleetwing', 1.7], ['frostcap', 1.3], ['crystalmite', 1.2]] },
      { from: 320,  interval: 0.66, burst: 4, maxAlive: 154, types: [['sleetwing', 2], ['frostcap', 1.5], ['crystalmite', 1.5], ['snowdrop', 1.8]] },
      { from: 430,  interval: 0.6,  burst: 5, maxAlive: 182, types: [['frostcap', 1.8], ['crystalmite', 1.7], ['sleetwing', 2.2], ['flakebunny', 2.2]] },
      { from: 560,  interval: 0.55, burst: 5, maxAlive: 208, types: [['crystalmite', 1.9], ['bellfox', 1], ['frostcap', 2], ['sleetwing', 2.4]] },
      { from: 700,  interval: 0.5,  burst: 6, maxAlive: 236, types: [['bellfox', 1.1], ['crystalmite', 2.1], ['flakebunny', 2.5], ['frostcap', 2.2], ['snowdrop', 2]] },
      { from: 850,  interval: 0.47, burst: 6, maxAlive: 264, types: [['bellfox', 1.2], ['crystalmite', 2.3], ['sleetwing', 2.7], ['frostcap', 2.4]] },
      { from: 1020, interval: 0.44, burst: 7, maxAlive: 292, types: [['bellfox', 1.3], ['crystalmite', 2.5], ['flakebunny', 2.8], ['frostcap', 2.6], ['snowdrop', 2.3]] },
      { from: 1200, interval: 0.92, burst: 3, maxAlive: 92,  types: [['snowdrop', 2], ['flakebunny', 1.5], ['sleetwing', 1]] },
    ],
    events: [
      { t: 120,  kind: 'ring', enemy: 'snowdrop', n: 22 },
      { t: 205,  kind: 'elite' },
      { t: 300,  kind: 'ring', enemy: 'flakebunny', n: 18 },
      { t: 395,  kind: 'ring', enemy: 'sleetwing', n: 22 },
      { t: 490,  kind: 'elite' },
      { t: 585,  kind: 'ring', enemy: 'frostcap', n: 12 },
      { t: 600,  kind: 'surge', n: 2 },
      { t: 715,  kind: 'elite' },
      { t: 820,  kind: 'ring', enemy: 'crystalmite', n: 14 },
      { t: 930,  kind: 'elite' },
      { t: 1040, kind: 'ring', enemy: 'bellfox', n: 12 },
      { t: 1135, kind: 'ring', enemy: 'snowdrop', n: 34 },
      { t: 1200, kind: 'boss' },
    ],
    decor: [
      { keys: ['wd_snow0', 'wd_snow1'], nMin: 3, nMax: 6, chance: 1 },
      { keys: ['wd_bell'], nMin: 1, nMax: 2, chance: 0.55 },
      { keys: ['wd_crystal'], nMin: 1, nMax: 2, chance: 0.55 },
      { keys: ['wd_sprig'], nMin: 1, nMax: 2, chance: 0.45 },
      { keys: ['wd_pebble'], nMin: 1, nMax: 1, chance: 0.35 },
    ],
    mechanics: [{ kind: 'frostseal', first: 24, interval: 17, count: 1, r: 92, dur: 18, chargeT: 1.4, dmg: 115, slowMul: 0.5 }],
    bgm: SNOWBELL_BGM,
    unlockAch: 'orchardClear',
  },

  // ---------- 11. 彩镜沙洲：折光蓄能，30 分钟（1.0+ 扩展 + 中点 surge） ----------
  // 镜场奖励高，但玻璃敌人擅长闪现、绕飞、远程压制
  {
    id: 'mirage',
    drops: ['prismshard', 'mirrorbloom', 'prismstorm'],
    minutes: 30,
    timeK: 12 / 30,
    xpK: 0.92,
    icon: 'mg_prism',
    iconScale: 2.15,
    color: 0xb8a8dc,
    paperCss: '#F1EDF7',
    bossId: 'miragewhale',
    eliteId: 'prismguard',
    waves: [
      { from: 0,    interval: 0.95, burst: 2, maxAlive: 34,  types: [['prismite', 1]] },
      { from: 55,   interval: 0.85, burst: 2, maxAlive: 56,  types: [['prismite', 3], ['glassfin', 1.5]] },
      { from: 125,  interval: 0.8,  burst: 3, maxAlive: 82,  types: [['prismite', 3], ['glassfin', 2], ['mirrormoth', 1.2]] },
      { from: 205,  interval: 0.74, burst: 3, maxAlive: 106, types: [['prismite', 2.5], ['glassfin', 2], ['mirrormoth', 1.5], ['lensbeetle', 1.2]] },
      { from: 300,  interval: 0.68, burst: 4, maxAlive: 132, types: [['glassfin', 2], ['mirrormoth', 1.7], ['lensbeetle', 1.4], ['quartzbud', 1.1]] },
      { from: 410,  interval: 0.62, burst: 4, maxAlive: 158, types: [['mirrormoth', 2], ['lensbeetle', 1.6], ['quartzbud', 1.3], ['prismite', 1.8]] },
      { from: 540,  interval: 0.58, burst: 4, maxAlive: 184, types: [['lensbeetle', 1.8], ['quartzbud', 1.5], ['sandsprite', 1], ['mirrormoth', 2.2]] },
      { from: 690,  interval: 0.54, burst: 5, maxAlive: 210, types: [['quartzbud', 1.7], ['sandsprite', 1.1], ['lensbeetle', 2], ['glassfin', 2.2]] },
      { from: 860,  interval: 0.5,  burst: 5, maxAlive: 238, types: [['sandsprite', 1.2], ['quartzbud', 1.9], ['mirrormoth', 2.5], ['lensbeetle', 2.2], ['prismite', 2]] },
      { from: 1040, interval: 0.47, burst: 6, maxAlive: 266, types: [['sandsprite', 1.3], ['quartzbud', 2.1], ['glassfin', 2.6], ['lensbeetle', 2.4]] },
      { from: 1240, interval: 0.44, burst: 6, maxAlive: 292, types: [['sandsprite', 1.4], ['quartzbud', 2.3], ['mirrormoth', 2.8], ['lensbeetle', 2.6], ['prismite', 2.3]] },
      { from: 1460, interval: 0.41, burst: 7, maxAlive: 318, types: [['sandsprite', 1.5], ['quartzbud', 2.5], ['glassfin', 3], ['lensbeetle', 2.8]] },
      { from: 1800, interval: 0.88, burst: 3, maxAlive: 96,  types: [['prismite', 2], ['glassfin', 1.5], ['mirrormoth', 1]] },
    ],
    events: [
      { t: 150,  kind: 'ring', enemy: 'prismite', n: 24 },
      { t: 260,  kind: 'elite' },
      { t: 370,  kind: 'ring', enemy: 'glassfin', n: 22 },
      { t: 500,  kind: 'ring', enemy: 'mirrormoth', n: 22 },
      { t: 625,  kind: 'elite' },
      { t: 760,  kind: 'ring', enemy: 'lensbeetle', n: 14 },
      { t: 900,  kind: 'surge', n: 3 },
      { t: 930,  kind: 'elite' },
      { t: 1060, kind: 'ring', enemy: 'quartzbud', n: 12 },
      { t: 1200, kind: 'elite' },
      { t: 1340, kind: 'ring', enemy: 'sandsprite', n: 14 },
      { t: 1490, kind: 'elite' },
      { t: 1625, kind: 'ring', enemy: 'mirrormoth', n: 30 },
      { t: 1720, kind: 'ring', enemy: 'prismite', n: 36 },
      { t: 1800, kind: 'boss' },
    ],
    decor: [
      { keys: ['mg_reed0', 'mg_reed1'], nMin: 2, nMax: 5, chance: 1 },
      { keys: ['mg_prism'], nMin: 1, nMax: 2, chance: 0.6 },
      { keys: ['mg_shell'], nMin: 1, nMax: 2, chance: 0.5 },
      { keys: ['mg_glint'], nMin: 1, nMax: 3, chance: 0.5 },
      { keys: ['mg_pebble'], nMin: 1, nMax: 1, chance: 0.35 },
    ],
    mechanics: [{ kind: 'prismfield', first: 32, interval: 18, count: 1, r: 98, dur: 16, chargeT: 3.2, dmg: 92, beams: 7 }],
    bgm: MIRAGE_BGM,
    unlockAch: 'snowbellClear',
  },

  // ---------- 12. 晨钟庭：节拍钟阵，30 分钟（1.0+ 扩展 + 中点 surge） ----------
  // 读拍踩钟印会释放大钟波；错过节拍会吃小伤，召唤/护盾怪放大压力
  {
    id: 'clockwork',
    drops: ['clockkey', 'bellnova', 'grandchime'],
    minutes: 30,
    timeK: 12 / 30,
    xpK: 0.9,
    icon: 'ck_bell',
    iconScale: 2.2,
    color: 0xd0a860,
    paperCss: '#F7F0E3',
    bossId: 'clockrooster',
    eliteId: 'gearwarden',
    waves: [
      { from: 0,    interval: 0.9,  burst: 2, maxAlive: 36,  types: [['gearling', 1]] },
      { from: 50,   interval: 0.8,  burst: 2, maxAlive: 60,  types: [['gearling', 3], ['ticktock', 1.5]] },
      { from: 115,  interval: 0.75, burst: 3, maxAlive: 86,  types: [['gearling', 3], ['ticktock', 2], ['pendulum', 1.2]] },
      { from: 190,  interval: 0.7,  burst: 3, maxAlive: 112, types: [['gearling', 2.5], ['ticktock', 2], ['pendulum', 1.5], ['chimewisp', 1.2]] },
      { from: 280,  interval: 0.65, burst: 4, maxAlive: 138, types: [['ticktock', 2.2], ['pendulum', 1.7], ['chimewisp', 1.4], ['gearling', 2]] },
      { from: 390,  interval: 0.6,  burst: 4, maxAlive: 166, types: [['pendulum', 1.9], ['chimewisp', 1.6], ['cuckoobud', 0.9], ['ticktock', 2.4]] },
      { from: 520,  interval: 0.55, burst: 5, maxAlive: 194, types: [['chimewisp', 1.8], ['cuckoobud', 1], ['pendulum', 2.1], ['gearling', 2.2]] },
      { from: 670,  interval: 0.5,  burst: 5, maxAlive: 222, types: [['cuckoobud', 1.1], ['chimewisp', 2], ['brassbug', 0.7], ['pendulum', 2.3], ['ticktock', 2.5]] },
      { from: 850,  interval: 0.47, burst: 6, maxAlive: 250, types: [['brassbug', 0.8], ['cuckoobud', 1.2], ['pendulum', 2.5], ['chimewisp', 2.2], ['gearling', 2.4]] },
      { from: 1050, interval: 0.44, burst: 6, maxAlive: 280, types: [['brassbug', 0.9], ['cuckoobud', 1.3], ['ticktock', 2.9], ['chimewisp', 2.4], ['pendulum', 2.7]] },
      { from: 1270, interval: 0.41, burst: 7, maxAlive: 306, types: [['brassbug', 1], ['cuckoobud', 1.4], ['pendulum', 2.9], ['chimewisp', 2.6], ['gearling', 2.7]] },
      { from: 1500, interval: 0.39, burst: 7, maxAlive: 330, types: [['brassbug', 1.1], ['cuckoobud', 1.5], ['ticktock', 3.1], ['chimewisp', 2.8], ['pendulum', 3]] },
      { from: 1800, interval: 0.84, burst: 3, maxAlive: 100, types: [['gearling', 2], ['ticktock', 1.5], ['pendulum', 1]] },
    ],
    events: [
      { t: 140,  kind: 'ring', enemy: 'gearling', n: 24 },
      { t: 240,  kind: 'elite' },
      { t: 360,  kind: 'ring', enemy: 'ticktock', n: 30 },
      { t: 500,  kind: 'ring', enemy: 'pendulum', n: 16 },
      { t: 635,  kind: 'elite' },
      { t: 780,  kind: 'ring', enemy: 'chimewisp', n: 14 },
      { t: 900,  kind: 'surge', n: 3 },
      { t: 955,  kind: 'elite' },
      { t: 1080, kind: 'ring', enemy: 'cuckoobud', n: 12 },
      { t: 1220, kind: 'elite' },
      { t: 1370, kind: 'ring', enemy: 'brassbug', n: 10 },
      { t: 1510, kind: 'elite' },
      { t: 1640, kind: 'ring', enemy: 'ticktock', n: 38 },
      { t: 1730, kind: 'ring', enemy: 'gearling', n: 36 },
      { t: 1800, kind: 'boss' },
    ],
    decor: [
      { keys: ['ck_tile0', 'ck_tile1'], nMin: 3, nMax: 5, chance: 1 },
      { keys: ['ck_bell'], nMin: 1, nMax: 2, chance: 0.55 },
      { keys: ['ck_gear'], nMin: 1, nMax: 3, chance: 0.65 },
      { keys: ['ck_sprig'], nMin: 1, nMax: 2, chance: 0.45 },
      { keys: ['ck_key'], nMin: 1, nMax: 1, chance: 0.3 },
    ],
    mechanics: [{ kind: 'bellring', first: 20, interval: 12, count: 1, r: 86, warnT: 2.2, dmg: 130, missDmg: 8 }],
    bgm: CLOCKWORK_BGM,
    unlockAch: 'mirageClear',
  },
];

/** 按 id 取地图；未知 id 兜底为草甸（防坏档/旧链接） */
export function getMap(id: string): MapSpec {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
