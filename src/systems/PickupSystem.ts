// 拾取系统：经验光珠（磁吸/合并）+ 红心 + 宝箱掉落物
// 金币掉落 M3 在此新增
import Phaser from 'phaser';
import { DROPS } from '../content/player';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { getSettings } from '../core/settings';
import type { CombatContext, RunSystem } from './context';

interface Gem { img: Phaser.GameObjects.Image; value: number; magnet: boolean; active: boolean; born: number }
interface Pickup { img: Phaser.GameObjects.Image; kind: 'heart' | 'chest'; active: boolean }

export class PickupSystem implements RunSystem {
  private gems: Gem[] = [];
  private pickups: Pickup[] = [];
  private pickCombo = 0;
  private pickComboT = 0;

  /** onChest：踩到宝箱时回调（GameScene 接 LevelUpSystem.openChest） */
  constructor(private ctx: CombatContext, private onChest: () => void) {}

  spawnGem(x: number, y: number, value: number): void {
    const actives = this.gems.filter((g) => g.active);
    if (actives.length >= DROPS.gemMergeCap) {
      // 超量：并入最近的光珠
      let best: Gem | null = null;
      let bd = Infinity;
      for (const g of actives) {
        const d = (g.img.x - x) ** 2 + (g.img.y - y) ** 2;
        if (d < bd) { bd = d; best = g; }
      }
      if (best) {
        best.value += value;
        if (best.value >= 5) best.img.setTint(PAL.gemBig).setScale(1.25);
      }
      return;
    }
    let g = this.gems.find((i) => !i.active);
    if (!g) {
      g = { img: this.ctx.scene.add.image(0, 0, 'gem').setDepth(500), value: 0, magnet: false, active: false, born: 0 };
      this.gems.push(g);
    }
    g.active = true;
    g.magnet = false;
    g.value = value;
    g.born = this.ctx.run.elapsed;
    g.img.setPosition(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 14)
      .setVisible(true)
      .setScale(value >= 5 ? 1.25 : 0.9)
      .setTint(value >= 5 ? PAL.gemBig : PAL.gem);
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
    this.updateGems(dt);
    this.updatePickups();
  }

  private updateGems(dt: number): void {
    const ctx = this.ctx;
    this.pickComboT -= dt;
    if (this.pickComboT <= 0) this.pickCombo = 0;
    const px = ctx.player.x;
    const py = ctx.player.y;
    // 调试：全屏拾取范围
    const magnetR = getSettings().fullPickup ? 1e5 : ctx.stats.magnet;
    const m2 = magnetR * magnetR;
    for (const g of this.gems) {
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
          ctx.run.addXp(g.value);
          this.pickCombo++;
          this.pickComboT = 0.7;
          SFX.pickup(this.pickCombo);
          ctx.fx.burst(px, py - 8, { tex: 'p_dot', color: PAL.gemBig, count: 2, speed: 60, life: 0.25, scale: 0.6 });
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
