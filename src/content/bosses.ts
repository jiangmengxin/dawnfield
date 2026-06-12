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
};
