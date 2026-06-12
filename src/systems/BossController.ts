// 墨之王 Boss 控制：二阶段（50% 血）弹幕环 / 召唤 / 冲撞
// 数值在 content/enemies.ts 的 BOSS 表；M5 起按 BossSpec 参数化供 8 Boss 复用
import { BOSS } from '../content/enemies';
import { SFX } from '../audio/sound';
import type { CombatContext } from './context';
import type { Enemy, EnemySystem } from './EnemySystem';

export class BossController {
  private atkT = BOSS.firstAtkCd;
  private summonT = BOSS.firstSummonCd;
  private dashT = BOSS.firstDashCd;

  constructor(private ctx: CombatContext, private enemies: EnemySystem) {}

  update(e: Enemy, dt: number, nx: number, ny: number, dist: number): void {
    const phase2 = e.hp < e.maxHp * BOSS.phase2HpK;
    this.atkT -= dt;
    this.summonT -= dt;
    this.dashT -= dt;

    if (this.atkT <= 0) {
      this.atkT = phase2 ? BOSS.atkCdP2 : BOSS.atkCd;
      // 弹幕环
      const n = phase2 ? BOSS.ringNP2 : BOSS.ringN;
      const off = Math.random() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        const a = off + (k / n) * Math.PI * 2;
        this.ctx.spawnEnemyBullet({
          x: e.x, y: e.y, nx: Math.cos(a), ny: Math.sin(a),
          speed: BOSS.bulletSpeed, dmg: BOSS.bulletDmg, timeScaled: true,
        });
      }
      SFX.boom();
      e.setScale(e.baseScale * 1.12);
      this.ctx.scene.tweens.add({ targets: e, scaleX: e.baseScale, scaleY: e.baseScale, duration: 300 });
    }
    if (phase2 && this.summonT <= 0) {
      this.summonT = BOSS.summonCd;
      for (let k = 0; k < BOSS.summonN; k++) {
        const a = (k / BOSS.summonN) * Math.PI * 2;
        this.enemies.spawn(BOSS.summonId, e.x + Math.cos(a) * BOSS.summonRadius, e.y + Math.sin(a) * BOSS.summonRadius);
      }
      SFX.warning();
    }
    if (this.dashT <= 0 && dist > BOSS.dashMinDist) {
      this.dashT = phase2 ? BOSS.dashCdP2 : BOSS.dashCd;
      e.kvx = nx * BOSS.dashSpeed;
      e.kvy = ny * BOSS.dashSpeed;
      SFX.swish();
    }
  }
}
