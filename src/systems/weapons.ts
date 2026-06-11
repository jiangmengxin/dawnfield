// 武器系统：7 种机制完全不同的武器 + 各自的进化形态
// 约定：武器自行计算最终伤害（含 stats.dmg），交给 g.hitEnemy 结算暴击/击退/死亡
import Phaser from 'phaser';
import { WEAPON_META, WeaponId, WEAPON_MAX_LEVEL, PASSIVE_MAX_LEVEL } from '../config';
import { PAL, RAINBOW } from '../gfx/palette';
import { SFX } from '../audio/sound';
import type { Enemy } from './enemies';
import type { GameScene } from '../scenes/Game';

const queryOut: Enemy[] = [];

function nearestK(g: GameScene, x: number, y: number, k: number, maxDist: number): Enemy[] {
  const md2 = maxDist * maxDist;
  const list: Array<[number, Enemy]> = [];
  for (const e of g.enemies.actives) {
    if (!e.active || e.dying) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < md2) list.push([d2, e]);
  }
  list.sort((a, b) => a[0] - b[0]);
  return list.slice(0, k).map(([, e]) => e);
}

// ---------- 基类 ----------

export abstract class Weapon {
  id: WeaponId;
  level = 1;
  evolved = false;
  protected cdT = 0.5;
  protected g: GameScene;

  constructor(g: GameScene, id: WeaponId) {
    this.g = g;
    this.id = id;
  }

  update(dt: number): void {
    this.cdT -= dt;
    if (this.cdT <= 0) {
      this.fire();
      this.cdT = Math.max(0.15, this.cooldown() * this.g.stats.cd);
    }
    this.tick(dt);
  }

  protected abstract fire(): void;
  protected abstract cooldown(): number;
  /** 持续逻辑（投射物、环绕物） */
  protected tick(_dt: number): void { /* override */ }
  onLevelUp(): void { /* override */ }
  onEvolve(): void {
    this.evolved = true;
  }
  destroy(): void { /* override */ }
}

// ---------- 1. 光刃 / 晨曦 ----------

class BladeWeapon extends Weapon {
  private static DMG = [14, 18, 24, 30, 40];
  private static CD = [1.15, 1.05, 1.0, 0.92, 0.85];

  protected cooldown(): number {
    return this.evolved ? 1.0 : BladeWeapon.CD[this.level - 1];
  }

  private radius(): number {
    return (this.evolved ? 105 : 88 * (this.level >= 3 ? 1.22 : 1)) * this.g.stats.area;
  }

  private dmg(): number {
    return (this.evolved ? 48 : BladeWeapon.DMG[this.level - 1]) * this.g.stats.dmg;
  }

  protected fire(): void {
    const g = this.g;
    const near = g.enemies.nearest(g.player.x, g.player.y, 300);
    const aim = near
      ? Math.atan2(near.y - g.player.y, near.x - g.player.x)
      : Math.atan2(g.facing.y, g.facing.x);
    if (this.evolved) {
      this.spinSlash();
      return;
    }
    this.slash(aim, 0);
    if (this.level >= 2) this.slash(aim + Math.PI, 0.13);
  }

  private slash(angle: number, delay: number): void {
    const g = this.g;
    g.time.delayedCall(delay * 1000, () => {
      if (!g.running) return;
      const r = this.radius();
      const img = g.add.image(g.player.x, g.player.y, 'w_arc')
        .setRotation(angle - 0.45)
        .setScale(r / 46)
        .setDepth(1e6)
        .setAlpha(0.95);
      g.tweens.add({
        targets: img, rotation: angle + 0.45, alpha: 0,
        duration: 200, ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
      });
      SFX.swish();
      // 扇形判定
      g.grid.queryCircle(g.player.x, g.player.y, r, queryOut);
      for (const e of queryOut) {
        const ea = Math.atan2(e.y - g.player.y, e.x - g.player.x);
        let da = Math.abs(Phaser.Math.Angle.Wrap(ea - angle));
        if (da < 1.15) {
          g.hitEnemy(e, this.dmg(), { kb: 220, kx: Math.cos(ea), ky: Math.sin(ea) });
        }
      }
    });
  }

