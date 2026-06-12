// 成就表（纯数据层，禁止依赖 Phaser）
// check 在统一视图上判定：run 为当前单局快照（局外评估时缺省），stats 为局外累计
import type { AchievementId } from './ids';

export interface AchRunView {
  kills: number;
  time: number; // 秒
  level: number;
  weapons: number; // 持有武器数
  passives: number; // 持有被动数
  evolves: number; // 已进化武器数
  maxWeapon: boolean; // 任一武器满级
  eliteKills: number;
  win: boolean;
}

export interface AchStatsView {
  kills: number;
  coinsEarned: number;
  wins: number;
  runs: number;
  purchases: number;
}

export interface AchView {
  run?: AchRunView;
  stats: AchStatsView;
}

export interface AchievementSpec {
  id: AchievementId;
  icon: string; // 纹理 key
  check(v: AchView): boolean;
}

export const ACHIEVEMENTS: AchievementSpec[] = [
  { id: 'swarm100',    icon: 'e_blob',      check: (v) => (v.run?.kills ?? 0) >= 100 },
  { id: 'survive5',    icon: 'd_flower1',   check: (v) => (v.run?.time ?? 0) >= 300 },
  { id: 'level20',     icon: 'gem',         check: (v) => (v.run?.level ?? 0) >= 20 },
  { id: 'eliteSlayer', icon: 'e_elite',     check: (v) => (v.run?.eliteKills ?? 0) >= 1 },
  { id: 'firstEvolve', icon: 'icon_blade',  check: (v) => (v.run?.evolves ?? 0) >= 1 },
  { id: 'maxWeapon',   icon: 'icon_spark',  check: (v) => v.run?.maxWeapon === true },
  { id: 'fullArsenal', icon: 'icon_mine',   check: (v) => (v.run?.weapons ?? 0) >= 6 },
  { id: 'fullCharms',  icon: 'icon_bloom',  check: (v) => (v.run?.passives ?? 0) >= 6 },
  { id: 'meadowClear', icon: 'e_boss',      check: (v) => v.run?.win === true },
  { id: 'kills1000',   icon: 'e_splitter',  check: (v) => v.stats.kills >= 1000 },
  { id: 'coins500',    icon: 'coin',        check: (v) => v.stats.coinsEarned >= 500 },
  { id: 'firstBuy',    icon: 'icon_greed',  check: (v) => v.stats.purchases >= 1 },
];
