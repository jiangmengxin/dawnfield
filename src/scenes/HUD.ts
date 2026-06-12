// HUD 覆盖层：状态条、计时、武器栏、升级三选一、宝箱、暂停、Boss 条
// 双形态：桌面横屏显示构筑信息；手机竖屏精简（构筑详情进暂停面板）
import Phaser from 'phaser';
import { FONT, t } from '../i18n';
import { DEATH_COLOR, PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { ARCANA_META } from '../content/arcana';
import { MAX_PASSIVES, MAX_WEAPONS } from '../content/player';
import { PASSIVE_META } from '../content/passives';
import { WEAPON_META } from '../content/weapons';
import type { ArcanaId } from '../content/ids';
import { makeButton, setButtonLabel } from '../ui/widgets';
import { Viewport } from '../ui/Viewport';
import { THEME } from '../ui/theme';
import { onEvent } from '../core/events';
import { Meta } from '../core/MetaState';
import { getSettings, updateSettings } from '../core/settings';
import { go } from '../core/router';
import type { ChestReward, Offer } from '../systems/context';
import type { GameScene } from './Game';

/** 选卡卡片渲染信息（升级三选一与规则卡三选一共用） */
interface PickCardInfo {
  icon: string;
  name: string;
  desc: string;
  color: number;
  tag: string;
  tagColor: string;
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

    // 键盘选卡
    this.input.keyboard!.on('keydown-ONE', () => this.pickByIndex(0));
    this.input.keyboard!.on('keydown-TWO', () => this.pickByIndex(1));
    this.input.keyboard!.on('keydown-THREE', () => this.pickByIndex(2));

    const subs = [
      onEvent(this.game, 'hud:levelup', (offers) => this.showLevelUp(offers)),
      onEvent(this.game, 'hud:chest', (reward) => this.showChest(reward)),
      onEvent(this.game, 'hud:arcana', (choices) => this.showArcanaPick(choices)),
      onEvent(this.game, 'hud:boss', (v) => { this.bossVisible = v; this.bossName.setVisible(v); }),
      onEvent(this.game, 'hud:warn', (key) => this.showWarn(key)),
      onEvent(this.game, 'hud:achievement', (id) => this.queueAchToast(id)),
      onEvent(this.game, 'hud:refresh', () => this.buildIconRow()),
      onEvent(this.game, 'hud:togglepause', () => this.togglePause()),
      onEvent(this.game, 'hud:autopause', () => {
        if (this.overlayMode === 'none' && this.gs.run.running) this.togglePause();
      }),
    ];

    this.buildIconRow();
    this.layout();
    this.scale.on('resize', this.layout, this);

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
    this.levelText.setPosition(safe.x + safe.w - 14, safe.y + 12).setVisible(!compact);
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
    // HP 条（左上；竖屏与计时/按钮同一中线）
    const compact = this.compactHud;
    const hpX = safe.x + (compact ? 12 : 14);
    const hpY = safe.y + (compact ? 30 : 16);
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
    this.hpText.setPosition(hpX + 6, hpY + 8).setText(Math.ceil(run.hp) + ' / ' + run.stats.maxHp);

    // 计时
    const sec = Math.floor(run.elapsed);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    this.timerText.setText(mm + ':' + ss);

    // 调试信息（设置中开启）：FPS / 实体计数 / 动态上限 + 波次预览 + 武器 DPS（M8）
    const dbg = getSettings();
    if (dbg.debugInfo) {
      const flags = (dbg.invincible ? ' 无敌' : '') + (dbg.fullPickup ? ' 全拾' : '');
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

  /** 当前构筑 → 槽位条目（不足上限补 null 空槽） */
  private weaponSlots(): Array<{ icon: string; label: string; gold: boolean } | null> {
    const out: Array<{ icon: string; label: string; gold: boolean } | null> = [];
    for (const wpn of this.gs.weapons.list) {
      const meta = WEAPON_META.find((m) => m.id === wpn.id)!;
      out.push({ icon: meta.icon, label: wpn.evolved ? '★' : String(wpn.level), gold: wpn.evolved });
    }
    while (out.length < MAX_WEAPONS) out.push(null);
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

  private toastQueue: string[] = [];
  private toastBusy = false;

  private queueAchToast(id: string): void {
    this.queueToast(t('achUnlocked') + ' ' + t('ach_' + id));
  }

  private queueToast(text: string): void {
    this.toastQueue.push(text);
    this.pumpToast();
  }

  private pumpToast(): void {
    if (this.toastBusy) return;
    const text = this.toastQueue.shift();
    if (text === undefined) return;
    this.toastBusy = true;
    const safe = this.vp.safe;
    const toast = this.add.text(safe.x + safe.w / 2, safe.y + safe.h * 0.22, text, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#C8902A',
      stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(21).setAlpha(0).setScale(0.8);
    SFX.levelup();
    this.tweens.add({
      targets: toast, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast, alpha: 0, delay: 1700, duration: 350,
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

  private showLevelUp(offers: Offer[]): void {
    // 调试：自动选第一张卡，跳过选卡界面
    if (getSettings().autoPick && offers.length > 0) {
      this.gs.levelUp.applyOffer(offers[0]);
      this.scene.resume('game');
      return;
    }
    this.overlayMode = 'levelup';
    this.pendingOffers = offers;
    this.overlay.push(this.addVeil());
    this.addPickTitle(t('levelUpTitle'));
    offers.forEach((offer, i) => {
      this.makePickCard(this.offerInfo(offer), i, this.pickCardGeom(i, offers.length), () => this.chooseOffer(offer));
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
    const w = this.vp.w;
    const h = this.vp.h;
    this.overlay.push(this.addVeil());
    this.addPickTitle(t('arcanaTitle'));

    // 全卡池网格：横屏 5 列 / 竖屏 2 列；末行不满时居中
    const portrait = h > w;
    const cols = portrait ? 2 : 5;
    const rows = Math.ceil(choices.length / cols);
    const gapX = 12;
    const gapY = 12;
    const top = h * 0.2;
    const areaH = h * 0.94 - top;
    const cw = Math.min(portrait ? 200 : 224, (w - (portrait ? 28 : 80) - (cols - 1) * gapX) / cols);
    const ch = Math.min(portrait ? 136 : 260, (areaH - (rows - 1) * gapY) / rows);
    const gridH = rows * ch + (rows - 1) * gapY;
    const y0 = top + Math.max(0, (areaH - gridH) / 2);
    choices.forEach((id, i) => {
      const row = Math.floor(i / cols);
      const col = i - row * cols;
      const inRow = Math.min(cols, choices.length - row * cols);
      const rowW = inRow * cw + (inRow - 1) * gapX;
      const cx = w / 2 - rowW / 2 + col * (cw + gapX) + cw / 2;
      const cy = y0 + row * (ch + gapY) + ch / 2;
      this.makeArcanaCard(id, i, cx, cy, cw, ch, () => this.chooseArcana(id));
    });
  }

  /** 方形规则卡：白卡底 + 主题色描边 + 顶部色带托图标；尺寸自适应（极矮卡省略描述） */
  private makeArcanaCard(
    id: ArcanaId,
    idx: number,
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    onPick: () => void,
  ): void {
    const meta = ARCANA_META.find((m) => m.id === id)!;
    const big = ch >= 180; // 桌面大卡 / 竖屏小卡
    const showDesc = ch >= 96;
    const bandH = big ? ch * 0.38 : ch * 0.42;
    const g = this.add.graphics();
    const draw = (over: boolean) => {
      g.clear();
      g.fillStyle(0x5a5248, 0.08);
      g.fillRoundedRect(-cw / 2 + 2, -ch / 2 + 4, cw, ch, 10);
      g.fillStyle(over ? 0xfffef8 : PAL.cardBg, 1);
      g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 10);
      // 顶部色带（卡牌感；与升级卡的纯白底区分）
      g.fillStyle(meta.color, over ? 0.4 : 0.26);
      g.fillRoundedRect(-cw / 2, -ch / 2, cw, bandH, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.lineStyle(2.5, meta.color, 1);
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
    if (showDesc) {
      const descTxt = this.add.text(0, nameTxt.y + nameTxt.height + (big ? 8 : 3), t('arc_' + id + '_d'), {
        fontFamily: FONT, fontSize: (big ? 13 : 11) + 'px', color: PAL.inkSoft, align: 'center',
        wordWrap: { width: cw - 18 },
      }).setOrigin(0.5, 0);
      parts.push(descTxt);
    }
    const c = this.add.container(cx, cy, parts).setDepth(101).setAlpha(0).setScale(0.7);
    c.setSize(cw, ch);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerup', onPick);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 240, delay: 28 * idx, ease: 'Back.easeOut' });
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
    if (offer.kind === 'weapon') {
      const meta = WEAPON_META.find((m) => m.id === offer.id)!;
      return {
        icon: meta.icon,
        name: t('w_' + offer.id),
        desc: t('w_' + offer.id + '_d'),
        color: meta.color,
        tag: offer.isNew ? t('newTag') : 'Lv ' + offer.toLevel,
        tagColor,
      };
    }
    if (offer.kind === 'passive') {
      const meta = PASSIVE_META.find((m) => m.id === offer.id)!;
      return {
        icon: meta.icon,
        name: t('p_' + offer.id),
        desc: t('p_' + offer.id + '_d'),
        color: meta.color,
        tag: offer.isNew ? t('newTag') : 'Lv ' + offer.toLevel,
        tagColor,
      };
    }
    if (offer.kind === 'heal') {
      return { icon: 'icon_heal', name: t('c_heal'), desc: t('c_heal_d'), color: PAL.heart, tag: '', tagColor };
    }
    return { icon: 'icon_gold', name: t('c_gold'), desc: t('c_gold_d'), color: PAL.xp, tag: '', tagColor };
  }

  private makePickCard(
    info: PickCardInfo,
    idx: number,
    geom: { cx: number; cy: number; cw: number; ch: number; portrait: boolean },
    onPick: () => void,
  ): void {
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
    }
    const c = this.add.container(cx, cy + 24, parts).setDepth(101).setAlpha(0);
    c.setSize(cw, ch);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerup', onPick);
    this.tweens.add({ targets: c, alpha: 1, y: cy, duration: 260, delay: 90 * idx, ease: 'Cubic.easeOut' });
    this.overlay.push(c);
  }

  private pickByIndex(i: number): void {
    if (this.overlayMode === 'levelup') {
      const offer = this.pendingOffers[i];
      if (offer) this.chooseOffer(offer);
    } else if (this.overlayMode === 'arcana') {
      const id = this.pendingArcana[i];
      if (id) this.chooseArcana(id);
    }
  }

  private chooseOffer(offer: Offer): void {
    if (this.overlayMode !== 'levelup') return;
    SFX.uiClick();
    this.closeOverlay();
    this.gs.levelUp.applyOffer(offer);
    this.scene.resume('game');
  }

  // ---------- 宝箱 ----------

  private showChest(reward: ChestReward): void {
    this.overlayMode = 'chest';
    const w = this.vp.w;
    const h = this.vp.h;
    const veil = this.addVeil();
    const title = this.add.text(w / 2, h * 0.2, t('chestTitle'), {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(101);
    const chest = this.add.image(w / 2, h * 0.45, 'chest').setScale(3).setDepth(101);
    const hint = this.add.text(w / 2, h * 0.6, t('chestOpen'), {
      fontFamily: FONT, fontSize: '17px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(101);
    this.tweens.add({ targets: chest, scale: 3.2, duration: 500, yoyo: true, repeat: -1 });
    this.overlay.push(veil, title, chest, hint);

    const zone = this.add.zone(0, 0, w, h).setOrigin(0).setDepth(102).setInteractive();
    this.overlay.push(zone);
    zone.once('pointerup', () => {
      hint.destroy();
      this.tweens.killTweensOf(chest);
      this.tweens.add({ targets: chest, scale: 0, angle: 20, duration: 250, ease: 'Back.easeIn' });
      // 纸屑喷发
      for (let i = 0; i < 26; i++) {
        const p = this.add.image(w / 2, h * 0.45, 'p_confetti')
          .setTint([PAL.petal, PAL.blade, PAL.boom, PAL.mine, PAL.rain][i % 5])
          .setDepth(103).setScale(1.4);
        this.overlay.push(p);
        const a = Math.random() * Math.PI * 2;
        const sp = 120 + Math.random() * 240;
        this.tweens.add({
          targets: p,
          x: p.x + Math.cos(a) * sp,
          y: p.y + Math.sin(a) * sp + 120,
          rotation: Math.random() * 8,
          alpha: 0,
          duration: 900,
          ease: 'Cubic.easeOut',
        });
      }
      this.time.delayedCall(330, () => {
        let label: string;
        let iconKey: string | null = null;
        if (reward.kind === 'evolve') {
          iconKey = WEAPON_META.find((m) => m.id === reward.weapon)!.icon;
          label = t('evolveTag') + '！ ' + t('w_' + reward.weapon + '_e') + '\n' + t('w_' + reward.weapon + '_e_d');
        } else if (reward.kind === 'arcana') {
          iconKey = ARCANA_META.find((m) => m.id === reward.card)!.icon;
          label = t('arcTag') + '！ ' + t('arc_' + reward.card) + '\n' + t('arc_' + reward.card + '_d');
        } else if (reward.kind === 'upgrade') {
          const first = reward.items[0];
          iconKey = first.kind === 'weapon'
            ? WEAPON_META.find((m) => m.id === first.id)!.icon
            : PASSIVE_META.find((m) => m.id === first.id)!.icon;
          label = t('chestUpgrade') + '\n' + reward.items
            .map((o) => (o.kind === 'weapon' ? t('w_' + o.id) : t('p_' + o.id)) + ' Lv ' + o.toLevel)
            .join('\n');
        } else {
          label = t('chestGold')
            .replace('{c}', String(reward.coins))
            .replace('{h}', String(reward.heal));
        }
        if (iconKey) {
          const icon = this.add.image(w / 2, h * 0.42, iconKey).setScale(0).setDepth(104);
          this.overlay.push(icon);
          this.tweens.add({ targets: icon, scale: 2.4, duration: 400, ease: 'Back.easeOut' });
        }
        const txt = this.add.text(w / 2, h * 0.58, label, {
          fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: PAL.inkCss, align: 'center',
          stroke: '#FFFFFF', strokeThickness: 5, wordWrap: { width: w - 60 },
        }).setOrigin(0.5).setDepth(104);
        this.overlay.push(txt);
        const ok = makeButton(this, w / 2, h * 0.74, THEME.btnW, THEME.btnH, 'OK', () => {
          this.closeOverlay();
          this.gs.levelUp.applyChest(reward);
          this.scene.resume('game');
        }, { fontSize: THEME.btnFs });
        ok.setDepth(104);
        this.overlay.push(ok);
      });
    });
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
      Meta.recordRun({ win: false, time: run.elapsed, kills: run.kills, coins: run.coins });
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
    this.buildIconRow();
  }
}
