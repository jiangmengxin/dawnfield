// Boss 技能配装表（纯数据层，禁止依赖 Phaser）
// BossController 按 BossSpec 数据驱动：四种技能模块（弹幕环/瞄准扇射/召唤/冲撞）自由配装，
// 每图 Boss = 体格（ENEMIES 表）+ 技能配装（本表）+ 专属纹理；M6/M7 新 Boss 只加数据
import type { EnemyId, MapId } from './ids';

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
  ring?: BossRing;
  spread?: BossSpread;
  summon?: BossSummon;
  dash?: BossDash;
}

export const BOSSES: Record<MapId, BossSpec> = {
  // 墨之王：均衡型 — 弹幕环 + 二阶段召唤 + 偶发冲撞（M2 原数值不变）
  meadow: {
    phase2HpK: 0.5,
    ring: { firstCd: 2.5, cd: 4.5, cdP2: 3.2, n: 11, nP2: 16, speed: 150, dmg: 10 },
    summon: { firstCd: 9, cd: 10, id: 'midge', n: 6, radius: 90, p2Only: true },
    dash: { firstCd: 6, cd: 7.5, cdP2: 5.5, speed: 420, minDist: 150 },
  },
  // 泡泡大王：弹幕区域型 — 密集慢速泡泡墙 + 瞄准水柱 + 全程召唤，不冲撞（走位解谜）
  pond: {
    phase2HpK: 0.5,
    ring: { firstCd: 2.8, cd: 5.5, cdP2: 3.8, n: 14, nP2: 20, speed: 105, dmg: 11, tex: 'pz_bub' },
    spread: { firstCd: 5, cd: 6.5, cdP2: 4.5, n: 5, arc: 0.55, speed: 235, dmg: 12, tex: 'pz_bub' },
    summon: { firstCd: 12, cd: 13, id: 'tad', n: 5, radius: 100 },
  },
  // 风暴鸦：突进压迫型 — 高频羽毛扇射 + 凶猛冲刺 + 二阶段羽暴环/召唤鸦群
  hills: {
    phase2HpK: 0.5,
    spread: { firstCd: 2.2, cd: 3.4, cdP2: 2.4, n: 7, arc: 0.9, speed: 260, dmg: 10, tex: 'hz_feather' },
    ring: { firstCd: 6, cd: 6, cdP2: 5, n: 12, nP2: 14, speed: 200, dmg: 10, tex: 'hz_feather', p2Only: true },
    summon: { firstCd: 14, cd: 15, id: 'crow', n: 4, radius: 110, p2Only: true },
    dash: { firstCd: 4, cd: 5.5, cdP2: 4, speed: 520, minDist: 120 },
  },
  // 蘑菇长老：区域召唤型 — 慢速孢子环铺场 + 全程召唤菇群 + 二阶段瞄准孢子柱，不冲撞
  grove: {
    phase2HpK: 0.5,
    ring: { firstCd: 3, cd: 5.2, cdP2: 3.6, n: 12, nP2: 18, speed: 120, dmg: 11, tex: 'gz_spore' },
    spread: { firstCd: 6, cd: 7, cdP2: 5, n: 4, arc: 0.5, speed: 200, dmg: 12, tex: 'gz_spore', p2Only: true },
    summon: { firstCd: 8, cd: 9, id: 'shroom', n: 6, radius: 95 },
  },
  // 紫蝶女王：优雅游击型 — 鳞粉扇射 + 翩跹冲掠 + 二阶段鳞粉环/召唤蝶群
  lavender: {
    phase2HpK: 0.5,
    spread: { firstCd: 2.5, cd: 3.8, cdP2: 2.6, n: 6, arc: 0.8, speed: 240, dmg: 10, tex: 'lz_dust' },
    ring: { firstCd: 7, cd: 7.5, cdP2: 5.5, n: 14, nP2: 18, speed: 170, dmg: 10, tex: 'lz_dust' },
    summon: { firstCd: 13, cd: 14, id: 'flutter', n: 4, radius: 105, p2Only: true },
    dash: { firstCd: 5, cd: 6.5, cdP2: 4.5, speed: 460, minDist: 140 },
  },
  // 莓刺熊王：贴身蛮力型 — 凶猛扑撞 + 喷吐莓果扇射 + 二阶段莓果环/召唤莓果果
  bramble: {
    phase2HpK: 0.5,
    spread: { firstCd: 2.4, cd: 3.6, cdP2: 2.5, n: 5, arc: 0.7, speed: 230, dmg: 11, tex: 'bz_berry' },
    dash: { firstCd: 4, cd: 6, cdP2: 4.5, speed: 480, minDist: 130 },
    ring: { firstCd: 8, cd: 7, cdP2: 5.5, n: 14, nP2: 16, speed: 160, dmg: 11, tex: 'bz_berry', p2Only: true },
    summon: { firstCd: 12, cd: 13, id: 'berryling', n: 5, radius: 100, p2Only: true },
  },
  // 星角鹿王：星辉游走型 — 星屑弹幕环 + 轻盈疾掠 + 二阶段瞄准星屑/召唤月尘
  nocturne: {
    phase2HpK: 0.5,
    ring: { firstCd: 2.8, cd: 5, cdP2: 3.4, n: 12, nP2: 18, speed: 175, dmg: 11, tex: 'nz_star' },
    dash: { firstCd: 5, cd: 6, cdP2: 4.2, speed: 540, minDist: 140 },
    spread: { firstCd: 6, cd: 5.5, cdP2: 3.8, n: 6, arc: 0.75, speed: 250, dmg: 11, tex: 'nz_star', p2Only: true },
    summon: { firstCd: 14, cd: 15, id: 'moonmote', n: 6, radius: 105, p2Only: true },
  },
  // 永夜枭：终局全能型 — 夜瓣弹幕环 + 瞄准扇射 + 全程召唤影群 + 俯冲扑掠
  summit: {
    phase2HpK: 0.5,
    ring: { firstCd: 2.5, cd: 4.8, cdP2: 3.2, n: 13, nP2: 19, speed: 165, dmg: 11, tex: 'sz_petal' },
    spread: { firstCd: 4.5, cd: 4.2, cdP2: 3.0, n: 6, arc: 0.8, speed: 245, dmg: 11, tex: 'sz_petal' },
    summon: { firstCd: 9, cd: 10, id: 'shade', n: 5, radius: 100 },
    dash: { firstCd: 6, cd: 6.5, cdP2: 4.8, speed: 500, minDist: 140 },
  },
};
