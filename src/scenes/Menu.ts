// 主菜单：晨光草甸氛围 + 开始/语言/声音
import Phaser from 'phaser';
import { FONT, getLang, onLangChange, t, toggleLang } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { makeButton, setButtonLabel } from '../ui/widgets';

export class MenuScene extends Phaser.Scene {
  private titleZh!: Phaser.GameObjects.Text;
  private titleEn!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Container;
  private langBtn!: Phaser.GameObjects.Container;
  private soundBtn!: Phaser.GameObjects.Container;
  private petalTimer!: Phaser.Time.TimerEvent;
  private decor: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PAL.paperCss);
    this.decor = [];

    // 散布草甸装饰
    this.scatterDecor();

    const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this.titleZh = this.add.text(0, 0, '晨 野', {
      fontFamily: FONT, fontSize: '72px', fontStyle: 'bold', color: PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(90,82,72,0.18)', 8);
    this.titleEn = this.add.text(0, 0, 'D A W N F I E L D', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#B8A878',
    }).setOrigin(0.5);
    this.subtitle = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '17px', color: PAL.inkSoft,
    }).setOrigin(0.5);

    // 主角飘浮
    const hero = this.add.image(0, 0, 'player').setScale(2.2);
    const heroShadow = this.add.image(0, 0, 'shadow').setScale(1.6, 1.2).setAlpha(0.7);
    this.tweens.add({ targets: hero, y: '-=12', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.existing(hero);
    this.registry.set('menuHero', [hero, heroShadow]);

    // 几只墨点小怪溜达
    for (let i = 0; i < 3; i++) {
      const tex = ['e_blob', 'e_midge', 'e_splitter'][i];
      const blob = this.add.image(0, 0, tex).setAlpha(0.9);
      blob.setData('roam', i);
      this.registry.set('menuBlob' + i, blob);
      this.tweens.add({
        targets: blob, y: '-=6', duration: 900 + i * 240, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    this.startBtn = makeButton(this, 0, 0, 240, 64, '', () => {
      SFX.unlock();
      this.scene.start('game');
    }, { fontSize: 28 });
    this.langBtn = makeButton(this, 0, 0, 150, 46, '', () => {
      SFX.unlock();
      toggleLang();
    }, { fontSize: 18 });
    this.soundBtn = makeButton(this, 0, 0, 150, 46, '', () => {
      SFX.unlock();
      SFX.setMuted(!SFX.muted);
      this.refreshTexts();
    }, { fontSize: 18 });

    this.hint = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft,
    }).setOrigin(0.5).setData('isMobile', isMobile);

    this.refreshTexts();
    onLangChange(() => {
      if (this.scene.isActive('menu')) this.refreshTexts();
    });

    // 飘落花瓣
    this.petalTimer = this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => this.spawnPetal(),
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.on('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.petalTimer.remove();
    });

    // 首次交互解锁音频（移动端）
    this.input.once('pointerdown', () => SFX.unlock());
  }

  private scatterDecor(): void {
    this.decor.forEach((d) => d.destroy());
    this.decor = [];
    const w = this.scale.width;
    const h = this.scale.height;
    const rnd = Phaser.Math.FloatBetween;
    for (let i = 0; i < 26; i++) {
      const pool = ['d_grass0', 'd_grass1', 'd_grass2', 'd_flower0', 'd_flower1', 'd_flower2', 'd_pebble0'];
      const img = this.add.image(rnd(0, w), rnd(0, h), pool[Math.floor(rnd(0, pool.length))])
        .setAlpha(0.7)
        .setScale(rnd(0.8, 1.4))
        .setDepth(0);
      this.decor.push(img);
    }
  }

  private spawnPetal(): void {
    const w = this.scale.width;
    const img = this.add.image(Math.random() * w, -20, 'p_petal')
      .setTint([PAL.petal, PAL.blade, 0xffffff][Math.floor(Math.random() * 3)])
      .setAlpha(0.8)
      .setScale(0.9 + Math.random() * 0.6)
      .setDepth(50);
    this.tweens.add({
      targets: img,
      y: this.scale.height + 30,
      x: img.x + (Math.random() - 0.5) * 200,
      rotation: (Math.random() - 0.5) * 8,
      duration: 6000 + Math.random() * 4000,
      onComplete: () => img.destroy(),
    });
  }

  private refreshTexts(): void {
    this.subtitle.setText(t('subtitle'));
    setButtonLabel(this.startBtn, t('start'));
    setButtonLabel(this.langBtn, t('langBtn'));
    setButtonLabel(this.soundBtn, SFX.muted ? t('soundOff') : t('soundOn'));
    this.hint.setText(this.hint.getData('isMobile') ? t('hintMobile') : t('hintDesktop'));
    this.titleEn.setText(getLang() === 'zh' ? 'D A W N F I E L D' : 'a morning-meadow survivors');
    this.titleZh.setText(getLang() === 'zh' ? '晨 野' : 'DAWNFIELD');
    this.layout();
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const compact = h < 620;
    this.titleZh.setPosition(cx, h * 0.2).setFontSize(compact ? 54 : 72).setScale(1);
    if (this.titleZh.width > w - 44) this.titleZh.setScale((w - 44) / this.titleZh.width);
    this.titleEn.setPosition(cx, h * 0.2 + (compact ? 44 : 58));
    this.subtitle.setPosition(cx, h * 0.2 + (compact ? 72 : 92));
    const hero = this.registry.get('menuHero') as Phaser.GameObjects.Image[] | undefined;
    if (hero) {
      hero[0].setPosition(cx, h * 0.45);
      hero[1].setPosition(cx, h * 0.45 + 34);
    }
    for (let i = 0; i < 3; i++) {
      const blob = this.registry.get('menuBlob' + i) as Phaser.GameObjects.Image | undefined;
      if (blob) blob.setPosition(cx + (i - 1) * Math.min(180, w * 0.28), h * 0.45 + 60 + (i % 2) * 20);
    }
    this.startBtn.setPosition(cx, h * 0.66);
    this.langBtn.setPosition(cx - 80, h * 0.66 + 70);
    this.soundBtn.setPosition(cx + 80, h * 0.66 + 70);
    this.hint.setPosition(cx, h - 28);
  }
}
