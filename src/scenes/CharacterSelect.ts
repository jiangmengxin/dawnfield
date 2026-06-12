// 角色选择：16 格（8 真实 + 8 锁定占位）；解锁状态读存档（成就解锁，M4 接入）
// 未解锁角色显示 ??? + 解锁条件（对应成就名）
import { t } from '../i18n';
import { CHARACTERS } from '../content/characters';
import { ACHIEVEMENTS } from '../content/achievements';
import { Meta } from '../core/MetaState';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';

const TARGET_CHARS = 16; // 1.0 目标量级

export class CharacterSelectScene extends UIScene {
  constructor() {
    super('charselect');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_charSelect'));
    const panel = new ScrollPanel(this, content);
    const compact = this.vp.bp === 'compact';
    const fontScale = compact ? 0.9 : 1;

    const items: CardGridItem[] = CHARACTERS.map((c) => {
      const unlocked = c.unlockAch === null || Meta.isUnlocked('chars', c.id);
      if (!unlocked) {
        // ??? + 解锁条件（成就名；成就表后续调整时此处自动跟随）
        const ach = ACHIEVEMENTS.find((a) => a.id === c.unlockAch);
        return {
          title: '???',
          desc: ach ? t('ui_unlockBy').replace('{a}', t('ach_' + ach.id)) : t('ui_lockedHint'),
          locked: true,
          fontScale,
        };
      }
      return {
        icon: c.tex,
        iconScale: c.texScale,
        title: t('char_' + c.id),
        desc: t('char_' + c.id + '_d'),
        tag: t('w_' + c.weapon),
        color: c.color,
        fontScale,
        onTap: () => this.goto('mapselect', { charId: c.id }),
      };
    });
    for (let i = CHARACTERS.length; i < TARGET_CHARS; i++) {
      items.push({ title: '', desc: t('ui_lockedHint'), locked: true, fontScale });
    }

    buildCardGrid(panel, {
      items,
      minCellW: compact ? 150 : 180,
      aspect: 1.18,
    });
  }
}
