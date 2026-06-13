// bramble 荆棘围栏（M18 核心）：刺篱成弧生长为实体墙，阻挡玩家移动（敌人穿行、弹体飞越）。
// 策略轴：空间管理——别被逼进死角；用墙错觉卡敌人施压。首个真实障碍物（PlayerSystem 推出玩家）。
// 安全红线：生成强制留 gapDeg 开口、不闭环，墙绕玩家当前位置成弧但开口朝随机向，给逃逸路径。
// 旧 brambles 扎脚地皮被吸收取代。
import type { MechanicSpec } from '../../content/maps';
import { BRAMBLE } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { Mechanic } from './types';

interface Obstacle { x: number; y: number; r: number; }
interface Wall {
  segs: Array<{ img: Phaser.GameObjects.Image; obs: Obstacle }>;
  t: number;
}

export class ThornwallMechanic implements Mechanic {
  private t: number;
  private walls: Wall[] = [];
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'thornwall' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      this.growWall();
    }
    // 墙过期：淡出并从 ctx.obstacles 移除（敌人穿行=墙不参与敌人碰撞，只在玩家侧推出）
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const wall = this.walls[i];
      wall.t -= dt;
      if (wall.t <= 0) {
        for (const s of wall.segs) {
          const img = s.img;
          ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 350, onComplete: () => img.destroy() });
          const idx = ctx.obstacles.indexOf(s.obs);
          if (idx >= 0) ctx.obstacles.splice(idx, 1);
        }
        this.walls.splice(i, 1);
      }
    }
  }

  /** 绕玩家当前位置成弧生长一道墙，留 gapDeg 开口（不闭环），开口朝随机向 */
  private growWall(): void {
    const ctx = this.ctx;
    const spec = this.spec;
    const cx = ctx.player.x;
    const cy = ctx.player.y;
    const gap = (spec.gapDeg * Math.PI) / 180;
    const span = Math.PI * 2 - gap; // 墙覆盖弧（强制留开口）
    const base = Math.random() * Math.PI * 2; // 开口朝向随机
    const segs: Wall['segs'] = [];
    for (let i = 0; i < spec.segN; i++) {
      const a = base + gap / 2 + span * (i / (spec.segN - 1));
      const x = cx + Math.cos(a) * spec.dist;
      const y = cy + Math.sin(a) * spec.dist;
      const img = ctx.scene.add.image(x, y, 'bz_thorns').setDepth(6).setAlpha(0);
      img.setDisplaySize(spec.segR * 2, spec.segR * 2 * (img.height / img.width));
      ctx.scene.tweens.add({ targets: img, alpha: 1, duration: 300, delay: i * 40 }); // 依次生长
      const obs: Obstacle = { x, y, r: spec.segR };
      ctx.obstacles.push(obs);
      segs.push({ img, obs });
    }
    this.walls.push({ segs, t: spec.dur });
    ctx.fx.ring(cx, cy, BRAMBLE.thornDecor, spec.dist / 30, 0.6);
    SFX.warning();
  }

  destroy(): void {
    for (const wall of this.walls) {
      for (const s of wall.segs) {
        s.img.destroy();
        const idx = this.ctx.obstacles.indexOf(s.obs);
        if (idx >= 0) this.ctx.obstacles.splice(idx, 1);
      }
    }
    this.walls.length = 0;
  }
}
