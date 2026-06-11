// 菜单场景基类：resize/语言切换全量重建、统一返回、页头工具
import Phaser from 'phaser';
import { FONT, onLangChange, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { back, go, SceneKey } from '../core/router';
import { Viewport } from './Viewport';
import { Rect, inset } from './layout';
import { THEME } from './theme';
import { Modal } from './widgets/Modal';
import { UIButton } from './widgets/UIButton';

export abstract class UIScene extends Phaser.Scene {
  protected vp!: Viewport;
  private cleanups: Array<() => void> = [];

  create(): void {
    this.vp = Viewport.get();
    this.cameras.main.setBackgroundColor(PAL.paperCss);
    this.buildLayout();

    const offVp = this.vp.onChange(() => {
      if (this.scene.isActive()) this.rebuild();
    });
    const offLang = onLangChange(() => {
      if (this.scene.isActive()) this.rebuild();
    });
    const esc = (): void => {
      if (Modal.closeTop()) return;
      this.goBack();
    };
    this.input.keyboard?.on('keydown-ESC', esc);
    this.cleanups = [offVp, offLang, () => this.input.keyboard?.off('keydown-ESC', esc)];
    this.events.once('shutdown', () => {
      this.cleanups.forEach((f) => f());
      this.cleanups = [];
    });
  }

  /** 全部 UI 在此一次性构建；resize/语言切换时整页重建 */
  protected abstract buildLayout(): void;

  protected rebuild(): void {
    this.children.removeAll(true);
    this.buildLayout();
  }

  protected goto(key: SceneKey, data?: object): void {
    go(this, key, data);
  }

  protected goBack(): void {
    back(this);
  }

  /** 页头：返回按钮 + 居中标题；返回页头下方的内容安全矩形 */
  protected buildHeader(title: string): Rect {
    const safe = inset(this.vp.safe, THEME.gapSm, THEME.gapMd);
    const headH = Math.max(THEME.hitMin, this.vp.s(52));
    const backBtn = new UIButton(this, safe.x + THEME.hitMin / 2 + 2, safe.y + headH / 2, {
      w: Math.max(THEME.hitMin, this.vp.s(64)),
      h: THEME.hitMin,
      label: '‹ ' + t('ui_back'),
      fontSize: this.vp.fs(15),
      onTap: () => this.goBack(),
    });
    backBtn.setX(safe.x + backBtn.width / 2);
    this.add.text(safe.x + safe.w / 2, safe.y + headH / 2, title, {
      fontFamily: FONT,
      fontSize: this.vp.fs(THEME.fontH1) + 'px',
      fontStyle: 'bold',
      color: PAL.inkCss,
      stroke: '#FFFFFF',
      strokeThickness: 6,
    }).setOrigin(0.5);
    return { x: safe.x, y: safe.y + headH + THEME.gapSm, w: safe.w, h: safe.h - headH - THEME.gapSm };
  }
}
