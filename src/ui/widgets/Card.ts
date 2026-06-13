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
  /** 等级圆点（商店等级可视化）：value 个点亮 + (max-value) 个灰点，column 布局标题下方居中一行 */
  pips?: { value: number; max: number; color?: number };
  /** 卡底附加行（M14 角色 trait）：金色短句，钉在卡片底缘（仅 column 布局） */
  subDesc?: string;
  subColor?: string;
  color?: number;
  /** banner：顶部大色带托预览图（地图卡专用，与角色"肖像卡"结构性区分——CARD1） */
  layout: 'row' | 'column' | 'banner';
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

    if (opts.layout === 'banner') {
      // 地图卡（CARD1）：顶部大色带托预览图标 + 角标信息 + 下方名称/描述，
      // 与角色"肖像卡"（图标小、上中下三段）形成结构性差异，一眼可分。
      // 无描述时色带更高（更多预览图）、名称在信息条内垂直居中，避免大片空白
      const bandH = opts.h * (opts.desc ? 0.56 : 0.64);
      const bandTop = -opts.h / 2;
      const bc = opts.color ?? PAL.cardEdge;
      const band = scene.add.graphics();
      band.fillStyle(bc, locked ? 0.16 : 0.28);
      band.fillRoundedRect(-opts.w / 2, bandTop, opts.w, bandH,
        { tl: THEME.radiusLg, tr: THEME.radiusLg, bl: 0, br: 0 });
      this.add(band);
      const iconCY = bandTop + bandH / 2;
      if (opts.icon && !locked) {
        const img = scene.add.image(0, iconCY, opts.icon);
        fitIcon(img, Math.min(opts.w * 0.6, bandH * 0.82));
        this.add(img);
      } else {
        this.add(scene.add.text(0, iconCY, locked ? '🔒' : '', {
          fontFamily: FONT, fontSize: Math.round(30 * k) + 'px',
        }).setOrigin(0.5).setAlpha(0.5));
      }
      // 角标（时长 / 无尽纪录 / 锁定）：钉在色带右上，叠在预览图上
      if (opts.tag) {
        this.add(scene.add.text(opts.w / 2 - 9, bandTop + 8, opts.tag, {
          fontFamily: FONT, fontSize: Math.round(12.5 * k) + 'px', fontStyle: 'bold',
          color: opts.tagColor ?? '#B8924A', stroke: '#FFFFFF', strokeThickness: 3,
        }).setOrigin(1, 0));
      }
      // 信息条：名称（无描述时垂直居中）+ 描述（锁定卡描述即解锁条件）
      const infoMid = bandTop + bandH + (opts.h / 2 - (bandTop + bandH)) / 2;
      const titleTxt = scene.add.text(0, opts.desc ? bandTop + bandH + 9 * k : infoMid, title, {
        fontFamily: FONT, fontSize: Math.round(19 * k) + 'px', fontStyle: 'bold',
        color: inkColor, align: 'center', wordWrap: { width: opts.w - 18 },
      }).setOrigin(0.5, opts.desc ? 0 : 0.5);
      this.add(titleTxt);
      if (opts.desc) {
        this.add(scene.add.text(0, titleTxt.y + titleTxt.height + 4 * k, opts.desc, {
          fontFamily: FONT, fontSize: Math.round(12 * k) + 'px', color: PAL.inkSoft,
          align: 'center', wordWrap: { width: opts.w - 20, useAdvancedWrap: true },
        }).setOrigin(0.5, 0));
      }
    } else if (opts.layout === 'row') {
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
      // 等级圆点（商店）：标题下方居中一行，点亮=已购等级 / 灰点=未购
      if (opts.pips) {
        const { value, max } = opts.pips;
        const pc = opts.pips.color ?? 0xe2b452;
        const r = Math.max(2.4, Math.min(4, (opts.w - 26) / (max * 2.7)));
        const step = r * 2.7;
        const totalW = (max - 1) * step;
        const pg = scene.add.graphics();
        const cyP = nextY + r;
        for (let i = 0; i < max; i++) {
          const px = -totalW / 2 + i * step;
          if (i < value) {
            pg.fillStyle(pc, 1);
            pg.fillCircle(px, cyP, r);
            pg.lineStyle(1, 0xffffff, 0.9);
            pg.strokeCircle(px, cyP, r);
          } else {
            pg.fillStyle(0xcfc6b4, 0.5);
            pg.fillCircle(px, cyP, r);
          }
        }
        this.add(pg);
        nextY += r * 2 + 10 * k;
      }
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
    // 锁定占位卡整体减淡：与已解锁卡拉开层级，避免满屏 ??? 喧宾夺主（C2/M2）
    if (locked) this.setAlpha(0.78);
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
