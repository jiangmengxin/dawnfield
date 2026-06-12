// 地面区域系统：水洼减速(slow) / 星尘灼烧(burn) / 治愈(heal) / 顺风加速(haste)
// 区域同时是地图机制地皮的载体：减速水皮(pond) / 治愈泉(grove) / 花浪顺风带(lavender)
import Phaser from 'phaser';
import { PAL } from '../gfx/palette';
import type { CombatContext, RunSystem, ZoneSpec } from './context';
import type { Enemy } from './EnemySystem';

const queryOut: Enemy[] = [];

interface Zone {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  r: number;
  t: number;
  effect: ZoneSpec['effect'];
  dps: number;
  mul: number;
  tick: number;
  affectsPlayer: boolean;
  hasTex: boolean;
}

export class ZoneSystem implements RunSystem {
  private zones: Zone[] = [];

  constructor(private ctx: CombatContext) {}

  /** 调试信息用实体计数 */
  get count(): number {
    return this.zones.length;
  }

  add(spec: ZoneSpec): void {
    const scene = this.ctx.scene;
    const hasTex = spec.tex !== undefined || spec.effect === 'slow';
    let img: Phaser.GameObjects.Image;
    if (hasTex) {
      // 水洼/水皮/泉眼/顺风带：淡入的椭圆地皮（地图机制可换贴图）
      img = scene.add.image(spec.x, spec.y, spec.tex ?? 'w_puddle').setDepth(6).setAlpha(0);
      img.setDisplaySize(spec.r * 2, spec.r * 2 * (img.height / img.width));
      scene.tweens.add({ targets: img, alpha: spec.effect === 'haste' ? 0.85 : 1, duration: 200 });
    } else {
      // 星尘/治愈：柔光圆斑
      img = scene.add.image(spec.x, spec.y, 'p_dot').setDepth(7)
        .setTint(spec.effect === 'heal' ? PAL.heart : PAL.mine)
        .setAlpha(0.3)
        .setScale((spec.r * 2) / 16);
    }
    this.zones.push({
      img, x: spec.x, y: spec.y, r: spec.r, t: spec.dur, effect: spec.effect,
      dps: spec.dps ?? 0, mul: spec.mul ?? 1, tick: 0,
      affectsPlayer: spec.affectsPlayer === true, hasTex,
    });
  }

  /** 该点是否被减速（水洼为椭圆判定：y 轴压缩一半） */
  slowAt(x: number, y: number): boolean {
    for (const z of this.zones) {
      if (z.effect !== 'slow') continue;
      const dx = x - z.x;
      const dy = y - z.y;
      if (dx * dx + dy * dy * 4 < z.r * z.r) return true;
    }
    return false;
  }

  /** 该点是否踩在「减速玩家」的水皮上（地图机制专用；武器水洼不算） */
  playerSlowAt(x: number, y: number): boolean {
    for (const z of this.zones) {
      if (z.effect !== 'slow' || !z.affectsPlayer) continue;
      const dx = x - z.x;
      const dy = y - z.y;
      if (dx * dx + dy * dy * 4 < z.r * z.r) return true;
    }
    return false;
  }

  /** 该点的顺风加速乘子（花浪阵风机制；敌我同加速），无则 1 */
  hasteMulAt(x: number, y: number): number {
    let mul = 1;
    for (const z of this.zones) {
      if (z.effect !== 'haste') continue;
      const dx = x - z.x;
      const dy = y - z.y;
      if (dx * dx + dy * dy * 4 < z.r * z.r) mul = Math.max(mul, z.mul);
    }
    return mul;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;

      if (z.effect === 'burn' || z.effect === 'heal') {
        z.tick -= dt;
        // 贴图地皮（治愈泉）保持高亮微闪；柔光圆斑走原低透明呼吸
        z.img.setAlpha(z.hasTex
          ? 0.85 + Math.sin(ctx.run.elapsed * 5) * 0.1
          : 0.2 + Math.sin(ctx.run.elapsed * 8) * 0.08);
        if (z.tick <= 0) {
          z.tick = 0.25;
          if (z.effect === 'burn') {
            ctx.grid.queryCircle(z.x, z.y, z.r, queryOut);
            for (const e of queryOut) ctx.hitEnemy(e, z.dps * 0.25, { quiet: true });
            if (Math.random() < 0.6) {
              ctx.fx.burst(z.x + (Math.random() - 0.5) * z.r, z.y + (Math.random() - 0.5) * z.r,
                { tex: 'p_star', color: PAL.mine, count: 1, speed: 20, life: 0.4, scale: 0.7 });
            }
          } else {
            const dx = ctx.player.x - z.x;
            const dy = ctx.player.y - z.y;
            if (dx * dx + dy * dy < z.r * z.r) {
              ctx.run.heal(z.dps * 0.25);
              // 治愈泉里冒小光点（仅实际站入时）
              if (z.hasTex && Math.random() < 0.7) {
                ctx.fx.burst(ctx.player.x + (Math.random() - 0.5) * 20, ctx.player.y, {
                  tex: 'p_dot', color: PAL.heart, count: 1, speed: 30, life: 0.5, scale: 0.6, alpha: 0.8,
                });
              }
            }
          }
        }
      }

      if (z.t <= 0) {
        const img = z.img;
        const dur = z.hasTex ? 300 : 250;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: dur, onComplete: () => img.destroy() });
        this.zones.splice(i, 1);
      }
    }
  }
}
