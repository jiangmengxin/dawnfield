// 主菜单枢纽：开始 → 选人选图；商店/图鉴/成就/设置入口
import Phaser from 'phaser';
import { FONT, getLang, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { resetStack } from '../core/router';
import { UIScene } from '../ui/UIScene';
import { UIButton } from '../ui/widgets/UIButton';
import { THEME } from '../ui/theme';
import { gridCells, hstack, rect } from '../ui/layout';

export class TitleScene extends UIScene {
  private petalTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('title');
  }

  protected buildLayout(): void {
    resetStack();
    this.petalTimer?.remove();
    const vp = this.vp;
    const safe = vp.safe;
    const cx = safe.x + safe.w / 2;
    const compact = safe.h < 620;

    // 草甸装饰
    const rnd = Phaser.Math.FloatBetween;
    const pool = ['d_grass0', 'd_grass1', 'd_grass2', 'd_flower0', 'd_flower1', 'd_flower2', 'd_pebble0'];
    for (let i = 0; i < 26; i++) {
      this.add.image(rnd(0, vp.w), rnd(0, vp.h), pool[Math.floor(rnd(0, pool.length))])
        .setAlpha(0.7).setScale(rnd(0.8, 1.4)).setDepth(0);
    }

    // 标题
    const titleZh = this.add.text(cx, safe.y + safe.h * 0.17, getLang() === 'zh' ? '晨 野' : 'DAWNFIELD', {
      fontFamily: FONT, fontSize: vp.fs(compact ? 54 : 72) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(90,82,72,0.18)', 8).setDepth(2);
    if (titleZh.width > safe.w - 44) titleZh.setScale((safe.w - 44) / titleZh.width);
    this.add.text(cx, titleZh.y + vp.s(compact ? 44 : 58), getLang() === 'zh' ? 'D A W N F I E L D' : 'a morning-meadow survivors', {
      fontFamily: FONT, fontSize: vp.fs(18) + 'px', fontStyle: 'bold', color: '#B8A878',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(cx, titleZh.y + vp.s(compact ? 70 : 90), t('subtitle'), {
      fontFamily: FONT, fontSize: vp.fs(15) + 'px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(2);

    // 主角飘浮 + 小怪溜达
    const heroY = safe.y + safe.h * 0.42;
    this.add.image(cx, heroY + 34, 'shadow').setScale(1.6, 1.2).setAlpha(0.7).setDepth(1);
    const hero = this.add.image(cx, heroY, 'player').setScale(2.2).setDepth(2);
    this.tweens.add({ targets: hero, y: '-=12', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    ['e_blob', 'e_midge', 'e_splitter'].forEach((tex, i) => {
      const blob = this.add.image(
        cx + (i - 1) * Math.min(180, safe.w * 0.28),
        heroY + 60 + (i % 2) * 20, tex,
      ).setAlpha(0.9).setDepth(1);
      this.tweens.add({ targets: blob, y: '-=6', duration: 900 + i * 240, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // 开始（主按钮）
    const startY = safe.y + safe.h * (compact ? 0.62 : 0.64);
    new UIButton(this, cx, startY, {
      w: Math.min(280, safe.w - 48), h: Math.max(THEME.hitMin, vp.s(64)),
      label: t('start'), fontSize: vp.fs(26),
      onTap: () => {
        SFX.unlock();
        this.goto('charselect');
      },
    }).setDepth(3);

    // 次级入口：商店 / 图鉴 / 成就 / 设置
    const entries: Array<[string, () => void]> = [
      [t('menu_shop'), () => this.goto('shop')],
      [t('menu_codex'), () => this.goto('codex')],
      [t('menu_ach'), () => this.goto('achievements')],
      [t('menu_settings'), () => this.goto('settings')],
    ];
    const rowY = startY + vp.s(60);
    const btnH = Math.max(THEME.hitMin, vp.s(48));
    const totalW = Math.min(safe.w - 32, 460);
    if (totalW / 4 >= 96) {
      // 一行四个
      const cells = hstack(rect(cx - totalW / 2, rowY, totalW, btnH), THEME.gapSm, ['flex', 'flex', 'flex', 'flex']);
      entries.forEach(([label, fn], i) => {
        const c = cells[i];
        new UIButton(this, c.x + c.w / 2, c.y + c.h / 2, {
          w: c.w, h: c.h, label, fontSize: vp.fs(15), onTap: fn,
        }).setDepth(3);
      });
    } else {
      // 2×2 网格（窄竖屏）
      const gw = Math.min(safe.w - 40, 340);
      const cells = gridCells(rect(cx - gw / 2, rowY, gw, btnH * 2 + THEME.gapSm), 2, 2, THEME.gapSm);
      entries.forEach(([label, fn], i) => {
        const c = cells[i];
        new UIButton(this, c.x + c.w / 2, c.y + c.h / 2, {
          w: c.w, h: c.h, label, fontSize: vp.fs(15), onTap: fn,
        }).setDepth(3);
      });
    }

    // 操作提示
    const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.add.text(cx, safe.y + safe.h - 14, isMobile ? t('hintMobile') : t('hintDesktop'), {
      fontFamily: FONT, fontSize: vp.fs(13) + 'px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(2);

    // 飘落花瓣
    this.petalTimer = this.time.addEvent({
      delay: 700, loop: true,
      callback: () => {
        const img = this.add.image(Math.random() * vp.w, -20, 'p_petal')
          .setTint([PAL.petal, PAL.blade, 0xffffff][Math.floor(Math.random() * 3)])
          .setAlpha(0.8).setScale(0.9 + Math.random() * 0.6).setDepth(50);
        this.tweens.add({
          targets: img,
          y: vp.h + 30,
          x: img.x + (Math.random() - 0.5) * 200,
          rotation: (Math.random() - 0.5) * 8,
          duration: 6000 + Math.random() * 4000,
          onComplete: () => img.destroy(),
        });
      },
    });
    this.events.once('shutdown', () => {
      this.petalTimer?.remove();
      this.petalTimer = null;
    });

    // 首次交互解锁音频（移动端）
    this.input.once('pointerdown', () => SFX.unlock());
  }

  protected goBack(): void {
    // Title 是根场景，无返回
  }
}
