// 主菜单枢纽：开始 → 选人选图；商店/图鉴/成就/设置入口
import Phaser from 'phaser';
import { FONT, getLang, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { Meta } from '../core/MetaState';
import { resetStack } from '../core/router';
import { UIScene } from '../ui/UIScene';
import { THEME } from '../ui/theme';

type TapHandler = () => void;

interface ImageButtonOpts {
  key: 'title_btn_primary' | 'title_btn_secondary';
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fontSize: number;
  badge?: boolean;
  onTap: TapHandler;
}

export class TitleScene extends UIScene {
  private petalTimer: Phaser.Time.TimerEvent | null = null;
  private titleCleanups: Array<() => void> = [];
  private audioUnlock: (() => void) | null = null;

  constructor() {
    super('title');
  }

  protected buildLayout(): void {
    resetStack();
    this.clearTitleRuntime();
    const vp = this.vp;
    const safe = vp.safe;
    const landscape = safe.w > safe.h;
    const bg = this.addCoverImage(landscape ? 'title_bg_landscape' : 'title_bg_portrait')
      .setDepth(0);
    const motionLayer = this.add.container(0, 0).setDepth(2);
    this.addAmbientMotes(motionLayer, landscape);
    this.bindParallax(bg, motionLayer, landscape);

    if (landscape) {
      this.buildLandscapeMenu();
    } else {
      this.buildPortraitMenu();
    }

    this.startPetalFall();
    this.bindAudioUnlock();
    this.events.once('shutdown', () => this.clearTitleRuntime());
  }

  private buildLandscapeMenu(): void {
    const vp = this.vp;
    const safe = vp.safe;
    const compact = safe.h < 620;
    const menuW = Phaser.Math.Clamp(safe.w * 0.36, 340, 500);
    const margin = Math.max(vp.s(24), safe.w * 0.035);
    const cx = safe.x + margin + menuW / 2;
    const logoBoxH = vp.s(compact ? 118 : 150);
    const startH = Math.max(THEME.hitMin, vp.s(compact ? 60 : 70));
    const secondH = Math.max(THEME.hitMin, vp.s(compact ? 46 : 52));
    const gridGap = vp.s(compact ? 9 : 12);
    const gapLogoStart = vp.s(compact ? 20 : 28);
    const gapStartGrid = vp.s(compact ? 14 : 18);
    const groupH = logoBoxH + gapLogoStart + startH + gapStartGrid + secondH * 2 + gridGap;
    const top = safe.y + Math.max(vp.s(18), (safe.h - groupH) / 2);
    const logo = this.addLogo(cx, top + logoBoxH * 0.46, menuW * 1.05, logoBoxH);
    this.tweens.add({ targets: logo, scale: logo.scale * 1.015, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const startY = top + logoBoxH + gapLogoStart + startH / 2;
    this.addImageButton({
      key: 'title_btn_primary',
      x: cx,
      y: startY,
      w: Math.min(menuW * 0.82, 360),
      h: startH,
      label: t('start'),
      fontSize: vp.fs(compact ? 24 : 27),
      onTap: () => {
        SFX.unlock();
        this.goto('charselect');
      },
    });

    const entries: Array<[string, TapHandler, boolean]> = [
      [t('menu_shop'), () => this.goto('shop'), false],
      [t('menu_codex'), () => this.goto('codex'), Meta.codexHasNew()],
      [t('menu_ach'), () => this.goto('achievements'), false],
      [t('menu_settings'), () => this.goto('settings'), false],
    ];
    const gridTop = startY + startH / 2 + gapStartGrid;
    const cellW = (menuW - gridGap) / 2;
    entries.forEach(([label, fn, badge], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      this.addImageButton({
        key: 'title_btn_secondary',
        x: cx - menuW / 2 + cellW / 2 + col * (cellW + gridGap),
        y: gridTop + secondH / 2 + row * (secondH + gridGap),
        w: cellW,
        h: secondH,
        label,
        fontSize: vp.fs(compact ? 15 : 16),
        badge,
        onTap: fn,
      });
    });
  }

  private buildPortraitMenu(): void {
    const vp = this.vp;
    const safe = vp.safe;
    const compact = safe.h < 560 || safe.w < 360;
    const cx = safe.x + safe.w / 2;
    const contentW = Math.min(safe.w - vp.s(28), 420);
    const logoMaxH = vp.s(compact ? 92 : 128);
    const logoY = safe.y + vp.s(compact ? 64 : 88);
    const logo = this.addLogo(cx, logoY, Math.min(contentW * 1.08, safe.w - vp.s(18)), logoMaxH);
    this.tweens.add({ targets: logo, scale: logo.scale * 1.012, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const startH = Math.max(THEME.hitMin, vp.s(compact ? 58 : 66));
    const secondH = Math.max(THEME.hitMin, vp.s(compact ? 44 : 48));
    const gridGap = vp.s(compact ? 8 : 10);
    const gapStartGrid = vp.s(compact ? 12 : 15);
    const bottomPad = vp.s(compact ? 14 : 24);
    const groupH = startH + gapStartGrid + secondH * 2 + gridGap;
    const groupTop = safe.y + safe.h - bottomPad - groupH;
    this.addImageButton({
      key: 'title_btn_primary',
      x: cx,
      y: groupTop + startH / 2,
      w: Math.min(contentW * 0.88, 330),
      h: startH,
      label: t('start'),
      fontSize: vp.fs(compact ? 23 : 26),
      onTap: () => {
        SFX.unlock();
        this.goto('charselect');
      },
    });

    const entries: Array<[string, TapHandler, boolean]> = [
      [t('menu_shop'), () => this.goto('shop'), false],
      [t('menu_codex'), () => this.goto('codex'), Meta.codexHasNew()],
      [t('menu_ach'), () => this.goto('achievements'), false],
      [t('menu_settings'), () => this.goto('settings'), false],
    ];
    const gridW = Math.min(contentW, 360);
    const cellW = (gridW - gridGap) / 2;
    const gridTop = groupTop + startH + gapStartGrid;
    entries.forEach(([label, fn, badge], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      this.addImageButton({
        key: 'title_btn_secondary',
        x: cx - gridW / 2 + cellW / 2 + col * (cellW + gridGap),
        y: gridTop + secondH / 2 + row * (secondH + gridGap),
        w: cellW,
        h: secondH,
        label,
        fontSize: vp.fs(compact ? 14 : 15),
        badge,
        onTap: fn,
      });
    });
  }

  private addLogo(x: number, y: number, maxW: number, maxH: number): Phaser.GameObjects.Image {
    const key = getLang() === 'zh' ? 'title_logo_zh' : 'title_logo_en';
    const logo = this.add.image(x, y, key).setOrigin(0.5).setDepth(5);
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    logo.setScale(scale);
    return logo;
  }

  private addCoverImage(key: string): Phaser.GameObjects.Image {
    const vp = this.vp;
    const img = this.add.image(vp.w / 2, vp.h / 2, key).setOrigin(0.5);
    const scale = Math.max(vp.w / img.width, vp.h / img.height) * 1.045;
    img.setScale(scale);
    return img;
  }

  private addImageButton(opts: ImageButtonOpts): Phaser.GameObjects.Container {
    const c = this.add.container(opts.x, opts.y).setDepth(opts.key === 'title_btn_primary' ? 7 : 6);
    const bg = this.add.image(0, 0, opts.key).setDisplaySize(opts.w, opts.h);
    const txt = this.add.text(0, -opts.h * 0.015, opts.label, {
      fontFamily: FONT,
      fontSize: opts.fontSize + 'px',
      fontStyle: 'bold',
      color: PAL.inkCss,
      stroke: '#FFFDF6',
      strokeThickness: opts.key === 'title_btn_primary' ? 4 : 3,
    }).setOrigin(0.5);
    const maxTextW = opts.w * (opts.key === 'title_btn_primary' ? 0.64 : 0.68);
    if (txt.width > maxTextW) txt.setScale(maxTextW / txt.width);
    c.add([bg, txt]);

    if (opts.badge) {
      const dot = this.add.circle(opts.w / 2 - Math.max(18, opts.h * 0.28), -opts.h / 2 + Math.max(15, opts.h * 0.27), 5, 0xe85868)
        .setStrokeStyle(2, 0xffffff);
      c.add(dot);
    }

    const hit = this.add.zone(opts.x, opts.y, opts.w, Math.max(opts.h, THEME.hitMin))
      .setOrigin(0.5)
      .setDepth(c.depth + 1)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      this.tweens.add({ targets: c, scale: 1.025, duration: 120, ease: 'Sine.easeOut' });
    });
    hit.on('pointerout', () => {
      this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Sine.easeOut' });
    });
    hit.on('pointerdown', () => {
      this.tweens.add({ targets: c, scale: 0.975, duration: 80, ease: 'Sine.easeOut' });
    });
    hit.on('pointerup', () => {
      this.tweens.add({ targets: c, scale: 1.02, duration: 90, ease: 'Back.easeOut' });
      SFX.uiClick();
      opts.onTap();
    });
    return c;
  }

  private addAmbientMotes(layer: Phaser.GameObjects.Container, landscape: boolean): void {
    const vp = this.vp;
    const safe = vp.safe;
    const n = landscape ? 18 : 13;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.FloatBetween(safe.x + safe.w * (landscape ? 0.44 : 0.06), safe.x + safe.w * 0.96);
      const y = Phaser.Math.FloatBetween(safe.y + safe.h * 0.08, safe.y + safe.h * 0.88);
      const mote = this.add.image(x, y, Math.random() < 0.38 ? 'p_star' : 'p_dot')
        .setTint([PAL.petal, PAL.rain, PAL.spark, PAL.playerGlow][Math.floor(Math.random() * 4)])
        .setAlpha(Phaser.Math.FloatBetween(0.32, 0.7))
        .setScale(Phaser.Math.FloatBetween(0.28, 0.65));
      layer.add(mote);
      this.tweens.add({
        targets: mote,
        y: y + Phaser.Math.FloatBetween(-12, 12),
        x: x + Phaser.Math.FloatBetween(-10, 10),
        alpha: Phaser.Math.FloatBetween(0.25, 0.85),
        duration: Phaser.Math.Between(1800, 3400),
        delay: Phaser.Math.Between(0, 900),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private bindParallax(bg: Phaser.GameObjects.Image, layer: Phaser.GameObjects.Container, landscape: boolean): void {
    const vp = this.vp;
    const target = { x: 0, y: 0 };
    const onMove = (p: Phaser.Input.Pointer): void => {
      target.x = Phaser.Math.Clamp((p.x / vp.w - 0.5) * 2, -1, 1);
      target.y = Phaser.Math.Clamp((p.y / vp.h - 0.5) * 2, -1, 1);
    };
    const update = (): void => {
      const strength = landscape ? 10 : 5;
      bg.x = Phaser.Math.Linear(bg.x, vp.w / 2 - target.x * strength, 0.045);
      bg.y = Phaser.Math.Linear(bg.y, vp.h / 2 - target.y * strength * 0.55, 0.045);
      layer.x = Phaser.Math.Linear(layer.x, target.x * strength * 0.45, 0.05);
      layer.y = Phaser.Math.Linear(layer.y, target.y * strength * 0.25, 0.05);
    };
    this.input.on('pointermove', onMove);
    this.events.on('update', update);
    this.titleCleanups.push(
      () => this.input.off('pointermove', onMove),
      () => this.events.off('update', update),
    );
  }

  private startPetalFall(): void {
    const vp = this.vp;
    this.petalTimer = this.time.addEvent({
      delay: 620,
      loop: true,
      callback: () => {
        const img = this.add.image(Math.random() * vp.w, -20, 'p_petal')
          .setTint([PAL.petal, PAL.blade, PAL.playerGlow][Math.floor(Math.random() * 3)])
          .setAlpha(0.58)
          .setScale(0.7 + Math.random() * 0.45)
          .setDepth(8);
        this.tweens.add({
          targets: img,
          y: vp.h + 30,
          x: img.x + (Math.random() - 0.5) * 160,
          rotation: (Math.random() - 0.5) * 6,
          duration: 6500 + Math.random() * 3600,
          onComplete: () => img.destroy(),
        });
      },
    });
    this.titleCleanups.push(() => {
      this.petalTimer?.remove();
      this.petalTimer = null;
    });
  }

  private bindAudioUnlock(): void {
    this.audioUnlock = () => SFX.unlock();
    this.input.once('pointerdown', this.audioUnlock);
    this.titleCleanups.push(() => {
      if (this.audioUnlock) this.input.off('pointerdown', this.audioUnlock);
      this.audioUnlock = null;
    });
  }

  private clearTitleRuntime(): void {
    this.titleCleanups.forEach((f) => f());
    this.titleCleanups = [];
  }

  protected goBack(): void {
    // Title 是根场景，无返回
  }
}
