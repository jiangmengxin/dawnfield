// 滑杆：拖动旋钮调节 0..1
import Phaser from 'phaser';
import { PAL } from '../../gfx/palette';

export class Slider extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Graphics;
  private value: number;
  private readonly trackW: number;
  private dragging = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    trackW: number,
    value: number,
    onChange: (v: number) => void,
  ) {
    super(scene, x, y);
    this.trackW = trackW;
    this.value = Phaser.Math.Clamp(value, 0, 1);
    this.track = scene.add.graphics();
    this.knob = scene.add.graphics();
    this.knob.fillStyle(0xffffff, 1);
    this.knob.fillCircle(0, 0, 13);
    this.knob.lineStyle(2.5, 0xe2b452, 1);
    this.knob.strokeCircle(0, 0, 13);
    this.add([this.track, this.knob]);
    this.redraw();

    this.setSize(trackW + 36, 40);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.applyPointer(p, onChange);
    });
    scene.input.on('pointermove', this.onMove(onChange), this);
    scene.input.on('pointerup', this.onUp, this);
    this.once('destroy', () => {
      scene.input.off('pointermove', this.onMove(onChange), this);
      scene.input.off('pointerup', this.onUp, this);
    });
    scene.add.existing(this);
  }

  private moveHandler: ((p: Phaser.Input.Pointer) => void) | null = null;

  private onMove(onChange: (v: number) => void): (p: Phaser.Input.Pointer) => void {
    if (!this.moveHandler) {
      this.moveHandler = (p: Phaser.Input.Pointer) => {
        if (this.dragging && p.isDown) this.applyPointer(p, onChange);
      };
    }
    return this.moveHandler;
  }

  private onUp(): void {
    this.dragging = false;
  }

  private applyPointer(p: Phaser.Input.Pointer, onChange: (v: number) => void): void {
    // 世界坐标 → 本地（Slider 可能在 Container 内）
    const m = this.getWorldTransformMatrix();
    const local = m.applyInverse(p.x, p.y);
    this.value = Phaser.Math.Clamp(local.x / this.trackW + 0.5, 0, 1);
    this.redraw();
    onChange(this.value);
  }

  get v(): number {
    return this.value;
  }

  setValue(v: number): void {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    this.redraw();
  }

  private redraw(): void {
    const g = this.track;
    const w = this.trackW;
    g.clear();
    g.fillStyle(0xe8e0d0, 1);
    g.fillRoundedRect(-w / 2, -5, w, 10, 5);
    g.fillStyle(0xf8d060, 1);
    g.fillRoundedRect(-w / 2, -5, Math.max(10, w * this.value), 10, 5);
    g.lineStyle(2, PAL.cardEdge, 1);
    g.strokeRoundedRect(-w / 2, -5, w, 10, 5);
    this.knob.setX(-w / 2 + w * this.value);
  }
}
