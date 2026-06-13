// 主菜单枢纽：开始 → 选人选图；商店/图鉴/成就/设置入口
import Phaser from 'phaser';
import { FONT, getLang, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { Meta } from '../core/MetaState';
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

    // 草甸装饰（H2）：限制在左右边缘带，避开中央标题/角色/按钮安全列，数量随屏宽自适应
    const rnd = Phaser.Math.FloatBetween;
    const pool = ['d_grass0', 'd_grass1', 'd_grass2', 'd_flower0', 'd_flower1', 'd_flower2', 'd_pebble0'];
    const decoN = Math.round(Phaser.Math.Clamp(vp.w / 26, 10, 22));
    for (let i = 0; i < decoN; i++) {
      const onLeft = Math.random() < 0.5;
      const x = onLeft ? rnd(0, vp.w * 0.2) : rnd(vp.w * 0.8, vp.w);
      this.add.image(x, rnd(safe.y, safe.y + safe.h), pool[Math.floor(rnd(0, pool.length))])
        .setAlpha(0.7).setScale(rnd(0.8, 1.4)).setDepth(0);
    }

    // 居中两栏布局（C1）：以「标题区 + 按钮区」为主体，二者间留可调缓冲带，整组在安全区垂直居中
    const landscape = safe.w > safe.h;
    const startH = Math.max(THEME.hitMin, vp.s(64));
    const menuBtnH = Math.max(THEME.hitMin, vp.s(48));
    const menuTotalW = Math.min(safe.w - 32, 460);
    const oneRow = menuTotalW / 4 >= 96;
    const menuH = oneRow ? menuBtnH : menuBtnH * 2 + THEME.gapSm;
    const titleH = vp.s(compact ? 96 : 128);
    const buffer = landscape ? vp.s(36) : vp.s(compact ? 66 : 140); // 标题↔按钮缓冲带（含小主角）
    const gapStartMenu = vp.s(18);
    const group = titleH + buffer + startH + gapStartMenu + menuH;
    const top = safe.y + Math.max(vp.s(12), (safe.h - group) / 2);
    const bufferY = top + titleH;
    const startY = bufferY + buffer + startH / 2;
    const menuY = startY + startH / 2 + gapStartMenu;

    // 标题（H3：主/副标题用同一缩放系数，避免窄屏比例错位）
    const titleY = top + titleH * 0.42;
    const titleZh = this.add.text(cx, titleY, getLang() === 'zh' ? '晨 露 之 野' : 'DAWNFIELD', {
      fontFamily: FONT, fontSize: vp.fs(compact ? 54 : 72) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(90,82,72,0.18)', 8).setDepth(2);
    const ts = titleZh.width > safe.w - 44 ? (safe.w - 44) / titleZh.width : 1;
    titleZh.setScale(ts);
    this.add.text(cx, titleY + vp.s(compact ? 42 : 54) * ts, getLang() === 'zh' ? 'D A W N F I E L D' : 'a morning-meadow survivors', {
      fontFamily: FONT, fontSize: vp.fs(18) + 'px', fontStyle: 'bold', color: '#B8A878',
    }).setOrigin(0.5).setScale(ts).setDepth(2);

    // 小主角（弱化为缓冲带里的轻装饰）：竖屏小幅浮动，横屏隐藏（C1）
    if (!landscape && buffer >= vp.s(60)) {
      const heroY = bufferY + buffer / 2;
      this.add.image(cx, heroY + vp.s(22), 'shadow').setScale(1.1, 0.9).setAlpha(0.5).setDepth(1);
      const hero = this.add.image(cx, heroY, 'player').setScale(1.5).setDepth(2);
      this.tweens.add({ targets: hero, y: '-=8', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // 开始（主按钮）
    new UIButton(this, cx, startY, {
      w: Math.min(280, safe.w - 48), h: startH,
      label: t('start'), fontSize: vp.fs(26),
      onTap: () => {
        SFX.unlock();
        this.goto('charselect');
      },
    }).setDepth(3);

    // 次级入口：商店 / 图鉴 / 成就 / 设置（图鉴有新点亮条目时带红点角标）
    const entries: Array<[string, () => void, boolean]> = [
      [t('menu_shop'), () => this.goto('shop'), false],
      [t('menu_codex'), () => this.goto('codex'), Meta.codexHasNew()],
      [t('menu_ach'), () => this.goto('achievements'), false],
      [t('menu_settings'), () => this.goto('settings'), false],
    ];
    if (oneRow) {
      // 一行四个
      const cells = hstack(rect(cx - menuTotalW / 2, menuY, menuTotalW, menuBtnH), THEME.gapSm, ['flex', 'flex', 'flex', 'flex']);
      entries.forEach(([label, fn, badge], i) => {
        const c = cells[i];
        new UIButton(this, c.x + c.w / 2, c.y + c.h / 2, {
          w: c.w, h: c.h, label, fontSize: vp.fs(15), badge, onTap: fn,
        }).setDepth(3);
      });
    } else {
      // 2×2 网格（窄竖屏）
      const gw = Math.min(safe.w - 40, 340);
      const cells = gridCells(rect(cx - gw / 2, menuY, gw, menuBtnH * 2 + THEME.gapSm), 2, 2, THEME.gapSm);
      entries.forEach(([label, fn, badge], i) => {
        const c = cells[i];
        new UIButton(this, c.x + c.w / 2, c.y + c.h / 2, {
          w: c.w, h: c.h, label, fontSize: vp.fs(15), badge, onTap: fn,
        }).setDepth(3);
      });
    }

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
