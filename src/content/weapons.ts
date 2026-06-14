// 武器元数据与平衡数值表（纯数据层，禁止依赖 Phaser）
// 数组下标 = 等级-1；调参只改此处，不碰 systems/weapons/ 行为代码
import type { PassiveId, WeaponId } from './ids';

export const WEAPON_MAX_LEVEL = 5;

/** 突破模式（M20）：已进化超武每多升 1 级 = 额外 +15% 伤害（中央乘区，无上限）。
 *  超武各项数值用固定 evo 常数、不读等级数组，故突破层只走伤害乘区，不触碰越界下标。 */
export const BREAKTHROUGH = { dmgPerLevel: 0.15 };

export interface WeaponMeta {
  id: WeaponId;
  color: number;
  icon: string; // 纹理 key
  evolvesWith: PassiveId | null; // null = 任意被动满级
}

export const WEAPON_META: WeaponMeta[] = [
  { id: 'blade',     color: 0xf0c860, icon: 'icon_blade',     evolvesWith: 'power' },
  { id: 'petal',     color: 0xf8a8c0, icon: 'icon_petal',     evolvesWith: 'bloom' },
  { id: 'prism',     color: 0xa0d8f0, icon: 'icon_prism',     evolvesWith: 'lens' },
  { id: 'rain',      color: 0x90c8f0, icon: 'icon_rain',      evolvesWith: 'cloud' },
  { id: 'spark',     color: 0xffe070, icon: 'icon_spark',     evolvesWith: 'battery' },
  { id: 'boomerang', color: 0x88d8b0, icon: 'icon_boomerang', evolvesWith: 'wind' },
  { id: 'mine',      color: 0xc0a0e8, icon: 'icon_mine',      evolvesWith: null },
  { id: 'puff',      color: 0xd8c8a0, icon: 'icon_puff',      evolvesWith: 'ladybug' },
  // M6 批次 B：zone / orbit / melee / burst
  { id: 'lantern',   color: 0xf8b868, icon: 'icon_lantern',   evolvesWith: 'honey' },
  { id: 'star',      color: 0xb0bce8, icon: 'icon_star',      evolvesWith: 'stardust' },
  { id: 'mallet',    color: 0xc89058, icon: 'icon_mallet',    evolvesWith: 'acorn' },
  { id: 'chime',     color: 0x90ccc0, icon: 'icon_chime',     evolvesWith: 'sprout' },
  // M7 批次 C：whip / 炮射 / 追踪 / 哨塔
  { id: 'vine',      color: 0x88b868, icon: 'icon_vine',      evolvesWith: 'trellis' },
  { id: 'sling',     color: 0xd87888, icon: 'icon_sling',     evolvesWith: 'snack' },
  { id: 'wisp',      color: 0x88ccaa, icon: 'icon_wisp',      evolvesWith: 'feather' },
  { id: 'bugle',     color: 0x8898d8, icon: 'icon_bugle',     evolvesWith: 'whistle' },
  // M22 批次 D/E/F（参考吸血鬼幸存者，机制/特效全互异；配色统一柔和粉彩贴合主题）
  { id: 'dagger',    color: 0x9cc878, icon: 'icon_dagger',    evolvesWith: 'wind' },
  { id: 'axe',       color: 0xc0a860, icon: 'icon_axe',       evolvesWith: 'power' },
  { id: 'fireball',  color: 0xf8c060, icon: 'icon_fireball',  evolvesWith: 'ladybug' },
  { id: 'flask',     color: 0x88d0c8, icon: 'icon_flask',     evolvesWith: 'cloud' },
  { id: 'bolt',      color: 0xf8e0a0, icon: 'icon_bolt',      evolvesWith: 'battery' },
  { id: 'bird',      color: 0xb8c8ec, icon: 'icon_bird',      evolvesWith: 'feather' },
  { id: 'ricochet',  color: 0xe87cc0, icon: 'icon_ricochet',  evolvesWith: 'stardust' },
  { id: 'wand',      color: 0xffe0a0, icon: 'icon_wand',      evolvesWith: 'lens' },
  { id: 'breath',    color: 0xf0d878, icon: 'icon_breath',    evolvesWith: 'snack' },
  { id: 'bomb',      color: 0xa8d8ec, icon: 'icon_bomb',      evolvesWith: 'power' },
  { id: 'gravity',   color: 0x9878d0, icon: 'icon_gravity',   evolvesWith: 'trellis' },
  { id: 'sword',     color: 0xf8eec0, icon: 'icon_sword',     evolvesWith: 'power' },
  { id: 'swarm',     color: 0xf0c850, icon: 'icon_swarm',     evolvesWith: 'honey' },
  { id: 'meteor',    color: 0xc0c8ec, icon: 'icon_meteor',    evolvesWith: 'stardust' },
  { id: 'frost',     color: 0xa8e0f0, icon: 'icon_frost',     evolvesWith: 'whistle' },
  { id: 'tornado',   color: 0xa8c4a0, icon: 'icon_tornado',   evolvesWith: 'acorn' },
];

