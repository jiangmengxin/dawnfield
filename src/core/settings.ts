// 临时设置存储（M3 并入版本化存档后由 MetaState 接管）
const LS_KEY = 'dawnfield.settings';

export interface TempSettings {
  volume: number; // 0..1
  dmgNumbers: boolean;
  shake: boolean;
}

const DEFAULTS: TempSettings = { volume: 1, dmgNumbers: true, shake: true };

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
