// 纸面圆角按钮：primary / ghost / icon 三种样式 + 角标 + 禁用态
import Phaser from 'phaser';
import { FONT } from '../../i18n';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { THEME } from '../theme';

export interface UIButtonOpts {
  w: number;
  h: number;
  label?: string;
  style?: 'primary' | 'ghost' | 'icon';
  fontSize?: number;
  fill?: number;
  edge?: number;
  badge?: boolean;
  onTap: () => void;
}

export class UIButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private badgeDot: Phaser.GameObjects.Graphics;
  private opts: UIButtonOpts;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: UIButtonOpts) {
    super(scene, x, y);
    this.opts = opts;
    this.bg = scene.add.graphics();
    this.draw(false);
    this.txt = scene.add.text(0, 0, opts.label ?? '', {
      fontFamily: FONT,
      fontSize: (opts.fontSize ?? 20) + 'px',
      fontStyle: 'bold',
      color: PAL.inkCss,
    }).setOrigin(0.5);
    this.badgeDot = scene.add.graphics();
    this.badgeDot.fillStyle(0xe87878, 1);
    this.badgeDot.fillCircle(opts.w / 2 - 4, -opts.h / 2 + 4, 6);
    this.badgeDot.lineStyle(2, 0xffffff, 1);
    this.badgeDot.strokeCircle(opts.w / 2 - 4, -opts.h / 2 + 4, 6);
    this.badgeDot.setVisible(opts.badge ?? false);
    this.add([this.bg, this.txt, this.badgeDot]);
    this.setSize(opts.w, opts.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.enabled && this.draw(true));
    this.on('pointerout', () => this.enabled && this.draw(false));
    this.on('pointerdown', () => this.enabled && this.setScale(0.96));
    this.on('pointerup', () => {
      this.setScale(1);
      if (!this.enabled) return;
      SFX.uiClick();
      opts.onTap();
    });
    scene.add.existing(this);
  }

  private draw(over: boolean): void {
    const { w, h } = this.opts;
    const style = this.opts.style ?? 'primary';
    const r = Math.min(THEME.radiusMd, h / 2 - 2);
    const g = this.bg;
    g.clear();
    if (style !== 'ghost') {
      g.fillStyle(PAL.ink, THEME.shadowAlpha);
      g.fillRoundedRect(-w / 2 + THEME.shadowDx, -h / 2 + THEME.shadowDy, w, h, r);
    }
    const fill = this.opts.fill ?? PAL.cardBg;
    g.fillStyle(over ? 0xfff8e8 : fill, style === 'ghost' ? (over ? 0.5 : 0.2) : 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.lineStyle(THEME.strokeCard, this.opts.edge ?? PAL.cardEdge, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  setLabel(s: string): this {
    this.txt.setText(s);
    return this;
  }

  setEnabled(b: boolean): this {
    this.enabled = b;
    this.setAlpha(b ? 1 : 0.45);
    return this;
  }

  setBadge(b: boolean): this {
    this.badgeDot.setVisible(b);
    return this;
  }
}

// ---------- 兼容旧 API（HUD/Result 仍在使用，M2 迁移后移除） ----------

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: { fontSize?: number; fill?: number; edge?: number } = {},
): Phaser.GameObjects.Container {
  return new UIButton(scene, x, y, {
    w, h, label, onTap: onClick,
    fontSize: opts.fontSize ?? 22, fill: opts.fill, edge: opts.edge,
  });
}

export function setButtonLabel(c: Phaser.GameObjects.Container, label: string): void {
  if (c instanceof UIButton) {
    c.setLabel(label);
    return;
  }
  (c.getData('label') as Phaser.GameObjects.Text).setText(label);
}
