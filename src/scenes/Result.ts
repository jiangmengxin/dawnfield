// 结算场景：胜利（阳光+纸屑）/ 失败（柔和告别）
import Phaser from 'phaser';
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { WEAPON_META } from '../config';
import { makeButton } from '../ui/widgets';
import type { RunResult } from './Game';

export class ResultScene extends Phaser.Scene {
  private data2!: RunResult;
  private confettiTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('result');
  }

  init(data: RunResult): void {
    this.data2 = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PAL.paperCss);
    const r = this.data2;
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    if (r.win) {
      // 旋转阳光
      const rays = this.add.graphics().setDepth(0);
      rays.setPosition(cx, h * 0.2);
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2;
        rays.fillStyle(0xf7dd8a, 0.18);
        rays.slice(0, 0, Math.max(w, h), a0, a0 + 0.14);
        rays.fillPath();
      }
      this.tweens.add({ targets: rays, rotation: Math.PI * 2, duration: 60000, repeat: -1 });
      this.confettiTimer = this.time.addEvent({
        delay: 180,
        loop: true,
        callback: () => {
          const p = this.add.image(Math.random() * w, -16, 'p_confetti')
            .setTint([PAL.petal, PAL.blade, PAL.boom, PAL.mine, PAL.rain][Math.floor(Math.random() * 5)])
            .setScale(1 + Math.random()).setDepth(1);
          this.tweens.add({
            targets: p,
            y: h + 30,
            x: p.x + (Math.random() - 0.5) * 160,
            rotation: Math.random() * 10,
            duration: 3200 + Math.random() * 2400,
            onComplete: () => p.destroy(),
          });
        },
      });
    }

    const title = this.add.text(cx, h * 0.16, r.win ? t('victory') : t('defeat'), {
      fontFamily: FONT, fontSize: '46px', fontStyle: 'bold',
      color: r.win ? '#C8902A' : PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(2).setScale(0.4);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: 'Back.easeOut' });

    this.add.text(cx, h * 0.16 + 46, r.win ? t('victorySub') : t('defeatSub'), {
      fontFamily: FONT, fontSize: '16px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(2);

    // 主角谢幕
    const hero = this.add.image(cx, h * 0.33, 'player').setScale(1.8).setDepth(2);
    if (!r.win) hero.setAlpha(0.55).setAngle(14);
    else this.tweens.add({ targets: hero, y: '-=10', duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 统计
    const mm = String(Math.floor(r.time / 60)).padStart(2, '0');
    const ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    const rows: Array<[string, string]> = [
      [t('statTime'), mm + ':' + ss],
      [t('statKills'), String(r.kills)],
      [t('statLevel'), String(r.level)],
    ];
    rows.forEach(([k, v], i) => {
      const y = h * 0.45 + i * 34;
      this.add.text(cx - 16, y, k, {
        fontFamily: FONT, fontSize: '17px', color: PAL.inkSoft,
      }).setOrigin(1, 0.5).setDepth(2);
      this.add.text(cx + 16, y, v, {
        fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0, 0.5).setDepth(2);
    });

    // 武器构成
    this.add.text(cx, h * 0.45 + 3 * 34 + 12, t('statBuild'), {
      fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(2);
    const bw = r.build.length * 46;
    r.build.forEach((b, i) => {
      const x = cx - bw / 2 + 23 + i * 46;
      const y = h * 0.45 + 3 * 34 + 44;
      const meta = WEAPON_META.find((m) => m.id === b.id)!;
      this.add.image(x, y, meta.icon).setDepth(2);
      this.add.text(x + 11, y + 11, b.evolved ? '★' : String(b.level), {
        fontFamily: FONT, fontSize: '12px', fontStyle: 'bold',
        color: b.evolved ? '#C8902A' : PAL.inkCss, stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3);
    });

    const retry = makeButton(this, cx, h * 0.82, 220, 58, t('retry'), () => {
      this.cleanup();
      this.scene.start('game');
    }, { fontSize: 22 });
    const menu = makeButton(this, cx, h * 0.82 + 72, 220, 50, t('quit'), () => {
      this.cleanup();
      this.scene.start('title');
    }, { fontSize: 18 });
    retry.setDepth(2);
    menu.setDepth(2);
  }

  private cleanup(): void {
    this.confettiTimer?.remove();
    this.confettiTimer = null;
  }
}
