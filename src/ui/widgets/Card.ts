// 通用卡片：升级选卡 / 图鉴 / 商店 / 选人选图共用；支持锁定占位态
import Phaser from 'phaser';
import { FONT } from '../../i18n';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { THEME } from '../theme';

export interface CardOpts {
  w: number;
  h: number;
  icon?: string;
  iconScale?: number;
  title: string;
  desc?: string;
  tag?: string;
  tagColor?: string;
  /** 卡底附加行（M14 角色 trait）：金色短句，钉在卡片底缘（仅 column 布局） */
  subDesc?: string;
  subColor?: string;
  color?: number;
  layout: 'row' | 'column';
  locked?: boolean;
  selected?: boolean;
  fontScale?: number;
  onTap?: () => void;
}

export class Card extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private opts: CardOpts;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: CardOpts) {
    super(scene, x, y);
    this.opts = opts;
    this.bg = scene.add.graphics();
    this.draw(false);
    this.add(this.bg);

    const k = opts.fontScale ?? 1;
    const locked = opts.locked ?? false;
    const inkColor = locked ? PAL.inkSoft : PAL.inkCss;
    const title = locked ? '？？？' : opts.title;

    // 图标缩放上限：大纹理（精英/Boss 等）收进卡片
    const fitIcon = (img: Phaser.GameObjects.Image, maxDim: number): void => {
      const want = opts.iconScale ?? 1.4;
      const tex = Math.max(img.width, img.height);
      img.setScale(Math.min(want, maxDim / Math.max(1, tex)));
    };

    if (opts.layout === 'row') {
      // 横排：图标在左，文字在右（竖屏选卡 / 列表行）
      const iconX = -opts.w / 2 + Math.min(44, opts.h / 2);
      if (opts.icon && !locked) {
        const img = scene.add.image(iconX, 0, opts.icon);
        fitIcon(img, opts.h * 0.7);
        this.add(img);
      } else {
        this.add(scene.add.text(iconX, 0, locked ? '🔒' : '', {
          fontFamily: FONT, fontSize: Math.round(22 * k) + 'px',
        }).setOrigin(0.5).setAlpha(0.5));
      }
      const textX = iconX + Math.min(40, opts.h / 2) + 6;
      const titleTxt = scene.add.text(textX, opts.desc ? -opts.h / 2 + 13 * k : 0, title, {
        fontFamily: FONT, fontSize: Math.round(18 * k) + 'px', fontStyle: 'bold', color: inkColor,
      });
      if (!opts.desc) titleTxt.setOrigin(0, 0.5);
      this.add(titleTxt);
      if (opts.tag) {
        this.add(scene.add.text(opts.w / 2 - 12, -opts.h / 2 + 13 * k, opts.tag, {
          fontFamily: FONT, fontSize: Math.round(13 * k) + 'px', fontStyle: 'bold',
          color: opts.tagColor ?? '#B8924A',
        }).setOrigin(1, 0));
      }
      if (opts.desc) {
        // useAdvancedWrap：中文无空格也能按宽断行
        this.add(scene.add.text(textX, -opts.h / 2 + 38 * k, opts.desc, {
          fontFamily: FONT, fontSize: Math.round(13 * k) + 'px', color: PAL.inkSoft,
          wordWrap: { width: opts.w - (textX + opts.w / 2) - 16, useAdvancedWrap: true },
        }));
      }
    } else {
      // 竖排：图标在上（桌面选卡 / 网格卡）
      const iconY = -opts.h / 2 + Math.min(52, opts.h * 0.26);
      if (opts.icon && !locked) {
        const img = scene.add.image(0, iconY, opts.icon);
        fitIcon(img, Math.min(opts.w * 0.46, opts.h * 0.4));
        this.add(img);
      } else {
        this.add(scene.add.text(0, iconY, locked ? '🔒' : '', {
          fontFamily: FONT, fontSize: Math.round(26 * k) + 'px',
        }).setOrigin(0.5).setAlpha(0.5));
      }
      const titleY = iconY + Math.min(46, opts.h * 0.22);
      this.add(scene.add.text(0, titleY, title, {
        fontFamily: FONT, fontSize: Math.round(17 * k) + 'px', fontStyle: 'bold',
        color: inkColor, align: 'center', wordWrap: { width: opts.w - 18 },
      }).setOrigin(0.5, 0));
      let nextY = titleY + 26 * k;
      if (opts.tag) {
        this.add(scene.add.text(0, nextY, opts.tag, {
          fontFamily: FONT, fontSize: Math.round(13 * k) + 'px', fontStyle: 'bold',
          color: opts.tagColor ?? '#B8924A',
        }).setOrigin(0.5, 0));
        nextY += 22 * k;
      }
      // 卡底附加行先占位（desc 缩字号的下边界据此让位）
      let descBottom = opts.h / 2 - 8;
      if (opts.subDesc && !locked) {
        const sub = scene.add.text(0, opts.h / 2 - 9, opts.subDesc, {
          fontFamily: FONT, fontSize: Math.round(12.5 * k) + 'px', fontStyle: 'bold',
          color: opts.subColor ?? '#C8902A', align: 'center',
          wordWrap: { width: opts.w - 20, useAdvancedWrap: true },
        }).setOrigin(0.5, 1);
        this.add(sub);
        descBottom = opts.h / 2 - 9 - sub.height - 3;
      }
      if (opts.desc) {
        const desc = scene.add.text(0, nextY, opts.desc, {
          fontFamily: FONT, fontSize: Math.round(13 * k) + 'px', color: PAL.inkSoft,
          align: 'center', wordWrap: { width: opts.w - 22, useAdvancedWrap: true },
        }).setOrigin(0.5, 0);
        // 长描述（如商店三行卡）超出卡底时逐级缩字号兜底，最小 10px
        let fs = Math.round(13 * k);
        while (fs > 10 && nextY + desc.height > descBottom) {
          fs--;
          desc.setFontSize(fs);
        }
        this.add(desc);
      }
    }

    this.setSize(opts.w, opts.h);
    if (opts.onTap) {
      this.setInteractive({ useHandCursor: !locked });
      this.on('pointerover', () => this.draw(true));
      this.on('pointerout', () => this.draw(false));
      this.on('pointerup', () => {
        SFX.uiClick();
        opts.onTap!();
      });
    }
    scene.add.existing(this);
  }

  setSelected(b: boolean): void {
    this.opts.selected = b;
    this.draw(false);
  }

  private draw(over: boolean): void {
    const { w, h } = this.opts;
    const locked = this.opts.locked ?? false;
    const g = this.bg;
    const r = THEME.radiusLg;
    g.clear();
    g.fillStyle(PAL.ink, 0.1);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, r);
    g.fillStyle(locked ? 0xf2ece0 : over ? 0xfffef8 : PAL.cardBg, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    const edge = this.opts.selected
      ? 0xe2b452
      : locked ? PAL.cardEdge : this.opts.color ?? PAL.cardEdge;
    g.lineStyle(this.opts.selected ? 4 : THEME.strokeAccent, edge, locked ? 0.6 : 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }
}
