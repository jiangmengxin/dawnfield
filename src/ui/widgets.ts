// 轻量 UI 组件：纸面圆角按钮
import Phaser from 'phaser';
import { FONT } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';

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
  const fill = opts.fill ?? PAL.cardBg;
  const edge = opts.edge ?? PAL.cardEdge;
  const g = scene.add.graphics();
  const draw = (over: boolean) => {
    g.clear();
    g.fillStyle(0x5a5248, 0.08);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 14);
    g.fillStyle(over ? 0xfff8e8 : fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(2.5, edge, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  draw(false);
  const txt = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: (opts.fontSize ?? 22) + 'px',
    fontStyle: 'bold',
    color: PAL.inkCss,
  }).setOrigin(0.5);
  const c = scene.add.container(x, y, [g, txt]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => draw(true));
  c.on('pointerout', () => draw(false));
  c.on('pointerdown', () => c.setScale(0.96));
  c.on('pointerup', () => {
    c.setScale(1);
    SFX.uiClick();
    onClick();
  });
  c.setData('label', txt);
  return c;
}

export function setButtonLabel(c: Phaser.GameObjects.Container, label: string): void {
  (c.getData('label') as Phaser.GameObjects.Text).setText(label);
}
