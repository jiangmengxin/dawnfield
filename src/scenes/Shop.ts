// 商店：永久强化（金币唯一用途）；逐级涨价，可随时全额重置返还
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { POWERUPS, PowerUpSpec, powerUpPrice } from '../content/shop';
import type { PowerUpId } from '../content/ids';
import { Meta } from '../core/MetaState';
import { evalAchievements } from '../systems/AchievementTracker';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Card } from '../ui/widgets/Card';
import { Modal } from '../ui/widgets/Modal';
import { UIButton } from '../ui/widgets/UIButton';
import { showToast } from '../ui/widgets/Toast';
import { GRID_PAD } from '../ui/widgets/CardGrid';
import { THEME } from '../ui/theme';

// M12 商店分组（纯展示层，不动数据）：局内操控 / 战斗 / 资源
const SHOP_GROUPS: Array<{ key: string; ids: PowerUpId[] }> = [
  { key: 'shop_grpControl', ids: ['revive', 'reroll', 'banish', 'skip'] },
  { key: 'shop_grpCombat', ids: ['power', 'vitality', 'haste', 'area', 'speed', 'armor', 'regen', 'luck'] },
  { key: 'shop_grpEconomy', ids: ['magnet', 'growth', 'greed', 'fortune'] },
];

export class ShopScene extends UIScene {
  private panel: ScrollPanel | null = null;
  private savedScroll = 0;

  constructor() {
    super('shop');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_shop'));
    const vp = this.vp;

    // 重置按钮移到右上角，与左上角返回按钮等宽对称——原 min(120, w*0.3) 过宽、视觉过重显突兀，
    // 改用与返回同一公式 max(hitMin, s(64))，两侧按钮镜像等大。——C4
    const headH = Math.max(THEME.hitMin, vp.s(52));
    const reset = new UIButton(this, 0, vp.safe.y + THEME.gapSm + headH / 2, {
      w: Math.max(THEME.hitMin, vp.s(64)), h: THEME.hitMin,
      label: t('shop_reset'), fontSize: vp.fs(15),
      onTap: () => this.openResetConfirm(),
    });
    reset.setX(vp.safe.x + vp.safe.w - THEME.gapMd - reset.width / 2);
    if (Meta.powerUpSpent() <= 0) reset.setEnabled(false);

    // 金币余额 + 说明行（内容区左上）：原图标↔数字仅 ~3px 太挤、说明又整宽居中与左对齐的余额抢位，
    // 整体拥挤。改为：按图标实际显示宽给数字留 8px 间距、说明左对齐与余额同列、整段拉开竖向间距。
    const rowCy = content.y + 20; // 余额行垂直中线
    const coinImg = this.add.image(content.x + 2, rowCy, 'coin').setScale(1.2).setOrigin(0, 0.5);
    this.add.text(content.x + 2 + coinImg.displayWidth + 8, rowCy, String(Math.floor(Meta.coins)), {
      fontFamily: FONT, fontSize: vp.fs(22) + 'px', fontStyle: 'bold', color: '#C8902A',
      stroke: '#FFFFFF', strokeThickness: 5,
    }).setOrigin(0, 0.5);
    const hint = this.add.text(content.x + 2, rowCy + coinImg.displayHeight / 2 + THEME.gapSm, t('shop_hint'), {
      fontFamily: FONT, fontSize: vp.fs(13) + 'px', color: PAL.inkSoft,
      align: 'left', wordWrap: { width: content.w - 4 },
    }).setOrigin(0, 0);
    const top = hint.y + hint.height + THEME.gapMd;

    this.panel = new ScrollPanel(this, { x: content.x, y: top, w: content.w, h: content.y + content.h - top });
    const panel = this.panel;
    const fontScale = vp.bp === 'compact' ? 0.9 : 1;
    const landscape = vp.w > vp.h && panel.view.w >= 620;

    // 分类小节头（重设计 C4）：金色左饰条 + 加粗墨色标题；返回其高度
    const sectionLabel = (add: (o: Phaser.GameObjects.GameObject) => void, x: number, y: number, key: string): number => {
      const txt = this.add.text(x + 10, y, t(key), {
        fontFamily: FONT, fontSize: vp.fs(15) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0, 0);
      const g = this.add.graphics();
      g.fillStyle(0xe2b452, 1);
      g.fillRoundedRect(x, y + 2, 4, Math.max(12, txt.height - 4), 2);
      add(g);
      add(txt);
      return txt.height;
    };
    const addShopCard = (add: (o: Phaser.GameObjects.GameObject) => void, x: number, y: number, w: number, h: number, spec: PowerUpSpec): void => {
      const lv = Meta.powerUpLevel(spec.id);
      const maxed = lv >= spec.max;
      const price = powerUpPrice(spec, lv);
      add(new Card(this, x + w / 2, y + h / 2, {
        w, h, layout: 'column',
        icon: spec.icon,
        title: t('pu_' + spec.id),
        desc: t('pu_' + spec.id + '_d'),
        pips: { value: lv, max: spec.max }, // 等级圆点替代 Lv 数字（更直观）
        subDesc: maxed ? t('shop_max') : t('shop_price') + ' ' + price,
        subColor: '#C8902A',
        color: lv > 0 ? 0xe2b452 : undefined,
        fontScale,
        onTap: () => { if (!panel.dragMoved) this.tryBuy(spec); },
      }));
    };

    panel.setContent((add) => {
      if (landscape) {
        // 横屏：三大组各一竖列（操控 / 战斗 / 资源）
        const colGap = 16;
        const colW = (panel.view.w - GRID_PAD.l - GRID_PAD.r - colGap * 2) / 3;
        const cardH = Math.min(190, colW * 0.74);
        let maxBottom: number = GRID_PAD.t;
        SHOP_GROUPS.forEach((grp, gi) => {
          const colX = GRID_PAD.l + gi * (colW + colGap);
          let y = GRID_PAD.t;
          y += sectionLabel(add, colX, y, grp.key) + 8;
          grp.ids.forEach((id) => {
            addShopCard(add, colX, y, colW, cardH, POWERUPS.find((s) => s.id === id)!);
            y += cardH + colGap;
          });
          maxBottom = Math.max(maxBottom, y);
        });
        return maxBottom + GRID_PAD.t;
      }
      // 竖屏：分组堆叠，组内网格
      const gap = THEME.gapSm;
      const minCellW = vp.bp === 'compact' ? 150 : 175;
      const avail = panel.view.w - GRID_PAD.l - GRID_PAD.r;
      const cols = Math.max(1, Math.floor((avail + gap) / (minCellW + gap)));
      const cw = (avail - gap * (cols - 1)) / cols;
      const ch = cw * 1.18;
      let y = GRID_PAD.t;
      for (const grp of SHOP_GROUPS) {
        y += sectionLabel(add, GRID_PAD.l, y, grp.key) + 8;
        const specs = grp.ids.map((id) => POWERUPS.find((s) => s.id === id)!);
        specs.forEach((spec, i) => {
          addShopCard(add, GRID_PAD.l + (i % cols) * (cw + gap), y + Math.floor(i / cols) * (ch + gap), cw, ch, spec);
        });
        const rows = Math.ceil(specs.length / cols);
        y += rows * ch + (rows - 1) * gap + THEME.gapMd;
      }
      return y + THEME.gapSm;
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

  /** 轻量提示横幅（余额不足 / 成就达成）——统一走公共 Toast（U3） */
  private toast(msg: string, color: string): void {
    showToast(this, msg, { color, yRatio: 0.18 });
  }
}
