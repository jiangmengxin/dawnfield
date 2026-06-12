// 手柄移动源（stub）：占位扩展点，后续里程碑接 Phaser.Input.Gamepad
import type { MoveSource } from './InputManager';

export class GamepadSource implements MoveSource {
  readonly active = false; // 未实现：恒不活跃
  readonly x = 0;
  readonly y = 0;
}
