// 商店：长期永久成长（基础花圃 / 进阶工坊 / 地图精研）
import { FONT, t } from '../i18n';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import type { PowerUpId } from '../content/ids';
import { ensureMapAssets } from '../gfx/textures';
import {
  getAffordableBulkBuy,
  getNextShopUnlock,
  getShopSpent,
  getShopTotalCost,
  getUnlockedLevelCap,
  POWERUP_FX,
  powerUpPrice,
  SHOP_TABS,
  SHOP_UPGRADES,
  ShopBuyMode,
  ShopTabId,
  ShopUpgradeSpec,
} from '../content/shop';
import { Meta } from '../core/MetaState';
import { evalAchievements } from '../systems/AchievementTracker';
import { UIScene } from '../ui/UIScene';
import { ScrollPanel } from '../ui/widgets/ScrollPanel';
import { Card } from '../ui/widgets/Card';
import { Modal } from '../ui/widgets/Modal';
import { UIButton } from '../ui/widgets/UIButton';
import { Tabs } from '../ui/widgets/Tabs';
import { showToast } from '../ui/widgets/Toast';
import { THEME } from '../ui/theme';

const fmt = (key: string, vars: Record<string, string | number>): string => {
  let s = t(key);
  for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', String(v));
  return s;
};

const pct = (v: number): string => {
  const n = Math.round(v * 1000) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

export class ShopScene extends UIScene {
  private panel: ScrollPanel | null = null;
  private savedScroll: Partial<Record<ShopTabId, number>> = {};
  private activeTab: ShopTabId = 'basic';
  private selectedId: PowerUpId = 'power';

  constructor() {
    super('shop');
  }

  protected buildLayout(): void {
    const content = this.buildHeader(t('scn_shop'));
    const vp = this.vp;

    const headH = Math.max(THEME.hitMin, vp.s(52));
    const reset = new UIButton(this, 0, vp.safe.y + THEME.gapSm + headH / 2, {
      w: Math.max(THEME.hitMin, vp.s(64)), h: THEME.hitMin,
      label: t('shop_reset'), fontSize: vp.fs(15),
      onTap: () => this.openResetConfirm(),
    });
    reset.setX(vp.safe.x + vp.safe.w - THEME.gapMd - reset.width / 2);
    if (Meta.powerUpSpent() <= 0) reset.setEnabled(false);

    const summaryH = content.w >= 560 ? 98 : 122;
    this.buildSummary(content.x, content.y, content.w, summaryH);

    const tabsH = Math.max(THEME.hitMin, vp.s(42));
    const tabsY = content.y + summaryH + THEME.gapSm;
    new Tabs(this, { x: content.x, y: tabsY, w: content.w, h: tabsH }, SHOP_TABS.map((tab) => ({
      id: tab.id, label: t(tab.labelKey),
    })), (id) => {
      this.savedScroll[this.activeTab] = this.panel?.scrollY ?? 0;
      this.activeTab = id as ShopTabId;
      this.rebuild();
    }, this.activeTab);

    const bodyY = tabsY + tabsH + THEME.gapSm;
    const bodyH = Math.max(80, content.y + content.h - bodyY);
    const split = vp.w > vp.h && content.w >= 760;
    const specs = this.tabSpecs();
    if (!specs.some((s) => s.id === this.selectedId)) this.selectedId = specs[0]?.id ?? 'power';

    if (split) {
      const gap = THEME.gapMd;
      const listW = Math.min(430, Math.max(330, content.w * 0.42));
      this.panel = new ScrollPanel(this, { x: content.x, y: bodyY, w: listW, h: bodyH });
      this.buildUpgradeList(listW, bodyH, false);
      const selected = SHOP_UPGRADES.find((s) => s.id === this.selectedId) ?? specs[0];
      this.renderDetail(null, content.x + listW + gap, bodyY, content.w - listW - gap, bodyH, selected, false);
    } else {
      this.panel = new ScrollPanel(this, { x: content.x, y: bodyY, w: content.w, h: bodyH });
      this.buildUpgradeList(content.w, bodyH, true);
    }
  }

  private tabSpecs(): ShopUpgradeSpec[] {
    return SHOP_UPGRADES.filter((s) => s.tab === this.activeTab);
  }

  private buildSummary(x: number, y: number, w: number, h: number): void {
    const spent = getShopSpent(Meta.save.powerUps);
    const total = getShopTotalCost();
    const progress = total > 0 ? spent / total : 0;
    const goal = getNextShopUnlock(Meta.save);
    const g = this.add.graphics();
    const goalText = goal ? fmt(goal.key, { n: goal.n ?? '' }) : t('shop_goalDone');
    const panelY = y + 2;
    const panelH = h - 8;
    const horizontal = w >= 560;
    const padX = horizontal ? 18 : 14;
    const padY = horizontal ? 12 : 11;
    const innerX = x + padX;
    const innerY = panelY + padY;
    const innerW = w - padX * 2;
    const innerH = panelH - padY * 2;
    const r = THEME.radiusLg;

    g.fillStyle(PAL.ink, 0.055);
    g.fillRoundedRect(x + 2, panelY + 4, w, panelH, r);
    g.fillStyle(PAL.cardBg, 0.82);
    g.fillRoundedRect(x, panelY, w, panelH, r);
    g.lineStyle(1.5, PAL.cardEdge, 0.72);
    g.strokeRoundedRect(x, panelY, w, panelH, r);

    const drawProgress = (barX: number, barY: number, barW: number, barH: number): void => {
      g.fillStyle(PAL.ink, 0.08);
      g.fillRoundedRect(barX, barY, barW, barH, barH / 2);
      g.fillStyle(0xe2b452, 0.96);
      g.fillRoundedRect(barX, barY, Math.max(8, barW * progress), barH, barH / 2);
      g.lineStyle(2, PAL.cardEdge, 1);
      g.strokeRoundedRect(barX, barY, barW, barH, barH / 2);
    };

    if (horizontal) {
      const leftW = Math.min(300, Math.max(230, innerW * 0.38));
      const dividerX = innerX + leftW + 14;
      const rightX = dividerX + 18;
      const rightW = innerX + innerW - rightX;
      const topCy = innerY + 22;
      const coinImg = this.add.image(innerX, topCy, 'coin').setScale(1.18).setOrigin(0, 0.5);
      const coinText = this.add.text(innerX + coinImg.displayWidth + 9, topCy, String(Math.floor(Meta.coins)), {
        fontFamily: FONT, fontSize: this.vp.fs(22) + 'px', fontStyle: 'bold', color: '#C8902A',
        stroke: '#FFFFFF', strokeThickness: 5,
      }).setOrigin(0, 0.5);
      this.fitTextWidth(coinText, leftW - coinImg.displayWidth - 10, this.vp.fs(16));

      const invested = this.add.text(innerX, innerY + innerH - 18, fmt('shop_invested', { a: spent, b: total }), {
        fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', color: PAL.inkSoft,
      }).setOrigin(0, 0.5);
      this.fitTextWidth(invested, leftW, 11);

      g.lineStyle(1.25, PAL.cardEdge, 0.7);
      g.lineBetween(dividerX, innerY + 4, dividerX, innerY + innerH - 4);

      const progressLabel = this.add.text(rightX, topCy - 2, fmt('shop_progress', { n: pct(progress) }), {
        fontFamily: FONT, fontSize: this.vp.fs(14) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0, 0.5);
      this.fitTextWidth(progressLabel, rightW, 11);
      drawProgress(rightX, innerY + 39, rightW, 12);
      const goalLabel = this.add.text(rightX, innerY + innerH - 17, goalText, {
        fontFamily: FONT, fontSize: this.vp.fs(12) + 'px', color: PAL.inkSoft,
        wordWrap: { width: rightW, useAdvancedWrap: true },
      }).setOrigin(0, 0.5);
      this.fitTextWidth(goalLabel, rightW, 11);
      return;
    }

    const topCy = innerY + 20;
    const coinImg = this.add.image(innerX, topCy, 'coin').setScale(1.08).setOrigin(0, 0.5);
    const coinText = this.add.text(innerX + coinImg.displayWidth + 8, topCy, String(Math.floor(Meta.coins)), {
      fontFamily: FONT, fontSize: this.vp.fs(20) + 'px', fontStyle: 'bold', color: '#C8902A',
      stroke: '#FFFFFF', strokeThickness: 5,
    }).setOrigin(0, 0.5);
    const progressLabel = this.add.text(innerX + innerW, topCy, fmt('shop_progress', { n: pct(progress) }), {
      fontFamily: FONT, fontSize: this.vp.fs(12) + 'px', fontStyle: 'bold', color: PAL.inkCss,
    }).setOrigin(1, 0.5);
    this.fitTextWidth(coinText, innerW * 0.46, this.vp.fs(15));
    this.fitTextWidth(progressLabel, innerW * 0.48, 11);
    drawProgress(innerX, innerY + 41, innerW, 12);
    const invested = this.add.text(innerX, innerY + 65, fmt('shop_invested', { a: spent, b: total }), {
      fontFamily: FONT, fontSize: this.vp.fs(12) + 'px', color: PAL.inkSoft,
    }).setOrigin(0, 0);
    this.fitTextWidth(invested, innerW, 11);
    this.add.text(innerX, innerY + 87, goalText, {
      fontFamily: FONT, fontSize: this.vp.fs(12) + 'px', color: PAL.inkSoft,
      wordWrap: { width: innerW, useAdvancedWrap: true },
    }).setOrigin(0, 0);
  }

  private fitTextWidth(txt: Phaser.GameObjects.Text, maxW: number, minFs: number): void {
    let fs = Number(txt.style.fontSize.toString().replace('px', '')) || 14;
    while (fs > minFs && txt.width > maxW) {
      fs -= 1;
      txt.setFontSize(fs);
    }
  }

  private buildUpgradeList(w: number, _h: number, modalDetail: boolean): void {
    const panel = this.panel;
    if (!panel) return;
    const specs = this.tabSpecs();
    if (this.activeTab === 'maps') {
      for (const spec of specs) if (spec.mapId) ensureMapAssets(this, spec.mapId);
    }
    const fontScale = this.vp.bp === 'compact' ? 0.9 : 1;
    const rowH = this.vp.bp === 'compact' ? 82 : 92;
    const gap = THEME.gapSm;
    const pad = THEME.gapSm;
    const sectionLabel = (add: (o: Phaser.GameObjects.GameObject) => void, x: number, y: number, label: string): number => {
      const txt = this.add.text(x + 10, y, label, {
        fontFamily: FONT, fontSize: this.vp.fs(15) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0, 0);
      const g = this.add.graphics();
      g.fillStyle(0xe2b452, 1);
      g.fillRoundedRect(x, y + 2, 4, Math.max(12, txt.height - 4), 2);
      add(g);
      add(txt);
      return txt.height;
    };

    panel.setContent((add) => {
      let y = pad;
      const groups = this.groupedSpecs(specs);
      for (const group of groups) {
        y += sectionLabel(add, pad, y, group.label) + 8;
        for (const spec of group.items) {
          const lv = Meta.powerUpLevel(spec.id);
          const cap = getUnlockedLevelCap(spec, Meta.save);
          const maxed = lv >= spec.max;
          const locked = cap <= lv && !maxed;
          const price = !maxed && cap > lv ? powerUpPrice(spec, lv) : 0;
          const tag = maxed ? t('shop_max') : locked ? t('shop_locked') : fmt('shop_priceShort', { n: price });
          const desc = locked ? this.unlockText(spec, cap) : this.effectText(spec, lv);
          const card = new Card(this, pad + (w - pad * 2) / 2, y + rowH / 2, {
            w: w - pad * 2,
            h: rowH,
            layout: 'row',
            icon: spec.icon,
            title: t(spec.titleKey),
            desc,
            tag,
            tagColor: locked ? '#C06870' : '#B8924A',
            color: spec.color ?? (lv > 0 ? 0xe2b452 : undefined),
            selected: spec.id === this.selectedId,
            fontScale,
            onTap: () => {
              if (panel.dragMoved) return;
              this.selectedId = spec.id;
              if (modalDetail) this.openDetail(spec);
              else this.rebuild();
            },
          });
          add(card);
          y += rowH + gap;
        }
        y += THEME.gapSm;
      }
      return y + pad;
    });
    panel.scrollY = this.savedScroll[this.activeTab] ?? 0;
  }

  private groupedSpecs(specs: ShopUpgradeSpec[]): Array<{ label: string; items: ShopUpgradeSpec[] }> {
    if (this.activeTab === 'maps') {
      const groups: Array<{ label: string; items: ShopUpgradeSpec[] }> = [];
      for (const spec of specs) {
        if (!spec.mapId) continue;
        let group = groups.find((g) => g.label === t('map_' + spec.mapId));
        if (!group) {
          group = { label: t('map_' + spec.mapId), items: [] };
          groups.push(group);
        }
        group.items.push(spec);
      }
      return groups;
    }
    const order = this.activeTab === 'basic'
      ? ['shop_grpControl', 'shop_grpCombat', 'shop_grpEconomy']
      : ['shop_grpAdvCombat', 'shop_grpAdvSurvive', 'shop_grpAdvControl', 'shop_grpAdvResource'];
    return order.map((key) => ({ label: t(key), items: specs.filter((s) => s.groupKey === key) }))
      .filter((g) => g.items.length > 0);
  }

  private renderDetail(
    parent: Phaser.GameObjects.Container | null,
    x: number,
    y: number,
    w: number,
    h: number,
    spec: ShopUpgradeSpec,
    closeAfterBuy: boolean,
  ): void {
    const add = (go: Phaser.GameObjects.GameObject): void => {
      if (parent) parent.add(go);
    };
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 0.08);
    g.fillRoundedRect(x + 3, y + 5, w, h, THEME.radiusLg);
    g.fillStyle(PAL.cardBg, 1);
    g.fillRoundedRect(x, y, w, h, THEME.radiusLg);
    g.lineStyle(THEME.strokeCard, spec.color ?? PAL.cardEdge, 1);
    g.strokeRoundedRect(x, y, w, h, THEME.radiusLg);
    add(g);

    const innerX = x + THEME.gapMd;
    const innerW = w - THEME.gapMd * 2;
    const lv = Meta.powerUpLevel(spec.id);
    const cap = getUnlockedLevelCap(spec, Meta.save);
    const maxed = lv >= spec.max;
    const locked = cap <= lv && !maxed;

    const icon = this.add.image(innerX + 26, y + 34, spec.icon).setOrigin(0.5);
    icon.setScale(Math.min(1.25, 42 / Math.max(icon.width, icon.height)));
    add(icon);
    add(this.add.text(innerX + 58, y + 16, t(spec.titleKey), {
      fontFamily: FONT, fontSize: this.vp.fs(21) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      wordWrap: { width: innerW - 60, useAdvancedWrap: true },
    }).setOrigin(0, 0));
    add(this.add.text(innerX + 58, y + 44, fmt('shop_level', { a: lv, b: spec.max }), {
      fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', fontStyle: 'bold',
      color: locked ? '#C06870' : '#B8924A',
    }).setOrigin(0, 0));

    const bodyY = y + 82;
    const textW = innerW;
    const desc = locked ? this.unlockText(spec, cap) : t(spec.descKey);
    add(this.add.text(innerX, bodyY, desc, {
      fontFamily: FONT, fontSize: this.vp.fs(14) + 'px', color: PAL.inkSoft,
      wordWrap: { width: textW, useAdvancedWrap: true },
    }).setOrigin(0, 0));

    const curY = bodyY + 58;
    add(this.add.text(innerX, curY, t('shop_current'), {
      fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', fontStyle: 'bold', color: PAL.inkCss,
    }).setOrigin(0, 0));
    add(this.add.text(innerX, curY + 22, this.effectText(spec, lv), {
      fontFamily: FONT, fontSize: this.vp.fs(14) + 'px', color: PAL.inkSoft,
      wordWrap: { width: textW, useAdvancedWrap: true },
    }).setOrigin(0, 0));

    add(this.add.text(innerX, curY + 58, t('shop_next'), {
      fontFamily: FONT, fontSize: this.vp.fs(13) + 'px', fontStyle: 'bold', color: PAL.inkCss,
    }).setOrigin(0, 0));
    add(this.add.text(innerX, curY + 80, maxed ? t('shop_max') : locked ? this.unlockText(spec, cap) : this.effectText(spec, lv + 1), {
      fontFamily: FONT, fontSize: this.vp.fs(14) + 'px', color: maxed ? '#B8924A' : locked ? '#C06870' : PAL.inkSoft,
      wordWrap: { width: textW, useAdvancedWrap: true },
    }).setOrigin(0, 0));

    const buttonY = y + h - THEME.btnH / 2 - THEME.gapMd;
    const tightButtons = innerW < 300;
    const buttonGap = tightButtons ? 6 : THEME.gapSm;
    const bw = Math.max(64, (innerW - buttonGap * 2) / 3);
    const buttonFs = this.vp.fs(tightButtons ? 11 : 13);
    const mkBtn = (i: number, mode: ShopBuyMode, labelKey: string): UIButton => {
      const plan = getAffordableBulkBuy(spec, lv, Meta.coins, cap, mode);
      const label = fmt(labelKey, { n: plan.cost > 0 ? plan.cost : '--' });
      const b = new UIButton(this, innerX + bw / 2 + i * (bw + buttonGap), buttonY, {
        w: bw,
        h: THEME.btnH,
        label,
        fontSize: buttonFs,
        fill: i === 0 ? 0xffeec0 : PAL.cardBg,
        edge: i === 0 ? 0xe2b452 : PAL.cardEdge,
        onTap: () => this.buySpec(spec, mode, closeAfterBuy),
      });
      b.setEnabled(plan.levels > 0);
      add(b);
      return b;
    };
    mkBtn(0, 'one', 'shop_buyOne');
    mkBtn(1, 'node', 'shop_buyNode');
    mkBtn(2, 'max', 'shop_buyMax');
  }

  private openDetail(spec: ShopUpgradeSpec): void {
    Modal.open(this, {
      title: t('shop_detail'),
      w: 420,
      h: 430,
      build: (panel, inner) => {
        this.renderDetail(panel, inner.x, inner.y, inner.w, inner.h, spec, true);
      },
    });
  }

  private buySpec(spec: ShopUpgradeSpec, mode: ShopBuyMode, closeAfterBuy: boolean): void {
    const bought = Meta.buyShopUpgrade(spec, mode);
    if (bought <= 0) {
      const cap = getUnlockedLevelCap(spec, Meta.save);
      this.toast(cap <= Meta.powerUpLevel(spec.id) && Meta.powerUpLevel(spec.id) < spec.max ? this.unlockText(spec, cap) : t('shop_noCoins'), '#C06870');
      return;
    }
    SFX.coin();
    const newAch = evalAchievements({ stats: Meta.save.stats });
    this.savedScroll[this.activeTab] = this.panel?.scrollY ?? 0;
    if (closeAfterBuy) Modal.closeTop();
    this.rebuild();
    this.toast(fmt('shop_bought', { n: bought }), '#C8902A');
    for (const id of newAch) this.toast(t('achUnlocked') + ' ' + t('ach_' + id), '#C8902A');
  }

  private unlockText(spec: ShopUpgradeSpec, cap: number): string {
    const u = spec.unlock;
    if (u.kind === 'always' || cap >= spec.max) return t('shop_unlocked');
    if (u.kind === 'advanced') {
      if (cap === 0) return t('shop_reqFirstClear');
      if (cap === 1) return fmt('shop_reqClearCount', { n: 4 });
      if (cap === 2) return fmt('shop_reqClearCount', { n: 8 });
      return t('shop_reqChallenge');
    }
    const mapName = 'mapId' in u ? t('map_' + u.mapId) : '';
    if (u.kind === 'mapUnlocked') return fmt('shop_reqMapUnlock', { m: mapName });
    if (u.kind === 'mapClear') return fmt('shop_reqMapClear', { m: mapName });
    return fmt('shop_reqMapChallenge', { m: mapName });
  }

  private effectText(spec: ShopUpgradeSpec, lv: number): string {
    const n = Math.max(0, Math.min(spec.max, lv));
    if (spec.mastery === 'survey') {
      return fmt('shop_fxMapSurvey', { c: pct(POWERUP_FX.mapSurveyCoin * n), d: pct(POWERUP_FX.mapSurveyDrop * n) });
    }
    if (spec.mastery === 'tune') return fmt('shop_fxMapTune', { n: pct(POWERUP_FX.mapTuneEase * n) });
    if (spec.mastery === 'keepsake') return fmt('shop_fxMapKeepsake', { n: pct(POWERUP_FX.mapKeepsakeCoin * n) });

    switch (spec.id) {
      case 'power': return fmt('shop_fxDmg', { n: pct(POWERUP_FX.power * n) });
      case 'adv_power': return fmt('shop_fxDmg', { n: pct(POWERUP_FX.advPower * n) });
      case 'vitality': return fmt('shop_fxHp', { n: POWERUP_FX.vitality * n });
      case 'adv_vitality': return fmt('shop_fxHp', { n: POWERUP_FX.advVitality * n });
      case 'haste': return fmt('shop_fxCd', { n: pct(POWERUP_FX.haste * n) });
      case 'adv_haste': return fmt('shop_fxCd', { n: pct(POWERUP_FX.advHaste * n) });
      case 'area': return fmt('shop_fxArea', { n: pct(POWERUP_FX.area * n) });
      case 'adv_area': return fmt('shop_fxArea', { n: pct(POWERUP_FX.advArea * n) });
      case 'speed': return fmt('shop_fxSpeed', { n: pct(POWERUP_FX.speed * n) });
      case 'adv_speed': return fmt('shop_fxSpeed', { n: pct(POWERUP_FX.advSpeed * n) });
      case 'magnet': return fmt('shop_fxMagnet', { n: pct(POWERUP_FX.magnet * n) });
      case 'adv_magnet': return fmt('shop_fxMagnet', { n: pct(POWERUP_FX.advMagnet * n) });
      case 'growth': return fmt('shop_fxXp', { n: pct(POWERUP_FX.growth * n) });
      case 'adv_growth': return fmt('shop_fxXp', { n: pct(POWERUP_FX.advGrowth * n) });
      case 'greed': return fmt('shop_fxCoin', { n: pct(POWERUP_FX.greed * n) });
      case 'adv_greed': return fmt('shop_fxCoin', { n: pct(POWERUP_FX.advGreed * n) });
      case 'armor': return fmt('shop_fxArmor', { n: POWERUP_FX.armor * n });
      case 'adv_armor': return fmt('shop_fxArmor', { n: pct(POWERUP_FX.advArmor * n) });
      case 'regen': return fmt('shop_fxRegen', { n: pct(POWERUP_FX.regen * n) });
      case 'adv_regen': return fmt('shop_fxRegen', { n: pct(POWERUP_FX.advRegen * n) });
      case 'luck': return fmt('shop_fxCrit', { n: pct(POWERUP_FX.luck * n) });
      case 'adv_luck': return fmt('shop_fxCrit', { n: pct(POWERUP_FX.advLuck * n) });
      case 'fortune': return fmt('shop_fxDrop', { n: pct(POWERUP_FX.fortune * n) });
      case 'adv_fortune': return fmt('shop_fxDrop', { n: pct(POWERUP_FX.advFortune * n) });
      case 'reroll': return fmt('shop_fxReroll', { n });
      case 'banish': return fmt('shop_fxBanish', { n });
      case 'skip': return fmt('shop_fxSkip', { n });
      case 'revive': return fmt('shop_fxRevive', { n });
      case 'adv_reroll': return fmt('shop_fxReroll', { n: Math.floor(n / 2) });
      case 'adv_banish': return fmt('shop_fxBanish', { n: Math.floor(n / 2) });
      case 'adv_skip': return fmt('shop_fxSkip', { n: Math.floor(n / 2) });
      case 'adv_revive': return fmt('shop_fxRevive', { n: n >= 4 ? 1 : 0 });
      default: return t(spec.descKey);
    }
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
            this.savedScroll = {};
            this.rebuild();
          },
        }));
      },
    });
  }

  private toast(msg: string, color: string): void {
    showToast(this, msg, { color, yRatio: 0.18 });
  }
}
