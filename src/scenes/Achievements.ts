// 成就占位页：锁定行卡列表（M3 接成就引擎）
import Phaser from 'phaser';
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Card } from '../ui/widgets/Card';
import { THEME } from '../ui/theme';

export class AchievementsScene extends UIScene {
  constructor() {
    super('achievements');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_achievements'));

    const note = this.add.text(content.x + content.w / 2, content.y + 10, t('ach_coming'), {
      fontFamily: FONT, fontSize: this.vp.fs(14) + 'px', color: PAL.inkSoft,
      align: 'center', wordWrap: { width: content.w - 24 },
    }).setOrigin(0.5, 0);
    const top = content.y + note.height + THEME.gapMd + 10;

    const panel = new ScrollPanel(this, { x: content.x, y: top, w: content.w, h: content.y + content.h - top });
    const rowH = Math.max(64, this.vp.s(72));
    const rowW = panel.view.w - 10;
    const gap = THEME.gapSm;
    const count = 12;

    panel.setContent((add) => {
      for (let i = 0; i < count; i++) {
        const card = new Card(this, rowW / 2, i * (rowH + gap) + rowH / 2, {
          w: rowW, h: rowH,
          title: '',
          desc: t('ui_lockedHint'),
          layout: 'row',
          locked: true,
          fontScale: this.vp.bp === 'compact' ? 0.9 : 1,
        });
        add(card as unknown as Phaser.GameObjects.GameObject);
      }
      return count * (rowH + gap);
    });
  }
}
