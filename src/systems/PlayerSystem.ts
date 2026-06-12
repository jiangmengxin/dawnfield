// 玩家系统：移动（InputManager）+ 弹跳动画 + 无敌帧闪烁 + 头顶血条 + 接触伤害
import { PLAYER } from '../content/player';
import { PAL } from '../gfx/palette';
import type { InputManager } from '../core/input/InputManager';
import type { CombatContext, RunSystem } from './context';
import type { Enemy } from './EnemySystem';

const queryOut: Enemy[] = [];

export class PlayerSystem implements RunSystem {
  /** 接触伤害子系统：单独注册，保持原帧序（在弹幕/区域结算之后） */
  readonly contact: RunSystem = { update: (dt: number) => this.updateTouchDamage(dt) };

  private shadow: Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Graphics;
  private bounce = 0;
  private touchT = 0;

  constructor(private ctx: CombatContext, private input: InputManager) {
    this.shadow = ctx.scene.add.image(0, 0, 'shadow').setDepth(8).setScale(0.85, 0.8);
    this.hpBar = ctx.scene.add.graphics().setDepth(1e6 + 10);
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const player = ctx.player;
    const mv = this.input.move();
    let vx = mv.x;
    let vy = mv.y;
    const len = Math.hypot(vx, vy);
    if (len > 0.01) {
      vx /= Math.max(1, len);
      vy /= Math.max(1, len);
      player.x += vx * ctx.stats.moveSpeed * dt;
      player.y += vy * ctx.stats.moveSpeed * dt;
      ctx.facing.x = vx;
      ctx.facing.y = vy;
      if (Math.abs(vx) > 0.1) player.setFlipX(vx < 0);
      this.bounce += dt * 11;
    } else {
      this.bounce += dt * 3;
    }
    const b = Math.sin(this.bounce) * (len > 0.01 ? 0.07 : 0.025);
    player.setScale(1 + b, 1 - b);
    player.setDepth(1000 + player.y * 0.01);
    this.shadow.setPosition(player.x, player.y + 15);

    // 永久强化：持续回复
    if (ctx.stats.regen > 0 && ctx.run.hp < ctx.stats.maxHp) ctx.run.heal(ctx.stats.regen * dt);

    if (ctx.run.iframeT > 0) {
      ctx.run.iframeT -= dt;
      player.setAlpha(Math.sin(ctx.run.elapsed * 40) > 0 ? 1 : 0.4);
    } else {
      player.setAlpha(1);
    }

    // 头顶血条（受伤时显示）
    this.hpBar.clear();
    if (ctx.run.hp < ctx.stats.maxHp) {
      const w = 30;
      const k = Math.max(0, ctx.run.hp / ctx.stats.maxHp);
      this.hpBar.fillStyle(PAL.hpBack, 0.9);
      this.hpBar.fillRoundedRect(player.x - w / 2, player.y - 30, w, 5, 2.5);
      this.hpBar.fillStyle(PAL.hp, 1);
      this.hpBar.fillRoundedRect(player.x - w / 2, player.y - 30, Math.max(4, w * k), 5, 2.5);
    }
  }

  private updateTouchDamage(dt: number): void {
    const ctx = this.ctx;
    this.touchT -= dt;
    if (this.touchT > 0) return;
    this.touchT = PLAYER.touchTick;
    ctx.grid.queryCircle(ctx.player.x, ctx.player.y, PLAYER.radius, queryOut);
    let worst = 0;
    for (const e of queryOut) worst = Math.max(worst, e.dmg);
    if (worst > 0) ctx.damagePlayer(worst);
  }

  /** 倒下：隐藏玩家与血条 */
  onDefeat(): void {
    this.ctx.player.setVisible(false);
    this.hpBar.clear();
  }

  destroy(): void {
    this.shadow.destroy();
    this.hpBar.destroy();
  }
}