  private spinSlash(): void {
    const g = this.g;
    const r = this.radius();
    const img = g.add.image(g.player.x, g.player.y, 'w_arc_full')
      .setScale(r / 54).setDepth(1e6).setAlpha(0.9);
    g.tweens.add({
      targets: img, rotation: Math.PI, alpha: 0, scale: (r / 54) * 1.15,
      duration: 280, ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
    });
    SFX.swish();
    g.grid.queryCircle(g.player.x, g.player.y, r, queryOut);
    const hitNow = [...queryOut];
    for (const e of hitNow) {
      const ea = Math.atan2(e.y - g.player.y, e.x - g.player.x);
      g.hitEnemy(e, this.dmg(), { kb: 260, kx: Math.cos(ea), ky: Math.sin(ea) });
    }
    // 0.16s 后扩散冲击环（二段伤害）
    g.time.delayedCall(160, () => {
      if (!g.running) return;
      g.fx.ring(g.player.x, g.player.y, PAL.bladeDeep, (r * 1.6) / 42, 0.4);
      g.grid.queryCircle(g.player.x, g.player.y, r * 1.6, queryOut);
      for (const e of queryOut) {
        const ea = Math.atan2(e.y - g.player.y, e.x - g.player.x);
        g.hitEnemy(e, this.dmg() * 0.6, { kb: 320, kx: Math.cos(ea), ky: Math.sin(ea) });
      }
    });
  }
}

// ---------- 2. 花瓣环 / 百花 ----------

class PetalWeapon extends Weapon {
  private static DMG = [10, 12, 14, 16, 22];
  private static COUNT = [3, 4, 5, 6, 6];
  private petals: Phaser.GameObjects.Image[] = [];
  private outer: Phaser.GameObjects.Image[] = [];
  private angle = 0;
  private hitMap = new Map<Enemy, number>();
  private burstT = 4;
  private shots: PetalShot[] = [];

  protected cooldown(): number { return 999; }
  protected fire(): void { /* 持续型武器 */ }

  private radius(): number {
    return (this.level >= 5 ? 88 : 74) * this.g.stats.area;
  }

  private dmg(): number {
    return PetalWeapon.DMG[this.level - 1] * this.g.stats.dmg * (this.evolved ? 1.3 : 1);
  }

  private ensure(): void {
    const want = PetalWeapon.COUNT[this.level - 1];
    while (this.petals.length < want) {
      this.petals.push(this.g.add.image(0, 0, 'w_petal').setDepth(1e6));
    }
    if (this.evolved) {
      const wantO = want + 2;
      while (this.outer.length < wantO) {
        this.outer.push(this.g.add.image(0, 0, 'w_petal').setDepth(1e6).setScale(1.15));
      }
    }
  }

  onLevelUp(): void { this.ensure(); }
  onEvolve(): void {
    super.onEvolve();
    this.ensure();
  }

  protected tick(dt: number): void {
    this.ensure();
    const g = this.g;
    this.angle += dt * 2.7;
    const r = this.radius();
    const now = g.elapsed;
    const ringDamage = (imgs: Phaser.GameObjects.Image[], rad: number, dir: number, phase: number) => {
      imgs.forEach((p, i) => {
        const a = phase + dir * this.angle + (i / imgs.length) * Math.PI * 2;
        p.setPosition(g.player.x + Math.cos(a) * rad, g.player.y + Math.sin(a) * rad);
        p.setRotation(a + Math.PI / 2);
        g.grid.queryCircle(p.x, p.y, 13, queryOut);
        for (const e of queryOut) {
          const last = this.hitMap.get(e) ?? -9;
          if (now - last > 0.5) {
            this.hitMap.set(e, now);
            const ea = Math.atan2(e.y - g.player.y, e.x - g.player.x);
            g.hitEnemy(e, this.dmg(), { kb: 240, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 1.3 });
          }
        }
      });
    };
    ringDamage(this.petals, r, 1, 0);
    if (this.evolved) {
      ringDamage(this.outer, r * 1.6, -1, 0.4);
      // 周期性花瓣弹幕
      this.burstT -= dt;
      if (this.burstT <= 0) {
        this.burstT = 4;
        SFX.throwSfx();
        const n = this.outer.length;
        for (let i = 0; i < n; i++) {
          const a = -this.angle + 0.4 + (i / n) * Math.PI * 2;
          this.shots.push(new PetalShot(g, g.player.x + Math.cos(a) * r * 1.6, g.player.y + Math.sin(a) * r * 1.6, a, this.dmg() * 1.2));
        }
      }
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      if (!this.shots[i].update(dt)) this.shots.splice(i, 1);
    }
    // 清理 hitMap（防泄漏）
    if (g.frame % 300 === 0) {
      for (const [e, t0] of this.hitMap) if (now - t0 > 3) this.hitMap.delete(e);
    }
  }

