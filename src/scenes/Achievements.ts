// 成就页：首批 12 个；未达成显示 ??? + 达成条件，达成后点亮金边
import Phaser from 'phaser';
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { ACHIEVEMENTS } from '../content/achievements';
import { MAPS } from '../content/maps';
import { ensureMapAssets } from '../gfx/textures';
import { Meta } from '../core/MetaState';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Card } from '../ui/widgets/Card';
import { THEME } from '../ui/theme';

export class AchievementsScene extends UIScene {
  constructor() {
    super('achievements');
  }

  protected buildLayout(): void {
    // 通关类成就图标用各图 Boss 纹理：先确保地图资产就绪（幂等）
    for (const m of MAPS) ensureMapAssets(this, m.id);
    const content = this.buildHeader(t('scn_achievements'));

    const got = ACHIEVEMENTS.filter((a) => Meta.hasAch(a.id)).length;
    const note = this.add.text(content.x + content.w / 2, content.y + 10,
      t('ach_count') + '  ' + got + ' / ' + ACHIEVEMENTS.length, {
        fontFamily: FONT, fontSize: this.vp.fs(15) + 'px', fontStyle: 'bold',
        color: got > 0 ? '#C8902A' : PAL.inkSoft,
      }).setOrigin(0.5, 0);
    const top = content.y + note.height + THEME.gapMd + 10;

    const panel = new ScrollPanel(this, { x: content.x, y: top, w: content.w, h: content.y + content.h - top });
    const rowH = Math.max(64, this.vp.s(72));
    const rowW = panel.view.w - 10;
    const gap = THEME.gapSm;
    const fontScale = this.vp.bp === 'compact' ? 0.9 : 1;

    panel.setContent((add) => {
      ACHIEVEMENTS.forEach((spec, i) => {
        const unlocked = Meta.hasAch(spec.id);
        // 附带解锁奖励的成就：描述里点明（角色名达成前不剧透显示 ???；地图名不剧透内容，直接显示）
        let reward = '';
        if (spec.unlockChar) {
          reward += ' · ' + t('ach_reward').replace('{c}', unlocked ? t('char_' + spec.unlockChar) : '???');
        }
        if (spec.unlockMap) {
          reward += ' · ' + t('ach_rewardMap').replace('{m}', t('map_' + spec.unlockMap));
        }
        if (spec.rewardCoins) {
          reward += ' · ' + t('ach_rewardCoins').replace('{n}', String(spec.rewardCoins));
        }
        const card = new Card(this, rowW / 2, i * (rowH + gap) + rowH / 2, {
          w: rowW, h: rowH,
          layout: 'row',
          icon: spec.icon,
          title: t('ach_' + spec.id),
          desc: t('ach_' + spec.id + '_d') + reward,
          tag: unlocked ? '★' : undefined,
          tagColor: '#C8902A',
          color: unlocked ? 0xe2b452 : undefined,
          locked: !unlocked,
          fontScale,
        });
        add(card as unknown as Phaser.GameObjects.GameObject);
      });
      return ACHIEVEMENTS.length * (rowH + gap);
    });
  }
}
