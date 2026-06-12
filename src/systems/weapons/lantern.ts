// 9. 暖灯笼 / 小太阳（zone：贴身暖光圈周期灼噬靠近的敌人）
import Phaser from 'phaser';
import { W_LANTERN } from '../../content/weapons';
import type { WeaponId } from '../../content/ids';
import { PAL } from '../../gfx/palette';
import type { CombatContext } from '../context';
import { Weapon, queryOut } from './base';

export class LanternWeapon extends Weapon {
  private aura: Phaser.GameObjects.Image;
  private lamp: Phaser.GameObjects.Image;
  private bob = 0;

  constructor(ctx: CombatContext, id: WeaponId) {
    super(ctx, id);
    this.aura = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_lantern_aura').setDepth(7).setAlpha(0);
    this.lamp = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_lantern').setDepth(1e6 + 4).setAlpha(0.95);
    ctx.scene.tweens.add({ targets: this.aura, alpha: 0.6, duration: 400 });
  }

  protected cooldown(): number {
    return W_LANTERN.tick;
  }

  private radius(): number {
    return W_LANTERN.radius[this.level - 1] * this.ctx.stats.area * (this.evolved ? W_LANTERN.evoRadiusMul : 1);
  }

  /** 每跳：灼噬光圈内全部敌人（进化后附带向外推力） */
  protected fire(): void {
    const ctx = this.ctx;
    const r = this.radius();
    const dmg = W_LANTERN.dmg[this.level - 1] * ctx.stats.dmg * (this.evolved ? W_LANTERN.evoDmgMul : 1);
    const kb = this.evolved ? W_LANTERN.evoKb : W_LANTERN.kb;
    ctx.grid.queryCircle(ctx.player.x, ctx.player.y, r, queryOut);
    if (queryOut.length > 0) {
      ctx.fx.ring(ctx.player.x, ctx.player.y, this.evolved ? PAL.blade : 0xf8b868, r / 42, 0.25);
    }
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x);
      ctx.hitEnemy(e, dmg, { kb, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.85 });
    }
  }

  protected tick(dt: number): void {
    const ctx = this.ctx;
    this.bob += dt * 3;
    const r = this.radius();
    // 光圈呼吸 + 跟随
    this.aura.setPosition(ctx.player.x, ctx.player.y);
    this.aura.setDisplaySize(r * 2, r * 2);
    this.aura.setAlpha((this.evolved ? 0.72 : 0.55) + Math.sin(this.bob * 2.1) * 0.08);
    // 小灯笼飘在头侧
    this.lamp.setPosition(
      ctx.player.x + (ctx.player.flipX ? -17 : 17),
      ctx.player.y - 26 + Math.sin(this.bob) * 3,
    );
    this.lamp.setDepth(1000 + ctx.player.y * 0.01 + 1);
    this.lamp.setScale(this.evolved ? 1.2 : 1);
  }

  onEvolve(): void {
    super.onEvolve();
    this.aura.setTint(0xfff0c0);
    this.ctx.fx.ring(this.ctx.player.x, this.ctx.player.y, PAL.blade, this.radius() / 42, 0.6);
  }

  destroy(): void {
    this.aura.destroy();
    this.lamp.destroy();
  }
}
