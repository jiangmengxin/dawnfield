import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/content/enemies';
import { MAPS } from '../src/content/maps';
import {
  BOSS_ART_BY_ENEMY,
  BOSS_ART_BY_MAP,
  BOSS_ART_SPECS,
  BOSS_FRAME_COUNTS,
  BOSS_FRAME_STATES,
  bossFrameKeysFor,
} from '../src/gfx/textures/bosses';
import { BossVisualStateMachine } from '../src/systems/BossVisual';

describe('Boss 高精度美术规格', () => {
  it('12 个 Boss 均有完整帧组、P2、施法、受击与死亡状态', () => {
    expect(BOSS_ART_SPECS).toHaveLength(12);
    const keys = new Set<string>();
    for (const spec of BOSS_ART_SPECS) {
      expect(keys.has(spec.key), spec.key).toBe(false);
      keys.add(spec.key);
      expect(BOSS_ART_BY_MAP[spec.mapId], spec.mapId).toBe(spec);
      expect(BOSS_ART_BY_ENEMY[spec.enemyId], spec.enemyId).toBe(spec);
      expect(ENEMIES[spec.enemyId].tex, spec.enemyId).toBe(spec.key);
      expect(spec.w, spec.key).toBeGreaterThanOrEqual(180);
      expect(spec.h, spec.key).toBeGreaterThanOrEqual(160);
      const frameKeys = bossFrameKeysFor(spec.key);
      expect(frameKeys).toHaveLength(1 + 2 * BOSS_FRAME_STATES.reduce((sum, state) => sum + BOSS_FRAME_COUNTS[state], 0));
      expect(frameKeys).toContain(`${spec.key}_p1_idle0`);
      expect(frameKeys).toContain(`${spec.key}_p2_idle0`);
      expect(frameKeys).toContain(`${spec.key}_p1_cast_main0`);
      expect(frameKeys).toContain(`${spec.key}_p1_cast_support0`);
      expect(frameKeys).toContain(`${spec.key}_p2_death1`);
    }
  });

  it('地图 Boss 与美术规格一一对应', () => {
    for (const map of MAPS) {
      const spec = BOSS_ART_BY_MAP[map.id];
      expect(spec, map.id).toBeDefined();
      expect(spec.enemyId, map.id).toBe(map.bossId);
    }
  });
});

describe('BossVisual 状态机', () => {
  it('按 死亡>P2>施法>受击>移动>待机 优先级锁定状态', () => {
    const m = new BossVisualStateMachine();
    expect(m.update(0.016, false).mode).toBe('idle');
    expect(m.requestHit()).toBe(true);
    expect(m.update(0.016, true).mode).toBe('hit');
    expect(m.requestCast('main')).toBe(true);
    expect(m.update(0.016, true).mode).toBe('cast_main');
    expect(m.requestCast('support')).toBe(false);
    m.setPhase2(true);
    const phase = m.update(0.016, true);
    expect(phase.mode).toBe('phase');
    expect(phase.phase2).toBe(true);
    expect(m.requestCast('support')).toBe(false);
    m.requestDeath();
    expect(m.update(0.016, true).mode).toBe('death');
    expect(m.requestCast('main')).toBe(false);
  });

  it('受击反馈会节流，避免高攻速下污染 Boss 施法表现', () => {
    const m = new BossVisualStateMachine();
    expect(m.requestHit()).toBe(true);
    expect(m.requestHit()).toBe(false);
    m.update(0.23, false);
    expect(m.requestHit()).toBe(true);
  });
});
