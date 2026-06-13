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
  // M17 运动形变层：起步/急停 squash-stretch 脉冲 + 影子呼吸 + 施放 pop
  private shadowK = 1;
  private wasMoving = false;
  private pulseT = 0;
  private pulseK = 0;
  private popT = 0;
  // 角色动效帧（M17）：4 姿态钟摆步行循环（饰件连续摆动）+ 随机眨眼（_p1.._p3/_k 后缀纹理）
  private pose = 0; // 0..3
  private poseT = 0;
  private blinkIn = 1.2 + Math.random() * 2.5; // 距下次眨眼
  private blinkLeft = 0; // 眨眼剩余时长
  private curFrame = '';

  constructor(private ctx: CombatContext, private input: InputManager) {
    // 影子随角色视觉体积缩放（基准：小萤 artR=20 → 0.85）
    this.shadowK = ctx.run.char.artR / 20;
    this.shadow = ctx.scene.add.image(0, 0, 'shadow').setDepth(8).setScale(0.85 * this.shadowK, 0.8 * this.shadowK);
    this.hpBar = ctx.scene.add.graphics().setDepth(1e6 + 10);
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const player = ctx.player;
    const mv = this.input.move();
    let vx = mv.x;
    let vy = mv.y;
    const len = Math.hypot(vx, vy);
    // 地图机制减速/加速：倍率随 zone 携带（M18 解耦 kind），无 zone 时各返回 1；envSlow 为 tide 涨潮环境减速
    const slowK = ctx.playerSlowAt(player.x, player.y) * ctx.envSlow;
    const hasteK = ctx.hasteMulAt(player.x, player.y);
    if (len > 0.01) {
      vx /= Math.max(1, len);
      vy /= Math.max(1, len);
      // M18 hills 山风：沿移动方向调制（顺风加速逆风减速）；vx/vy 已归一化，dot ∈ [-strength, strength]
      const w = ctx.windVec;
      const windK = (w.x !== 0 || w.y !== 0) ? Math.max(0.5, 1 + vx * w.x + vy * w.y) : 1;
      player.x += vx * ctx.stats.moveSpeed * slowK * hasteK * windK * dt;
      player.y += vy * ctx.stats.moveSpeed * slowK * hasteK * windK * dt;
      if (slowK < 1) {
        this.rippleT -= dt;
        if (this.rippleT <= 0) {
          this.rippleT = 0.3;
          ctx.fx.ring(player.x, player.y + ctx.run.char.artR * 0.7, POND.pool, 1.4, 0.45);
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
        ctx.fx.burst(player.x - vx * 9, player.y + ctx.run.char.artR * 0.5 - vy * 6, {
          tex: tr.tex, color: tr.color, count: 1, speed: 16, life: 0.45, scale: 0.55, alpha: 0.55,
        });
      }
    } else {
      this.bounce += dt * 3;
    }
    const moving = len > 0.01;
    // 起步/急停 squash-stretch 脉冲（起步纵向拉伸，急停压扁）
    if (moving !== this.wasMoving) {
      this.wasMoving = moving;
      this.pulseT = 0.12;
      this.pulseK = moving ? 0.12 : -0.1;
    }
    let pulse = 0;
    if (this.pulseT > 0) {
      this.pulseT -= dt;
      pulse = this.pulseK * Math.max(0, this.pulseT / 0.12);
    }
    // 弹跳幅度随实际移速调制（顺风/水皮/加点都会反映在步态上）
    const spdK = moving ? Math.min(1.5, (ctx.stats.moveSpeed * slowK * hasteK) / 175) : 1;
    const b = Math.sin(this.bounce) * (moving ? 0.07 * spdK : 0.025);
    // 施放 pop（C7）：武器 fire 瞬间整体小幅放大后回落
    let pop = 1;
    if (this.popT > 0) {
      this.popT -= dt;
      pop = 1 + 0.06 * Math.max(0, this.popT / 0.12);
    }
    player.setScale((1 + b - pulse) * pop, (1 - b + pulse) * pop);
    // 朝向倾斜：向移动方向轻微前倾（lerp 过渡，停下回正）
    const targetRot = moving ? ctx.facing.x * 0.07 : 0;
    player.rotation += (targetRot - player.rotation) * Math.min(1, dt * 10);
    player.setDepth(1000 + player.y * 0.01);
    // 影子呼吸：身体弹起相位影子略收，近似离地感
    const shK = 1 - Math.max(0, b) * 0.8;
    this.shadow.setScale(0.85 * this.shadowK * shK, 0.8 * this.shadowK * shK);
    this.shadow.setPosition(player.x, player.y + ctx.run.char.artR + 1);
    this.updateFrame(dt, moving);

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
      const barY = player.y - ctx.run.char.artR - 16;
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
      this.poseT = moving ? 0.11 : 0.32; // 4 帧循环：移动 0.44s/圈，待机慢摆
      this.pose = (this.pose + 1) % 4;
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
    const key = this.ctx.run.char.tex + (this.pose > 0 ? '_p' + this.pose : '') + (this.blinkLeft > 0 ? '_k' : '');
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

  /** 武器施放 pop（M17 C7）：GameScene.castFx 节流后调用 */
  castPop(): void {
    this.popT = 0.12;
  }

  /** 倒下演出（M17 C8）：灰阶 squash 塌落后隐藏（run.running=false 后本系统停更，tween 不被覆写） */
  onDefeat(): void {
    const p = this.ctx.player;
    // 受击白闪 70ms 后会 clearTint，灰阶延后上色防被擦掉
    this.ctx.scene.time.delayedCall(80, () => {
      if (p.visible) p.setTint(0x9a9489);
    });
    this.ctx.scene.tweens.add({
      targets: p, scaleX: 1.35, scaleY: 0.12, alpha: 0, duration: 700, ease: 'Cubic.easeIn',
      onComplete: () => p.setVisible(false),
    });
    this.hpBar.clear();
  }

  destroy(): void {
    this.shadow.destroy();
    this.hpBar.destroy();
  }
}