  destroy(): void {
    this.petals.forEach((p) => p.destroy());
    this.outer.forEach((p) => p.destroy());
    this.shots.forEach((s) => s.kill());
  }
}

class PetalShot {
  private img: Phaser.GameObjects.Image;
  private vx: number;
  private vy: number;
  private life = 0.9;
  private hit = new Set<Enemy>();

  constructor(private g: GameScene, x: number, y: number, a: number, private dmg: number) {
    this.img = g.add.image(x, y, 'w_petal').setDepth(1e6).setRotation(a + Math.PI / 2).setScale(1.2);
    this.vx = Math.cos(a) * 270 * g.stats.projSpeed;
    this.vy = Math.sin(a) * 270 * g.stats.projSpeed;
  }

  update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) {
      this.kill();
      return false;
    }
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.img.setAlpha(Math.min(1, this.life * 3));
    this.g.grid.queryCircle(this.img.x, this.img.y, 12, queryOut);
    for (const e of queryOut) {
      if (this.hit.has(e)) continue;
      this.hit.add(e);
      this.g.hitEnemy(e, this.dmg, { kb: 120, kx: this.vx / 300, ky: this.vy / 300, pitch: 1.3 });
      if (this.hit.size >= 3) {
        this.kill();
        return false;
      }
    }
    return true;
  }

  kill(): void { this.img.destroy(); }
}

// ---------- 3. 棱镜光束 / 虹折射 ----------

class PrismWeapon extends Weapon {
  private static DMG = [16, 20, 26, 34, 44];
  private static CD = [2.3, 2.2, 2.0, 1.7, 1.5];

  protected cooldown(): number {
    return this.evolved ? 1.4 : PrismWeapon.CD[this.level - 1];
  }

  private dmg(): number {
    return (this.evolved ? 50 : PrismWeapon.DMG[this.level - 1]) * this.g.stats.dmg;
  }

  private width(): number {
    return (this.level >= 3 ? 17 : 13) * this.g.stats.area;
  }

  protected fire(): void {
    const g = this.g;
    const k = this.level >= 2 ? 2 : 1;
    const targets = nearestK(g, g.player.x, g.player.y, k, 560);
    if (targets.length === 0) {
      this.cdT = 0.3;
      return;
    }
    // 蓄能光点
    const glow = g.add.image(g.player.x, g.player.y, 'p_dot').setDepth(1e6).setScale(0.5).setAlpha(0.8);
    g.tweens.add({
      targets: glow, scale: 2.2, alpha: 0, duration: 180,
      onComplete: () => glow.destroy(),
    });
    g.time.delayedCall(170, () => {
      if (!g.running) return;
      SFX.beam();
      for (const t of targets) {
        if (!t.active) continue;
        const a = Math.atan2(t.y - g.player.y, t.x - g.player.x);
        this.beam(g.player.x, g.player.y, a, 540, this.dmg(), true);
      }
    });
  }

