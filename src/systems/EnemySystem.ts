// 敌人系统：池化 + 行为模板驱动移动 + 分离/击退/减速 + 死亡分裂
// 刷怪节奏在 WaveDirector；Boss 技能在 BossController
// M15：spawn 后置钩子（精英词缀挂载 + 高威胁剪影强化）+ 护盾光环减伤 + 词缀逐帧逻辑
import Phaser from 'phaser';
import { ENEMIES, EXPLODER, SHIELDER, dmgScale, hpScale } from '../content/enemies';
import { AFFIX, AFFIX_COLOR, AFFIX_IDS } from '../content/affixes';
import { BOSSES } from '../content/bosses';
import { DIFFICULTY } from '../content/difficulty';
import { ENDLESS } from '../content/endless';
import type { AffixId, BehaviorId, EnemyId } from '../content/ids';
import { DEATH_COLOR, cssOf } from '../gfx/palette';
import { HITFEEL } from '../content/player';
import { FONT, t } from '../i18n';
import { Meta } from '../core/MetaState';
import { BEHAVIORS, BehaviorMove, exploderBoom } from './behaviors';
import { BossController } from './BossController';
import type { CombatContext, RunSystem } from './context';

export class Enemy extends Phaser.GameObjects.Image {
  id: EnemyId = 'blob';
  hp = 1;
  maxHp = 1;
  spd = 50;
  dmg = 5;
  xpVal = 1;
  radius = 10;
  knockMul = 1;
  // 击退速度（独立于行走）
  kvx = 0;
  kvy = 0;
  // 行为状态
  fireT = 0;
  dashState: 'walk' | 'tele' | 'dash' | 'recover' = 'walk';
  stateT = 0;
  dashDirX = 0;
  dashDirY = 0;
  wobble = 0;
  isElite = false;
  isBoss = false;
  shadowImg!: Phaser.GameObjects.Image;
  baseScale = 1;
  dying = false;
  // M15：精英词缀 + 新行为状态
  affix: AffixId | null = null;
  affixT = 0; // 词缀周期计时（gravitic/volley 冷却、swift 残影间隔）
  affixPullT = 0; // gravitic 拉拽剩余秒数
  exploded = false; // exploder 已主动引爆（kill() 不再触发死亡半爆）
  summonerRef: Enemy | null = null; // 召唤物归属（单召唤者存活上限用）
  recoverMul = 1; // dash 硬直乘子（swift 词缀 ×0.6）
  punchT = 0; // M17 受击 punch 脉冲剩余秒数（并入每帧呼吸缩放）
  affixLabel?: Phaser.GameObjects.Text; // 词缀头顶浮签（随敌人池复用）
  auraImg?: Phaser.GameObjects.Image; // shielder 光环常显圈
}

const tmpOut: Enemy[] = [];
const tmpMove: BehaviorMove = { mvx: 0, mvy: 0 };

/** 剪影强化（M15，评审 P2-4）：高威胁行为体积 +10%，远处先认出"要换打法的那只" */
const HIGH_THREAT: ReadonlySet<BehaviorId> = new Set(
  ['dash', 'turret', 'ambush', 'blink', 'exploder', 'shielder', 'summoner'] as BehaviorId[],
);

export class EnemySystem implements RunSystem {
  actives: Enemy[] = [];
  boss: Enemy | null = null;
  private pool: Enemy[] = [];
  private bossCtl: BossController | null = null;
  /** 在场护盾怪（每 0.3s 重建；hitEnemy 减伤查询 O(护盾怪数)） */
  private shielders: Enemy[] = [];
  private shieldRebuildT = 0;

  constructor(private ctx: CombatContext) {}

  // ---------- 池 ----------
  private obtain(): Enemy {
    let e = this.pool.pop();
    if (!e) {
      e = new Enemy(this.ctx.scene, 0, 0, 'e_blob');
      this.ctx.scene.add.existing(e);
      e.shadowImg = this.ctx.scene.add.image(0, 0, 'shadow').setDepth(8);
    }
    e.setActive(true).setVisible(true);
    e.shadowImg.setVisible(true);
    return e;
  }

