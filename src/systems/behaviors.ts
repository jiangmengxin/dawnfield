// 敌人移动行为模板表（12 种）：content/enemies.ts 按 behavior 字段指派
// 每帧产出移动向量；行为内可触发攻击（吐弹）等副作用；调参常量在 content/enemies.ts
import {
  BLINK, DASHER, DRIFT, ENEMIES, HOP, ORBIT, PULSE, SWOOP, TURRET, ZIGZAG,
} from '../content/enemies';
import type { BehaviorId } from '../content/ids';
import { DEATH_COLOR } from '../gfx/palette';
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

/** 朝玩家吐一发/一组弹（strafeShoot / turret 共用） */
function fireAt(e: Enemy, ctx: CombatContext, nx: number, ny: number): void {
  const sh = ENEMIES[e.id].shoot;
  if (!sh) return;
  const n = sh.n ?? 1;
  const base = Math.atan2(ny, nx);
  for (let i = 0; i < n; i++) {
    const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.5);
    ctx.spawnEnemyBullet({
      x: e.x, y: e.y, nx: Math.cos(a), ny: Math.sin(a),
      speed: sh.speed, dmg: sh.dmg, timeScaled: true, tex: sh.tex,
    });
  }
  e.setScale(e.baseScale * 1.25);
  ctx.scene.tweens.add({ targets: e, scaleX: e.baseScale, scaleY: e.baseScale, duration: 200 });
}

/** 直线追击 */
const chase: BehaviorFn = (e, _ctx, _dt, nx, ny, _dist, out) => {
  out.mvx = nx * e.spd;
  out.mvy = ny * e.spd;
};

/** 蛇形摆动逼近（小蠓/迷你球/谷粒粒） */
const wobble: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.wobble += dt * 6;
  const wob = Math.sin(e.wobble) * 0.45;
  out.mvx = (nx + -ny * wob) * e.spd;
  out.mvy = (ny + nx * wob) * e.spd;
};

/** 保持射程绕圈 + 周期吐弹（喷喷） */
const strafeShoot: BehaviorFn = (e, ctx, dt, nx, ny, dist, out) => {
  const sh = ENEMIES[e.id].shoot;
  const range = sh?.range ?? 270;
  if (dist > range) {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
  } else {
    out.mvx = -ny * e.spd * 0.35;
    out.mvy = nx * e.spd * 0.35;
  }
  e.fireT -= dt;
  if (e.fireT <= 0 && sh && dist < range + 80) {
    e.fireT = sh.cd;
    fireAt(e, ctx, nx, ny);
  }
};

/** 蓄力—冲刺—硬直 循环（冲冲/蓟滚滚/蓟王球） */
const dash: BehaviorFn = (e, _ctx, dt, nx, ny, dist, out) => {
  const cfg = ENEMIES[e.id].dash ?? DASHER;
  e.stateT -= dt;
  if (e.dashState === 'walk') {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
    if (dist < cfg.triggerDist) {
      e.dashState = 'tele';
      e.stateT = cfg.telegraph;
    }
  } else if (e.dashState === 'tele') {
    // 蓄力抖动
    e.x += (Math.random() - 0.5) * 2;
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = cfg.dashTime;
      e.dashDirX = nx;
      e.dashDirY = ny;
      SFX.swish();
    }
  } else if (e.dashState === 'dash') {
    out.mvx = e.dashDirX * cfg.dashSpeed;
    out.mvy = e.dashDirY * cfg.dashSpeed;
    if (e.stateT <= 0) {
      e.dashState = 'recover';
      e.stateT = cfg.recover;
    }
  } else {
    out.mvx = nx * e.spd * 0.3;
    out.mvy = ny * e.spd * 0.3;
    if (e.stateT <= 0) e.dashState = 'walk';
  }
};

/** 缓慢飘近 + 大幅横摆 + 上下浮沉（泡泡儿） */
const drift: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.wobble += dt * DRIFT.wobK;
  const wob = Math.sin(e.wobble) * DRIFT.amp;
  out.mvx = (nx * DRIFT.fwd + -ny * wob) * e.spd;
  out.mvy = (ny * DRIFT.fwd + nx * wob) * e.spd + Math.sin(e.wobble * 1.7) * 9;
};

/** 蹲伏—跃扑 循环（蛙蹦蹦）：复用 dashState 做两态机 */
const hop: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.stateT -= dt;
  if (e.dashState !== 'dash') {
    // 蹲伏蓄力（不动）
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = HOP.leap;
      e.dashDirX = nx;
      e.dashDirY = ny;
    }
  } else {
    out.mvx = e.dashDirX * e.spd * HOP.leapMul;
    out.mvy = e.dashDirY * e.spd * HOP.leapMul;
    if (e.stateT <= 0) {
      e.dashState = 'walk';
      e.stateT = HOP.rest * (0.8 + Math.random() * 0.4);
    }
  }
};

