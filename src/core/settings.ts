// 设置访问门面：M3 起由版本化存档（core/save）承载，本模块只保留旧 API 形状
// 旧散键 dawnfield.settings 由 save/migrations 作 v0 吸收
import { getSave, persistSave } from './save';

export interface TempSettings {
  volBgm: number; // BGM 音量 0..1（M8 分轨）
  volSfx: number; // SFX 音量 0..1
  dmgNumbers: boolean;
  shake: boolean;
  speed: 1 | 2; // 局内倍速
  // 调试
  debugInfo: boolean; // FPS/实体数等运行信息
  invincible: boolean;
  fullPickup: boolean; // 全屏拾取范围
  autoPick: boolean; // 升级时自动选第一张卡
  unlockAll: boolean; // 解锁全部内容（角色/地图视为全解锁，可逆）
}

export function getSettings(): TempSettings {
  return getSave().settings;
}

export function updateSettings(patch: Partial<TempSettings>): TempSettings {
  Object.assign(getSave().settings, patch);
  persistSave();
  return getSave().settings;
}
