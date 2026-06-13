// 设置页：BGM/SFX 分轨音量（M8）/ 伤害数字 / 屏幕震动 / 语言 + 调试区（规则卡 M20 移至选图页模式开关）
// （静音开关仍在主菜单与暂停面板；两轨拉零等效静音）
// 调试：信息/无敌/全屏拾取/自动选卡/解锁全部内容 + 加币/时间跳跃/指定武器/波次预览/规则卡直给（后四者仅对进行中的局生效）
// M3 起设置持久化进版本化存档（core/save）；行高随可用高度自适应，矮屏不溢出
import { FONT, getLang, Lang, setLang, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { ARCANA_META } from '../content/arcana';
import { MAX_WEAPONS } from '../content/player';
import { WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import type { ArcanaId, WeaponId } from '../content/ids';
import { Meta } from '../core/MetaState';
import { getSettings, updateSettings, TempSettings } from '../core/settings';
import { UIScene } from '../ui/UIScene';
import { UIButton } from '../ui/widgets/UIButton';
import { Slider } from '../ui/widgets/Slider';
import { Toggle } from '../ui/widgets/Toggle';
import { Modal } from '../ui/widgets/Modal';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
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

    // 内容列宽随屏宽自适应（C6）：手机近满宽，宽屏渐增但不过宽（≤560，避免中间大片留白）；
    // 再留 20px 使 rowBg 外扩 ±10 后与页边 ≥16px 安全留白
    const maxW = Math.min(content.w - 20, Math.max(440, Math.min(560, content.w * 0.66)));
    const x0 = content.x + (content.w - maxW) / 2;
    // 12 行：5 设置 + 1 分区标题 + 5 调试开关 + 2 调试操作行（每行 3 枚，SE1 换行）；行高自适应
    // （M20 规则卡移出设置 → 选图页「规则」模式开关）
    const sectionH = 34;
    const fit = (content.h - sectionH - THEME.gapMd * 2) / 12;
    const rowH = fit >= 44 ? Math.max(44, Math.min(vp.s(60), fit)) : Math.max(26, fit);
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

    // BGM / SFX 分轨音量滑杆（M8）
    const sliderW = Math.min(180, maxW * 0.42);
    const sliderRow = (key: string, value: number, onChange: (v: number) => void): void => {
      const sy = y + rowH / 2;
      rowBg(sy);
      label(sy, key);
      new Slider(this, x0 + maxW - sliderW / 2 - 18, sy, sliderW, value, (v) => {
        SFX.unlock();
        onChange(v);
      });
      y += rowH;
    };
    sliderRow('set_volBgm', SFX.volBgm, (v) => SFX.setVolBgm(v));
    sliderRow('set_volSfx', SFX.volSfx, (v) => {
      SFX.setVolSfx(v);
      SFX.uiClick(); // 即时试听当前音量
    });

    toggleRow('set_dmgNum', s.dmgNumbers, boolSetting('dmgNumbers'));
    // 屏震改回开关（C6）：开启 = 收敛后的弱强度（shake.ts SHAKE_ON=0.3），关闭 = 无
    toggleRow('set_shake', s.shake, boolSetting('shake'));
    // M20：规则卡开关移至选图页「规则」模式，不再占设置行

    // 语言：当前语言按钮（C6：宽度随文案自适应、右缘对齐，不再固定 140 显得空旷；为多语言预留）
    const cy = y + rowH / 2;
    rowBg(cy);
    label(cy, 'set_lang');
    const current = LANGS.find((l) => l.id === getLang()) ?? LANGS[0];
    const langLabel = current.label + '  ›';
    const tmp = this.add.text(0, 0, langLabel, { fontFamily: FONT, fontSize: vp.fs(15) + 'px', fontStyle: 'bold' });
    const langBtnW = Math.min(maxW * 0.62, tmp.width + 36);
    tmp.destroy();
    const langBtn = new UIButton(this, 0, cy, {
      w: langBtnW, h: Math.min(THEME.hitMin, rowH - 12),
      label: langLabel,
      fontSize: vp.fs(15),
      onTap: () => this.openLangPicker(),
    });
    langBtn.setX(x0 + maxW - 8 - langBtnW / 2);
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
    toggleRow('set_unlockAll', s.unlockAll, boolSetting('unlockAll'));

    // 调试操作行：加币 / 时间跳跃 / 指定武器 / 波次预览 / 规则卡直给（后四者仅对进行中的局生效）
    // + DPS 基准（M12，仅 DEV 构建出现，随调试隔离一起被 PROD 隐藏）
    const btnH = Math.min(THEME.hitMin, rowH - 12);
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
      [t('set_wavePreview'), () => this.openWavePreview()],
      [t('set_giveArcana'), () => this.openArcanaPicker()],
    ];
    if (import.meta.env.DEV) {
      ops.push([t('set_bench'), () => {
        this.scene.stop('hud');
        this.scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true });
      }]);
    }
    // SE1：6 枚一行在窄屏过挤 → 每行最多 3 枚，分两行网格
    const perRow = 3;
    for (let r = 0; r < Math.ceil(ops.length / perRow); r++) {
      const chunk = ops.slice(r * perRow, (r + 1) * perRow);
      const opCy = y + rowH / 2;
      rowBg(opCy);
      const cells = hstack(rect(x0 - 4, opCy - btnH / 2, maxW + 8, btnH), THEME.gapXs, chunk.map(() => 'flex' as const));
      cells.forEach((c, i) => {
        new UIButton(this, c.x + c.w / 2, c.y + c.h / 2, {
          w: c.w, h: c.h, label: chunk[i][0], fontSize: vp.fs(13), onTap: chunk[i][1],
        });
      });
      y += rowH;
    }
  }

  /** 规则卡直给弹窗（M9 调试）：点选即为当前局叠加该卡（绕过单局上限，便于验收 10 卡可叠加）；
   *  已持有置灰，弹窗保持打开可连续操作 */
  private openArcanaPicker(): void {
    const gs = this.liveGame();
    if (!gs) return;
    const gap = THEME.gapXs;
    const availH = Math.min(this.vp.h - 48, 560) - 64 - THEME.gapMd * 2;
    const btnH = Math.max(26, Math.min(40, Math.floor(availH / ARCANA_META.length) - gap));
    const btns: Array<{ btn: UIButton; id: ArcanaId }> = [];
    const refresh = (): void => {
      for (const { btn, id } of btns) {
        const owned = gs.run.arcana.includes(id);
        btn.setLabel(owned ? '★ ' + t('arc_' + id) : t('arc_' + id));
        btn.setEnabled(!owned);
      }
    };
    Modal.open(this, {
      title: t('set_giveArcana'),
      w: 320,
      h: 64 + ARCANA_META.length * (btnH + gap) + THEME.gapMd * 2,
      build: (panel, inner) => {
        ARCANA_META.forEach((m, i) => {
          const btn = new UIButton(this, 0, inner.y + THEME.gapSm + btnH / 2 + i * (btnH + gap), {
            w: Math.min(THEME.btnW, inner.w - 8),
            h: btnH,
            label: '',
            fontSize: 15,
            onTap: () => {
              gs.grantArcana(m.id);
              refresh();
            },
          });
          btns.push({ btn, id: m.id });
          panel.add(btn);
        });
        refresh();
      },
    });
  }

  /** 波次预览弹窗（M8 调试）：当前局地图的完整波次/事件时间表，标出当前所处位置 */
  private openWavePreview(): void {
    const gs = this.liveGame();
    if (!gs) return;
    const map = gs.map;
    const elapsed = gs.run.elapsed;
    const fmt = (sec: number): string =>
      Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');

    // 波次 + 事件并成时间轴行（▶ = 当前波 / 未触发的下一事件之前）
    const lines: Array<{ text: string; hot: boolean }> = [];
    map.waves.forEach((w, i) => {
      const to = map.waves[i + 1]?.from;
      const hot = elapsed >= w.from && (to === undefined || elapsed < to);
      lines.push({
        hot,
        text: (hot ? '▶ ' : '   ') + fmt(w.from) + (to !== undefined ? '~' + fmt(to) : '+') +
          '  ' + w.interval + 's×' + w.burst + ' ≤' + w.maxAlive + '\n      ' +
          w.types.map(([id, wt]) => t('en_' + id) + '×' + wt).join(' · '),
      });
    });
    for (const ev of map.events) {
      const tag = ev.kind === 'boss' ? '★ Boss'
        : ev.kind === 'elite' ? '◆ 精英'
        : ev.kind === 'surge' ? '◈ 强敌成群'
        : '◯ 包围环';
      lines.push({
        hot: false,
        text: (elapsed >= ev.t ? '   ' : ' · ') + fmt(ev.t) + '  ' + tag +
          (ev.enemy ? ' ' + t('en_' + ev.enemy) : '') + (ev.n ? ' ×' + ev.n : ''),
      });
    }

    const vp = this.vp;
    const mw = Math.min(380, vp.w - 32);
    const mh = Math.min(vp.h - 48, 560);
    Modal.open(this, {
      title: t('set_wavePreview') + ' · ' + t('map_' + map.id),
      w: mw,
      h: mh,
      build: (panel, inner) => {
        // ScrollPanel 工作在世界坐标（mask 为世界系），独立于 panel 容器，随 panel 销毁
        const view = { x: vp.w / 2 + inner.x, y: vp.h / 2 + inner.y, w: inner.w, h: inner.h };
        const sp = new ScrollPanel(this, view);
        sp.setDepth(502);
        sp.setContent((add) => {
          let yy = 4;
          for (const line of lines) {
            const txt = this.add.text(6, yy, line.text, {
              fontFamily: FONT, fontSize: vp.fs(13) + 'px',
              fontStyle: line.hot ? 'bold' : 'normal',
              color: line.hot ? '#C8902A' : PAL.inkCss,
              wordWrap: { width: inner.w - 24 },
            });
            add(txt);
            yy += txt.height + 8;
          }
          return yy + 4;
        });
        panel.once('destroy', () => sp.destroy());
      },
    });
  }

  /** 进行中的局（活动或暂停），否则 null */
  private liveGame(): GameScene | null {
    if (this.game.scene.isActive('game') || this.game.scene.isPaused('game')) {
      return this.scene.get('game') as GameScene;
    }
    return null;
  }

  /** 指定武器弹窗：点选即为当前局添加/升级该武器，满级后再点直接进化为超武（调试绕过被动配对）；
   *  弹窗保持打开可连续操作，已进化/满槽置灰 */
  private openWeaponPicker(): void {
    const gs = this.liveGame();
    if (!gs) return;
    const gap = THEME.gapXs;
    // 行高随武器数量与屏高自适应（12 武器后矮屏不再溢出 Modal 钳制高度）
    const availH = Math.min(this.vp.h - 48, 560) - 64 - THEME.gapMd * 2;
    const btnH = Math.max(26, Math.min(40, Math.floor(availH / WEAPON_META.length) - gap));
    const btns: Array<{ btn: UIButton; id: WeaponId }> = [];
    const refresh = (): void => {
      for (const { btn, id } of btns) {
        const w = gs.weapons.get(id);
        // 未持有且已满 6 槽不可再塞入（与正常选卡规则一致）；满级未进化 → 显示进化引导；已进化置灰
        const slotFull = !w && gs.weapons.list.length >= MAX_WEAPONS;
        const evolvable = !!w && !w.evolved && w.level >= WEAPON_MAX_LEVEL;
        btn.setLabel(w
          ? (w.evolved
            ? '★ ' + t('w_' + id + '_e')
            : evolvable
              ? t('w_' + id) + ' → ' + t('evolveTag') + '「' + t('w_' + id + '_e') + '」'
              : t('w_' + id) + '  Lv ' + w.level)
          : t('w_' + id));
        btn.setEnabled(!slotFull && !(w && w.evolved));
      }
    };
    Modal.open(this, {
      title: t('set_giveWeapon'),
      w: 320,
      h: 64 + WEAPON_META.length * (btnH + gap) + THEME.gapMd * 2,
      build: (panel, inner) => {
        WEAPON_META.forEach((m, i) => {
          const btn = new UIButton(this, 0, inner.y + THEME.gapSm + btnH / 2 + i * (btnH + gap), {
            w: Math.min(THEME.btnW, inner.w - 8),
            h: btnH,
            label: '',
            fontSize: 15,
            onTap: () => {
              const w = gs.weapons.get(m.id);
              if (w && !w.evolved && w.level >= WEAPON_MAX_LEVEL) {
                gs.weapons.evolve(m.id); // 调试直评超武：跳过满级+配对被动+宝箱链路
                SFX.evolve();
              } else {
                gs.weapons.addOrUpgrade(m.id);
              }
              refresh();
            },
          });
          btns.push({ btn, id: m.id });
          panel.add(btn);
        });
        refresh();
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
