// 轻量提示横幅：菜单场景统一的瞬时提示（U3：收敛 MapSelect/Shop 各自的实现）
// 安全区顶部偏上居中，淡入→停留→淡出后自毁；可定制颜色/停留时长/纵向比例
import Phaser from 'phaser';
import { FONT } from '../../i18n';
import { Viewport } from '../Viewport';

export interface ToastOpts {
  color?: string;
  hold?: number;
  yRatio?: number;
}

export function showToast(scene: Phaser.Scene, msg: string, opts: ToastOpts = {}): void {
  const vp = Viewport.get();
  const safe = vp.safe;
  const txt = scene.add.text(safe.x + safe.w / 2, safe.y + safe.h * (opts.yRatio ?? 0.16), msg, {
    fontFamily: FONT, fontSize: vp.fs(17) + 'px', fontStyle: 'bold', color: opts.color ?? '#C06870',
    stroke: '#FFFFFF', strokeThickness: 5, align: 'center',
    wordWrap: { width: safe.w - 40, useAdvancedWrap: true },
  }).setOrigin(0.5).setDepth(600).setAlpha(0);
  scene.tweens.add({
    targets: txt, alpha: 1, duration: 180,
    onComplete: () => {
      scene.tweens.add({
        targets: txt, alpha: 0, delay: opts.hold ?? 1250, duration: 300,
        onComplete: () => txt.destroy(),
      });
    },
  });
}
