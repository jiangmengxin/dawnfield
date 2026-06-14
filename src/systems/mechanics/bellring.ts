// clockwork 晨钟节拍：钟印倒计时，踩中节拍释放友方钟波；错过则受到小额伤害。
// 策略轴：读拍踩点，在密集敌群中选择是否冒险拿钟波。
import type { MechanicSpec } from '../../content/maps';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { queryOut } from '../weapons/base';
import { aroundPlayerRng, Mechanic, Patch } from './types';

const BELL = 0xf0cc78;
const BELL_DEEP = 0xb88034;

export class BellringMechanic implements Mechanic {
  private t: number;
  private marks: Patch[] = [];

  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'bellring' }>) {
    this.t = spec.first;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = spec.interval;
      for (let i = 0; i < spec.count; i++) this.spawnMark();
    }

    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i];
      m.t -= dt;
      const k = Math.max(0, m.t / spec.warnT);
      const pulse = 0.85 + (1 - k) * 0.3 + Math.sin(ctx.run.elapsed * 10) * 0.06;
      m.img.setScale(pulse).setAlpha(0.5 + (1 - k) * 0.35);
      if (m.t <= 0) {
        this.resolve(m);
        this.marks.splice(i, 1);
      }
    }
  }

  private spawnMark(): void {
    const [x, y] = aroundPlayerRng(this.ctx, 110, 280);
    const img = this.ctx.scene.add.image(x, y, 'ck_clock').setDepth(6).setAlpha(0).setScale(0.85);
    img.setDisplaySize(this.spec.r * 2, this.spec.r * 2);
    this.ctx.scene.tweens.add({ targets: img, alpha: 0.55, duration: 180 });
    this.marks.push({ img, x, y, r: this.spec.r, t: this.spec.warnT, tick: 0 });
  }

  private resolve(m: Patch): void {
    const ctx = this.ctx;
    const spec = this.spec;
    const inside = (ctx.player.x - m.x) ** 2 + (ctx.player.y - m.y) ** 2 < m.r * m.r;
    if (inside) {
      let hits = 0;
      ctx.grid.queryCircle(m.x, m.y, m.r * 2.5, queryOut);
      for (const e of queryOut) {
        const applied = ctx.hitEnemy(e, spec.dmg, { kb: 240, kx: e.x - m.x, ky: e.y - m.y, noHook: true });
        if (applied > 0) hits++;
      }
      if (hits > 0) ctx.spawnMapDrop(m.x, m.y);
      ctx.spawnGem(m.x, m.y, 10);
      ctx.fx.ring(m.x, m.y, BELL, m.r / 16, 0.5);
      ctx.fx.ring(m.x, m.y, BELL_DEEP, m.r / 10, 0.8);
      ctx.fx.burst(m.x, m.y, { tex: 'p_star', color: BELL, count: 16, speed: 210, life: 0.55, scale: 0.8 });
      SFX.chime();
    } else {
      ctx.damagePlayer(spec.missDmg);
      ctx.fx.ring(m.x, m.y, BELL_DEEP, m.r / 22, 0.35);
    }
    m.img.destroy();
  }

  destroy(): void {
    this.marks.forEach((m) => m.img.destroy());
    this.marks.length = 0;
  }
}