  /** 绘制 + 判定一道彩虹光束 */
  private beam(x0: number, y0: number, a: number, len: number, dmg: number, refract: boolean): void {
    const g = this.g;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const x1 = x0 + ca * len;
    const y1 = y0 + sa * len;
    const w = this.width();
    const gr = g.add.graphics().setDepth(1e6);
    // 彩虹层
    RAINBOW.forEach((c, i) => {
      const off = (i - (RAINBOW.length - 1) / 2) * (w / RAINBOW.length) * 0.9;
      gr.lineStyle(w / RAINBOW.length + 1.5, c, 0.55);
      gr.beginPath();
      gr.moveTo(x0 - sa * off, y0 + ca * off);
      gr.lineTo(x1 - sa * off, y1 + ca * off);
      gr.strokePath();
    });
    gr.lineStyle(3.5, 0xffffff, 0.95);
    gr.beginPath();
    gr.moveTo(x0, y0);
    gr.lineTo(x1, y1);
    gr.strokePath();
    g.tweens.add({ targets: gr, alpha: 0, duration: 260, ease: 'Cubic.easeIn', onComplete: () => gr.destroy() });
    g.fx.burst(x1, y1, { tex: 'p_star', color: 0xffffff, count: 4, speed: 60, life: 0.35, scale: 0.9 });

    // 线段命中
    for (const e of g.enemies.actives) {
      if (!e.active || e.dying) continue;
      const ex = e.x - x0;
      const ey = e.y - y0;
      const proj = ex * ca + ey * sa;
      if (proj < -e.radius || proj > len + e.radius) continue;
      const perp = Math.abs(-ex * sa + ey * ca);
      if (perp < w + e.radius) {
        g.hitEnemy(e, dmg, { kb: 60, kx: ca, ky: sa, pitch: 1.6 });
      }
    }
    // 进化：末端折射
    if (refract && this.evolved) {
      g.fx.burst(x1, y1, { tex: 'p_star', color: PAL.mine, count: 6, speed: 90, life: 0.4 });
      for (const s of [-1, 1]) {
        this.beam(x1, y1, a + s * 0.7, 280, dmg * 0.7, false);
      }
    }
  }
}

// ---------- 4. 细雨 / 倾盆 ----------

class RainWeapon extends Weapon {
  private static DMG = [15, 19, 24, 30, 38];
  private static CD = [2.9, 2.6, 2.4, 2.2, 2.0];
  private static N = [3, 3, 4, 4, 5];
  private cloud: Phaser.GameObjects.Image | null = null;
  private cloudBob = 0;

  protected cooldown(): number {
    return this.evolved ? 0.42 : RainWeapon.CD[this.level - 1];
  }

  private dmg(): number {
    return RainWeapon.DMG[this.level - 1] * this.g.stats.dmg * (this.evolved ? 1.15 : 1);
  }

  private area(): number {
    return 56 * this.g.stats.area * (this.evolved ? 1.15 : 1);
  }

  protected fire(): void {
    const g = this.g;
    if (this.evolved) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 190;
      this.drop(g.player.x + Math.cos(a) * d, g.player.y + Math.sin(a) * d);
      return;
    }
    const n = RainWeapon.N[this.level - 1];
    const targets = g.enemies.randomOnScreen(n);
    SFX.splash();
    for (let i = 0; i < n; i++) {
      const t = targets[i];
      let x: number;
      let y: number;
      if (t) {
        x = t.x + (Math.random() - 0.5) * 30;
        y = t.y + (Math.random() - 0.5) * 30;
      } else {
        const a = Math.random() * Math.PI * 2;
        const d = 80 + Math.random() * 180;
        x = g.player.x + Math.cos(a) * d;
        y = g.player.y + Math.sin(a) * d;
      }
      this.g.time.delayedCall(i * 90, () => this.drop(x, y));
    }
  }

  private drop(x: number, y: number): void {
    const g = this.g;
    if (!g.running) return;
    const img = g.add.image(x, y - 180, 'w_drop').setDepth(1e6).setAlpha(0.9).setScale(1.2);
    g.tweens.add({
      targets: img, y, duration: 360, ease: 'Quad.easeIn',
      onComplete: () => {
        img.destroy();
        if (!g.running) return;
        const r = this.area();
        g.fx.ring(x, y, PAL.rain, r / 42, 0.3);
        g.fx.burst(x, y, { tex: 'p_dot', color: PAL.rain, count: 7, speed: 110, life: 0.4, scale: 0.7, grav: 160 });
        g.addPuddle(x, y, r * 0.95, 2.6);
        g.grid.queryCircle(x, y, r, queryOut);
        for (const e of queryOut) {
          g.hitEnemy(e, this.dmg(), { kb: 40, kx: 0, ky: 0, pitch: 0.8 });
        }
      },
    });
  }

  onEvolve(): void {
    super.onEvolve();
    this.cloud = this.g.add.image(this.g.player.x, this.g.player.y - 90, 'w_cloud').setDepth(1e6 + 5).setAlpha(0.92);
  }

  protected tick(dt: number): void {
    if (this.cloud) {
      this.cloudBob += dt * 2;
      const g = this.g;
      this.cloud.x += (g.player.x - this.cloud.x) * Math.min(1, dt * 4);
      this.cloud.y += (g.player.y - 92 + Math.sin(this.cloudBob) * 6 - this.cloud.y) * Math.min(1, dt * 4);
    }
  }

  destroy(): void { this.cloud?.destroy(); }
}

