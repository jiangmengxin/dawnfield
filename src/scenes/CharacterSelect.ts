// 角色选择：30 常规格 + 隐藏角色解锁后无痕加入；解锁状态读存档（成就解锁，M4 接入）
// 未解锁角色显示 ??? + 解锁条件（对应成就名）
import { t } from '../i18n';
import { CHARACTERS } from '../content/characters';
import { ACHIEVEMENTS } from '../content/achievements';
import { Meta } from '../core/MetaState';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';

const TARGET_CHARS = 30; // 常规角色目标量级；隐藏角色未解锁前不占位

export class CharacterSelectScene extends UIScene {
  constructor() {
    super('charselect');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_charSelect'));
    const panel = new ScrollPanel(this, content);
    const compact = this.vp.bp === 'compact';
    const fontScale = compact ? 0.9 : 1;

    // M16 隐藏角色：未解锁不占位不显示（与普通 ??? 占位区分——存在本身就是秘密）
    const visible = CHARACTERS.filter((c) =>
      !c.secret || c.unlockAch === null || Meta.isUnlocked('chars', c.id));
    const items: CardGridItem[] = visible.map((c) => {
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
        // M14 角色专属机制：金色 trait 行（未解锁角色保持 ??? 不剧透）
        subDesc: c.trait ? '✦ ' + t('trait_' + c.trait) : undefined,
        color: c.color,
        fontScale,
        // M16 揭示动效：隐藏角色解锁后首次亮相（markTip 全存档一次，resize 重建不复播）
        reveal: c.secret === true && Meta.markTip('reveal_' + c.id),
        onTap: () => this.goto('mapselect', { charId: c.id }),
      };
    });
    for (let i = visible.length; i < TARGET_CHARS; i++) {
      items.push({ title: '', desc: t('ui_lockedHint'), locked: true, fontScale });
    }

    // C2：竖屏降卡高（aspect ↓）；大屏少一列+大间距放宽，缓解拥挤
    buildCardGrid(panel, {
      items,
      minCellW: compact ? 150 : 184,
      aspect: compact ? 1.08 : 1.14,
      gap: compact ? undefined : 16,
    });
  }
}