/** 绕玩家公转缓慢收紧（软水母）；wobble 初值奇偶决定旋向 */
const orbit: BehaviorFn = (e, _ctx, _dt, nx, ny, dist, out) => {
  if (dist > ORBIT.dist * 1.6) {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
    return;
  }
  const sign = Math.floor(e.wobble * 7) % 2 === 0 ? 1 : -1;
  out.mvx = -ny * sign * e.spd * ORBIT.mul + nx * ORBIT.inward;
  out.mvy = nx * sign * e.spd * ORBIT.mul + ny * ORBIT.inward;
};

/** 瞄准—直线俯冲穿场—再瞄准（小乌鸫）：冲过头不回头，扫过式压迫 */
const swoop: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.stateT -= dt;
  if (e.dashState !== 'dash') {
    // 瞄准期缓慢漂移
    out.mvx = nx * e.spd * 0.3;
    out.mvy = ny * e.spd * 0.3;
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = SWOOP.fly;
      e.dashDirX = nx;
      e.dashDirY = ny;
    }
  } else {
    out.mvx = e.dashDirX * e.spd * SWOOP.mul;
    out.mvy = e.dashDirY * e.spd * SWOOP.mul;
    if (e.stateT <= 0) {
      e.dashState = 'walk';
      e.stateT = SWOOP.aim * (0.8 + Math.random() * 0.5);
    }
  }
};

/** 周期闪现到玩家身侧 + 落地僵直（风精灵） */
const blink: BehaviorFn = (e, ctx, dt, nx, ny, _dist, out) => {
  e.stateT -= dt;
  if (e.dashState === 'recover') {
    // 落地僵直（给玩家反应时间）
    if (e.stateT <= 0) {
      e.dashState = 'walk';
      e.stateT = BLINK.cd * (0.85 + Math.random() * 0.3);
    }
    return;
  }
  out.mvx = nx * e.spd;
  out.mvy = ny * e.spd;
  if (e.stateT <= 0) {
    // 闪现：旧位置留一缕烟，落点先闪光
    ctx.fx.burst(e.x, e.y, { tex: 'p_dot', color: DEATH_COLOR[e.id], count: 5, speed: 40, life: 0.35, scale: 0.7, alpha: 0.7 });
    const a = Math.random() * Math.PI * 2;
    e.setPosition(ctx.player.x + Math.cos(a) * BLINK.dist, ctx.player.y + Math.sin(a) * BLINK.dist);
    ctx.fx.ring(e.x, e.y, DEATH_COLOR[e.id], 2.2, 0.4);
    e.dashState = 'recover';
    e.stateT = BLINK.freeze;
  }
};

/** 加速滚动—滑行减速 循环（松果球），滚动期带旋转 */
const pulse: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.stateT -= dt;
  if (e.dashState === 'dash') {
    out.mvx = nx * e.spd * PULSE.mulBurst;
    out.mvy = ny * e.spd * PULSE.mulBurst;
    e.rotation += dt * 7 * (nx >= 0 ? 1 : -1);
    if (e.stateT <= 0) {
      e.dashState = 'walk';
      e.stateT = PULSE.coast;
    }
  } else {
    out.mvx = nx * e.spd * PULSE.mulCoast;
    out.mvy = ny * e.spd * PULSE.mulCoast;
    e.rotation *= Math.pow(0.05, dt); // 滑行期转回正
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = PULSE.burst;
    }
  }
};

/** 射程内驻停轻踱 + 周期齐射（水枪鱼炮台） */
const turret: BehaviorFn = (e, ctx, dt, nx, ny, dist, out) => {
  const sh = ENEMIES[e.id].shoot;
  const range = sh?.range ?? 250;
  if (dist > range) {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
  } else {
    // 驻停轻踱（保持一点活物感）
    e.wobble += dt * 3;
    out.mvx = -ny * Math.sin(e.wobble) * e.spd * TURRET.shuffleMul;
    out.mvy = nx * Math.sin(e.wobble) * e.spd * TURRET.shuffleMul;
  }
  e.fireT -= dt;
  if (e.fireT <= 0 && sh && dist < range + 60) {
    e.fireT = sh.cd;
    fireAt(e, ctx, nx, ny);
  }
};

/** 锯齿折线逼近（蝌蚪宝）：周期硬切 ±角度，比 wobble 更急 */
const zigzag: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.wobble += dt;
  const flip = Math.floor(e.wobble / ZIGZAG.period) % 2 === 0 ? 1 : -1;
  const a = Math.atan2(ny, nx) + flip * ZIGZAG.angle;
  out.mvx = Math.cos(a) * e.spd;
  out.mvy = Math.sin(a) * e.spd;
};

export const BEHAVIORS: Record<BehaviorId, BehaviorFn> = {
  chase,
  wobble,
  strafeShoot,
  dash,
  drift,
  hop,
  orbit,
  swoop,
  blink,
  pulse,
  turret,
  zigzag,
};
