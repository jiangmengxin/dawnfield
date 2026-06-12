// 版本化存档 schema：SaveV1 + 默认值 + 宽容校验（纯数据层，禁止依赖 Phaser）
// schema 改动必须递增版本号并在 migrations.ts 登记迁移
import type { PowerUpId } from '../../content/ids';

export const SAVE_VERSION = 1;

export type CodexCat = 'weapons' | 'passives' | 'enemies' | 'chars' | 'maps';

export interface SaveSettings {
  lang: 'zh' | 'en' | null; // null = 跟随系统语言
  muted: boolean;
  /** M8 分轨音量：BGM / SFX 各自 0..1（旧档单一 volume 在 sanitize 时作为两轨默认值吸收） */
  volBgm: number;
  volSfx: number;
  dmgNumbers: boolean;
  shake: boolean;
  speed: 1 | 2;
  // 调试
  debugInfo: boolean;
  invincible: boolean;
  fullPickup: boolean;
  autoPick: boolean;
  /** 解锁全部内容（角色/地图视为全解锁，不写入 unlocked 列表，关闭即恢复）
   *  纯增量带默认值字段：sanitize 双向兼容（旧档缺省 false / 旧构建读新档丢弃），无需迁移 */
  unlockAll: boolean;
}

export interface SaveStats {
  runs: number;
  wins: number;
  kills: number;
  coinsEarned: number; // 累计获得（不含重置返还）
  bestSurvival: number; // 最长单局存活秒数
  playSeconds: number;
  purchases: number; // 商店累计购买次数
}

export interface SaveV1 {
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
}

function emptyCats(): Record<CodexCat, string[]> {
  return { weapons: [], passives: [], enemies: [], chars: [], maps: [] };
}

export function defaultSave(): SaveV1 {
  return {
    v: SAVE_VERSION,
    coins: 0,
    powerUps: {},
    unlocked: { chars: ['spark'], maps: ['meadow'] },
    codex: { lit: emptyCats(), seen: emptyCats() },
    achievements: [],
    stats: { runs: 0, wins: 0, kills: 0, coinsEarned: 0, bestSurvival: 0, playSeconds: 0, purchases: 0 },
    settings: {
      lang: null, muted: false, volBgm: 1, volSfx: 1, dmgNumbers: true, shake: true, speed: 1,
      debugInfo: false, invincible: false, fullPickup: false, autoPick: false, unlockAll: false,
    },
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

/** 解析后的对象 → SaveV1；结构性损坏返回 null（调用方备份原文并重建） */
export function sanitize(raw: unknown): SaveV1 | null {
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
    out.stats = {
      runs: num(s.runs, 0), wins: num(s.wins, 0), kills: num(s.kills, 0),
      coinsEarned: num(s.coinsEarned, 0), bestSurvival: num(s.bestSurvival, 0),
      playSeconds: num(s.playSeconds, 0), purchases: num(s.purchases, 0),
    };
  }

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
      speed: s.speed === 2 ? 2 : 1,
      debugInfo: bool(s.debugInfo, false),
      invincible: bool(s.invincible, false),
      fullPickup: bool(s.fullPickup, false),
      autoPick: bool(s.autoPick, false),
      unlockAll: bool(s.unlockAll, false),
    };
  }

  return out;
}