// ---------- 5. 跃光 / 雷暴 ----------

class SparkWeapon extends Weapon {
  private static DMG = [14, 17, 21, 26, 34];
  private static CD = [2.0, 1.9, 1.8, 1.6, 1.5];
  private static LINKS = [3, 4, 5, 6, 6];

  protected cooldown(): number {
    return this.evolved ? 1.5 : SparkWeapon.CD[this.level - 1];
  }

  protected fire(): void {
    const g = this.g;
    const first = g.enemies.nearest(g.player.x, g.player.y, 340);
    if (!first) {
      this.cdT = 0.3;
      return;
    }
    SFX.zap();
    const links = this.evolved ? 12 : SparkWeapon.LINKS[this.level - 1];
    const decay = this.evolved ? 0.92 : 0.85;
    const baseDmg = SparkWeapon.DMG[this.level - 1] * g.stats.dmg * (this.evolved ? 1.2 : 1);
    const visited = new Set<Enemy>();
    const points: Array<[number, number]> = [[g.player.x, g.player.y]];
    let cur: Enemy | null = first;
    let i = 0;
    while (cur && i < links) {
      visited.add(cur);
      points.push([cur.x, cur.y]);
      const dmg = baseDmg * Math.pow(decay, i);
      g.hitEnemy(cur, dmg, { kb: 30, kx: 0, ky: 0, pitch: 1.8 });
      g.fx.burst(cur.x, cur.y, { tex: 'p_star', color: PAL.spark, count: 3, speed: 70, life: 0.3, scale: 0.8 });
      if (this.evolved) {
        // 链端小爆炸
        g.grid.queryCircle(cur.x, cur.y, 44, queryOut);
        for (const e of queryOut) {
          if (e !== cur && !visited.has(e)) g.hitEnemy(e, dmg * 0.5, { kb: 20, kx: 0, ky: 0, pitch: 1.8 });
        }
      }
      // 找下一个
      let next: Enemy | null = null;
      let bd = 160 * 160;
      for (const e of g.enemies.actives) {
        if (!e.active || e.dying || visited.has(e)) continue;
        const dx = e.x - cur.x;
        const dy = e.y - cur.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bd) {
          bd = d2;
          next = e;
        }
      }
      cur = next;
      i++;
    }
    this.drawBolt(points);
  }

  private drawBolt(points: Array<[number, number]>): void {
    const g = this.g;
    const gr = g.add.graphics().setDepth(1e6 + 2);
    const drawPath = (width: number, color: number, alpha: number, jitter: number) => {
      gr.lineStyle(width, color, alpha);
      gr.beginPath();
      gr.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        // 两段折线 + 抖动
        const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * jitter;
        const my = (y0 + y1) / 2 + (Math.random() - 0.5) * jitter;
        gr.lineTo(mx, my);
        gr.lineTo(x1, y1);
      }
      gr.strokePath();
    };
    drawPath(7, PAL.spark, 0.4, 26);
    drawPath(2.5, 0xffffff, 0.95, 26);
    g.tweens.add({ targets: gr, alpha: 0, duration: 200, ease: 'Cubic.easeIn', onComplete: () => gr.destroy() });
  }
}

// ---------- 6. 疾风镖 / 旋风 ----------

class BoomShot {
  img: Phaser.GameObjects.Image;
  private state: 'out' | 'back' = 'out';
  private vx: number;
  private vy: number;
  private decel: number;
  private dirX: number;
  private dirY: number;
  private hit = new Set<Enemy>();
  private trailT = 0;

  constructor(private g: GameScene, a: number, speed: number, dist: number, private dmg: number, private magnet: boolean) {
    this.img = g.add.image(g.player.x, g.player.y, 'w_boom').setDepth(1e6).setScale(1.25);
    this.dirX = Math.cos(a);
    this.dirY = Math.sin(a);
    this.vx = this.dirX * speed;
    this.vy = this.dirY * speed;
    // v²/(2d) 让它在 dist 处速度归零
    this.decel = (speed * speed) / (2 * dist);
  }

