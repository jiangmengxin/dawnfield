// HUD 覆盖层：状态条、计时、武器栏、升级三选一、宝箱、暂停、Boss 条
// 双形态：桌面横屏显示构筑信息；手机竖屏精简（构筑详情进暂停面板）
import Phaser from 'phaser';
import { FONT, t } from '../i18n';
import { DEATH_COLOR, PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { ACHIEVEMENTS } from '../content/achievements';
import { ARCANA_META } from '../content/arcana';
import { MAX_PASSIVES, MAX_WEAPONS } from '../content/player';
import { PASSIVE_MAX_LEVEL, PASSIVE_META } from '../content/passives';
import { WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import type { ArcanaId } from '../content/ids';
import { makeButton, setButtonLabel, UIButton } from '../ui/widgets';
import { Viewport } from '../ui/Viewport';
import { THEME } from '../ui/theme';
import { onEvent } from '../core/events';
import { Meta } from '../core/MetaState';
import { getSettings, updateSettings } from '../core/settings';
import { go } from '../core/router';
import type { ChestItem, ChestReward, Offer } from '../systems/context';
import type { GameScene } from './Game';

/** 选卡卡片渲染信息（升级三选一与规则卡三选一共用） */
interface PickCardInfo {
  icon: string;
  name: string;
  desc: string;
  color: number;
  tag: string;
  tagColor: string;
  /** 进化引导角标（M14）：ready=金色「开宝箱可进化！」/ 灰色配方小字 */
  evoHint?: { text: string; ready: boolean };
}

export class HUDScene extends Phaser.Scene {
  private gs!: GameScene;
  private bars!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private killIcon!: Phaser.GameObjects.Image;
  private coinText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private levelText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private warnText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Container;
  private speedBtn!: Phaser.GameObjects.Container;
  private iconRow: Phaser.GameObjects.GameObject[] = [];
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private overlayMode: 'none' | 'levelup' | 'chest' | 'arcana' | 'pause' = 'none';
  private bossVisible = false;
  private hurtShakeT = 0; // M17 受击血条抖动剩余秒数

  constructor() {
    super('hud');
  }

  private vp!: Viewport;

  /** 竖屏精简形态：只常驻 生命/经验/时间/暂停，构筑详情进暂停面板 */
  private get compactHud(): boolean {
    return this.vp.portrait && this.vp.bp === 'compact';
  }

  create(): void {
    this.vp = Viewport.get();
    this.gs = this.scene.get('game') as GameScene;
    this.overlayMode = 'none';
    this.overlay = [];
    this.iconRow = [];
    this.bossVisible = false;
    // toast 状态必须随场景重启复位：上一局 shutdown 会杀掉在播 toast 的 tween，
    // busy 卡 true 则本局一切金色横幅（成就/轮次/tips/trait 宣告）永久哑火
    this.toastQueue = [];
    this.toastBusy = false;

    this.bars = this.add.graphics().setDepth(10);
    this.timerText = this.add.text(0, 0, '00:00', {
      fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5, 0).setDepth(11);
    this.killIcon = this.add.image(0, 0, 'e_blob').setScale(0.62).setDepth(11);
    this.killText = this.add.text(0, 0, '0', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 4,
    }).setOrigin(0, 0.5).setDepth(11);
    this.coinIcon = this.add.image(0, 0, 'coin').setDepth(11);
    this.coinText = this.add.text(0, 0, '0', {
      fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#C8902A',
      stroke: '#FFFFFF', strokeThickness: 4,
    }).setOrigin(0, 0.5).setDepth(11);
    this.levelText = this.add.text(0, 0, 'LV 1', {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#B8924A',
      stroke: '#FFFFFF', strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(11);
    this.hpText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#C06870',
      stroke: '#FFFFFF', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(11);
    this.bossName = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#5A6488',
      stroke: '#FFFFFF', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11).setVisible(false);
    this.warnText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#C06870',
      stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20).setVisible(false);
    this.debugText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '12px', color: PAL.inkSoft,
      stroke: '#FFFFFF', strokeThickness: 3,
    }).setOrigin(0, 1).setDepth(20).setVisible(false);

    // 暂停图标用 Graphics 绘制（emoji 在不同平台字形不一致）
    this.pauseBtn = makeButton(this, 0, 0, 44, 44, '', () => this.togglePause());
    const pauseGlyph = this.add.graphics();
    pauseGlyph.fillStyle(PAL.ink, 1);
    pauseGlyph.fillRoundedRect(-7.5, -8, 5.5, 16, 2.5);
    pauseGlyph.fillRoundedRect(2, -8, 5.5, 16, 2.5);
    (this.pauseBtn as Phaser.GameObjects.Container).add(pauseGlyph);
    this.speedBtn = makeButton(this, 0, 0, 44, 44, getSettings().speed + 'x', () => {
      const next = this.gs.speed === 2 ? 1 : 2;
      this.gs.setSpeed(next);
      updateSettings({ speed: next });
      setButtonLabel(this.speedBtn, next + 'x');
    }, { fontSize: 17 });
    this.pauseBtn.setDepth(12);
    this.speedBtn.setDepth(12);

    // 键盘选卡 + 重抽/跳过（M10；repeat 守卫防按住移动键误触）
    this.input.keyboard!.on('keydown-ONE', () => this.pickByIndex(0));
    this.input.keyboard!.on('keydown-TWO', () => this.pickByIndex(1));
    this.input.keyboard!.on('keydown-THREE', () => this.pickByIndex(2));
    this.input.keyboard!.on('keydown-FOUR', () => this.pickByIndex(3)); // M14 ivy 四选一 / 精华四卡
    this.input.keyboard!.on('keydown-R', (ev: KeyboardEvent) => { if (!ev.repeat) this.doReroll(); });
    this.input.keyboard!.on('keydown-S', (ev: KeyboardEvent) => { if (!ev.repeat) this.doSkip(); });
    this.input.keyboard!.on('keydown-B', (ev: KeyboardEvent) => { if (!ev.repeat) this.toggleBanish(); }); // M16.5 放逐模式

    const subs = [
      onEvent(this.game, 'hud:levelup', (offers) => this.showLevelUp(offers)),
      onEvent(this.game, 'hud:chest', (reward) => this.showChest(reward)),
      onEvent(this.game, 'hud:arcana', (choices) => this.showArcanaPick(choices)),
      onEvent(this.game, 'hud:boss', (v) => { this.bossVisible = v; this.bossName.setVisible(v); }),
      onEvent(this.game, 'hud:warn', (key) => this.showWarn(key)),
      // M11 无尽轮次：走金色 toast 队列（轮边界与 Boss 横幅同帧，warnText 会被覆盖）
      onEvent(this.game, 'hud:cycle', (n) => this.queueToast(t('endlessCycleBanner').replace('{n}', String(n)))),
      onEvent(this.game, 'hud:revive', (n) => this.queueToast(t('reviveBanner').replace('{n}', String(n)))),
      onEvent(this.game, 'hud:achievement', (id) => this.queueAchToast(id)),
      onEvent(this.game, 'hud:tip', (text) => this.queueToast(text, 3500)), // M14 引导停留更久
      onEvent(this.game, 'hud:hurt', () => { this.hurtShakeT = 0.25; }),
      onEvent(this.game, 'hud:refresh', () => this.buildIconRow()),
      onEvent(this.game, 'hud:togglepause', () => this.togglePause()),
      onEvent(this.game, 'hud:autopause', () => {
        if (this.overlayMode === 'none' && this.gs.run.running) this.togglePause();
      }),
    ];

    this.buildIconRow();
    this.layout();
    this.scale.on('resize', this.layout, this);

    // M14 角色 trait 开局宣告（elapsed 守卫：从设置页返回重启 HUD 时不重复）
    const trait = this.gs.run.char.trait;
    if (trait && this.gs.run.elapsed < 0.5) {
      this.queueToast('✦ ' + t('traitAnnounce').replace('{n}', t('trait_' + trait)), 2600);
    }

    // 从设置页返回（HUD 被 router 重启）：game 仍暂停，自动重开暂停面板
    if (this.game.scene.isPaused('game')) this.showPauseMenu();

    this.events.on('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      subs.forEach((unsub) => unsub());
    });
  }

  private layout(): void {
    this.vp.syncCamera(this);
    const safe = this.vp.safe;
    const cx = safe.x + safe.w / 2;
    const compact = this.compactHud;

    if (compact) {
      // 竖屏精简：XP 通栏下方一条对齐的状态行（HP | 计时 | 倍速+暂停 同一中线）
      // 行中线下移，让按钮与经验条之间留出呼吸空隙
      const rowY = safe.y + 9 + 29;
      this.timerText.setOrigin(0.5, 0.5).setFontSize(22).setPosition(cx, rowY);
      this.pauseBtn.setPosition(safe.x + safe.w - 34, rowY);
      this.speedBtn.setPosition(safe.x + safe.w - 90, rowY);
      this.bossName.setPosition(cx, safe.y + 142);
    } else {
      this.timerText.setOrigin(0.5, 0).setFontSize(30).setPosition(cx, safe.y + 14);
      this.pauseBtn.setPosition(safe.x + safe.w - 36, safe.y + 64);
      this.speedBtn.setPosition(safe.x + safe.w - 36, safe.y + 116);
      this.bossName.setPosition(cx, safe.y + 122); // 金币行（y+92）下方，避免遮挡
    }
    this.killIcon.setPosition(cx - 24, safe.y + 64).setVisible(!compact);
    this.killText.setPosition(cx - 8, safe.y + 64).setVisible(!compact);
    this.coinIcon.setPosition(cx - 23, safe.y + 92).setVisible(!compact);
    this.coinText.setPosition(cx - 8, safe.y + 92).setVisible(!compact);
    // M12 HUD 打磨：竖屏也常显等级（右缘按钮下方小号），不再只进暂停面板
    if (compact) {
      this.levelText.setOrigin(1, 0).setFontSize(13).setPosition(safe.x + safe.w - 12, safe.y + 64).setVisible(true);
    } else {
      this.levelText.setOrigin(1, 0).setFontSize(16).setPosition(safe.x + safe.w - 14, safe.y + 12).setVisible(true);
    }
    this.warnText.setPosition(cx, safe.y + safe.h * 0.3);
    this.debugText.setPosition(safe.x + 10, safe.y + safe.h - 8);
    this.buildIconRow();
    if (this.overlayMode !== 'none') {
      // 重新布局开销大，直接关闭重开
      const mode = this.overlayMode;
      if (mode === 'pause') {
        this.closeOverlay();
        this.showPauseMenu();
      }
    }
  }

  update(): void {
    if (!this.gs || !this.gs.player) return;
    const safe = this.vp.safe;
    const w = this.vp.w;
    const g = this.bars;
    g.clear();
    // XP 条（安全区顶部通栏）
    const run = this.gs.run;
    const xpK = Phaser.Math.Clamp(run.xp / run.xpNeed, 0, 1);
    g.fillStyle(PAL.xpBack, 0.9);
    g.fillRect(0, safe.y, w, 9);
    g.fillStyle(PAL.xp, 1);
    g.fillRect(0, safe.y, w * xpK, 9);
    // HP 条（左上；竖屏与计时/按钮同一中线）；受击时随 hurtShakeT 衰减抖动（M17）
    let shX = 0;
    let shY = 0;
    if (this.hurtShakeT > 0) {
      this.hurtShakeT -= this.game.loop.delta / 1000;
      const k = Math.max(0, this.hurtShakeT / 0.25);
      shX = (Math.random() - 0.5) * 7 * k;
      shY = (Math.random() - 0.5) * 5 * k;
    }
    const compact = this.compactHud;
    const hpX = safe.x + (compact ? 12 : 14) + shX;
    const hpY = safe.y + (compact ? 30 : 16) + shY;
    // 桌面 HP 条与下方 6 格技能区等宽
    const slotRowW = MAX_WEAPONS * (32 + 7) - 7;
    const hpW = compact ? Math.min(130, safe.w * 0.32) : Math.min(slotRowW, safe.w * 0.35);
    const hpK = Phaser.Math.Clamp(run.hp / run.stats.maxHp, 0, 1);
    g.fillStyle(0x5a5248, 0.08);
    g.fillRoundedRect(hpX, hpY, hpW, 16, 8);
    g.fillStyle(PAL.hp, 1);
    if (hpK > 0.03) g.fillRoundedRect(hpX, hpY, Math.max(12, hpW * hpK), 16, 8);
    g.lineStyle(2, 0xe0d4bc, 1);
    g.strokeRoundedRect(hpX, hpY, hpW, 16, 8);
    // M12 HUD 打磨：低血（<30%）红描边呼吸脉冲提示
    if (hpK < 0.3) {
      g.lineStyle(2.5, 0xe05060, 0.4 + 0.4 * Math.abs(Math.sin(run.elapsed * 5)));
      g.strokeRoundedRect(hpX - 2.5, hpY - 2.5, hpW + 5, 21, 10);
    }
    this.hpText.setPosition(hpX + 6, hpY + 8).setText(Math.ceil(run.hp) + ' / ' + run.stats.maxHp);
    // M14 wisp 闪避就绪点：HP 条右侧小圆点（就绪 = 角色主题色实心；冷却 = 灰点变淡）
    if (run.char.trait === 'flicker') {
      const ready = run.flickerCdLeft <= 0;
      g.fillStyle(ready ? 0x76b896 : 0xc8bca4, ready ? 1 : 0.45);
      g.fillCircle(hpX + hpW + 12, hpY + 8, 5);
      if (ready) {
        g.lineStyle(1.5, 0xffffff, 0.9);
        g.strokeCircle(hpX + hpW + 12, hpY + 8, 5);
      }
    }

    // 计时（Boss 战期间转金色，强化阶段感）
    const sec = Math.floor(run.elapsed);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    this.timerText.setText(mm + ':' + ss).setColor(this.bossVisible ? '#C8902A' : PAL.inkCss);

    // 调试信息（设置中开启）：FPS / 实体计数 / 动态上限 + 波次预览 + 武器 DPS（M8）
    const dbg = getSettings();
    if (dbg.debugInfo) {
      const flags = (dbg.invincible ? ' 无敌' : '') + (dbg.fullPickup ? ' 全拾' : '')
        + (run.diff > 0 ? ' 狂暴' + run.diff : '') + (run.mode === 'endless' ? ' 无尽R' + run.cycle : '');
      const dyn = this.gs.dynCapMul;
      const c = this.gs.debugCounts;
      const p = this.gs.waveDir.preview();
      const cap = Math.round(p.wave.maxAlive * this.gs.enemyCapMul * dyn);
      const next = p.next
        ? p.next.kind + '@' + p.next.t + 's(剩' + Math.max(0, Math.ceil(p.next.t - run.elapsed)) + 's)'
        : '—';
      const dps = this.gs.dps.entries().slice(0, 6)
        .map(([id, d]) => t('w_' + id) + ' ' + Math.round(d))
        .join('  ');
      this.debugText.setVisible(true).setText(
        'FPS ' + Math.round(this.game.loop.actualFps) +
        ' | 敌 ' + this.gs.enemies.actives.length + '/' + cap +
        ' 珠 ' + c.gems + ' 币 ' + c.coins + ' 弹 ' + c.bullets + ' 域 ' + c.zones +
        ' | ' + this.gs.speed + 'x' + flags + (dyn < 1 ? ' cap×' + dyn : '') +
        '\n波 @' + p.wave.from + 's 每' + p.wave.interval + 's×' + p.wave.burst +
        ' ≤' + p.wave.maxAlive + ' | 下个 ' + next +
        (dps ? '\nDPS ' + dps : ''),
      );
    } else if (this.debugText.visible) {
      this.debugText.setVisible(false);
    }
    this.killText.setText(String(run.kills));
    this.coinText.setText(String(Math.floor(run.coins)));
    this.levelText.setText(t('level') + ' ' + run.level);

    // Boss 条（名称/配色随本图 Boss）
    if (this.bossVisible) {
      const boss = this.gs.enemies.boss;
      if (boss && boss.active) {
        const bw = Math.min(420, safe.w - 80);
        const bx = safe.x + safe.w / 2 - bw / 2;
        const by = safe.y + (compact ? 154 : 134);
        const bk = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
        this.bossName.setText(t('en_' + this.gs.map.bossId));
        g.fillStyle(0x5a5248, 0.1);
        g.fillRoundedRect(bx, by, bw, 12, 6);
        g.fillStyle(DEATH_COLOR[this.gs.map.bossId], 1);
        if (bk > 0.02) g.fillRoundedRect(bx, by, bw * bk, 12, 6);
        g.lineStyle(2, 0x5a6488, 0.8);
        g.strokeRoundedRect(bx, by, bw, 12, 6);
      }
    }
  }

  // ---------- 武器/被动图标栏 ----------

  /** 当前构筑 → 槽位条目（不足上限补 null 空槽；上限读 stats.maxWeapons——M13 allin 降 4，
   *  已持有超出上限时如实显示全部） */
  private weaponSlots(): Array<{ icon: string; label: string; gold: boolean } | null> {
    const out: Array<{ icon: string; label: string; gold: boolean } | null> = [];
    for (const wpn of this.gs.weapons.list) {
      const meta = WEAPON_META.find((m) => m.id === wpn.id)!;
      out.push({ icon: meta.icon, label: wpn.evolved ? '★' : String(wpn.level), gold: wpn.evolved });
    }
    while (out.length < this.gs.run.stats.maxWeapons) out.push(null);
    return out;
  }

  private passiveSlots(): Array<{ icon: string; label: string; gold: boolean } | null> {
    const out: Array<{ icon: string; label: string; gold: boolean } | null> = [];
    for (const [pid, plv] of this.gs.run.passives) {
      const meta = PASSIVE_META.find((m) => m.id === pid)!;
      out.push({ icon: meta.icon, label: String(plv), gold: false });
    }
    while (out.length < MAX_PASSIVES) out.push(null);
    return out;
  }

  /** 画一行技能槽：圆形令牌样式（图标本身为圆形），空槽常显淡圈，图标等比填入 */
  private drawSlotRow(
    x0: number,
    y: number,
    size: number,
    slots: Array<{ icon: string; label: string; gold: boolean } | null>,
    depth = 11,
    gap = 7,
  ): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const step = size + gap;
    const r = size / 2;
    const g = this.add.graphics().setDepth(depth);
    out.push(g);
    slots.forEach((s, i) => {
      const cx = x0 + i * step + r;
      const cy = y + r;
      if (s) {
        // 进化武器外圈描金
        if (s.gold) {
          g.lineStyle(2.5, 0xe2b452, 1);
          g.strokeCircle(cx, cy, r + 1);
        }
        // 图标自带白底圆与描边，铺满槽位即是完整令牌
        const icon = this.add.image(cx, cy, s.icon).setDepth(depth);
        icon.setDisplaySize(size, size);
        const lv = this.add.text(cx + r * 0.9, cy + r * 0.95, s.label, {
          fontFamily: FONT, fontSize: Math.max(10, Math.round(size * 0.34)) + 'px', fontStyle: 'bold',
          color: s.gold ? '#C8902A' : PAL.inkCss, stroke: '#FFFFFF', strokeThickness: 3,
        }).setOrigin(1, 1).setDepth(depth + 1);
        out.push(icon, lv);
      } else {
        // 空槽：淡色圆圈占位
        g.fillStyle(0xfffdf6, 0.45);
        g.fillCircle(cx, cy, r - 1);
        g.lineStyle(1.5, PAL.cardEdge, 0.55);
        g.strokeCircle(cx, cy, r - 1);
      }
    });
    return out;
  }

  private buildIconRow(): void {
    this.iconRow.forEach((o) => o.destroy());
    this.iconRow = [];
    const safe = this.vp.safe;
    const compact = this.compactHud;
    // 6+6 槽位常显：竖屏对齐 HP 条左缘、槽位更小更紧凑
    const size = compact ? 26 : 32;
    const gap = compact ? 4 : 7;
    const x0 = safe.x + (compact ? 12 : 14);
    const y = safe.y + (compact ? 56 : 44);
    this.iconRow.push(...this.drawSlotRow(x0, y, size, this.weaponSlots(), 11, gap));
    this.iconRow.push(...this.drawSlotRow(x0, y + size + gap, size, this.passiveSlots(), 11, gap));
    // 规则卡不在 HUD 常显，构筑详情见暂停面板（drawArcanaRow）
  }

  /** 规则卡小方卡行（暂停面板）：白卡底 + 主题色描边 + 图标 */
  private drawArcanaRow(
    x0: number,
    y: number,
    size: number,
    arcana: readonly ArcanaId[],
    depth = 101,
    gap = 8,
  ): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics().setDepth(depth);
    out.push(g);
    arcana.forEach((id, i) => {
      const meta = ARCANA_META.find((m) => m.id === id)!;
      const x = x0 + i * (size + gap);
      g.fillStyle(0x5a5248, 0.08);
      g.fillRoundedRect(x + 1.5, y + 3, size, size, 7);
      g.fillStyle(PAL.cardBg, 1);
      g.fillRoundedRect(x, y, size, size, 7);
      g.lineStyle(2, meta.color, 1);
      g.strokeRoundedRect(x, y, size, size, 7);
      const icon = this.add.image(x + size / 2, y + size / 2, meta.icon).setDepth(depth);
      icon.setDisplaySize(size - 10, size - 10);
      out.push(icon);
    });
    return out;
  }

  // ---------- 警告横幅 ----------

  private showWarn(key: string): void {
    this.warnText.setText(t(key)).setVisible(true).setAlpha(0).setScale(0.8);
    this.tweens.add({
      targets: this.warnText, alpha: 1, scale: 1, duration: 250, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.warnText, alpha: 0, delay: 1600, duration: 400,
          onComplete: () => this.warnText.setVisible(false),
        });
      },
    });
  }

  // ---------- 金色横幅 toast（成就达成 / 自动选卡获得规则卡），多个时排队 ----------

  private toastQueue: Array<{ text: string; hold: number }> = [];
  private toastBusy = false;

  private queueAchToast(id: string): void {
    this.queueToast(t('achUnlocked') + ' ' + t('ach_' + id));
  }

  /** hold = 淡出前停留毫秒（M14 引导 tips 3500，常规横幅 1700） */
  private queueToast(text: string, hold = 1700): void {
    this.toastQueue.push({ text, hold });
    this.pumpToast();
  }

  private pumpToast(): void {
    if (this.toastBusy) return;
    const entry = this.toastQueue.shift();
    if (entry === undefined) return;
    this.toastBusy = true;
    const safe = this.vp.safe;
    const toast = this.add.text(safe.x + safe.w / 2, safe.y + safe.h * 0.22, entry.text, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#C8902A',
      stroke: '#FFFFFF', strokeThickness: 6, align: 'center',
      wordWrap: { width: safe.w - 50, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(21).setAlpha(0).setScale(0.8);
    SFX.levelup();
    this.tweens.add({
      targets: toast, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast, alpha: 0, delay: entry.hold, duration: 350,
          onComplete: () => {
            toast.destroy();
            this.toastBusy = false;
            this.pumpToast();
          },
        });
      },
    });
  }

  // ---------- 升级三选一 / 规则卡三选一 ----------

  private pendingOffers: Offer[] = [];
  private pendingArcana: ArcanaId[] = [];
  // 放逐改版（M16.5）：与重抽/跳过同排的按钮，点击进入「选卡放逐」模式
  private pickCards: Array<{ offer: Offer; card: Phaser.GameObjects.Container; banishable: boolean }> = [];
  private banishMode = false;
  private banishAnim = false; // 放逐演出进行中：屏蔽一切选卡/按钮输入
  private banishBtn: UIButton | null = null;
  private banishMarks: Phaser.GameObjects.GameObject[] = [];

  /** 选卡卡片几何（升级与规则卡共用）：竖屏纵排 / 横屏横排 */
  private pickCardGeom(i: number, n: number): { cx: number; cy: number; cw: number; ch: number; portrait: boolean } {
    const w = this.vp.w;
    const h = this.vp.h;
    const portrait = h > w;
    if (portrait) {
      const cw = Math.min(340, w - 40);
      const ch = Math.min(120, (h * 0.6) / n - 14);
      return { cx: w / 2, cy: h * 0.3 + i * (ch + 16), cw, ch, portrait };
    }
    const cw = Math.min(215, (w - 80) / n - 16);
    const ch = 250;
    return { cx: w / 2 + (i - (n - 1) / 2) * (cw + 18), cy: h * 0.52, cw, ch, portrait };
  }

  /** 选卡标题（升级与规则卡共用） */
  private addPickTitle(text: string): void {
    const w = this.vp.w;
    const title = this.add.text(w / 2, this.vp.h * 0.14, text, {
      fontFamily: FONT, fontSize: Math.min(30, w * 0.062) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(101).setScale(0.5);
    this.tweens.add({ targets: title, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.overlay.push(title);
  }

  /** 选卡构筑栏（M12）：标题下一行 6+6 微缩令牌 + 精华计数；矮屏（<560）空间不足时省略 */
  private addBuildBar(): void {
    const h = this.vp.h;
    if (h < 560) return;
    const w = this.vp.w;
    const slots = [...this.weaponSlots(), ...this.passiveSlots()];
    const gap = 4;
    const size = Math.max(18, Math.min(24, (w - 64) / slots.length - gap));
    const ess = this.gs.run.essence;
    const essN = ess.dmg + ess.cd + ess.area;
    const extraW = essN > 0 ? 44 : 0;
    const rowW = slots.length * (size + gap) - gap;
    const x0 = w / 2 - (rowW + extraW) / 2;
    const y = h * 0.14 + 24;
    this.overlay.push(...this.drawSlotRow(x0, y, size, slots, 101, gap));
    if (essN > 0) {
      const txt = this.add.text(x0 + rowW + 10, y + size / 2, '✦×' + essN, {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#C8902A',
        stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(101);
      this.overlay.push(txt);
    }
  }

  private showLevelUp(offers: Offer[]): void {
    // 调试：自动选第一张卡，跳过选卡界面
    if (getSettings().autoPick && offers.length > 0) {
      this.gs.levelUp.applyOffer(offers[0]);
      this.scene.resume('game');
      return;
    }
    this.overlayMode = 'levelup';
    this.pendingOffers = offers;
    this.pickCards = [];
    this.banishMode = false;
    this.banishAnim = false;
    this.banishMarks = [];
    this.overlay.push(this.addVeil());
    this.addPickTitle(t('levelUpTitle'));
    this.addBuildBar(); // M12 选卡构筑栏：当前持有一览，放逐/重抽决策有依据
    offers.forEach((offer, i) => {
      const banishable = offer.kind === 'weapon' || offer.kind === 'passive';
      const card = this.makePickCard(this.offerInfo(offer), i, this.pickCardGeom(i, offers.length), () => this.onCardTap(offer));
      this.pickCards.push({ offer, card, banishable });
    });
    this.addLevelUpActions(offers.length);
  }

  /** 选卡点击统一入口：放逐模式下点卡 = 放逐该卡，否则正常拾取 */
  private onCardTap(offer: Offer): void {
    if (this.banishAnim) return;
    if (this.banishMode) this.banishCard(offer);
    else this.chooseOffer(offer);
  }

  /** 重抽/放逐/跳过胶囊按钮行（M10；M16.5 放逐从卡面角标改为同排按钮）：
   *  横屏卡下居中一行 / 竖屏条卡下三按钮均分条卡宽 */
  private addLevelUpActions(n: number): void {
    const run = this.gs.run;
    const last = this.pickCardGeom(n - 1, n);
    const y = last.cy + last.ch / 2 + 36;
    const bw = last.portrait ? Math.min(118, last.cw * 0.32) : 140;
    const gap = last.portrait ? Math.max(6, (last.cw - bw * 3) / 2) : 14;
    const fs = last.portrait ? 14 : 15;
    const cx = this.vp.w / 2;
    const step = bw + gap;
    const reroll = new UIButton(this, cx - step, y, {
      w: bw, h: 40, label: t('lvl_reroll').replace('{n}', String(run.rerolls)),
      fontSize: fs, onTap: () => this.doReroll(),
    });
    const banish = new UIButton(this, cx, y, {
      w: bw, h: 40, label: t('lvl_banish').replace('{n}', String(run.banishes)),
      fontSize: fs, onTap: () => this.toggleBanish(),
    });
    const skip = new UIButton(this, cx + step, y, {
      w: bw, h: 40, label: t('lvl_skip').replace('{n}', String(run.skips)),
      fontSize: fs, onTap: () => this.doSkip(),
    });
    // 精华三选一（M12）不可重抽（重抽对永续成长卡无意义）；skip 照常可用
    const hasEssence = this.pendingOffers.some((o) => o.kind === 'essence');
    if (run.rerolls <= 0 || hasEssence) reroll.setEnabled(false);
    // 放逐：次数耗尽或面板上没有可放逐卡（精华/回血/金币层）时置灰
    if (run.banishes <= 0 || !this.pickCards.some((p) => p.banishable)) banish.setEnabled(false);
    if (run.skips <= 0) skip.setEnabled(false);
    reroll.setDepth(101);
    banish.setDepth(101);
    skip.setDepth(101);
    this.banishBtn = banish;
    this.overlay.push(reroll, banish, skip);
  }

  private doReroll(): void {
    if (this.overlayMode !== 'levelup' || this.gs.run.rerolls <= 0 || this.banishAnim || this.banishMode) return;
    SFX.uiClick();
    this.closeOverlay();
    this.gs.levelUp.reroll(); // 重发 hud:levelup → showLevelUp 重绘
  }

  private doSkip(): void {
    if (this.overlayMode !== 'levelup' || this.gs.run.skips <= 0 || this.banishAnim || this.banishMode) return;
    SFX.uiClick();
    this.closeOverlay();
    this.gs.levelUp.skip();
    this.scene.resume('game');
  }

  // ---------- 放逐模式（M16.5）：按钮进入选卡放逐，点卡盖章演出后原位补抽 ----------

  private toggleBanish(): void {
    if (this.overlayMode !== 'levelup' || this.banishAnim) return;
    if (!this.banishMode && this.gs.run.banishes <= 0) return;
    this.banishMode = !this.banishMode;
    this.applyBanishVisuals();
  }

  /** 模式视觉：可放逐卡盖红 ✕ 角章脉动 + 不可放逐卡减淡；按钮变「取消」；标题行换提示 */
  private applyBanishVisuals(): void {
    this.banishMarks.forEach((o) => o.destroy());
    this.banishMarks = [];
    const run = this.gs.run;
    if (this.banishMode) {
      this.banishBtn?.setLabel(t('lvl_banishCancel'));
      // 提示行放在卡组上缘（按钮行与卡底间隙不足 16px，会压住卡片描边）
      const firstGeom = this.pickCardGeom(0, this.pickCards.length);
      const hint = this.add.text(this.vp.w / 2, firstGeom.cy - firstGeom.ch / 2 - 20, t('banishPick'), {
        fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#C06870',
        stroke: '#FFFFFF', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(102).setAlpha(0);
      this.tweens.add({ targets: hint, alpha: 1, duration: 180 });
      this.overlay.push(hint);
      this.banishMarks.push(hint);
      for (const p of this.pickCards) {
        if (!p.banishable) {
          p.card.setAlpha(0.4);
          continue;
        }
        const mark = this.add.text(p.card.x + p.card.width / 2 - 16, p.card.y - p.card.height / 2 + 2, '✕', {
          fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#C06870',
          stroke: '#FFFFFF', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(103).setScale(0);
        this.tweens.add({ targets: mark, scale: 1, duration: 200, ease: 'Back.easeOut' });
        this.tweens.add({ targets: mark, scale: 1.18, delay: 220, duration: 460, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.overlay.push(mark);
        this.banishMarks.push(mark);
      }
    } else {
      this.banishBtn?.setLabel(t('lvl_banish').replace('{n}', String(run.banishes)));
      for (const p of this.pickCards) p.card.setAlpha(1);
    }
  }

  /** 放逐选中卡：红章盖卡 + 碎屑飞散演出，结束后原位补抽并重发面板 */
  private banishCard(offer: Offer): void {
    if (this.overlayMode !== 'levelup' || this.gs.run.banishes <= 0) return;
    const entry = this.pickCards.find((p) => p.offer === offer);
    if (!entry) return;
    if (!entry.banishable) {
      // 摇头：精华/回血/金币卡不可放逐
      this.tweens.add({ targets: entry.card, x: entry.card.x + 7, duration: 48, yoyo: true, repeat: 3 });
      return;
    }
    this.banishAnim = true;
    SFX.swish();
    const card = entry.card;
    const stamp = this.add.text(card.x, card.y, '✕', {
      fontFamily: FONT, fontSize: '64px', fontStyle: 'bold', color: '#C06870',
      stroke: '#FFFFFF', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(103).setScale(0);
    this.overlay.push(stamp);
    this.tweens.add({ targets: stamp, scale: 1, duration: 150, ease: 'Back.easeOut' });
    this.tweens.add({ targets: stamp, alpha: 0, delay: 260, duration: 180 });
    // 卡片旋坠淡出 + 碎屑
    this.tweens.add({
      targets: card, alpha: 0, angle: (card.x < this.vp.w / 2 ? -1 : 1) * 14, y: card.y + 46, scale: 0.82,
      delay: 110, duration: 300, ease: 'Cubic.easeIn',
    });
    for (let i = 0; i < 10; i++) {
      const sx = card.x + (Math.random() - 0.5) * card.width * 0.7;
      const sy = card.y + (Math.random() - 0.5) * card.height * 0.7;
      const p = this.add.image(sx, sy, 'p_confetti').setTint(0xc06870).setDepth(103).setScale(1.1);
      this.overlay.push(p);
      this.tweens.add({
        targets: p, x: sx + (Math.random() - 0.5) * 90, y: sy + 60 + Math.random() * 60,
        alpha: 0, rotation: Math.random() * 6, delay: 110, duration: 420, ease: 'Cubic.easeOut',
      });
    }
    const first = this.gs.run.banished.size === 0;
    this.time.delayedCall(450, () => {
      if (this.overlayMode !== 'levelup') return;
      this.banishAnim = false;
      this.closeOverlay();
      this.gs.levelUp.banish(offer); // 原位补抽一张并重发 hud:levelup
      if (first) this.queueToast(t('banishToast'));
    });
  }

  /** 规则卡选卡（M9）：全部未持有卡一次铺开任选其一（与升级三选一的横排大卡明显区分——
   *  全卡池网格 + 顶部色带方卡）；素色幕布 */
  private showArcanaPick(choices: ArcanaId[]): void {
    // 调试「自动选卡」：自动选第一张并以金色横幅告知（避免静默跳过开局选卡造成困惑）
    if (getSettings().autoPick && choices.length > 0) {
      this.gs.levelUp.applyArcana(choices[0]);
      this.queueToast(t('arcGet').replace('{n}', t('arc_' + choices[0])));
      this.scene.resume('game');
      return;
    }
    this.overlayMode = 'arcana';
    this.pendingArcana = choices;
    this.overlay.push(this.addVeil());
    this.addPickTitle(t('arcanaTitle'));
    this.layoutArcanaGrid(choices, (id) => this.chooseArcana(id));
  }

  /** 全卡池网格（开局选卡与宝箱规则卡件共用）：横屏 4 列 / 竖屏 2 列；末行不满时居中。
   *  恒排满全部 16 卡（排版稳定不随持有数变化）：可选 / 已持有（置灰 ✓）/ 未解锁（M13 机制卡显示解锁条件） */
  private layoutArcanaGrid(pickable: ArcanaId[], onPick: (id: ArcanaId) => void): void {
    const w = this.vp.w;
    const h = this.vp.h;
    const all = ARCANA_META.map((m) => m.id);
    const portrait = h > w;
    const cols = portrait ? 2 : 4;
    const rows = Math.ceil(all.length / cols);
    const gapX = 12;
    const gapY = 12;
    const top = h * 0.2;
    const areaH = h * 0.94 - top;
    const cw = Math.min(portrait ? 200 : 224, (w - (portrait ? 28 : 80) - (cols - 1) * gapX) / cols);
    const ch = Math.min(portrait ? 136 : 260, (areaH - (rows - 1) * gapY) / rows);
    const gridH = rows * ch + (rows - 1) * gapY;
    const y0 = top + Math.max(0, (areaH - gridH) / 2);
    all.forEach((id, i) => {
      const row = Math.floor(i / cols);
      const col = i - row * cols;
      const inRow = Math.min(cols, all.length - row * cols);
      const rowW = inRow * cw + (inRow - 1) * gapX;
      const cx = w / 2 - rowW / 2 + col * (cw + gapX) + cw / 2;
      const cy = y0 + row * (ch + gapY) + ch / 2;
      const state = pickable.includes(id) ? 'pick'
        : this.gs.run.arcana.includes(id) ? 'owned'
        : Meta.isArcanaUnlocked(id) ? 'owned' : 'locked';
      this.makeArcanaCard(id, i, cx, cy, cw, ch, () => onPick(id), state);
    });
  }

  /** 方形规则卡：白卡底 + 主题色描边 + 顶部色带托图标；尺寸自适应（极矮卡省略描述）。
   *  state（M13 三态，排版完全一致）：pick 可选；owned 置灰 + ✓ 已持有；
   *  locked 未解锁机制卡——描述替换为解锁条件（成就名），不可选 */
  private makeArcanaCard(
    id: ArcanaId,
    idx: number,
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    onPick: () => void,
    state: 'pick' | 'owned' | 'locked' = 'pick',
  ): void {
    const meta = ARCANA_META.find((m) => m.id === id)!;
    const dim = state !== 'pick';
    const big = ch >= 180; // 桌面大卡 / 竖屏小卡
    const showDesc = ch >= 96;
    const bandH = big ? ch * 0.38 : ch * 0.42;
    const edge = dim ? 0xc8bca4 : meta.color;
    const g = this.add.graphics();
    const draw = (over: boolean) => {
      g.clear();
      g.fillStyle(0x5a5248, 0.08);
      g.fillRoundedRect(-cw / 2 + 2, -ch / 2 + 4, cw, ch, 10);
      g.fillStyle(over ? 0xfffef8 : dim ? 0xf2ece0 : PAL.cardBg, 1);
      g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 10);
      // 顶部色带（卡牌感；与升级卡的纯白底区分）
      g.fillStyle(edge, over ? 0.4 : dim ? 0.18 : 0.26);
      g.fillRoundedRect(-cw / 2, -ch / 2, cw, bandH, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.lineStyle(2.5, edge, dim ? 0.7 : 1);
      g.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 10);
    };
    draw(false);
    const icon = this.add.image(0, -ch / 2 + bandH / 2, meta.icon)
      .setScale(big ? 1.5 : Math.max(0.8, bandH / 46));
    const nameTxt = this.add.text(0, -ch / 2 + bandH + (big ? 12 : 6), t('arc_' + id), {
      fontFamily: FONT, fontSize: (big ? 18 : 14) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      align: 'center', wordWrap: { width: cw - 16 },
    }).setOrigin(0.5, 0);
    const parts: Phaser.GameObjects.GameObject[] = [g, icon, nameTxt];
    // M13 机制卡 ★ 角标（色带左上角，区别于基础卡）
    if (meta.tier === 'mechanic') {
      const starTag = this.add.text(-cw / 2 + 8, -ch / 2 + 5, '★ ' + t('arcMech'), {
        fontFamily: FONT, fontSize: (big ? 12 : 10) + 'px', fontStyle: 'bold', color: '#C8902A',
        stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0, 0);
      parts.push(starTag);
    }
    if (showDesc) {
      // locked：描述替换为解锁条件（成就名）
      const ach = state === 'locked' ? ACHIEVEMENTS.find((a) => a.unlockArcana === id) : undefined;
      const descStr = ach
        ? t('ui_unlockBy').replace('{a}', t('ach_' + ach.id))
        : state === 'locked' ? t('ui_lockedHint') : t('arc_' + id + '_d');
      const descTxt = this.add.text(0, nameTxt.y + nameTxt.height + (big ? 8 : 3), descStr, {
        fontFamily: FONT, fontSize: (big ? 13 : 11) + 'px', color: PAL.inkSoft, align: 'center',
        wordWrap: { width: cw - 18 },
      }).setOrigin(0.5, 0);
      parts.push(descTxt);
    }
    if (dim) {
      // 内容整体减淡 + 底部角标（已持有 ✓ / 未解锁）
      icon.setAlpha(0.45);
      nameTxt.setAlpha(0.55);
      const tagStr = state === 'owned' ? '✓ ' + t('arcOwned') : t('ui_locked');
      const dimTag = this.add.text(0, ch / 2 - (big ? 14 : 10), tagStr, {
        fontFamily: FONT, fontSize: (big ? 14 : 11) + 'px', fontStyle: 'bold', color: '#B8924A',
      }).setOrigin(0.5, 1);
      parts.push(dimTag);
    }
    const c = this.add.container(cx, cy, parts).setDepth(101).setAlpha(0).setScale(0.7);
    c.setSize(cw, ch);
    if (!dim) {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => draw(true));
      c.on('pointerout', () => draw(false));
      c.on('pointerup', onPick);
    }
    this.tweens.add({
      targets: c, alpha: dim ? 0.75 : 1, scale: 1, duration: 240, delay: 28 * idx, ease: 'Back.easeOut',
    });
    this.overlay.push(c);
  }

  private chooseArcana(id: ArcanaId): void {
    if (this.overlayMode !== 'arcana') return;
    SFX.uiClick();
    this.closeOverlay();
    this.gs.levelUp.applyArcana(id);
    this.scene.resume('game');
  }

  private offerInfo(offer: Offer): PickCardInfo {
    const tagColor = offer.isNew ? '#C06870' : '#B8924A';
    if (offer.kind === 'essence') {
      // 晨露精华（M12 满构筑溢出）：金边卡 + 永续标签
      const icon = offer.essence === 'dmg' ? 'icon_power' : offer.essence === 'cd' ? 'icon_lens' : 'icon_cloud';
      return {
        icon,
        name: t('ess_' + offer.essence),
        desc: t('ess_' + offer.essence + '_d'),
        color: 0xe2b452,
        tag: t('essTag'),
        tagColor: '#C8902A',
      };
    }
    if (offer.kind === 'weapon') {
      const meta = WEAPON_META.find((m) => m.id === offer.id)!;
      return {
        icon: meta.icon,
        name: t('w_' + offer.id),
        desc: t('w_' + offer.id + '_d'),
        color: meta.color,
        tag: offer.isNew ? t('newTag') : 'Lv ' + offer.toLevel,
        tagColor,
        evoHint: this.weaponEvoHint(offer),
      };
    }
    if (offer.kind === 'passive') {
      const meta = PASSIVE_META.find((m) => m.id === offer.id)!;
      // M14 进化引导：该被动恰是某把已持有未进化武器的配方 → 配对提示
      const pair = this.gs.weapons.list.find(
        (w) => !w.evolved && WEAPON_META.find((m) => m.id === w.id)?.evolvesWith === offer.id,
      );
      return {
        icon: meta.icon,
        name: t('p_' + offer.id),
        desc: t('p_' + offer.id + '_d'),
        color: meta.color,
        tag: offer.isNew ? t('newTag') : 'Lv ' + offer.toLevel,
        tagColor,
        evoHint: pair ? { text: t('evoHintPair').replace('{w}', t('w_' + pair.id)), ready: false } : undefined,
      };
    }
    if (offer.kind === 'heal') {
      return { icon: 'icon_heal', name: t('c_heal'), desc: t('c_heal_d'), color: PAL.heart, tag: '', tagColor };
    }
    return { icon: 'icon_gold', name: t('c_gold'), desc: t('c_gold_d'), color: PAL.xp, tag: '', tagColor };
  }

  /** 武器卡进化角标（M14）：toLevel===5 且配对被动已持有 → 金色就绪；否则灰色配方小字 */
  private weaponEvoHint(offer: Offer): PickCardInfo['evoHint'] {
    const meta = WEAPON_META.find((m) => m.id === offer.id);
    if (!meta) return undefined;
    const passives = this.gs.run.passives;
    if (meta.evolvesWith === null) {
      // mine 通配：任意被动满级
      let anyMax = false;
      for (const lv of passives.values()) {
        if (lv >= PASSIVE_MAX_LEVEL) anyMax = true;
      }
      return offer.toLevel === WEAPON_MAX_LEVEL && anyMax
        ? { text: t('evoHintReady'), ready: true }
        : { text: t('evoHintAny'), ready: false };
    }
    return offer.toLevel === WEAPON_MAX_LEVEL && passives.has(meta.evolvesWith)
      ? { text: t('evoHintReady'), ready: true }
      : { text: t('evoHintNeed').replace('{p}', t('p_' + meta.evolvesWith)), ready: false };
  }

  /** 选卡卡片；返回容器供放逐模式做标记/演出（M16.5 起卡面不再带放逐角标） */
  private makePickCard(
    info: PickCardInfo,
    idx: number,
    geom: { cx: number; cy: number; cw: number; ch: number; portrait: boolean },
    onPick: () => void,
  ): Phaser.GameObjects.Container {
    const { cx, cy, cw, ch, portrait } = geom;
    const g = this.add.graphics();
    const draw = (over: boolean) => {
      g.clear();
      g.fillStyle(0x5a5248, 0.1);
      g.fillRoundedRect(-cw / 2 + 3, -ch / 2 + 5, cw, ch, 16);
      g.fillStyle(over ? 0xfffef8 : PAL.cardBg, 1);
      g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 16);
      g.lineStyle(3, info.color, 1);
      g.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 16);
    };
    draw(false);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    if (portrait) {
      const icon = this.add.image(-cw / 2 + 38, 0, info.icon).setScale(1.3);
      const name = this.add.text(-cw / 2 + 72, -ch / 2 + 16, info.name, {
        fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: PAL.inkCss,
      });
      const tag = this.add.text(cw / 2 - 14, -ch / 2 + 16, info.tag, {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold',
        color: info.tagColor,
      }).setOrigin(1, 0);
      const desc = this.add.text(-cw / 2 + 72, -ch / 2 + 44, info.desc, {
        fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft,
        wordWrap: { width: cw - 96 },
      });
      parts.push(icon, name, tag, desc);
      // M14 进化角标：desc 下方 12px 一行（极矮条卡 <96 省略，与 showDesc 同门槛思路）
      if (info.evoHint && ch >= 96) {
        parts.push(this.add.text(-cw / 2 + 72, ch / 2 - 7, info.evoHint.text, {
          fontFamily: FONT, fontSize: '12px', fontStyle: info.evoHint.ready ? 'bold' : 'normal',
          color: info.evoHint.ready ? '#C8902A' : '#A89F8E',
          wordWrap: { width: cw - 96 },
        }).setOrigin(0, 1));
      }
    } else {
      const icon = this.add.image(0, -ch / 2 + 56, info.icon).setScale(1.6);
      const name = this.add.text(0, -ch / 2 + 104, info.name, {
        fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: PAL.inkCss, align: 'center',
        wordWrap: { width: cw - 20 },
      }).setOrigin(0.5, 0);
      const tag = this.add.text(0, -ch / 2 + 132, info.tag, {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold',
        color: info.tagColor,
      }).setOrigin(0.5, 0);
      const desc = this.add.text(0, -ch / 2 + 158, info.desc, {
        fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft, align: 'center',
        wordWrap: { width: cw - 26 },
      }).setOrigin(0.5, 0);
      const num = this.add.text(-cw / 2 + 12, -ch / 2 + 8, String(idx + 1), {
        fontFamily: FONT, fontSize: '13px', color: '#C8BCA4',
      });
      parts.push(icon, name, tag, desc, num);
      // M14 进化角标：卡底居中一行
      if (info.evoHint) {
        parts.push(this.add.text(0, ch / 2 - 10, info.evoHint.text, {
          fontFamily: FONT, fontSize: '12px', fontStyle: info.evoHint.ready ? 'bold' : 'normal',
          color: info.evoHint.ready ? '#C8902A' : '#A89F8E', align: 'center',
          wordWrap: { width: cw - 22, useAdvancedWrap: true },
        }).setOrigin(0.5, 1));
      }
    }
    const c = this.add.container(cx, cy + 24, parts).setDepth(101).setAlpha(0);
    c.setSize(cw, ch);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerup', onPick);
    this.tweens.add({ targets: c, alpha: 1, y: cy, duration: 260, delay: 90 * idx, ease: 'Cubic.easeOut' });
    this.overlay.push(c);
    return c;
  }

  private pickByIndex(i: number): void {
    if (this.overlayMode === 'levelup') {
      const offer = this.pendingOffers[i];
      if (offer) this.onCardTap(offer); // 放逐模式下数字键同样指放逐目标
    } else if (this.overlayMode === 'arcana') {
      const id = this.pendingArcana[i];
      if (id) this.chooseArcana(id);
    }
  }

  private chooseOffer(offer: Offer): void {
    if (this.overlayMode !== 'levelup' || this.banishAnim) return;
    SFX.uiClick();
    this.closeOverlay();
    this.gs.levelUp.applyOffer(offer);
    this.scene.resume('game');
  }

  // ---------- 宝箱 ----------

  private chestTitle: Phaser.GameObjects.Text | null = null;

  private showChest(reward: ChestReward): void {
    this.overlayMode = 'chest';
    const w = this.vp.w;
    const h = this.vp.h;
    const cx = w / 2;
    const cy = h * 0.45;
    const veil = this.addVeil();
    this.chestTitle = this.add.text(cx, h * 0.2, t('chestTitle'), {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(101);
    // 待开演出：地面光环呼吸 + 宝箱浮动
    const halo = this.add.image(cx, cy + 4, 'p_dot').setTint(0xf2cf6e).setAlpha(0.5)
      .setDisplaySize(170, 170).setDepth(100);
    const chest = this.add.image(cx, cy, 'chest').setScale(3).setDepth(101);
    const hint = this.add.text(cx, h * 0.62, t('chestOpen'), {
      fontFamily: FONT, fontSize: '17px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(101);
    this.tweens.add({
      targets: halo, displayWidth: 210, displayHeight: 210, alpha: 0.28,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({ targets: chest, y: cy - 7, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.overlay.push(veil, this.chestTitle, halo, chest, hint);

    const zone = this.add.zone(0, 0, w, h).setOrigin(0).setDepth(102).setInteractive();
    this.overlay.push(zone);
    zone.once('pointerup', () => {
      // 立即销毁：zone 在 depth 102，topOnly 输入下会拦住其下（101）的规则卡选卡（卡死根因）
      zone.destroy();
      hint.destroy();
      this.tweens.killTweensOf(chest);
      chest.setPosition(cx, cy);
      // 蓄力摇晃 → 爆发
      this.tweens.add({ targets: chest, scale: 3.35, duration: 400, ease: 'Cubic.easeIn' });
      this.tweens.add({
        targets: chest, angle: { from: -7, to: 7 }, duration: 56, yoyo: true, repeat: 6, ease: 'Sine.easeInOut',
        onComplete: () => this.chestBurst(reward, chest, halo),
      });
    });
  }

  /** 开箱爆发（M11.5 演出强化）：白闪 + 旋转光芒 + 双金环冲击波 + 纸屑/星屑喷泉 */
  private chestBurst(reward: ChestReward, chest: Phaser.GameObjects.Image, halo: Phaser.GameObjects.Image): void {
    const w = this.vp.w;
    const h = this.vp.h;
    const cx = chest.x;
    const cy = chest.y;
    SFX.levelup();
    this.tweens.killTweensOf(halo);
    halo.destroy();
    // 宝箱本体弹飞
    this.tweens.add({ targets: chest, scale: 0, angle: 36, y: cy - 26, duration: 240, ease: 'Back.easeIn' });
    // 白闪（柔光圆扩散）
    const flash = this.add.image(cx, cy, 'p_dot').setDisplaySize(90, 90).setDepth(105);
    this.overlay.push(flash);
    this.tweens.add({
      targets: flash, displayWidth: Math.max(w, h) * 1.5, displayHeight: Math.max(w, h) * 1.5,
      alpha: 0, duration: 600, ease: 'Cubic.easeOut',
    });
    // 旋转金色光芒（揭示期常驻背景，随面板关闭销毁）
    const rays = this.add.graphics().setPosition(cx, cy).setDepth(100).setAlpha(0);
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2;
      rays.fillStyle(0xf2cf6e, 0.15);
      rays.slice(0, 0, Math.max(w, h) * 0.6, a0, a0 + 0.15);
      rays.fillPath();
    }
    this.overlay.push(rays);
    this.tweens.add({ targets: rays, alpha: 1, duration: 500 });
    this.tweens.add({ targets: rays, rotation: Math.PI * 2, duration: 36000, repeat: -1 });
    // 双金环冲击波
    [0xe2b452, 0xfff2c0].forEach((tint, i) => {
      const ring = this.add.image(cx, cy, 'p_ring').setTint(tint).setScale(0.4).setAlpha(0.9).setDepth(104);
      this.overlay.push(ring);
      this.tweens.add({
        targets: ring, scale: 3.2 + i * 1.2, alpha: 0, delay: i * 140, duration: 650, ease: 'Cubic.easeOut',
      });
    });
    // 纸屑 + 星屑喷泉（先冲后落）
    for (let i = 0; i < 54; i++) {
      const isStar = i % 4 === 0;
      const p = this.add.image(cx, cy, isStar ? 'p_star' : 'p_confetti')
        .setTint(isStar ? 0xf2cf6e : [PAL.petal, PAL.blade, PAL.boom, PAL.mine, PAL.rain][i % 5])
        .setDepth(103).setScale(isStar ? 1.1 : 1.4);
      this.overlay.push(p);
      const a = Math.random() * Math.PI * 2;
      const sp = 140 + Math.random() * 320;
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(a) * sp,
        y: cy + Math.sin(a) * sp * 0.8 + 150,
        rotation: Math.random() * 9,
        alpha: 0,
        scale: isStar ? 0.4 : 0.8,
        duration: 850 + Math.random() * 450,
        ease: 'Cubic.easeOut',
      });
    }
    this.time.delayedCall(380, () => this.revealChestReward(reward));
  }

  /** 揭示阶段：单件 → 大图标；多件（3/5）→ 清单；含规则卡件 → 全卡池任选其一（与开局一致） */
  private revealChestReward(reward: ChestReward): void {
    const w = this.vp.w;
    const h = this.vp.h;
    const auto = getSettings().autoPick; // 调试口径：规则卡件直取首张，不进选卡
    const items = reward.items;
    const arc = items.find((it): it is Extract<ChestItem, { kind: 'arcana' }> => it.kind === 'arcana');
    const finish = (pick?: ArcanaId): void => {
      this.closeOverlay();
      this.gs.levelUp.applyChest(reward, pick);
      this.scene.resume('game');
    };
    // 单件规则卡：直接进全卡池选卡（与开局选卡同一版式）
    if (items.length === 1 && arc && !auto) {
      this.chestTitle?.setText(t('chestArcanaPick'));
      this.layoutArcanaGrid(arc.cards, (id) => {
        if (this.overlayMode !== 'chest') return;
        SFX.uiClick();
        finish(id);
      });
      return;
    }
    // 本阶段对象单独登记：含规则卡件时点 OK 转入选卡，需要先清掉清单
    const revealObjs: Phaser.GameObjects.GameObject[] = [];
    const track = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.overlay.push(o);
      revealObjs.push(o);
      return o;
    };
    const itemInfo = (it: ChestItem): { icon: string; tint?: number; label: string } => {
      if (it.kind === 'evolve') {
        return { icon: WEAPON_META.find((m) => m.id === it.weapon)!.icon, label: t('evolveTag') + '！ ' + t('w_' + it.weapon + '_e') };
      }
      if (it.kind === 'arcana') {
        return auto
          ? { icon: ARCANA_META.find((m) => m.id === it.cards[0])!.icon, label: t('arcTag') + '！ ' + t('arc_' + it.cards[0]) }
          : { icon: 'p_star', tint: 0xe2b452, label: t('chestArcanaRow') };
      }
      if (it.kind === 'upgrade') {
        const o = it.offer;
        const name = o.kind === 'weapon' ? t('w_' + o.id) : t('p_' + o.id);
        const icon = o.kind === 'weapon'
          ? WEAPON_META.find((m) => m.id === o.id)!.icon
          : PASSIVE_META.find((m) => m.id === o.id)!.icon;
        return { icon, label: name + ' Lv ' + o.toLevel };
      }
      return { icon: 'coin', label: t('chestGold').replace('{c}', String(it.coins)).replace('{h}', String(it.heal)) };
    };

    if (items.length === 1) {
      // 单件：大图标 + 金色光晕脉冲 + 环绕星光 + 说明（进化/规则卡补描述行）
      const it = items[0];
      const info = itemInfo(it);
      let label = info.label;
      if (it.kind === 'evolve') label += '\n' + t('w_' + it.weapon + '_e_d');
      if (it.kind === 'arcana') label += '\n' + t('arc_' + it.cards[0] + '_d');
      if (it.kind === 'upgrade') label = t('chestUpgrade') + '\n' + info.label;
      const glow = track(this.add.image(w / 2, h * 0.42, 'p_dot').setTint(0xf2cf6e).setAlpha(0.6)
        .setDisplaySize(120, 120).setDepth(103));
      this.tweens.add({
        targets: glow, displayWidth: 150, displayHeight: 150, alpha: 0.35,
        duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      const icon = track(this.add.image(w / 2, h * 0.42, info.icon).setScale(0).setDepth(104));
      if (info.tint !== undefined) icon.setTint(info.tint);
      this.tweens.add({ targets: icon, scale: 2.4, duration: 400, ease: 'Back.easeOut' });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const s = track(this.add.image(w / 2 + Math.cos(a) * 64, h * 0.42 + Math.sin(a) * 52, 'p_star')
          .setTint(0xf2cf6e).setScale(0.5 + (i % 3) * 0.25).setAlpha(0).setDepth(104));
        this.tweens.add({
          targets: s, alpha: { from: 0.9, to: 0.15 }, scale: '+=0.3',
          delay: 90 * i, duration: 480, yoyo: true, repeat: 5,
        });
      }
      track(this.add.text(w / 2, h * 0.58, label, {
        fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: PAL.inkCss, align: 'center',
        stroke: '#FFFFFF', strokeThickness: 5, wordWrap: { width: w - 60 },
      }).setOrigin(0.5).setDepth(104));
    } else {
      // 多件（3/5，M16.5 改版）：金光令牌阵列——大图标 + 光晕 + 星屑逐个迸出，
      // 与单件同一档演出规格（此前的清单小图标反而比单件寒酸）
      this.chestTitle?.setText(t('chestRich').replace('{n}', String(items.length)));
      const n = items.length;
      const perRow = n === 5 && w < 620 ? 3 : n; // 窄屏 5 件拆两行（3+2）
      const stepX = Math.min(150, (w - 50) / perRow);
      const rowN = Math.ceil(n / perRow);
      const stepY = Math.min(176, (h * 0.38) / rowN);
      const y0 = h * 0.42 - ((rowN - 1) * stepY) / 2;
      items.forEach((it, i) => {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, n - row * perRow);
        const x = w / 2 + (i - row * perRow - (inRow - 1) / 2) * stepX;
        const y = y0 + row * stepY;
        const info = itemInfo(it);
        const delay = 150 * i;
        const glow = track(this.add.image(x, y, 'p_dot').setTint(0xf2cf6e).setAlpha(0)
          .setDisplaySize(84, 84).setDepth(103));
        const icon = track(this.add.image(x, y, info.icon).setScale(0).setDepth(104));
        if (info.tint !== undefined) icon.setTint(info.tint);
        // 令牌等大：图标源尺寸不一（coin 18px / 武器符 44px），按目标尺寸归一
        const iconScale = 56 / Math.max(icon.width, icon.height);
        const label = track(this.add.text(x, y + 44, info.label, {
          fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: PAL.inkCss, align: 'center',
          stroke: '#FFFFFF', strokeThickness: 4, wordWrap: { width: stepX - 6, useAdvancedWrap: true },
        }).setOrigin(0.5, 0).setDepth(104).setAlpha(0));
        this.tweens.add({ targets: icon, scale: iconScale, delay, duration: 320, ease: 'Back.easeOut' });
        this.tweens.add({ targets: glow, alpha: 0.55, delay, duration: 260 });
        this.tweens.add({
          targets: glow, displayWidth: 102, displayHeight: 102, alpha: 0.3,
          delay: delay + 300, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.tweens.add({ targets: label, alpha: 1, delay: delay + 120, duration: 240 });
        // 入场时点：星屑迸出 + 音阶上行的拾取音（开箱节奏感）
        this.time.delayedCall(delay, () => {
          if (this.overlayMode !== 'chest') return;
          SFX.pickup(i);
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + Math.random() * 0.8;
            const s = this.add.image(x, y, 'p_star').setTint(0xf2cf6e).setScale(0.9).setDepth(105);
            this.overlay.push(s);
            this.tweens.add({
              targets: s, x: x + Math.cos(a) * 52, y: y + Math.sin(a) * 46,
              alpha: 0, scale: 0.3, duration: 480, ease: 'Cubic.easeOut',
              onComplete: () => s.destroy(),
            });
          }
        });
      });
    }
    const ok = track(makeButton(this, w / 2, h * 0.78, THEME.btnW, THEME.btnH, 'OK', () => {
      if (this.overlayMode !== 'chest') return;
      if (arc && !auto) {
        // 清单 → 全卡池选卡（其余件待选卡后一并入手）
        SFX.uiClick();
        revealObjs.forEach((o) => o.destroy());
        this.chestTitle?.setText(t('chestArcanaPick'));
        this.layoutArcanaGrid(arc.cards, (id) => {
          if (this.overlayMode !== 'chest') return;
          SFX.uiClick();
          finish(id);
        });
        return;
      }
      finish();
    }, { fontSize: THEME.btnFs }));
    ok.setDepth(104);
  }

  // ---------- 暂停 ----------

  private togglePause(): void {
    if (this.overlayMode === 'levelup' || this.overlayMode === 'chest' || this.overlayMode === 'arcana') return;
    if (this.overlayMode === 'pause') {
      this.closeOverlay();
      this.scene.resume('game');
      return;
    }
    if (!this.gs.run.running) return;
    this.scene.pause('game');
    this.showPauseMenu();
  }

  private showPauseMenu(): void {
    this.overlayMode = 'pause';
    const w = this.vp.w;
    const h = this.vp.h;
    const veil = this.addVeil();
    const title = this.add.text(w / 2, h * 0.18, t('pause'), {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(101);

    // 构筑摘要：6+6 槽位 + 规则卡令牌行（与 HUD 同一渲染，竖屏形态的详情入口）
    const slotSize = 32;
    const rowW = MAX_WEAPONS * (slotSize + 7) - 7;
    const sx = w / 2 - rowW / 2;
    const rowY = h * 0.18 + 36;
    this.overlay.push(...this.drawSlotRow(sx, rowY, slotSize, this.weaponSlots(), 101));
    this.overlay.push(...this.drawSlotRow(sx, rowY + slotSize + 8, slotSize, this.passiveSlots(), 101));
    let rowsBottom = rowY + (slotSize + 8) * 2;
    const arcana = this.gs.run.arcana;
    if (arcana.length > 0) {
      const aSize = 40;
      const aGap = 8;
      const aW = arcana.length * (aSize + aGap) - aGap;
      this.overlay.push(...this.drawArcanaRow(w / 2 - aW / 2, rowsBottom + 2, aSize, arcana, 101, aGap));
      rowsBottom += aSize + 12;
    }
    // M12 构筑总览：六项核心属性实时值 + 晨露精华计数（矮屏 <560 省略，保按钮区不溢出）
    if (h >= 560) {
      const s = this.gs.run.stats;
      const ess = this.gs.run.essence;
      const essN = ess.dmg + ess.cd + ess.area;
      const pct = (v: number) => (v >= 1 ? '+' : '−') + Math.abs(Math.round((v - 1) * 100)) + '%';
      const cdTxt = s.cd <= 1 ? '−' + Math.round((1 - s.cd) * 100) + '%' : '+' + Math.round((s.cd - 1) * 100) + '%';
      const line1 = t('st_dmg') + ' ' + pct(s.dmg) + ' · ' + t('st_cd') + ' ' + cdTxt + ' · ' + t('st_area') + ' ' + pct(s.area);
      const line2 = t('st_move') + ' ' + Math.round(s.moveSpeed) + ' · ' + t('st_magnet') + ' ' + Math.round(s.magnet)
        + ' · ' + t('st_armor') + ' ' + s.armor
        + (essN > 0 ? ' · ✦' + t('essTag') + ' ×' + essN : '');
      const statTxt = this.add.text(w / 2, rowsBottom + 4, line1 + '\n' + line2, {
        fontFamily: FONT, fontSize: '13px', color: PAL.inkSoft, align: 'center', lineSpacing: 5,
        stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(101);
      this.overlay.push(statTxt);
      rowsBottom += statTxt.height + 12;
    }
    // 四个按钮统一规格；矮屏且持卡时按钮区下移并压缩间距，避免与令牌行相叠
    const bw = THEME.btnW;
    const bh = THEME.btnH;
    const by = Math.max(h * 0.42, rowsBottom + 16);
    const gap = Math.min(68, Math.max(56, (h - by - bh / 2 - 16) / 3));
    const resume = makeButton(this, w / 2, by, bw, bh, t('resume'), () => this.togglePause(), { fontSize: THEME.btnFs });
    const sound = makeButton(this, w / 2, by + gap, bw, bh, SFX.muted ? t('soundOff') : t('soundOn'), () => {
      SFX.setMuted(!SFX.muted);
      setButtonLabel(sound, SFX.muted ? t('soundOff') : t('soundOn'));
    }, { fontSize: THEME.btnFs });
    const settings = makeButton(this, w / 2, by + gap * 2, bw, bh, t('menu_settings'), () => {
      // 保持 game 场景暂停，进设置页；返回时 HUD 重启并自动重开暂停面板
      go(this, 'settings');
    }, { fontSize: THEME.btnFs });
    const quit = makeButton(this, w / 2, by + gap * 3, bw, bh, t('quit'), () => {
      // 中途退出也入账：金币/统计不丢（不计胜场）
      const run = this.gs.run;
      Meta.recordRun({ win: false, time: run.elapsed, kills: run.kills, coins: run.coins, affixKills: run.affixKills });
      this.closeOverlay();
      this.scene.stop('game');
      this.scene.stop();
      this.game.scene.start('title');
    }, { fontSize: THEME.btnFs });
    [resume, sound, settings, quit].forEach((b) => b.setDepth(101));
    this.overlay.push(veil, title, resume, sound, settings, quit);
  }

  // ---------- 通用 ----------

  private addVeil(): Phaser.GameObjects.Rectangle {
    // 浅色主题：白色柔光遮罩而非黑色
    const veil = this.add.rectangle(0, 0, this.vp.w, this.vp.h, 0xfaf5ea, 0.72)
      .setOrigin(0).setDepth(100).setInteractive();
    return veil;
  }

  private closeOverlay(): void {
    this.overlay.forEach((o) => o.destroy());
    this.overlay = [];
    this.overlayMode = 'none';
    // 放逐模式状态随面板一并复位（对象已随 overlay 销毁，这里只清引用）
    this.banishMode = false;
    this.banishAnim = false;
    this.banishBtn = null;
    this.banishMarks = [];
    this.pickCards = [];
    this.buildIconRow();
  }
}
