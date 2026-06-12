// 敌方弹幕系统：池化墨弹（参数化，供喷喷与 8 个 Boss 复用）
import Phaser from 'phaser';
import { dmgScale } from '../content/enemies';
import type { CombatContext, EnemyBulletSpec, RunSystem } from './context';

interface Bullet {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  timeScaled: boolean;
  active: boolean;
}

export class ProjectileSystem implements RunSystem {
  private bullets: Bullet[] = [];

  constructor(private ctx: CombatContext) {}

  /** 调试信息用实体计数 */
  get activeCount(): number {
    return this.bullets.reduce((n, b) => n + (b.active ? 1 : 0), 0);
  }

  /** 清除全部在场敌方弹体（M10 复活清屏脉冲） */
  clearAll(): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.active = false;
      b.img.setVisible(false);
    }
  }

  spawn(spec: EnemyBulletSpec): void {
    let b = this.bullets.find((i) => !i.active);
    if (!b) {
      b = {
        img: this.ctx.scene.add.image(0, 0, 'inkball').setDepth(1e5),
        vx: 0, vy: 0, life: 0, dmg: 0, timeScaled: false, active: false,
      };
      this.bullets.push(b);
    }
    b.active = true;
    b.img.setTexture(spec.tex ?? 'inkball').setPosition(spec.x, spec.y).setVisible(true);
    b.vx = spec.nx * spec.speed;
    b.vy = spec.ny * spec.speed;
    b.life = spec.life ?? 5;
    b.dmg = spec.dmg;
    b.timeScaled = spec.timeScaled ?? false;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    // 倍速穿隧细化：effDt 超过 1/30 时分两半步推进+判定（2x 下快弹不隔帧穿过玩家）
    const sub = dt > 1 / 30 ? 2 : 1;
    const h = dt / sub;
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.life -= dt;
      b.img.rotation += dt * 4;
      for (let s = 0; s < sub && b.life > 0; s++) {
        b.img.x += b.vx * h;
        b.img.y += b.vy * h;
        const dx = b.img.x - ctx.player.x;
        const dy = b.img.y - ctx.player.y;
        if (dx * dx + dy * dy < 18 * 18) {
          ctx.damagePlayer(b.dmg * (b.timeScaled ? dmgScale((ctx.run.elapsed / 60) * ctx.map.timeK) : 1));
          b.life = 0;
        }
      }
      if (b.life <= 0) {
        b.active = false;
        b.img.setVisible(false);
      }
    }
  }
}
