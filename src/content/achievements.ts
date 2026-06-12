// 成就表（纯数据层，禁止依赖 Phaser）
// check 在统一视图上判定：run 为当前单局快照（局外评估时缺省），stats 为局外累计
// unlockChar / unlockMap：达成时解锁对应角色/地图（游玩成就式解锁；地图解锁链 = 通关上一图）
import type { AchievementId, CharacterId, MapId } from './ids';

export interface AchRunView {
  kills: number;
  time: number; // 秒
  level: number;
  weapons: number; // 持有武器数
  passives: number; // 持有被动数
  evolves: number; // 已进化武器数
  maxWeapon: boolean; // 任一武器满级
  maxPassive: boolean; // 任一被动满级
  eliteKills: number;
  win: boolean;
  mapId: string; // 本局地图（通关类成就按图判定）
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
  unlockChar?: CharacterId; // 达成时解锁角色
  unlockMap?: MapId; // 达成时解锁地图
  check(v: AchView): boolean;
}

export const ACHIEVEMENTS: AchievementSpec[] = [
  { id: 'swarm100',    icon: 'e_blob',      unlockChar: 'dew',    check: (v) => (v.run?.kills ?? 0) >= 100 },
  { id: 'survive5',    icon: 'd_flower1',   unlockChar: 'rosa',   check: (v) => (v.run?.time ?? 0) >= 300 },
  { id: 'level20',     icon: 'gem',         unlockChar: 'lumen',  check: (v) => (v.run?.level ?? 0) >= 20 },
  { id: 'eliteSlayer', icon: 'e_elite',     unlockChar: 'gale',   check: (v) => (v.run?.eliteKills ?? 0) >= 1 },
  { id: 'firstEvolve', icon: 'icon_blade',  unlockChar: 'volt',   check: (v) => (v.run?.evolves ?? 0) >= 1 },
  { id: 'maxWeapon',   icon: 'icon_spark',  check: (v) => v.run?.maxWeapon === true },
  { id: 'fullArsenal', icon: 'icon_mine',   check: (v) => (v.run?.weapons ?? 0) >= 6 },
  { id: 'fullCharms',  icon: 'icon_bloom',  check: (v) => (v.run?.passives ?? 0) >= 6 },
  { id: 'meadowClear', icon: 'e_boss',       unlockChar: 'pebble', unlockMap: 'pond',
    check: (v) => v.run?.win === true && v.run.mapId === 'meadow' },
  { id: 'kills1000',   icon: 'e_splitter',  check: (v) => v.stats.kills >= 1000 },
  { id: 'coins500',    icon: 'coin',        unlockChar: 'fluff',  check: (v) => v.stats.coinsEarned >= 500 },
  { id: 'firstBuy',    icon: 'icon_greed',  check: (v) => v.stats.purchases >= 1 },
  { id: 'pondClear',   icon: 'e_bubbleking', unlockMap: 'hills',
    check: (v) => v.run?.win === true && v.run.mapId === 'pond' },
  { id: 'hillsClear',  icon: 'e_galecrow',  unlockMap: 'grove',
    check: (v) => v.run?.win === true && v.run.mapId === 'hills' },
  // ---------- M6 ----------
  { id: 'groveClear',    icon: 'e_sporeking', unlockMap: 'lavender',
    check: (v) => v.run?.win === true && v.run.mapId === 'grove' },
  { id: 'lavenderClear', icon: 'e_flutterqueen', unlockMap: 'bramble',
    check: (v) => v.run?.win === true && v.run.mapId === 'lavender' },
  { id: 'survive15',   icon: 'icon_lantern', unlockChar: 'ember',
    check: (v) => (v.run?.time ?? 0) >= 900 },
  { id: 'level30',     icon: 'gem',          unlockChar: 'luna',
    check: (v) => (v.run?.level ?? 0) >= 30 },
  { id: 'kills300',    icon: 'e_midge',      unlockChar: 'conker',
    check: (v) => (v.run?.kills ?? 0) >= 300 },
  { id: 'evolve3',     icon: 'icon_chime',   unlockChar: 'jingle',
    check: (v) => (v.run?.evolves ?? 0) >= 3 },
  { id: 'eliteHunter', icon: 'e_bigbubble',  check: (v) => (v.run?.eliteKills ?? 0) >= 5 },
  { id: 'kills5000',   icon: 'e_dasher',     check: (v) => v.stats.kills >= 5000 },
  { id: 'coins2000',   icon: 'coin',         unlockChar: 'berry', // M7：莓莓挂既有成就（Boot 回填旧档）
    check: (v) => v.stats.coinsEarned >= 2000 },
  { id: 'wins5',       icon: 'chest',        unlockChar: 'wisp', // M7：悠悠挂既有成就
    check: (v) => v.stats.wins >= 5 },
  { id: 'runs20',      icon: 'd_flower0',    check: (v) => v.stats.runs >= 20 },
  { id: 'buy10',       icon: 'icon_luck',    check: (v) => v.stats.purchases >= 10 },
  { id: 'fullHouse',   icon: 'icon_gold',
    check: (v) => (v.run?.weapons ?? 0) >= 6 && (v.run?.passives ?? 0) >= 6 },
  { id: 'maxPassive',  icon: 'icon_honey',   check: (v) => v.run?.maxPassive === true },
  // ---------- M7 ----------
  { id: 'brambleClear',  icon: 'e_bramblebear', unlockMap: 'nocturne',
    check: (v) => v.run?.win === true && v.run.mapId === 'bramble' },
  { id: 'nocturneClear', icon: 'e_starelk',     unlockMap: 'summit',
    check: (v) => v.run?.win === true && v.run.mapId === 'nocturne' },
  { id: 'summitClear',   icon: 'e_nightowl',
    check: (v) => v.run?.win === true && v.run.mapId === 'summit' },
  { id: 'survive20',   icon: 'icon_vine',    unlockChar: 'ivy',
    check: (v) => (v.run?.time ?? 0) >= 1200 },
  { id: 'kills500',    icon: 'e_leafy',      unlockChar: 'toot',
    check: (v) => (v.run?.kills ?? 0) >= 500 },
  { id: 'level40',     icon: 'gem',          check: (v) => (v.run?.level ?? 0) >= 40 },
  { id: 'evolve6',     icon: 'icon_wisp',    check: (v) => (v.run?.evolves ?? 0) >= 6 },
  { id: 'coins5000',   icon: 'coin',         check: (v) => v.stats.coinsEarned >= 5000 },
  { id: 'kills10000',  icon: 'e_crow',       check: (v) => v.stats.kills >= 10000 },
  { id: 'wins10',      icon: 'chest',        check: (v) => v.stats.wins >= 10 },
  { id: 'runs50',      icon: 'd_flower2',    check: (v) => v.stats.runs >= 50 },
  { id: 'buy25',       icon: 'icon_pouch',   check: (v) => v.stats.purchases >= 25 },
];
