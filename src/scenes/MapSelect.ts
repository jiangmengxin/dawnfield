// 地图选择：8 格（3 真实 + 5 锁定占位）；解锁链 = 通关上一图的成就（unlockAch）
// 未解锁地图显示 ???+解锁条件；卡片标注各图名义时长（12/15/18 分钟差异）
import { t } from '../i18n';
import { MAPS } from '../content/maps';
import { ACHIEVEMENTS } from '../content/achievements';
import { ensureMapAssets } from '../gfx/textures';
import { Meta } from '../core/MetaState';
import { resetStack } from '../core/router';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import type { RunLaunchData } from '../systems/context';

const TARGET_MAPS = 8; // 1.0 目标量级

export class MapSelectScene extends UIScene {
  private charId = 'spark';

  constructor() {
    super('mapselect');
  }

  init(data: { charId?: string }): void {
    this.charId = data.charId ?? 'spark';
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_mapSelect'));
    const panel = new ScrollPanel(this, content);
    const compact = this.vp.bp === 'compact';
    const fontScale = compact ? 0.9 : 1;

    const items: CardGridItem[] = MAPS.map((m) => {
      const unlocked = m.unlockAch === null || Meta.isUnlocked('maps', m.id);
      if (!unlocked) {
        const ach = ACHIEVEMENTS.find((a) => a.id === m.unlockAch);
        return {
          title: '???',
          desc: ach ? t('ui_unlockBy').replace('{a}', t('ach_' + ach.id)) : t('ui_lockedHint'),
          locked: true,
          fontScale,
        };
      }
      ensureMapAssets(this, m.id); // 图标纹理懒生成（幂等）
      return {
        icon: m.icon,
        iconScale: m.iconScale,
        title: t('map_' + m.id),
        desc: compact ? undefined : t('map_' + m.id + '_d'),
        tag: m.minutes + ' ' + t('ui_minutes'),
        color: m.color,
        fontScale,
        onTap: () => {
          resetStack();
          const data: RunLaunchData = { charId: this.charId, mapId: m.id };
          this.scene.start('game', data);
        },
      };
    });
    for (let i = MAPS.length; i < TARGET_MAPS; i++) {
      items.push({ title: '', desc: t('ui_lockedHint'), locked: true, fontScale });
    }

    buildCardGrid(panel, {
      items,
      minCellW: compact ? 160 : 210,
      aspect: 0.92,
    });
  }
}