// ---------- 平衡数值（每武器一表） ----------

/** 光刃 / 晨曦 */
export const W_BLADE = {
  dmg: [14, 18, 24, 30, 40],
  cd: [1.15, 1.05, 1.0, 0.92, 0.85],
  radius: 88,
  radiusLv3Mul: 1.22,
  evoDmg: 48,
  evoCd: 1.0,
  evoRadius: 105,
};

/** 花瓣环 / 百花 */
export const W_PETAL = {
  dmg: [10, 12, 14, 16, 22],
  count: [3, 4, 5, 6, 6],
  radius: 74,
  radiusLv5: 88,
  evoDmgMul: 1.3,
  evoExtraPetals: 2, // 进化外圈花瓣数 = count + 2
  burstCd: 4, // 进化弹幕间隔（秒）
};

/** 棱镜光束 / 虹折射 */
export const W_PRISM = {
  dmg: [16, 20, 26, 34, 44],
  cd: [2.3, 2.2, 2.0, 1.7, 1.5],
  evoDmg: 50,
  evoCd: 1.4,
};

/** 细雨 / 倾盆 */
export const W_RAIN = {
  dmg: [15, 19, 24, 30, 38],
  cd: [2.9, 2.6, 2.4, 2.2, 2.0],
  n: [3, 3, 4, 4, 5],
  evoCd: 0.42,
  evoDmgMul: 1.15,
  evoAreaMul: 1.15,
};

/** 跃光 / 雷暴 */
export const W_SPARK = {
  dmg: [14, 17, 21, 26, 34],
  cd: [2.0, 1.9, 1.8, 1.6, 1.5],
  links: [3, 4, 5, 6, 6],
  evoCd: 1.5,
  evoLinks: 12,
  evoDmgMul: 1.2,
};

/** 疾风镖 / 旋风 */
export const W_BOOMERANG = {
  dmg: [16, 20, 26, 34, 42],
  cd: [2.5, 2.4, 2.3, 2.2, 2.0],
  count: [1, 2, 2, 2, 3],
  evoCd: 2.2,
  evoDmgMul: 1.25,
};

/** 星尘雷 / 新星 */
export const W_MINE = {
  dmg: [22, 28, 36, 46, 60],
  cd: [1.7, 1.6, 1.5, 1.4, 1.2],
  max: [8, 9, 10, 11, 12],
  evoDmgMul: 1.4,
  evoRadiusMul: 1.5,
};

/** 蒲公英 / 漫天飞絮（M8 平衡：实测 DPS 0.47x 中位，小幅提粒伤） */
export const W_PUFF = {
  dmg: [9, 11, 14, 17, 22], // 单粒种子伤害（齐射伤害靠多粒命中）
  cd: [1.7, 1.6, 1.5, 1.4, 1.25],
  n: [5, 6, 7, 8, 10], // 齐射种子数
  spread: 0.8, // 扇形张角（弧度）
  speed: 330,
  life: 0.85, // 飞行寿命（射程 = speed×life×area）
  pierce: 2, // 单粒最多命中敌人数
  evoCd: 1.15,
  evoN: 16, // 进化：全周环射
  evoDmgMul: 1.3,
  evoHoming: 130, // 进化种子缓追转向力
};

