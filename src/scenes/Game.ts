// 主场景：编排器 — 创建世界、注册系统按序更新、实现 CombatContext、胜负判定
import Phaser from 'phaser';
import { CRIT, DROPS, HITFEEL, PLAYER } from '../content/player';
import { getMap, MapSpec } from '../content/maps';
import { DEATH_COLOR, PAL } from '../gfx/palette';
import { ENDLESS } from '../content/endless';
import { ensureMapAssets, releaseMapAssets } from '../gfx/textures';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { InputManager } from '../core/input/InputManager';
import { Meta } from '../core/MetaState';
import { RunState, Stats } from '../core/RunState';
import { getSettings } from '../core/settings';
import { TimeController } from '../core/TimeController';
import { AchievementTracker } from '../systems/AchievementTracker';
import { createArcanaModifier } from '../systems/arcana';
import type { ArcanaId } from '../content/ids';
import type { CombatContext, HitOpts, RunLaunchData, RunMode, RunModifier, RunResult, RunSystem } from '../systems/context';
import { DecorSystem } from '../systems/DecorSystem';
import { DpsTracker } from '../systems/DpsTracker';
import { Effects } from '../systems/effects';
import { Enemy, EnemySystem } from '../systems/EnemySystem';
import { SpatialGrid } from '../systems/grid';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { MapMechanicSystem } from '../systems/MapMechanicSystem';
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
  /** FPS 采样动态敌人上限（M8）：低帧率逐步压低刷怪上限并降档粒子，恢复后回升 */
  dynCapMul = 1;
  /** 武器 DPS 统计（M8 调试面板） */
  dps = new DpsTracker();
  waveDir!: WaveDirector;
  /** 规则卡钩子（M9）：每持有一张卡推入一个 modifier，create 时清空重建 */
  modifiers: RunModifier[] = [];
  charId = 'spark';
  mapId = 'meadow';
  map: MapSpec = getMap('meadow');

  private ctx!: CombatContext;
  private systems: RunSystem[] = [];
  private playerSys!: PlayerSystem;
  private inputMgr!: InputManager;
  private zonesRef!: ZoneSystem;
  private pickupsRef!: PickupSystem;
  private projectilesRef!: ProjectileSystem;
  private lastKillSfx = 0;
  /** 模式与难度（公共契约：M10 预留，M11 实装无尽与狂暴） */
  private mode: RunMode = 'normal';
  private diff: 0 | 1 | 2 = 0;
  /** hitstop 预算（M12 打击感分级）：每秒回充，超预算的微顿帧静默丢弃 */
  private hitStopBudget = HITFEEL.budgetPerSec;
  /** BGM 强度临时抬升剩余秒数（M12 surge；M18 Boss 战复用） */
  private bgmBoostT = 0;
  /** DPS 基准模式（M12，仅 DEV）：无波次/机制/成就，src/dev/bench.ts 驱动 */
  benchMode = false;

  constructor() {
    super('game');
  }

  init(data?: RunLaunchData): void {
    this.charId = data?.charId ?? 'spark';
    this.mapId = data?.mapId ?? 'meadow';
    this.map = getMap(this.mapId);
    this.mapId = this.map.id; // 未知 id 兜底草甸后回写
    this.mode = data?.mode ?? 'normal';
    this.diff = data?.diff ?? 0;
    this.benchMode = data?.bench === true && import.meta.env.DEV;
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

    // 重置局内状态（场景可重开）；角色差异（HP/移速/体积/偏移）经 RunState.char 生效
    this.run = new RunState(this.charId, this.mode, this.diff);
    this.run.mapXpK = this.map.xpK; // 升级节奏随时长档（M12：短图加快）
    this.modifiers.length = 0; // 规则卡逐局重置（LevelUpSystem 持同一数组引用，不可换新）
    this.run.pendingArcana = getSettings().arcana && !this.benchMode; // 开局三选一（设置可关；关闭即与 M8 等价）
    this.facing = { x: 1, y: 0 };
    this.grid = new SpatialGrid<Enemy>(72);
    this.lastKillSfx = 0;
    this.dynCapMul = 1;
    this.fpsSampleT = 0;
    this.hitStopBudget = HITFEEL.budgetPerSec;
    this.bgmBoostT = 0;
    this.dps = new DpsTracker();

    releaseMapAssets(this, this.map.id); // 纹理生命周期（M8）：释放其它图的懒生成纹理
    ensureMapAssets(this, this.map.id); // 本图敌人/装饰/弹体纹理懒生成（幂等）
    this.cameras.main.setBackgroundColor(this.map.paperCss);
    this.player = this.add.image(0, 0, this.run.char.tex).setDepth(1000);

    this.ctx = this.buildContext();
    this.fx = new Effects(this, this.isMobile);
    this.inputMgr = new InputManager(this, { touch: this.isMobile });
    this.enemies = new EnemySystem(this.ctx);
    this.weapons = new WeaponManager(this.ctx);
    this.levelUp = new LevelUpSystem(this.ctx, this.weapons, this.modifiers, (id) => this.grantArcana(id));
    this.playerSys = new PlayerSystem(this.ctx, this.inputMgr);
    const zones = new ZoneSystem(this.ctx);
    const pickups = new PickupSystem(this.ctx, () => this.levelUp.openChest());
    const projectiles = new ProjectileSystem(this.ctx);
    this.zonesRef = zones;
    this.pickupsRef = pickups;
    this.projectilesRef = projectiles;

    this.waveDir = new WaveDirector(this.ctx, this.enemies);

    // 按帧序注册（与拆分前 update 顺序一致；地图机制紧随波次导演）
    // bench 模式（M12 DEV）：无波次/机制/成就/玩家系统，标靶静止，只跑武器与结算链路
    this.systems = this.benchMode
      ? [
          { update: () => this.grid.rebuild(this.enemies.actives) },
          this.enemies,
          this.weapons,
          pickups,
          projectiles,
          zones,
          this.fx,
        ]
      : [
          this.playerSys,
          { update: () => this.grid.rebuild(this.enemies.actives) },
          this.waveDir,
          ...(this.map.mechanic ? [new MapMechanicSystem(this.ctx, this.map.mechanic)] : []),
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

    // 图鉴首遇点亮：本局角色与地图（bench 不计）
    if (!this.benchMode) {
      Meta.codexLight('chars', this.charId);
      Meta.codexLight('maps', this.mapId);
    }

    this.recomputeStats();
    this.weapons.addOrUpgrade(this.run.char.weapon); // 初始武器（角色配对）

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => emitEvent(this.game, 'hud:togglepause'));
    kb.on('keydown-P', () => emitEvent(this.game, 'hud:togglepause'));

    this.updateZoom();
    this.scale.on('resize', this.updateZoom, this);
    this.cameras.main.startFollow(this.player, false, 0.12, 0.12);

    if (this.benchMode) {
      // bench（M12 DEV）：不开 HUD/BGM，run.running 保持 false（主循环旁路），驱动器手动步进
      void import('../dev/bench').then((m) => m.runBench(this));
    } else {
      this.scene.launch('hud');
      this.run.running = true;
      this.setSpeed(getSettings().speed);
      SFX.startBgm(this.map.bgm); // 每图 BGM 主题（调式/速度/音色/打击乐）
    }

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
      get map() { return g.map; },
      get stats() { return g.run.stats; },
      get grid() { return g.grid; },
      get enemies() { return g.enemies; },
      get fx() { return g.fx; },
      get isMobile() { return g.isMobile; },
      get enemyCapMul() { return g.enemyCapMul * g.dynCapMul; },
      hitEnemy: (e, dmg, opts) => g.hitEnemy(e, dmg, opts),
      dmgLog: (src, dmg) => g.dps.add(src, dmg),
      onEnemyKilled: (e) => g.onEnemyKilled(e),
      damagePlayer: (d) => g.damagePlayer(d),
      hitStop: (sec) => g.requestHitStop(sec), // M12：系统侧顿帧统一走预算（演出级直用 clock）
      addZone: (z) => g.zonesRef.add(z),
      slowAt: (x, y) => g.zonesRef.slowAt(x, y),
      playerSlowAt: (x, y) => g.zonesRef.playerSlowAt(x, y),
      hasteMulAt: (x, y) => g.zonesRef.hasteMulAt(x, y),
      magnetizeGems: (x, y, r) => g.pickupsRef.magnetizeGems(x, y, r),
      spawnEnemyBullet: (spec) => g.projectilesRef.spawn(spec),
      spawnGem: (x, y, v) => g.pickupsRef.spawnGem(x, y, v),
      spawnCoin: (x, y, v) => g.pickupsRef.spawnCoin(x, y, v),
      spawnPickup: (kind, x, y) => g.pickupsRef.spawnPickup(kind, x, y),
      recomputeStats: () => g.recomputeStats(),
      bgmBoost: (sec) => { g.bgmBoostT = Math.max(g.bgmBoostT, sec); },
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

  /** 获得规则卡（M9）：开局三选一 / 宝箱再得 / 调试面板直给，叠加挂入 modifiers */
  grantArcana(id: ArcanaId): void {
    if (this.run.arcana.includes(id)) return;
    this.run.arcana.push(id);
    this.modifiers.push(createArcanaModifier(id, this.ctx));
    Meta.codexLight('arcana', id); // 图鉴首遇点亮
    this.recomputeStats();
    this.fx.ring(this.player.x, this.player.y, 0xe2b452, 9, 0.7);
    emitEvent(this.game, 'hud:refresh');
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
    this.dps.update(dt);
    this.sampleFpsCap(raw);
    // hitstop 预算回充（M12 打击感分级）
    this.hitStopBudget = Math.min(HITFEEL.budgetPerSec, this.hitStopBudget + HITFEEL.budgetPerSec * dt);
    // 长图情绪曲线同步放缓；surge 等事件期临时抬升
    this.bgmBoostT = Math.max(0, this.bgmBoostT - dt);
    SFX.setIntensity((this.run.elapsed * this.map.timeK) / 600 + (this.bgmBoostT > 0 ? 0.35 : 0));
  }

  /** FPS 采样动态敌人上限（M8）：每秒采样，低帧率（<45）逐档压低刷怪上限并降档粒子，
   *  恢复（≥57）后缓步回升。只影响 WaveDirector 的 maxAlive，已在场敌人不清除 */
  private fpsSampleT = 0;

  private sampleFpsCap(raw: number): void {
    this.fpsSampleT += raw;
    if (this.fpsSampleT < 1) return;
    this.fpsSampleT = 0;
    const fps = this.sampleFps();
    if (fps < 45) this.dynCapMul = Math.max(0.4, Math.round((this.dynCapMul - 0.1) * 100) / 100);
    else if (fps >= 57 && this.dynCapMul < 1) this.dynCapMul = Math.min(1, Math.round((this.dynCapMul + 0.05) * 100) / 100);
    this.fx.setQuality(this.dynCapMul <= 0.7 ? 0.6 : 1);
  }

  /** 独立成员便于调试覆写（运行时可替换以模拟低帧率） */
  private sampleFps(): number {
    return this.game.loop.actualFps;
  }

  // ---------- 战斗结算 ----------

  /** 预算化微顿帧（M12 打击感分级）：超预算静默丢弃，防 spark 链电/petal 多段叠成幻灯片 */
  requestHitStop(sec: number): void {
    if (this.hitStopBudget < sec) return;
    this.hitStopBudget -= sec;
    this.clock.hitStop(sec);
  }

  /** 返回实际结算伤害（DPS 统计归账用；目标已死/无效返回 0） */
  hitEnemy(e: Enemy, dmg: number, opts: HitOpts = {}): number {
    if (!e.active || e.dying) return 0;
    let final = dmg * (0.9 + Math.random() * 0.2);
    const crit = Math.random() < CRIT.chance + this.run.stats.crit;
    if (crit) final *= CRIT.mul;
    for (const m of this.modifiers) {
      if (m.modifyDamage) final = m.modifyDamage(final, e);
    }
    e.hp -= final;
    if (!opts.quiet) {
      // 打击感分级（M12）：大伤害/暴击 → 微顿帧（预算化）+ 数字分级 + 音高上抬
      const big = final >= HITFEEL.bigHitMul * this.run.stats.dmg;
      this.fx.flash(e);
      this.fx.number(e.x, e.y - e.radius, final, crit, big, e);
      SFX.hit((opts.pitch ?? 1) * (crit || big ? 1.3 : 1));
      if (crit || big) this.requestHitStop(HITFEEL.microStop);
    }
    if (opts.kb && e.knockMul > 0) {
      e.kvx += (opts.kx ?? 0) * opts.kb * e.knockMul;
      e.kvy += (opts.ky ?? 0) * opts.kb * e.knockMul;
    }
    if (e.hp <= 0) this.enemies.kill(e);
    return final;
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
      // 精英死亡 = 小高潮（M12）：冲击波双环 + 顿帧 + 低频闷响（精英是宝箱载体）
      this.run.eliteKills++;
      this.clock.hitStop(HITFEEL.eliteStop);
      this.fx.ring(e.x, e.y, DEATH_COLOR[e.id], 10, 0.65);
      this.fx.ring(e.x, e.y, 0xfff2c0, 7, 0.45);
      SFX.boom(true);
      if (getSettings().shake) this.cameras.main.shake(180, 0.005);
      this.pickupsRef.spawnPickup('chest', e.x, e.y);
      for (let i = 0; i < DROPS.eliteCoinN; i++) {
        this.pickupsRef.spawnCoin(e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 50, DROPS.eliteCoinV);
      }
    }
    if (e.isBoss) {
      // M11 无尽分叉：Boss 击杀不结算，发补给后战斗继续（Boss 每轮末重临）
      if (this.mode === 'endless') this.endlessBossDown(e);
      else this.victory(e.x, e.y);
      return;
    }
    if (e.xpVal > 0) this.pickupsRef.spawnGem(e.x, e.y, e.xpVal);
    if (Math.random() < DROPS.heartChance) this.pickupsRef.spawnPickup('heart', e.x + 10, e.y);
    if (Math.random() < DROPS.coinChance) {
      this.pickupsRef.spawnCoin(e.x - 10, e.y, Math.random() < DROPS.coinBigChance ? DROPS.coinBig : 1);
    }
  }

  /** 无尽 Boss 击杀（M11）：宝箱 + 金币雨（基础 25，轮衰减在拾取时生效）+ 全场磁吸脉冲 */
  private endlessBossDown(e: Enemy): void {
    emitEvent(this.game, 'hud:boss', false);
    this.clock.hitStop(0.2);
    if (getSettings().shake) this.cameras.main.shake(300, 0.006);
    this.fx.ring(e.x, e.y, PAL.white, 12, 0.8);
    this.pickupsRef.spawnPickup('chest', e.x, e.y);
    for (let i = 0; i < ENDLESS.bossCoinN; i++) {
      this.pickupsRef.spawnCoin(
        e.x + (Math.random() - 0.5) * 90, e.y + (Math.random() - 0.5) * 90, ENDLESS.bossCoinV,
      );
    }
    this.pickupsRef.magnetizeGems(e.x, e.y, 1e5);
    SFX.victoryJingle();
    emitEvent(this.game, 'hud:warn', 'endlessBossDown');
  }

  damagePlayer(d: number): void {
    if (this.run.iframeT > 0 || !this.run.running) return;
    if (getSettings().invincible) return; // 调试：无敌（优先于复活，不消耗次数）
    this.run.iframeT = PLAYER.iframe;
    this.run.hp -= Math.max(1, d - this.run.stats.armor); // 永久强化：护甲平减，至少 1 点
    SFX.hurt();
    this.fx.flash(this.player, 0xf08080);
    if (getSettings().shake) this.cameras.main.shake(120, 0.004);
    if (this.run.hp <= 0) {
      if (this.run.revivesLeft > 0) {
        this.revive();
        return;
      }
      this.run.hp = 0;
      this.defeat();
    }
  }

  /** 复活演出（M10）：半血归来 + 2 秒无敌 + 清屏脉冲（杂兵即死计入击杀 / Boss 击退 / 弹幕清除） */
  private revive(): void {
    const run = this.run;
    run.revivesLeft--;
    run.revivesUsed++;
    run.hp = Math.ceil(run.stats.maxHp * 0.5);
    run.iframeT = 2.0;
    const px = this.player.x;
    const py = this.player.y;
    // 清屏脉冲：分裂球死亡会原地补刷迷你球，多过几轮直到半径内无杂兵；
    // 计入击杀但不掉落（含精英宝箱与规则卡钩子产币），堵死"贴怪送死换收益"
    this.pickupsRef.suppressDrops = true;
    try {
      for (let pass = 0; pass < 4; pass++) {
        let killed = false;
        for (const e of [...this.enemies.actives]) {
          if (!e.active || e.dying || e.isBoss) continue;
          if (Math.hypot(e.x - px, e.y - py) < 360) {
            this.enemies.kill(e);
            killed = true;
          }
        }
        if (!killed) break;
      }
    } finally {
      this.pickupsRef.suppressDrops = false;
    }
    const boss = this.enemies.boss;
    if (boss && boss.active) {
      const d = Math.hypot(boss.x - px, boss.y - py) || 1;
      boss.kvx += ((boss.x - px) / d) * 520;
      boss.kvy += ((boss.y - py) / d) * 520;
    }
    this.projectilesRef.clearAll();
    this.clock.hitStop(0.25);
    this.fx.ring(px, py, 0xe2b452, 12, 0.8);
    this.fx.ring(px, py, 0xfff2c0, 9, 0.55);
    SFX.revive();
    emitEvent(this.game, 'hud:revive', run.revivesLeft);
  }

  // ---------- 胜负 ----------

  private victory(bx: number, by: number): void {
    this.run.running = false;
    this.clock.reset();
    emitEvent(this.game, 'hud:boss', false);
    if (getSettings().shake) this.cameras.main.shake(400, 0.008);
    this.fx.burst(bx, by, { tex: 'p_confetti', color: DEATH_COLOR[this.map.bossId], count: 80, speed: 320, life: 1, scale: 1.6, spin: true, grav: 200 });
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
      charId: this.charId,
      mapId: this.mapId,
      mode: this.mode,
      diff: this.diff,
      cycle: this.run.cycle,
      revivesUsed: this.run.revivesUsed,
      essence: this.run.essence.dmg + this.run.essence.cd + this.run.essence.area,
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

  // ---------- DPS 基准（M12，仅 DEV；驱动器在 src/dev/bench.ts） ----------

  /** bench 步进一帧：绕开真实时钟（run.running=false 时主循环旁路），固定步长手动驱动 */
  benchTick(dt: number): void {
    this.run.frame++;
    this.run.elapsed += dt;
    for (const s of this.systems) s.update(dt);
    this.dps.update(dt);
  }

  /** bench 配置切换之间清场：残留区域/弹体清空 + DPS 统计归零 */
  benchReset(): void {
    this.zonesRef.clearAll();
    this.projectilesRef.clearAll();
    this.dps = new DpsTracker();
  }
}
