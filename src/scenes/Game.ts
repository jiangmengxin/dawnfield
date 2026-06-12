// 主场景：编排器 — 创建世界、注册系统按序更新、实现 CombatContext、胜负判定
import Phaser from 'phaser';
import { CRIT, DROPS, PLAYER } from '../content/player';
import { DEATH_COLOR, PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { InputManager } from '../core/input/InputManager';
import { Meta } from '../core/MetaState';
import { RunState, Stats } from '../core/RunState';
import { getSettings } from '../core/settings';
import { TimeController } from '../core/TimeController';
import { AchievementTracker } from '../systems/AchievementTracker';
import type { CombatContext, HitOpts, RunModifier, RunResult, RunSystem } from '../systems/context';
import { DecorSystem } from '../systems/DecorSystem';
import { Effects } from '../systems/effects';
import { Enemy, EnemySystem } from '../systems/EnemySystem';
import { SpatialGrid } from '../systems/grid';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { WaveDirector } from '../systems/WaveDirector';
import { WeaponManager } from '../systems/weapons';
import { ZoneSystem } from '../systems/ZoneSystem';
import { Viewport } from '../ui/Viewport';

export class GameScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Image;
  facing = { x: 1, y: 0 };
  run = new RunState();
  clock = new TimeController(this);
  grid = new SpatialGrid<Enemy>(72);
  enemies!: EnemySystem;
  weapons!: WeaponManager;
  levelUp!: LevelUpSystem;
  fx!: Effects;
  isMobile = false;
  enemyCapMul = 1;
  /** 规则卡钩子（M9 实装，当前恒为空） */
  modifiers: RunModifier[] = [];
  charId = 'spark';
  mapId = 'meadow';

  private ctx!: CombatContext;
  private systems: RunSystem[] = [];
  private playerSys!: PlayerSystem;
  private inputMgr!: InputManager;
  private zonesRef!: ZoneSystem;
  private pickupsRef!: PickupSystem;
  private projectilesRef!: ProjectileSystem;
  private lastKillSfx = 0;

  constructor() {
    super('game');
  }

  init(data?: { charId?: string; mapId?: string }): void {
    this.charId = data?.charId ?? 'spark';
    this.mapId = data?.mapId ?? 'meadow';
  }

  get speed(): 1 | 2 {
    return this.clock.speed;
  }

  setSpeed(v: 1 | 2): void {
    this.clock.setSpeed(v);
  }

  create(): void {
    this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.enemyCapMul = this.isMobile ? 0.75 : 1;

    // 重置局内状态（场景可重开）
    this.run = new RunState();
    this.facing = { x: 1, y: 0 };
    this.grid = new SpatialGrid<Enemy>(72);
    this.lastKillSfx = 0;

    this.cameras.main.setBackgroundColor(PAL.paperCss);
    this.player = this.add.image(0, 0, 'player').setDepth(1000);

    this.ctx = this.buildContext();
    this.fx = new Effects(this, this.isMobile);
    this.inputMgr = new InputManager(this, { touch: this.isMobile });
    this.enemies = new EnemySystem(this.ctx);
    this.weapons = new WeaponManager(this.ctx);
    this.levelUp = new LevelUpSystem(this.ctx, this.weapons, this.modifiers);
    this.playerSys = new PlayerSystem(this.ctx, this.inputMgr);
    const zones = new ZoneSystem(this.ctx);
    const pickups = new PickupSystem(this.ctx, () => this.levelUp.openChest());
    const projectiles = new ProjectileSystem(this.ctx);
    this.zonesRef = zones;
    this.pickupsRef = pickups;
    this.projectilesRef = projectiles;

    // 按帧序注册（与拆分前 update 顺序一致）
    this.systems = [
      this.playerSys,
      { update: () => this.grid.rebuild(this.enemies.actives) },
      new WaveDirector(this.ctx, this.enemies),
      this.enemies,
      this.weapons,
      pickups,
      projectiles,
      zones,
      this.playerSys.contact,
      new DecorSystem(this.ctx),
      this.fx,
      this.levelUp,
      new AchievementTracker(this.ctx, this.weapons),
    ];

    // 图鉴首遇点亮：本局角色与地图
    Meta.codexLight('chars', this.charId);
    Meta.codexLight('maps', this.mapId);

    this.recomputeStats();
    this.weapons.addOrUpgrade('blade'); // 初始武器

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => emitEvent(this.game, 'hud:togglepause'));
    kb.on('keydown-P', () => emitEvent(this.game, 'hud:togglepause'));

    this.updateZoom();
    this.scale.on('resize', this.updateZoom, this);
    this.cameras.main.startFollow(this.player, false, 0.12, 0.12);

    this.scene.launch('hud');
    this.run.running = true;
    this.setSpeed(getSettings().speed);
    SFX.startBgm();

    this.events.on('shutdown', () => {
      this.scale.off('resize', this.updateZoom, this);
      this.weapons.destroy();
      this.fx.destroy();
      this.inputMgr.destroy();
      SFX.stopBgm();
    });
  }

  /** CombatContext：各系统看到的世界 */
  private buildContext(): CombatContext {
    const g = this;
    return {
      get scene() { return g as Phaser.Scene; },
      get player() { return g.player; },
      get facing() { return g.facing; },
      get run() { return g.run; },
      get stats() { return g.run.stats; },
      get grid() { return g.grid; },
      get enemies() { return g.enemies; },
      get fx() { return g.fx; },
      get isMobile() { return g.isMobile; },
      get enemyCapMul() { return g.enemyCapMul; },
      hitEnemy: (e, dmg, opts) => g.hitEnemy(e, dmg, opts),
      onEnemyKilled: (e) => g.onEnemyKilled(e),
      damagePlayer: (d) => g.damagePlayer(d),
      hitStop: (sec) => g.clock.hitStop(sec),
      addZone: (z) => g.zonesRef.add(z),
      slowAt: (x, y) => g.zonesRef.slowAt(x, y),
      magnetizeGems: (x, y, r) => g.pickupsRef.magnetizeGems(x, y, r),
      spawnEnemyBullet: (spec) => g.projectilesRef.spawn(spec),
      spawnGem: (x, y, v) => g.pickupsRef.spawnGem(x, y, v),
      spawnPickup: (kind, x, y) => g.pickupsRef.spawnPickup(kind, x, y),
      recomputeStats: () => g.recomputeStats(),
    };
  }

  private updateZoom(): void {
    // 变焦档位按 CSS 尺寸决定，再乘 DPR 映射到物理像素（画布以物理像素渲染）
    const vp = Viewport.get();
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.sqrt(vp.w * vp.h) / 760, 0.8, 1.25) * vp.dpr);
  }

  recomputeStats(): void {
    const mods = this.modifiers
      .map((m) => m.statMods?.bind(m))
      .filter((f): f is (s: Stats) => void => f !== undefined);
    this.run.recomputeStats(mods);
  }

  // ---------- 主循环 ----------

  update(_t: number, dtMs: number): void {
    const raw = Math.min(dtMs, 50) / 1000;
    if (!this.run.running) {
      this.fx.update(raw);
      return;
    }
    const dt = this.clock.step(raw);
    this.run.frame++;
    this.run.elapsed += dt;
    for (const s of this.systems) s.update(dt);
    for (const m of this.modifiers) m.onTick?.(dt, this.ctx);
    SFX.setIntensity(this.run.elapsed / 600);
  }

  // ---------- 战斗结算 ----------

  hitEnemy(e: Enemy, dmg: number, opts: HitOpts = {}): void {
    if (!e.active || e.dying) return;
    let final = dmg * (0.9 + Math.random() * 0.2);
    const crit = Math.random() < CRIT.chance + this.run.stats.crit;
    if (crit) final *= CRIT.mul;
    for (const m of this.modifiers) {
      if (m.modifyDamage) final = m.modifyDamage(final, e);
    }
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
    this.run.kills++;
    this.fx.burst(e.x, e.y, {
      tex: 'p_confetti', color: DEATH_COLOR[e.id], count: e.isBoss ? 60 : e.isElite ? 30 : 6,
      speed: e.isElite || e.isBoss ? 260 : 150, life: 0.55, scale: e.isBoss ? 1.6 : 1, spin: true, grav: 240,
    });
    if (this.run.elapsed - this.lastKillSfx > 0.06) {
      this.lastKillSfx = this.run.elapsed;
      SFX.kill();
    }
    for (const m of this.modifiers) m.onEnemyKilled?.(e, this.ctx);
    if (e.isElite) {
      this.run.eliteKills++;
      this.clock.hitStop(0.09);
      if (getSettings().shake) this.cameras.main.shake(180, 0.005);
      this.pickupsRef.spawnPickup('chest', e.x, e.y);
      for (let i = 0; i < DROPS.eliteCoinN; i++) {
        this.pickupsRef.spawnCoin(e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 50, DROPS.eliteCoinV);
      }
    }
    if (e.isBoss) {
      this.victory(e.x, e.y);
      return;
    }
    if (e.xpVal > 0) this.pickupsRef.spawnGem(e.x, e.y, e.xpVal);
    if (Math.random() < DROPS.heartChance) this.pickupsRef.spawnPickup('heart', e.x + 10, e.y);
    if (Math.random() < DROPS.coinChance) {
      this.pickupsRef.spawnCoin(e.x - 10, e.y, Math.random() < DROPS.coinBigChance ? DROPS.coinBig : 1);
    }
  }

  damagePlayer(d: number): void {
    if (this.run.iframeT > 0 || !this.run.running) return;
    if (getSettings().invincible) return; // 调试：无敌
    this.run.iframeT = PLAYER.iframe;
    this.run.hp -= Math.max(1, d - this.run.stats.armor); // 永久强化：护甲平减，至少 1 点
    SFX.hurt();
    this.fx.flash(this.player, 0xf08080);
    if (getSettings().shake) this.cameras.main.shake(120, 0.004);
    if (this.run.hp <= 0) {
      this.run.hp = 0;
      this.defeat();
    }
  }

  // ---------- 胜负 ----------

  private victory(bx: number, by: number): void {
    this.run.running = false;
    this.clock.reset();
    emitEvent(this.game, 'hud:boss', false);
    if (getSettings().shake) this.cameras.main.shake(400, 0.008);
    this.fx.burst(bx, by, { tex: 'p_confetti', color: PAL.boss, count: 80, speed: 320, life: 1, scale: 1.6, spin: true, grav: 200 });
    this.fx.ring(bx, by, PAL.white, 12, 0.8);
    this.enemies.clearAllSoft();
    SFX.victoryJingle();
    this.time.delayedCall(1500, () => this.finish(true));
  }

  private defeat(): void {
    this.run.running = false;
    SFX.defeatJingle();
    this.fx.burst(this.player.x, this.player.y, { tex: 'p_dot', color: PAL.playerBody, count: 24, speed: 160, life: 0.8 });
    this.playerSys.onDefeat();
    this.time.delayedCall(1300, () => this.finish(false));
  }

  private finish(win: boolean): void {
    const result: RunResult = {
      win,
      time: this.run.elapsed,
      kills: this.run.kills,
      level: this.run.level,
      coins: Math.round(this.run.coins),
      build: this.weapons.list.map((w) => ({ id: w.id, level: w.level, evolved: w.evolved })),
    };
    this.scene.stop('hud');
    this.scene.start('result', result);
  }

  // ---------- 调试 ----------

  /** 调试信息：实体计数（HUD 调试行显示） */
  get debugCounts(): { gems: number; coins: number; bullets: number; zones: number } {
    return {
      gems: this.pickupsRef.gemCount,
      coins: this.pickupsRef.coinCount,
      bullets: this.projectilesRef.activeCount,
      zones: this.zonesRef.count,
    };
  }

  /** 调试：时间跳跃（波次/事件/成长曲线随 elapsed 前进） */
  debugTimeSkip(sec: number): void {
    this.run.elapsed += sec;
  }
}