/** 暖灯笼 / 小太阳（zone：贴身暖光圈周期灼噬） */
export const W_LANTERN = {
  dmg: [6, 8, 10, 13, 17], // 每跳伤害
  tick: 0.55, // 灼噬间隔（经 stats.cd 缩放）
  radius: [78, 84, 90, 96, 104],
  evoRadiusMul: 1.35,
  evoDmgMul: 1.3,
  evoKb: 130, // 进化每跳向外推力（未进化只有轻微推力）
  kb: 26,
};

/** 星星环 / 小银河（orbit：周期召出绕身飞旋的星星，远轨快旋有歇） */
export const W_STAR = {
  dmg: [12, 15, 19, 24, 30],
  count: [2, 3, 3, 4, 4],
  radius: 108,
  spin: 2.4, // 公转角速度（rad/s）
  dur: 4, // 在场时长
  gap: [2.4, 2.2, 2.0, 1.8, 1.6], // 休息间隔
  hitCd: 0.45, // 同一敌人重复受击间隔
  breathe: 0.1, // 轨道呼吸幅度
  evoDmgMul: 1.35,
  evoExtraStars: 2,
  evoRadiusMul: 1.18,
};

/** 松果锤 / 山摇撼（melee：朝身前重砸，高伤大击退；M22 整体调强：伤害↑、判定↑、震波↑） */
export const W_MALLET = {
  dmg: [36, 46, 58, 74, 96],
  cd: [2.7, 2.55, 2.4, 2.2, 2.0],
  radius: 76, // 砸击判定半径
  reach: 84, // 砸点离身距离
  swingT: 0.16, // 抡锤前摇（秒）
  kb: 360,
  evoCd: 1.95,
  evoDmgMul: 1.35,
  waveR: 200, // 进化震波半径
  waveDmgK: 0.6, // 震波伤害系数
};

/** 风铃环 / 晨钟（burst：以自身为心荡开的铃音冲击环） */
export const W_CHIME = {
  dmg: [16, 20, 25, 32, 40],
  cd: [3.2, 3.0, 2.8, 2.6, 2.3],
  maxR: [130, 138, 146, 155, 165],
  speed: 380, // 波前扩张速度
  kb: 150,
  evoCd: 2.1,
  evoDmgMul: 1.2,
  evoMaxR: 205,
  evoKb: 300,
  evoSecondDelay: 0.35, // 进化第二记钟声延迟（秒）
};

/** 卷卷藤 / 荆棘华尔兹（whip：朝身前甩出横扫长鞭，进化加打身后第二鞭） */
export const W_VINE = {
  dmg: [18, 23, 29, 37, 47],
  cd: [1.6, 1.5, 1.42, 1.32, 1.2],
  len: 150, // 鞭长（受 area 缩放）
  wid: 36, // 判定半宽
  kb: 200,
  evoCd: 1.1,
  evoDmgMul: 1.25,
  evoLenMul: 1.25,
  evoBackDelay: 0.16, // 进化身后第二鞭延迟（秒）
};

/** 莓果弹弓 / 果酱风暴（炮射：抛物线弹出莓果，落地范围爆炸；进化留黏滞果酱） */
export const W_SLING = {
  dmg: [26, 33, 41, 52, 66],
  cd: [2.5, 2.4, 2.25, 2.1, 1.9],
  n: [1, 1, 2, 2, 3], // 每轮抛射莓果数（瞄准最近的 n 个敌人）
  blastR: 78, // 爆炸半径（受 area 缩放）
  range: 380, // 索敌距离
  flyT: 0.55, // 抛物飞行时长（秒）
  arcH: 70, // 抛物线最高点抬升（视觉）
  kb: 170,
  evoCd: 1.7,
  evoDmgMul: 1.3,
  evoBlastMul: 1.25,
  jamR: 62, // 进化果酱减速区半径
  jamDur: 4,
};

/** 流萤珠 / 萤光长河（追踪：放出转向追敌的小萤光，命中即灭；进化更多更快可穿透）
 *  M8 平衡：实测 DPS 仅 0.26x 中位（追踪空耗近半），加弹数/伤害/转向力/弹速
 *  M12 bench：0.59x 中位 → 伤害再上调 ~16%（docs/balance/dps-M12.md） */