  /** 生成并加入 actives */
  spawn(id: EnemyId, x: number, y: number): Enemy {
    Meta.codexLight('enemies', id); // 图鉴首遇点亮（Set 缓存，O(1)）
    const spec = ENEMIES[id];
    // 有效分钟：长图成长更平缓（timeK = 12/名义分钟）
    const min = (this.ctx.run.elapsed / 60) * this.ctx.map.timeK;
    const e = this.obtain();
    e.id = id;
    e.setTexture(spec.tex);
    e.setPosition(x, y);
    // M11 狂暴 × 无尽轮次乘区（正交叠乘；k=0 / diff=0 时恒 1，与 M10 等价）
    const d = DIFFICULTY[this.ctx.run.diff];
    const k = this.ctx.run.cycle;
    const hpMul = d.hpMul * (1 + ENDLESS.hpMulPerCycle * k)
      * (spec.boss ? 1 + ENDLESS.bossExtraPerCycle * k : 1);
    const spdMul = d.speedMul * Math.min(ENDLESS.speedCap, 1 + ENDLESS.speedMulPerCycle * k);
    const dmgMul = d.dmgMul * (1 + ENDLESS.dmgMulPerCycle * k);
    e.hp = e.maxHp = spec.hp * hpScale(min) * (spec.boss || spec.elite ? this.ctx.run.difficultyHp : 1) * hpMul;
    e.spd = spec.speed * (0.9 + Math.random() * 0.2) * spdMul;
    e.dmg = spec.dmg * dmgScale(min) * dmgMul;
    e.xpVal = spec.xp;
    e.radius = spec.radius;
    e.knockMul = spec.knockMul;
    e.kvx = e.kvy = 0;
    e.fireT = spec.shoot ? Math.random() * spec.shoot.cd : 0;
    e.dashState = 'walk';
    e.stateT = 0;
    e.wobble = Math.random() * Math.PI * 2;
    e.isElite = spec.elite === true;
    e.isBoss = spec.boss === true;
    e.dying = false;
    // M15 剪影强化：高威胁行为体积 +10%（含 dash 系精英；Boss 全部 chase 不受影响）
    e.baseScale = HIGH_THREAT.has(spec.behavior) ? 1.1 : 1;
    e.setScale(e.baseScale).setAlpha(1).setRotation(0).clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    e.shadowImg.setScale(spec.radius / 16, spec.radius / 22);
    // M15 状态复位（池复用）
    e.affix = null;
    e.affixT = 0;
    e.affixPullT = 0;
    e.exploded = false;
    e.summonerRef = null;
    e.recoverMul = 1;
    e.punchT = 0;
    if (spec.behavior === 'summoner') e.fireT = 2 + Math.random() * 3; // 首召错峰
    if (e.isBoss) {
      this.boss = e;
      this.bossCtl = new BossController(this.ctx, this, BOSSES[this.ctx.map.id]);
    }
    this.actives.push(e);
    this.onEnemySpawned(e); // M15：spawn 后置钩子（3.2 契约 #3——词缀挂载点）
    return e;
  }

  /** spawn 后置钩子（M15）：精英词缀挂载 + shielder 光环常显圈 */
  private onEnemySpawned(e: Enemy): void {
    if (ENEMIES[e.id].behavior === 'shielder') {
      if (!e.auraImg) e.auraImg = this.ctx.scene.add.image(0, 0, 'p_ring');
      e.auraImg.setTexture('p_ring')
        .setPosition(e.x, e.y)
        .setScale(SHIELDER.auraR / 42) // p_ring 环半径 42
        .setTint(DEATH_COLOR[e.id])
        .setAlpha(0.3)
        .setDepth(9)
        .setVisible(true);
    }
    this.applyAffix(e);
  }

