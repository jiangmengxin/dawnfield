// hills 山风走向（M18 核心）：常驻定向风（缓慢转向），顺风移动加速、逆风减速，敌人按 knockMul 同理。
// 策略轴：路线规划——顺风打、逆风撤的成本核算。只调制主动移动（PlayerSystem/EnemySystem 读 ctx.windVec），
// 不推静止单位（与 storm 的强制推挤区分）；storm 保留为周期高潮，二者并存。
import type { MechanicSpec } from '../../content/maps';
import { HILLS } from '../../gfx/palette';
import type { CombatContext } from '../context';
import { Mechanic } from './types';

export class WindMechanic implements Mechanic {
  private angle = Math.random() * Math.PI * 2;
  private targetAngle: number;
  private turnT: number;
  private streakT = 0;
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'wind' }>) {
    this.targetAngle = this.angle;
    this.turnT = spec.turnEvery;
  }

  update(dt: number): void {
    const spec = this.spec;
    this.turnT -= dt;
    if (this.turnT <= 0) {
      this.turnT = spec.turnEvery;
      this.targetAngle = this.angle + (Math.random() - 0.5) * Math.PI; // 每周期转 ±90° 内
    }
    // 平滑转向（accel 为 lerp 速率，缓慢扫掠，玩家有时间预读风向）
    this.angle += (this.targetAngle - this.angle) * Math.min(1, dt * spec.accel);
    const w = this.ctx.windVec;
    w.x = Math.cos(this.angle) * spec.speed;
    w.y = Math.sin(this.angle) * spec.speed;
    this.spawnStreak(dt);
  }

  /** 常驻飘叶提示风向（稀疏，顺风从上风口掠过）——风向不靠文字而靠视觉读出 */
  private spawnStreak(dt: number): void {
    this.streakT -= dt;
    if (this.streakT > 0) return;
    this.streakT = 0.16;
    const ctx = this.ctx;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const cam = ctx.scene.cameras.main;
    const hw = cam.width / 2 / cam.zoom + 50;
    const hh = cam.height / 2 / cam.zoom + 50;
    const px = ctx.player.x - cos * hw + (Math.random() - 0.5) * 2 * (Math.abs(sin) * hw + Math.abs(cos) * 70);
    const py = ctx.player.y - sin * hh + (Math.random() - 0.5) * 2 * (Math.abs(cos) * hh + Math.abs(sin) * 70);
    const img = ctx.scene.add.image(px, py, 'hz_leaf')
      .setDepth(9e5)
      .setAlpha(0.55)
      .setScale(0.7 + Math.random() * 0.4)
      .setTint(HILLS.windStreak);
    const dist = hw * 2.2;
    ctx.scene.tweens.add({
      targets: img,
      x: px + cos * dist + (Math.random() - 0.5) * 80,
      y: py + sin * dist + (Math.random() - 0.5) * 80,
      rotation: (Math.random() - 0.5) * 7,
      alpha: 0.3,
      duration: 1100 + Math.random() * 600,
      ease: 'Sine.easeInOut',
      onComplete: () => img.destroy(),
    });
  }

  destroy(): void {
    const w = this.ctx.windVec;
    w.x = 0;
    w.y = 0;
  }
}
