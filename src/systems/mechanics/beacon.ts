// summit 破晓烽台（M18 核心）：晨光柱可累计停留点燃，点燃后永久留存（上限 maxLit）成回血/灼烧据点网；
// 每点燃 1 座全场敌人生成 HP −enemyHpPer。策略轴：宏观目标——推进点灯织网 vs 苟着刷怪。
// dawnpillar 晨光柱被升级吸收（点燃=永久据点 + 全场 HP 衰减，不再是临时安全岛）。
import type { MechanicSpec } from '../../content/maps';
import { SUMMIT } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { emitEvent } from '../../core/events';
import type { CombatContext } from '../context';
import { queryOut } from '../weapons/base';
import { aroundPlayer, Mechanic } from './types';

interface Pillar {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  r: number;
  life: number; // 未点燃寿命（点燃后置 Infinity）
  ignite: number; // 累计点燃进度
  lit: boolean;
  burnT: number; // 灼烧节流
}

export class BeaconMechanic implements Mechanic {
  private t: number;
  private pillars: Pillar[] = [];
  private litCount = 0;
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'beacon' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    // 周期生成未点燃晨光柱（点满 maxLit 后停生，未点燃柱不超过 2 座防刷屏）
    this.t -= dt;
    const unlit = this.pillars.filter((p) => !p.lit).length;
    if (this.t <= 0 && this.litCount < spec.maxLit && unlit < 2) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) {
        const [x, y] = aroundPlayer(ctx, 130, 300);
        const img = ctx.scene.add.image(x, y, 'sz_pillar').setDepth(6).setAlpha(0);
        img.setDisplaySize(spec.r * 2, spec.r * 2 * (img.height / img.width));
        ctx.scene.tweens.add({ targets: img, alpha: 0.6, duration: 350 });
        this.pillars.push({ img, x, y, r: spec.r, life: 26, ignite: 0, lit: false, burnT: 0 });
        ctx.fx.ring(x, y, SUMMIT.pillarDeep, 2.4, 0.6);
      }
    }
    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const p = this.pillars[i];
      const inside = (px - p.x) ** 2 + (py - p.y) ** 2 * 4 < p.r * p.r;
      if (!p.lit) {
        // 累计点燃（按在场停留秒数，无需静止；离开缓慢回落）
        if (inside) {
          p.ignite += dt;
          if (Math.random() < dt * 8) {
            ctx.fx.burst(px + (Math.random() - 0.5) * 24, py, { tex: 'p_star', color: SUMMIT.pillar, count: 1, speed: 30, life: 0.5, scale: 0.6, alpha: 0.85 });
          }
        } else {
          p.ignite = Math.max(0, p.ignite - dt * 0.5);
        }
        const k = Math.min(1, p.ignite / spec.igniteT);
        p.img.setAlpha(0.55 + k * 0.4);
        if (p.ignite >= spec.igniteT && this.litCount < spec.maxLit) {
          this.ignitePillar(p);
        } else {
          p.life -= dt;
          if (p.life <= 0) {
            const img = p.img;
            ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 350, onComplete: () => img.destroy() });
            this.pillars.splice(i, 1);
          }
        }
      } else {
        // 已点燃据点：永久回血 + 灼烧柱中敌人（同 dawnpillar）
        p.img.setAlpha(0.85 + Math.sin(ctx.run.elapsed * 5) * 0.1);
        if (inside) ctx.run.heal(spec.hps * dt);
        p.burnT -= dt;
        if (p.burnT <= 0) {
          p.burnT = 0.25;
          ctx.grid.queryCircle(p.x, p.y, p.r, queryOut);
          for (const e of queryOut) ctx.hitEnemy(e, spec.dps * 0.25, { quiet: true });
        }
      }
    }
  }

  private ignitePillar(p: Pillar): void {
    const ctx = this.ctx;
    p.lit = true;
    p.life = Infinity;
    this.litCount++;
    ctx.setEnemyHpMul(Math.max(0.5, 1 - this.litCount * this.spec.enemyHpPer));
    p.img.setTint(0xfff2c0);
    ctx.fx.ring(p.x, p.y, SUMMIT.pillar, 5, 0.8);
    ctx.fx.ring(p.x, p.y, 0xfff2c0, 7, 1);
    ctx.fx.burst(p.x, p.y, { tex: 'p_star', color: SUMMIT.pillar, count: 20, speed: 220, life: 0.8, scale: 1.1, spin: true });
    SFX.heal();
    emitEvent(ctx.scene.game, 'hud:warn', 'beaconLit');
  }

  destroy(): void {
    this.ctx.setEnemyHpMul(1);
    this.pillars.forEach((p) => p.img.destroy());
    this.pillars.length = 0;
  }
}
