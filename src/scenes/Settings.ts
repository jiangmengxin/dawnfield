// 设置页：音量 / 声音开关 / 伤害数字 / 屏幕震动 / 语言（M1 实装，落临时 localStorage）
import { FONT, getLang, t, toggleLang } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { getSettings, updateSettings } from '../core/settings';
import { UIScene } from '../ui/UIScene';
import { UIButton } from '../ui/widgets/UIButton';
import { Slider } from '../ui/widgets/Slider';
import { Toggle } from '../ui/widgets/Toggle';
import { THEME } from '../ui/theme';

export class SettingsScene extends UIScene {
  constructor() {
    super('settings');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_settings'));
    const s = getSettings();
    const vp = this.vp;

    const rowH = Math.max(THEME.hitMin + 12, vp.s(60));
    const maxW = Math.min(content.w, 480);
    const x0 = content.x + (content.w - maxW) / 2;
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

    // 声音开关
    cy = y + rowH / 2;
    rowBg(cy);
    label(cy, 'set_sound');
    new Toggle(this, x0 + maxW - 40, cy, !SFX.muted, (on) => {
      SFX.unlock();
      SFX.setMuted(!on);
    });
    y += rowH;

    // 伤害数字
    cy = y + rowH / 2;
    rowBg(cy);
    label(cy, 'set_dmgNum');
    new Toggle(this, x0 + maxW - 40, cy, s.dmgNumbers, (on) => updateSettings({ dmgNumbers: on }));
    y += rowH;

    // 屏幕震动
    cy = y + rowH / 2;
    rowBg(cy);
    label(cy, 'set_shake');
    new Toggle(this, x0 + maxW - 40, cy, s.shake, (on) => updateSettings({ shake: on }));
    y += rowH;

    // 语言
    cy = y + rowH / 2;
    rowBg(cy);
    label(cy, 'set_lang');
    new UIButton(this, x0 + maxW - 70, cy, {
      w: 124, h: Math.max(THEME.hitMin, vp.s(44)),
      label: getLang() === 'zh' ? '中文 ⇄' : 'EN ⇄',
      fontSize: vp.fs(15),
      onTap: () => toggleLang(), // 触发 UIScene 全量重建
    });
  }
}
