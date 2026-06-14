// Boss 技能配装表（纯数据层，禁止依赖 Phaser）
// BossController 按 BossSpec 数据驱动：每个 Boss 一组独占主招 + 轻辅招；
// 旧 ring/spread/summon/dash 仍可作为低频背景压力，但不再承担 Boss 记忆点。
import type { EnemyId, MapId } from './ids';

export type BossMoveId =
  | 'ink_recall' | 'crown_drip'
  | 'bubble_lane' | 'bubble_pressure'
  | 'feather_return' | 'sidewind_shear'
  | 'spore_breath' | 'mushroom_drop'
  | 'butterfly_clasp' | 'dust_curve'
  | 'bear_paws' | 'bramble_rift'
  | 'constellation_lines' | 'meteor_mark'
  | 'owl_gaze' | 'feather_curtain'
  | 'fruit_roll' | 'cider_sprout'
  | 'snow_footsteps' | 'frost_breath'
  | 'mirror_tide' | 'mirror_shards'
  | 'dawn_beat' | 'pendulum_sweep';

export interface BossMoveSpec {
  id: BossMoveId;
  role: 'main' | 'support';
  firstCd: number;
  cd: number;
  cdP2?: number;
  warn: number;
  warnP2?: number;
  dmg: number;
  color: number;
  radius?: number;
  width?: number;
  length?: number;
  count?: number;
  speed?: number;
  p2?: {
    delay?: number;
    rotate?: number;
    extra?: number;
    reverse?: boolean;
  };
}

export interface BossRing {
  firstCd: number;
  cd: number;
  cdP2: number;
  n: number;
  nP2: number;
  speed: number;
  dmg: number;
  tex?: string;
  p2Only?: boolean;
}

export interface BossSpread {
  firstCd: number;
  cd: number;
  cdP2: number;
  n: number; // 扇内弹数
  arc: number; // 扇形张角（弧度）
  speed: number;
  dmg: number;
  tex?: string;
  p2Only?: boolean;
}

export interface BossSummon {
  firstCd: number;
  cd: number;
  id: EnemyId;
  n: number;
  radius: number;
  p2Only?: boolean;
}

export interface BossDash {
  firstCd: number;
  cd: number;
  cdP2: number;
  speed: number;
  minDist: number;
}

export interface BossSpec {
  phase2HpK: number; // 二阶段血量阈值
  moves: readonly [BossMoveSpec, BossMoveSpec]; // 独占主招 + 轻辅招
  ring?: BossRing;
  spread?: BossSpread;
  summon?: BossSummon;
  dash?: BossDash;
}

