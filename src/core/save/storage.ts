// 存档读写：单例缓存 + 300ms debounce 写入 + 损坏自愈（原文备份 .corrupt 键）
import { defaultSave, sanitize, SAVE_VERSION, SaveV2 } from './schema';
import { absorbLegacy, MIGRATIONS } from './migrations';

const KEY = 'dawnfield.save';
const CORRUPT_KEY = 'dawnfield.save.corrupt';
const DEBOUNCE_MS = 300;

let cache: SaveV2 | null = null;
let timer: number | null = null;

function load(): SaveV2 {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* ignore */ }

  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // 旧版本依迁移链逐级升级
      if (typeof parsed.v === 'number') {
        for (let v = parsed.v; v < SAVE_VERSION; v++) {
          const step = MIGRATIONS[v];
          if (!step) break;
          step(parsed);
        }
      }
      const s = sanitize(parsed);
      if (s) return s;
    } catch { /* fallthrough：损坏处理 */ }
    // 解析/校验失败：原文备份后重建（自愈且留证据）
    try { localStorage.setItem(CORRUPT_KEY, raw); } catch { /* ignore */ }
  }

  // 全新存档：吸收 v0 散键（dawnfield.lang/muted/volume/settings）
  const fresh = defaultSave();
  absorbLegacy(fresh);
  return fresh;
}

/** 当前存档（首次访问时加载）；改动后须调 persistSave()/flushSave() */
export function getSave(): SaveV2 {
  if (!cache) {
    cache = load();
    flushSave(); // 立即落盘：建立新键 / 覆盖损坏内容
  }
  return cache;
}

/** debounce 写入（300ms 合并连续改动） */
export function persistSave(): void {
  if (timer !== null) return;
  timer = window.setTimeout(() => {
    timer = null;
    flushSave();
  }, DEBOUNCE_MS);
}

/** 立即写入（结算 / 切后台时调用） */
export function flushSave(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (!cache) return;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
}

// 切后台 / 离开页面时强制落盘（移动端杀进程前的最后机会）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushSave();
  });
  window.addEventListener('pagehide', () => flushSave());
}
