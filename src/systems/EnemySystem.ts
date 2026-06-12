// 敌人系统：池化 + 行为模板驱动移动 + 分离/击退/减速 + 死亡分裂
// 刷怪节奏在 WaveDirector；Boss 技能在 BossController
import Phaser from 'phaser';
import { ENEMIES, dmgScale, hpScale } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import type { EnemyId } from '../content/ids';
import { Meta } from '../core/MetaState';
import { BEHAVIORS, BehaviorMove } from './behaviors';
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
}

const tmpOut: Enemy[] = [];
const tmpMove: BehaviorMove = { mvx: 0, mvy: 0 };

export class EnemySystem implements RunSystem {
  actives: Enemy[] = [];
  boss: Enemy | null = null;
  private pool: Enemy[] = [];
  private bossCtl: BossController | null = null;

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
    e.hp = e.maxHp = spec.hp * hpScale(min) * (spec.boss || spec.elite ? this.ctx.run.difficultyHp : 1);
    e.spd = spec.speed * (0.9 + Math.random() * 0.2);
    e.dmg = spec.dmg * dmgScale(min);
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
    e.baseScale = 1;
    e.setScale(1).setAlpha(1).setRotation(0).clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    e.shadowImg.setScale(spec.radius / 16, spec.radius / 22);
    if (e.isBoss) {
      this.boss = e;
      this.bossCtl = new BossController(this.ctx, this, BOSSES[this.ctx.map.id]);
    }
    this.actives.push(e);
    return e;
  }

  private release(e: Enemy): void {
    e.setActive(false).setVisible(false);
    e.shadowImg.setVisible(false);
    if (e === this.boss) {
      this.boss = null;
      this.bossCtl = null;
    }
    this.pool.push(e);
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

      // 水洼减速
      const slow = ctx.slowAt(e.x, e.y) ? 0.55 : 1;
      e.x += (mvx * slow + e.kvx) * dt;
      e.y += (mvy * slow + e.kvy) * dt;

      // 朝向 + 呼吸（flipInvert 沿用冲冲既有朝向规则）
      if (Math.abs(mvx) > 1) e.setFlipX((mvx < 0) !== (ENEMIES[e.id].flipInvert === true));
      e.wobble += dt * 4;
      const br = 1 + Math.sin(e.wobble * 2) * 0.04;
      if (e.dashState !== 'tele') e.setScale(e.baseScale * br, e.baseScale * (2 - br));

      e.setDepth(1000 + e.y * 0.01);
      e.shadowImg.setPosition(e.x, e.y + e.radius * 0.9);

      // 离玩家过远的回收（防游走积累）
      if (dist > 1900 && !e.isBoss && !e.isElite) {
        this.removeAt(i);
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
