// 图鉴：五类标签页；首遇点亮（MetaState.codex），未遇见显示 ???，新点亮带 New 角标
// 浏览某分类即清除该类 New 角标；锁定占位补齐到 1.0 目标量级
import { t } from '../i18n';
import { FONT } from '../i18n';
import { PAL } from '../gfx/palette';
import { ARCANA_META, PASSIVE_META, WEAPON_META, ENEMIES, EnemyId, CHARACTERS, MAPS } from '../content';
import { ensureMapAssets } from '../gfx/textures';
import { CodexCat } from '../core/save';
import { Meta } from '../core/MetaState';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Tabs } from '../ui/widgets/Tabs';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import { THEME } from '../ui/theme';

// 1.0 目标量级（锁定占位补齐到这些数字；敌人按实装量展示，未遇见即 ???）
const TARGET = { weapons: 16, passives: 16, chars: 16, maps: 8, arcana: 10 } as const;

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

    const hint = this.add.text(content.x + content.w / 2, content.y + tabH + 8, t('codex_hint'), {
      fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', color: PAL.inkSoft,
    }).setOrigin(0.5, 0);
    const top = content.y + tabH + 8 + hint.height + THEME.gapSm;

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

    if (tab === 'weapons') {
      for (const m of WEAPON_META) {
        items.push(this.entry(tab, m.id, { icon: m.icon, title: t('w_' + m.id), color: m.color, fontScale }));
      }
      pushLocked(TARGET.weapons - WEAPON_META.length);
    } else if (tab === 'passives') {
      for (const m of PASSIVE_META) {
        items.push(this.entry(tab, m.id, { icon: m.icon, title: t('p_' + m.id), color: m.color, fontScale }));
      }
      pushLocked(TARGET.passives - PASSIVE_META.length);
    } else if (tab === 'enemies') {
      // 敌人图标可能属于未生成的地图资产：先确保各图纹理就绪
      for (const m of MAPS) ensureMapAssets(this, m.id);
      const ids = Object.keys(ENEMIES) as EnemyId[];
      for (const id of ids) {
        items.push(this.entry(tab, id, { icon: ENEMIES[id].tex, title: t('en_' + id), fontScale }));
      }
    } else if (tab === 'chars') {
      for (const c of CHARACTERS) {
        items.push(this.entry(tab, c.id, { icon: c.tex, iconScale: c.texScale * 0.85, title: t('char_' + c.id), color: c.color, fontScale }));
      }
      pushLocked(TARGET.chars - CHARACTERS.length);
    } else if (tab === 'arcana') {
      for (const m of ARCANA_META) {
        items.push(this.entry(tab, m.id, { icon: m.icon, title: t('arc_' + m.id), color: m.color, fontScale }));
      }
      pushLocked(TARGET.arcana - ARCANA_META.length);
    } else {
      for (const m of MAPS) {
        ensureMapAssets(this, m.id);
        items.push(this.entry(tab, m.id, { icon: m.icon, iconScale: m.iconScale * 0.85, title: t('map_' + m.id), color: m.color, fontScale }));
      }
      pushLocked(TARGET.maps - MAPS.length);
    }

    buildCardGrid(this.panel, {
      items,
      minCellW: this.vp.bp === 'compact' ? 104 : 130,
      aspect: 1.0,
    });
    this.panel.scrollY = this.savedScroll[tab] ?? 0;

    // 本类已浏览：清除 New 角标（本次构建仍显示，下次进入消失）
    Meta.codexMarkSeen(tab);
  }
}
