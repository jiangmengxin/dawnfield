// 浮动虚拟摇杆：在屏幕任意处按下即出现（避开顶部 UI 区）
import Phaser from 'phaser';
export class Joystick {
  vx = 0;
  vy = 0;
  active = false;

  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private pointerId = -1;
  private originX = 0;
  private originY = 0;
  private readonly radius = 52;

  constructor(scene: Phaser.Scene) {
    this.base = scene.add.image(0, 0, 'joy_base').setScrollFactor(0).setDepth(2e7).setVisible(false);
    this.thumb = scene.add.image(0, 0, 'joy_thumb').setScrollFactor(0).setDepth(2e7 + 1).setVisible(false);

    scene.input.addPointer(2);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId !== -1) return;
      // 顶部 88px 留给 HUD 按钮
      if (p.y < 88) return;
      this.pointerId = p.id;
      this.originX = p.x;
      this.originY = p.y;
      this.active = true;
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.thumb.setPosition(p.x, p.y).setVisible(true);
    });

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      let dx = p.x - this.originX;
      let dy = p.y - this.originY;
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