export const W_WISP = {
  dmg: [17, 22, 28, 35, 44],
  cd: [2.1, 2.0, 1.9, 1.75, 1.6],
  n: [3, 4, 4, 5, 6],
  speed: 280,
  turn: 520, // 追踪转向力
  life: 2.4, // 飞行寿命（秒，受 area 缩放）
  seek: 420, // 索敌半径
  evoCd: 1.45,
  evoN: 7,
  evoDmgMul: 1.25,
  evoTurn: 540,
  evoPierce: 2, // 进化单粒可穿透敌人数（未进化 1）
};

/** 喇叭花号手 / 晨光号角（哨塔：种下喇叭花朝最近敌人连射种子；进化双株齐奏）
 *  M8 平衡：实测 DPS 0.42x 中位，提弹伤 + 射速
 *  M12 bench：0.40x 中位 → 弹伤 ~+24% + 种植间隔小幅缩短（哨塔覆盖率）；
 *  单株 Lv5 偏弱、进化双株 6.8x 跃升是该武器设计形态，不强行拉平 */
export const W_BUGLE = {
  dmg: [17, 21, 26, 32, 41], // 单发种子伤害
  cd: [4.6, 4.4, 4.2, 4.0, 3.7], // 种植间隔
  dur: 6, // 哨塔在场时长（秒）
  fireCd: 0.5, // 哨塔射击间隔
  range: 250, // 哨塔索敌半径（受 area 缩放）
  bulletSpeed: 320,
  kb: 110,
  evoCd: 3.6,
  evoDmgMul: 1.3,
  evoDur: 7,
  evoFireCd: 0.4,
  evoCount: 2, // 进化同时种两株
  plantGap: 56, // 进化双株间距
};

// ========== M22 批次 D/E/F：16 把新武器平衡表 ==========

/** 飞刀 / 千刃（朝移动方向连射高速穿透飞刀，区域封锁；进化连发成流） */
export const W_DAGGER = {
  dmg: [12, 15, 19, 24, 30],
  cd: [0.9, 0.85, 0.8, 0.72, 0.65],
  n: [2, 2, 3, 3, 4], // 每轮飞刀数
  spread: 0.13, // 扇形张角（紧密）
  speed: 560,
  life: 0.7,
  pierce: 3,
  evoCd: 0.5,
  evoN: 5,
  evoDmgMul: 1.25,
  evoPierce: 5,
};

/** 飞斧 / 裂空斧（抛物线上抛旋转斧、下落穿透高伤；进化扇形多斧覆盖更广） */
export const W_AXE = {
  dmg: [34, 42, 54, 70, 90],
  cd: [2.4, 2.3, 2.2, 2.0, 1.8],
  n: [1, 1, 2, 2, 3],
  vy0: 540, // 初始上抛速度
  grav: 760,
  spreadVx: 150, // 横向散布
  pierce: 4,
  hitR: 22,
  evoCd: 1.5,
  evoN: 6,
  evoDmgMul: 1.35,
  evoPierce: 8,
};

/** 流火 / 业火（缓慢大火球穿透全场 + 沿途留火痕；进化更大更烫） */
export const W_FIREBALL = {
  dmg: [22, 28, 35, 44, 56],
  cd: [1.8, 1.7, 1.6, 1.5, 1.35],
  speed: 240,
  life: 1.3,
  hitR: 20,
  hitCd: 0.4, // 同一敌人重复受击间隔（穿透不灭）
  trailCd: 0.16, // 火痕投放间隔
  trailDps: 10,
  trailR: 32,
  trailDur: 1.4,
  evoCd: 1.1,
  evoDmgMul: 1.3,
  evoRMul: 1.4,
  evoTrailDps: 16,
};

/** 朝露瓶 / 朝露潮（抛瓶碎裂留持续灼烧地汐 DoT 池；进化池更大更久） */
export const W_FLASK = {
  poolDps: [16, 20, 25, 31, 40],
  cd: [2.6, 2.45, 2.3, 2.1, 1.9],
  n: [2, 2, 3, 3, 4],
  poolR: 56,
  poolDur: 3.0,
  range: 320,
  flyT: 0.5,
  arcH: 60,
  impactK: 0.4, // 落地即时伤害 = poolDps×impactK（轻量）
  evoCd: 1.5,
  evoDmgMul: 1.3,
  evoPoolRMul: 1.3,
  evoPoolDur: 4.0,
};

