// 局内统一时钟：倍速（1x/2x）+ hit-stop 顿帧
// 倍速必须经 setSpeed 同步 dt 乘子 / time / tweens 三套时钟，否则 delayedCall 与 tween 会错位
import type Phaser from 'phaser';

export class TimeController {
  speed: 1 | 2 = 1;
  private hitStopT = 0;
  private scale = 1;

  constructor(private scene: Phaser.Scene) {}

  setSpeed(v: 1 | 2): void {
    this.speed = v;
    this.scene.time.timeScale = v;
    this.scene.tweens.timeScale = v;
  }

  /** 顿帧：短暂将时间压到 5% */
  hitStop(sec: number): void {
    this.hitStopT = sec;
    this.scale = 0.05;
  }

  /** 输入截断后的原始 dt（秒），返回经 hit-stop 与倍速换算的有效 dt */
  step(raw: number): number {
    if (this.hitStopT > 0) {
      this.hitStopT -= raw;
      this.scale = this.hitStopT > 0 ? 0.05 : 1;
    }
    return raw * this.scale * this.speed;
  }

  /** 清除顿帧（胜负结算时） */
  reset(): void {
    this.hitStopT = 0;
    this.scale = 1;
  }
}