  update(dt: number): boolean {
    const g = this.g;
    this.img.rotation += dt * 14;
    if (this.state === 'out') {
      this.vx -= this.dirX * this.decel * dt;
      this.vy -= this.dirY * this.decel * dt;
      if (this.vx * this.dirX + this.vy * this.dirY <= 0) {
        this.state = 'back';
        this.hit.clear();
      }
    } else {
      const dx = g.player.x - this.img.x;
      const dy = g.player.y - this.img.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 480 * g.stats.projSpeed;
      this.vx += ((dx / d) * sp - this.vx) * Math.min(1, dt * 6);
      this.vy += ((dy / d) * sp - this.vy) * Math.min(1, dt * 6);
      if (d < 28) {
        this.img.destroy();
        return false;
      }
      if (this.magnet) g.magnetizeGems(this.img.x, this.img.y, 95);
    }
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.05;
      g.fx.burst(this.img.x, this.img.y, { tex: 'p_dot', color: PAL.boom, count: 1, speed: 12, life: 0.25, scale: 0.55, alpha: 0.6 });
    }
    g.grid.queryCircle(this.img.x, this.img.y, 18, queryOut);
    for (const e of queryOut) {
      if (this.hit.has(e)) continue;
      this.hit.add(e);
      g.hitEnemy(e, this.dmg, { kb: 130, kx: this.vx / 400, ky: this.vy / 400, pitch: 1.1 });
    }
    return true;
  }

  kill(): void { this.img.destroy(); }
}

class BoomerangWeapon extends Weapon {
  private static DMG = [16, 20, 26, 34, 42];
  private static CD = [2.5, 2.4, 2.3, 2.2, 2.0];
  private static COUNT = [1, 2, 2, 2, 3];
  private shots: BoomShot[] = [];

  protected cooldown(): number {
    return this.evolved ? 2.2 : BoomerangWeapon.CD[this.level - 1];
  }

  protected fire(): void {
    const g = this.g;
    const near = g.enemies.nearest(g.player.x, g.player.y, 480);
    const baseA = near
      ? Math.atan2(near.y - g.player.y, near.x - g.player.x)
      : Math.atan2(g.facing.y, g.facing.x);
    const dmg = BoomerangWeapon.DMG[this.level - 1] * g.stats.dmg * (this.evolved ? 1.25 : 1);
    const dist = (250 + (this.level >= 4 ? 60 : 0)) * g.stats.area;
    const speed = 380 * g.stats.projSpeed;
    if (this.evolved) {
      for (const off of [-0.45, 0, 0.45]) {
        this.shots.push(new BoomShot(g, baseA + off, speed, dist, dmg, true));
      }
      SFX.throwSfx();
    } else {
      const n = BoomerangWeapon.COUNT[this.level - 1];
      for (let i = 0; i < n; i++) {
        g.time.delayedCall(i * 150, () => {
          if (g.running) {
            this.shots.push(new BoomShot(g, baseA + (Math.random() - 0.5) * 0.3, speed, dist, dmg, false));
            SFX.throwSfx();
          }
        });
      }
    }
  }

  protected tick(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      if (!this.shots[i].update(dt)) this.shots.splice(i, 1);
    }
  }

  destroy(): void { this.shots.forEach((s) => s.kill()); }
}

// ---------- 7. 星尘雷 / 新星 ----------

interface Mine {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  arm: number;
  life: number;
}

class MineWeapon extends Weapon {
  private static DMG = [22, 28, 36, 46, 60];
  private static CD = [1.7, 1.6, 1.5, 1.4, 1.2];
  private static MAX = [8, 9, 10, 11, 12];
  private mines: Mine[] = [];

  protected cooldown(): number { return MineWeapon.CD[this.level - 1]; }

  private dmg(): number {
    return MineWeapon.DMG[this.level - 1] * this.g.stats.dmg * (this.evolved ? 1.4 : 1);
  }

  private radius(): number {
    return 92 * this.g.stats.area * (this.evolved ? 1.5 : 1);
  }

