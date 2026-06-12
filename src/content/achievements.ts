// 成就表（纯数据层，禁止依赖 Phaser）
// check 在统一视图上判定：run 为当前单局快照（局外评估时缺省），stats 为局外累计
// unlockChar / unlockMap：达成时解锁对应角色/地图（游玩成就式解锁；地图解锁链 = 通关上一图）
import type { AchievementId, ArcanaId, CharacterId, MapId } from './ids';
import { MAPS } from './maps';

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
  difficulty: number; // 狂暴档位 0–2（M11）
  endlessCycle: number; // 无尽当前轮次（M11；普通局恒 0）
  // M13 结构性挑战埋点
  bossNoHit: boolean; // Boss 战期间未受伤（flawlessBoss，胜利时判定）
  firstHurtAt: number; // 首次受伤时刻（秒；未受伤 = Infinity）
  firstEvolveAt: number; // 首次进化时刻（秒；未进化 = Infinity）
  arcana: number; // 持有规则卡数
}

export interface AchStatsView {
  kills: number;
  coinsEarned: number;
  wins: number;
  runs: number;
  purchases: number;
  /** 已通关角色数（M13 fiveCharWins；来自 winsByChar，局外简评估可缺省） */
  charWins?: number;
}

export interface AchView {
  run?: AchRunView;
  stats: AchStatsView;
  /** 各图已通关最高狂暴档位（M11；hyperAll 用，局外评估时缺省） */
  hyper?: Partial<Record<string, number>>;
}

export interface AchievementSpec {
  id: AchievementId;
  icon: string; // 纹理 key
  unlockChar?: CharacterId; // 达成时解锁角色
  unlockMap?: MapId; // 达成时解锁地图
  unlockArcana?: ArcanaId; // 达成时解锁机制规则卡（M13；查询式凭据，零存档字段）
  rewardCoins?: number; // 达成时奖励金币（不计入 coinsEarned 成就链，M11 起）
  check(v: AchView): boolean;
}