  /** 精英词缀（M15）：狂暴 II 全部精英 / 无尽第 2 轮起的精英（含 surge/护卫）随机 1 个。
   *  普通与狂暴 I 不带；随机走 ctx.rng()（M17 种子契约） */
  private applyAffix(e: Enemy): void {
    if (!e.isElite) return;
    const run = this.ctx.run;
    if (!(run.diff >= 2 || (run.mode === 'endless' && run.cycle >= 2))) return;
    const id = AFFIX_IDS[Math.min(AFFIX_IDS.length - 1, Math.floor(this.ctx.rng() * AFFIX_IDS.length))];
    e.affix = id;
    if (id === 'swift') {
      e.spd *= AFFIX.swiftSpeed;
      e.recoverMul = AFFIX.swiftRecover;
    } else if (id === 'bulwark') {
      e.hp = e.maxHp = e.maxHp * AFFIX.bulwarkHp;
      e.knockMul *= AFFIX.bulwarkKnock;
      e.baseScale *= AFFIX.bulwarkScale;
      e.setScale(e.baseScale);
    } else if (id === 'gravitic') {
      e.affixT = AFFIX.graviticCd * (0.5 + Math.random() * 0.5); // 首发错峰（演出节奏，不入种子）
      run.gravSeen = true;
    } else if (id === 'volley') {
      e.affixT = AFFIX.volleyCd * (0.5 + Math.random() * 0.5);
    }
    // 头顶浮签：词缀名 + 标识色（随精英移动，池复用）
    if (!e.affixLabel) {
      e.affixLabel = this.ctx.scene.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '13px', fontStyle: 'bold',
        color: '#FFFDF6', stroke: '#5A5248', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(1e6 + 5);
    }
    e.affixLabel.setText(t('affix_' + id)).setColor(cssOf(AFFIX_COLOR[id])).setVisible(true);
  }

  private release(e: Enemy): void {
    e.setActive(false).setVisible(false);
    e.shadowImg.setVisible(false);
    if (e.affixLabel) e.affixLabel.setVisible(false);
    if (e.auraImg) e.auraImg.setVisible(false);
    // 召唤者离场：清掉子代归属引用（防池复用后计数串台）
    if (ENEMIES[e.id].behavior === 'summoner') {
      for (const o of this.actives) {
        if (o.summonerRef === e) o.summonerRef = null;
      }
    }
    if (e === this.boss) {
      this.boss = null;
      this.bossCtl = null;
    }
    this.pool.push(e);
  }

  /** 护盾光环减伤（M15）：目标在任一存活护盾怪光环内 → 伤害 ×(1−reduce)；护盾怪自身不受庇护 */
  shieldMulFor(e: Enemy): number {
    for (const s of this.shielders) {
      if (s === e || !s.active || s.dying) continue;
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      if (dx * dx + dy * dy < SHIELDER.auraR * SHIELDER.auraR) return 1 - SHIELDER.reduce;
    }
    return 1;
  }

  /** 镜头外环形随机点（刷怪用） */
  edgePos(extra = 70): [number, number] {
    const cam = this.ctx.scene.cameras.main;
    const r = Math.hypot(cam.width, cam.height) / 2 / cam.zoom + extra;
    const a = Math.random() * Math.PI * 2;
    return [this.ctx.player.x + Math.cos(a) * r, this.ctx.player.y + Math.sin(a) * r];
  }

