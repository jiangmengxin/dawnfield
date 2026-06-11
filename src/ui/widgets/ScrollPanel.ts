// 滚动面板：GeometryMask 裁剪 + 拖动（>8px 吞 tap）+ 惯性回弹 + 滚轮 + 滚动条
import Phaser from 'phaser';
import { PAL } from '../../gfx/palette';
import { Rect } from '../layout';

const DRAG_THRESHOLD = 8;

export class ScrollPanel extends Phaser.GameObjects.Container {
  readonly view: Rect;
  private content: Phaser.GameObjects.Container;
  private maskGfx: Phaser.GameObjects.Graphics;
  private barGfx: Phaser.GameObjects.Graphics;
  private contentH = 0;
  private scroll = 0;
  private vel = 0;
  private dragging = false;
  private moved = false;
  private lastY = 0;
  private downY = 0;

  constructor(scene: Phaser.Scene, view: Rect) {
    super(scene, view.x, view.y);
    this.view = view;
    this.content = scene.add.container(0, 0);
    this.add(this.content);

    this.maskGfx = scene.make.graphics({ x: 0, y: 0 });
    this.maskGfx.fillStyle(0xffffff);
    this.maskGfx.fillRect(view.x, view.y, view.w, view.h);
    this.content.setMask(this.maskGfx.createGeometryMask());

    this.barGfx = scene.add.graphics();
    this.add(this.barGfx);

    // 拖动手势（zone 截获面板范围内指针）
    const zone = scene.add.zone(0, 0, view.w, view.h).setOrigin(0).setInteractive();
    this.addAt(zone, 0);
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.moved = false;
      this.lastY = p.y;
      this.downY = p.y;
      this.vel = 0;
    });
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('wheel', this.onWheel, this);
    scene.events.on('update', this.onUpdate, this);

    this.once('destroy', () => {
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('wheel', this.onWheel, this);
      scene.events.off('update', this.onUpdate, this);
      this.maskGfx.destroy();
    });
    scene.add.existing(this);
  }

  /** 本次手势是否产生了拖动（卡片 onTap 应据此忽略点击） */
  get dragMoved(): boolean {
    return this.moved;
  }

  /** 重建内容：build 向面板内添加对象（坐标系原点 = 面板左上角），返回内容总高 */
  setContent(build: (add: (go: Phaser.GameObjects.GameObject) => void) => number): void {
    this.content.removeAll(true);
    this.contentH = build((go) => {
      this.content.add(go);
    });
    this.clampScroll();
    this.applyScroll();
  }

  get scrollY(): number {
    return this.scroll;
  }

  set scrollY(v: number) {
    this.scroll = v;
    this.clampScroll();
    this.applyScroll();
  }

  private get maxScroll(): number {
    return Math.max(0, this.contentH - this.view.h);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.dragging || !p.isDown) return;
    if (!this.moved && Math.abs(p.y - this.downY) > DRAG_THRESHOLD) this.moved = true;
    if (this.moved) {
      const dy = p.y - this.lastY;
      this.scroll -= dy;
      this.vel = -dy * 60; // 估算速度（像素/秒）
      this.applyScroll(true);
    }
    this.lastY = p.y;
  }

  private onUp(): void {
    this.dragging = false;
  }

  private onWheel(_p: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number): void {
    const p = this.scene.input.activePointer;
    const { view } = this;
    if (p.x < view.x || p.x > view.x + view.w || p.y < view.y || p.y > view.y + view.h) return;
    this.scroll += dy * 0.6;
    this.vel = 0;
    this.applyScroll(true);
  }

  private onUpdate(_t: number, dtMs: number): void {
    const dt = dtMs / 1000;
    if (!this.dragging && Math.abs(this.vel) > 4) {
      this.scroll += this.vel * dt;
      this.vel *= Math.pow(0.05, dt); // 指数衰减
      this.applyScroll(true);
    }
    // 越界回弹
    if (!this.dragging) {
      const over = this.scroll < 0 ? -this.scroll : this.scroll > this.maxScroll ? this.maxScroll - this.scroll : 0;
      if (over !== 0) {
        this.scroll += over * Math.min(1, dt * 12);
        if (Math.abs(over) < 0.5) this.scroll = this.scroll < 0 ? 0 : this.maxScroll;
        this.applyScroll(true);
      } else if (Math.abs(this.vel) <= 4 && this.barGfx.alpha > 0) {
        this.barGfx.setAlpha(Math.max(0, this.barGfx.alpha - dt * 2));
      }
    }
  }

  private clampScroll(): void {
    this.scroll = Phaser.Math.Clamp(this.scroll, 0, this.maxScroll);
  }

  private applyScroll(showBar = false): void {
    // 拖动中允许轻微越界（橡皮筋）
    const limit = 60;
    if (this.dragging) {
      this.scroll = Phaser.Math.Clamp(this.scroll, -limit, this.maxScroll + limit);
    }
    this.content.y = -this.scroll;
    if (showBar && this.maxScroll > 0) this.drawBar();
  }

  private drawBar(): void {
    const g = this.barGfx;
    const { view } = this;
    const k = view.h / this.contentH;
    const barH = Math.max(28, view.h * k);
    const barY = (view.h - barH) * Phaser.Math.Clamp(this.scroll / this.maxScroll, 0, 1);
    g.clear();
    g.setAlpha(0.9);
    g.fillStyle(PAL.cardEdge, 0.9);
    g.fillRoundedRect(view.w - 5, barY, 4, barH, 2);
  }
}
