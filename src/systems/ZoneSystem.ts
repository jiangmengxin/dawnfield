// 地面区域系统：水洼减速(slow) / 星尘灼烧(burn) / 治愈(heal)
// haste 为地图机制预留（M5 接入移速修正）；区域同时是地图机制地皮的载体
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
  tick: number;
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
    let img: Phaser.GameObjects.Image;
    if (spec.effect === 'slow') {
      // 水洼：淡入的椭圆水面
      img = scene.add.image(spec.x, spec.y, 'w_puddle').setDepth(6).setScale((spec.r * 2) / 96).setAlpha(0);
      scene.tweens.add({ targets: img, alpha: 1, duration: 200 });
    } else {
      // 星尘/治愈：柔光圆斑
      img = scene.add.image(spec.x, spec.y, 'p_dot').setDepth(7)
        .setTint(spec.effect === 'heal' ? PAL.heart : PAL.mine)
        .setAlpha(0.3)
        .setScale((spec.r * 2) / 16);
    }
    this.zones.push({ img, x: spec.x, y: spec.y, r: spec.r, t: spec.dur, effect: spec.effect, dps: spec.dps ?? 0, tick: 0 });
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

  update(dt: number): void {
    const ctx = this.ctx;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;

      if (z.effect === 'burn' || z.effect === 'heal') {
        z.tick -= dt;
        z.img.setAlpha(0.2 + Math.sin(ctx.run.elapsed * 8) * 0.08);
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
            if (dx * dx + dy * dy < z.r * z.r) ctx.run.heal(z.dps * 0.25);
          }
        }
      }

      if (z.t <= 0) {
        const img = z.img;
        const dur = z.effect === 'slow' ? 300 : 250;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: dur, onComplete: () => img.destroy() });
        this.zones.splice(i, 1);
      }
    }
  }
}
