// 商店：永久强化（金币唯一用途）；逐级涨价，可随时全额重置返还
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { POWERUPS, PowerUpSpec, powerUpPrice } from '../content/shop';
import { Meta } from '../core/MetaState';
import { evalAchievements } from '../systems/AchievementTracker';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { buildCardGrid, CardGridItem } from '../ui/widgets/CardGrid';
import { Modal } from '../ui/widgets/Modal';
import { UIButton } from '../ui/widgets/UIButton';
import { THEME } from '../ui/theme';

export class ShopScene extends UIScene {
  private panel: ScrollPanel | null = null;
  private savedScroll = 0;

  constructor() {
    super('shop');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_shop'));
    const vp = this.vp;

    // 顶栏：金币余额（左） + 重置按钮（右）
    const barH = Math.max(THEME.hitMin, vp.s(48));
    const barCy = content.y + barH / 2;
    this.add.image(content.x + 14, barCy, 'coin').setScale(1.2);
    this.add.text(content.x + 28, barCy, String(Math.floor(Meta.coins)), {
      fontFamily: FONT, fontSize: vp.fs(22) + 'px', fontStyle: 'bold', color: '#C8902A',
      stroke: '#FFFFFF', strokeThickness: 5,
    }).setOrigin(0, 0.5);
    const resetBtn = new UIButton(this, content.x + content.w - 60, barCy, {
      w: Math.min(120, content.w * 0.3), h: Math.min(THEME.hitMin, barH),
      label: t('shop_reset'), fontSize: vp.fs(15),
      onTap: () => this.openResetConfirm(),
    });
    resetBtn.setX(content.x + content.w - resetBtn.width / 2);
    if (Meta.powerUpSpent() <= 0) resetBtn.setEnabled(false);

    // 说明行
    const hint = this.add.text(content.x + content.w / 2, content.y + barH + 4, t('shop_hint'), {
      fontFamily: FONT, fontSize: vp.fs(13) + 'px', color: PAL.inkSoft,
      align: 'center', wordWrap: { width: content.w - 24 },
    }).setOrigin(0.5, 0);
    const top = content.y + barH + 4 + hint.height + THEME.gapSm;

    this.panel = new ScrollPanel(this, { x: content.x, y: top, w: content.w, h: content.y + content.h - top });

    const fontScale = vp.bp === 'compact' ? 0.9 : 1;
    const items: CardGridItem[] = POWERUPS.map((spec) => {
      const lv = Meta.powerUpLevel(spec.id);
      const maxed = lv >= spec.max;
      const price = powerUpPrice(spec, lv);
      return {
        icon: spec.icon,
        title: t('pu_' + spec.id),
        desc: t('pu_' + spec.id + '_d') + '\n' + (maxed ? t('shop_max') : t('shop_price') + ' ' + price),
        tag: 'Lv ' + lv + '/' + spec.max,
        tagColor: maxed ? '#C8902A' : undefined,
        color: lv > 0 ? 0xe2b452 : undefined,
        fontScale,
        onTap: () => this.tryBuy(spec),
      };
    });
    buildCardGrid(this.panel, {
      items,
      minCellW: vp.bp === 'compact' ? 150 : 175,
      aspect: 1.08,
    });
    this.panel.scrollY = this.savedScroll;
  }

  private tryBuy(spec: PowerUpSpec): void {
    if (Meta.powerUpLevel(spec.id) >= spec.max) return;
    if (!Meta.buyPowerUp(spec)) {
      this.toast(t('shop_noCoins'), '#C06870');
      return;
    }
    SFX.coin();
    const newAch = evalAchievements({ stats: Meta.save.stats });
    this.savedScroll = this.panel?.scrollY ?? 0;
    this.rebuild();
    for (const id of newAch) this.toast(t('achUnlocked') + ' ' + t('ach_' + id), '#C8902A');
  }

  private openResetConfirm(): void {
    const refund = Meta.powerUpSpent();
    if (refund <= 0) return;
    const handle = Modal.open(this, {
      title: t('shop_resetTitle'),
      w: 340,
      h: 230,
      build: (panel, inner) => {
        panel.add(this.add.text(0, inner.y + 8, t('shop_resetDesc').replace('{n}', String(refund)), {
          fontFamily: FONT, fontSize: '15px', color: PAL.inkCss, align: 'center',
          wordWrap: { width: inner.w - 16 },
        }).setOrigin(0.5, 0));
        const by = inner.y + inner.h - THEME.btnH / 2 - 6;
        const bw = Math.min(140, (inner.w - THEME.gapSm) / 2);
        panel.add(new UIButton(this, -bw / 2 - THEME.gapSm / 2, by, {
          w: bw, h: THEME.btnH, label: t('ui_cancel'), fontSize: 17,
          onTap: () => handle.close(),
        }));
        panel.add(new UIButton(this, bw / 2 + THEME.gapSm / 2, by, {
          w: bw, h: THEME.btnH, label: t('ui_ok'), fontSize: 17,
          fill: 0xffeec0, edge: 0xe2b452,
          onTap: () => {
            Meta.resetPowerUps();
            SFX.coin();
            handle.close();
            this.savedScroll = 0;
            this.rebuild();
          },
        }));
      },
    });
  }

  /** 轻量提示横幅（余额不足 / 成就达成） */
  private toast(msg: string, color: string): void {
    const safe = this.vp.safe;
    const txt = this.add.text(safe.x + safe.w / 2, safe.y + safe.h * 0.18, msg, {
      fontFamily: FONT, fontSize: this.vp.fs(18) + 'px', fontStyle: 'bold', color,
      stroke: '#FFFFFF', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(600).setAlpha(0);
    this.tweens.add({
      targets: txt, alpha: 1, duration: 180,
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, delay: 1300, duration: 300,
          onComplete: () => txt.destroy(),
        });
      },
    });
  }
}
