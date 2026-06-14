// snowbell 雪铃寒印：玩家踩入寒印充能，碎裂时制造减速冰面并爆发伤害。
// 策略轴：何时靠近寒印引爆，换取控场与地图专属掉落。
import type { MechanicSpec } from '../../content/maps';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { queryOut } from '../weapons/base';
import { aroundPlayerRng, Mechanic, Patch } from './types';

const FROST = 0xb8dff0;
const FROST_DEEP = 0x6ea8c8;

export class FrostsealMechanic implements Mechanic {
  private t: number;
  private seals: Patch[] = [];

  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'frostseal' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) this.spawnSeal();
    }

    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.seals.length - 1; i >= 0; i--) {
      const s = this.seals[i];
      s.t -= dt;
      const inside = (px - s.x) ** 2 + (py - s.y) ** 2 < s.r * s.r;
      if (inside) s.tick += dt;
      else s.tick = Math.max(0, s.tick - dt * 0.7);
      const k = Math.min(1, s.tick / spec.chargeT);
      s.img.setAlpha(0.45 + k * 0.4 + Math.sin(ctx.run.elapsed * 6) * 0.08).setTint(k > 0.75 ? 0xffffff : FROST);
      s.img.setScale(0.82 + k * 0.22);
      if (s.tick >= spec.chargeT) {
        this.shatter(s);
        this.seals.splice(i, 1);
      } else if (s.t <= 0) {
        this.fade(i);
      }
    }
  }

  private spawnSeal(): void {
    const [x, y] = aroundPlayerRng(this.ctx, 120, 310);
    const img = this.ctx.scene.add.image(x, y, 'wz_seal').setDepth(6).setAlpha(0).setScale(0.82);
    img.setDisplaySize(this.spec.r * 2, this.spec.r * 2);
    this.ctx.scene.tweens.add({ targets: img, alpha: 0.5, duration: 250 });
    this.seals.push({ img, x, y, r: this.spec.r, t: this.spec.dur, tick: 0 });
    this.ctx.fx.ring(x, y, FROST, this.spec.r / 28, 0.45);
  }

  private shatter(s: Patch): void {
    const ctx = this.ctx;
    const spec = this.spec;
    let hits = 0;
    ctx.addZone({ x: s.x, y: s.y, r: s.r * 1.08, dur: 5, effect: 'slow', mul: spec.slowMul, affectsPlayer: true, tex: 'wz_frost' });
    ctx.grid.queryCircle(s.x, s.y, s.r * 1.2, queryOut);
    for (const e of queryOut) {
      const applied = ctx.hitEnemy(e, spec.dmg, { kb: 120, kx: e.x - s.x, ky: e.y - s.y, noHook: true });
      if (applied > 0) hits++;
    }
    if (hits > 0) ctx.spawnMapDrop(s.x, s.y);
    ctx.fx.ring(s.x, s.y, FROST_DEEP, s.r / 18, 0.55);
    ctx.fx.burst(s.x, s.y, { tex: 'p_star', color: FROST, count: 18, speed: 190, life: 0.55, scale: 0.8 });
    SFX.chime();
    s.img.destroy();
  }

  private fade(i: number): void {
    const img = this.seals[i].img;
    this.ctx.scene.tweens.add({ targets: img, alpha: 0, scale: 0.55, duration: 250, onComplete: () => img.destroy() });
    this.seals.splice(i, 1);
  }

  destroy(): void {
    this.seals.forEach((s) => s.img.destroy());
    this.seals.length = 0;
  }
}
