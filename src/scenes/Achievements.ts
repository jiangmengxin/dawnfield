// 成就页：首批 12 个；未达成显示 ??? + 达成条件，达成后点亮金边
import Phaser from 'phaser';
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { ACHIEVEMENTS, AchievementSpec, LEGACY_ACHIEVEMENTS } from '../content/achievements';
import { MAPS } from '../content/maps';
import { ensureMapAssets } from '../gfx/textures';
import { Meta } from '../core/MetaState';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Card } from '../ui/widgets/Card';
import { GRID_PAD } from '../ui/widgets/CardGrid';
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
    const gap = THEME.gapSm;
    const fontScale = this.vp.bp === 'compact' ? 0.9 : 1;
    // C7：横屏改两列「宽扁横条卡」，竖屏保持单列列表
    const cols = this.vp.w > this.vp.h && panel.view.w >= 620 ? 2 : 1;
    const cardW = (panel.view.w - GRID_PAD.l - GRID_PAD.r - gap * (cols - 1)) / cols;

    // M13 legacy 区：被替换的纯计数成就仅当已解锁才渲染（永不回收，不可再达成）
    const legacy = LEGACY_ACHIEVEMENTS.filter((a) => Meta.hasAch(a.id));

    panel.setContent((add) => {
      const makeCard = (spec: AchievementSpec, cx: number, cy: number): void => {
        const unlocked = Meta.hasAch(spec.id);
        // M16 隐藏成就：未达成时连条件/奖励都不剧透（标题 ？？？ 由 Card locked 态统一渲染）
        const hiddenLocked = spec.hidden === true && !unlocked;
        let reward = '';
        if (spec.unlockChar) {
          reward += ' · ' + t('ach_reward').replace('{c}', unlocked ? t('char_' + spec.unlockChar) : '???');
        }
        if (spec.unlockMap) {
          reward += ' · ' + t('ach_rewardMap').replace('{m}', t('map_' + spec.unlockMap));
        }
        if (spec.unlockArcana) {
          reward += ' · ' + t('ach_rewardArc').replace('{a}', t('arc_' + spec.unlockArcana));
        }
        if (spec.rewardCoins) {
          reward += ' · ' + t('ach_rewardCoins').replace('{n}', String(spec.rewardCoins));
        }
        add(new Card(this, cx, cy, {
          w: cardW, h: rowH,
          layout: 'row',
          icon: spec.icon,
          title: t('ach_' + spec.id),
          desc: hiddenLocked ? t('ach_hiddenDesc') : t('ach_' + spec.id + '_d') + reward,
          tag: unlocked ? '★' : undefined,
          tagColor: '#C8902A',
          color: unlocked ? 0xe2b452 : undefined,
          locked: !unlocked,
          fontScale,
        }) as unknown as Phaser.GameObjects.GameObject);
      };
      const addGrid = (specs: AchievementSpec[], startY: number): number => {
        specs.forEach((spec, i) => {
          const cx = GRID_PAD.l + (i % cols) * (cardW + gap) + cardW / 2;
          const cy = startY + Math.floor(i / cols) * (rowH + gap) + rowH / 2;
          makeCard(spec, cx, cy);
        });
        return startY + Math.ceil(specs.length / cols) * (rowH + gap);
      };
      let y = addGrid([...ACHIEVEMENTS], GRID_PAD.t);
      if (legacy.length > 0) {
        const header = this.add.text(GRID_PAD.l + (panel.view.w - GRID_PAD.l - GRID_PAD.r) / 2, y + 14, '— ' + t('ach_legacy') + ' —', {
          fontFamily: FONT, fontSize: this.vp.fs(14) + 'px', fontStyle: 'bold', color: PAL.inkSoft,
        }).setOrigin(0.5, 0);
        add(header);
        y += 14 + header.height + THEME.gapSm;
        y = addGrid(legacy, y);
      }
      return y + GRID_PAD.t;
    });
  }
}
