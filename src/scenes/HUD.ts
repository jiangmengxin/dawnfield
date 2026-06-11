// HUD 覆盖层：状态条、计时、武器栏、升级三选一、宝箱、暂停、Boss 条
import Phaser from 'phaser';
import { FONT, t, toggleLang } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { PASSIVE_META, WEAPON_META, WeaponId } from '../config';
import { makeButton, setButtonLabel } from '../ui/widgets';
import type { GameScene, Offer } from './Game';

export class HUDScene extends Phaser.Scene {
  private gs!: GameScene;
  private bars!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private killIcon!: Phaser.GameObjects.Image;
  private levelText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private warnText!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Container;
  private muteBtn!: Phaser.GameObjects.Container;
  private iconRow: Phaser.GameObjects.GameObject[] = [];
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private overlayMode: 'none' | 'levelup' | 'chest' | 'pause' = 'none';
  private bossVisible = false;

  constructor() {
    super('hud');
  }

  create(): void {
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

    this.pauseBtn = makeButton(this, 0, 0, 44, 44, '⏸', () => this.togglePause(), { fontSize: 20 });
    this.muteBtn = makeButton(this, 0, 0, 44, 44, SFX.muted ? '🔇' : '🔊', () => {
      SFX.setMuted(!SFX.muted);
      setButtonLabel(this.muteBtn, SFX.muted ? '🔇' : '🔊');
    }, { fontSize: 18 });
    this.pauseBtn.setDepth(12);
    this.muteBtn.setDepth(12);

    // 键盘选卡
    this.input.keyboard!.on('keydown-ONE', () => this.pickByIndex(0));
    this.input.keyboard!.on('keydown-TWO', () => this.pickByIndex(1));
    this.input.keyboard!.on('keydown-THREE', () => this.pickByIndex(2));

    const ev = this.game.events;
    const onLevelup = (offers: Offer[]) => this.showLevelUp(offers);
    const onChest = (pick: WeaponId | null) => this.showChest(pick);
    const onBoss = (v: boolean) => { this.bossVisible = v; this.bossName.setVisible(v); };
    const onWarn = (key: string) => this.showWarn(key);
    const onRefresh = () => this.buildIconRow();
    const onToggle = () => this.togglePause();
    const onAuto = () => { if (this.overlayMode === 'none' && this.gs.running) this.togglePause(); };
    ev.on('hud:levelup', onLevelup);
    ev.on('hud:chest', onChest);
    ev.on('hud:boss', onBoss);
    ev.on('hud:warn', onWarn);
    ev.on('hud:refresh', onRefresh);
    ev.on('hud:togglepause', onToggle);
    ev.on('hud:autopause', onAuto);

    this.buildIconRow();
    this.layout();
    this.scale.on('resize', this.layout, this);

    this.events.on('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      ev.off('hud:levelup', onLevelup);
      ev.off('hud:chest', onChest);
      ev.off('hud:boss', onBoss);
      ev.off('hud:warn', onWarn);
      ev.off('hud:refresh', onRefresh);
      ev.off('hud:togglepause', onToggle);
      ev.off('hud:autopause', onAuto);
    });
  }

  private layout(): void {
    const w = this.scale.width;
    this.timerText.setPosition(w / 2, 18);
    this.killIcon.setPosition(w / 2 - 24, 68);
    this.killText.setPosition(w / 2 - 8, 68);
    this.levelText.setPosition(w - 14, 14);
    this.pauseBtn.setPosition(w - 38, 64);
    this.muteBtn.setPosition(w - 38, 116);
    this.bossName.setPosition(w / 2, 96);
    this.warnText.setPosition(w / 2, this.scale.height * 0.3);
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
    const w = this.scale.width;
    const g = this.bars;
    g.clear();
    // XP 条（顶部通栏）
    const xpK = Phaser.Math.Clamp(this.gs.xp / this.gs.xpNeed, 0, 1);
    g.fillStyle(PAL.xpBack, 0.9);
    g.fillRect(0, 0, w, 9);
    g.fillStyle(PAL.xp, 1);
    g.fillRect(0, 0, w * xpK, 9);
    // HP 条（左上）
    const hpW = Math.min(170, w * 0.35);
    const hpK = Phaser.Math.Clamp(this.gs.hp / this.gs.stats.maxHp, 0, 1);
    g.fillStyle(0x5a5248, 0.08);
    g.fillRoundedRect(14, 20, hpW, 16, 8);
    g.fillStyle(PAL.hp, 1);
    if (hpK > 0.03) g.fillRoundedRect(14, 20, Math.max(12, hpW * hpK), 16, 8);
    g.lineStyle(2, 0xe0d4bc, 1);
    g.strokeRoundedRect(14, 20, hpW, 16, 8);
    this.hpText.setPosition(20, 28).setText(Math.ceil(this.gs.hp) + ' / ' + this.gs.stats.maxHp);

    // 计时
    const sec = Math.floor(this.gs.elapsed);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    this.timerText.setText(mm + ':' + ss);
    this.killText.setText(String(this.gs.kills));
    this.levelText.setText(t('level') + ' ' + this.gs.level);

    // Boss 条
    if (this.bossVisible) {
      const boss = this.gs.enemies.boss;
      if (boss && boss.active) {
        const bw = Math.min(420, w - 80);
        const bk = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
        this.bossName.setText(t('bossName'));
        g.fillStyle(0x5a5248, 0.1);
        g.fillRoundedRect(w / 2 - bw / 2, 108, bw, 12, 6);
        g.fillStyle(0x8a96b8, 1);
        if (bk > 0.02) g.fillRoundedRect(w / 2 - bw / 2, 108, bw * bk, 12, 6);
        g.lineStyle(2, 0x5a6488, 0.8);
        g.strokeRoundedRect(w / 2 - bw / 2, 108, bw, 12, 6);
      }
    }
  }

  // ---------- 武器/被动图标栏 ----------

  private buildIconRow(): void {
    this.iconRow.forEach((o) => o.destroy());
    this.iconRow = [];
    let x = 30;
    const y = 56;
    for (const wpn of this.gs.weapons.list) {
      const meta = WEAPON_META.find((m) => m.id === wpn.id)!;
      const icon = this.add.image(x, y, meta.icon).setScale(0.8).setDepth(11);
      const lv = this.add.text(x + 10, y + 10, wpn.evolved ? '★' : String(wpn.level), {
        fontFamily: FONT, fontSize: '12px', fontStyle: 'bold',
        color: wpn.evolved ? '#C8902A' : PAL.inkCss, stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(12);
      this.iconRow.push(icon, lv);
      x += 38;
    }
    x = 30;
    for (const [pid, plv] of this.gs.passives) {
      const meta = PASSIVE_META.find((m) => m.id === pid)!;
      const icon = this.add.image(x, y + 38, meta.icon).setScale(0.62).setDepth(11);
      const lv = this.add.text(x + 8, y + 46, String(plv), {
        fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: PAL.inkCss,
        stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(12);
      this.iconRow.push(icon, lv);
      x += 30;
    }
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

  // ---------- 升级三选一 ----------

  private pendingOffers: Offer[] = [];

  private showLevelUp(offers: Offer[]): void {
    this.overlayMode = 'levelup';
    this.pendingOffers = offers;
    const w = this.scale.width;
    const h = this.scale.height;
    const veil = this.addVeil();
    const title = this.add.text(w / 2, h * 0.14, t('levelUpTitle'), {
      fontFamily: FONT, fontSize: Math.min(30, w * 0.062) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(101).setScale(0.5);
    this.tweens.add({ targets: title, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.overlay.push(veil, title);

    const portrait = h > w;
    offers.forEach((offer, i) => {
      let cx: number;
      let cy: number;
      let cw: number;
      let ch: number;
      if (portrait) {
        cw = Math.min(340, w - 40);
        ch = Math.min(120, (h * 0.6) / offers.length - 14);
        cx = w / 2;
        cy = h * 0.3 + i * (ch + 16);
      } else {
        cw = Math.min(215, (w - 80) / offers.length - 16);
        ch = 250;
        cx = w / 2 + (i - (offers.length - 1) / 2) * (cw + 18);
        cy = h * 0.52;
      }
      this.makeOfferCard(offer, i, cx, cy, cw, ch, portrait);
    });
  }

  private offerInfo(offer: Offer): { icon: string; name: string; desc: string; color: number; tag: string } {
    if (offer.kind === 'weapon') {
      const meta = WEAPON_META.find((m) => m.id === offer.id)!;
      return {
        icon: meta.icon,
        name: t('w_' + offer.id),
        desc: t('w_' + offer.id + '_d'),
        color: meta.color,
        tag: offer.isNew ? t('newTag') : 'Lv ' + offer.toLevel,
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
      };
    }
    if (offer.kind === 'heal') {
      return { icon: 'icon_heal', name: t('c_heal'), desc: t('c_heal_d'), color: PAL.heart, tag: '' };
    }
    return { icon: 'icon_gold', name: t('c_gold'), desc: t('c_gold_d'), color: PAL.xp, tag: '' };
  }

  private makeOfferCard(offer: Offer, idx: number, cx: number, cy: number, cw: number, ch: number, portrait: boolean): void {
    const info = this.offerInfo(offer);
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
        color: offer.isNew ? '#C06870' : '#B8924A',
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
        color: offer.isNew ? '#C06870' : '#B8924A',
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
    c.on('pointerup', () => this.chooseOffer(offer));
    this.tweens.add({ targets: c, alpha: 1, y: cy, duration: 260, delay: 90 * idx, ease: 'Cubic.easeOut' });
    this.overlay.push(c);
  }

  private pickByIndex(i: number): void {
    if (this.overlayMode !== 'levelup') return;
    const offer = this.pendingOffers[i];
    if (offer) this.chooseOffer(offer);
  }

  private chooseOffer(offer: Offer): void {
    if (this.overlayMode !== 'levelup') return;
    SFX.uiClick();
    this.closeOverlay();
    this.gs.applyOffer(offer);
    this.scene.resume('game');
  }

  // ---------- 宝箱 ----------

  private showChest(pick: WeaponId | null): void {
    this.overlayMode = 'chest';
    const w = this.scale.width;
    const h = this.scale.height;
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
        if (pick) {
          const icon = this.add.image(w / 2, h * 0.42, WEAPON_META.find((m) => m.id === pick)!.icon)
            .setScale(0).setDepth(104);
          this.overlay.push(icon);
          this.tweens.add({ targets: icon, scale: 2.4, duration: 400, ease: 'Back.easeOut' });
          label = t('evolveTag') + '！ ' + t('w_' + pick + '_e') + '\n' + t('w_' + pick + '_e_d');
        } else {
          label = t('chestGold');
        }
        const txt = this.add.text(w / 2, h * 0.58, label, {
          fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: PAL.inkCss, align: 'center',
          stroke: '#FFFFFF', strokeThickness: 5, wordWrap: { width: w - 60 },
        }).setOrigin(0.5).setDepth(104);
        this.overlay.push(txt);
        const ok = makeButton(this, w / 2, h * 0.74, 170, 52, 'OK', () => {
          this.closeOverlay();
          this.gs.applyChest(pick);
          this.scene.resume('game');
        });
        ok.setDepth(104);
        this.overlay.push(ok);
      });
    });
  }

  // ---------- 暂停 ----------

  private togglePause(): void {
    if (this.overlayMode === 'levelup' || this.overlayMode === 'chest') return;
    if (this.overlayMode === 'pause') {
      this.closeOverlay();
      this.scene.resume('game');
      return;
    }
    if (!this.gs.running) return;
    this.scene.pause('game');
    this.showPauseMenu();
  }

  private showPauseMenu(): void {
    this.overlayMode = 'pause';
    const w = this.scale.width;
    const h = this.scale.height;
    const veil = this.addVeil();
    const title = this.add.text(w / 2, h * 0.24, t('pause'), {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(101);
    const resume = makeButton(this, w / 2, h * 0.42, 230, 58, t('resume'), () => this.togglePause(), { fontSize: 22 });
    const sound = makeButton(this, w / 2, h * 0.42 + 76, 230, 50, SFX.muted ? t('soundOff') : t('soundOn'), () => {
      SFX.setMuted(!SFX.muted);
      setButtonLabel(sound, SFX.muted ? t('soundOff') : t('soundOn'));
      setButtonLabel(this.muteBtn, SFX.muted ? '🔇' : '🔊');
    }, { fontSize: 18 });
    const lang = makeButton(this, w / 2, h * 0.42 + 144, 230, 50, t('langBtn'), () => {
      toggleLang();
      this.closeOverlay();
      this.showPauseMenu();
    }, { fontSize: 18 });
    const quit = makeButton(this, w / 2, h * 0.42 + 222, 230, 50, t('quit'), () => {
      this.closeOverlay();
      this.scene.stop('game');
      this.scene.stop();
      this.game.scene.start('menu');
    }, { fontSize: 18 });
    [resume, sound, lang, quit].forEach((b) => b.setDepth(101));
    this.overlay.push(veil, title, resume, sound, lang, quit);
  }

  // ---------- 通用 ----------

  private addVeil(): Phaser.GameObjects.Rectangle {
    // 浅色主题：白色柔光遮罩而非黑色
    const veil = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xfaf5ea, 0.72)
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
