// 触控移动源：浮动虚拟摇杆
import type Phaser from 'phaser';
import { Joystick } from '../../systems/joystick';
import type { MoveSource } from './InputManager';

export class TouchSource implements MoveSource {
  private joy: Joystick;

  constructor(scene: Phaser.Scene) {
    this.joy = new Joystick(scene);
  }

  get active(): boolean {
    return this.joy.active;
  }

  get x(): number {
    return this.joy.vx;
  }

  get y(): number {
    return this.joy.vy;
  }
}
