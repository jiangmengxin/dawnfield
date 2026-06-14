import { describe, expect, it } from 'vitest';
import { BOSSES } from '../src/content/bosses';
import { MAPS } from '../src/content/maps';
import { BossController } from '../src/systems/BossController';
import type { CombatContext } from '../src/systems/context';
import type { Enemy, EnemySystem } from '../src/systems/EnemySystem';

describe('Boss 独占招式配置', () => {
  it('12 个 Boss 均有主招+辅招，主招唯一，二阶段统一半血', () => {
    const mainIds = new Set<string>();
    for (const map of MAPS) {
      const spec = BOSSES[map.id];
      expect(spec, map.id).toBeDefined();
      expect(spec.phase2HpK, map.id).toBe(0.5);
      expect(spec.moves, map.id).toHaveLength(2);
      expect(spec.moves[0].role, map.id).toBe('main');
      expect(spec.moves[1].role, map.id).toBe('support');
      expect(mainIds.has(spec.moves[0].id), spec.moves[0].id).toBe(false);
      mainIds.add(spec.moves[0].id);
    }
    expect(mainIds.size).toBe(12);
  });

  it('预警窗口与冷却满足高辨识低密度口径', () => {
    for (const map of MAPS) {
      for (const move of BOSSES[map.id].moves) {
        expect(move.firstCd, `${map.id}/${move.id} firstCd`).toBeGreaterThan(0);
        expect(move.cd, `${map.id}/${move.id} cd`).toBeGreaterThanOrEqual(8);
        expect(move.warn, `${map.id}/${move.id} warn`).toBeGreaterThanOrEqual(0.7);
        expect(move.warnP2 ?? move.warn, `${map.id}/${move.id} warnP2`).toBeGreaterThanOrEqual(0.55);
        expect(move.dmg, `${map.id}/${move.id} dmg`).toBeGreaterThan(0);
      }
    }
  });
});

describe('BossController 独占招式生命周期', () => {
  it('每种 move 都能生成预警对象并在结算后清理', () => {
    const moves = MAPS.flatMap((map) => [...BOSSES[map.id].moves]);
    for (const move of moves) {
      const harness = makeHarness();
      const ctl = new BossController(harness.ctx, harness.enemies, {
        phase2HpK: 0.5,
        moves: [move, move],
      });
      ctl.debugCast(harness.boss, move, true);
      expect(ctl.debugHazardCount, move.id).toBeGreaterThan(0);
      expect(harness.castCalls[0], move.id).toEqual({ role: move.role, id: move.id });
      for (let i = 0; i < 36; i++) ctl.debugTick(0.1);
      expect(ctl.debugHazardCount, move.id).toBe(0);
      expect(harness.destroyed, move.id).toBeGreaterThan(0);
    }
  });

  it('代表性命中招式会走玩家伤害分支', () => {
    const hitMoveIds = new Set(['feather_return', 'spore_breath', 'meteor_mark', 'owl_gaze', 'fruit_roll', 'mirror_tide', 'pendulum_sweep']);
    const hitMoves = MAPS.flatMap((map) => [...BOSSES[map.id].moves]).filter((move) => hitMoveIds.has(move.id));
    expect(hitMoves.length).toBe(hitMoveIds.size);
    for (const move of hitMoves) {
      const harness = makeHarness();
      const ctl = new BossController(harness.ctx, harness.enemies, {
        phase2HpK: 0.5,
        moves: [move, move],
      });
      ctl.debugCast(harness.boss, move, true);
      for (let i = 0; i < 36; i++) ctl.debugTick(0.1);
      expect(harness.damageCalls, move.id).toBeGreaterThan(0);
    }
  });
});

function makeHarness(): {
  ctx: CombatContext;
  enemies: EnemySystem;
  boss: Enemy;
  readonly destroyed: number;
  readonly damageCalls: number;
  readonly castCalls: Array<{ role: 'main' | 'support'; id: string }>;
} {
  let destroyed = 0;
  let damageCalls = 0;
  const castCalls: Array<{ role: 'main' | 'support'; id: string }> = [];
  const graphics = () => ({
    clear() { return this; },
    setDepth() { return this; },
    setVisible() { return this; },
    destroy() { destroyed++; return this; },
    fillStyle() { return this; },
    fillCircle() { return this; },
    lineStyle() { return this; },
    strokeCircle() { return this; },
    beginPath() { return this; },
    moveTo() { return this; },
    lineTo() { return this; },
    closePath() { return this; },
    fillPath() { return this; },
    strokePath() { return this; },
  });
  const boss = {
    x: -120,
    y: 0,
    hp: 450,
    maxHp: 1000,
    baseScale: 1,
    kvx: 0,
    kvy: 0,
    setScale() { return this; },
  } as unknown as Enemy;
  const ctx = {
    scene: {
      add: { graphics },
      tweens: { add: () => undefined },
    },
    player: { x: 0, y: 0 },
    facing: { x: 1, y: 0 },
    damagePlayer: () => { damageCalls++; },
    hitStop: () => undefined,
    spawnEnemyBullet: () => undefined,
  } as unknown as CombatContext;
  const enemies = {
    spawn: () => boss,
    notifyBossCast: (role: 'main' | 'support', id: string) => { castCalls.push({ role, id }); },
  } as unknown as EnemySystem;
  return {
    ctx,
    enemies,
    boss,
    get destroyed() { return destroyed; },
    get damageCalls() { return damageCalls; },
    get castCalls() { return castCalls; },
  };
}
