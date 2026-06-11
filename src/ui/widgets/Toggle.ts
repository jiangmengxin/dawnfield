// 开关：纸面胶囊 + 滑块圆点
import Phaser from 'phaser';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';

const W = 58;
const H = 32;

export class Toggle extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Graphics;
  private value: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, value: boolean, onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.value = value;
    this.gfx = scene.add.graphics();
    this.knob = scene.add.graphics();
    this.knob.fillStyle(0xffffff, 1);
    this.knob.fillCircle(0, 0, H / 2 - 5);
    this.knob.lineStyle(2, PAL.cardEdge, 1);
    this.knob.strokeCircle(0, 0, H / 2 - 5);
    this.add([this.gfx, this.knob]);
    this.redraw(false);
    this.setSize(W + 12, H + 12);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => {
      this.value = !this.value;
      SFX.uiClick();
      this.redraw(true);
      onChange(this.value);
    });
    scene.add.existing(this);
  }

  get checked(): boolean {
    return this.value;
  }

  setValue(v: boolean): void {
    this.value = v;
    this.redraw(false);
  }

  private redraw(animate: boolean): void {
    const g = this.gfx;
    g.clear();
    g.fillStyle(this.value ? 0xf8d060 : 0xe8e0d0, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, H / 2);
    g.lineStyle(2, this.value ? 0xe2b452 : PAL.cardEdge, 1);
    g.strokeRoundedRect(-W / 2, -H / 2, W, H, H / 2);
    const kx = this.value ? W / 2 - H / 2 + 2 : -W / 2 + H / 2 - 2;
    if (animate) {
      this.scene.tweens.add({ targets: this.knob, x: kx, duration: 140, ease: 'Cubic.easeOut' });
    } else {
      this.knob.setX(kx);
    }
  }
}
