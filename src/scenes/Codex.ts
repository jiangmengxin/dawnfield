// 图鉴：五类标签页；首遇点亮（MetaState.codex），未遇见显示 ???，新点亮带 New 角标
// 浏览某分类即清除该类 New 角标；锁定占位补齐到 1.0 目标量级
import { t } from '../i18n';
import { ARCANA_META, PASSIVE_META, WEAPON_META, ENEMIES, EnemyId, CHARACTERS, MAPS } from '../content';
import { ALL_DROPS, DROP_ITEMS } from '../content/dropItems';
import { ACHIEVEMENTS } from '../content/achievements';
import { ensureMapAssets } from '../gfx/textures';
import { CodexCat } from '../core/save';
import { Meta } from '../core/MetaState';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Tabs } from '../ui/widgets/Tabs';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import { THEME } from '../ui/theme';

// 1.0 目标量级（锁定占位补齐到这些数字；敌人按实装量展示，未遇见即 ???）
// M13：规则卡 10→16（6 张机制卡）
const TARGET = { weapons: 32, passives: 16, chars: 16, maps: 8, arcana: 16 } as const;

export class CodexScene extends UIScene {
  private tab: CodexCat = 'weapons';
  private panel: ScrollPanel | null = null;
  private savedScroll: Partial<Record<CodexCat, number>> = {};

  constructor() {
    super('codex');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_codex'));
    const tabH = Math.max(40, this.vp.s(44));

    new Tabs(this, { x: content.x, y: content.y, w: content.w, h: tabH }, [
      { id: 'weapons', label: t('codex_weapons') },
      { id: 'passives', label: t('codex_passives') },
      { id: 'enemies', label: t('codex_enemies') },
      { id: 'chars', label: t('codex_chars') },
      { id: 'maps', label: t('codex_maps') },
      { id: 'arcana', label: t('codex_arcana') },
    ], (id) => {
      if (this.panel) this.savedScroll[this.tab] = this.panel.scrollY;
      this.tab = id as CodexCat;
      this.fillPanel();
    }, this.tab);

    // C5：去掉"游玩中遇见即点亮"提示文字
    const top = content.y + tabH + THEME.gapSm;

    this.panel = new ScrollPanel(this, { x: content.x, y: top, w: content.w, h: content.y + content.h - top });
    this.fillPanel();
  }

  /** 已遇见 → 点亮卡（首次浏览前带 New 角标）；未遇见 → ??? */
  private entry(cat: CodexCat, id: string, item: Omit<CardGridItem, 'title'> & { title: string }): CardGridItem {
    if (!Meta.codexLit(cat, id)) {
      return { title: '', locked: true, fontScale: item.fontScale };
    }
    if (Meta.codexIsNew(cat, id)) {
      return { ...item, tag: t('newTag'), tagColor: '#C06870' };
    }
    return item;
  }

