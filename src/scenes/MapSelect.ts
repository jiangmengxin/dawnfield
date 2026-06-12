// 地图选择（M12 改版）：地图网格上方两组模式开关——模式（普通/无尽）+ 难度（普通/狂暴 I/II），
// 点击地图直接开局（取代 M11 的难度弹窗，少一步且当前选择常显）；
// 逐图解锁约束（无尽/狂暴需通关、狂暴 II 需狂暴 I 通关）以卡面锁定提示表达
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { MAPS } from '../content/maps';
import { ACHIEVEMENTS } from '../content/achievements';
import { ensureMapAssets } from '../gfx/textures';
import { Meta } from '../core/MetaState';
import { getSettings } from '../core/settings';
import { resetStack } from '../core/router';
import { UIScene } from '../ui/UIScene';
import { THEME } from '../ui/theme';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Tabs } from '../ui/widgets/Tabs';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import type { MapId } from '../content/ids';
import type { RunLaunchData, RunMode } from '../systems/context';

const TARGET_MAPS = 8; // 1.0 目标量级

export class MapSelectScene extends UIScene {
  private charId = 'spark';
  private tab: RunMode = 'normal';
  private diff: 0 | 1 | 2 = 0;

  constructor() {
    super('mapselect');
  }

  init(data: { charId?: string }): void {
    this.charId = data.charId ?? 'spark';
    this.tab = 'normal';
    this.diff = 0;
  }

  /** 该图是否已通关（狂暴 I / 无尽的解锁条件）；调试「解锁全部内容」一并放行 */
  private cleared(mapId: string): boolean {
    return Meta.hasAch(mapId + 'Clear') || getSettings().unlockAll;
  }

  /** 狂暴 II：该图狂暴 I 已通关 */
  private hyper2(mapId: MapId): boolean {
    return (Meta.save.hyper[mapId] ?? 0) >= 1 || getSettings().unlockAll;
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_mapSelect'));
    const compact = this.vp.bp === 'compact';
    const fontScale = compact ? 0.9 : 1;
    const rowH = Math.max(38, this.vp.s(42));
    const wide = content.w >= 540;

    // 模式 + 难度开关（rebuild 全量重建，选中态由场景字段保持）：宽屏并排 / 窄屏两行
    const modeW = wide ? content.w * 0.36 : content.w;
    const diffW = wide ? content.w * 0.6 : content.w;
    new Tabs(this, { x: content.x, y: content.y, w: modeW, h: rowH }, [
      { id: 'normal', label: t('tab_normal') },
      { id: 'endless', label: t('tab_endless') },
    ], (id) => {
      this.tab = id as RunMode;
      this.rebuild();
    }, this.tab);
    const diffY = wide ? content.y : content.y + rowH + THEME.gapXs;
    new Tabs(this, { x: content.x + (wide ? content.w - diffW : 0), y: diffY, w: diffW, h: rowH }, [
      { id: '0', label: t('diff_normal') },
      { id: '1', label: t('diff_hyper1') },
      { id: '2', label: t('diff_hyper2') },
    ], (id) => {
      this.diff = Number(id) as 0 | 1 | 2;
      this.rebuild();
    }, String(this.diff));

    // 当前难度一行小字说明（取代 M11 难度弹窗的信息位，页面保持清爽）
    const diffKey = this.diff === 0 ? 'diff_normal_d' : this.diff === 1 ? 'diff_hyper1_d' : 'diff_hyper2_d';
    const togglesH = (wide ? rowH : rowH * 2 + THEME.gapXs) + 6;
    const hint = this.add.text(content.x + content.w / 2, content.y + togglesH, t(diffKey), {
      fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', color: PAL.inkSoft,
    }).setOrigin(0.5, 0);
    const top = content.y + togglesH + hint.height + THEME.gapSm;

    const panel = new ScrollPanel(this, {
      x: content.x, y: top, w: content.w, h: content.y + content.h - top,
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
      ensureMapAssets(this, m.id); // 图标纹理懒生成（幂等）
      // 当前模式/难度下该图的解锁约束（不满足 → 卡面提示，点击不放行）
      const lockMsg = this.tab === 'endless' && !this.cleared(m.id)
        ? t('ui_endlessLocked')
        : this.diff >= 1 && !this.cleared(m.id)
          ? t('ui_needClear')
          : this.diff === 2 && !this.hyper2(m.id)
            ? t('ui_needHyper1')
            : null;
      const rec = Meta.save.endless[m.id];
      const tag = lockMsg
        ? t('ui_locked')
        : this.tab === 'endless'
          ? rec
            ? t('endlessRecord').replace('{n}', String(rec.cycle)).replace('{t}', fmtTime(rec.sec))
            : t('ui_noRecord')
          : m.minutes + ' ' + t('ui_minutes');
      return {
        icon: m.icon,
        iconScale: m.iconScale,
        title: t('map_' + m.id),
        desc: lockMsg ?? (compact ? undefined : t('map_' + m.id + '_d')),
        tag,
        tagColor: lockMsg ? '#C06870' : this.tab === 'endless' && rec ? '#C8902A' : undefined,
        color: m.color,
        fontScale,
        onTap: () => {
          if (lockMsg) this.toast(lockMsg);
          else this.launch(m.id);
        },
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

  private launch(mapId: string): void {
    resetStack();
    const data: RunLaunchData = { charId: this.charId, mapId, mode: this.tab, diff: this.diff };
    this.scene.start('game', data);
  }

  /** 轻量提示横幅（点击未解锁约束的地图时说明条件） */
  private toast(msg: string): void {
    const safe = this.vp.safe;
    const txt = this.add.text(safe.x + safe.w / 2, safe.y + safe.h * 0.16, msg, {
      fontFamily: FONT, fontSize: this.vp.fs(17) + 'px', fontStyle: 'bold', color: '#C06870',
      stroke: '#FFFFFF', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(600).setAlpha(0);
    this.tweens.add({
      targets: txt, alpha: 1, duration: 180,
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, delay: 1200, duration: 300,
          onComplete: () => txt.destroy(),
        });
      },
    });
  }
}

function fmtTime(sec: number): string {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  return mm + ':' + ss;
}
