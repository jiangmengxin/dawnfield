// 敌人系统：池化 + 六种行为 + 波次时间表 + 精英 + 墨之王 Boss
import Phaser from 'phaser';
import { DASHER, EVENTS, ENEMIES, EnemyId, SPITTER, WAVES, dmgScale, hpScale } from '../config';
import { SFX } from '../audio/sound';
import type { GameScene } from '../scenes/Game';

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

export class EnemyManager {
  actives: Enemy[] = [];
  private pool: Enemy[] = [];
  private g: GameScene;
  private spawnT = 0;
  private eventIdx = 0;
  boss: Enemy | null = null;
  private bossAtkT = 0;
  private bossSummonT = 0;
  private bossDashT = 0;

  constructor(g: GameScene) {
    this.g = g;
  }

  // ---------- 池 ----------
  private obtain(): Enemy {
    let e = this.pool.pop();
    if (!e) {
      e = new Enemy(this.g, 0, 0, 'e_blob');
      this.g.add.existing(e);
      e.shadowImg = this.g.add.image(0, 0, 'shadow').setDepth(8);
    }
    e.setActive(true).setVisible(true);
    e.shadowImg.setVisible(true);
    return e;
  }

  spawn(id: EnemyId, x: number, y: number): Enemy {
    const spec = ENEMIES[id];
    const min = this.g.elapsed / 60;
    const e = this.obtain();
    e.id = id;
    e.setTexture(spec.tex);
    e.setPosition(x, y);
    e.hp = e.maxHp = spec.hp * hpScale(min) * (id === 'boss' || id === 'elite' ? this.g.difficultyHp : 1);
    e.spd = spec.speed * (0.9 + Math.random() * 0.2);
    e.dmg = spec.dmg * dmgScale(min);
    e.xpVal = spec.xp;
    e.radius = spec.radius;
    e.knockMul = spec.knockMul;
    e.kvx = e.kvy = 0;
    e.fireT = Math.random() * SPITTER.fireCd;
    e.dashState = 'walk';
    e.stateT = 0;
    e.wobble = Math.random() * Math.PI * 2;
    e.isElite = id === 'elite';
    e.isBoss = id === 'boss';
    e.dying = false;
    e.baseScale = 1;
    e.setScale(1).setAlpha(1).clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    e.shadowImg.setScale(spec.radius / 16, spec.radius / 22);
    if (e.isBoss) {
      this.boss = e;
      this.bossAtkT = 2.5;
      this.bossSummonT = 9;
      this.bossDashT = 6;
    }
    return e;
  }

  private release(e: Enemy): void {
    e.setActive(false).setVisible(false);
    e.shadowImg.setVisible(false);
    if (e === this.boss) this.boss = null;
    this.pool.push(e);
  }

  // ---------- 刷怪 ----------
  private currentWave() {
    const t = this.g.elapsed;
    let w = WAVES[0];
    for (const p of WAVES) {
      if (t >= p.from) w = p;
    }
    return w;
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

  /** 镜头外环形随机点 */
  private edgePos(): [number, number] {
    const cam = this.g.cameras.main;
    const r = Math.hypot(cam.width, cam.height) / 2 / cam.zoom + 70;
    const a = Math.random() * Math.PI * 2;
    return [this.g.player.x + Math.cos(a) * r, this.g.player.y + Math.sin(a) * r];
  }

  private updateSpawning(dt: number): void {
    const w = this.currentWave();
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = w.interval;
      const cap = Math.round(w.maxAlive * this.g.enemyCapMul);
      if (this.actives.length < cap) {
        for (let i = 0; i < w.burst; i++) {
          const [x, y] = this.edgePos();
          this.actives.push(this.spawn(this.pickType(w.types), x, y));
        }
      }
    }
    // 定点事件
    while (this.eventIdx < EVENTS.length && this.g.elapsed >= EVENTS[this.eventIdx].t) {
      const ev = EVENTS[this.eventIdx++];
      if (ev.kind === 'ring' && ev.enemy && ev.n) {
        const cam = this.g.cameras.main;
        const r = Math.hypot(cam.width, cam.height) / 2 / cam.zoom + 50;
        for (let i = 0; i < ev.n; i++) {
          const a = (i / ev.n) * Math.PI * 2;
          this.actives.push(this.spawn(ev.enemy, this.g.player.x + Math.cos(a) * r, this.g.player.y + Math.sin(a) * r));
        }
      } else if (ev.kind === 'elite') {
        const [x, y] = this.edgePos();
        this.actives.push(this.spawn('elite', x, y));
        this.g.game.events.emit('hud:warn', 'eliteWarn');
        SFX.warning();
      } else if (ev.kind === 'boss') {
        const [x, y] = this.edgePos();
        this.actives.push(this.spawn('boss', x, y));
        this.g.game.events.emit('hud:boss', true);
        this.g.game.events.emit('hud:warn', 'bossWarn');
        SFX.bossRoar();
        this.g.cameras.main.shake(500, 0.004);
      }
    }
  }

