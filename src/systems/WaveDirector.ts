// 波次导演：按地图时间表持续刷怪 + 定点事件（包围环 / 精英 / Boss）
// 波次/事件/精英/Boss 全部来自 MapSpec（content/maps.ts），每图节奏独立调参
import type { EnemyId } from '../content/ids';
import type { WaveEvent, WavePhase } from '../content/maps';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { getSettings } from '../core/settings';
import type { CombatContext, RunSystem } from './context';
import type { EnemySystem } from './EnemySystem';

export class WaveDirector implements RunSystem {
  private spawnT = 0;
  private eventIdx = 0;

  constructor(private ctx: CombatContext, private enemies: EnemySystem) {}

  private currentWave() {
    const waves = this.ctx.map.waves;
    const t = this.ctx.run.elapsed;
    let w = waves[0];
    for (const p of waves) {
      if (t >= p.from) w = p;
    }
    return w;
  }

  /** 波次预览（M8 调试）：当前波参数 + 下一个未触发事件 */
  preview(): { wave: WavePhase; next: WaveEvent | null } {
    return { wave: this.currentWave(), next: this.ctx.map.events[this.eventIdx] ?? null };
  }

  private pickType(types: Array<[EnemyId, number]>): EnemyId {
    let sum = 0;
    for (const [, w] of types) sum += w;
    let r = Math.random() * sum;
    for (const [id, w] of types) {
      r -= w;
      if (r <= 0) return id;
    }
    return types[0][0];
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const map = ctx.map;
    const w = this.currentWave();
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = w.interval;
      const cap = Math.round(w.maxAlive * ctx.enemyCapMul);
      if (this.enemies.actives.length < cap) {
        for (let i = 0; i < w.burst; i++) {
          const [x, y] = this.enemies.edgePos();
          this.enemies.spawn(this.pickType(w.types), x, y);
        }
      }
    }
    // 定点事件
    const events = map.events;
    while (this.eventIdx < events.length && ctx.run.elapsed >= events[this.eventIdx].t) {
      const ev = events[this.eventIdx++];
      if (ev.kind === 'ring' && ev.enemy && ev.n) {
        const cam = ctx.scene.cameras.main;
        const r = Math.hypot(cam.width, cam.height) / 2 / cam.zoom + 50;
        for (let i = 0; i < ev.n; i++) {
          const a = (i / ev.n) * Math.PI * 2;
          this.enemies.spawn(ev.enemy, ctx.player.x + Math.cos(a) * r, ctx.player.y + Math.sin(a) * r);
        }
      } else if (ev.kind === 'elite') {
        const [x, y] = this.enemies.edgePos();
        this.enemies.spawn(ev.enemy ?? map.eliteId, x, y);
        emitEvent(ctx.scene.game, 'hud:warn', 'eliteWarn');
        SFX.warning();
      } else if (ev.kind === 'boss') {
        const [x, y] = this.enemies.edgePos();
        this.enemies.spawn(map.bossId, x, y);
        emitEvent(ctx.scene.game, 'hud:boss', true);
        emitEvent(ctx.scene.game, 'hud:warn', 'map_' + map.id + '_warn');
        SFX.bossRoar();
        if (getSettings().shake) ctx.scene.cameras.main.shake(500, 0.004);
      }
    }
  }
}
