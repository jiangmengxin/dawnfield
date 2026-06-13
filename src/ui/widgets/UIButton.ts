// 纸面圆角按钮：primary / ghost / icon 三种样式 + 角标 + 禁用态
import Phaser from 'phaser';
import { FONT } from '../../i18n';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { THEME } from '../theme';

/** 按钮前导矢量图标种类（替代字体字形，跨平台一致；见 HUD 构筑操控按钮） */
export type BtnIcon = 'reroll' | 'banish' | 'skip' | 'cancel';

export interface UIButtonOpts {
  w: number;
  h: number;
  label?: string;
  style?: 'primary' | 'ghost' | 'icon';
  fontSize?: number;
  fill?: number;
  edge?: number;
  badge?: boolean;
  /** 文案前的矢量图标（Graphics 绘制，不依赖字体字形） */
  icon?: BtnIcon;
  onTap: () => void;
}

export class UIButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private badgeDot: Phaser.GameObjects.Graphics;
  private iconG: Phaser.GameObjects.Graphics | null = null;
  private iconKind: BtnIcon | undefined;
  private opts: UIButtonOpts;
  private enabled = true;
  private baseFs = 20;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: UIButtonOpts) {
    super(scene, x, y);
    this.opts = opts;
    this.bg = scene.add.graphics();
    this.draw(false);
    this.baseFs = opts.fontSize ?? 20;
    this.txt = scene.add.text(0, 0, opts.label ?? '', {
      fontFamily: FONT,
      fontSize: this.baseFs + 'px',
      fontStyle: 'bold',
      color: PAL.inkCss,
    }).setOrigin(0.5);
    this.iconKind = opts.icon;
    if (this.iconKind) {
      this.iconG = scene.add.graphics();
      this.drawIcon();
    }
    this.fitText();
    this.layoutContent();
    this.badgeDot = scene.add.graphics();
    this.badgeDot.fillStyle(0xe87878, 1);
    this.badgeDot.fillCircle(opts.w / 2 - 4, -opts.h / 2 + 4, 6);
    this.badgeDot.lineStyle(2, 0xffffff, 1);
    this.badgeDot.strokeCircle(opts.w / 2 - 4, -opts.h / 2 + 4, 6);
    this.badgeDot.setVisible(opts.badge ?? false);
    this.add([this.bg, ...(this.iconG ? [this.iconG] : []), this.txt, this.badgeDot]);
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

  private get iconSize(): number {
    return Math.round(this.baseFs * 0.92);
  }

  private get iconGap(): number {
    return Math.max(4, Math.round(this.baseFs * 0.3));
  }

  /** 文案超宽时自动缩字号到下限（T3：取消放逐/i18n 长文案不顶边、不溢出）；前导图标占位计入可用宽 */
  private fitText(): void {
    const iconW = this.iconKind ? this.iconSize + this.iconGap : 0;
    const avail = this.opts.w - 16 - iconW;
    let fs = this.baseFs;
    this.txt.setFontSize(fs);
    const min = Math.max(11, Math.round(this.baseFs * 0.68));
    while (fs > min && this.txt.width > avail) {
      fs -= 1;
      this.txt.setFontSize(fs);
    }
  }

  /** 图标 + 文案作为整体在按钮内水平居中（无图标则文案居中，保持旧行为） */
  private layoutContent(): void {
    if (!this.iconG || !this.iconKind) {
      this.txt.setPosition(0, 0);
      return;
    }
    const s = this.iconSize;
    const gap = this.iconGap;
    const groupW = s + gap + this.txt.width;
    const left = -groupW / 2;
    this.iconG.setPosition(left + s / 2, 0);
    this.txt.setPosition(left + s + gap + this.txt.width / 2, 0);
  }

  /** 绘制前导矢量图标（居中于 iconG 局部原点；ink 单色，跨平台一致） */
  private drawIcon(): void {
    const g = this.iconG;
    if (!g || !this.iconKind) return;
    const s = this.iconSize;
    const col = PAL.ink;
    const lw = Math.max(2, s * 0.16);
    g.clear();
    if (this.iconKind === 'banish') {
      const h = s * 0.4;
      g.lineStyle(lw, col, 1);
      g.lineBetween(-h, -h, h, h);
      g.lineBetween(-h, h, h, -h);
    } else if (this.iconKind === 'skip') {
      g.fillStyle(col, 1);
      const tw = s * 0.34;
      const th = s * 0.4;
      const gp = s * 0.06;
      g.fillTriangle(-tw - gp, -th, -tw - gp, th, -gp, 0);
      g.fillTriangle(gp, -th, gp, th, tw + gp, 0);
    } else if (this.iconKind === 'cancel') {
      // 左向箭头：退出放逐模式 / 返回
      const ax = s * 0.42;
      const baseX = -s * 0.05;
      const aw = s * 0.3;
      g.lineStyle(lw, col, 1);
      g.lineBetween(ax, 0, baseX, 0);
      g.fillStyle(col, 1);
      g.fillTriangle(-ax, 0, baseX, -aw, baseX, aw);
    } else {
      // reroll：顺时针圆弧 + 端部切向箭头（留口缺角，读作"重抽/刷新"）
      const r = s * 0.4;
      const a0 = Phaser.Math.DegToRad(-35);
      const a1 = Phaser.Math.DegToRad(215);
      g.lineStyle(lw, col, 1);
      g.beginPath();
      g.arc(0, 0, r, a0, a1, false);
      g.strokePath();
      const px = Math.cos(a1) * r;
      const py = Math.sin(a1) * r;
      const tx = -Math.sin(a1);
      const ty = Math.cos(a1);
      const nx = Math.cos(a1);
      const ny = Math.sin(a1);
      const ah = s * 0.32;
      const aw = s * 0.24;
      g.fillStyle(col, 1);
      g.fillTriangle(px + tx * ah, py + ty * ah, px + nx * aw, py + ny * aw, px - nx * aw, py - ny * aw);
    }
  }

  /** 切换前导图标（放逐 ✕ ↔ 取消 ←） */
  setIcon(kind: BtnIcon): this {
    this.iconKind = kind;
    if (!this.iconG) {
      this.iconG = this.scene.add.graphics();
      this.addAt(this.iconG, 1); // 置于背景之上、文字之下
    }
    this.drawIcon();
    this.fitText();
    this.layoutContent();
    return this;
  }

  setLabel(s: string): this {
    this.txt.setText(s);
    this.fitText(); // 切换模式（放逐↔取消放逐）后按新文案重判缩放
    this.layoutContent();
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
