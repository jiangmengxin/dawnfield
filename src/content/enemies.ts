// 敌人规格 / 行为模板指派 / 行为调参 / Boss 数值（纯数据层，禁止依赖 Phaser）
// M5 起每图专属敌人池：行为模板（12 种）× 换皮调色（纹理配方在 gfx/textures/mapassets.ts）
// 波次时间表随地图走（content/maps.ts）
import { defineTable } from '../core/registry';
import type { BehaviorId, EnemyId } from './ids';

/** 射击参数（strafeShoot / turret 行为 + Boss 弹幕共用弹体系统） */
export interface ShootSpec {
  range: number; // 进入射程才开火
  cd: number; // 开火间隔（秒）
  speed: number;
  dmg: number;
  n?: number; // 一次齐射弹数（轻微扇形），默认 1
  tex?: string; // 弹体纹理，默认 'inkball'
}

/** 冲刺参数（dash 行为；不配则用 DASHER 默认） */
export interface DashSpec {
  triggerDist: number;
  telegraph: number;
  dashSpeed: number;
  dashTime: number;
  recover: number;
}

export interface EnemySpec {
  hp: number;
  speed: number;
  dmg: number; // 接触伤害
  xp: number;
  radius: number;
  tex: string;
  knockMul: number; // 受击退系数（壳壳/精英/Boss 低）
  behavior: BehaviorId;
  /** 死亡时分裂 */
  split?: { id: EnemyId; n: number };
  shoot?: ShootSpec;
  dash?: DashSpec;
  elite?: boolean;
  boss?: boolean;
  /** 翻面取反（沿用冲冲既有朝向规则） */
  flipInvert?: boolean;
}

