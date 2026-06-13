// 结算场景：胜利（阳光+纸屑）/ 失败（柔和告别）；金币/统计入账 + 本局新成就展示
import Phaser from 'phaser';
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import { getCharacter } from '../content/characters';
import { Meta } from '../core/MetaState';
import { evalAchievements } from '../systems/AchievementTracker';
import { makeButton } from '../ui/widgets';
import { THEME } from '../ui/theme';
import { Viewport } from '../ui/Viewport';
import type { RunResult } from '../systems/context';

export class ResultScene extends Phaser.Scene {
  private data2!: RunResult;
  private confettiTimer: Phaser.Time.TimerEvent | null = null;
  private newAch: string[] = [];
  private newEndlessBest = false;

  constructor() {
    super('result');
  }

  init(data: RunResult): void {
    this.data2 = data;
    // 结算入账：金币 + 累计统计（create 可能因场景重启重复，入账只在 init 一次）
    // M11：胜利写狂暴档位、无尽局以 sec 判优写每图最佳（返回是否新纪录）
    this.newEndlessBest = Meta.recordRun(data);
    // 终局成就评估：胜利类 + 累计类（局内已解锁的由 Tracker 负责，这里只补尾）
    this.newAch = evalAchievements({
      run: {
        kills: data.kills,
        time: data.time,
        level: data.level,
        weapons: data.build.length,
        passives: data.passives, // M13：win 类成就（noPassiveClear）需要真实被动数
        evolves: data.build.filter((b) => b.evolved).length,
        maxWeapon: data.build.some((b) => b.evolved || b.level >= WEAPON_MAX_LEVEL),
        maxPassive: false, // 局内 Tracker 已评估
        eliteKills: 0, // 同上，局内已评估
        win: data.win,
        mapId: data.mapId,
        difficulty: data.diff,
        endlessCycle: data.cycle,
        // M13 结构性挑战（flawlessBoss 等 win 类只在此处看得到 win=true）
        bossNoHit: data.bossNoHit,
        firstHurtAt: data.firstHurtAt,
        firstEvolveAt: data.firstEvolveAt,
        arcana: data.arcana,
        // M15 graviticEscape（win 类，终评）
        gravSeen: data.gravSeen,
        gravHit: data.gravHit,
      },
      // recordRun 已先入账：winsByChar 含本局胜利，fiveCharWins 当场可判
      stats: { ...Meta.save.stats, charWins: Object.keys(Meta.save.stats.winsByChar).length },
      hyper: Meta.save.hyper, // recordRun 已写入本局档位，hyperAll 据此判全图
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PAL.paperCss);
    const vp = Viewport.get();
    vp.syncCamera(this);
    const resync = (): void => vp.syncCamera(this);
    this.scale.on('resize', resync);
    this.events.once('shutdown', () => this.scale.off('resize', resync));
    const r = this.data2;
    const w = vp.w;
    const h = vp.h;
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

    // M11 无尽：标题「坚守了 N 轮」（金色）；第一轮 Boss 前阵亡仍按普通失败措辞
    const endless = r.mode === 'endless' && r.cycle > 0;
    const titleText = endless
      ? t('endlessTitle').replace('{n}', String(r.cycle))
      : r.win ? t('victory') : t('defeat');
    const title = this.add.text(cx, h * 0.16, titleText, {
      fontFamily: FONT, fontSize: endless ? '40px' : '46px', fontStyle: 'bold',
      color: r.win || endless ? '#C8902A' : PAL.inkCss,
      stroke: '#FFFFFF', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(2).setScale(0.4);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: 'Back.easeOut' });

    // 副标题：地图通关词 / 失败词；狂暴局追加档位注记
    const diffNote = r.diff > 0 ? ' · ' + (r.diff === 2 ? t('diff_hyper2') : t('diff_hyper1')) : '';
    const subText = r.mode === 'endless'
      ? t('map_' + r.mapId) + diffNote
      : (r.win ? t('map_' + r.mapId + '_win') : t('defeatSub')) + (r.win ? diffNote : '');
    this.add.text(cx, h * 0.16 + 46, subText, {
      fontFamily: FONT, fontSize: '16px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(2);
    if (this.newEndlessBest) {
      this.add.text(cx, h * 0.16 + 70, '★ ' + t('newRecord'), {
        fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#C8902A',
        stroke: '#FFFFFF', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(2);
    }

    // 主角谢幕（本局角色）
    const heroTex = getCharacter(r.charId).tex;
    const hero = this.add.image(cx, h * 0.33, heroTex).setScale(1.8).setDepth(2);
    if (!r.win) hero.setAlpha(0.55).setAngle(14);
    else this.tweens.add({ targets: hero, y: '-=10', duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 统计
    const mm = String(Math.floor(r.time / 60)).padStart(2, '0');
    const ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    const rows: Array<[string, string]> = [
      [t('statTime'), mm + ':' + ss],
      // M11 无尽轮次行（仅无尽局显示）
      ...(r.mode === 'endless' ? [[t('statCycle'), String(r.cycle)] as [string, string]] : []),
      [t('statKills'), String(r.kills)],
      [t('statLevel'), String(r.level)],
      // M10 复活注记：用过才显示（金币行保持末位金色）
      ...(r.revivesUsed > 0 ? [[t('statRevives'), '♥×' + r.revivesUsed] as [string, string]] : []),
      // M12 晨露精华：满构筑后的溢出成长张数（拿到过才显示）
      ...(r.essence > 0 ? [[t('statEssence'), '✦×' + r.essence] as [string, string]] : []),
      [t('statCoins'), '+' + r.coins],
    ];
    const rowGap = 30;
    rows.forEach(([k, v], i) => {
      const y = h * 0.44 + i * rowGap;
      const gold = i === rows.length - 1;
      this.add.text(cx - 16, y, k, {
        fontFamily: FONT, fontSize: '17px', color: PAL.inkSoft,
      }).setOrigin(1, 0.5).setDepth(2);
      this.add.text(cx + 16, y, v, {
        fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: gold ? '#C8902A' : PAL.inkCss,
      }).setOrigin(0, 0.5).setDepth(2);
      if (gold) this.add.image(cx + 16 + 56, y, 'coin').setDepth(2);
    });

    // 武器构成
    const buildLabelY = h * 0.44 + rows.length * rowGap + 6;
    this.add.text(cx, buildLabelY, t('statBuild'), {
      fontFamily: FONT, fontSize: '14px', color: PAL.inkSoft,
    }).setOrigin(0.5).setDepth(2);
    const bw = r.build.length * 46;
    const iconY = buildLabelY + 30;
    r.build.forEach((b, i) => {
      const x = cx - bw / 2 + 23 + i * 46;
      const meta = WEAPON_META.find((m) => m.id === b.id)!;
      this.add.image(x, iconY, meta.icon).setDepth(2);
      this.add.text(x + 11, iconY + 11, b.evolved ? '★' : String(b.level), {
        fontFamily: FONT, fontSize: '12px', fontStyle: 'bold',
        color: b.evolved ? '#C8902A' : PAL.inkCss, stroke: '#FFFFFF', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3);
    });

    // 本局新达成的成就
    if (this.newAch.length > 0) {
      const lines = this.newAch.map((id) => '★ ' + t('achUnlocked') + ' ' + t('ach_' + id));
      this.add.text(cx, iconY + 30, lines.join('\n'), {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#C8902A', align: 'center',
        stroke: '#FFFFFF', strokeThickness: 4,
      }).setOrigin(0.5, 0).setDepth(2);
    }

    const retry = makeButton(this, cx, h * 0.82, THEME.btnW, THEME.btnH, t('retry'), () => {
      this.cleanup();
      // 同角色同图再来一局；M11 起沿用模式与狂暴档位
      this.scene.start('game', { charId: r.charId, mapId: r.mapId, mode: r.mode, diff: r.diff });
    }, { fontSize: THEME.btnFs });
    const menu = makeButton(this, cx, h * 0.82 + 68, THEME.btnW, THEME.btnH, t('quit'), () => {
      this.cleanup();
      this.scene.start('title');
    }, { fontSize: THEME.btnFs });
    retry.setDepth(2);
    menu.setDepth(2);
  }

  private cleanup(): void {
    this.confettiTimer?.remove();
    this.confettiTimer = null;
  }
}