/** 落雷 / 雷云（随机劈中场上多名敌人的天雷 + 小爆；进化更多更广连小跳） */
export const W_BOLT = {
  dmg: [26, 33, 42, 53, 68],
  cd: [2.2, 2.1, 2.0, 1.85, 1.7],
  n: [2, 3, 3, 4, 5], // 每次落雷点数
  blastR: 46,
  range: 360, // 取玩家周围此半径内敌人随机劈
  kb: 90,
  evoCd: 1.4,
  evoN: 6,
  evoDmgMul: 1.25,
  evoBlastMul: 1.3,
};

/** 候鸟 / 双飞（远轨巡飞伙伴 + 周期俯冲扫线；进化加鸟更快） */
export const W_BIRD = {
  dmg: [16, 20, 25, 32, 40],
  count: [1, 1, 1, 2, 2],
  orbitR: 156,
  orbitSpeed: 1.5, // 巡航角速度（rad/s）
  diveSpeed: 620,
  hitR: 24,
  hitCd: 0.45,
  diveCd: [3.0, 2.8, 2.6, 2.4, 2.2], // 俯冲间隔
  evoExtraBirds: 1,
  evoDmgMul: 1.3,
  evoSpeedMul: 1.3,
};

/** 跳跳豆 / 乱弹（撞屏边反弹、长留场可重复命中；进化更多更久撞点迸火星） */
export const W_RICOCHET = {
  dmg: [15, 19, 24, 30, 38],
  cd: [2.3, 2.2, 2.1, 1.95, 1.8],
  n: [1, 1, 2, 2, 2],
  speed: 300,
  life: 3.0,
  hitR: 17,
  hitCd: 0.4,
  evoCd: 1.5,
  evoN: 3,
  evoDmgMul: 1.25,
  evoLife: 4.2,
};

/** 晨星杖 / 圣星杖（自动锁最近敌高频单发星弹；进化近无冷却 + 穿透） */
export const W_WAND = {
  dmg: [16, 20, 25, 31, 40],
  cd: [0.75, 0.7, 0.62, 0.55, 0.48],
  n: [1, 1, 2, 2, 3], // 同时锁最近 n 个目标
  speed: 600,
  life: 0.8,
  hitR: 11,
  pierce: 1,
  range: 380,
  evoCd: 0.32,
  evoN: 3,
  evoDmgMul: 1.25,
  evoPierce: 2,
};

/** 龙息 / 烈焰息（朝向持续喷吐火焰锥；进化锥更宽更远更烫） */
export const W_BREATH = {
  dmg: [6, 8, 10, 13, 16], // 每跳伤害
  tick: 0.12, // 喷吐期间灼伤间隔
  cd: [1.6, 1.5, 1.4, 1.3, 1.2], // 换气间隔
  dur: 0.8, // 单次喷吐时长
  range: 112,
  halfAngle: 0.6, // 锥半角（弧度）
  kb: 40,
  evoCd: 0.9,
  evoDmgMul: 1.25,
  evoRange: 152,
  evoHalfAngle: 0.85,
};

/** 樱桃弹 / 满堂彩（抛掷定时炸弹、引信后超大爆 + 击退；进化炸出子弹幕） */
export const W_BOMB = {
  dmg: [40, 52, 66, 84, 108],
  cd: [3.0, 2.85, 2.7, 2.5, 2.3],
  n: [1, 1, 1, 2, 2],
  fuse: 0.7,
  blastR: 96,
  range: 300,
  flyT: 0.45,
  arcH: 64,
  kb: 320,
  evoCd: 2.0,
  evoDmgMul: 1.3,
  evoBlastMul: 1.3,
  evoCluster: 3, // 进化主爆后迸出的子炸弹数
  clusterDmgK: 0.45,
  clusterBlastK: 0.55,
};

