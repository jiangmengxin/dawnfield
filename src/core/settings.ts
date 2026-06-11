// 临时设置存储（M3 并入版本化存档后由 MetaState 接管）
const LS_KEY = 'dawnfield.settings';

export interface TempSettings {
  volume: number; // 0..1
  dmgNumbers: boolean;
  shake: boolean;
  speed: 1 | 2; // 局内倍速
  // 调试
  debugInfo: boolean; // FPS/实体数等运行信息
  invincible: boolean;
  fullPickup: boolean; // 全屏拾取范围
  autoPick: boolean; // 升级时自动选第一张卡
}

const DEFAULTS: TempSettings = {
  volume: 1, dmgNumbers: true, shake: true, speed: 1,
  debugInfo: false, invincible: false, fullPickup: false, autoPick: false,
};

let cache: TempSettings | null = null;

export function getSettings(): TempSettings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<TempSettings>;
      cache = {
        volume: typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : DEFAULTS.volume,
        dmgNumbers: typeof p.dmgNumbers === 'boolean' ? p.dmgNumbers : DEFAULTS.dmgNumbers,
        shake: typeof p.shake === 'boolean' ? p.shake : DEFAULTS.shake,
        speed: p.speed === 2 ? 2 : 1,
        debugInfo: p.debugInfo === true,
        invincible: p.invincible === true,
        fullPickup: p.fullPickup === true,
        autoPick: p.autoPick === true,
      };
      return cache;
    }
  } catch { /* ignore */ }
  cache = { ...DEFAULTS };
  return cache;
}

export function updateSettings(patch: Partial<TempSettings>): TempSettings {
  cache = { ...getSettings(), ...patch };
  try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  return cache;
}