export const ACHIEVEMENTS: AchievementSpec[] = [
  { id: 'swarm100',    icon: 'e_blob',      unlockChar: 'dew',    check: (v) => (v.run?.kills ?? 0) >= 100 },
  { id: 'survive5',    icon: 'd_flower1',   unlockChar: 'rosa',   check: (v) => (v.run?.time ?? 0) >= 300 },
  { id: 'level20',     icon: 'gem',         unlockChar: 'lumen',  check: (v) => (v.run?.level ?? 0) >= 20 },
  { id: 'eliteSlayer', icon: 'e_elite',     unlockChar: 'gale',   check: (v) => (v.run?.eliteKills ?? 0) >= 1 },
  { id: 'firstEvolve', icon: 'icon_blade',  unlockChar: 'volt',   check: (v) => (v.run?.evolves ?? 0) >= 1 },
  { id: 'maxWeapon',   icon: 'icon_spark',  unlockArcana: 'splinter',
    check: (v) => v.run?.maxWeapon === true },
  { id: 'fullArsenal', icon: 'icon_mine',   unlockArcana: 'allin',
    check: (v) => (v.run?.weapons ?? 0) >= 6 },
  { id: 'fullCharms',  icon: 'icon_bloom',  rewardCoins: 150,
    check: (v) => (v.run?.passives ?? 0) >= 6 },
  { id: 'meadowClear', icon: 'e_boss',       unlockChar: 'pebble', unlockMap: 'pond',
    check: (v) => v.run?.win === true && v.run.mapId === 'meadow' },
  { id: 'kills1000',   icon: 'e_splitter',  rewardCoins: 150, check: (v) => v.stats.kills >= 1000 },
  { id: 'coins500',    icon: 'coin',        unlockChar: 'fluff',  check: (v) => v.stats.coinsEarned >= 500 },
  { id: 'firstBuy',    icon: 'icon_greed',  rewardCoins: 100, check: (v) => v.stats.purchases >= 1 },
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
  { id: 'eliteHunter', icon: 'e_bigbubble',  unlockArcana: 'thorncore',
    check: (v) => (v.run?.eliteKills ?? 0) >= 5 },
  // M13 成本校平：wisp 解锁阈值 5→3（id 不变只改 check 与文案——已解锁者无影响，未解锁者纯受益）
  { id: 'coins2000',   icon: 'coin',         unlockChar: 'berry', // M7：莓莓挂既有成就（Boot 回填旧档）
    check: (v) => v.stats.coinsEarned >= 2000 },
  { id: 'wins5',       icon: 'chest',        unlockChar: 'wisp', // M7：悠悠挂既有成就
    check: (v) => v.stats.wins >= 3 },
  { id: 'fullHouse',   icon: 'icon_gold',    rewardCoins: 200,
    check: (v) => (v.run?.weapons ?? 0) >= 6 && (v.run?.passives ?? 0) >= 6 },
  { id: 'maxPassive',  icon: 'icon_honey',   unlockArcana: 'slowburn',
    check: (v) => v.run?.maxPassive === true },
  // ---------- M7 ----------
  { id: 'brambleClear',  icon: 'e_bramblebear', unlockMap: 'nocturne',
    check: (v) => v.run?.win === true && v.run.mapId === 'bramble' },
  { id: 'nocturneClear', icon: 'e_starelk',     unlockMap: 'summit',
    check: (v) => v.run?.win === true && v.run.mapId === 'nocturne' },
  { id: 'summitClear',   icon: 'e_nightowl', rewardCoins: 300,
    check: (v) => v.run?.win === true && v.run.mapId === 'summit' },
  { id: 'survive20',   icon: 'icon_vine',    unlockChar: 'ivy',
    check: (v) => (v.run?.time ?? 0) >= 1200 },
  { id: 'kills500',    icon: 'e_leafy',      unlockChar: 'toot',
    check: (v) => (v.run?.kills ?? 0) >= 500 },
  { id: 'level40',     icon: 'gem',          unlockArcana: 'vow',
    check: (v) => (v.run?.level ?? 0) >= 40 },
  { id: 'evolve6',     icon: 'icon_wisp',    rewardCoins: 200,
    check: (v) => (v.run?.evolves ?? 0) >= 6 },
  { id: 'wins10',      icon: 'chest',        unlockArcana: 'dawnfield', // 招牌点题卡压轴
    check: (v) => v.stats.wins >= 10 },
  // ---------- M11（无尽与狂暴；win 类天然安全——无尽永不产生 win:true） ----------
  { id: 'hyperClear1', icon: 'e_shadelord',
    check: (v) => v.run?.win === true && v.run.difficulty >= 1 },
  { id: 'hyperAll',    icon: 'sd_ray',
    check: (v) => MAPS.every((m) => (v.hyper?.[m.id] ?? 0) >= 1) },
  { id: 'endless3',    icon: 'nd_star',
    check: (v) => (v.run?.endlessCycle ?? 0) >= 3 },
  { id: 'endless6',    icon: 'nd_crystal',   rewardCoins: 300,
    check: (v) => (v.run?.endlessCycle ?? 0) >= 6 },
  // ---------- M13 结构性挑战（顶替 7 个纯计数，原 id 移入 LEGACY_ACHIEVEMENTS） ----------
  { id: 'flawlessBoss',    icon: 'e_boss',
    check: (v) => v.run?.win === true && v.run.bossNoHit },
  { id: 'fiveCharWins',    icon: 'icon_star',
    check: (v) => (v.stats.charWins ?? 0) >= 5 },
  { id: 'noPassiveClear',  icon: 'icon_feather',
    check: (v) => v.run?.win === true && v.run.passives === 0 },
  { id: 'untouchable10',   icon: 'icon_acorn',
    check: (v) => (v.run?.time ?? 0) >= 600 && (v.run?.firstHurtAt ?? 0) >= 600 },
  { id: 'evolveRush',      icon: 'icon_skip',
    check: (v) => (v.run?.firstEvolveAt ?? Infinity) <= 480 },
  { id: 'soloWeaponClear', icon: 'icon_mallet',
    check: (v) => v.run?.win === true && v.run.weapons === 1 },
  { id: 'arcanaTrio',      icon: 'icon_arc_petaltide',
    check: (v) => (v.run?.arcana ?? 0) >= 3 },
];

/** 旧纯计数成就（M13 替换下场）：仅当存档已解锁才渲染（成就页 legacy 区），
 *  新玩家不可见不可达成；已解锁者永不回收（兼容铁律） */
export const LEGACY_ACHIEVEMENTS: AchievementSpec[] = [
  { id: 'kills5000',  icon: 'e_dasher',   check: () => false },
  { id: 'kills10000', icon: 'e_crow',     check: () => false },
  { id: 'coins5000',  icon: 'coin',       check: () => false },
  { id: 'runs20',     icon: 'd_flower0',  check: () => false },
  { id: 'runs50',     icon: 'd_flower2',  check: () => false },
  { id: 'buy10',      icon: 'icon_luck',  check: () => false },
  { id: 'buy25',      icon: 'icon_pouch', check: () => false },
];
