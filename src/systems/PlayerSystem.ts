// 玩家系统：移动（InputManager）+ 弹跳动画 + 无敌帧闪烁 + 头顶血条 + 接触伤害
import { PLAYER } from '../content/player';
import { PAL, POND } from '../gfx/palette';
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
  private trailT = 0;
  private rippleT = 0; // 水皮减速时的涟漪反馈节流
  // 角色动效帧：姿态 A/B 交替（饰件摆动）+ 随机眨眼（_p1/_k 后缀纹理）
  private pose: 0 | 1 = 0;
  private poseT = 0;
  private blinkIn = 1.2 + Math.random() * 2.5; // 距下次眨眼
  private blinkLeft = 0; // 眨眼剩余时长
  private curFrame = '';

  constructor(private ctx: CombatContext, private input: InputManager) {
    // 影子随角色体积缩放（基准：小萤 r=14 → 0.85）
    const k = ctx.run.char.radius / 14;
    this.shadow = ctx.scene.add.image(0, 0, 'shadow').setDepth(8).setScale(0.85 * k, 0.8 * k);
    this.hpBar = ctx.scene.add.graphics().setDepth(1e6 + 10);
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const player = ctx.player;
    const mv = this.input.move();
    let vx = mv.x;
    let vy = mv.y;
    const len = Math.hypot(vx, vy);
    // 地图机制水皮：玩家也减速（武器水洼不影响玩家）；顺风带：玩家也加速
    const mech = ctx.map.mechanic;
    const slowK = mech?.kind === 'puddles' && ctx.playerSlowAt(player.x, player.y) ? mech.playerSlow : 1;
    const hasteK = mech?.kind === 'gusts' ? ctx.hasteMulAt(player.x, player.y) : 1;
    if (len > 0.01) {
      vx /= Math.max(1, len);
      vy /= Math.max(1, len);
      player.x += vx * ctx.stats.moveSpeed * slowK * hasteK * dt;
      player.y += vy * ctx.stats.moveSpeed * slowK * hasteK * dt;
      if (slowK < 1) {
        this.rippleT -= dt;
        if (this.rippleT <= 0) {
          this.rippleT = 0.3;
          ctx.fx.ring(player.x, player.y + ctx.run.char.radius * 0.7, POND.pool, 1.4, 0.45);
        }
      }
      ctx.facing.x = vx;
      ctx.facing.y = vy;
      if (Math.abs(vx) > 0.1) player.setFlipX(vx < 0);
      this.bounce += dt * 11;
      // 角色专属移动拖尾（主角辨识度：敌人无拖尾）
      this.trailT -= dt;
      if (this.trailT <= 0) {
        const tr = ctx.run.char.trail;
        this.trailT = tr.every;
        ctx.fx.burst(player.x - vx * 9, player.y + ctx.run.char.radius * 0.5 - vy * 6, {
          tex: tr.tex, color: tr.color, count: 1, speed: 16, life: 0.45, scale: 0.55, alpha: 0.55,
        });
      }
    } else {
      this.bounce += dt * 3;
    }
    const b = Math.sin(this.bounce) * (len > 0.01 ? 0.07 : 0.025);
    player.setScale(1 + b, 1 - b);
    player.setDepth(1000 + player.y * 0.01);
    this.shadow.setPosition(player.x, player.y + ctx.run.char.radius + 1);
    this.updateFrame(dt, len > 0.01);

    // 永久强化：持续回复
    if (ctx.stats.regen > 0 && ctx.run.hp < ctx.stats.maxHp) ctx.run.heal(ctx.stats.regen * dt);

    if (ctx.run.iframeT > 0) {
      ctx.run.iframeT -= dt;
      player.setAlpha(Math.sin(ctx.run.elapsed * 40) > 0 ? 1 : 0.4);
    } else {
      player.setAlpha(1);
    }

    // 头顶血条（受伤时显示）；纵向位置随体积上移
    this.hpBar.clear();
    if (ctx.run.hp < ctx.stats.maxHp) {
      const w = 30;
      const k = Math.max(0, ctx.run.hp / ctx.stats.maxHp);
      const barY = player.y - ctx.run.char.radius - 16;
      this.hpBar.fillStyle(PAL.hpBack, 0.9);
      this.hpBar.fillRoundedRect(player.x - w / 2, barY, w, 5, 2.5);
      this.hpBar.fillStyle(PAL.hp, 1);
      this.hpBar.fillRoundedRect(player.x - w / 2, barY, Math.max(4, w * k), 5, 2.5);
    }
  }

  /** 动效帧切换：移动时饰件快摆（萤翅扇动/静电蹦跳/绒毛拂动…），停下慢摆；随机眨眼（困倦角色反而睁眼偷看） */
  private updateFrame(dt: number, moving: boolean): void {
    this.poseT -= dt;
    if (this.poseT <= 0) {
      this.poseT = moving ? 0.22 : 0.5;
      this.pose = this.pose === 0 ? 1 : 0;
    }
    if (this.blinkLeft > 0) {
      this.blinkLeft -= dt;
    } else {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) {
        this.blinkLeft = 0.16;
        this.blinkIn = 1.6 + Math.random() * 2.8;
      }
    }
    const key = this.ctx.run.char.tex + (this.pose === 1 ? '_p1' : '') + (this.blinkLeft > 0 ? '_k' : '');
    if (key !== this.curFrame) {
      this.curFrame = key;
      this.ctx.player.setTexture(key);
    }
  }

  private updateTouchDamage(dt: number): void {
    const ctx = this.ctx;
    this.touchT -= dt;
    if (this.touchT > 0) return;
    this.touchT = PLAYER.touchTick;
    // 体积即碰撞：大块头更容易被蹭到
    ctx.grid.queryCircle(ctx.player.x, ctx.player.y, ctx.run.char.radius, queryOut);
    let worst = 0;
    let src: Enemy | undefined;
    for (const e of queryOut) {
      if (e.dmg > worst) {
        worst = e.dmg;
        src = e;
      }
    }
    if (worst > 0) ctx.damagePlayer(worst, src);
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
