// 地图选择（M20 改版）：地图网格上方一组独立可叠加的模式开关——
// 无尽 / 狂暴 / 规则 / 随机 / 倍速 / 突破（chip 自动换行、逐行居中），点击地图直接开局；
// 无尽 / 狂暴 需先通关本图（卡面锁定提示表达），其余模式无解锁约束
import { FONT, t } from '../i18n';
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
import type { RunLaunchData, RunMode } from '../systems/context';

const TARGET_MAPS = 12; // 1.0+ 扩展目标量级

export class MapSelectScene extends UIScene {
  private charId = 'spark';
  // M20 模式开关（彼此独立可叠加）：无尽 / 狂暴(=diff2) / 规则 / 随机 / 倍速 / 突破
  private tab: RunMode = 'normal';
  private diff: 0 | 1 | 2 = 0;
  private arcanaMode = true; // 规则：默认开（沿用原 settings.arcana 默认体验）
  private random = false;
  private speed2x = false;
  private breakthrough = false;

  constructor() {
    super('mapselect');
  }

  init(data: { charId?: string }): void {
    this.charId = data.charId ?? 'spark';
    this.tab = 'normal';
    this.diff = 0;
    this.arcanaMode = true;
    this.random = false;
    this.speed2x = false;
    this.breakthrough = false;
  }

  /** 该图是否已通关（狂暴 / 无尽的解锁条件）；调试「解锁全部内容」一并放行 */
  private cleared(mapId: string): boolean {
    return Meta.hasAch(mapId + 'Clear') || getSettings().unlockAll;
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_mapSelect'));
    const compact = this.vp.bp === 'compact';
    const fontScale = compact ? 0.9 : 1;

    // M20 模式开关：6 个独立 chip（无尽/狂暴/规则/随机/倍速/突破）——恒为单行铺开，
    // 开启用金色高亮（不再用勾选/文字介绍）；手机上整排超宽时按内容宽统一缩放，
    // UIButton 自带 fitText 再缩字号兜底，保证六枚始终一排不换行
    const chipFs = this.vp.fs(15);
    const chipH = Math.max(THEME.hitMin, this.vp.s(44));
    const chips: Array<{ label: string; on: boolean; toggle: () => void }> = [
      {
        label: t('mode_endless'), on: this.tab === 'endless',
        toggle: () => { this.tab = this.tab === 'endless' ? 'normal' : 'endless'; this.rebuild(); },
      },
      {
        label: t('mode_berserk'), on: this.diff >= 1, // 单一狂暴 = 狂暴 II 数值（diff=2）
        toggle: () => { this.diff = this.diff >= 1 ? 0 : 2; this.rebuild(); },
      },
      {
        label: t('mode_arcana'), on: this.arcanaMode,
        toggle: () => { this.arcanaMode = !this.arcanaMode; this.rebuild(); },
      },
      {
        label: t('mode_random'), on: this.random,
        toggle: () => { this.random = !this.random; this.rebuild(); },
      },
      {
        label: t('mode_speed'), on: this.speed2x,
        toggle: () => { this.speed2x = !this.speed2x; this.rebuild(); },
      },
      {
        label: t('mode_breakthrough'), on: this.breakthrough,
        toggle: () => { this.breakthrough = !this.breakthrough; this.rebuild(); },
      },
    ];
    const measure = (s: string): number => {
      const t0 = this.add.text(0, 0, s, { fontFamily: FONT, fontSize: chipFs + 'px', fontStyle: 'bold' });
      const wd = t0.width;
      t0.destroy();
      return wd;
    };
    // 自然宽 = 文字 + 内边距；整排（含间距）超出内容宽时统一缩放至刚好放下（手机六枚一排）
    const gap = compact ? THEME.gapXs : THEME.gapSm;
    const natural = chips.map((c) => measure(c.label) + 34);
    const sumNatural = natural.reduce((a, b) => a + b, 0);
    const avail = content.w - gap * (chips.length - 1);
    const scale = Math.min(1, avail / sumNatural);
    const widths = natural.map((w) => w * scale);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (chips.length - 1);
    let chx = content.x + content.w / 2 - totalW / 2;
    const cy = content.y + chipH / 2;
    chips.forEach((c, i) => {
      const wd = widths[i];
      new UIButton(this, chx + wd / 2, cy, {
        w: wd, h: chipH, label: c.label, fontSize: chipFs,
        fill: c.on ? 0xffeec0 : undefined, edge: c.on ? 0xe2b452 : undefined,
        onTap: c.toggle,
      });
      chx += wd + gap;
    });
    const top = content.y + chipH + THEME.gapSm;

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
      // 当前模式下该图的解锁约束（不满足 → 卡面提示，点击不放行）；无尽/狂暴均需先通关本图
      const lockMsg = this.tab === 'endless' && !this.cleared(m.id)
        ? t('ui_endlessLocked')
        : this.diff >= 1 && !this.cleared(m.id)
          ? t('ui_needClear')
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
    const data: RunLaunchData = {
      charId: this.charId, mapId, mode: this.tab, diff: this.diff,
      arcana: this.arcanaMode, random: this.random, speed2x: this.speed2x, breakthrough: this.breakthrough,
    };
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