  // ---------- 行为 ----------
  update(dt: number): void {
    this.updateSpawning(dt);
    const px = this.g.player.x;
    const py = this.g.player.y;

    for (let i = this.actives.length - 1; i >= 0; i--) {
      const e = this.actives[i];
      if (!e.active || e.dying) continue;
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      let mvx = 0;
      let mvy = 0;

      switch (e.id) {
        case 'midge':
        case 'mini': {
          e.wobble += dt * 6;
          const wob = Math.sin(e.wobble) * 0.45;
          mvx = (nx + -ny * wob) * e.spd;
          mvy = (ny + nx * wob) * e.spd;
          break;
        }
        case 'spitter': {
          if (dist > SPITTER.range) {
            mvx = nx * e.spd;
            mvy = ny * e.spd;
          } else {
            mvx = -ny * e.spd * 0.35;
            mvy = nx * e.spd * 0.35;
          }
          e.fireT -= dt;
          if (e.fireT <= 0 && dist < SPITTER.range + 80) {
            e.fireT = SPITTER.fireCd;
            this.g.spawnInkball(e.x, e.y, nx, ny);
            e.setScale(e.baseScale * 1.25);
            this.g.tweens.add({ targets: e, scaleX: e.baseScale, scaleY: e.baseScale, duration: 200 });
          }
          break;
        }
        case 'dasher': {
          e.stateT -= dt;
          if (e.dashState === 'walk') {
            mvx = nx * e.spd;
            mvy = ny * e.spd;
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
            mvx = e.dashDirX * DASHER.dashSpeed;
            mvy = e.dashDirY * DASHER.dashSpeed;
            if (e.stateT <= 0) {
              e.dashState = 'recover';
              e.stateT = DASHER.recover;
            }
          } else {
            mvx = nx * e.spd * 0.3;
            mvy = ny * e.spd * 0.3;
            if (e.stateT <= 0) e.dashState = 'walk';
          }
          break;
        }
        default: {
          mvx = nx * e.spd;
          mvy = ny * e.spd;
        }
      }

      if (e.isBoss) this.updateBoss(e, dt, nx, ny, dist);

      // 分离（轻推，防止叠成一坨）
      if (!e.isBoss && !e.isElite && (i & 1) === (this.g.frame & 1)) {
        this.g.grid.queryCircle(e.x, e.y, e.radius * 0.6, tmpOut);
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
      const slow = this.g.slowAt(e.x, e.y) ? 0.55 : 1;
      e.x += (mvx * slow + e.kvx) * dt;
      e.y += (mvy * slow + e.kvy) * dt;

      // 朝向 + 呼吸
      if (Math.abs(mvx) > 1) e.setFlipX(mvx < 0 === (e.id !== 'dasher')); // dasher 纹理朝右
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

  private updateBoss(e: Enemy, dt: number, nx: number, ny: number, dist: number): void {
    const phase2 = e.hp < e.maxHp * 0.5;
    this.bossAtkT -= dt;
    this.bossSummonT -= dt;
    this.bossDashT -= dt;

    if (this.bossAtkT <= 0) {
      this.bossAtkT = phase2 ? 3.2 : 4.5;
      // 弹幕环
      const n = phase2 ? 16 : 11;
      const off = Math.random() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        const a = off + (k / n) * Math.PI * 2;
        this.g.spawnInkball(e.x, e.y, Math.cos(a), Math.sin(a));
      }
      SFX.boom();
      e.setScale(e.baseScale * 1.12);
      this.g.tweens.add({ targets: e, scaleX: e.baseScale, scaleY: e.baseScale, duration: 300 });
    }
    if (phase2 && this.bossSummonT <= 0) {
      this.bossSummonT = 10;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        this.actives.push(this.spawn('midge', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90));
      }
      SFX.warning();
    }
    if (this.bossDashT <= 0 && dist > 150) {
      this.bossDashT = phase2 ? 5.5 : 7.5;
      e.kvx = nx * 420;
      e.kvy = ny * 420;
      SFX.swish();
    }
  }

  private removeAt(i: number): void {
    const e = this.actives[i];
    this.actives.splice(i, 1);
    this.release(e);
  }

  /** 武器伤害入口（由 GameScene.hitEnemy 调用后处理死亡） */
  kill(e: Enemy): void {
    const idx = this.actives.indexOf(e);
    if (idx < 0 || e.dying) return;
    e.dying = true;
    this.actives.splice(idx, 1);

    // 分裂球：死亡分裂
    if (e.id === 'splitter') {
      for (const s of [-1, 1]) {
        const m = this.spawn('mini', e.x + s * 14, e.y + (Math.random() - 0.5) * 10);
        m.kvx = s * 120;
        m.kvy = -60;
        this.actives.push(m);
      }
    }

    this.g.onEnemyKilled(e);
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
    const cam = this.g.cameras.main;
    const hw = cam.width / 2 / cam.zoom;
    const hh = cam.height / 2 / cam.zoom;
    const px = this.g.player.x;
    const py = this.g.player.y;
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
