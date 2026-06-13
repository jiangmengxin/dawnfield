// 敌人移动行为模板表（M15 起 19 种）：content/enemies.ts 按 behavior 字段指派
// 每帧产出移动向量；行为内可触发攻击（吐弹）等副作用；调参常量在 content/enemies.ts
import {
  AMBUSH, BLINK, BURROW, DASHER, DRIFT, ENEMIES, EXPLODER, HOP, ORBIT, PHASE, PULSE, SHIELDER,
  SPIRAL, SUMMONER, SWOOP, TURRET, ZIGZAG,
} from '../content/enemies';
import { ENDLESS } from '../content/endless';
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
const dash: BehaviorFn = (e, ctx, dt, nx, ny, dist, out) => {
  const cfg = ENEMIES[e.id].dash ?? DASHER;
  e.stateT -= dt;
  if (e.dashState === 'walk') {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
    if (dist < cfg.triggerDist) {
      e.dashState = 'tele';
      e.stateT = cfg.telegraph;
      // M12 telegraph 规范：蓄力期沿冲刺方向画预警线（统一警示色阶）
      ctx.fx.teleLine(e.x, e.y, nx, ny, Math.min(cfg.dashSpeed * cfg.dashTime, dist + 60), cfg.telegraph);
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
      e.stateT = cfg.recover * e.recoverMul; // M15 swift 词缀：硬直缩短
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
const swoop: BehaviorFn = (e, ctx, dt, nx, ny, _dist, out) => {
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
      // M12 telegraph 规范：俯冲启动瞬间沿穿场路径画预警线（高速横穿提前可读）
      ctx.fx.teleLine(e.x, e.y, nx, ny, e.spd * SWOOP.mul * 0.9, 0.45);
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

/** 螺旋盘入（紫蝶蝶）：远处直奔，近处切向绕旋缓收 + 振翅抖动；wobble 初值奇偶决定旋向 */
const spiral: BehaviorFn = (e, _ctx, dt, nx, ny, dist, out) => {
  e.wobble += dt * 7;
  const sign = Math.floor(e.wobble * 13) % 2 === 0 ? 1 : -1;
  // 远 → 径向权重高；近 → 切向权重高（盘旋收紧）
  const w = Math.max(SPIRAL.inMin, Math.min(1, dist / SPIRAL.far));
  const tanK = SPIRAL.tan * (1 - w * 0.55);
  const flut = Math.sin(e.wobble) * SPIRAL.flutter;
  out.mvx = (nx * w + -ny * sign * tanK + -ny * flut) * e.spd;
  out.mvy = (ny * w + nx * sign * tanK + nx * flut) * e.spd;
};

/** 原地潜伏装蘑菇（害羞菇）：玩家踏入触发圈即惊醒，此后爆发/喘息循环追击不回头 */
const ambush: BehaviorFn = (e, ctx, dt, nx, ny, dist, out) => {
  if (e.dashState === 'walk') {
    // 潜伏：半透明、不移动
    e.setAlpha(AMBUSH.idleAlpha);
    if (dist < AMBUSH.trigger) {
      e.dashState = 'dash';
      e.stateT = AMBUSH.burst;
      e.setAlpha(1);
      // M12 telegraph 规范：惊醒闪白 + 警示环（时长色阶与 dash/swoop 统一）
      ctx.fx.flash(e);
      ctx.fx.ring(e.x, e.y, 0xe06060, 2.2, 0.45);
      SFX.swish();
    }
    return;
  }
  e.stateT -= dt;
  if (e.dashState === 'dash') {
    out.mvx = nx * e.spd * AMBUSH.mulBurst;
    out.mvy = ny * e.spd * AMBUSH.mulBurst;
    if (e.stateT <= 0) {
      e.dashState = 'recover';
      e.stateT = AMBUSH.tire * (0.8 + Math.random() * 0.4);
    }
  } else {
    out.mvx = nx * e.spd * AMBUSH.mulTire;
    out.mvy = ny * e.spd * AMBUSH.mulTire;
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = AMBUSH.burst * (0.85 + Math.random() * 0.3);
    }
  }
};

/** 钻钻鼠：地表慢走—钻地疾掘（半透+土屑）—破土小僵直 循环 */
const burrow: BehaviorFn = (e, ctx, dt, nx, ny, _dist, out) => {
  e.stateT -= dt;
  if (e.dashState === 'dash') {
    // 地下疾掘：半透明 + 沿途拱土
    out.mvx = nx * e.spd * BURROW.mulDig;
    out.mvy = ny * e.spd * BURROW.mulDig;
    if (Math.random() < dt * 14) {
      ctx.fx.burst(e.x, e.y + e.radius * 0.5, { tex: 'p_dot', color: 0xb09478, count: 1, speed: 36, life: 0.3, scale: 0.6, alpha: 0.7 });
    }
    if (e.stateT <= 0) {
      // 破土：恢复实体 + 土圈
      e.dashState = 'recover';
      e.stateT = BURROW.pop;
      e.setAlpha(1);
      ctx.fx.ring(e.x, e.y, DEATH_COLOR[e.id], 1.6, 0.35);
    }
  } else if (e.dashState === 'recover') {
    if (e.stateT <= 0) {
      e.dashState = 'walk';
      e.stateT = BURROW.surface * (0.8 + Math.random() * 0.4);
    }
  } else {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = BURROW.dig * (0.85 + Math.random() * 0.3);
      e.setAlpha(BURROW.digAlpha);
    }
  }
};

/** 月相灵：明相缓行（实体）/ 暗相疾行（半透）交替，变速压迫走位 */
const phase: BehaviorFn = (e, _ctx, dt, nx, ny, _dist, out) => {
  e.stateT -= dt;
  if (e.dashState === 'dash') {
    // 暗相：疾行
    out.mvx = nx * e.spd * PHASE.mulDark;
    out.mvy = ny * e.spd * PHASE.mulDark;
    if (e.stateT <= 0) {
      e.dashState = 'walk';
      e.stateT = PHASE.bright * (0.85 + Math.random() * 0.3);
      e.setAlpha(1);
    }
  } else {
    out.mvx = nx * e.spd * PHASE.mulBright;
    out.mvy = ny * e.spd * PHASE.mulBright;
    if (e.stateT <= 0) {
      e.dashState = 'dash';
      e.stateT = PHASE.dark * (0.85 + Math.random() * 0.3);
      e.setAlpha(PHASE.darkAlpha);
    }
  }
};

/** 自爆爆炸结算（M15）：行为引信与 EnemySystem 死亡爆炸共用；rMul = 半径缩放（被击杀 ×killR） */
export function exploderBoom(e: Enemy, ctx: CombatContext, rMul: number): void {
  const r = EXPLODER.r * rMul;
  ctx.fx.ring(e.x, e.y, DEATH_COLOR[e.id], r / 42 * 1.3, 0.45);
  ctx.fx.ring(e.x, e.y, 0xfff2c0, r / 42, 0.35);
  ctx.fx.burst(e.x, e.y, { tex: 'p_dot', color: DEATH_COLOR[e.id], count: 14, speed: 240, life: 0.4, scale: 1.1 });
  SFX.boom(false);
  // 对玩家：spec.dmg（随 dmgScale 成长，与接触伤害同口径）
  const p = ctx.player;
  if (Math.hypot(p.x - e.x, p.y - e.y) < r + ctx.run.char.radius) ctx.damagePlayer(e.dmg, e);
  // 对敌人：固定 edmg——可风筝借力清群（敌我同伤趣味）
  ctx.grid.queryCircle(e.x, e.y, r, exploderTmp);
  for (const o of exploderTmp) {
    if (o === e || !o.active || o.dying) continue;
    const ap = ctx.hitEnemy(o, EXPLODER.edmg, { kb: 90, kx: (o.x - e.x) / r, ky: (o.y - e.y) / r });
    if (ap > 0) ctx.dmgLog('exploder', ap);
  }
}

const exploderTmp: Enemy[] = [];

/** 自爆怪（M15）：加速逼近 → 进入触发圈定身膨胀预警 → 爆炸自毁（敌我同伤，可借力清群） */
const exploder: BehaviorFn = (e, ctx, dt, nx, ny, dist, out) => {
  if (e.dashState === 'tele') {
    // 引信：定身抖动 + 膨胀（EnemySystem 在 tele 态不覆盖缩放）
    e.stateT -= dt;
    e.x += (Math.random() - 0.5) * 2.4;
    const k = 1 - Math.max(0, e.stateT) / EXPLODER.fuse;
    e.setScale(e.baseScale * (1 + k * 0.4));
    if (e.stateT <= 0) {
      e.exploded = true; // 先标记：kill() 不再触发死亡半爆
      exploderBoom(e, ctx, 1);
      ctx.enemies.kill(e);
    }
    return;
  }
  out.mvx = nx * e.spd * EXPLODER.mulRush;
  out.mvy = ny * e.spd * EXPLODER.mulRush;
  if (dist < EXPLODER.trigger) {
    e.dashState = 'tele';
    e.stateT = EXPLODER.fuse;
    // M12 telegraph 规范：半透明警示区 + 收缩描边圈，时长 = 引信全程（≥0.45s）
    ctx.fx.teleCircle(e.x, e.y, EXPLODER.r, EXPLODER.fuse);
    ctx.fx.flash(e);
    SFX.warning();
  }
};

const shielderTmp: Enemy[] = [];

/** 护盾怪（M15）：慢速跟随敌群重心（不直奔玩家）；光环减伤在 Game.hitEnemy 经
 *  EnemySystem.shieldMulFor 结算，光环常显视觉由 EnemySystem 维护 */
const shielder: BehaviorFn = (e, ctx, dt, nx, ny, _dist, out) => {
  e.stateT -= dt;
  if (e.stateT <= 0) {
    // 每 rethink 秒重算一次方向：附近敌群（≥3 只）重心优先，孤身时才朝玩家
    e.stateT = SHIELDER.rethink;
    ctx.grid.queryCircle(e.x, e.y, SHIELDER.seekR, shielderTmp);
    let cx = 0;
    let cy = 0;
    let n = 0;
    for (const o of shielderTmp) {
      if (o === e || !o.active || o.dying) continue;
      cx += o.x;
      cy += o.y;
      n++;
    }
    if (n >= 3) {
      const dx = cx / n - e.x;
      const dy = cy / n - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 24) {
        e.dashDirX = dx / d;
        e.dashDirY = dy / d;
      } else {
        // 已在群心：顺着群体朝玩家缓推
        e.dashDirX = nx * 0.6;
        e.dashDirY = ny * 0.6;
      }
    } else {
      e.dashDirX = nx;
      e.dashDirY = ny;
    }
  }
  out.mvx = e.dashDirX * e.spd * SHIELDER.mulSpeed;
  out.mvy = e.dashDirY * e.spd * SHIELDER.mulSpeed;
};

/** 召唤者（M15）：与玩家保持距离踱步；周期吟唱（抖动预警）后召唤本图基础杂兵。
 *  召唤物计入 actives（受 340 全局硬上限约束，不绕过性能护栏）+ 单体存活上限 cap */
const summoner: BehaviorFn = (e, ctx, dt, nx, ny, dist, out) => {
  if (e.dashState === 'tele') {
    // 吟唱：定身抖动 + 轻微膨胀
    e.stateT -= dt;
    e.x += (Math.random() - 0.5) * 2.6;
    e.setScale(e.baseScale * (1 + (1 - Math.max(0, e.stateT) / SUMMONER.cast) * 0.18));
    if (e.stateT <= 0) {
      e.dashState = 'walk';
      let alive = 0;
      for (const o of ctx.enemies.actives) {
        if (o.summonerRef === e && o.active && !o.dying) alive++;
      }
      const globalCap = Math.round(ENDLESS.aliveHardCap * ctx.enemyCapMul);
      const id = ENEMIES[e.id].summon ?? ctx.map.waves[0].types[0][0];
      for (let i = 0; i < SUMMONER.n; i++) {
        if (alive + i >= SUMMONER.cap || ctx.enemies.actives.length >= globalCap) break;
        const a = Math.random() * Math.PI * 2;
        const m = ctx.enemies.spawn(id, e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34);
        m.summonerRef = e;
        ctx.fx.burst(m.x, m.y, { tex: 'p_dot', color: DEATH_COLOR[e.id], count: 5, speed: 70, life: 0.3, scale: 0.7, alpha: 0.8 });
      }
      ctx.fx.ring(e.x, e.y, DEATH_COLOR[e.id], 2.4, 0.4);
    }
    return;
  }
  // 保持距离踱步：过远靠近 / 过近后撤 / 适距横移
  if (dist > SUMMONER.keep * 1.15) {
    out.mvx = nx * e.spd;
    out.mvy = ny * e.spd;
  } else if (dist < SUMMONER.keep * 0.8) {
    out.mvx = -nx * e.spd * 0.85;
    out.mvy = -ny * e.spd * 0.85;
  } else {
    e.wobble += dt * 2.5;
    out.mvx = -ny * Math.sin(e.wobble) * e.spd * 0.4;
    out.mvy = nx * Math.sin(e.wobble) * e.spd * 0.4;
  }
  e.fireT -= dt;
  if (e.fireT <= 0 && dist < SUMMONER.keep + 220) {
    e.fireT = SUMMONER.cd;
    e.dashState = 'tele';
    e.stateT = SUMMONER.cast;
    // 吟唱预警（M12 规范：≥0.45s 视觉先行……cast=0.6s，抖动 + 警示环）
    ctx.fx.ring(e.x, e.y, 0xe06060, 2.0, SUMMONER.cast);
    SFX.warning();
  }
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
  spiral,
  ambush,
  burrow,
  phase,
  exploder,
  shielder,
  summoner,
};