  protected fire(): void {
    const g = this.g;
    if (this.mines.length >= MineWeapon.MAX[this.level - 1]) return;
    const x = g.player.x + (Math.random() - 0.5) * 72;
    const y = g.player.y + (Math.random() - 0.5) * 72;
    const img = g.add.image(x, y, 'w_mine').setDepth(900).setScale(0);
    const glow = g.add.image(x, y, 'p_dot').setDepth(899).setTint(PAL.mine).setScale(2).setAlpha(0.25);
    g.tweens.add({ targets: img, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.mines.push({ img, glow, arm: 0.4, life: 9 });
  }

  protected tick(dt: number): void {
    const g = this.g;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.arm -= dt;
      m.life -= dt;
      m.img.rotation += dt * 1.5;
      m.glow.setAlpha(0.18 + Math.sin(g.elapsed * 6) * 0.1);
      if (m.life <= 0) {
        // 过期：安静消失
        g.tweens.add({ targets: [m.img, m.glow], alpha: 0, scale: 0, duration: 300, onComplete: () => { m.img.destroy(); m.glow.destroy(); } });
        this.mines.splice(i, 1);
        continue;
      }
      if (m.arm <= 0) {
        g.grid.queryCircle(m.img.x, m.img.y, 46, queryOut);
        if (queryOut.length > 0) {
          this.explode(m);
          this.mines.splice(i, 1);
        }
      }
    }
  }

  private explode(m: Mine): void {
    const g = this.g;
    const r = this.radius();
    const x = m.img.x;
    const y = m.img.y;
    m.img.destroy();
    m.glow.destroy();
    SFX.boom(this.evolved);
    g.fx.ring(x, y, PAL.mine, r / 42, 0.4);
    g.fx.burst(x, y, { tex: 'p_star', color: PAL.mine, count: this.evolved ? 16 : 10, speed: 200, life: 0.55, scale: 1.1, spin: true });
    g.fx.burst(x, y, { tex: 'p_dot', color: 0xffffff, count: 6, speed: 120, life: 0.3 });
    g.cameras.main.shake(120, 0.0035);
    g.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      g.hitEnemy(e, this.dmg(), { kb: 300, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.7 });
    }
    if (this.evolved) {
      g.addStardust(x, y, r * 0.75, 2.5, 9 * g.stats.dmg);
    }
  }

  destroy(): void {
    this.mines.forEach((m) => { m.img.destroy(); m.glow.destroy(); });
  }
}

// ---------- 管理器 ----------

const FACTORY: Record<WeaponId, new (g: GameScene, id: WeaponId) => Weapon> = {
  blade: BladeWeapon,
  petal: PetalWeapon,
  prism: PrismWeapon,
  rain: RainWeapon,
  spark: SparkWeapon,
  boomerang: BoomerangWeapon,
  mine: MineWeapon,
};

export class WeaponManager {
  list: Weapon[] = [];

  constructor(private g: GameScene) {}

  has(id: WeaponId): boolean {
    return this.list.some((w) => w.id === id);
  }

  get(id: WeaponId): Weapon | undefined {
    return this.list.find((w) => w.id === id);
  }

  addOrUpgrade(id: WeaponId): void {
    const w = this.get(id);
    if (w) {
      if (w.level < WEAPON_MAX_LEVEL) {
        w.level++;
        w.onLevelUp();
      }
    } else {
      this.list.push(new FACTORY[id](this.g, id));
    }
  }

  /** 可进化的武器列表（满级 + 对应被动已持有） */
  evolvable(): WeaponId[] {
    const out: WeaponId[] = [];
    for (const w of this.list) {
      if (w.evolved || w.level < WEAPON_MAX_LEVEL) continue;
      const meta = WEAPON_META.find((m) => m.id === w.id);
      if (!meta) continue;
      if (meta.evolvesWith === null) {
        // 任意被动满级
        for (const lv of this.g.passives.values()) {
          if (lv >= PASSIVE_MAX_LEVEL) {
            out.push(w.id);
            break;
          }
        }
      } else if ((this.g.passives.get(meta.evolvesWith) ?? 0) > 0) {
        out.push(w.id);
      }
    }
    return out;
  }

  evolve(id: WeaponId): void {
    this.get(id)?.onEvolve();
  }

  update(dt: number): void {
    for (const w of this.list) w.update(dt);
  }

  destroy(): void {
    this.list.forEach((w) => w.destroy());
  }
}