export const BOSSES: Record<MapId, BossSpec> = {
  // 墨之王：墨迹路径记忆 + 王冠滴墨；旧招只留低频背景压力
  meadow: {
    phase2HpK: 0.5,
    moves: [
      { id: 'ink_recall', role: 'main', firstCd: 3.2, cd: 8.8, cdP2: 7.2, warn: 0.72, warnP2: 0.58, dmg: 12, color: 0x5a6488, radius: 34, count: 5, p2: { delay: 0.45, reverse: true } },
      { id: 'crown_drip', role: 'support', firstCd: 6.4, cd: 10.2, warn: 0.72, dmg: 10, color: 0x8a96b8, width: 34, length: 210, count: 4 },
    ],
    ring: { firstCd: 11, cd: 12, cdP2: 10, n: 9, nP2: 11, speed: 145, dmg: 9 },
    summon: { firstCd: 19, cd: 18, id: 'midge', n: 4, radius: 90, p2Only: true },
    dash: { firstCd: 14, cd: 13, cdP2: 11, speed: 380, minDist: 150 },
  },
  // 泡泡大王：浮泡夹道 + 带缺口压力环
  pond: {
    phase2HpK: 0.5,
    moves: [
      { id: 'bubble_lane', role: 'main', firstCd: 3.4, cd: 9.4, cdP2: 7.6, warn: 0.74, warnP2: 0.58, dmg: 13, color: 0x78b8d8, width: 38, length: 560, count: 2, p2: { delay: 0.36, extra: 1 } },
      { id: 'bubble_pressure', role: 'support', firstCd: 7.2, cd: 11.5, warn: 0.76, dmg: 11, color: 0x9bd7ee, radius: 160, width: 32 },
    ],
    ring: { firstCd: 12, cd: 13, cdP2: 11, n: 10, nP2: 13, speed: 100, dmg: 10, tex: 'pz_bub' },
    spread: { firstCd: 15, cd: 14, cdP2: 12, n: 4, arc: 0.5, speed: 220, dmg: 11, tex: 'pz_bub' },
    summon: { firstCd: 23, cd: 20, id: 'tad', n: 4, radius: 100 },
  },
  // 风暴鸦：风羽折返 + 侧风剪
  hills: {
    phase2HpK: 0.5,
    moves: [
      { id: 'feather_return', role: 'main', firstCd: 2.8, cd: 8.4, cdP2: 6.9, warn: 0.7, warnP2: 0.56, dmg: 12, color: 0xd89a58, width: 30, length: 660, p2: { delay: 0.38, rotate: 0.5 } },
      { id: 'sidewind_shear', role: 'support', firstCd: 6.8, cd: 10.4, warn: 0.72, dmg: 10, color: 0xe9c07a, width: 32, length: 520, count: 2 },
    ],
    spread: { firstCd: 12, cd: 11, cdP2: 9.5, n: 5, arc: 0.78, speed: 250, dmg: 9, tex: 'hz_feather' },
    ring: { firstCd: 18, cd: 15, cdP2: 13, n: 10, nP2: 12, speed: 190, dmg: 9, tex: 'hz_feather', p2Only: true },
    summon: { firstCd: 26, cd: 23, id: 'crow', n: 3, radius: 110, p2Only: true },
    dash: { firstCd: 14, cd: 12, cdP2: 10, speed: 470, minDist: 120 },
  },
  // 蘑菇长老：孢环呼吸 + 菌伞落点
  grove: {
    phase2HpK: 0.5,
    moves: [
      { id: 'spore_breath', role: 'main', firstCd: 3.8, cd: 9.6, cdP2: 7.8, warn: 0.74, warnP2: 0.58, dmg: 13, color: 0x7ab86a, radius: 135, width: 46, count: 2, p2: { reverse: true, delay: 0.42 } },
      { id: 'mushroom_drop', role: 'support', firstCd: 7.4, cd: 11.6, warn: 0.72, dmg: 11, color: 0xb0d878, radius: 42, count: 3 },
    ],
    ring: { firstCd: 13, cd: 12.5, cdP2: 10.5, n: 10, nP2: 13, speed: 115, dmg: 10, tex: 'gz_spore' },
    spread: { firstCd: 17, cd: 14, cdP2: 12, n: 4, arc: 0.48, speed: 190, dmg: 11, tex: 'gz_spore', p2Only: true },
    summon: { firstCd: 22, cd: 18, id: 'shroom', n: 4, radius: 95 },
  },
  // 紫蝶女王：蝶翼合拢 + 鳞粉曲线
  lavender: {
    phase2HpK: 0.5,
    moves: [
      { id: 'butterfly_clasp', role: 'main', firstCd: 3.1, cd: 8.8, cdP2: 7.0, warn: 0.72, warnP2: 0.56, dmg: 12, color: 0xc898d8, width: 28, length: 560, count: 2, p2: { delay: 0.35, rotate: -0.65 } },
      { id: 'dust_curve', role: 'support', firstCd: 6.2, cd: 10.8, warn: 0.72, dmg: 10, color: 0xe3a8d8, radius: 28, count: 7 },
    ],
    spread: { firstCd: 12, cd: 11, cdP2: 9.5, n: 5, arc: 0.72, speed: 230, dmg: 9, tex: 'lz_dust' },
    ring: { firstCd: 18, cd: 14, cdP2: 12, n: 10, nP2: 13, speed: 160, dmg: 9, tex: 'lz_dust' },
    summon: { firstCd: 24, cd: 22, id: 'flutter', n: 3, radius: 105, p2Only: true },
    dash: { firstCd: 15, cd: 13, cdP2: 11, speed: 420, minDist: 140 },
  },
  // 莓刺熊王：熊掌三拍 + 莓刺震裂
  bramble: {
    phase2HpK: 0.5,
    moves: [
      { id: 'bear_paws', role: 'main', firstCd: 3.0, cd: 9.2, cdP2: 7.3, warn: 0.72, warnP2: 0.56, dmg: 14, color: 0xc06c78, radius: 52, count: 3, p2: { delay: 0.34, extra: 1 } },
      { id: 'bramble_rift', role: 'support', firstCd: 6.8, cd: 11.2, warn: 0.72, dmg: 11, color: 0xa65b74, width: 34, length: 300 },
    ],
    spread: { firstCd: 13, cd: 11, cdP2: 9.5, n: 4, arc: 0.62, speed: 220, dmg: 10, tex: 'bz_berry' },
    dash: { firstCd: 15, cd: 13, cdP2: 11, speed: 430, minDist: 130 },
    ring: { firstCd: 19, cd: 15, cdP2: 13, n: 10, nP2: 12, speed: 150, dmg: 10, tex: 'bz_berry', p2Only: true },
    summon: { firstCd: 26, cd: 23, id: 'berryling', n: 3, radius: 100, p2Only: true },
  },
  // 星角鹿王：星座牵线 + 流星点名
  nocturne: {
    phase2HpK: 0.5,
    moves: [
      { id: 'constellation_lines', role: 'main', firstCd: 3.4, cd: 9.8, cdP2: 7.8, warn: 0.74, warnP2: 0.58, dmg: 13, color: 0x8fa8e8, width: 28, radius: 155, count: 5, p2: { rotate: 0.45, delay: 0.36 } },
      { id: 'meteor_mark', role: 'support', firstCd: 7.0, cd: 11.6, warn: 0.74, dmg: 12, color: 0xb9c8ff, radius: 48, width: 24, length: 190 },
    ],
    ring: { firstCd: 13, cd: 12, cdP2: 10, n: 10, nP2: 13, speed: 165, dmg: 10, tex: 'nz_star' },
    dash: { firstCd: 16, cd: 13, cdP2: 11, speed: 480, minDist: 140 },
    spread: { firstCd: 19, cd: 14, cdP2: 12, n: 5, arc: 0.68, speed: 235, dmg: 10, tex: 'nz_star', p2Only: true },
    summon: { firstCd: 27, cd: 24, id: 'moonmote', n: 4, radius: 105, p2Only: true },
  },
  // 永夜枭：夜眼凝视 + 暗羽帘
  summit: {
    phase2HpK: 0.5,
    moves: [
      { id: 'owl_gaze', role: 'main', firstCd: 3.0, cd: 8.6, cdP2: 6.8, warn: 0.72, warnP2: 0.56, dmg: 14, color: 0x6d6fa8, radius: 360, width: 0.95, p2: { delay: 0.35, extra: 1 } },
      { id: 'feather_curtain', role: 'support', firstCd: 6.4, cd: 10.6, warn: 0.72, dmg: 11, color: 0x9b8fc8, width: 28, length: 520, count: 7 },
    ],
    ring: { firstCd: 13, cd: 12, cdP2: 10, n: 10, nP2: 13, speed: 155, dmg: 10, tex: 'sz_petal' },
    spread: { firstCd: 16, cd: 11.5, cdP2: 9.8, n: 5, arc: 0.72, speed: 230, dmg: 10, tex: 'sz_petal' },
    summon: { firstCd: 24, cd: 21, id: 'shade', n: 4, radius: 100 },
    dash: { firstCd: 18, cd: 14, cdP2: 12, speed: 450, minDist: 140 },
  },
  // 苹果酒龙：果核滚道 + 酒沫喷泉
  orchard: {
    phase2HpK: 0.5,
    moves: [
      { id: 'fruit_roll', role: 'main', firstCd: 3.2, cd: 9.0, cdP2: 7.2, warn: 0.72, warnP2: 0.56, dmg: 14, color: 0xd89a45, width: 44, length: 620, p2: { rotate: 0.45, extra: 1, delay: 0.35 } },
      { id: 'cider_sprout', role: 'support', firstCd: 7.0, cd: 11.4, warn: 0.72, dmg: 11, color: 0xf0b868, radius: 34, count: 5 },
    ],
    spread: { firstCd: 13, cd: 11.5, cdP2: 9.8, n: 5, arc: 0.68, speed: 230, dmg: 10, tex: 'oz_seed' },
    ring: { firstCd: 18, cd: 14, cdP2: 12, n: 10, nP2: 13, speed: 160, dmg: 10, tex: 'oz_seed' },
    summon: { firstCd: 26, cd: 24, id: 'pip', n: 4, radius: 105, p2Only: true },
    dash: { firstCd: 16, cd: 13, cdP2: 11, speed: 420, minDist: 135 },
  },
  // 霜兔长母：雪跃足迹 + 冰铃寒息
  snowbell: {
    phase2HpK: 0.5,
    moves: [
      { id: 'snow_footsteps', role: 'main', firstCd: 3.4, cd: 9.4, cdP2: 7.5, warn: 0.74, warnP2: 0.58, dmg: 13, color: 0x9cc8ec, radius: 38, width: 24, count: 5, p2: { extra: 1, delay: 0.28 } },
      { id: 'frost_breath', role: 'support', firstCd: 7.2, cd: 11.8, warn: 0.74, dmg: 11, color: 0xaee0f0, radius: 330, width: 1.15 },
    ],
    ring: { firstCd: 13, cd: 12.5, cdP2: 10.5, n: 10, nP2: 13, speed: 125, dmg: 10, tex: 'wz_shard' },
    spread: { firstCd: 16, cd: 12, cdP2: 10, n: 4, arc: 0.58, speed: 220, dmg: 11, tex: 'wz_shard' },
    summon: { firstCd: 25, cd: 23, id: 'snowdrop', n: 4, radius: 100, p2Only: true },
    dash: { firstCd: 18, cd: 14, cdP2: 12, speed: 450, minDist: 130 },
  },
  // 蜃镜鲸：镜潮折返 + 碎镜错位
  mirage: {
    phase2HpK: 0.5,
    moves: [
      { id: 'mirror_tide', role: 'main', firstCd: 3.2, cd: 9.2, cdP2: 7.4, warn: 0.74, warnP2: 0.58, dmg: 13, color: 0xa8cfe8, width: 30, length: 430, p2: { extra: 1, delay: 0.34 } },
      { id: 'mirror_shards', role: 'support', firstCd: 7.0, cd: 11.2, warn: 0.72, dmg: 11, color: 0xc0b8e8, width: 28, length: 520, count: 5 },
    ],
    ring: { firstCd: 13, cd: 12, cdP2: 10, n: 11, nP2: 14, speed: 145, dmg: 10, tex: 'mg_glass' },
    spread: { firstCd: 16, cd: 12, cdP2: 10.2, n: 5, arc: 0.82, speed: 240, dmg: 10, tex: 'mg_glass' },
    summon: { firstCd: 24, cd: 22, id: 'prismite', n: 4, radius: 110 },
  },
  // 晨钟鸡王：报晓节拍 + 摆钟扫线
  clockwork: {
    phase2HpK: 0.5,
    moves: [
      { id: 'dawn_beat', role: 'main', firstCd: 3.0, cd: 8.8, cdP2: 7.0, warn: 0.74, warnP2: 0.58, dmg: 13, color: 0xd9aa4c, radius: 72, count: 3, p2: { extra: 1, delay: 0.3 } },
      { id: 'pendulum_sweep', role: 'support', firstCd: 6.8, cd: 10.6, warn: 0.72, dmg: 12, color: 0xb88034, width: 44, length: 650, p2: { rotate: 0.28 } },
    ],
    spread: { firstCd: 13, cd: 11, cdP2: 9.5, n: 5, arc: 0.78, speed: 250, dmg: 10, tex: 'ck_note' },
    ring: { firstCd: 18, cd: 14, cdP2: 12, n: 10, nP2: 13, speed: 170, dmg: 10, tex: 'ck_note' },
    summon: { firstCd: 24, cd: 22, id: 'gearling', n: 4, radius: 105 },
    dash: { firstCd: 16, cd: 13, cdP2: 11, speed: 470, minDist: 135 },
  },
};
