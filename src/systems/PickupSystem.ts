// 拾取系统：经验光珠（磁吸/合并）+ 金币（磁吸/合并）+ 红心 + 宝箱掉落物
import Phaser from 'phaser';
import { DROPS } from '../content/player';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { getSettings } from '../core/settings';
import type { CombatContext, RunSystem } from './context';

interface Orb { img: Phaser.GameObjects.Image; value: number; magnet: boolean; active: boolean; born: number }
interface Pickup { img: Phaser.GameObjects.Image; kind: 'heart' | 'chest'; active: boolean }

export class PickupSystem implements RunSystem {
  private gems: Orb[] = [];
  private coins: Orb[] = [];
  private pickups: Pickup[] = [];
  private pickCombo = 0;
  private pickComboT = 0;
  /** 掉落总闸（复活清屏期间置 true）：统一拦截一切生成来源，含规则卡钩子（如金铃抖币） */
  suppressDrops = false;

  /** onChest：踩到宝箱时回调（GameScene 接 LevelUpSystem.openChest） */
  constructor(private ctx: CombatContext, private onChest: () => void) {}

  /** 调试信息用实体计数 */
  get gemCount(): number {
    return this.gems.reduce((n, g) => n + (g.active ? 1 : 0), 0);
  }

  get coinCount(): number {
    return this.coins.reduce((n, c) => n + (c.active ? 1 : 0), 0);
  }

  /** 池化生成光珠/金币；超量时并入最近的同类（防场面失控） */
  private spawnOrb(pool: Orb[], tex: string, mergeCap: number, x: number, y: number, value: number): void {
    const actives = pool.filter((o) => o.active);
    if (actives.length >= mergeCap) {
      let best: Orb | null = null;
      let bd = Infinity;
      for (const o of actives) {
        const d = (o.img.x - x) ** 2 + (o.img.y - y) ** 2;
        if (d < bd) { bd = d; best = o; }
      }
      if (best) {
        best.value += value;
        if (tex === 'gem' && best.value >= 5) best.img.setTint(PAL.gemBig).setScale(1.25);
        if (tex === 'coin' && best.value >= DROPS.coinBig) best.img.setScale(1.3);
      }
      return;
    }
    let o = pool.find((i) => !i.active);
    if (!o) {
      o = { img: this.ctx.scene.add.image(0, 0, tex).setDepth(500), value: 0, magnet: false, active: false, born: 0 };
      pool.push(o);
    }
    o.active = true;
    o.magnet = false;
    o.value = value;
    o.born = this.ctx.run.elapsed;
    o.img.setPosition(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 14).setVisible(true);
    if (tex === 'gem') {
      o.img.setScale(value >= 5 ? 1.25 : 0.9).setTint(value >= 5 ? PAL.gemBig : PAL.gem);
    } else {
      o.img.setScale(value >= DROPS.coinBig ? 1.3 : 1).clearTint();
    }
  }

  spawnGem(x: number, y: number, value: number): void {
    if (this.suppressDrops) return;
    this.spawnOrb(this.gems, 'gem', DROPS.gemMergeCap, x, y, value);
  }

  spawnCoin(x: number, y: number, value: number): void {
    if (this.suppressDrops) return;
    this.spawnOrb(this.coins, 'coin', DROPS.coinMergeCap, x, y, value);
  }

  magnetizeGems(x: number, y: number, r: number): void {
    const r2 = r * r;
    for (const g of this.gems) {
      if (!g.active || g.magnet) continue;
      const dx = g.img.x - x;
      const dy = g.img.y - y;
      if (dx * dx + dy * dy < r2) g.magnet = true;
    }
  }

  spawnPickup(kind: 'heart' | 'chest', x: number, y: number): void {
    if (this.suppressDrops) return;
    let p = this.pickups.find((i) => !i.active);
    if (!p) {
      p = { img: this.ctx.scene.add.image(0, 0, kind).setDepth(600), kind, active: false };
      this.pickups.push(p);
    }
    p.kind = kind;
    p.active = true;
    p.img.setTexture(kind).setPosition(x, y).setVisible(true).setScale(0);
    this.ctx.scene.tweens.add({ targets: p.img, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  update(dt: number): void {
    this.updateOrbs(dt, this.gems, 'gem');
    this.updateOrbs(dt, this.coins, 'coin');
    this.updatePickups();
  }

  private updateOrbs(dt: number, pool: Orb[], kind: 'gem' | 'coin'): void {
    const ctx = this.ctx;
    if (kind === 'gem') {
      this.pickComboT -= dt;
      if (this.pickComboT <= 0) this.pickCombo = 0;
    }
    const px = ctx.player.x;
    const py = ctx.player.y;
    // 调试：全屏拾取范围
    const magnetR = getSettings().fullPickup ? 1e5 : ctx.stats.magnet;
    const m2 = magnetR * magnetR;
    for (const g of pool) {
      if (!g.active) continue;
      const dx = px - g.img.x;
      const dy = py - g.img.y;
      const d2 = dx * dx + dy * dy;
      if (!g.magnet && d2 < m2) g.magnet = true;
      if (g.magnet) {
        const d = Math.sqrt(d2) || 1;
        const sp = 420 + Math.max(0, ctx.stats.magnet - d) * 2;
        g.img.x += (dx / d) * sp * dt;
        g.img.y += (dy / d) * sp * dt;
        if (d < 22) {
          g.active = false;
          g.img.setVisible(false);
          if (kind === 'gem') {
            ctx.run.addXp(g.value);
            this.pickCombo++;
            this.pickComboT = 0.7;
            SFX.pickup(this.pickCombo);
            ctx.fx.burst(px, py - 8, { tex: 'p_dot', color: PAL.gemBig, count: 2, speed: 60, life: 0.25, scale: 0.6 });
          } else {
            ctx.run.addCoins(g.value);
            SFX.coin();
            ctx.fx.burst(px, py - 8, { tex: 'p_star', color: PAL.chest, count: 3, speed: 70, life: 0.3, scale: 0.6 });
          }
        }
      } else {
        g.img.y += Math.sin(ctx.run.elapsed * 3 + g.born * 7) * 0.18;
      }
    }
  }

  private updatePickups(): void {
    const ctx = this.ctx;
    for (const p of this.pickups) {
      if (!p.active) continue;
      p.img.y += Math.sin(ctx.run.elapsed * 3) * 0.15;
      const dx = p.img.x - ctx.player.x;
      const dy = p.img.y - ctx.player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        p.active = false;
        p.img.setVisible(false);
        if (p.kind === 'heart') {
          ctx.run.heal(DROPS.heartHeal);
          SFX.heal();
          ctx.fx.burst(ctx.player.x, ctx.player.y, { tex: 'p_dot', color: PAL.heart, count: 8, speed: 80, life: 0.5, grav: -80 });
        } else {
          this.onChest();
        }
      }
    }
  }
}
