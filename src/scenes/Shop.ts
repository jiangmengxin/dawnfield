// 商店占位页：永久强化槽位（M3 实装金币与购买）
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import { THEME } from '../ui/theme';

export class ShopScene extends UIScene {
  constructor() {
    super('shop');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_shop'));

    // 顶部提示横幅
    const note = this.add.text(content.x + content.w / 2, content.y + 10, t('shop_coming'), {
      fontFamily: FONT, fontSize: this.vp.fs(14) + 'px', color: PAL.inkSoft,
      align: 'center', wordWrap: { width: content.w - 24 },
    }).setOrigin(0.5, 0);
    const noteH = note.height + THEME.gapMd;

    const panel = new ScrollPanel(this, {
      x: content.x, y: content.y + noteH + 10, w: content.w, h: content.h - noteH - 10,
    });

    const items: CardGridItem[] = [];
    for (let i = 0; i < 12; i++) {
      items.push({
        title: '',
        desc: t('shop_slotHint'),
        locked: true,
        fontScale: this.vp.bp === 'compact' ? 0.9 : 1,
      });
    }
    buildCardGrid(panel, {
      items,
      minCellW: this.vp.bp === 'compact' ? 140 : 170,
      aspect: 1.05,
    });
  }
}
