// orchard 丰收落果：果实预警后坠落，伤敌并散出经验/金币。
// 策略轴：把敌群牵进落点换收益，炮台/护盾怪会逼玩家不断重定位。
import type { MechanicSpec } from '../../content/maps';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { queryOut } from '../weapons/base';
import { aroundPlayerRng, Mechanic, Patch } from './types';

const FRUIT_GOLD = 0xf0b860;
const FRUIT_RED = 0xd87868;

export class OrchardMechanic implements Mechanic {
  private t: number;
  private fruits: Patch[] = [];

  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'orchard' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) this.spawnFruit();
    }

    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      f.t -= dt;
      const k = Math.max(0, f.t / spec.warnT);
      f.img.setAlpha(0.45 + Math.sin(ctx.run.elapsed * 12) * 0.12).setScale(0.8 + (1 - k) * 0.25);
      if (f.t <= 0) {
        this.land(f);
        this.fruits.splice(i, 1);
      }
    }
  }

  private spawnFruit(): void {
    const [x, y] = aroundPlayerRng(this.ctx, 140, 330);
    const img = this.ctx.scene.add.image(x, y, 'oz_fruitwarn').setDepth(6).setAlpha(0);
    img.setDisplaySize(this.spec.r * 2, this.spec.r * 2);
    this.ctx.scene.tweens.add({ targets: img, alpha: 0.55, duration: 180 });
    this.fruits.push({ img, x, y, r: this.spec.r, t: this.spec.warnT, tick: 0 });
  }

  private land(f: Patch): void {
    const ctx = this.ctx;
    const spec = this.spec;
    let hits = 0;
    ctx.grid.queryCircle(f.x, f.y, f.r, queryOut);
    for (const e of queryOut) {
      const applied = ctx.hitEnemy(e, spec.dmg, { kb: 150, kx: e.x - f.x, ky: e.y - f.y, noHook: true });
      if (applied > 0) hits++;
    }
    ctx.spawnGem(f.x, f.y, spec.xp);
    for (let i = 0; i < Math.min(6, Math.ceil(hits / 2)); i++) {
      const a = ctx.rng() * Math.PI * 2;
      const r = 12 + ctx.rng() * f.r * 0.55;
      ctx.spawnCoin(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, spec.coin);
    }
    if (hits >= spec.dropHits) ctx.spawnMapDrop(f.x, f.y);
    ctx.fx.ring(f.x, f.y, FRUIT_GOLD, f.r / 18, 0.45);
    ctx.fx.burst(f.x, f.y, { tex: 'p_dot', color: FRUIT_RED, count: 16, speed: 220, life: 0.55, scale: 0.9, grav: 160 });
    SFX.boom(false);
    f.img.destroy();
  }

  destroy(): void {
    this.fruits.forEach((f) => f.img.destroy());
    this.fruits.length = 0;
  }
}
