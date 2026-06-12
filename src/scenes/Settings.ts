// 设置页：音量 / 声音 / 伤害数字 / 屏幕震动 / 语言 + 调试区
// 调试：信息/无敌/全屏拾取/自动选卡 + 加币/时间跳跃/指定武器（后两者仅对进行中的局生效）
// M3 起设置持久化进版本化存档（core/save）；行高随可用高度自适应，矮屏不溢出
import { FONT, getLang, Lang, setLang, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { MAX_WEAPONS } from '../content/player';
import { WEAPON_META } from '../content/weapons';
import { Meta } from '../core/MetaState';
import { getSettings, updateSettings, TempSettings } from '../core/settings';
import { UIScene } from '../ui/UIScene';
import { UIButton } from '../ui/widgets/UIButton';
import { Slider } from '../ui/widgets/Slider';
import { Toggle } from '../ui/widgets/Toggle';
import { Modal } from '../ui/widgets/Modal';
import { THEME } from '../ui/theme';
import { hstack, rect } from '../ui/layout';
import type { GameScene } from './Game';

// 支持的语言清单（新增语言只需在此登记）
const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'zh', label: '简体中文' },
  { id: 'en', label: 'English' },
];

export class SettingsScene extends UIScene {
  constructor() {
    super('settings');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_settings'));
    const s = getSettings();
    const vp = this.vp;

    const maxW = Math.min(content.w, 480);
    const x0 = content.x + (content.w - maxW) / 2;
    // 5 设置行 + 1 分区标题 + 5 调试行；行高自适应：空间充裕时 ≥44pt 命中区，
    // 极矮屏（320×480 等）允许压到 34 以保证全部行可见可点
    const sectionH = 34;
    const fit = (content.h - sectionH - THEME.gapMd * 2) / 10;
    const rowH = fit >= 44 ? Math.max(44, Math.min(vp.s(60), fit)) : Math.max(34, fit);
    let y = content.y + THEME.gapMd;

    const label = (ty: number, key: string): void => {
      this.add.text(x0 + 4, ty, t(key), {
        fontFamily: FONT, fontSize: vp.fs(17) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0, 0.5);
    };
    const rowBg = (ty: number): void => {
      const g = this.add.graphics();
      g.fillStyle(PAL.cardBg, 0.7);
      g.fillRoundedRect(x0 - 10, ty - rowH / 2 + 4, maxW + 20, rowH - 8, THEME.radiusMd);
      g.lineStyle(2, PAL.cardEdge, 0.7);
      g.strokeRoundedRect(x0 - 10, ty - rowH / 2 + 4, maxW + 20, rowH - 8, THEME.radiusMd);
      g.setDepth(-1);
    };
    const toggleRow = (key: string, value: boolean, onChange: (v: boolean) => void): void => {
      const cy = y + rowH / 2;
      rowBg(cy);
      label(cy, key);
      new Toggle(this, x0 + maxW - 40, cy, value, onChange);
      y += rowH;
    };
    const boolSetting = (key: keyof TempSettings) => (on: boolean) => {
      updateSettings({ [key]: on });
    };

    // 音量滑杆
    let cy = y + rowH / 2;
    rowBg(cy);
    label(cy, 'set_volume');
    const sliderW = Math.min(180, maxW * 0.42);
    new Slider(this, x0 + maxW - sliderW / 2 - 18, cy, sliderW, SFX.volume, (v) => {
      SFX.unlock();
      SFX.setVolume(v);
      updateSettings({ volume: v });
    });
    y += rowH;

    toggleRow('set_sound', !SFX.muted, (on) => {
      SFX.unlock();
      SFX.setMuted(!on);
    });
    toggleRow('set_dmgNum', s.dmgNumbers, boolSetting('dmgNumbers'));
    toggleRow('set_shake', s.shake, boolSetting('shake'));

    // 语言：显示当前语言，点击弹出语言列表（支持多语言扩展）
    cy = y + rowH / 2;
    rowBg(cy);
    label(cy, 'set_lang');
    const current = LANGS.find((l) => l.id === getLang()) ?? LANGS[0];
    new UIButton(this, x0 + maxW - 78, cy, {
      w: 140, h: Math.min(THEME.hitMin, rowH - 12),
      label: current.label + ' ›',
      fontSize: vp.fs(15),
      onTap: () => this.openLangPicker(),
    });
    y += rowH;

    // ---------- 调试区 ----------
    this.add.text(x0 + 4, y + sectionH / 2 + 4, '🛠 ' + t('set_debugTitle'), {
      fontFamily: FONT, fontSize: vp.fs(14) + 'px', fontStyle: 'bold', color: PAL.inkSoft,
    }).setOrigin(0, 0.5);
    y += sectionH;

    toggleRow('set_debugInfo', s.debugInfo, boolSetting('debugInfo'));
    toggleRow('set_invincible', s.invincible, boolSetting('invincible'));
    toggleRow('set_fullPickup', s.fullPickup, boolSetting('fullPickup'));
    toggleRow('set_autoPick', s.autoPick, boolSetting('autoPick'));

    // 调试操作行：加币 / 时间跳跃 / 指定武器（后两者仅对进行中的局生效）
    const opCy = y + rowH / 2;
    rowBg(opCy);
    const btnH = Math.min(THEME.hitMin, rowH - 12);
    const cells = hstack(rect(x0 - 4, opCy - btnH / 2, maxW + 8, btnH), THEME.gapXs, ['flex', 'flex', 'flex']);
    const ops: Array<[string, () => void]> = [
      [t('set_addCoins'), () => {
        Meta.addCoins(1000, false); // 调试加币不计入累计获得（不触发金币成就）
        SFX.coin();
      }],
      [t('set_timeSkip'), () => {
        const gs = this.liveGame();
        if (gs) gs.debugTimeSkip(60);
      }],
      [t('set_giveWeapon'), () => this.openWeaponPicker()],
    ];
    cells.forEach((c, i) => {
      new UIButton(this, c.x + c.w / 2, c.y + c.h / 2, {
        w: c.w, h: c.h, label: ops[i][0], fontSize: vp.fs(13), onTap: ops[i][1],
      });
    });
    y += rowH;
  }

  /** 进行中的局（活动或暂停），否则 null */
  private liveGame(): GameScene | null {
    if (this.game.scene.isActive('game') || this.game.scene.isPaused('game')) {
      return this.scene.get('game') as GameScene;
    }
    return null;
  }

  /** 指定武器弹窗：点选即为当前局添加/升级该武器 */
  private openWeaponPicker(): void {
    const gs = this.liveGame();
    if (!gs) return;
    const btnH = 40;
    const gap = THEME.gapXs;
    const handle = Modal.open(this, {
      title: t('set_giveWeapon'),
      w: 320,
      h: 64 + WEAPON_META.length * (btnH + gap) + THEME.gapMd * 2,
      build: (panel, inner) => {
        WEAPON_META.forEach((m, i) => {
          const w = gs.weapons.get(m.id);
          const label = t('w_' + m.id) + (w ? '  Lv ' + w.level + (w.evolved ? '★' : '') : '');
          const btn = new UIButton(this, 0, inner.y + THEME.gapSm + btnH / 2 + i * (btnH + gap), {
            w: Math.min(THEME.btnW, inner.w - 8),
            h: btnH,
            label,
            fontSize: 15,
            onTap: () => {
              // 未持有且已满 6 槽时不再塞入（与正常选卡规则一致）
              if (!gs.weapons.has(m.id) && gs.weapons.list.length >= MAX_WEAPONS) return;
              gs.weapons.addOrUpgrade(m.id);
              handle.close();
            },
          });
          panel.add(btn);
        });
      },
    });
  }

  /** 语言选择弹窗：列表 + 当前项打勾，选中即切换（UIScene 随语言变更全量重建） */
  private openLangPicker(): void {
    const btnH = THEME.btnH;
    const gap = THEME.gapSm;
    const handle = Modal.open(this, {
      title: t('set_lang'),
      w: 320,
      h: 64 + LANGS.length * (btnH + gap) + THEME.gapMd * 2,
      build: (panel, inner) => {
        LANGS.forEach((l, i) => {
          const active = l.id === getLang();
          // 当前语言以金色高亮（不用对勾字符，避免平台字形差异）
          const btn = new UIButton(this, 0, inner.y + THEME.gapSm + btnH / 2 + i * (btnH + gap), {
            w: Math.min(THEME.btnW, inner.w - 8),
            h: btnH,
            label: l.label,
            fill: active ? 0xffeec0 : undefined,
            edge: active ? 0xe2b452 : undefined,
            fontSize: THEME.btnFs,
            onTap: () => {
              handle.close();
              if (l.id !== getLang()) setLang(l.id);
            },
          });
          panel.add(btn);
        });
      },
    });
  }
}
