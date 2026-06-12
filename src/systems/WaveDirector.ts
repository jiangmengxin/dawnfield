// 波次导演：按地图时间表持续刷怪 + 定点事件（包围环 / 精英 / Boss）
// 波次/事件/精英/Boss 全部来自 MapSpec（content/maps.ts），每图节奏独立调参
// M11 无尽：Boss 时刻后以虚拟时间窗循环最后 cycleLen 秒的峰值波次（不回开局轻刷段），
// 窗口内事件（天然含 ring/精英/Boss）按轮偏移重放 → Boss 每轮末重临
import type { EnemyId } from '../content/ids';
import type { WaveEvent, WavePhase } from '../content/maps';
import { DIFFICULTY } from '../content/difficulty';
import { ENDLESS, endlessCycleAt } from '../content/endless';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { getSettings } from '../core/settings';
import type { CombatContext, RunSystem } from './context';
import type { EnemySystem } from './EnemySystem';

export class WaveDirector implements RunSystem {
  private spawnT = 0;
  private eventIdx = 0;
  /** Boss 苏醒时刻（= 无尽循环窗口右端；各图 events 的 boss 项与 minutes 对齐） */
  private readonly bossT: number;
  /** 无尽重放窗口事件：t ∈ [bossT−cycleLen, bossT]；一次性事件（surge）不得进窗口 */
  private readonly loopEvents: WaveEvent[];
  private loopIdx = 0;
  /** 当前重放窗口所属轮次（Boss 事件落在轮末 = 下一轮边界，独立于 run.cycle 推进，防跳过） */
  private loopCycle = 1;
  /** surge 保底（M12）：触发后 75s 内精英击杀数未增加 → 玩家旁直接掉 1 宝箱（弱者保护） */
  private surgeGuard: { until: number; baseKills: number } | null = null;

  constructor(private ctx: CombatContext, private enemies: EnemySystem) {
    this.bossT = ctx.map.minutes * 60;
    const loopStart = this.bossT - ENDLESS.cycleLen;
    this.loopEvents = ctx.map.events.filter((e) => e.t >= loopStart && e.t <= this.bossT);
  }

  /** 虚拟时间：无尽进入循环后映射回 [bossT−cycleLen, bossT) 查原波次表 */
  private virtualTime(): number {
    const t = this.ctx.run.elapsed;
    if (this.ctx.run.mode !== 'endless' || t < this.bossT) return t;
    return this.bossT - ENDLESS.cycleLen + ((t - this.bossT) % ENDLESS.cycleLen);
  }

  private currentWave(): WavePhase {
    const waves = this.ctx.map.waves;
    const t = this.virtualTime();
    let w = waves[0];
    for (const p of waves) {
      if (t >= p.from) w = p;
    }
    return w;
  }

  /** 波次预览（M8 调试）：当前波参数 + 下一个未触发事件（无尽循环段给出窗口重放事件） */
  preview(): { wave: WavePhase; next: WaveEvent | null } {
    const next = this.eventIdx < this.ctx.map.events.length
      ? this.ctx.map.events[this.eventIdx]
      : this.ctx.run.mode === 'endless' ? this.loopEvents[this.loopIdx] ?? null : null;
    return { wave: this.currentWave(), next };
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
    const run = ctx.run;
    const w = this.currentWave();
    const d = DIFFICULTY[run.diff];
    const k = run.cycle;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      // 狂暴与无尽轮次正交叠乘；间隔有地板、活数有封顶 + 340 全局硬上限，再叠动态降档
      this.spawnT = w.interval * d.intervalMul
        * Math.max(ENDLESS.intervalFloor, 1 - ENDLESS.intervalMulPerCycle * k);
      const alive = w.maxAlive * d.aliveMul
        * Math.min(ENDLESS.aliveCap, 1 + ENDLESS.aliveMulPerCycle * k);
      const cap = Math.round(Math.min(ENDLESS.aliveHardCap, alive) * ctx.enemyCapMul);
      if (this.enemies.actives.length < cap) {
        for (let i = 0; i < w.burst; i++) {
          const [x, y] = this.enemies.edgePos();
          this.enemies.spawn(this.pickType(w.types), x, y);
        }
      }
    }

    // 原表定点事件（一次性走完；无尽首轮前与普通模式逐秒一致）
    const events = ctx.map.events;
    while (this.eventIdx < events.length && run.elapsed >= events[this.eventIdx].t) {
      this.fire(events[this.eventIdx++], 0);
    }

