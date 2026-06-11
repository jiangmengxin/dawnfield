// 主场景：玩家、拾取物、敌人子弹、地面装饰、升级/宝箱流程、胜负
import Phaser from 'phaser';
import {
  CRIT, DROPS, EnemyId, PASSIVE_FX, PASSIVE_MAX_LEVEL, PassiveId, PLAYER, MAX_PASSIVES,
  SPITTER, WEAPON_MAX_LEVEL, WEAPON_META, PASSIVE_META, WeaponId, dmgScale, xpForLevel,
} from '../config';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { SpatialGrid } from '../systems/grid';
import { Effects } from '../systems/effects';
import { Enemy, EnemyManager } from '../systems/enemies';
import { WeaponManager } from '../systems/weapons';
import { Joystick } from '../systems/joystick';

export interface Stats {
  dmg: number;
  cd: number;
  area: number;
  magnet: number;
  moveSpeed: number;
  projSpeed: number;
  maxHp: number;
}

export interface Offer {
  kind: 'weapon' | 'passive' | 'heal' | 'gold';
  id?: WeaponId | PassiveId;
  isNew: boolean;
  toLevel: number;
}

export interface RunResult {
  win: boolean;
  time: number;
  kills: number;
  level: number;
  build: Array<{ id: WeaponId; level: number; evolved: boolean }>;
}

interface Gem { img: Phaser.GameObjects.Image; value: number; magnet: boolean; active: boolean; born: number }
interface Pickup { img: Phaser.GameObjects.Image; kind: 'heart' | 'chest'; active: boolean }
interface Inkball { img: Phaser.GameObjects.Image; vx: number; vy: number; life: number; active: boolean }
interface Puddle { img: Phaser.GameObjects.Image; r: number; t: number }
interface Stardust { x: number; y: number; r: number; t: number; dps: number; img: Phaser.GameObjects.Image; tick: number }

const DEATH_COLOR: Record<EnemyId, number> = {
  blob: PAL.blob, midge: PAL.midge, shelly: PAL.shelly, spitter: PAL.spitter,
  dasher: PAL.dasher, splitter: PAL.splitter, mini: PAL.splitter, elite: PAL.elite, boss: PAL.boss,
};

const CHUNK = 460;
const queryOut: Enemy[] = [];

