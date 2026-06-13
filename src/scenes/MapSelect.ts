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
import { UIButton } from '../ui/widgets/UIButton';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import { showToast } from '../ui/widgets/Toast';
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

    // 模式/难度改为一横排独立勾选开关（C3，预留扩展）：无尽 / 狂暴 / 狂暴II（II 需先开狂暴）
    const chipFs = this.vp.fs(15);
    const chipH = Math.max(THEME.hitMin, this.vp.s(44));
    const chips: Array<{ label: string; on: boolean; enabled?: boolean; toggle: () => void }> = [
      {
        label: t('tab_endless'), on: this.tab === 'endless',
        toggle: () => { this.tab = this.tab === 'endless' ? 'normal' : 'endless'; this.rebuild(); },
      },
      {
        label: t('diff_hyper1'), on: this.diff >= 1,
        toggle: () => { this.diff = this.diff >= 1 ? 0 : 1; this.rebuild(); },
      },
      {
        label: t('diff_hyper2'), on: this.diff === 2, enabled: this.diff >= 1,
        toggle: () => { this.diff = this.diff === 2 ? 1 : 2; this.rebuild(); },
      },
    ];
    const measure = (s: string): number => {
      const t0 = this.add.text(0, 0, s, { fontFamily: FONT, fontSize: chipFs + 'px', fontStyle: 'bold' });
      const wd = t0.width;
      t0.destroy();
      return wd;
    };
    const labels = chips.map((c) => (c.on ? '✓ ' : '') + c.label);
    const widths = labels.map((s) => measure(s) + 34);
    const totalW = widths.reduce((a, b) => a + b, 0) + THEME.gapSm * (chips.length - 1);
    let chx = content.x + content.w / 2 - totalW / 2;
    const chipY = content.y + chipH / 2;
    chips.forEach((c, i) => {
      const wd = widths[i];
      const btn = new UIButton(this, chx + wd / 2, chipY, {
        w: wd, h: chipH, label: labels[i], fontSize: chipFs,
        fill: c.on ? 0xffeec0 : undefined, edge: c.on ? 0xe2b452 : undefined,
        onTap: c.toggle,
      });
      if (c.enabled === false) btn.setEnabled(false);
      chx += wd + THEME.gapSm;
    });

    // 当前难度说明（开关行下方居中一行）
    const diffKey = this.diff === 0 ? 'diff_normal_d' : this.diff === 1 ? 'diff_hyper1_d' : 'diff_hyper2_d';
    const hint = this.add.text(content.x + content.w / 2, content.y + chipH + 8, t(diffKey), {
      fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', color: PAL.inkSoft, align: 'center',
      wordWrap: { width: content.w - 20 },
    }).setOrigin(0.5, 0);
    const top = content.y + chipH + 8 + hint.height + THEME.gapSm;

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
        // C3：地图卡下方不再显示描述文字，只留名称 + 时长/纪录角标（锁定时显示解锁条件）
        desc: lockMsg ?? undefined,
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

    // CARD1：banner 版式；C3：大屏卡片放大（minCellW↑ + 大间距），标准约一行四个
    buildCardGrid(panel, {
      items,
      minCellW: compact ? 160 : 230,
      aspect: compact ? 0.86 : 0.82,
      gap: compact ? undefined : 16,
      layout: 'banner',
    });
  }

  private launch(mapId: string): void {
    resetStack();
    const data: RunLaunchData = { charId: this.charId, mapId, mode: this.tab, diff: this.diff };
    this.scene.start('game', data);
  }

  /** 轻量提示横幅（点击未解锁约束的地图时说明条件）——统一走公共 Toast（U3） */
  private toast(msg: string): void {
    showToast(this, msg);
  }
}

function fmtTime(sec: number): string {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  return mm + ':' + ss;
}