  private fillPanel(): void {
    if (!this.panel) return;
    const fontScale = this.vp.bp === 'compact' ? 0.85 : 1;
    const items: CardGridItem[] = [];
    const pushLocked = (n: number): void => {
      for (let i = 0; i < n; i++) items.push({ title: '', locked: true, fontScale });
    };
    const tab = this.tab;

    // M12 详情化：每类补一行简短信息（描述/数值/进化名），字数克制不展开成百科
    if (tab === 'weapons') {
      for (const m of WEAPON_META) {
        // M14 进化配方：⇐ 满级 + 配对被动（mine 通配文案）
        const recipe = m.evolvesWith
          ? t('evoHintNeed').replace('{p}', t('p_' + m.evolvesWith))
          : t('evoHintAny');
        items.push(this.entry(tab, m.id, {
          icon: m.icon, title: t('w_' + m.id), color: m.color, fontScale,
          desc: t('w_' + m.id + '_d'),
          tag: '★ ' + t('w_' + m.id + '_e'),
          tagColor: '#C8902A',
          subDesc: '⇐ ' + recipe,
          subColor: '#A89F8E',
        }));
      }
      pushLocked(TARGET.weapons - WEAPON_META.length);
    } else if (tab === 'passives') {
      // M19「物品」页：被动护符 + 一次性掉落道具同处一页（角标区分两组）
      for (const m of PASSIVE_META) {
        items.push(this.entry(tab, m.id, {
          icon: m.icon, title: t('p_' + m.id), color: m.color, fontScale,
          desc: t('p_' + m.id + '_d'),
          tag: t('codex_passiveGroup'), tagColor: '#A89F8E',
        }));
      }
      for (const id of ALL_DROPS) {
        const spec = DROP_ITEMS[id];
        items.push(this.entry(tab, id, {
          icon: spec.icon, title: t('drop_' + id), color: spec.color, fontScale,
          desc: t('drop_' + id + '_d'),
          tag: t('codex_dropGroup'), tagColor: '#C8902A',
        }));
      }
    } else if (tab === 'enemies') {
      // 敌人图标可能属于未生成的地图资产：先确保各图纹理就绪
      for (const m of MAPS) ensureMapAssets(this, m.id);
      const ids = Object.keys(ENEMIES) as EnemyId[];
      for (const id of ids) {
        const spec = ENEMIES[id];
        items.push(this.entry(tab, id, {
          icon: spec.tex, title: t('en_' + id), fontScale,
          desc: t('codex_hp') + ' ' + spec.hp + ' · ' + t('codex_spd') + ' ' + spec.speed,
          tag: spec.boss ? t('codex_boss') : spec.elite ? t('codex_elite') : undefined,
          tagColor: spec.boss ? '#C06870' : spec.elite ? '#C8902A' : undefined,
        }));
      }
    } else if (tab === 'chars') {
      // M16 隐藏角色：未解锁不占位不显示（与 CharacterSelect 同口径）；解锁后 16→18
      const chars = CHARACTERS.filter((c) => !c.secret || Meta.isUnlocked('chars', c.id));
      for (const c of chars) {
        // M14 角色专属机制：图鉴展示机制全文（选人页只露机制名，详情在此）
        items.push(this.entry(tab, c.id, {
          icon: c.tex, iconScale: c.texScale * 0.85, title: t('char_' + c.id), color: c.color, fontScale,
          desc: c.trait ? t('trait_' + c.trait + '_d') : t('char_' + c.id + '_d'),
          tag: t('w_' + c.weapon),
          subDesc: c.trait ? '✦ ' + t('trait_' + c.trait) : undefined,
        }));
      }
      pushLocked(Math.max(0, TARGET.chars - chars.length));
    } else if (tab === 'arcana') {
      for (const m of ARCANA_META) {
        // M13 机制卡未解锁：不走首遇点亮，直接显示解锁条件（成就名）当攻略目标
        if (m.tier === 'mechanic' && !Meta.isArcanaUnlocked(m.id)) {
          const ach = ACHIEVEMENTS.find((a) => a.unlockArcana === m.id);
          items.push({
            title: '？？？', fontScale,
            desc: ach ? t('ui_unlockBy').replace('{a}', t('ach_' + ach.id)) : t('ui_lockedHint'),
            tag: '★ ' + t('arcMech'), tagColor: '#C8902A',
          });
          continue;
        }
        items.push(this.entry(tab, m.id, {
          icon: m.icon, title: t('arc_' + m.id), color: m.color, fontScale,
          desc: t('arc_' + m.id + '_d'),
          ...(m.tier === 'mechanic' ? { tag: '★ ' + t('arcMech'), tagColor: '#C8902A' } : {}),
        }));
      }
      pushLocked(TARGET.arcana - ARCANA_META.length);
    } else {
      for (const m of MAPS) {
        ensureMapAssets(this, m.id);
        items.push(this.entry(tab, m.id, {
          icon: m.icon, iconScale: m.iconScale * 0.85, title: t('map_' + m.id), color: m.color, fontScale,
          desc: t('codex_boss') + '：' + t('en_' + m.bossId),
          tag: m.minutes + ' ' + t('ui_minutes'),
        }));
      }
      pushLocked(TARGET.maps - MAPS.length);
    }

    // C5：分类卡片按内容差异化尺寸（同组内一致），地图走 banner 版式贴近游戏内
    const compact = this.vp.bp === 'compact';
    const cfg: Record<CodexCat, { minCellW: number; aspect: number; layout?: 'column' | 'banner' }> = {
      weapons: { minCellW: compact ? 132 : 172, aspect: 1.24 },
      passives: { minCellW: compact ? 132 : 172, aspect: 1.04 },
      enemies: { minCellW: compact ? 126 : 158, aspect: 0.98 },
      chars: { minCellW: compact ? 140 : 180, aspect: 1.2 },
      maps: { minCellW: compact ? 160 : 230, aspect: compact ? 0.86 : 0.82, layout: 'banner' },
      arcana: { minCellW: compact ? 132 : 172, aspect: 1.1 },
    };
    const c = cfg[tab];
    buildCardGrid(this.panel, {
      items,
      minCellW: c.minCellW,
      aspect: c.aspect,
      layout: c.layout,
      gap: compact ? undefined : 14,
    });
    this.panel.scrollY = this.savedScroll[tab] ?? 0;

    // 本类已浏览：清除 New 角标（本次构建仍显示，下次进入消失）
    Meta.codexMarkSeen(tab);
  }
}
