// 输入层：键盘 / 触控摇杆 / 手柄(stub) 统一为移动向量
// 后注册的活跃源覆盖先注册的（触控按住时覆盖键盘）；向量未归一化，由 PlayerSystem 处理
import type Phaser from 'phaser';
import { KeyboardSource } from './KeyboardSource';
import { TouchSource } from './TouchSource';
import { GamepadSource } from './GamepadSource';

export interface MoveSource {
  /** 是否正在提供输入（键盘恒 true，触控仅按住时，手柄仅连接时） */
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
  destroy?(): void;
}

export class InputManager {
  private sources: MoveSource[] = [];
  private out = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, opts: { touch: boolean }) {
    this.sources.push(new KeyboardSource(scene));
    if (opts.touch) this.sources.push(new TouchSource(scene));
    this.sources.push(new GamepadSource());
  }

  /** 当前移动向量（复用同一对象，勿持有引用） */
  move(): { x: number; y: number } {
    this.out.x = 0;
    this.out.y = 0;
    for (const s of this.sources) {
      if (s.active) {
        this.out.x = s.x;
        this.out.y = s.y;
      }
    }
    return this.out;
  }

  destroy(): void {
    for (const s of this.sources) s.destroy?.();
  }
}
