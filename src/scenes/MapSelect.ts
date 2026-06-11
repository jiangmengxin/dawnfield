// 地图选择：8 格（M1：1 真实 + 7 锁定占位）
import { t } from '../i18n';
import { resetStack } from '../core/router';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';

export interface RunLaunchData {
  charId: string;
  mapId: string;
}

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

    const items: CardGridItem[] = [
      {
        icon: 'd_flower1',
        iconScale: 2.4,
        title: t('map_meadow'),
        desc: this.vp.bp === 'compact' ? undefined : t('map_meadow_d'),
        tag: '12 ' + t('ui_minutes'),
        color: 0xa8cd8c,
        fontScale: this.vp.bp === 'compact' ? 0.9 : 1,
        onTap: () => {
          resetStack();
          const data: RunLaunchData = { charId: this.charId, mapId: 'meadow' };
          this.scene.start('game', data);
        },
      },
    ];
    for (let i = 1; i < 8; i++) {
      items.push({
        title: '',
        desc: t('ui_lockedHint'),
        locked: true,
        fontScale: this.vp.bp === 'compact' ? 0.9 : 1,
      });
    }

    buildCardGrid(panel, {
      items,
      minCellW: this.vp.bp === 'compact' ? 160 : 210,
      aspect: 0.92,
    });
  }
}
