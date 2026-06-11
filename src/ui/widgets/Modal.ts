// 弹窗：暖白柔光遮罩 + 弹入面板 + 模态栈（ESC/back 关最顶层）
import Phaser from 'phaser';
import { FONT } from '../../i18n';
import { PAL } from '../../gfx/palette';
import { Rect, inset } from '../layout';
import { THEME } from '../theme';

export interface ModalHandle {
  close(): void;
}

export interface ModalOpts {
  title?: string;
  w?: number;
  h?: number;
  dismissable?: boolean;
  onClose?: () => void;
  build: (panel: Phaser.GameObjects.Container, inner: Rect) => void;
}

const stack: ModalHandle[] = [];

export class Modal {
  /** 关闭最顶层弹窗；返回是否有弹窗被关闭 */
  static closeTop(): boolean {
    const top = stack[stack.length - 1];
    if (!top) return false;
    top.close();
    return true;
  }

  static get isOpen(): boolean {
    return stack.length > 0;
  }

  static open(scene: Phaser.Scene, opts: ModalOpts): ModalHandle {
    const sw = scene.scale.width;
    const sh = scene.scale.height;
    const pw = Math.min(opts.w ?? 420, sw - 32);
    const ph = Math.min(opts.h ?? 380, sh - 48);

    const veil = scene.add.rectangle(0, 0, sw, sh, PAL.paper, 0.72)
      .setOrigin(0).setDepth(500).setInteractive();

    const panel = scene.add.container(sw / 2, sh / 2).setDepth(501);
    const g = scene.add.graphics();
    g.fillStyle(PAL.ink, 0.12);
    g.fillRoundedRect(-pw / 2 + 4, -ph / 2 + 6, pw, ph, THEME.radiusLg);
    g.fillStyle(PAL.cardBg, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, THEME.radiusLg);
    g.lineStyle(THEME.strokeCard, PAL.cardEdge, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, THEME.radiusLg);
    panel.add(g);

    let inner: Rect = { x: -pw / 2, y: -ph / 2, w: pw, h: ph };
    inner = inset(inner, THEME.gapMd);
    if (opts.title) {
      panel.add(scene.add.text(0, inner.y + 4, opts.title, {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0.5, 0));
      inner = { ...inner, y: inner.y + 44, h: inner.h - 44 };
    }

    panel.setScale(0.86).setAlpha(0);
    scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });

    let closed = false;
    const handle: ModalHandle = {
      close() {
        if (closed) return;
        closed = true;
        const i = stack.indexOf(handle);
        if (i >= 0) stack.splice(i, 1);
        veil.destroy();
        panel.destroy();
        opts.onClose?.();
      },
    };
    stack.push(handle);

    if (opts.dismissable ?? true) {
      veil.on('pointerup', () => handle.close());
    }

    opts.build(panel, inner);
    return handle;
  }
}
