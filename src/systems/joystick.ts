// 浮动虚拟摇杆：在屏幕任意处按下即出现（避开顶部 UI 区）
import Phaser from 'phaser';
import { Viewport } from '../ui/Viewport';

export class Joystick {
  vx = 0;
  vy = 0;
  active = false;

  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private pointerId = -1;
  private originX = 0;
  private originY = 0;
  private readonly radius = 52;

  /** 指针(物理像素) → scrollFactor=0 摆放坐标系（= 去掉相机滚动的世界坐标，自动消化相机 zoom/DPR） */
  private toFixed(p: Phaser.Input.Pointer): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const wp = cam.getWorldPoint(p.x, p.y);
    return { x: wp.x - cam.scrollX, y: wp.y - cam.scrollY };
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.base = scene.add.image(0, 0, 'joy_base').setScrollFactor(0).setDepth(2e7).setVisible(false);
    this.thumb = scene.add.image(0, 0, 'joy_thumb').setScrollFactor(0).setDepth(2e7 + 1).setVisible(false);

    scene.input.addPointer(2);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId !== -1) return;
      // 顶部 88px(CSS) 留给 HUD 按钮
      if (p.y / Viewport.get().dpr < 88) return;
      this.pointerId = p.id;
      const f = this.toFixed(p);
      this.originX = f.x;
      this.originY = f.y;
      this.active = true;
      this.base.setPosition(f.x, f.y).setVisible(true);
      this.thumb.setPosition(f.x, f.y).setVisible(true);
    });

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      const f = this.toFixed(p);
      let dx = f.x - this.originX;
      let dy = f.y - this.originY;
      const len = Math.hypot(dx, dy);
      if (len > this.radius) {
        dx = (dx / len) * this.radius;
        dy = (dy / len) * this.radius;
      }
      this.thumb.setPosition(this.originX + dx, this.originY + dy);
      const dead = 8;
      if (len < dead) {
        this.vx = 0;
        this.vy = 0;
      } else {
        this.vx = dx / this.radius;
        this.vy = dy / this.radius;
      }
    });

    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.reset();
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  reset(): void {
    this.pointerId = -1;
    this.active = false;
    this.vx = 0;
    this.vy = 0;
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }
}
