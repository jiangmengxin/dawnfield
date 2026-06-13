// 全局屏震入口：统一收敛全项目 cameras.main.shake 调用。
// 各调用点只表达"事件相对强度"，最终位移再乘全局系数——峰值因此自动收敛。
// 设置为开关：开启时用收敛系数（= 原"弱"档，用户反馈整体偏强后定为 0.3），关闭跳过。
import type Phaser from 'phaser';
import { getSettings } from '../core/settings';

/** 屏震开启时的全局强度系数（较旧实现整体下调，避免眩晕） */
export const SHAKE_ON = 0.3;

/** 统一屏震：屏震开启时按 SHAKE_ON 缩放强度，关闭直接跳过（不触相机） */
export function shakeCam(scene: Phaser.Scene, ms: number, intensity: number): void {
  if (!getSettings().shake) return;
  scene.cameras.main.shake(ms, intensity * SHAKE_ON);
}
