// 键盘移动源：WASD + 方向键
import type Phaser from 'phaser';
import type { MoveSource } from './InputManager';

export class KeyboardSource implements MoveSource {
  readonly active = true;
  private keys: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'LEFT' | 'DOWN' | 'RIGHT', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = {
      W: kb.addKey('W'), A: kb.addKey('A'), S: kb.addKey('S'), D: kb.addKey('D'),
      UP: kb.addKey('UP'), LEFT: kb.addKey('LEFT'), DOWN: kb.addKey('DOWN'), RIGHT: kb.addKey('RIGHT'),
    };
  }

  get x(): number {
    return (this.keys.A.isDown || this.keys.LEFT.isDown ? -1 : 0)
      + (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0);
  }

  get y(): number {
    return (this.keys.W.isDown || this.keys.UP.isDown ? -1 : 0)
      + (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0);
  }
}