export class GameScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private hpBar!: Phaser.GameObjects.Graphics;
  facing = { x: 1, y: 0 };
  stats!: Stats;
  hp = PLAYER.hp;
  level = 1;
  xp = 0;
  xpNeed = xpForLevel(1);
  kills = 0;
  elapsed = 0;
  frame = 0;
  running = false;
  isMobile = false;
  difficultyHp = 1;
  enemyCapMul = 1;

  grid = new SpatialGrid<Enemy>(72);
  enemies!: EnemyManager;
  weapons!: WeaponManager;
  fx!: Effects;
  passives = new Map<PassiveId, number>();
  private joy: Joystick | null = null;

  private gems: Gem[] = [];
  private pickups: Pickup[] = [];
  private inkballs: Inkball[] = [];
  private puddles: Puddle[] = [];
  private stardusts: Stardust[] = [];
  private chunks = new Map<string, Phaser.GameObjects.Image[]>();
  private decorPool: Phaser.GameObjects.Image[] = [];

  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'LEFT' | 'DOWN' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private iframeT = 0;
  private touchT = 0;
  private pendingLevels = 0;
  private choosing = false;
  private timeScale = 1;
  private hitStopT = 0;
  private bounce = 0;
  private pickCombo = 0;
  private pickComboT = 0;
  private lastKillSfx = 0;

  constructor() {
    super('game');
  }

  create(): void {
    this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.enemyCapMul = this.isMobile ? 0.75 : 1;

    // 重置局内状态（场景可重开）
    this.hp = PLAYER.hp;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = xpForLevel(1);
    this.kills = 0;
    this.elapsed = 0;
    this.frame = 0;
    this.pendingLevels = 0;
    this.choosing = false;
    this.timeScale = 1;
    this.iframeT = 0;
    this.facing = { x: 1, y: 0 };
    this.passives = new Map();
    this.gems = [];
    this.pickups = [];
    this.inkballs = [];
    this.puddles = [];
    this.stardusts = [];
    this.chunks = new Map();
    this.decorPool = [];

    this.cameras.main.setBackgroundColor(PAL.paperCss);

    this.playerShadow = this.add.image(0, 0, 'shadow').setDepth(8).setScale(0.85, 0.8);
    this.player = this.add.image(0, 0, 'player').setDepth(1000);
    this.hpBar = this.add.graphics().setDepth(1e6 + 10);

    this.fx = new Effects(this, this.isMobile);
    this.enemies = new EnemyManager(this);
    this.weapons = new WeaponManager(this);
    this.recomputeStats();
    this.weapons.addOrUpgrade('blade'); // 初始武器

    const kb = this.input.keyboard!;
    this.keys = {
      W: kb.addKey('W'), A: kb.addKey('A'), S: kb.addKey('S'), D: kb.addKey('D'),
      UP: kb.addKey('UP'), LEFT: kb.addKey('LEFT'), DOWN: kb.addKey('DOWN'), RIGHT: kb.addKey('RIGHT'),
    };
    kb.on('keydown-ESC', () => this.game.events.emit('hud:togglepause'));
    kb.on('keydown-P', () => this.game.events.emit('hud:togglepause'));

    if (this.isMobile) this.joy = new Joystick(this);

    this.updateZoom();
    this.scale.on('resize', this.updateZoom, this);
    this.cameras.main.startFollow(this.player, false, 0.12, 0.12);

    this.scene.launch('hud');
    this.running = true;
    SFX.startBgm();

    this.events.on('shutdown', () => {
      this.scale.off('resize', this.updateZoom, this);
      this.weapons.destroy();
      this.fx.destroy();
      SFX.stopBgm();
    });
  }

  private updateZoom(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.sqrt(w * h) / 760, 0.8, 1.25));
  }

  // ---------- 属性 ----------

  recomputeStats(): void {
    const p = (id: PassiveId) => this.passives.get(id) ?? 0;
    this.stats = {
      dmg: 1 + PASSIVE_FX.power * p('power'),
      cd: Math.max(0.5, 1 - PASSIVE_FX.lens * p('lens')),
      area: 1 + PASSIVE_FX.cloud * p('cloud'),
      magnet: PLAYER.pickup * (1 + PASSIVE_FX.battery * p('battery')),
      moveSpeed: PLAYER.speed * (1 + PASSIVE_FX.windMove * p('wind')),
      projSpeed: 1 + PASSIVE_FX.windProj * p('wind'),
      maxHp: PLAYER.hp + PASSIVE_FX.bloomHp * p('bloom'),
    };
  }

  // ---------- 主循环 ----------

  update(_t: number, dtMs: number): void {
    if (!this.running) {
      this.fx.update(Math.min(dtMs, 50) / 1000);
      return;
    }
    let dt = Math.min(dtMs, 50) / 1000;
    if (this.hitStopT > 0) {
      this.hitStopT -= dt;
      this.timeScale = this.hitStopT > 0 ? 0.05 : 1;
    }
    dt *= this.timeScale;
    this.frame++;
    this.elapsed += dt;

    this.movePlayer(dt);
    this.grid.rebuild(this.enemies.actives);
    this.enemies.update(dt);
    this.weapons.update(dt);
    this.updateGems(dt);
    this.updatePickups();
    this.updateInkballs(dt);
    this.updatePuddles(dt);
    this.updateStardust(dt);
    this.updateTouchDamage(dt);
    this.updateDecor();
    this.fx.update(dt);

    SFX.setIntensity(this.elapsed / 600);

    if (this.pendingLevels > 0 && !this.choosing) this.openLevelUp();
  }

  private movePlayer(dt: number): void {
    let vx = 0;
    let vy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) vy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) vy += 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) vx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx += 1;
    if (this.joy && this.joy.active) {
      vx = this.joy.vx;
      vy = this.joy.vy;
    }
    const len = Math.hypot(vx, vy);
    if (len > 0.01) {
      vx /= Math.max(1, len);
      vy /= Math.max(1, len);
      this.player.x += vx * this.stats.moveSpeed * dt;
      this.player.y += vy * this.stats.moveSpeed * dt;
      this.facing.x = vx;
      this.facing.y = vy;
      if (Math.abs(vx) > 0.1) this.player.setFlipX(vx < 0);
      this.bounce += dt * 11;
    } else {
      this.bounce += dt * 3;
    }
    const b = Math.sin(this.bounce) * (len > 0.01 ? 0.07 : 0.025);
    this.player.setScale(1 + b, 1 - b);
    this.player.setDepth(1000 + this.player.y * 0.01);
    this.playerShadow.setPosition(this.player.x, this.player.y + 15);

    if (this.iframeT > 0) {
      this.iframeT -= dt;
      this.player.setAlpha(Math.sin(this.elapsed * 40) > 0 ? 1 : 0.4);
    } else {
      this.player.setAlpha(1);
    }

    // 头顶血条（受伤时显示）
    this.hpBar.clear();
    if (this.hp < this.stats.maxHp) {
      const w = 30;
      const k = Math.max(0, this.hp / this.stats.maxHp);
      this.hpBar.fillStyle(PAL.hpBack, 0.9);
      this.hpBar.fillRoundedRect(this.player.x - w / 2, this.player.y - 30, w, 5, 2.5);
      this.hpBar.fillStyle(PAL.hp, 1);
      this.hpBar.fillRoundedRect(this.player.x - w / 2, this.player.y - 30, Math.max(4, w * k), 5, 2.5);
    }
  }

  // ---------- 战斗 ----------

  hitEnemy(e: Enemy, dmg: number, opts: { kb?: number; kx?: number; ky?: number; pitch?: number; quiet?: boolean } = {}): void {
    if (!e.active || e.dying) return;
    let final = dmg * (0.9 + Math.random() * 0.2);
    const crit = Math.random() < CRIT.chance;
    if (crit) final *= CRIT.mul;
    e.hp -= final;
    if (!opts.quiet) {
      this.fx.flash(e);
      this.fx.number(e.x, e.y - e.radius, final, crit);
      SFX.hit(opts.pitch ?? 1);
    }
    if (opts.kb && e.knockMul > 0) {
      e.kvx += (opts.kx ?? 0) * opts.kb * e.knockMul;
      e.kvy += (opts.ky ?? 0) * opts.kb * e.knockMul;
    }
    if (e.hp <= 0) this.enemies.kill(e);
  }

  onEnemyKilled(e: Enemy): void {
    this.kills++;
    const color = DEATH_COLOR[e.id];
    this.fx.burst(e.x, e.y, {
      tex: 'p_confetti', color, count: e.isBoss ? 60 : e.isElite ? 30 : 6,
      speed: e.isElite || e.isBoss ? 260 : 150, life: 0.55, scale: e.isBoss ? 1.6 : 1, spin: true, grav: 240,
    });
    if (this.elapsed - this.lastKillSfx > 0.06) {
      this.lastKillSfx = this.elapsed;
      SFX.kill();
    }
    if (e.isElite) {
      this.hitStop(0.09);
      this.cameras.main.shake(180, 0.005);
      this.spawnPickup('chest', e.x, e.y);
    }
    if (e.isBoss) {
      this.victory(e.x, e.y);
      return;
    }
    if (e.xpVal > 0) this.spawnGem(e.x, e.y, e.xpVal);
    if (Math.random() < DROPS.heartChance) this.spawnPickup('heart', e.x + 10, e.y);
  }

  hitStop(sec: number): void {
    this.hitStopT = sec;
    this.timeScale = 0.05;
  }

  damagePlayer(d: number): void {
    if (this.iframeT > 0 || !this.running) return;
    this.iframeT = PLAYER.iframe;
    this.hp -= d;
    SFX.hurt();
    this.fx.flash(this.player, 0xf08080);
    this.cameras.main.shake(120, 0.004);
    if (this.hp <= 0) {
      this.hp = 0;
      this.defeat();
    }
  }

  // ---------- 敌人子弹 ----------

  spawnInkball(x: number, y: number, nx: number, ny: number): void {
    let b = this.inkballs.find((i) => !i.active);
    if (!b) {
      b = { img: this.add.image(0, 0, 'inkball').setDepth(1e5), vx: 0, vy: 0, life: 0, active: false };
      this.inkballs.push(b);
    }
    b.active = true;
    b.img.setPosition(x, y).setVisible(true);
    b.vx = nx * SPITTER.bulletSpeed;
    b.vy = ny * SPITTER.bulletSpeed;
    b.life = 5;
  }

  private updateInkballs(dt: number): void {
    for (const b of this.inkballs) {
      if (!b.active) continue;
      b.life -= dt;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      b.img.rotation += dt * 4;
      const dx = b.img.x - this.player.x;
      const dy = b.img.y - this.player.y;
      if (dx * dx + dy * dy < 18 * 18) {
        this.damagePlayer(SPITTER.bulletDmg * dmgScale(this.elapsed / 60));
        b.life = 0;
      }
      if (b.life <= 0) {
        b.active = false;
        b.img.setVisible(false);
      }
    }
  }

  // ---------- 拾取物 ----------

  spawnGem(x: number, y: number, value: number): void {
    const actives = this.gems.filter((g) => g.active);
    if (actives.length >= DROPS.gemMergeCap) {
      // 超量：并入最近的光珠
      let best: Gem | null = null;
      let bd = Infinity;
      for (const g of actives) {
        const d = (g.img.x - x) ** 2 + (g.img.y - y) ** 2;
        if (d < bd) { bd = d; best = g; }
      }
      if (best) {
        best.value += value;
        if (best.value >= 5) best.img.setTint(PAL.gemBig).setScale(1.25);
      }
      return;
    }
    let g = this.gems.find((i) => !i.active);
    if (!g) {
      g = { img: this.add.image(0, 0, 'gem').setDepth(500), value: 0, magnet: false, active: false, born: 0 };
      this.gems.push(g);
    }
    g.active = true;
    g.magnet = false;
    g.value = value;
    g.born = this.elapsed;
    g.img.setPosition(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 14)
      .setVisible(true)
      .setScale(value >= 5 ? 1.25 : 0.9)
      .setTint(value >= 5 ? PAL.gemBig : PAL.gem);
  }

  magnetizeGems(x: number, y: number, r: number): void {
    const r2 = r * r;
    for (const g of this.gems) {
      if (!g.active || g.magnet) continue;
      const dx = g.img.x - x;
      const dy = g.img.y - y;
      if (dx * dx + dy * dy < r2) g.magnet = true;
    }
  }

  private updateGems(dt: number): void {
    this.pickComboT -= dt;
    if (this.pickComboT <= 0) this.pickCombo = 0;
    const px = this.player.x;
    const py = this.player.y;
    const m2 = this.stats.magnet * this.stats.magnet;
    for (const g of this.gems) {
      if (!g.active) continue;
      const dx = px - g.img.x;
      const dy = py - g.img.y;
      const d2 = dx * dx + dy * dy;
      if (!g.magnet && d2 < m2) g.magnet = true;
      if (g.magnet) {
        const d = Math.sqrt(d2) || 1;
        const sp = 420 + (this.stats.magnet - d) * 2;
        g.img.x += (dx / d) * sp * dt;
        g.img.y += (dy / d) * sp * dt;
        if (d < 22) {
          g.active = false;
          g.img.setVisible(false);
          this.addXp(g.value);
          this.pickCombo++;
          this.pickComboT = 0.7;
          SFX.pickup(this.pickCombo);
          this.fx.burst(px, py - 8, { tex: 'p_dot', color: PAL.gemBig, count: 2, speed: 60, life: 0.25, scale: 0.6 });
        }
      } else {
        g.img.y += Math.sin(this.elapsed * 3 + g.born * 7) * 0.18;
      }
    }
  }

  addXp(v: number): void {
    this.xp += v;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = xpForLevel(this.level);
      this.pendingLevels++;
    }
  }

  spawnPickup(kind: 'heart' | 'chest', x: number, y: number): void {
    let p = this.pickups.find((i) => !i.active);
    if (!p) {
      p = { img: this.add.image(0, 0, kind).setDepth(600), kind, active: false };
      this.pickups.push(p);
    }
    p.kind = kind;
    p.active = true;
    p.img.setTexture(kind).setPosition(x, y).setVisible(true).setScale(0);
    this.tweens.add({ targets: p.img, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  private updatePickups(): void {
    for (const p of this.pickups) {
      if (!p.active) continue;
      p.img.y += Math.sin(this.elapsed * 3) * 0.15;
      const dx = p.img.x - this.player.x;
      const dy = p.img.y - this.player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        p.active = false;
        p.img.setVisible(false);
        if (p.kind === 'heart') {
          this.hp = Math.min(this.stats.maxHp, this.hp + DROPS.heartHeal);
          SFX.heal();
          this.fx.burst(this.player.x, this.player.y, { tex: 'p_dot', color: PAL.heart, count: 8, speed: 80, life: 0.5, grav: -80 });
        } else {
          this.openChest();
        }
      }
    }
  }

  // ---------- 水洼 / 星尘 ----------

  addPuddle(x: number, y: number, r: number, dur: number): void {
    const img = this.add.image(x, y, 'w_puddle').setDepth(6).setScale((r * 2) / 96).setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 200 });
    this.puddles.push({ img, r, t: dur });
  }

  slowAt(x: number, y: number): boolean {
    for (const p of this.puddles) {
      const dx = x - p.img.x;
      const dy = y - p.img.y;
      if (dx * dx + dy * dy * 4 < p.r * p.r) return true;
    }
    return false;
  }

  private updatePuddles(dt: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      p.t -= dt;
      if (p.t <= 0) {
        const img = p.img;
        this.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
        this.puddles.splice(i, 1);
      }
    }
  }

  addStardust(x: number, y: number, r: number, dur: number, dps: number): void {
    const img = this.add.image(x, y, 'p_dot').setDepth(7).setTint(PAL.mine).setAlpha(0.3).setScale((r * 2) / 16);
    this.stardusts.push({ x, y, r, t: dur, dps, img, tick: 0 });
  }

  private updateStardust(dt: number): void {
    for (let i = this.stardusts.length - 1; i >= 0; i--) {
      const s = this.stardusts[i];
      s.t -= dt;
      s.tick -= dt;
      s.img.setAlpha(0.2 + Math.sin(this.elapsed * 8) * 0.08);
      if (s.tick <= 0) {
        s.tick = 0.25;
        this.grid.queryCircle(s.x, s.y, s.r, queryOut);
        for (const e of queryOut) this.hitEnemy(e, s.dps * 0.25, { quiet: true });
        if (Math.random() < 0.6) {
          this.fx.burst(s.x + (Math.random() - 0.5) * s.r, s.y + (Math.random() - 0.5) * s.r,
            { tex: 'p_star', color: PAL.mine, count: 1, speed: 20, life: 0.4, scale: 0.7 });
        }
      }
      if (s.t <= 0) {
        const img = s.img;
        this.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() });
        this.stardusts.splice(i, 1);
      }
    }
  }

  // ---------- 接触伤害 ----------

  private updateTouchDamage(dt: number): void {
    this.touchT -= dt;
    if (this.touchT > 0) return;
    this.touchT = PLAYER.touchTick;
    this.grid.queryCircle(this.player.x, this.player.y, PLAYER.radius, queryOut);
    let worst = 0;
    for (const e of queryOut) worst = Math.max(worst, e.dmg);
    if (worst > 0) this.damagePlayer(worst);
  }

  // ---------- 升级 / 宝箱 ----------

  private openLevelUp(): void {
    this.choosing = true;
    this.pendingLevels--;
    SFX.levelup();
    this.fx.ring(this.player.x, this.player.y, PAL.xp, 7, 0.6);
    const offers = this.buildOffers();
    this.scene.pause();
    this.game.events.emit('hud:levelup', offers);
  }

  private buildOffers(): Offer[] {
    type Cand = { offer: Offer; w: number };
    const cands: Cand[] = [];
    for (const meta of WEAPON_META) {
      const w = this.weapons.get(meta.id);
      if (w) {
        if (w.level < WEAPON_MAX_LEVEL && !w.evolved) {
          cands.push({ offer: { kind: 'weapon', id: meta.id, isNew: false, toLevel: w.level + 1 }, w: 3 });
        }
      } else if (this.weapons.list.length < 4) {
        cands.push({ offer: { kind: 'weapon', id: meta.id, isNew: true, toLevel: 1 }, w: 2.2 });
      }
    }
    for (const meta of PASSIVE_META) {
      const lv = this.passives.get(meta.id) ?? 0;
      if (lv > 0) {
        if (lv < PASSIVE_MAX_LEVEL) {
          cands.push({ offer: { kind: 'passive', id: meta.id, isNew: false, toLevel: lv + 1 }, w: 2.5 });
        }
      } else if (this.passives.size < MAX_PASSIVES) {
        cands.push({ offer: { kind: 'passive', id: meta.id, isNew: true, toLevel: 1 }, w: 2 });
      }
    }
    if (cands.length === 0) {
      return [
        { kind: 'heal', isNew: false, toLevel: 0 },
        { kind: 'gold', isNew: false, toLevel: 0 },
      ];
    }
    const out: Offer[] = [];
    for (let pick = 0; pick < 3 && cands.length > 0; pick++) {
      let sum = 0;
      for (const c of cands) sum += c.w;
      let r = Math.random() * sum;
      let idx = 0;
      for (let i = 0; i < cands.length; i++) {
        r -= cands[i].w;
        if (r <= 0) { idx = i; break; }
      }
      out.push(cands[idx].offer);
      cands.splice(idx, 1);
    }
    return out;
  }

  /** HUD 选卡后回调 */
  applyOffer(offer: Offer): void {
    this.choosing = false;
    if (offer.kind === 'weapon' && offer.id) {
      this.weapons.addOrUpgrade(offer.id as WeaponId);
    } else if (offer.kind === 'passive' && offer.id) {
      const id = offer.id as PassiveId;
      this.passives.set(id, (this.passives.get(id) ?? 0) + 1);
      this.recomputeStats();
      if (id === 'bloom') this.hp = Math.min(this.stats.maxHp, this.hp + PASSIVE_FX.bloomHp);
    } else if (offer.kind === 'heal') {
      this.hp = Math.min(this.stats.maxHp, this.hp + 40);
      SFX.heal();
    } else if (offer.kind === 'gold') {
      this.addXp(40);
    }
    this.game.events.emit('hud:refresh');
  }

  private openChest(): void {
    const evolvable = this.weapons.evolvable();
    const pick = evolvable.length > 0 ? evolvable[Math.floor(Math.random() * evolvable.length)] : null;
    SFX.chest();
    this.scene.pause();
    this.game.events.emit('hud:chest', pick);
  }

  /** HUD 宝箱动画结束后回调 */
  applyChest(weaponId: WeaponId | null): void {
    if (weaponId) {
      this.weapons.evolve(weaponId);
      SFX.evolve();
    } else {
      this.addXp(80);
      this.hp = Math.min(this.stats.maxHp, this.hp + 30);
    }
    this.game.events.emit('hud:refresh');
  }

  // ---------- 地面装饰（无限延展的草甸） ----------

  private updateDecor(): void {
    if (this.frame % 10 !== 0) return;
    const cam = this.cameras.main;
    const view = cam.worldView;
    const x0 = Math.floor((view.x - CHUNK / 2) / CHUNK);
    const x1 = Math.floor((view.right + CHUNK / 2) / CHUNK);
    const y0 = Math.floor((view.y - CHUNK / 2) / CHUNK);
    const y1 = Math.floor((view.bottom + CHUNK / 2) / CHUNK);
    const want = new Set<string>();
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = cx + ',' + cy;
        want.add(key);
        if (!this.chunks.has(key)) this.makeChunk(key, cx, cy);
      }
    }
    for (const [key, imgs] of this.chunks) {
      if (!want.has(key)) {
        for (const img of imgs) {
          img.setVisible(false);
          this.decorPool.push(img);
        }
        this.chunks.delete(key);
      }
    }
  }

  private makeChunk(key: string, cx: number, cy: number): void {
    // 确定性伪随机：同一 chunk 永远长一样
    let seed = (cx * 374761393 + cy * 668265263) ^ 0x5bf03635;
    const rnd = () => {
      seed = (seed ^ (seed << 13)) | 0;
      seed = (seed ^ (seed >>> 17)) | 0;
      seed = (seed ^ (seed << 5)) | 0;
      return ((seed >>> 0) % 10000) / 10000;
    };
    const imgs: Phaser.GameObjects.Image[] = [];
    const place = (tex: string, n: number) => {
      for (let i = 0; i < n; i++) {
        let img = this.decorPool.pop();
        if (!img) {
          img = this.add.image(0, 0, tex);
        } else {
          img.setTexture(tex);
        }
        img.setPosition(cx * CHUNK + rnd() * CHUNK, cy * CHUNK + rnd() * CHUNK)
          .setDepth(2)
          .setVisible(true)
          .setAlpha(0.85)
          .setScale(0.8 + rnd() * 0.5)
          .setFlipX(rnd() > 0.5);
        imgs.push(img);
      }
    };
    const density = this.isMobile ? 0.6 : 1;
    place('d_grass' + Math.floor(rnd() * 3), Math.round((3 + rnd() * 3) * density));
    if (rnd() < 0.75) place('d_flower' + Math.floor(rnd() * 3), Math.round((1 + rnd() * 2) * density));
    if (rnd() < 0.5) place('d_pebble' + Math.floor(rnd() * 2), 1);
    this.chunks.set(key, imgs);
  }

  // ---------- 胜负 ----------

  private victory(bx: number, by: number): void {
    this.running = false;
    this.hitStopT = 0;
    this.game.events.emit('hud:boss', false);
    this.cameras.main.shake(400, 0.008);
    this.fx.burst(bx, by, { tex: 'p_confetti', color: PAL.boss, count: 80, speed: 320, life: 1, scale: 1.6, spin: true, grav: 200 });
    this.fx.ring(bx, by, PAL.white, 12, 0.8);
    this.enemies.clearAllSoft();
    SFX.victoryJingle();
    this.time.delayedCall(1500, () => this.finish(true));
  }

  private defeat(): void {
    this.running = false;
    SFX.defeatJingle();
    this.fx.burst(this.player.x, this.player.y, { tex: 'p_dot', color: PAL.playerBody, count: 24, speed: 160, life: 0.8 });
    this.player.setVisible(false);
    this.hpBar.clear();
    this.time.delayedCall(1300, () => this.finish(false));
  }

  private finish(win: boolean): void {
    const result: RunResult = {
      win,
      time: this.elapsed,
      kills: this.kills,
      level: this.level,
      build: this.weapons.list.map((w) => ({ id: w.id, level: w.level, evolved: w.evolved })),
    };
    this.scene.stop('hud');
    this.scene.start('result', result);
  }
}