/** 月华引 / 食蚀井（定点漩涡吸拢并持续灼蚀，末段内爆；进化吸更广爆更狠） */
export const W_GRAVITY = {
  dmg: [5, 7, 9, 11, 14], // 每跳灼蚀
  tick: 0.25,
  cd: [4.0, 3.8, 3.6, 3.3, 3.0],
  pullR: 152,
  pull: 150, // 每秒向心位移
  dur: 2.6,
  range: 280,
  implodeK: 4.0, // 末段内爆伤害 = dmg×implodeK
  evoCd: 2.6,
  evoDmgMul: 1.3,
  evoPullRMul: 1.3,
  evoImplodeK: 6.0,
};

/** 突刺剑 / 贯日（朝前直线突刺，细长高单体；进化突刺后续延伸光刃） */
export const W_SWORD = {
  dmg: [24, 30, 38, 48, 62],
  cd: [1.3, 1.22, 1.14, 1.05, 0.95],
  len: 132,
  wid: 26,
  kb: 190,
  thrustT: 0.14, // 突刺前摇
  evoCd: 0.85,
  evoDmgMul: 1.25,
  evoLenMul: 1.32,
  evoBeamLen: 210, // 进化延伸光刃额外射程
  evoBeamDmgK: 0.6,
};

/** 群蜂 / 蜂巢（放出乱舞蜂群在身周反复叮咬；进化蜂多命长） */
export const W_SWARM = {
  dmg: [7, 9, 11, 14, 18],
  cd: [2.4, 2.3, 2.2, 2.05, 1.9],
  n: [4, 5, 6, 7, 9],
  life: 3.0,
  speed: 95,
  seek: 220, // 松散索敌半径
  hitR: 12,
  hitCd: 0.5,
  evoCd: 1.7,
  evoN: 12,
  evoDmgMul: 1.25,
  evoLife: 4.0,
};

/** 坠星 / 流星雨（预警后陨石坠地巨爆 + 震屏留陨坑；进化更多更广） */
export const W_METEOR = {
  dmg: [38, 48, 62, 80, 104],
  cd: [3.2, 3.05, 2.9, 2.7, 2.5],
  n: [1, 1, 2, 2, 3],
  blastR: 84,
  fallT: 0.62, // 预警 + 坠落时长
  range: 340,
  kb: 260,
  craterDps: 9,
  craterDur: 2.0,
  evoCd: 2.0,
  evoN: 4,
  evoDmgMul: 1.3,
  evoBlastMul: 1.25,
  evoCraterDps: 15,
};

/** 凛霜 / 极寒（冰锥命中碎裂溅射 + 留减速霜地；进化碎裂更广减速更久） */
export const W_FROST = {
  dmg: [20, 25, 32, 40, 52],
  cd: [2.1, 2.0, 1.9, 1.75, 1.6],
  n: [1, 1, 2, 2, 3],
  speed: 340,
  life: 1.0,
  hitR: 13,
  shatterR: 58, // 碎裂溅射半径
  shatterK: 0.5, // 溅射伤害系数
  slowR: 52,
  slowDur: 2.0,
  evoCd: 1.4,
  evoN: 4,
  evoDmgMul: 1.25,
  evoShatterMul: 1.3,
  evoSlowDur: 3.0,
};

/** 卷叶风 / 落叶旋（游走旋风柱反复卷击 + 旋舞击退；进化更大更久） */
export const W_TORNADO = {
  dmg: [10, 13, 16, 20, 26],
  tick: 0.3,
  cd: [3.4, 3.2, 3.0, 2.8, 2.6],
  r: 62,
  dur: 3.0,
  speed: 72, // 游走速度
  kb: 70, // 旋舞切向击退
  evoCd: 2.4,
  evoDmgMul: 1.3,
  evoRMul: 1.3,
  evoDur: 4.0,
};

// ---------- 宝箱装箱 ----------
// 件数 1 常见 / 3、5 稀有惊喜；每件按 进化 > 规则卡 > 升级 > 金币 优先级装箱
export const CHEST = {
  tripleChance: 0.2, // 开出 3 件的概率
  pentaChance: 0.05, // 开出 5 件的概率（先判 5 再判 3，其余 1 件）
  goldCoins: 30, // 金币件面值（受金币获取加成；升级候选耗尽时按件兜底）
  goldHeal: 30,
};
