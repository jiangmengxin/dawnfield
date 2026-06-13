// 版本化存档 schema：SaveV2 + 默认值 + 宽容校验（纯数据层，禁止依赖 Phaser）
// schema 改动必须递增版本号并在 migrations.ts 登记迁移
import type { MapId, PowerUpId } from '../../content/ids';
import { MAPS } from '../../content/maps';

export const SAVE_VERSION = 2;

export type CodexCat = 'weapons' | 'passives' | 'enemies' | 'chars' | 'maps' | 'arcana';

export interface SaveSettings {
  lang: 'zh' | 'en' | null; // null = 跟随系统语言
  muted: boolean;
  /** M8 分轨音量：BGM / SFX 各自 0..1（旧档单一 volume 在 sanitize 时作为两轨默认值吸收） */
  volBgm: number;
  volSfx: number;
  dmgNumbers: boolean;
  /** 旧版屏震开关（保留作主开关语义）；UI 已由三档 shakeLevel 取代 */
  shake: boolean;
  /** 屏震强度档（FX1）：0 关 / 1 弱 / 2 标准。纯增量带默认值字段，sanitize 双向兼容，无需迁移 */
  shakeLevel: 0 | 1 | 2;
  speed: 1 | 2;
  // 调试
  debugInfo: boolean;
  invincible: boolean;
  fullPickup: boolean;
  autoPick: boolean;
  /** 解锁全部内容（角色/地图视为全解锁，不写入 unlocked 列表，关闭即恢复）
   *  纯增量带默认值字段：sanitize 双向兼容（旧档缺省 false / 旧构建读新档丢弃），无需迁移 */
  unlockAll: boolean;
  /** 规则卡 Arcana（M9）：开局全卡池任选 1 + 宝箱再得；关闭后局内行为与 M8 等价。
   *  纯增量带默认值字段（默认开），无需迁移 */
  arcana: boolean;
}

export interface SaveStats {
  runs: number;
  wins: number;
  kills: number;
  coinsEarned: number; // 累计获得（不含重置返还）
  bestSurvival: number; // 最长单局存活秒数
  playSeconds: number;
  purchases: number; // 商店累计购买次数
  /** 各角色通关次数（v2 搭车字段，M13 成就消费；M11 仅建立结构） */
  winsByChar: Record<string, number>;
  /** 累计词缀精英击杀（v2 搭车字段，M15 affixSlayer 消费；旧档缺省 0） */
  affixKills: number;
}

/** 每图无尽最佳记录（以 sec 判优） */
export interface EndlessRecord {
  sec: number;
  kills: number;
  cycle: number; // 坚守到第几轮（1-based；Boss 前阵亡为 0）
  diff: number; // 该记录的狂暴档位 0–2（注记用，不分轨）
}

export interface SaveV2 {
  v: typeof SAVE_VERSION;
  coins: number;
  powerUps: Partial<Record<PowerUpId, number>>;
  unlocked: { chars: string[]; maps: string[] };
  codex: {
    lit: Record<CodexCat, string[]>; // 首遇点亮
    seen: Record<CodexCat, string[]>; // 已浏览（点亮但未浏览 = New 角标）
  };
  achievements: string[];
  stats: SaveStats;
  settings: SaveSettings;
  /** 无尽模式每图最佳（M11） */
  endless: Partial<Record<MapId, EndlessRecord>>;
  /** 已通关的最高狂暴档位 0–2（M11；0 不落键） */
  hyper: Partial<Record<MapId, number>>;
  /** 引导提示节流（v2 搭车字段，M14 消费；全存档生命周期每条一次） */
  tipsSeen: string[];
}

function emptyCats(): Record<CodexCat, string[]> {
  return { weapons: [], passives: [], enemies: [], chars: [], maps: [], arcana: [] };
}

export function defaultSave(): SaveV2 {
  return {
    v: SAVE_VERSION,
    coins: 0,
    powerUps: {},
    unlocked: { chars: ['spark'], maps: ['meadow'] },
    codex: { lit: emptyCats(), seen: emptyCats() },
    achievements: [],
    stats: {
      runs: 0, wins: 0, kills: 0, coinsEarned: 0, bestSurvival: 0, playSeconds: 0, purchases: 0,
      winsByChar: {},
      affixKills: 0,
    },
    settings: {
      lang: null, muted: false, volBgm: 1, volSfx: 1, dmgNumbers: true, shake: true, shakeLevel: 2, speed: 1,
      debugInfo: false, invincible: false, fullPickup: false, autoPick: false, unlockAll: false,
      arcana: true,
    },
    endless: {},
    hyper: {},
    tipsSeen: [],
  };
}

// ---------- 宽容校验：逐字段守卫，未知字段丢弃，缺失字段取默认 ----------

function num(v: unknown, d: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
}