  // ---------- 行为 ----------
  update(dt: number): void {
    const ctx = this.ctx;
    const px = ctx.player.x;
    const py = ctx.player.y;

    // M15 护盾怪列表重建（每 0.3s；340 同屏下 O(actives) 扫一遍可控）
    this.shieldRebuildT -= dt;
    if (this.shieldRebuildT <= 0) {
      this.shieldRebuildT = 0.3;
      this.shielders.length = 0;
      for (const e of this.actives) {
        if (e.active && !e.dying && ENEMIES[e.id].behavior === 'shielder') this.shielders.push(e);
      }
    }

    for (let i = this.actives.length - 1; i >= 0; i--) {
      const e = this.actives[i];
      if (!e.active || e.dying) continue;
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      tmpMove.mvx = 0;
      tmpMove.mvy = 0;
      BEHAVIORS[ENEMIES[e.id].behavior](e, ctx, dt, nx, ny, dist, tmpMove);
      let mvx = tmpMove.mvx;
      let mvy = tmpMove.mvy;

      if (e.isBoss && this.bossCtl) this.bossCtl.update(e, dt, nx, ny, dist);

      // 分离（轻推，防止叠成一坨）
      if (!e.isBoss && !e.isElite && (i & 1) === (ctx.run.frame & 1)) {
        ctx.grid.queryCircle(e.x, e.y, e.radius * 0.6, tmpOut);
        for (const o of tmpOut) {
          if (o === e) continue;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const d2 = ox * ox + oy * oy;
          if (d2 > 0.01 && d2 < 900) {
            const d = Math.sqrt(d2);
            mvx += (ox / d) * 38;
            mvy += (oy / d) * 38;
          }
        }
      }

      // 击退衰减
      e.kvx *= Math.pow(0.0001, dt);
      e.kvy *= Math.pow(0.0001, dt);

      // 水洼减速 / 顺风加速（花浪阵风：敌我同加速）
      const slow = ctx.slowAt(e.x, e.y) ? 0.55 : 1;
      const haste = ctx.hasteMulAt(e.x, e.y);
      // M18 hills 山风：敌人按 knockMul 受风（顺风加速逆风减速；Boss knockMul=0 不受）
      const w = ctx.windVec;
      let windK = 1;
      if ((w.x !== 0 || w.y !== 0) && e.knockMul > 0) {
        const ml = Math.hypot(mvx, mvy) || 1;
        windK = Math.max(0.5, 1 + ((mvx * w.x + mvy * w.y) / ml) * e.knockMul);
      }
      e.x += (mvx * slow * haste * windK + e.kvx) * dt;
      e.y += (mvy * slow * haste * windK + e.kvy) * dt;

      // 朝向 + 呼吸（flipInvert 沿用冲冲既有朝向规则）
      if (Math.abs(mvx) > 1) e.setFlipX((mvx < 0) !== (ENEMIES[e.id].flipInvert === true));
      e.wobble += dt * 4;
      const br = 1 + Math.sin(e.wobble * 2) * 0.04;
      // M17 受击 punch：命中瞬间放大脉冲线性回落（并入每帧缩放，tween 会被这里覆写所以不用 tween）
      if (e.punchT > 0) e.punchT -= dt;
      const pk = e.punchT > 0 ? 1 + HITFEEL.punchK * (e.punchT / HITFEEL.punchDur) : 1;
      if (e.dashState !== 'tele') e.setScale(e.baseScale * br * pk, e.baseScale * (2 - br) * pk);

      e.setDepth(1000 + e.y * 0.01);
      e.shadowImg.setPosition(e.x, e.y + e.radius * 0.9);

      // M15：词缀逐帧逻辑 + 浮签/光环跟随
      if (e.affix) this.updateAffix(e, dt, px, py);
      if (e.affixLabel?.visible) e.affixLabel.setPosition(e.x, e.y - e.radius * e.baseScale - 14);
      if (e.auraImg?.visible) {
        e.auraImg.setPosition(e.x, e.y).setAlpha(0.24 + Math.sin(e.wobble * 1.5) * 0.06);
      }

      // 离玩家过远的回收（防游走积累）
      if (dist > 1900 && !e.isBoss && !e.isElite) {
        this.removeAt(i);
      }
    }
  }

