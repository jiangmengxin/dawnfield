// 图鉴：五类标签页；首遇点亮（MetaState.codex），未遇见显示 ???，新点亮带 New 角标
// 浏览某分类即清除该类 New 角标；锁定占位补齐到 1.0 目标量级
import { t } from '../i18n';
import { FONT } from '../i18n';
import { PAL } from '../gfx/palette';
import { PASSIVE_META, WEAPON_META, ENEMIES, EnemyId } from '../content';
import { CodexCat } from '../core/save';
import { Meta } from '../core/MetaState';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Tabs } from '../ui/widgets/Tabs';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import { THEME } from '../ui/theme';

// 1.0 目标量级（锁定占位补齐到这些数字）
const TARGET = { weapons: 16, passives: 16, enemies: 14, chars: 16, maps: 8 } as const;

// 已实装的角色 / 地图（M4/M5 起从 content/characters、content/maps 读取）
const CHARS: Array<{ id: string; icon: string; iconScale: number; color: number }> = [
  { id: 'spark', icon: 'player', iconScale: 1.3, color: 0xe2b452 },
];
const MAPS: Array<{ id: string; icon: string; iconScale: number; color: number }> = [
  { id: 'meadow', icon: 'd_flower1', iconScale: 2, color: 0xa8cd8c },
];

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
      const ids = Object.keys(ENEMIES) as EnemyId[];
      for (const id of ids) {
        items.push(this.entry(tab, id, { icon: ENEMIES[id].tex, title: t('en_' + id), fontScale }));
      }
      pushLocked(TARGET.enemies - ids.length);
    } else if (tab === 'chars') {
      for (const c of CHARS) {
        items.push(this.entry(tab, c.id, { icon: c.icon, iconScale: c.iconScale, title: t('char_' + c.id), color: c.color, fontScale }));
      }
      pushLocked(TARGET.chars - CHARS.length);
    } else {
      for (const m of MAPS) {
        items.push(this.entry(tab, m.id, { icon: m.icon, iconScale: m.iconScale, title: t('map_' + m.id), color: m.color, fontScale }));
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
