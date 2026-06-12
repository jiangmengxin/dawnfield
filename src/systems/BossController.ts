// Boss 技能控制器：按 BossSpec 数据驱动（content/bosses.ts 配装）
// 四个技能模块：弹幕环 / 瞄准扇射 / 召唤 / 冲撞；二阶段（血量阈值）切换节奏与弹量
import type { BossRing, BossSpec, BossSpread } from '../content/bosses';
import { SFX } from '../audio/sound';
import type { CombatContext } from './context';
import type { Enemy, EnemySystem } from './EnemySystem';

export class BossController {
  private ringT: number;
  private spreadT: number;
  private summonT: number;
  private dashT: number;

  constructor(private ctx: CombatContext, private enemies: EnemySystem, private spec: BossSpec) {
    this.ringT = spec.ring?.firstCd ?? Infinity;
    this.spreadT = spec.spread?.firstCd ?? Infinity;
    this.summonT = spec.summon?.firstCd ?? Infinity;
    this.dashT = spec.dash?.firstCd ?? Infinity;
  }

  update(e: Enemy, dt: number, nx: number, ny: number, dist: number): void {
    const s = this.spec;
    const phase2 = e.hp < e.maxHp * s.phase2HpK;
    this.ringT -= dt;
    this.spreadT -= dt;
    this.summonT -= dt;
    this.dashT -= dt;

    if (s.ring && this.ringT <= 0) {
      this.ringT = phase2 ? s.ring.cdP2 : s.ring.cd;
      if (!s.ring.p2Only || phase2) this.fireRing(e, s.ring, phase2);
    }
    if (s.spread && this.spreadT <= 0) {
      this.spreadT = phase2 ? s.spread.cdP2 : s.spread.cd;
      if (!s.spread.p2Only || phase2) this.fireSpread(e, s.spread, nx, ny);
    }
    if (s.summon && this.summonT <= 0) {
      this.summonT = s.summon.cd;
      if (!s.summon.p2Only || phase2) {
        for (let k = 0; k < s.summon.n; k++) {
          const a = (k / s.summon.n) * Math.PI * 2;
          this.enemies.spawn(s.summon.id, e.x + Math.cos(a) * s.summon.radius, e.y + Math.sin(a) * s.summon.radius);
        }
        SFX.warning();
      }
    }
    if (s.dash && this.dashT <= 0 && dist > s.dash.minDist) {
      this.dashT = phase2 ? s.dash.cdP2 : s.dash.cd;
      e.kvx = nx * s.dash.speed;
      e.kvy = ny * s.dash.speed;
      SFX.swish();
    }
  }

  private fireRing(e: Enemy, ring: BossRing, phase2: boolean): void {
    const n = phase2 ? ring.nP2 : ring.n;
    const off = Math.random() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const a = off + (k / n) * Math.PI * 2;
      this.ctx.spawnEnemyBullet({
        x: e.x, y: e.y, nx: Math.cos(a), ny: Math.sin(a),
        speed: ring.speed, dmg: ring.dmg, timeScaled: true, tex: ring.tex,
      });
    }
    SFX.boom();
    this.pump(e);
  }

  private fireSpread(e: Enemy, sp: BossSpread, nx: number, ny: number): void {
    const base = Math.atan2(ny, nx);
    for (let k = 0; k < sp.n; k++) {
      const a = base + (sp.n === 1 ? 0 : (k / (sp.n - 1) - 0.5) * sp.arc);
      this.ctx.spawnEnemyBullet({
        x: e.x, y: e.y, nx: Math.cos(a), ny: Math.sin(a),
        speed: sp.speed, dmg: sp.dmg, timeScaled: true, tex: sp.tex,
      });
    }
    SFX.zap();
    this.pump(e);
  }

  /** 施放鼓胀回弹（攻击前摇视觉） */
  private pump(e: Enemy): void {
    e.setScale(e.baseScale * 1.12);
    this.ctx.scene.tweens.add({ targets: e, scaleX: e.baseScale, scaleY: e.baseScale, duration: 300 });
  }
}
