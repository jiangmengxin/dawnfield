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
import { WEAPON_MAX_LEVEL, WEAPON_META, weaponIcon } from '../content/weapons';
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
  // M19 掉落道具持续效果芯片（图标 + 倒计时条）：bar 每帧重绘，icon 仅在集合变化时重建
  private dropChipBar!: Phaser.GameObjects.Graphics;
  private dropChips: Phaser.GameObjects.Image[] = [];
  private dropChipSig = '';

  constructor() {
    super('hud');
  }

  private vp!: Viewport;

  /** 暂停/倍速固定触控尺寸（HUD 通用规范：触控目标 ≥44） */
  private static readonly HUD_BTN = 44;

  /** 状态行顶边相对安全区顶的偏移：与屏边 gut(16) 一致的净空，HP/计时/按钮 顶对齐 */
  private static readonly HUD_ROW_TOP = 16;

  /** LV/HP 胶囊高度（计时数字高度与之一致）：竖屏 24 / 横屏 28 */
  private pillHeight(): number {
    return this.compactHud ? 24 : 28;
  }

  /** 屏边安全留白：所有边缘元素的统一内缩，≥16px（gapMd），大屏随 vp.s() 略增。
   *  注意是"下限"而非"缩放内缩"——绝不因小屏缩放把元素推到更贴边。 */
  private edgeGutter(): number {
    return Math.max(THEME.gapMd, this.vp.s(THEME.gapMd));
  }

  private bossBarY(): number {
    return this.vp.safe.y + (this.compactHud ? 182 : 218);
  }

  private warnY(): number {
    const safe = this.vp.safe;
    // 320x480 cannot fit the warning between the top HUD and boss bar; stack it under the boss bar there.
    if (this.bossVisible && safe.h < 560) return this.bossBarY() + 46;
    return safe.y + safe.h * 0.3;
  }

  private toastY(): number {
    const safe = this.vp.safe;
    if (!this.bossVisible || safe.h < 560) return safe.y + safe.h * 0.22;
    return Math.max(safe.y + 104, this.bossBarY() - 48);
  }

  private configureBossText(): void {
    const safe = this.vp.safe;
    const gut = this.edgeGutter();
    this.bossName.setStyle({
      fontFamily: FONT,
      fontSize: (this.compactHud ? 15 : 16) + 'px',
      fontStyle: 'bold',
      color: '#5A6488',
      stroke: '#FFFFFF',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: Math.max(180, safe.w - gut * 2), useAdvancedWrap: true },
    });
  }

  private configureWarnText(): void {
    const safe = this.vp.safe;
    const gut = this.edgeGutter();
    const fontSize = this.compactHud ? (safe.w <= 340 ? 17 : 19) : 24;
    this.warnText.setStyle({
      fontFamily: FONT,
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      color: '#C06870',
      stroke: '#FFFFFF',
      strokeThickness: this.compactHud ? 5 : 6,
      align: 'center',
      wordWrap: { width: Math.max(180, safe.w - gut * 2), useAdvancedWrap: true },
    });
  }

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
    this.activeToast = null;

    this.bars = this.add.graphics().setDepth(10);
    this.dropChipBar = this.add.graphics().setDepth(12); // M19 掉落道具倒计时条
    this.dropChips = [];
    this.dropChipSig = '';
    this.timerText = this.add.text(0, 0, '00:00', {
      fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5, 0).setDepth(11);
    // 击杀图标改用骷髅（与金币同为 18px 源，layout 中统一显示尺寸）
    this.killIcon = this.add.image(0, 0, 'icon_kill').setDepth(11);
    this.killText = this.add.text(0, 0, '0', {
      fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: PAL.inkCss,
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
    this.speedBtn = makeButton(this, 0, 0, 44, 44, this.gs.speed + 'x', () => {
      // 倍速模式（M20）：在 2× / 4× 间切换；否则沿用 1× / 2×（并持久化基础倍速）
      const cur = this.gs.speed;
      const next = this.gs.run.speed2x ? (cur >= 4 ? 2 : 4) : (cur === 2 ? 1 : 2);
      this.gs.setSpeed(next);
      if (!this.gs.run.speed2x) updateSettings({ speed: next as 1 | 2 });
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
      onEvent(this.game, 'hud:boss', (v) => {
        this.bossVisible = v;
        this.bossName.setVisible(v);
        this.repositionActiveToast();
      }),
      onEvent(this.game, 'hud:warn', (key) => this.showWarn(key)),
      // M11 无尽轮次：走金色 toast 队列（轮边界与 Boss 横幅同帧，warnText 会被覆盖）
      onEvent(this.game, 'hud:cycle', (n) => this.queueToast(t('endlessCycleBanner').replace('{n}', String(n)))),
      onEvent(this.game, 'hud:revive', (n) => this.queueToast(t('reviveBanner').replace('{n}', String(n)))),
      onEvent(this.game, 'hud:achievement', (id) => this.queueAchToast(id)),
      onEvent(this.game, 'hud:tip', (text) => this.queueToast(text, 3500)), // M14 引导停留更久
      onEvent(this.game, 'hud:drop', (name, color) => this.showDropToast(name, color)), // M19 道具拾取提示
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
    // 屏边安全留白（HUD 通用规范）：所有边缘元素至少留 gut（≥16px），
    // 固定尺寸触控按钮按"外缘贴 gut"定位（而非中心套缩放内缩，避免越缩越贴边）
    const gut = this.edgeGutter();
    const rightEdge = safe.x + safe.w - gut;
    const BTN = HUDScene.HUD_BTN; // 暂停/倍速固定 44 触控尺寸

    // 顶栏（按 mockup）：左上 LV/HP 胶囊 | 居中计时 | 右上 横排 倍速+暂停（顶边对齐 rowTop）；
    // 其下左列：武器令牌行 + 被动令牌行 + 击杀(骷髅) + 金币(币)。胶囊与文字位置随血条在 update() 内更新。
    const rowTop = safe.y + HUDScene.HUD_ROW_TOP;
    this.pauseBtn.setPosition(rightEdge - BTN / 2, rowTop + BTN / 2);
    this.speedBtn.setPosition(rightEdge - BTN / 2 - BTN - THEME.gapSm, rowTop + BTN / 2);
    // 计时：居中，与 LV/HP 胶囊**等高且同一中线**（数字高度 ≈ 胶囊高度）
    const pillH = this.pillHeight();
    this.timerText.setOrigin(0.5, 0.5).setFontSize(compact ? 26 : 30).setPosition(cx, rowTop + pillH / 2);
    // LV/HP 胶囊文字样式（LV 左 origin 0,0.5 / HP 右 origin 1,0.5；坐标在 update() 内随胶囊设）
    this.levelText.setOrigin(0, 0.5).setFontSize(compact ? 12 : 14).setColor(PAL.inkCss).setVisible(true);
    this.hpText.setOrigin(1, 0.5).setFontSize(compact ? 12 : 14).setColor(PAL.inkCss);

    // 左下：击杀(骷髅，灰) + 金币(币，金) —— 图标在左、数字紧随，左缘对齐
    const statX = safe.x + gut;
    const iconScale = (compact ? 15 : 17) / 18;
    const iconW = 18 * iconScale;
    const tokenY = rowTop + (compact ? 32 : 38);
    const tokenSize = compact ? 26 : 32;
    const tokenGap = compact ? 4 : 7;
    const killY = tokenY + 2 * (tokenSize + tokenGap) + (compact ? 6 : 8) + iconW / 2;
    const coinY = killY + (compact ? 23 : 27);
    this.killIcon.setScale(iconScale).setPosition(statX + iconW / 2, killY).setVisible(true);
    this.killText.setOrigin(0, 0.5).setFontSize(compact ? 14 : 15).setPosition(statX + iconW + 5, killY).setVisible(true);
    this.coinIcon.setScale(iconScale).setPosition(statX + iconW / 2, coinY).setVisible(true);
    this.coinText.setOrigin(0, 0.5).setFontSize(compact ? 14 : 15).setPosition(statX + iconW + 5, coinY).setVisible(true);

    this.configureBossText();
    this.configureWarnText();
    this.bossName.setPosition(cx, coinY + (compact ? 22 : 26));
    this.warnText.setPosition(cx, this.warnY());
    this.debugText.setPosition(safe.x + gut, safe.y + safe.h - 4);
    this.repositionActiveToast();
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
    // 模态覆盖层（升级/规则卡/宝箱/暂停）期间隐藏游戏内 HUD chrome：否则状态条/计时/武器栏/
    // 击杀金币会透过半透明幕布与覆盖层自身的标题·构筑栏·放逐提示叠压成糊（见反馈截图）。
    // 覆盖层自带构筑栏展示当前 build，HUD 令牌行此时纯属冗余；关闭覆盖层后随即恢复。
    const modal = this.overlayMode !== 'none';
    this.setChromeVisible(!modal);
    if (modal) {
      this.bars.clear();
      this.dropChipBar.clear();
      return;
    }
    const safe = this.vp.safe;
    const w = this.vp.w;
    const g = this.bars;
    g.clear();
    // XP 条（安全区顶部通栏）
    const run = this.gs.run;
    const xpK = Phaser.Math.Clamp(run.xp / run.xpNeed, 0, 1);
    const xpH = 9; // 顶部通栏经验条（固定高，与 layout 行位一致）
    g.fillStyle(PAL.xpBack, 0.9);
    g.fillRect(0, safe.y, w, xpH);
    g.fillStyle(PAL.xp, 1);
    g.fillRect(0, safe.y, w * xpK, xpH);
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
    const gut = this.edgeGutter(); // 左缘统一安全留白（与 layout 同）
    // LV/HP 胶囊（等级集成进血条）：填充随 HP 减少；移动端压缩宽度，避让居中计时（留 ≥10 间隙）
    const pillH = this.pillHeight();
    const pillR = pillH / 2;
    const timerHalf = (compact ? 26 : 30) * 1.65; // 估算"00:00"半宽
    const maxPillW = safe.x + safe.w / 2 - timerHalf - 10 - (safe.x + gut);
    const pillW = compact ? Math.min(132, maxPillW) : Math.min(228, safe.w * 0.26, maxPillW);
    const pillX = safe.x + gut + shX;
    const pillY = safe.y + HUDScene.HUD_ROW_TOP + shY;
    const hpK = Phaser.Math.Clamp(run.hp / run.stats.maxHp, 0, 1);
    g.fillStyle(PAL.hpBack, 1); // 未填充底
    g.fillRoundedRect(pillX, pillY, pillW, pillH, pillR);
    g.fillStyle(PAL.hp, 1); // HP 填充（左起）
    if (hpK > 0.02) g.fillRoundedRect(pillX, pillY, Math.max(pillH, pillW * hpK), pillH, pillR);
    g.lineStyle(2, 0xe0d4bc, 1);
    g.strokeRoundedRect(pillX, pillY, pillW, pillH, pillR);
    // M12 低血（<30%）红描边呼吸脉冲
    if (hpK < 0.3) {
      g.lineStyle(2.5, 0xe05060, 0.4 + 0.4 * Math.abs(Math.sin(run.elapsed * 5)));
      g.strokeRoundedRect(pillX - 2.5, pillY - 2.5, pillW + 5, pillH + 5, pillR + 2);
    }
    // LV 左 / HP 右（均在胶囊内）
    this.levelText.setPosition(pillX + 10, pillY + pillH / 2).setText('LV ' + run.level);
    this.hpText.setPosition(pillX + pillW - 10, pillY + pillH / 2).setText(Math.ceil(run.hp) + '/' + run.stats.maxHp);
    // M14 wisp 闪避就绪点：胶囊右侧小圆点（就绪 = 角色主题色实心；冷却 = 灰点变淡）
    if (run.char.trait === 'flicker') {
      const ready = run.flickerCdLeft <= 0;
      g.fillStyle(ready ? 0x76b896 : 0xc8bca4, ready ? 1 : 0.45);
      g.fillCircle(pillX + pillW + 12, pillY + pillH / 2, 5);
      if (ready) {
        g.lineStyle(1.5, 0xffffff, 0.9);
        g.strokeCircle(pillX + pillW + 12, pillY + pillH / 2, 5);
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
    // 击杀/金币数字（图标在左、左缘对齐，数字随位数向右增长——左侧有空间）；等级已并入 LV/HP 胶囊
    this.killText.setText(String(run.kills));
    this.coinText.setText(String(Math.floor(run.coins)));

    // Boss 条（名称/配色随本图 Boss）
    if (this.bossVisible) {
      const boss = this.gs.enemies.boss;
      if (boss && boss.active) {
        // Boss 条居中（两侧 ≥40 留白），位置在左列统计（击杀/金币）与 bossName 之下
        const bw = Math.min(420, safe.w - 80);
        const bx = safe.x + safe.w / 2 - bw / 2;
        const by = this.bossBarY();
        const bh = 12;
        const br = 6;
        const bk = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
        this.bossName.setText(t('en_' + this.gs.map.bossId));
        g.fillStyle(0x5a5248, 0.1);
        g.fillRoundedRect(bx, by, bw, bh, br);
        g.fillStyle(DEATH_COLOR[this.gs.map.bossId], 1);
        if (bk > 0.02) g.fillRoundedRect(bx, by, bw * bk, bh, br);
        g.lineStyle(2, 0x5a6488, 0.8);
        g.strokeRoundedRect(bx, by, bw, bh, br);
      }
    }

    this.drawDropChips(safe);
  }

  /** M19 掉落道具持续效果芯片：底部居中一行图标 + 倒计时条（仅持续型） */
  private drawDropChips(safe: { x: number; y: number; w: number; h: number }): void {
    const effects = this.gs.dropSys?.activeEffects ?? [];
    const sig = effects.map((e) => e.id).join(',');
    if (sig !== this.dropChipSig) {
      this.dropChips.forEach((o) => o.destroy());
      this.dropChips = effects.map((e) => this.add.image(0, 0, e.icon).setDepth(12));
      this.dropChipSig = sig;
    }
    const g = this.dropChipBar;
    g.clear();
    if (effects.length === 0) return;
    const size = 28;
    const gap = 10;
    const step = size + gap;
    const cx = safe.x + safe.w / 2;
    const y = safe.y + safe.h - 46;
    const x0 = cx - (effects.length * step - gap) / 2 + size / 2;
    effects.forEach((e, i) => {
      const x = x0 + i * step;
      const icon = this.dropChips[i];
      if (icon) icon.setPosition(x, y).setScale(size / Math.max(icon.width, icon.height)).setVisible(true);
      // 倒计时条（图标下方）
      const bw = size;
      const bx = x - bw / 2;
      const by = y + size / 2 + 3;
      g.fillStyle(0x5a5248, 0.18);
      g.fillRoundedRect(bx, by, bw, 4, 2);
      g.fillStyle(e.color, 1);
      if (e.k > 0.02) g.fillRoundedRect(bx, by, bw * e.k, 4, 2);
    });
  }

  /** 游戏内 HUD chrome 总开关：模态覆盖层打开时整体隐藏，避免透幕叠压（见 update 注释）。
   *  Boss 名仅在确有 Boss 时随之显示。bars/dropChipBar 由 update 在隐藏帧 clear。 */
  private setChromeVisible(v: boolean): void {
    this.bars.setVisible(v);
    this.dropChipBar.setVisible(v);
    this.timerText.setVisible(v);
    this.killIcon.setVisible(v);
    this.killText.setVisible(v);
    this.coinIcon.setVisible(v);
    this.coinText.setVisible(v);
    this.levelText.setVisible(v);
    this.hpText.setVisible(v);
    this.pauseBtn.setVisible(v);
    this.speedBtn.setVisible(v);
    this.bossName.setVisible(v && this.bossVisible);
    this.iconRow.forEach((o) => (o as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(v));
    this.dropChips.forEach((o) => o.setVisible(v));
  }

  // ---------- 武器/被动图标栏 ----------

  /** 当前构筑 → 槽位条目（不足上限补 null 空槽；上限读 stats.maxWeapons——M13 allin 降 4，
   *  已持有超出上限时如实显示全部） */
  private weaponSlots(): Array<{ icon: string; label: string; gold: boolean } | null> {
    const out: Array<{ icon: string; label: string; gold: boolean } | null> = [];
    for (const wpn of this.gs.weapons.list) {
      const meta = WEAPON_META.find((m) => m.id === wpn.id)!;
      out.push({ icon: weaponIcon(meta, wpn.evolved), label: wpn.evolved ? '★' : String(wpn.level), gold: wpn.evolved });
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
        // 图标自带白底圆与描边，铺满槽位即是完整令牌；等比缩放杜绝非方形图标形变（HUD2）
        const icon = this.add.image(cx, cy, s.icon).setDepth(depth);
        icon.setScale(size / Math.max(icon.width, icon.height));
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
    // 6+6 槽位常显：左缘对齐 LV/HP 胶囊同一 gut 安全留白；胶囊下方一档（与 layout tokenY 一致）
    const size = compact ? 26 : 32;
    const gap = compact ? 4 : 7;
    const x0 = safe.x + this.edgeGutter();
    const y = safe.y + HUDScene.HUD_ROW_TOP + (compact ? 32 : 38);
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
      icon.setScale((size - 10) / Math.max(icon.width, icon.height)); // 等比缩放（HUD2）
      out.push(icon);
    });
    return out;
  }

  // ---------- 警告横幅 ----------

  private showWarn(key: string): void {
    this.configureWarnText();
    this.warnText.setPosition(this.vp.safe.x + this.vp.safe.w / 2, this.warnY());
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

  /** M19 掉落道具拾取提示：道具主题色短横幅（位置低于金色横幅，避免叠压） */
  private showDropToast(name: string, color: number): void {
    const safe = this.vp.safe;
    const hex = '#' + (color & 0xffffff).toString(16).padStart(6, '0');
    const txt = this.add.text(safe.x + safe.w / 2, safe.y + safe.h * 0.34, name, {
      fontFamily: FONT, fontSize: this.vp.fs(20) + 'px', fontStyle: 'bold',
      color: hex, stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(21).setAlpha(0).setScale(0.85);
    this.tweens.add({
      targets: txt, alpha: 1, scale: 1, y: txt.y - 16, duration: 240, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: txt, alpha: 0, delay: 900, duration: 320, onComplete: () => txt.destroy() });
      },
    });
    SFX.chime();
  }

  // ---------- 金色横幅 toast（成就达成 / 自动选卡获得规则卡），多个时排队 ----------

  private toastQueue: Array<{ text: string; hold: number }> = [];
  private toastBusy = false;
  private activeToast: Phaser.GameObjects.Text | null = null;

  private queueAchToast(id: string): void {
    this.queueToast(t('achUnlocked') + ' ' + t('ach_' + id));
  }

  /** hold = 淡出前停留毫秒（M14 引导 tips 3500，常规横幅 1700） */
  private queueToast(text: string, hold = 1700): void {
    this.toastQueue.push({ text, hold });
    this.pumpToast();
  }

  private repositionActiveToast(): void {
    if (!this.activeToast || !this.activeToast.active) return;
    const safe = this.vp.safe;
    this.activeToast.setPosition(safe.x + safe.w / 2, this.toastY());
  }

  private pumpToast(): void {
    if (this.toastBusy) return;
    const entry = this.toastQueue.shift();
    if (entry === undefined) return;
    this.toastBusy = true;
    const safe = this.vp.safe;
    const toast = this.add.text(safe.x + safe.w / 2, this.toastY(), entry.text, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#C8902A',
      stroke: '#FFFFFF', strokeThickness: 6, align: 'center',
      wordWrap: { width: safe.w - 50, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(21).setAlpha(0).setScale(0.8);
    this.activeToast = toast;
    SFX.levelup();
    this.tweens.add({
      targets: toast, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast, alpha: 0, delay: entry.hold, duration: 350,
          onComplete: () => {
            toast.destroy();
            if (this.activeToast === toast) this.activeToast = null;
            this.toastBusy = false;
            this.pumpToast();
          },
        });
      },
    });
  }

  // ---------- 升级三选一 / 规则卡三选一 ----------

  private pendingOffers: Offer[] = [];
  private pickTitle: Phaser.GameObjects.Text | null = null; // 选卡标题引用：放逐模式换成「点选要放逐的卡牌」
  // 规则卡分页选择器状态（B3）：点选预览高亮 + 下方规则描述 + 选择确认 + 翻页
  private arcanaPick: {
    page: number;
    selected: ArcanaId | null;
    pickable: ArcanaId[];
    onPick: (id: ArcanaId) => void;
    objs: Phaser.GameObjects.GameObject[];
  } | null = null;
  // 放逐改版（M16.5）：与重抽/跳过同排的按钮，点击进入「选卡放逐」模式
  private pickCards: Array<{ offer: Offer; card: Phaser.GameObjects.Container; banishable: boolean }> = [];
  private banishMode = false;
  private banishAnim = false; // 放逐演出进行中：屏蔽一切选卡/按钮输入
  private banishBtn: UIButton | null = null;
  private banishMarks: Phaser.GameObjects.GameObject[] = [];

  /** 选卡整组布局（B2）：标题 + 构筑栏 + 卡片组 + 按钮行作为一个整体在安全区内**真正垂直居中**，
   *  上下留白均衡；横屏卡片随屏放大并与按钮拉开间距。 */
  private pickLayout(n: number): {
    portrait: boolean; cw: number; ch: number; cardGap: number; bh: number;
    titleY: number; buildBarY: number; hasBuildBar: boolean; cardsTop: number; cy: number; btnY: number;
  } {
    const w = this.vp.w;
    const safe = this.vp.safe;
    const portrait = this.vp.h > w;
    const bh = Math.max(THEME.hitMin, Math.round(this.vp.s(portrait ? 48 : 50)));
    const titleH = 38;
    const topPad = portrait && safe.h < 560 ? 16 : 14;
    if (portrait) {
      const cw = Math.min(340, w - 40);
      const cardGap = 14;
      const gapHeaderCards = 16;
      const gapCardsBtn = 22;
      const hasBuildBar = safe.h >= 560;
      const buildBarH = hasBuildBar ? 30 : 0;
      const headerH = titleH + (hasBuildBar ? buildBarH + 6 : 0);
      const cap = safe.h >= 740 ? 142 : 124; // 高屏放宽卡高上限（T5）
      const fixed = headerH + gapHeaderCards + gapCardsBtn + bh + (n - 1) * cardGap;
      const maxCardsH = safe.h - topPad * 2 - fixed;
      const ch = Math.max(82, Math.min(cap, maxCardsH / n));
      const total = fixed + n * ch;
      const top = safe.y + Math.max(topPad, (safe.h - total) / 2);
      const titleY = top + titleH / 2;
      const buildBarY = titleY + titleH / 2 + 4;
      const cardsTop = top + headerH + gapHeaderCards;
      const btnY = cardsTop + n * ch + (n - 1) * cardGap + gapCardsBtn + bh / 2;
      return { portrait, cw, ch, cardGap, bh, titleY, buildBarY, hasBuildBar, cardsTop, cy: 0, btnY };
    }
    // 横屏：卡片随屏放大（不再固定 250）、整组居中、卡与按钮拉开间距
    const cardGap = 18;
    const gapHeaderCards = 16;
    const gapCardsBtn = Math.max(20, this.vp.s(26));
    const cw = Math.min(300, (w - w * 0.14) / n - cardGap);
    const fixed = titleH + gapHeaderCards + gapCardsBtn + bh;
    const maxCardH = safe.h - topPad * 2 - fixed;
    const ch = Math.max(200, Math.min(maxCardH, cw * 1.35, 360));
    const total = fixed + ch;
    const top = safe.y + Math.max(topPad, (safe.h - total) / 2);
    const titleY = top + titleH / 2;
    const cy = top + titleH + gapHeaderCards + ch / 2;
    const btnY = cy + ch / 2 + gapCardsBtn + bh / 2;
    return { portrait, cw, ch, cardGap, bh, titleY, buildBarY: 0, hasBuildBar: false, cardsTop: 0, cy, btnY };
  }

  /** 选卡卡片几何（升级与规则卡共用）：基于 pickLayout 的整组居中布局 */
  private pickCardGeom(i: number, n: number): { cx: number; cy: number; cw: number; ch: number; portrait: boolean } {
    const w = this.vp.w;
    const L = this.pickLayout(n);
    if (L.portrait) {
      return { cx: w / 2, cy: L.cardsTop + L.ch / 2 + i * (L.ch + L.cardGap), cw: L.cw, ch: L.ch, portrait: true };
    }
    return { cx: w / 2 + (i - (n - 1) / 2) * (L.cw + L.cardGap), cy: L.cy, cw: L.cw, ch: L.ch, portrait: false };
  }

  /** 选卡标题（升级与规则卡共用）：cy 由布局给定，整组居中的一部分。存引用供放逐模式换文案。 */
  private addPickTitle(text: string, cy: number): void {
    const w = this.vp.w;
    const maxW = this.vp.safe.w - this.edgeGutter() * 2;
    let fs = Math.min(30, w * 0.062);
    const title = this.add.text(w / 2, cy, text, {
      fontFamily: FONT, fontSize: fs + 'px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 7, align: 'center',
    }).setOrigin(0.5).setDepth(101).setScale(0.5);
    while (fs > 18 && title.width > maxW) {
      fs -= 1;
      title.setFontSize(fs);
    }
    if (title.width > maxW) title.setWordWrapWidth(maxW, true);
    this.tweens.add({ targets: title, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.overlay.push(title);
    this.pickTitle = title;
  }

  /** 选卡构筑栏（M12）：6+6 微缩令牌 + 精华计数；topY 由布局给定 */
  private addBuildBar(topY: number): void {
    const w = this.vp.w;
    const slots = [...this.weaponSlots(), ...this.passiveSlots()];
    const gap = 4;
    const size = Math.max(18, Math.min(24, (w - 64) / slots.length - gap));
    const ess = this.gs.run.essence;
    const essN = ess.dmg + ess.cd + ess.area;
    const extraW = essN > 0 ? 44 : 0;
    const rowW = slots.length * (size + gap) - gap;
    const x0 = w / 2 - (rowW + extraW) / 2;
    this.overlay.push(...this.drawSlotRow(x0, topY, size, slots, 101, gap));
    if (essN > 0) {
      const txt = this.add.text(x0 + rowW + 10, topY + size / 2, '✦×' + essN, {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#C8902A',
        stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(101);
      this.overlay.push(txt);
    }
  }

  private showLevelUp(offers: Offer[]): void {
    // 随机模式（M20）：随机抽一张直接应用，跳过选卡界面；调试「自动选卡」仍固定取第一张
    if ((this.gs.run.randomMode || getSettings().autoPick) && offers.length > 0) {
      const pick = this.gs.run.randomMode ? offers[Math.floor(Math.random() * offers.length)] : offers[0];
      this.gs.levelUp.applyOffer(pick);
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
    const L = this.pickLayout(offers.length);
    this.addPickTitle(t('levelUpTitle'), L.titleY);
    if (L.hasBuildBar) this.addBuildBar(L.buildBarY); // M12 选卡构筑栏：当前持有一览，放逐/重抽决策有依据
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
    const L = this.pickLayout(n);
    const y = L.btnY;
    const bh = L.bh; // ≥44 命中区（T1）
    const bw = L.portrait ? Math.min(118, L.cw * 0.32) : 140;
    const gap = L.portrait ? Math.max(6, (L.cw - bw * 3) / 2) : 14;
    const fs = this.vp.fs(L.portrait ? 14 : 15); // 过 vp.fs()（T1）；UIButton 超宽自动缩字兜底（T3）
    const cx = this.vp.w / 2;
    const step = bw + gap;
    const reroll = new UIButton(this, cx - step, y, {
      w: bw, h: bh, label: t('lvl_reroll').replace('{n}', String(run.rerolls)),
      fontSize: fs, icon: 'reroll', onTap: () => this.doReroll(),
    });
    const banish = new UIButton(this, cx, y, {
      w: bw, h: bh, label: t('lvl_banish').replace('{n}', String(run.banishes)),
      fontSize: fs, icon: 'banish', onTap: () => this.toggleBanish(),
    });
    const skip = new UIButton(this, cx + step, y, {
      w: bw, h: bh, label: t('lvl_skip').replace('{n}', String(run.skips)),
      fontSize: fs, icon: 'skip', onTap: () => this.doSkip(),
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

  /** 模式视觉：可放逐卡盖红 ✕ 角章脉动 + 不可放逐卡减淡；按钮变「取消」；标题换放逐提示 */
  private applyBanishVisuals(): void {
    this.banishMarks.forEach((o) => o.destroy());
    this.banishMarks = [];
    const run = this.gs.run;
    if (this.banishMode) {
      this.banishBtn?.setLabel(t('lvl_banishCancel')).setIcon('cancel');
      // 提示直接替换标题文案（原浮动提示行落在构筑栏上、间距不足会叠压——B 反馈）
      this.pickTitle?.setText(t('banishPick')).setColor('#C06870');
      for (const p of this.pickCards) {
        if (!p.banishable) {
          p.card.setAlpha(0.4);
          continue;
        }
        // ✕ 角章移到卡片中央半透明覆盖（T4）：不再与右上角的 tag / 「新!」角标叠压
        const mark = this.add.text(p.card.x, p.card.y, '✕', {
          fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#C06870',
          stroke: '#FFFFFF', strokeThickness: 7,
        }).setOrigin(0.5).setDepth(103).setScale(0).setAlpha(0.6);
        this.tweens.add({ targets: mark, scale: 1, duration: 200, ease: 'Back.easeOut' });
        this.tweens.add({ targets: mark, scale: 1.18, delay: 220, duration: 460, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.overlay.push(mark);
        this.banishMarks.push(mark);
      }
    } else {
      this.banishBtn?.setLabel(t('lvl_banish').replace('{n}', String(run.banishes))).setIcon('banish');
      this.pickTitle?.setText(t('levelUpTitle')).setColor(PAL.inkCss);
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
    // 随机模式（M20）随机抽一张 / 调试「自动选卡」固定首张：自动选并以金色横幅告知（避免静默跳过造成困惑）
    if ((this.gs.run.randomMode || getSettings().autoPick) && choices.length > 0) {
      const pick = this.gs.run.randomMode ? choices[Math.floor(Math.random() * choices.length)] : choices[0];
      this.gs.levelUp.applyArcana(pick);
      this.queueToast(t('arcGet').replace('{n}', t('arc_' + pick)));
      this.scene.resume('game');
      return;
    }
    this.overlayMode = 'arcana';
    this.overlay.push(this.addVeil());
    this.addPickTitle(t('arcanaTitle'), this.arcanaLayout().titleY);
    this.openArcanaPicker(choices, (id) => this.chooseArcana(id));
  }

  /** 每页规格：竖屏 2×3=6 / 极矮竖屏 2×2=4 / 横屏 4×2=8 */
  private arcanaPageSpec(): { cols: number; rows: number; perPage: number } {
    const portrait = this.vp.h > this.vp.w;
    if (portrait && this.vp.safe.h < 560) return { cols: 2, rows: 2, perPage: 4 };
    return portrait ? { cols: 2, rows: 3, perPage: 6 } : { cols: 4, rows: 2, perPage: 8 };
  }

  /** 选择器整组几何：标题 + 网格 + 规则描述 + 翻页指示 + 控制行作为一个整体在安全区内**垂直居中**，
   *  上下留白均衡；描述框与网格等宽对齐；控制行（‹ 选择 ›）聚成居中一簇——不再把标题贴顶、
   *  把翻页箭头甩到屏幕左右角落、把按钮压到底边（见反馈截图）。竖屏/横屏同一套居中口径。 */
  private arcanaLayout(): {
    cols: number; rows: number; titleY: number;
    gx0: number; gy0: number; cw: number; ch: number; gapX: number; gapY: number; gridW: number;
    descTop: number; descH: number; descW: number;
    pageY: number; ctrlCy: number; ctrlH: number;
  } {
    const safe = this.vp.safe;
    const cx = safe.x + safe.w / 2;
    const portrait = this.vp.h > this.vp.w;
    const { cols, rows } = this.arcanaPageSpec();

    const titleH = 40;
    const gapTitleGrid = 16;
    const gapGridDesc = 14;
    const gapDescCtrl = 12; // 规则描述 → 控制行
    const gapCtrlPage = 6;  // 控制行 → 页数
    const pageH = 16;
    const ctrlH = Math.max(THEME.hitMin, 50);
    const topPad = 14;
    const gapX = 12;
    const gapY = 12;

    const sidePad = portrait ? 18 : 56;
    const cw = Math.min(portrait ? 210 : 220, (safe.w - 2 * sidePad - (cols - 1) * gapX) / cols);
    // 规则描述区压缩到刚好容纳标题 + 至多 2 行规则文字（竖屏最长 2 行、横屏单行）
    const descH = portrait ? (safe.h < 560 ? 88 : 74) : 58;

    // 卡高：取上限；整组高度超出安全区时再压缩卡高（保留 topPad 下限），保证整组始终能容纳
    const fixed = titleH + gapTitleGrid + gapGridDesc + descH + gapDescCtrl + ctrlH + gapCtrlPage + pageH
      + (rows - 1) * gapY;
    const ch = Math.max(portrait ? 92 : 116, Math.min(portrait ? 158 : 188, (safe.h - 2 * topPad - fixed) / rows));

    const gridW = cols * cw + (cols - 1) * gapX;
    const gridH = rows * ch + (rows - 1) * gapY;
    const total = titleH + gapTitleGrid + gridH + gapGridDesc + descH + gapDescCtrl + ctrlH + gapCtrlPage + pageH;
    const top = safe.y + Math.max(topPad, (safe.h - total) / 2);

    const titleY = top + titleH / 2;
    const gy0 = top + titleH + gapTitleGrid;
    const gx0 = cx - gridW / 2;
    const descTop = gy0 + gridH + gapGridDesc;
    // 页数挪到控制行下方：描述 → 控制行 → 页数，整体更紧凑
    const ctrlCy = descTop + descH + gapDescCtrl + ctrlH / 2;
    const pageY = ctrlCy + ctrlH / 2 + gapCtrlPage + pageH / 2;

    return { cols, rows, titleY, gx0, gy0, cw, ch, gapX, gapY, gridW, descTop, descH, descW: gridW, pageY, ctrlCy, ctrlH };
  }

  /** 规则卡分页选择器（B3，开局选卡与宝箱规则卡件共用）：点选预览高亮 + 下方规则描述 +
   *  「选择」确认 + 翻页。pickable=本次可选，其余按已持有/未解锁置灰但仍可点选查看规则。 */
  private openArcanaPicker(pickable: ArcanaId[], onPick: (id: ArcanaId) => void): void {
    const all = ARCANA_META.map((m) => m.id);
    const first = pickable.length ? pickable[0] : all[0];
    const { perPage } = this.arcanaPageSpec();
    this.arcanaPick = {
      page: Math.max(0, Math.floor(all.indexOf(first) / perPage)),
      selected: first,
      pickable,
      onPick,
      objs: [],
    };
    this.renderArcanaPage();
  }

  /** 某卡当前态：可选 / 已持有 / 未解锁 */
  private arcanaState(id: ArcanaId): 'pick' | 'owned' | 'locked' {
    if (this.arcanaPick?.pickable.includes(id)) return 'pick';
    if (this.gs.run.arcana.includes(id) || Meta.isArcanaUnlocked(id)) return 'owned';
    return 'locked';
  }

  /** 重绘当前页（翻页/改选时调用）：网格 + 规则描述区 + 选择/翻页控制 */
  private renderArcanaPage(): void {
    const st = this.arcanaPick;
    if (!st) return;
    st.objs.forEach((o) => o.destroy());
    st.objs = [];
    const push = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      st.objs.push(o);
      this.overlay.push(o);
      return o;
    };
    const safe = this.vp.safe;
    const cx = safe.x + safe.w / 2;
    const all = ARCANA_META.map((m) => m.id);
    const { perPage } = this.arcanaPageSpec();
    const L = this.arcanaLayout();
    const { cols } = L;
    const pageCount = Math.ceil(all.length / perPage);
    st.page = Phaser.Math.Clamp(st.page, 0, pageCount - 1);

    // 网格瓦片（整组居中布局，几何由 arcanaLayout 给定）
    const pageItems = all.slice(st.page * perPage, st.page * perPage + perPage);
    pageItems.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tcx = L.gx0 + col * (L.cw + L.gapX) + L.cw / 2;
      const tcy = L.gy0 + row * (L.ch + L.gapY) + L.ch / 2;
      this.makeArcanaTile(id, tcx, tcy, L.cw, L.ch, st.selected === id).forEach(push);
    });

    // 规则描述区（与网格等宽、左右边缘对齐）
    this.drawArcanaDesc(cx, L.descTop, L.descW, L.descH, st.selected).forEach(push);

    // 翻页指示
    push(this.add.text(cx, L.pageY, (st.page + 1) + ' / ' + pageCount, {
      fontFamily: FONT, fontSize: '13px', color: PAL.inkSoft, stroke: '#FFFFFF', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(102));

    // 控制行：‹ 选择 › 聚成居中一簇（翻页箭头紧贴选择按钮两侧，不再甩到屏幕左右角落）
    const ctrlCy = L.ctrlCy;
    const selectable = st.selected !== null && st.pickable.includes(st.selected);
    const selectW = Math.min(200, safe.w * 0.46);
    const arrowW = 44;
    const clusterGap = 12;
    const selectBtn = new UIButton(this, cx, ctrlCy, {
      w: selectW, h: L.ctrlH, label: t('arcSelect'), fontSize: 18,
      fill: 0xffeec0, edge: 0xe2b452,
      onTap: () => { if (st.selected && st.pickable.includes(st.selected)) st.onPick(st.selected); },
    });
    selectBtn.setDepth(102);
    if (!selectable) selectBtn.setEnabled(false);
    push(selectBtn);
    const prev = new UIButton(this, cx - selectW / 2 - clusterGap - arrowW / 2, ctrlCy, {
      w: arrowW, h: arrowW, label: '‹', fontSize: 24, onTap: () => { st.page--; this.renderArcanaPage(); },
    });
    prev.setDepth(102);
    if (st.page <= 0) prev.setEnabled(false);
    push(prev);
    const next = new UIButton(this, cx + selectW / 2 + clusterGap + arrowW / 2, ctrlCy, {
      w: arrowW, h: arrowW, label: '›', fontSize: 24, onTap: () => { st.page++; this.renderArcanaPage(); },
    });
    next.setDepth(102);
    if (st.page >= pageCount - 1) next.setEnabled(false);
    push(next);
  }

  /** 单张规则卡瓦片：顶部色带托图标 + 名称 + 状态角标；点选=预览高亮（任何卡都可点选查看规则） */
  private makeArcanaTile(
    id: ArcanaId, cx: number, cy: number, cw: number, ch: number, selected: boolean,
  ): Phaser.GameObjects.GameObject[] {
    const meta = ARCANA_META.find((m) => m.id === id)!;
    const state = this.arcanaState(id);
    const dim = state !== 'pick';
    const bandH = ch * 0.46;
    const edge = dim ? 0xc8bca4 : meta.color;
    const out: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics().setDepth(101);
    const draw = (over: boolean): void => {
      g.clear();
      g.fillStyle(0x5a5248, 0.08);
      g.fillRoundedRect(cx - cw / 2 + 2, cy - ch / 2 + 4, cw, ch, 10);
      g.fillStyle(over || selected ? 0xfffef8 : dim ? 0xf2ece0 : PAL.cardBg, 1);
      g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 10);
      g.fillStyle(edge, dim ? 0.18 : 0.26);
      g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, bandH, { tl: 10, tr: 10, bl: 0, br: 0 });
      // 选中：金色粗描边高亮
      g.lineStyle(selected ? 4 : 2.5, selected ? 0xe2b452 : edge, dim && !selected ? 0.7 : 1);
      g.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 10);
    };
    draw(false);
    out.push(g);
    const icon = this.add.image(cx, cy - ch / 2 + bandH / 2, meta.icon)
      .setScale(Math.max(0.9, bandH / 42)).setDepth(101);
    if (dim) icon.setAlpha(0.5);
    out.push(icon);
    const nameTxt = this.add.text(cx, cy - ch / 2 + bandH + 5, t('arc_' + id), {
      fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: PAL.inkCss,
      align: 'center', wordWrap: { width: cw - 12 },
    }).setOrigin(0.5, 0).setDepth(101);
    if (dim) nameTxt.setAlpha(0.6);
    out.push(nameTxt);
    if (meta.tier === 'mechanic') {
      out.push(this.add.text(cx - cw / 2 + 7, cy - ch / 2 + 5, '★', {
        fontFamily: FONT, fontSize: '12px', color: '#C8902A', stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0, 0).setDepth(102));
    }
    if (state === 'owned') {
      out.push(this.add.text(cx + cw / 2 - 6, cy - ch / 2 + 5, '✓', {
        fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#76B896', stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(1, 0).setDepth(102));
    } else if (state === 'locked') {
      out.push(this.add.text(cx + cw / 2 - 6, cy - ch / 2 + 5, '🔒', {
        fontFamily: FONT, fontSize: '12px',
      }).setOrigin(1, 0).setDepth(102).setAlpha(0.7));
    }
    const zone = this.add.zone(cx, cy, cw, ch).setDepth(103).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { if (!selected) draw(true); });
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => {
      if (!this.arcanaPick) return;
      this.arcanaPick.selected = id;
      SFX.uiClick();
      this.renderArcanaPage();
    });
    out.push(zone);
    return out;
  }

  /** 规则描述区：白底圆角框，显示选中卡名 + 规则文字（未解锁显示解锁条件） */
  private drawArcanaDesc(
    cx: number, top: number, boxW: number, boxH: number, selected: ArcanaId | null,
  ): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics().setDepth(101);
    g.fillStyle(PAL.cardBg, 0.94);
    g.fillRoundedRect(cx - boxW / 2, top, boxW, boxH, 12);
    g.lineStyle(2, PAL.cardEdge, 1);
    g.strokeRoundedRect(cx - boxW / 2, top, boxW, boxH, 12);
    out.push(g);
    if (!selected) {
      out.push(this.add.text(cx, top + boxH / 2, t('arcPickHint'), {
        fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft, align: 'center',
      }).setOrigin(0.5).setDepth(102));
      return out;
    }
    const meta = ARCANA_META.find((m) => m.id === selected)!;
    const state = this.arcanaState(selected);
    out.push(this.add.text(cx - boxW / 2 + 12, top + 9, (meta.tier === 'mechanic' ? '★ ' : '') + t('arc_' + selected), {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: PAL.inkCss,
    }).setOrigin(0, 0).setDepth(102));
    const ach = state === 'locked' ? ACHIEVEMENTS.find((a) => a.unlockArcana === selected) : undefined;
    const descStr = ach
      ? t('ui_unlockBy').replace('{a}', t('ach_' + ach.id))
      : state === 'locked' ? t('ui_lockedHint') : t('arc_' + selected + '_d');
    out.push(this.add.text(cx - boxW / 2 + 12, top + 33, descStr, {
      fontFamily: FONT, fontSize: '13px', color: PAL.inkSoft,
      wordWrap: { width: boxW - 24, useAdvancedWrap: true },
    }).setOrigin(0, 0).setDepth(102));
    return out;
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
      if (offer.breakthrough) {
        // 突破模式（M20）：已进化超武继续升级——展示超武形态名 + 「突破 LvN」金标
        return {
          icon: weaponIcon(meta, true),
          name: t('w_' + offer.id + '_e'),
          desc: t('w_' + offer.id + '_e_d'),
          color: meta.color,
          tag: t('breakthroughTag').replace('{n}', String(offer.breakthrough)),
          tagColor: '#C8902A',
        };
      }
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
      // 横排条卡：图标在左，名称+描述作为一个块与图标一同**垂直居中**（旧版名称/描述顶贴、
      // 图标却居中 → 错位且下半空荡，B 反馈）。tag 角标随名称同一行右对齐，进化提示固定卡底。
      const textX = -cw / 2 + 72;
      const hasEvo = !!(info.evoHint && ch >= (this.vp.safe.h < 560 ? 132 : 96));
      const padTop = 10;
      const padBot = hasEvo ? 24 : 10;
      const contentCy = (-ch / 2 + padTop + (ch / 2 - padBot)) / 2; // 图标+文字块的垂直中心
      const icon = this.add.image(-cw / 2 + 38, contentCy, info.icon).setScale(1.3);
      const name = this.add.text(textX, 0, info.name, {
        fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0, 0);
      const desc = this.add.text(textX, 0, info.desc, {
        fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft,
        wordWrap: { width: cw - 96 },
      }).setOrigin(0, 0);
      const gap = 5;
      const blockH = name.height + gap + desc.height;
      name.setY(contentCy - blockH / 2);
      desc.setY(name.y + name.height + gap);
      const tag = this.add.text(cw / 2 - 14, name.y, info.tag, {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold',
        color: info.tagColor,
      }).setOrigin(1, 0);
      parts.push(icon, name, tag, desc);
      // M14 进化角标：卡底一行（极矮条卡 <96 省略，与 showDesc 同门槛思路）
      if (hasEvo) {
        parts.push(this.add.text(textX, ch / 2 - 9, info.evoHint!.text, {
          fontFamily: FONT, fontSize: '12px', fontStyle: info.evoHint!.ready ? 'bold' : 'normal',
          color: info.evoHint!.ready ? '#C8902A' : '#A89F8E',
          wordWrap: { width: cw - 96 },
        }).setOrigin(0, 1));
      }
    } else {
      // 横屏竖卡：内容按卡高比例分布（卡随屏放大时不再上挤下空），图标随卡宽放大
      const iconScale = Math.min(2.8, Math.max(1.55, cw / 120));
      const icon = this.add.image(0, -ch / 2 + ch * 0.26, info.icon).setScale(iconScale);
      const nameY = -ch / 2 + ch * 0.5;
      const name = this.add.text(0, nameY, info.name, {
        fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: PAL.inkCss, align: 'center',
        wordWrap: { width: cw - 20 },
      }).setOrigin(0.5, 0);
      const tag = this.add.text(0, nameY + 28, info.tag, {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold',
        color: info.tagColor,
      }).setOrigin(0.5, 0);
      const desc = this.add.text(0, nameY + 52, info.desc, {
        fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft, align: 'center',
        wordWrap: { width: cw - 26 },
      }).setOrigin(0.5, 0);
      const num = this.add.text(-cw / 2 + 12, -ch / 2 + 8, String(idx + 1), {
        fontFamily: FONT, fontSize: '13px', color: '#C8BCA4',
      });
      parts.push(icon, name, tag, desc, num);
      // M14 进化角标：卡底居中一行
      if (info.evoHint) {
        parts.push(this.add.text(0, ch / 2 - 12, info.evoHint.text, {
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
    } else if (this.overlayMode === 'arcana' && this.arcanaPick) {
      // 数字键预览当前页第 i 张（与点选一致，需再按「选择」确认）
      const all = ARCANA_META.map((m) => m.id);
      const { perPage } = this.arcanaPageSpec();
      const id = all[this.arcanaPick.page * perPage + i];
      if (id) {
        this.arcanaPick.selected = id;
        this.renderArcanaPage();
      }
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
    const isArc = reward.arcana === true; // M19 规则卡专属宝箱：紫色箱体 + 专属标题
    const veil = this.addVeil();
    this.chestTitle = this.add.text(cx, h * 0.2, isArc ? t('chestArcanaTitle') : t('chestTitle'), {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(101);
    // 待开演出：地面光环呼吸 + 宝箱浮动；尺寸随 vp.s() 缩放，小屏不再过大（ART2）
    const k = this.vp.s(1); // 全局缩放因子（0.85–1.2）
    const halo = this.add.image(cx, cy + 4, 'p_dot').setTint(isArc ? 0xb48ce0 : 0xf2cf6e).setAlpha(0.5)
      .setDisplaySize(170 * k, 170 * k).setDepth(100);
    const chest = this.add.image(cx, cy, isArc ? 'arcanachest' : 'chest').setScale(3 * k).setDepth(101);
    const hint = this.add.text(cx, h * 0.62, t('chestOpen'), {
      fontFamily: FONT, fontSize: '17px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(101);
    this.tweens.add({
      targets: halo, displayWidth: 210 * k, displayHeight: 210 * k, alpha: 0.28,
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
      // 蓄力摇晃 → 爆发（缩放随 vp.s() 因子，与待开态一致）
      this.tweens.add({ targets: chest, scale: 3.35 * this.vp.s(1), duration: 400, ease: 'Cubic.easeIn' });
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
    // 自动解卡：随机模式（M20，随机抽一张）/ 调试自动选卡（取首张）——均跳过卡池选卡器
    const auto = this.gs.run.randomMode || getSettings().autoPick;
    const items = reward.items;
    const arc = items.find((it): it is Extract<ChestItem, { kind: 'arcana' }> => it.kind === 'arcana');
    const arcAutoPick = arc
      ? (this.gs.run.randomMode ? arc.cards[Math.floor(Math.random() * arc.cards.length)] : arc.cards[0])
      : undefined;
    const finish = (pick?: ArcanaId): void => {
      this.closeOverlay();
      this.gs.levelUp.applyChest(reward, pick);
      this.scene.resume('game');
    };
    // 单件规则卡：直接进分页选卡器（与开局选卡同一版式）；标题与整组居中布局对齐（arcanaLayout）
    if (items.length === 1 && arc && !auto) {
      this.chestTitle?.setText(t('chestArcanaPick'))
        .setPosition(this.vp.safe.x + this.vp.safe.w / 2, this.arcanaLayout().titleY);
      this.openArcanaPicker(arc.cards, (id) => {
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
        const meta = WEAPON_META.find((m) => m.id === it.weapon)!;
        return { icon: weaponIcon(meta, true), label: t('evolveTag') + '！ ' + t('w_' + it.weapon + '_e') };
      }
      if (it.kind === 'arcana') {
        return auto
          ? { icon: ARCANA_META.find((m) => m.id === arcAutoPick)!.icon, label: t('arcTag') + '！ ' + t('arc_' + arcAutoPick) }
          : { icon: 'icon_arcana', label: t('chestArcanaRow') }; // 专属金卡徽记，区别于星屑粒子
      }
      if (it.kind === 'upgrade') {
        const o = it.offer;
        const icon = o.kind === 'weapon'
          ? weaponIcon(WEAPON_META.find((m) => m.id === o.id)!, !!o.breakthrough)
          : PASSIVE_META.find((m) => m.id === o.id)!.icon;
        if (o.kind === 'weapon' && o.breakthrough) {
          return { icon, label: t('w_' + o.id + '_e') + ' ' + t('breakthroughTag').replace('{n}', String(o.breakthrough)) };
        }
        const name = o.kind === 'weapon' ? t('w_' + o.id) : t('p_' + o.id);
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
      if (it.kind === 'arcana') label += '\n' + t('arc_' + arcAutoPick + '_d');
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
    const okLabel = arc && !auto ? t('chestArcanaPickBtn') : 'OK'; // 含规则卡时按钮明示「选规则卡」
    const ok = track(makeButton(this, w / 2, h * 0.78, THEME.btnW, THEME.btnH, okLabel, () => {
      if (this.overlayMode !== 'chest') return;
      if (arc && !auto) {
        // 清单 → 全卡池选卡（其余件待选卡后一并入手）
        SFX.uiClick();
        revealObjs.forEach((o) => o.destroy());
        this.chestTitle?.setText(t('chestArcanaPick'))
          .setPosition(this.vp.safe.x + this.vp.safe.w / 2, this.arcanaLayout().titleY);
        this.openArcanaPicker(arc.cards, (id) => {
          if (this.overlayMode !== 'chest') return;
          SFX.uiClick();
          finish(id);
        });
        return;
      }
      finish(arcAutoPick); // 自动模式（随机/调试）直接入手已定卡；无规则卡件时为 undefined（applyChest 忽略）
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
    const safe = this.vp.safe;
    const cx = safe.x + safe.w / 2;
    const portrait = this.vp.h > this.vp.w;
    this.overlay.push(this.addVeil());
    const bh = THEME.btnH;

    if (portrait) {
      // 竖屏：标题 → 构筑摘要 → 四按钮，自上而下确定性堆叠（B4：摘要高度算清后再排按钮，杜绝重叠）
      const title = this.add.text(cx, safe.y + safe.h * 0.1, t('pause'), {
        fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: PAL.inkCss,
        stroke: '#FFFFFF', strokeThickness: 7,
      }).setOrigin(0.5).setDepth(101);
      this.overlay.push(title);
      const summaryBottom = this.drawBuildSummary(cx, title.y + 30, safe.h >= 560);
      const bw = THEME.btnW;
      const by0 = summaryBottom + 26 + bh / 2;
      const maxGap = (safe.y + safe.h - 14 - bh / 2 - by0) / 3;
      const gap = Math.max(bh + 10, Math.min(68, maxGap));
      this.makePauseButtons(cx, by0, gap, bw, bh);
    } else {
      // 横屏：标题居顶，左构筑摘要 / 右四按钮两栏
      const title = this.add.text(cx, safe.y + safe.h * 0.12, t('pause'), {
        fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: PAL.inkCss,
        stroke: '#FFFFFF', strokeThickness: 7,
      }).setOrigin(0.5).setDepth(101);
      this.overlay.push(title);
      const leftCx = safe.x + safe.w * 0.3;
      const rightCx = safe.x + safe.w * 0.72;
      this.drawBuildSummary(leftCx, safe.y + safe.h * 0.28, true);
      const bw = Math.min(THEME.btnW, safe.w * 0.42);
      const gap = Math.min(bh + 16, (safe.h * 0.62) / 3);
      const by0 = safe.y + safe.h * 0.5 - gap * 1.5;
      this.makePauseButtons(rightCx, by0, gap, bw, bh);
    }
  }

  /** 暂停面板构筑摘要：6+6 槽位 + 规则卡令牌行 + 可选属性总览；返回内容底部 y */
  private drawBuildSummary(cx: number, top: number, showStats: boolean): number {
    const slotSize = 32;
    const rowW = MAX_WEAPONS * (slotSize + 7) - 7;
    const sx = cx - rowW / 2;
    this.overlay.push(...this.drawSlotRow(sx, top, slotSize, this.weaponSlots(), 101));
    this.overlay.push(...this.drawSlotRow(sx, top + slotSize + 8, slotSize, this.passiveSlots(), 101));
    let bottom = top + (slotSize + 8) * 2;
    const arcana = this.gs.run.arcana;
    if (arcana.length > 0) {
      const aGap = 8;
      let aSize = 36;
      const maxW = rowW + 20;
      if (arcana.length * (aSize + aGap) - aGap > maxW) {
        aSize = Math.max(20, (maxW + aGap) / arcana.length - aGap);
      }
      const aW = arcana.length * (aSize + aGap) - aGap;
      this.overlay.push(...this.drawArcanaRow(cx - aW / 2, bottom + 6, aSize, arcana, 101, aGap));
      bottom += aSize + 14;
    }
    if (showStats) {
      const s = this.gs.run.stats;
      const ess = this.gs.run.essence;
      const essN = ess.dmg + ess.cd + ess.area;
      const pct = (v: number): string => (v >= 1 ? '+' : '−') + Math.abs(Math.round((v - 1) * 100)) + '%';
      const cdTxt = s.cd <= 1 ? '−' + Math.round((1 - s.cd) * 100) + '%' : '+' + Math.round((s.cd - 1) * 100) + '%';
      const line1 = t('st_dmg') + ' ' + pct(s.dmg) + ' · ' + t('st_cd') + ' ' + cdTxt + ' · ' + t('st_area') + ' ' + pct(s.area);
      const line2 = t('st_move') + ' ' + Math.round(s.moveSpeed) + ' · ' + t('st_magnet') + ' ' + Math.round(s.magnet)
        + ' · ' + t('st_armor') + ' ' + s.armor
        + (essN > 0 ? ' · ✦' + t('essTag') + ' ×' + essN : '');
      const statTxt = this.add.text(cx, bottom + 6, line1 + '\n' + line2, {
        fontFamily: FONT, fontSize: '13px', color: PAL.inkSoft, align: 'center', lineSpacing: 5,
        stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(101);
      this.overlay.push(statTxt);
      bottom += statTxt.height + 8;
    }
    return bottom;
  }

  /** 暂停面板四按钮（继续/声音/设置/返回主菜单），从 startY 起每隔 gap 一个 */
  private makePauseButtons(cx: number, startY: number, gap: number, bw: number, bh: number): void {
    const resume = makeButton(this, cx, startY, bw, bh, t('resume'), () => this.togglePause(), { fontSize: THEME.btnFs });
    const sound = makeButton(this, cx, startY + gap, bw, bh, SFX.muted ? t('soundOff') : t('soundOn'), () => {
      SFX.setMuted(!SFX.muted);
      setButtonLabel(sound, SFX.muted ? t('soundOff') : t('soundOn'));
    }, { fontSize: THEME.btnFs });
    const settings = makeButton(this, cx, startY + gap * 2, bw, bh, t('menu_settings'), () => {
      go(this, 'settings'); // 保持 game 暂停，进设置页；返回时 HUD 重启并自动重开暂停面板
    }, { fontSize: THEME.btnFs });
    const quit = makeButton(this, cx, startY + gap * 3, bw, bh, t('quit'), () => {
      const run = this.gs.run; // 中途退出也入账：金币/统计不丢（不计胜场）
      Meta.recordRun({ win: false, time: run.elapsed, kills: run.kills, coins: run.coins, affixKills: run.affixKills });
      this.closeOverlay();
      this.scene.stop('game');
      this.scene.stop();
      this.game.scene.start('title');
    }, { fontSize: THEME.btnFs });
    [resume, sound, settings, quit].forEach((b) => b.setDepth(101));
    this.overlay.push(resume, sound, settings, quit);
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
    this.pickTitle = null;
    this.arcanaPick = null;
    this.buildIconRow();
  }
}
