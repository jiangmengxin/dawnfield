// 敌人移动行为模板表：content/enemies.ts 按 behavior 字段指派
// 每帧产出移动向量；行为内可触发攻击（喷喷射弹）等副作用
import { DASHER, SPITTER } from '../content/enemies';
import type { BehaviorId } from '../content/ids';
import { SFX } from '../audio/sound';
import type { CombatContext } from './context';
import type { Enemy } from './EnemySystem';

export interface BehaviorMove {
  mvx: number;
  mvy: number;
}

export type BehaviorFn = (
  e: Enemy, ctx: CombatContext, dt: number,
  nx: number, ny: number, dist: number, out: BehaviorMove,
) => void;

/** 直线追击 */
const chase: BehaviorFn = (e, _ctx, _dt, nx, ny, _dist, out) => {
  out.mvx = nx * e.spd;
  out.mvy = ny * e.spd;
};

/** 蛇形摆动逼近（小蠓/迷你球） */
const wobble: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.wobble += dt * 6;
  const wob = Math.sin(e.wobble) * 0.45;
  out.mvx = (nx + -ny * wob) * e.spd;
  out.mvy = (ny + nx * wob) * e.spd;
};

/** 保持射程绕圈 + 周期吐墨（喷喷） */
const strafeShoot: BehaviorFn = (e, ctx, dt, nx, ny, dist, out) => {
  if (dist > SPITTER.range) {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
  } else {
    out.mvx = -ny * e.spd * 0.35;
    out.mvy = nx * e.spd * 0.35;
  }
  e.fireT -= dt;
  if (e.fireT <= 0 && dist < SPITTER.range + 80) {
    e.fireT = SPITTER.fireCd;
    ctx.spawnEnemyBullet({
      x: e.x, y: e.y, nx, ny,
      speed: SPITTER.bulletSpeed, dmg: SPITTER.bulletDmg, timeScaled: true,
    });
    e.setScale(e.baseScale * 1.25);
    ctx.scene.tweens.add({ targets: e, scaleX: e.baseScale, scaleY: e.baseScale, duration: 200 });
  }
};

/** 蓄力—冲刺—硬直 循环（冲冲） */
const dash: BehaviorFn = (e, _ctx, dt, nx, ny, dist, out) => {
  e.stateT -= dt;
  if (e.dashState === 'walk') {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
    if (dist < DASHER.triggerDist) {
      e.dashState = 'tele';
      e.stateT = DASHER.telegraph;
    }
  } else if (e.dashState === 'tele') {
    // 蓄力抖动
    e.x += (Math.random() - 0.5) * 2;
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = DASHER.dashTime;
      e.dashDirX = nx;
      e.dashDirY = ny;
      SFX.swish();
    }
  } else if (e.dashState === 'dash') {
    out.mvx = e.dashDirX * DASHER.dashSpeed;
    out.mvy = e.dashDirY * DASHER.dashSpeed;
    if (e.stateT <= 0) {
      e.dashState = 'recover';
      e.stateT = DASHER.recover;
    }
  } else {
    out.mvx = nx * e.spd * 0.3;
    out.mvy = ny * e.spd * 0.3;
    if (e.stateT <= 0) e.dashState = 'walk';
  }
};

export const BEHAVIORS: Record<BehaviorId, BehaviorFn> = {
  chase,
  wobble,
  strafeShoot,
  dash,
};