    // surge 保底宝箱（M12）
    if (this.surgeGuard && run.elapsed >= this.surgeGuard.until) {
      if (run.eliteKills <= this.surgeGuard.baseKills) {
        ctx.spawnPickup('chest', ctx.player.x + 60, ctx.player.y - 10);
      }
      this.surgeGuard = null;
    }

    // 无尽：窗口事件按轮偏移重放（Boss 事件 t=bossT 自然落在每轮末）
    if (run.mode === 'endless' && this.loopEvents.length > 0) {
      const loopStart = this.bossT - ENDLESS.cycleLen;
      for (;;) {
        const ev = this.loopEvents[this.loopIdx];
        const at = ev.t - loopStart + this.bossT + (this.loopCycle - 1) * ENDLESS.cycleLen;
        if (run.elapsed < at) break;
        this.fire(ev, this.loopCycle);
        this.loopIdx++;
        if (this.loopIdx >= this.loopEvents.length) {
          this.loopIdx = 0;
          this.loopCycle++;
        }
      }
    }

    // 无尽轮次推进（RunState.cycle = 敌方乘区/金币衰减/成就的统一读数）。
    // 放在事件处理之后：轮边界与 Boss 事件同帧——结束第 k 轮的 Boss 持有第 k 轮乘区，
    // 首只 Boss（t=bossT，k=0）与普通模式同强度，复临 Boss 才逐轮增强
    if (run.mode === 'endless') {
      const k = endlessCycleAt(run.elapsed, this.bossT);
      if (k !== run.cycle) {
        run.cycle = k;
        emitEvent(ctx.scene.game, 'hud:cycle', k);
      }
    }
  }

  /** 触发单个定点事件；cycle ≥ escortFromCycle 的无尽重放 Boss 带精英护卫同刷 */
  private fire(ev: WaveEvent, cycle: number): void {
    const ctx = this.ctx;
    const map = ctx.map;
    if (ev.kind === 'ring' && ev.enemy && ev.n) {
      const cam = ctx.scene.cameras.main;
      const r = Math.hypot(cam.width, cam.height) / 2 / cam.zoom + 50;
      for (let i = 0; i < ev.n; i++) {
        const a = (i / ev.n) * Math.PI * 2;
        this.enemies.spawn(ev.enemy, ctx.player.x + Math.cos(a) * r, ctx.player.y + Math.sin(a) * r);
      }
    } else if (ev.kind === 'elite') {
      // 狂暴 II 特殊规则：精英事件双刷
      const n = DIFFICULTY[ctx.run.diff].eliteDouble ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const [x, y] = this.enemies.edgePos();
        this.enemies.spawn(ev.enemy ?? map.eliteId, x, y);
      }
      emitEvent(ctx.scene.game, 'hud:warn', 'eliteWarn');
      SFX.warning();
    } else if (ev.kind === 'surge') {
      // M12 中场事件：n 只精英环形均布包围 + 横幅 + BGM 强度抬升；保底宝箱兜底见 update
      const cam = ctx.scene.cameras.main;
      const r = Math.hypot(cam.width, cam.height) / 2 / cam.zoom + 60;
      const n = ev.n ?? 2;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        this.enemies.spawn(ev.enemy ?? map.eliteId, ctx.player.x + Math.cos(a) * r, ctx.player.y + Math.sin(a) * r);
      }
      this.surgeGuard = { until: ctx.run.elapsed + 75, baseKills: ctx.run.eliteKills };
      ctx.bgmBoost(18);
      emitEvent(ctx.scene.game, 'hud:warn', 'surgeWarn');
      SFX.warning();
      ctx.scene.time.delayedCall(280, () => SFX.warning());
      if (getSettings().shake) ctx.scene.cameras.main.shake(350, 0.004);
    } else if (ev.kind === 'boss') {
      const [x, y] = this.enemies.edgePos();
      this.enemies.spawn(map.bossId, x, y);
      if (cycle >= ENDLESS.escortFromCycle) {
        for (let i = 0; i < ENDLESS.escortCount; i++) {
          const [ex, ey] = this.enemies.edgePos();
          this.enemies.spawn(map.eliteId, ex, ey);
        }
      }
      emitEvent(ctx.scene.game, 'hud:boss', true);
      emitEvent(ctx.scene.game, 'hud:warn', 'map_' + map.id + '_warn');
      SFX.bossRoar();
      if (getSettings().shake) ctx.scene.cameras.main.shake(500, 0.004);
    }
  }
}
