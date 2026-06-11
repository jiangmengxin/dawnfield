// 图鉴：五类标签页；M1 用现有内容点亮 + 余量锁定占位（M3 接首遇点亮存档）
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { PASSIVE_META, WEAPON_META, ENEMIES, EnemyId } from '../config';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Tabs } from '../ui/widgets/Tabs';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import { THEME } from '../ui/theme';

type CodexTab = 'weapons' | 'passives' | 'enemies' | 'chars' | 'maps';

// 1.0 目标量级（锁定占位补齐到这些数字）
const TARGET = { weapons: 16, passives: 16, enemies: 14, chars: 16, maps: 8 } as const;

export class CodexScene extends UIScene {
  private tab: CodexTab = 'weapons';
  private panel: ScrollPanel | null = null;
  private savedScroll: Partial<Record<CodexTab, number>> = {};

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
      this.tab = id as CodexTab;
      this.fillPanel();
    }, this.tab);

    const hint = this.add.text(content.x + content.w / 2, content.y + tabH + 8, t('codex_hint'), {
      fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', color: PAL.inkSoft,
    }).setOrigin(0.5, 0);
    const top = content.y + tabH + 8 + hint.height + THEME.gapSm;

    this.panel = new ScrollPanel(this, { x: content.x, y: top, w: content.w, h: content.y + content.h - top });
    this.fillPanel();
  }

  private fillPanel(): void {
    if (!this.panel) return;
    const fontScale = this.vp.bp === 'compact' ? 0.85 : 1;
    const items: CardGridItem[] = [];
    const pushLocked = (n: number): void => {
      for (let i = 0; i < n; i++) items.push({ title: '', locked: true, fontScale });
    };

    if (this.tab === 'weapons') {
      for (const m of WEAPON_META) {
        items.push({ icon: m.icon, title: t('w_' + m.id), color: m.color, fontScale });
      }
      pushLocked(TARGET.weapons - WEAPON_META.length);
    } else if (this.tab === 'passives') {
      for (const m of PASSIVE_META) {
        items.push({ icon: m.icon, title: t('p_' + m.id), color: m.color, fontScale });
      }
      pushLocked(TARGET.passives - PASSIVE_META.length);
    } else if (this.tab === 'enemies') {
      for (const id of Object.keys(ENEMIES) as EnemyId[]) {
        items.push({ icon: ENEMIES[id].tex, title: t('en_' + id), fontScale });
      }
      pushLocked(TARGET.enemies - Object.keys(ENEMIES).length);
    } else if (this.tab === 'chars') {
      items.push({ icon: 'player', iconScale: 1.3, title: t('char_spark'), color: 0xe2b452, fontScale });
      pushLocked(TARGET.chars - 1);
    } else {
      items.push({ icon: 'd_flower1', iconScale: 2, title: t('map_meadow'), color: 0xa8cd8c, fontScale });
      pushLocked(TARGET.maps - 1);
    }

    buildCardGrid(this.panel, {
      items,
      minCellW: this.vp.bp === 'compact' ? 104 : 130,
      aspect: 1.0,
    });
    this.panel.scrollY = this.savedScroll[this.tab] ?? 0;
  }
}