function bool(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function cats(v: unknown): Record<CodexCat, string[]> {
  const out = emptyCats();
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    (Object.keys(out) as CodexCat[]).forEach((k) => { out[k] = strArr(o[k]); });
  }
  return out;
}

/** MapId 白名单（endless/hyper 键守卫） */
const MAP_IDS = new Set<string>(MAPS.map((m) => m.id));

/** 解析后的对象 → SaveV2；结构性损坏返回 null（调用方备份原文并重建） */
export function sanitize(raw: unknown): SaveV2 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.v !== 'number') return null;

  const d = defaultSave();
  const out = d;
  out.coins = num(o.coins, 0);

  if (typeof o.powerUps === 'object' && o.powerUps !== null) {
    for (const [k, v] of Object.entries(o.powerUps as Record<string, unknown>)) {
      const lv = num(v, 0, 0, 99);
      if (lv > 0) out.powerUps[k as PowerUpId] = Math.round(lv);
    }
  }

  if (typeof o.unlocked === 'object' && o.unlocked !== null) {
    const u = o.unlocked as Record<string, unknown>;
    // 与默认值取并集：初始角色/地图永不因损坏丢失
    out.unlocked.chars = [...new Set([...d.unlocked.chars, ...strArr(u.chars)])];
    out.unlocked.maps = [...new Set([...d.unlocked.maps, ...strArr(u.maps)])];
  }

  if (typeof o.codex === 'object' && o.codex !== null) {
    const c = o.codex as Record<string, unknown>;
    out.codex.lit = cats(c.lit);
    out.codex.seen = cats(c.seen);
  }

  out.achievements = strArr(o.achievements);

  if (typeof o.stats === 'object' && o.stats !== null) {
    const s = o.stats as Record<string, unknown>;
    const winsByChar: Record<string, number> = {};
    if (typeof s.winsByChar === 'object' && s.winsByChar !== null) {
      for (const [k, v] of Object.entries(s.winsByChar as Record<string, unknown>)) {
        const n = Math.round(num(v, 0));
        if (n > 0) winsByChar[k] = n;
      }
    }
    out.stats = {
      runs: num(s.runs, 0), wins: num(s.wins, 0), kills: num(s.kills, 0),
      coinsEarned: num(s.coinsEarned, 0), bestSurvival: num(s.bestSurvival, 0),
      playSeconds: num(s.playSeconds, 0), purchases: num(s.purchases, 0),
      winsByChar,
      affixKills: num(s.affixKills, 0),
    };
  }

  // M11 无尽/狂暴：MapId 白名单 + 逐项 num 守卫，损坏条目丢弃不传染
  if (typeof o.endless === 'object' && o.endless !== null) {
    for (const [k, v] of Object.entries(o.endless as Record<string, unknown>)) {
      if (!MAP_IDS.has(k) || typeof v !== 'object' || v === null) continue;
      const r = v as Record<string, unknown>;
      const rec = {
        sec: Math.round(num(r.sec, 0)),
        kills: Math.round(num(r.kills, 0)),
        cycle: Math.round(num(r.cycle, 0)),
        diff: Math.round(num(r.diff, 0, 0, 2)),
      };
      if (rec.sec > 0) out.endless[k as MapId] = rec;
    }
  }
  if (typeof o.hyper === 'object' && o.hyper !== null) {
    for (const [k, v] of Object.entries(o.hyper as Record<string, unknown>)) {
      if (!MAP_IDS.has(k)) continue;
      const lv = Math.round(num(v, 0, 0, 2));
      if (lv > 0) out.hyper[k as MapId] = lv;
    }
  }
  out.tipsSeen = strArr(o.tipsSeen);

  if (typeof o.settings === 'object' && o.settings !== null) {
    const s = o.settings as Record<string, unknown>;
    out.settings = {
      lang: s.lang === 'zh' || s.lang === 'en' ? s.lang : null,
      muted: bool(s.muted, false),
      // 旧档单一 volume → 两轨默认值（用户原音量保留）；新档直接读分轨
      volBgm: num(s.volBgm, num(s.volume, 1, 0, 1), 0, 1),
      volSfx: num(s.volSfx, num(s.volume, 1, 0, 1), 0, 1),
      dmgNumbers: bool(s.dmgNumbers, true),
      shake: bool(s.shake, true),
      // 旧档无 shakeLevel：由旧开关推导（开→标准 2 / 关→0），保留用户原偏好
      shakeLevel: s.shakeLevel === 0 || s.shakeLevel === 1 || s.shakeLevel === 2
        ? s.shakeLevel
        : (bool(s.shake, true) ? 2 : 0),
      speed: s.speed === 2 ? 2 : 1,
      debugInfo: bool(s.debugInfo, false),
      invincible: bool(s.invincible, false),
      fullPickup: bool(s.fullPickup, false),
      autoPick: bool(s.autoPick, false),
      unlockAll: bool(s.unlockAll, false),
      arcana: bool(s.arcana, true),
    };
  }

  return out;
}
