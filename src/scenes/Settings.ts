// 设置页：音量 / 声音 / 伤害数字 / 屏幕震动 / 语言 + 调试区（信息/无敌/全屏拾取）
// M1 实装，落临时 localStorage；行高随可用高度自适应，矮屏不溢出
import { FONT, getLang, Lang, setLang, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { getSettings, updateSettings, TempSettings } from '../core/settings';
import { UIScene } from '../ui/UIScene';
import { UIButton } from '../ui/widgets/UIButton';
import { Slider } from '../ui/widgets/Slider';
import { Toggle } from '../ui/widgets/Toggle';
import { Modal } from '../ui/widgets/Modal';
import { THEME } from '../ui/theme';

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
    // 5 设置行 + 1 分区标题 + 4 调试行，行高自适应矮屏
    const sectionH = 34;
    const rowH = Math.max(44, Math.min(vp.s(60), (content.h - sectionH - THEME.gapMd * 2) / 9));
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
