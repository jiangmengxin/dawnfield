// 存档迁移：v0 散键吸收 + 版本迁移链（未来 v3+ 在此登记）
import type { SaveV2 } from './schema';

const LEGACY_KEYS = ['dawnfield.lang', 'dawnfield.muted', 'dawnfield.volume', 'dawnfield.settings'];

/** v0 → v1：吸收旧散键（lang/muted/volume/settings）进 settings，读取后删除旧键 */
export function absorbLegacy(s: SaveV2): void {
  try {
    const lang = localStorage.getItem('dawnfield.lang');
    if (lang === 'zh' || lang === 'en') s.settings.lang = lang;

    const muted = localStorage.getItem('dawnfield.muted');
    if (muted !== null) s.settings.muted = muted === '1';

    const vol = localStorage.getItem('dawnfield.volume');
    if (vol !== null) {
      const v = parseFloat(vol);
      // M8 起音量分轨：旧单一音量同时作为两轨初值
      if (!Number.isNaN(v)) s.settings.volBgm = s.settings.volSfx = Math.max(0, Math.min(1, v));
    }

    const raw = localStorage.getItem('dawnfield.settings');
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>;
      if (typeof p.volume === 'number') s.settings.volBgm = s.settings.volSfx = Math.max(0, Math.min(1, p.volume));
      if (typeof p.dmgNumbers === 'boolean') s.settings.dmgNumbers = p.dmgNumbers;
      if (typeof p.shake === 'boolean') s.settings.shake = p.shake;
      if (p.speed === 2) s.settings.speed = 2;
      if (p.debugInfo === true) s.settings.debugInfo = true;
      if (p.invincible === true) s.settings.invincible = true;
      if (p.fullPickup === true) s.settings.fullPickup = true;
      if (p.autoPick === true) s.settings.autoPick = true;
    }

    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

/**
 * 版本迁移链：键 = 源版本号，函数把该版本的原始对象原地升到下一版。
 * storage 按 v..SAVE_VERSION-1 依次执行后再 sanitize。
 */
export const MIGRATIONS: Record<number, (o: Record<string, unknown>) => void> = {
  // v1 → v2（M11）：无尽/狂暴顶层字段 + 搭车字段 tipsSeen（M14 引导节流）与
  // stats.winsByChar（M13 成就）；具体值守卫交给 sanitize（MapId 白名单 + num）
  1: (o) => {
    o.endless = {};
    o.hyper = {};
    o.tipsSeen = [];
    if (typeof o.stats === 'object' && o.stats !== null) {
      (o.stats as Record<string, unknown>).winsByChar = {};
    }
    o.v = 2;
  },
};