export const ENEMIES = defineTable<EnemyId, EnemySpec>({
  // ---------- 晨光草甸 ----------
  blob:     { hp: 14,   speed: 56,  dmg: 8,  xp: 1,  radius: 14, tex: 'e_blob',     knockMul: 1,    behavior: 'chase' },
  midge:    { hp: 6,    speed: 98,  dmg: 5,  xp: 1,  radius: 9,  tex: 'e_midge',    knockMul: 1.3,  behavior: 'wobble' },
  shelly:   { hp: 70,   speed: 36,  dmg: 13, xp: 3,  radius: 17, tex: 'e_shelly',   knockMul: 0.15, behavior: 'chase' },
  spitter:  { hp: 24,   speed: 50,  dmg: 7,  xp: 2,  radius: 14, tex: 'e_spitter',  knockMul: 0.9,  behavior: 'strafeShoot',
              shoot: { range: 270, cd: 3.0, speed: 150, dmg: 10 } },
  dasher:   { hp: 28,   speed: 62,  dmg: 14, xp: 2,  radius: 13, tex: 'e_dasher',   knockMul: 0.8,  behavior: 'dash', flipInvert: true },
  splitter: { hp: 34,   speed: 64,  dmg: 9,  xp: 2,  radius: 15, tex: 'e_splitter', knockMul: 0.9,  behavior: 'chase', split: { id: 'mini', n: 2 } },
  mini:     { hp: 8,    speed: 88,  dmg: 5,  xp: 1,  radius: 9,  tex: 'e_mini',     knockMul: 1.2,  behavior: 'wobble' },
  elite:    { hp: 900,  speed: 42,  dmg: 18, xp: 30, radius: 40, tex: 'e_elite',    knockMul: 0.05, behavior: 'chase', elite: true },
  boss:     { hp: 3600, speed: 64,  dmg: 24, xp: 0,  radius: 62, tex: 'e_boss',     knockMul: 0,    behavior: 'chase', boss: true },

  // ---------- 露珠池塘（厚重慢节奏：坦克/炮台/跳袭） ----------
  tad:       { hp: 10,   speed: 104, dmg: 6,  xp: 1,  radius: 9,  tex: 'e_tad',       knockMul: 1.3,  behavior: 'zigzag' },
  bubble:    { hp: 18,   speed: 46,  dmg: 8,  xp: 1,  radius: 13, tex: 'e_bubble',    knockMul: 1.25, behavior: 'drift' },
  snail:     { hp: 95,   speed: 30,  dmg: 14, xp: 3,  radius: 16, tex: 'e_snail',     knockMul: 0.12, behavior: 'chase' },
  frog:      { hp: 30,   speed: 55,  dmg: 11, xp: 2,  radius: 13, tex: 'e_frog',      knockMul: 0.7,  behavior: 'hop' },
  squirt:    { hp: 26,   speed: 46,  dmg: 7,  xp: 2,  radius: 13, tex: 'e_squirt',    knockMul: 0.8,  behavior: 'turret',
               shoot: { range: 250, cd: 2.6, speed: 170, dmg: 9, tex: 'pz_bub' } },
  jelly:     { hp: 40,   speed: 58,  dmg: 12, xp: 2,  radius: 14, tex: 'e_jelly',     knockMul: 0.6,  behavior: 'orbit' },
  bigbubble: { hp: 1000, speed: 38,  dmg: 18, xp: 30, radius: 42, tex: 'e_bigbubble', knockMul: 0.05, behavior: 'chase', elite: true },
  bubbleking:{ hp: 4200, speed: 56,  dmg: 24, xp: 0,  radius: 64, tex: 'e_bubbleking',knockMul: 0,    behavior: 'chase', boss: true },

  // ---------- 晚霞山岗（轻血海量快节奏：冲刺/俯冲/闪现） ----------
  leafy:     { hp: 12,   speed: 70,  dmg: 7,  xp: 1,  radius: 12, tex: 'e_leafy',     knockMul: 1.1,  behavior: 'chase' },
  grain:     { hp: 7,    speed: 92,  dmg: 5,  xp: 1,  radius: 8,  tex: 'e_grain',     knockMul: 1.3,  behavior: 'wobble' },
  crow:      { hp: 16,   speed: 96,  dmg: 9,  xp: 1,  radius: 11, tex: 'e_crow',      knockMul: 0.9,  behavior: 'swoop' },
  thistle:   { hp: 30,   speed: 60,  dmg: 13, xp: 2,  radius: 13, tex: 'e_thistle',   knockMul: 0.7,  behavior: 'dash',
               dash: { triggerDist: 260, telegraph: 0.45, dashSpeed: 360, dashTime: 0.5, recover: 0.9 } },
  wheatling: { hp: 36,   speed: 62,  dmg: 9,  xp: 2,  radius: 14, tex: 'e_wheatling', knockMul: 0.9,  behavior: 'chase', split: { id: 'grain', n: 2 } },
  cone:      { hp: 50,   speed: 52,  dmg: 13, xp: 2,  radius: 13, tex: 'e_cone',      knockMul: 0.5,  behavior: 'pulse' },
  gust:      { hp: 24,   speed: 58,  dmg: 10, xp: 2,  radius: 12, tex: 'e_gust',      knockMul: 1,    behavior: 'blink' },
  bigthistle:{ hp: 850,  speed: 44,  dmg: 18, xp: 30, radius: 40, tex: 'e_bigthistle',knockMul: 0.05, behavior: 'dash', elite: true,
               dash: { triggerDist: 340, telegraph: 0.9, dashSpeed: 300, dashTime: 0.7, recover: 1.6 } },
  galecrow:  { hp: 3800, speed: 70,  dmg: 24, xp: 0,  radius: 60, tex: 'e_galecrow',  knockMul: 0,    behavior: 'chase', boss: true },

  // ---------- 萤暮林地（中速韧性节奏：潜伏菇/孢子炮台/滚壳虫） ----------
  shroom:    { hp: 18,   speed: 58,  dmg: 9,  xp: 1,  radius: 13, tex: 'e_shroom',    knockMul: 1,    behavior: 'chase' },
  glimmer:   { hp: 7,    speed: 100, dmg: 5,  xp: 1,  radius: 9,  tex: 'e_glimmer',   knockMul: 1.3,  behavior: 'wobble' },
  mottle:    { hp: 24,   speed: 66,  dmg: 10, xp: 2,  radius: 12, tex: 'e_mottle',    knockMul: 1,    behavior: 'drift' },
  snapcap:   { hp: 42,   speed: 60,  dmg: 13, xp: 2,  radius: 14, tex: 'e_snapcap',   knockMul: 0.7,  behavior: 'ambush' },
  puffcap:   { hp: 30,   speed: 44,  dmg: 8,  xp: 2,  radius: 14, tex: 'e_puffcap',   knockMul: 0.8,  behavior: 'turret',
               shoot: { range: 260, cd: 2.8, speed: 160, dmg: 10, tex: 'gz_spore' } },
  roller:    { hp: 55,   speed: 50,  dmg: 14, xp: 2,  radius: 14, tex: 'e_roller',    knockMul: 0.5,  behavior: 'pulse' },
  eldercap:  { hp: 1100, speed: 40,  dmg: 19, xp: 30, radius: 42, tex: 'e_eldercap',  knockMul: 0.05, behavior: 'chase', elite: true },
  sporeking: { hp: 4600, speed: 52,  dmg: 25, xp: 0,  radius: 64, tex: 'e_sporeking', knockMul: 0,    behavior: 'chase', boss: true },

  // ---------- 紫露花田（轻快缠绕节奏：螺旋蝶/俯冲蜂/弹跳绒球） ----------
  budling:   { hp: 13,   speed: 74,  dmg: 7,  xp: 1,  radius: 11, tex: 'e_budling',   knockMul: 1.1,  behavior: 'chase' },
  bumble:    { hp: 15,   speed: 95,  dmg: 9,  xp: 1,  radius: 10, tex: 'e_bumble',    knockMul: 0.9,  behavior: 'swoop' },
  flutter:   { hp: 18,   speed: 80,  dmg: 9,  xp: 1,  radius: 12, tex: 'e_flutter',   knockMul: 1,    behavior: 'spiral' },
  snippy:    { hp: 32,   speed: 64,  dmg: 13, xp: 2,  radius: 13, tex: 'e_snippy',    knockMul: 0.7,  behavior: 'dash',
               dash: { triggerDist: 270, telegraph: 0.4, dashSpeed: 380, dashTime: 0.45, recover: 0.85 } },
  pompon:    { hp: 26,   speed: 60,  dmg: 10, xp: 2,  radius: 13, tex: 'e_pompon',    knockMul: 1.1,  behavior: 'hop' },
  briar:     { hp: 34,   speed: 48,  dmg: 9,  xp: 2,  radius: 13, tex: 'e_briar',     knockMul: 0.8,  behavior: 'strafeShoot',
               shoot: { range: 270, cd: 3.2, speed: 170, dmg: 10, tex: 'lz_thorn' } },
  queenbee:  { hp: 950,  speed: 46,  dmg: 18, xp: 30, radius: 40, tex: 'e_queenbee',  knockMul: 0.05, behavior: 'chase', elite: true },
  flutterqueen: { hp: 5000, speed: 66, dmg: 25, xp: 0, radius: 62, tex: 'e_flutterqueen', knockMul: 0, behavior: 'chase', boss: true },

  // ---------- 莓果灌丛（中坚黏人节奏：钻地鼠/扑袭熊崽/浆果炮手） ----------
  berryling: { hp: 16,   speed: 72,  dmg: 8,  xp: 1,  radius: 12, tex: 'e_berryling', knockMul: 1.1,  behavior: 'chase' },
  bristle:   { hp: 26,   speed: 68,  dmg: 12, xp: 2,  radius: 12, tex: 'e_bristle',   knockMul: 0.9,  behavior: 'zigzag' },
  mole:      { hp: 32,   speed: 58,  dmg: 13, xp: 2,  radius: 13, tex: 'e_mole',      knockMul: 0.8,  behavior: 'burrow' },
  magpie:    { hp: 20,   speed: 92,  dmg: 10, xp: 1,  radius: 11, tex: 'e_magpie',    knockMul: 0.9,  behavior: 'swoop' },
  cubby:     { hp: 46,   speed: 56,  dmg: 14, xp: 2,  radius: 15, tex: 'e_cubby',     knockMul: 0.6,  behavior: 'hop' },
  gourd:     { hp: 34,   speed: 46,  dmg: 8,  xp: 2,  radius: 14, tex: 'e_gourd',     knockMul: 0.8,  behavior: 'turret',
               shoot: { range: 260, cd: 2.9, speed: 165, dmg: 10, tex: 'bz_berry' } },
  bigberry:  { hp: 1150, speed: 42,  dmg: 19, xp: 30, radius: 42, tex: 'e_bigberry',  knockMul: 0.05, behavior: 'chase', elite: true },
  bramblebear: { hp: 5300, speed: 58, dmg: 26, xp: 0, radius: 64, tex: 'e_bramblebear', knockMul: 0,  behavior: 'chase', boss: true },

  // ---------- 星语夜原（夜行游击节奏：闪现星精/月相变速/绕飞小枭） ----------
  moonmote:  { hp: 9,    speed: 100, dmg: 6,  xp: 1,  radius: 9,  tex: 'e_moonmote',  knockMul: 1.3,  behavior: 'wobble' },
  twinkle:   { hp: 22,   speed: 62,  dmg: 11, xp: 2,  radius: 11, tex: 'e_twinkle',   knockMul: 1,    behavior: 'blink' },
  nightmoth: { hp: 20,   speed: 82,  dmg: 9,  xp: 1,  radius: 12, tex: 'e_nightmoth', knockMul: 1,    behavior: 'spiral' },
  lunaling:  { hp: 28,   speed: 64,  dmg: 12, xp: 2,  radius: 12, tex: 'e_lunaling',  knockMul: 0.9,  behavior: 'phase' },
  owlet:     { hp: 26,   speed: 76,  dmg: 11, xp: 2,  radius: 12, tex: 'e_owlet',     knockMul: 0.7,  behavior: 'orbit' },
  sparkler:  { hp: 30,   speed: 52,  dmg: 9,  xp: 2,  radius: 13, tex: 'e_sparkler',  knockMul: 0.8,  behavior: 'strafeShoot',
               shoot: { range: 270, cd: 3.1, speed: 175, dmg: 10, tex: 'nz_star' } },
  cometlord: { hp: 1050, speed: 46,  dmg: 19, xp: 30, radius: 40, tex: 'e_cometlord', knockMul: 0.05, behavior: 'dash', elite: true,
               dash: { triggerDist: 340, telegraph: 0.85, dashSpeed: 320, dashTime: 0.65, recover: 1.5 } },
  starelk:   { hp: 5600, speed: 64,  dmg: 26, xp: 0,  radius: 62, tex: 'e_starelk',   knockMul: 0,    behavior: 'chase', boss: true },

  // ---------- 破晓之巅（终局长夜节奏：影群海量/伏击影守/滚动蚀轮） ----------
  shade:     { hp: 18,   speed: 76,  dmg: 9,  xp: 1,  radius: 12, tex: 'e_shade',     knockMul: 1.1,  behavior: 'chase' },
  gloom:     { hp: 24,   speed: 50,  dmg: 10, xp: 1,  radius: 13, tex: 'e_gloom',     knockMul: 1.2,  behavior: 'drift' },
  umbra:     { hp: 22,   speed: 94,  dmg: 10, xp: 1,  radius: 11, tex: 'e_umbra',     knockMul: 0.9,  behavior: 'swoop' },
  glint:     { hp: 8,    speed: 104, dmg: 6,  xp: 1,  radius: 8,  tex: 'e_glint',     knockMul: 1.3,  behavior: 'wobble' },
  nightbloom:{ hp: 36,   speed: 44,  dmg: 9,  xp: 2,  radius: 14, tex: 'e_nightbloom',knockMul: 0.8,  behavior: 'turret',
               shoot: { range: 265, cd: 2.8, speed: 170, dmg: 11, tex: 'sz_petal' } },
  eclipse:   { hp: 62,   speed: 54,  dmg: 15, xp: 2,  radius: 14, tex: 'e_eclipse',   knockMul: 0.5,  behavior: 'pulse' },
  lurker:    { hp: 46,   speed: 62,  dmg: 14, xp: 2,  radius: 14, tex: 'e_lurker',    knockMul: 0.7,  behavior: 'ambush' },
  shadelord: { hp: 1250, speed: 42,  dmg: 20, xp: 30, radius: 42, tex: 'e_shadelord', knockMul: 0.05, behavior: 'chase', elite: true },
  nightowl:  { hp: 6200, speed: 60,  dmg: 27, xp: 0,  radius: 64, tex: 'e_nightowl',  knockMul: 0,    behavior: 'chase', boss: true },
});

