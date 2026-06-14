// mirage 彩镜折光：站在镜场内蓄能，满能后折射光束打击附近敌人。
// 策略轴：在危险镜场里贪充能，换取定点爆发和专属掉落。
import type { MechanicSpec } from '../../content/maps';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { queryOut } from '../weapons/base';
import { aroundPlayerRng, Mechanic, Patch } from './types';

const PRISM = 0xd8c8f0;
const PRISM_DEEP = 0x9a7fd0;

export class PrismfieldMechanic implements Mechanic {
  private t: number;
  private fields: Patch[] = [];

  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'prismfield' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) this.spawnField();
    }

    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      f.t -= dt;
      const inside = (px - f.x) ** 2 + (py - f.y) ** 2 < f.r * f.r;
      if (inside) f.tick += dt;
      else f.tick = Math.max(0, f.tick - dt * 0.45);
      const k = Math.min(1, f.tick / spec.chargeT);
      f.img.setAlpha(0.28 + k * 0.48 + Math.sin(ctx.run.elapsed * 4.5) * 0.06).setScale(0.9 + k * 0.16);
      if (inside && ctx.rng() < dt * 5) {
        ctx.fx.burst(px + (ctx.rng() - 0.5) * 34, py, { tex: 'p_star', color: PRISM, count: 1, speed: 34, life: 0.45, scale: 0.55, alpha: 0.85 });
      }
      if (f.tick >= spec.chargeT) {
        this.refract(f);
        this.fields.splice(i, 1);
      } else if (f.t <= 0) {
        this.fade(i);
      }
    }
  }

  private spawnField(): void {
    const [x, y] = aroundPlayerRng(this.ctx, 110, 300);
    const img = this.ctx.scene.add.image(x, y, 'mg_prismfield').setDepth(6).setAlpha(0).setScale(0.9);
    img.setDisplaySize(this.spec.r * 2, this.spec.r * 2);
    this.ctx.scene.tweens.add({ targets: img, alpha: 0.32, duration: 250 });
    this.fields.push({ img, x, y, r: this.spec.r, t: this.spec.dur, tick: 0 });
  }

  private refract(f: Patch): void {
    const ctx = this.ctx;
    const spec = this.spec;
    ctx.grid.queryCircle(f.x, f.y, f.r * 3.2, queryOut);
    queryOut.sort((a, b) => ((a.x - f.x) ** 2 + (a.y - f.y) ** 2) - ((b.x - f.x) ** 2 + (b.y - f.y) ** 2));
    let hits = 0;
    for (const e of queryOut.slice(0, spec.beams)) {
      if (!e.active || e.dying) continue;
      const applied = ctx.hitEnemy(e, spec.dmg, { kb: 90, kx: e.x - f.x, ky: e.y - f.y, noHook: true });
      if (applied <= 0) continue;
      hits++;
      const line = ctx.scene.add.line(0, 0, f.x, f.y, e.x, e.y, PRISM_DEEP, 0.45).setOrigin(0, 0).setDepth(950);
      ctx.scene.tweens.add({ targets: line, alpha: 0, duration: 180, onComplete: () => line.destroy() });
      ctx.fx.burst(e.x, e.y, { tex: 'p_star', color: PRISM, count: 3, speed: 80, life: 0.35, scale: 0.6 });
    }
    if (hits > 0) ctx.spawnMapDrop(f.x, f.y);
    ctx.fx.ring(f.x, f.y, PRISM, f.r / 18, 0.55);
    SFX.chime();
    f.img.destroy();
  }

  private fade(i: number): void {
    const img = this.fields[i].img;
    this.ctx.scene.tweens.add({ targets: img, alpha: 0, scale: 0.6, duration: 250, onComplete: () => img.destroy() });
    this.fields.splice(i, 1);
  }

  destroy(): void {
    this.fields.forEach((f) => f.img.destroy());
    this.fields.length = 0;
  }
}
