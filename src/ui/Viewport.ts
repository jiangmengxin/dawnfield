// 全局视口单例：安全区 / 比例档位 / 尺寸缩放，所有 UI 布局的唯一事实来源
import Phaser from 'phaser';
import { Rect } from './layout';

export type Breakpoint = 'compact' | 'medium' | 'wide';

interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export class Viewport {
  private static inst: Viewport | null = null;

  private game!: Phaser.Game;
  private insets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private listeners: Array<() => void> = [];
  private debounceTimer: number | null = null;
  private _dpr = Viewport.dprNow();

  /** 当前设备像素比（封顶 3，防超高 DPR 设备过度耗能） */
  static dprNow(): number {
    return Math.min(window.devicePixelRatio || 1, 3);
  }

  static init(game: Phaser.Game): Viewport {
    if (Viewport.inst) return Viewport.inst;
    const vp = new Viewport();
    vp.game = game;
    vp.readInsets();
    game.scale.on('resize', () => vp.scheduleNotify());
    window.addEventListener('resize', () => {
      vp.fitToWindow();
      vp.scheduleNotify();
    });
    window.addEventListener('orientationchange', () => {
      vp.fitToWindow();
      vp.scheduleNotify();
    });
    Viewport.inst = vp;
    return vp;
  }

  private lastW = 0;
  private lastH = 0;

  static get(): Viewport {
    if (!Viewport.inst) throw new Error('Viewport.init() must be called first');
    return Viewport.inst;
  }

  private readInsets(): void {
    const probe = document.getElementById('safe-probe');
    if (!probe) return;
    const cs = getComputedStyle(probe);
    this.insets = {
      top: parseFloat(cs.paddingTop) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
      left: parseFloat(cs.paddingLeft) || 0,
    };
  }

  private scheduleNotify(): void {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.notify();
      // 二次校验：Phaser 可能在通知后才完成画布尺寸同步（如后台标签页），
      // 若尺寸仍在漂移则补发一次
      window.setTimeout(() => {
        if (this.w !== this.lastW || this.h !== this.lastH) this.notify();
      }, 300);
    }, 150);
  }

  private notify(): void {
    // 后台标签页等场景下 Phaser 可能尚未同步画布尺寸，先强制刷新
    const app = document.getElementById('app');
    if (app && (Math.abs(this.w - app.clientWidth) > 1 || Math.abs(this.h - app.clientHeight) > 1)) {
      this.fitToWindow();
    }
    this.readInsets();
    this.lastW = this.w;
    this.lastH = this.h;
    // 拷贝后遍历：回调中可能反注册
    [...this.listeners].forEach((f) => f());
  }

  /**
   * 高分屏适配：画布后备缓冲按物理像素（CSS × DPR）渲染，CSS 尺寸铺满窗口。
   * 否则浏览器把低分辨率画布拉伸到屏幕，整体发糊。
   */
  private fitToWindow(): void {
    const canvas = this.game.canvas;
    if (!canvas) return;
    this._dpr = Viewport.dprNow();
    const w = window.innerWidth;
    const h = window.innerHeight;
    // 先定 CSS 尺寸再 resize，让 Phaser refresh 读到正确的画布边界
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    this.game.scale.zoom = 1 / this._dpr;
    this.game.scale.resize(Math.round(w * this._dpr), Math.round(h * this._dpr));
  }

  /** 设备像素比；游戏逻辑坐标一律为 CSS 像素，乘 dpr 才是物理像素 */
  get dpr(): number {
    return this._dpr;
  }

  /**
   * 场景主相机按 DPR 放大渲染：逻辑坐标(CSS px) → 物理像素。
   * 全屏 UI 场景在 create 与每次视口变化后调用。
   */
  syncCamera(scene: Phaser.Scene): void {
    const cam = scene.cameras.main;
    cam.setZoom(this._dpr);
    cam.centerOn(this.w / 2, this.h / 2);
  }

  get w(): number {
    return this.game.scale.width / this._dpr;
  }

  get h(): number {
    return this.game.scale.height / this._dpr;
  }

  get portrait(): boolean {
    return this.h > this.w;
  }

  /** 扣除安全区后的可用矩形 */
  get safe(): Rect {
    const i = this.insets;
    return { x: i.left, y: i.top, w: this.w - i.left - i.right, h: this.h - i.top - i.bottom };
  }

  /** 比例档位：按短边宽度分档 */
  get bp(): Breakpoint {
    const min = Math.min(this.w, this.h);
    if (min < 480) return 'compact';
    if (min < 840) return 'medium';
    return 'wide';
  }

  /** 尺寸缩放：以 720 短边为基准，clamp 避免极端缩放 */
  s(px: number): number {
    const k = Phaser.Math.Clamp(Math.min(this.w, this.h) / 720, 0.85, 1.2);
    return px * k;
  }

  /** 字号档：缩放 + 取整 + 12px 下限保证可读 */
  fs(base: number): number {
    return Math.max(12, Math.round(this.s(base)));
  }

  /** 视口变化（resize / 旋转），150ms 防抖；返回反注册函数 */
  onChange(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }
}