  /** 词缀逐帧逻辑（M15）：swift 残影 / gravitic 周期拉拽 / volley 蓄力环射 */
  private updateAffix(e: Enemy, dt: number, px: number, py: number): void {
    const ctx = this.ctx;
    if (e.affix === 'swift') {
      // 残影拖尾（移动中每 swiftGhostEvery 秒一帧剪影淡出）
      e.affixT -= dt;
      if (e.affixT <= 0) {
        e.affixT = AFFIX.swiftGhostEvery;
        const ghost = ctx.scene.add.image(e.x, e.y, e.texture.key)
          .setAlpha(0.3).setScale(e.scaleX, e.scaleY).setFlipX(e.flipX).setDepth(e.depth - 1);
        ctx.scene.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
      }
    } else if (e.affix === 'gravitic') {
      e.affixT -= dt;
      if (e.affixT <= 0) {
        e.affixT = AFFIX.graviticCd;
        e.affixPullT = AFFIX.graviticDur;
        // 周期引力圈 FX：向心双环 + 蓄力闪
        ctx.fx.ring(e.x, e.y, AFFIX_COLOR.gravitic, 7, 0.5);
        ctx.fx.flash(e, 0xd8c8f8);
      }
      if (e.affixPullT > 0) {
        e.affixPullT -= dt;
        const dx = e.x - px;
        const dy = e.y - py;
        const d = Math.hypot(dx, dy) || 1;
        if (d < AFFIX.graviticRange) {
          // 拉拽玩家（可走位对抗：力度 < 玩家移速）
          ctx.player.x += (dx / d) * AFFIX.graviticForce * dt;
          ctx.player.y += (dy / d) * AFFIX.graviticForce * dt;
        }
      }
    } else if (e.affix === 'volley') {
      const prev = e.affixT;
      e.affixT -= dt;
      if (prev > AFFIX.volleyFlash && e.affixT <= AFFIX.volleyFlash) ctx.fx.flash(e, 0xf8d8a8); // 蓄力闪烁
      if (e.affixT <= 0) {
        e.affixT = AFFIX.volleyCd;
        const a0 = Math.random() * Math.PI * 2;
        for (let k = 0; k < AFFIX.volleyN; k++) {
          const a = a0 + (k / AFFIX.volleyN) * Math.PI * 2;
          ctx.spawnEnemyBullet({
            x: e.x, y: e.y, nx: Math.cos(a), ny: Math.sin(a),
            speed: AFFIX.volleySpeed, dmg: AFFIX.volleyDmg, timeScaled: true,
          });
        }
      }
    }
  }

  private removeAt(i: number): void {
    const e = this.actives[i];
    this.actives.splice(i, 1);
    this.release(e);
  }

  /** 武器伤害入口（由 CombatContext.hitEnemy 调用后处理死亡） */
  kill(e: Enemy): void {
    const idx = this.actives.indexOf(e);
    if (idx < 0 || e.dying) return;
    e.dying = true;
    this.actives.splice(idx, 1);

    // M15 自爆怪被击杀：仍然爆，但半径减半（主动引爆已置 exploded 不重复）
    if (ENEMIES[e.id].behavior === 'exploder' && !e.exploded) {
      e.exploded = true;
      exploderBoom(e, this.ctx, EXPLODER.killR);
    }

    // 死亡分裂（分裂球 → 迷你球）
    const split = ENEMIES[e.id].split;
    if (split) {
      for (let i = 0; i < split.n; i++) {
        const s = i % 2 === 0 ? -1 : 1;
        const m = this.spawn(split.id, e.x + s * 14, e.y + (Math.random() - 0.5) * 10);
        m.kvx = s * 120;
        m.kvy = -60;
      }
    }

    // M15 裂变词缀：死亡分裂 4 只本图基础杂兵（首波首项 = 本图基础脸）
    if (e.affix === 'splitting') {
      const id = this.ctx.map.waves[0].types[0][0];
      for (let i = 0; i < AFFIX.splitN; i++) {
        const a = (i / AFFIX.splitN) * Math.PI * 2 + Math.random();
        const m = this.spawn(id, e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18);
        m.kvx = Math.cos(a) * 160;
        m.kvy = Math.sin(a) * 160;
      }
      this.ctx.fx.ring(e.x, e.y, AFFIX_COLOR.splitting, 4, 0.4);
    }

    this.ctx.onEnemyKilled(e);
    this.release(e);
  }

  nearest(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    for (const e of this.actives) {
      if (!e.active || e.dying) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bd) {
        bd = d2;
        best = e;
      }
    }
    return best;
  }

  /** 屏幕内随机 n 个敌人 */
  randomOnScreen(n: number): Enemy[] {
    const cam = this.ctx.scene.cameras.main;
    const hw = cam.width / 2 / cam.zoom;
    const hh = cam.height / 2 / cam.zoom;
    const px = this.ctx.player.x;
    const py = this.ctx.player.y;
    const candidates = this.actives.filter(
      (e) => e.active && !e.dying && Math.abs(e.x - px) < hw && Math.abs(e.y - py) < hh,
    );
    Phaser.Utils.Array.Shuffle(candidates);
    return candidates.slice(0, n);
  }

  clearAllSoft(): void {
    for (let i = this.actives.length - 1; i >= 0; i--) this.removeAt(i);
  }
}
