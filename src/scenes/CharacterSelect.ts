// 角色选择：16 格（M1：1 真实 + 15 锁定占位）
import { t } from '../i18n';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';

export class CharacterSelectScene extends UIScene {
  constructor() {
    super('charselect');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_charSelect'));
    const panel = new ScrollPanel(this, content);

    const items: CardGridItem[] = [
      {
        icon: 'player',
        iconScale: 1.6,
        title: t('char_spark'),
        desc: this.vp.bp === 'compact' ? t('char_spark_w') : t('char_spark_d'),
        tag: t('w_blade'),
        color: 0xe2b452,
        fontScale: this.vp.bp === 'compact' ? 0.9 : 1,
        onTap: () => this.goto('mapselect', { charId: 'spark' }),
      },
    ];
    for (let i = 1; i < 16; i++) {
      items.push({
        title: '',
        desc: t('ui_lockedHint'),
        locked: true,
        fontScale: this.vp.bp === 'compact' ? 0.9 : 1,
      });
    }

    buildCardGrid(panel, {
      items,
      minCellW: this.vp.bp === 'compact' ? 150 : 180,
      aspect: 1.18,
    });
  }
}