// 随时间成长（min 为「有效分钟」：elapsed/60 × MapSpec.timeK，长图成长更慢）
export function hpScale(min: number): number {
  return 1 + min * 0.22 + Math.max(0, min - 8) * 0.18;
}
export function dmgScale(min: number): number {
  return 1 + min * 0.055;
}

// ---------- 行为模板调参（行为代码在 systems/behaviors.ts，调参只改此处） ----------

export const DASHER: DashSpec = { triggerDist: 300, telegraph: 0.55, dashSpeed: 340, dashTime: 0.45, recover: 1.1 };
/** 蛙蹦蹦：蹲伏—跃扑 循环 */
export const HOP = { rest: 0.75, leap: 0.4, leapMul: 4.2 };
/** 泡泡：缓慢飘近 + 大幅横摆 */
export const DRIFT = { wobK: 2.2, amp: 0.85, fwd: 0.62 };
/** 水母：绕玩家公转缓慢收紧 */
export const ORBIT = { dist: 132, inward: 16, mul: 1.15 };
/** 小乌鸫：瞄准—直线俯冲穿场—再瞄准 */
export const SWOOP = { aim: 0.55, fly: 1.9, mul: 2.0 };
/** 风精灵：周期闪现到玩家身侧 + 落地僵直 */
export const BLINK = { cd: 4.2, dist: 150, freeze: 0.55 };
/** 松果球：加速滚动—滑行减速 循环 */
export const PULSE = { burst: 0.7, coast: 0.9, mulBurst: 2.4, mulCoast: 0.25 };
/** 水枪鱼：射程内驻停（轻微踱步） */
export const TURRET = { shuffleMul: 0.12 };
/** 蝌蚪宝：锯齿折线逼近 */
export const ZIGZAG = { period: 0.55, angle: 0.65 };
/** 紫蝶蝶：螺旋盘入（远=直奔，近=切向绕旋 + 振翅抖动） */
export const SPIRAL = { far: 280, tan: 1.0, inMin: 0.3, flutter: 0.3 };
/** 害羞菇：原地潜伏装蘑菇，玩家靠近即惊醒 → 爆发/喘息循环追击 */
export const AMBUSH = { trigger: 200, burst: 1.3, tire: 0.7, mulBurst: 2.3, mulTire: 0.45, idleAlpha: 0.78 };
/** 钻钻鼠：地表慢走—钻地疾掘—破土小僵直 循环（M7） */
export const BURROW = { surface: 1.6, dig: 1.3, pop: 0.35, mulDig: 2.2, digAlpha: 0.45 };
/** 月相灵：明相缓行 / 暗相疾行 交替（M7，亮暗随月相变速） */
export const PHASE = { bright: 1.5, dark: 1.1, mulBright: 0.45, mulDark: 2.1, darkAlpha: 0.5 };
