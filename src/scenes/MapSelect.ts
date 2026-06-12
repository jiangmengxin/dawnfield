// 地图选择：8 格（解锁链 = 通关上一图的成就）；卡片标注各图名义时长
// M11 改版：顶部「普通 / 无尽」Tabs——无尽页只开放已通关图并展示最佳记录；
// 已通关图点击弹难度弹窗（普通 / 狂暴 I / 狂暴 II），无任何解锁时保持现状直接开局
import { t } from '../i18n';
import { MAPS, MapSpec } from '../content/maps';
import { ACHIEVEMENTS } from '../content/achievements';
import { ENEMIES } from '../content/enemies';
import { ensureMapAssets } from '../gfx/textures';
import { Meta } from '../core/MetaState';
import { getSettings } from '../core/settings';
import { resetStack } from '../core/router';
import { UIScene } from '../ui/UIScene';
import { THEME } from '../ui/theme';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Tabs } from '../ui/widgets/Tabs';
import { Modal } from '../ui/widgets/Modal';
import { Card } from '../ui/widgets/Card';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import type { RunLaunchData, RunMode } from '../systems/context';

const TARGET_MAPS = 8; // 1.0 目标量级

export class MapSelectScene extends UIScene {
  private charId = 'spark';
  private tab: RunMode = 'normal';

  constructor() {
    super('mapselect');
  }

  init(data: { charId?: string }): void {
    this.charId = data.charId ?? 'spark';
    this.tab = 'normal';
  }

  /** 该图是否已通关（狂暴 I / 无尽的解锁条件）；调试「解锁全部内容」一并放行 */
  private cleared(mapId: string): boolean {
    return Meta.hasAch(mapId + 'Clear') || getSettings().unlockAll;
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_mapSelect'));
    const compact = this.vp.bp === 'compact';
    const fontScale = compact ? 0.9 : 1;

    // 模式 Tabs（rebuild 全量重建，activeId 由场景字段保持）
    const tabsH = Math.max(40, this.vp.s(44));
    new Tabs(this, { x: content.x, y: content.y, w: content.w, h: tabsH }, [
      { id: 'normal', label: t('tab_normal') },
      { id: 'endless', label: t('tab_endless') },
    ], (id) => {
      this.tab = id as RunMode;
      this.rebuild();
    }, this.tab);

    const panel = new ScrollPanel(this, {
      x: content.x, y: content.y + tabsH + THEME.gapSm,
      w: content.w, h: content.h - tabsH - THEME.gapSm,
    });

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
      // 无尽页：未通关图锁定（通关后解锁该图无尽）
      if (this.tab === 'endless' && !this.cleared(m.id)) {
        return { title: '???', desc: t('ui_endlessLocked'), locked: true, fontScale };
      }
      ensureMapAssets(this, m.id); // 图标纹理懒生成（幂等）
      const rec = Meta.save.endless[m.id];
      const tag = this.tab === 'endless'
        ? rec
          ? t('endlessRecord').replace('{n}', String(rec.cycle)).replace('{t}', fmtTime(rec.sec))
          : t('ui_noRecord')
        : m.minutes + ' ' + t('ui_minutes');
      return {
        icon: m.icon,
        iconScale: m.iconScale,
        title: t('map_' + m.id),
        desc: compact ? undefined : t('map_' + m.id + '_d'),
        tag,
        tagColor: this.tab === 'endless' && rec ? '#C8902A' : undefined,
        color: m.color,
        fontScale,
        onTap: () => this.pick(m),
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

  /** 点击已解锁图：有额外难度选项 → 弹窗；否则保持现状直接开局 */
  private pick(m: MapSpec): void {
    if (this.tab === 'normal' && !this.cleared(m.id)) {
      this.launch(m.id, 0);
      return;
    }
    const hyper2 = (Meta.save.hyper[m.id] ?? 0) >= 1 || getSettings().unlockAll;
    const opts: Array<{ diff: 0 | 1 | 2; name: string; desc: string; icon: string; color?: number }> = [
      { diff: 0, name: t('diff_normal'), desc: t('diff_normal_d'), icon: m.icon },
      { diff: 1, name: t('diff_hyper1'), desc: t('diff_hyper1_d'), icon: ENEMIES[m.eliteId].tex, color: 0xe0a868 },
    ];
    if (hyper2) {
      opts.push({ diff: 2, name: t('diff_hyper2'), desc: t('diff_hyper2_d'), icon: ENEMIES[m.bossId].tex, color: 0xc06870 });
    }
    const rowH = 68;
    const gap = THEME.gapSm;
    Modal.open(this, {
      title: (this.tab === 'endless' ? t('tab_endless') : t('diffPick')) + ' · ' + t('map_' + m.id),
      w: 420,
      h: 100 + opts.length * (rowH + gap),
      build: (panel, inner) => {
        opts.forEach((o, i) => {
          const card = new Card(this, inner.x + inner.w / 2, inner.y + 6 + i * (rowH + gap) + rowH / 2, {
            w: inner.w, h: rowH,
            layout: 'row',
            icon: o.icon,
            title: o.name,
            desc: o.desc,
            color: o.color,
            onTap: () => this.launch(m.id, o.diff),
          });
          panel.add(card);
        });
      },
    });
  }

  private launch(mapId: string, diff: 0 | 1 | 2): void {
    resetStack();
    const data: RunLaunchData = { charId: this.charId, mapId, mode: this.tab, diff };
    this.scene.start('game', data);
  }
}

function fmtTime(sec: number): string {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  return mm + ':' + ss;
}
