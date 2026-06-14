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
import { shakeCam } from '../gfx/shake';
import { GameSpeed, TimeController } from '../core/TimeController';
import { AchievementTracker } from '../systems/AchievementTracker';
import { createArcanaModifier } from '../systems/arcana';
import type { ArcanaId, WeaponId } from '../content/ids';
import { DROP_RATES, rollCommonDrop, weightedDrop } from '../content/dropItems';
import { WEAPON_META } from '../content/weapons';
import type { CombatContext, DropState, HitOpts, RunLaunchData, RunMode, RunModifier, RunResult, RunSystem } from '../systems/context';
import { DecorSystem } from '../systems/DecorSystem';
import { DropItemSystem } from '../systems/dropItems';
import { DpsTracker } from '../systems/DpsTracker';
import { Effects } from '../systems/effects';
import { Enemy, EnemySystem } from '../systems/EnemySystem';
import { SpatialGrid } from '../systems/grid';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { MapMechanicSystem } from '../systems/MapMechanicSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { TipSystem } from '../systems/TipSystem';
import { createTraitModifier } from '../systems/traits';
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
  private mechSys: MapMechanicSystem | null = null; // M18：机制调度器引用（onEnemyKilled 转发用）
  private wind = { x: 0, y: 0 }; // M18 hills 山风：wind 机制每帧写，Player/Enemy 系统读
  private envSlowVal = 1; // M18 tide 涨潮：玩家环境减速乘子（tide 每帧覆写）
  private mechDmgMulVal = 1; // M18 lavender 花粉：机制伤害乘区（hitEnemy 读）
  private enemyHpMulVal = 1; // M18 summit 烽台：敌人生成 HP 乘区（spawn 读）
  private obstaclesArr: Array<{ x: number; y: number; r: number }> = []; // M18 bramble 荆棘墙
  /** M19 掉落道具：HUD 倒计时读 dropSys.activeEffects；持续效果聚合态写 dropStateVal */
  dropSys!: DropItemSystem;
  private dropStateVal: DropState = { cdMul: 1, moveMul: 1, dmgMul: 1, areaMul: 1, invuln: false, freeze: false };
  private inputMgr!: InputManager;
  private zonesRef!: ZoneSystem;
  private pickupsRef!: PickupSystem;
  private projectilesRef!: ProjectileSystem;
  private lastKillSfx = 0;
  /** 模式与难度（公共契约：M10 预留，M11 实装无尽与狂暴） */
  private mode: RunMode = 'normal';
  private diff: 0 | 1 | 2 = 0;
  /** M20 选图页模式开关（init 读取，create 透传 RunState） */
  private flags: { arcana?: boolean; random?: boolean; speed2x?: boolean; breakthrough?: boolean } = {};
  /** hitstop 预算（M12 打击感分级）：每秒回充，超预算的微顿帧静默丢弃 */
  private hitStopBudget = HITFEEL.budgetPerSec;
  /** BGM 强度临时抬升剩余秒数（M12 surge；M18 Boss 战复用） */
  private bgmBoostT = 0;
  /** DPS 基准模式（M12，仅 DEV）：无波次/机制/成就，src/dev/bench.ts 驱动 */
  benchMode = false;
  private bossTestPhase: 'p1' | 'p2' | null = null;

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
    this.flags = {
      arcana: data?.arcana, random: data?.random, speed2x: data?.speed2x, breakthrough: data?.breakthrough,
    };
    this.benchMode = data?.bench === true && import.meta.env.DEV;
    this.bossTestPhase = import.meta.env.DEV && data?.bossTest ? data.bossTest : null;
  }

  get speed(): GameSpeed {
    return this.clock.speed;
  }

  setSpeed(v: GameSpeed): void {
    this.clock.setSpeed(v);
  }

  create(): void {
    this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.enemyCapMul = this.isMobile ? 0.75 : 1;

    // 重置局内状态（场景可重开）；角色差异（HP/移速/体积/偏移）经 RunState.char 生效
    this.run = new RunState(this.charId, this.mode, this.diff, this.flags);
    this.run.mapXpK = this.map.xpK; // 升级节奏随时长档（M12：短图加快）
    this.modifiers.length = 0; // 规则卡逐局重置（LevelUpSystem 持同一数组引用，不可换新）
    this.run.pendingArcana = this.run.arcanaMode && !this.benchMode; // 开局三选一（M20 规则模式开关；关闭即与 M8 等价）
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
    const pickups = new PickupSystem(this.ctx, (arcana) => (arcana ? this.levelUp.openArcanaChest() : this.levelUp.openChest()));
    const projectiles = new ProjectileSystem(this.ctx);
    this.zonesRef = zones;
    this.pickupsRef = pickups;
    this.projectilesRef = projectiles;
    // M19 掉落道具：拾取（PickupSystem）→ collect（DropItemSystem 结算/计时）
    this.dropSys = new DropItemSystem(this.ctx);
    pickups.onDropCollect = (id) => this.dropSys.collect(id);

    // 角色专属 trait（M14）：在一切规则卡之前挂入（其余 11 角色无 trait，零开销缺省路径）
    if (this.run.char.trait && !this.benchMode) {
      this.modifiers.push(createTraitModifier(this.run.char.trait, this.ctx, this.weapons));
    }

    // M16 草甸秘密花圃彩蛋：每局 35% 概率刷出（站立 5s 绽放 → 隐藏成就 secretBloom）
    this.secretSpot = null;
    if (!this.benchMode && !this.bossTestPhase && this.mapId === 'meadow' && Math.random() < 0.35) this.spawnSecretBloom();

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
          ...((this.mechSys = this.map.mechanics.length ? new MapMechanicSystem(this.ctx, this.map.mechanics) : null) ? [this.mechSys!] : []),
          this.enemies,
          this.weapons,
          pickups,
          this.dropSys, // M19 掉落道具：持续效果计时 + 场景物生成/破坏
          projectiles,
          zones,
          this.playerSys.contact,
          new DecorSystem(this.ctx),
          this.fx,
          this.levelUp,
          new AchievementTracker(this.ctx, this.weapons),
          new TipSystem(this.ctx, this.weapons), // M14 首局进化引导（tipsSeen 节流）
          ...(this.secretSpot ? [{ update: (dt: number) => this.updateSecretBloom(dt) }] : []),
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
      // bench（M12 DEV）：不开 HUD/BGM；running 须为 true（武器延迟伤害回调以
      // !run.running 守卫），真实主循环改由 update 的 benchMode 旁路，驱动器手动步进
      this.run.running = true;
      void import('../dev/bench').then((m) => m.runBench(this));
    } else {
      // 倍速模式开局 2×；否则沿用设置里持久化的基础倍速（HUD 启动即按此速读初始标签）
      this.setSpeed(this.run.speed2x ? 2 : getSettings().speed);
      this.scene.launch('hud');
      this.run.running = true;
      SFX.startBgm(this.map.bgm); // 每图 BGM 主题（调式/速度/音色/打击乐）
      if (this.bossTestPhase) this.startBossTest(this.bossTestPhase);
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
      get weaponCount() { return g.weapons.list.length; },
      hitEnemy: (e, dmg, opts) => g.hitEnemy(e, dmg, opts),
      castFx: (id) => g.castFx(id),
      get windVec() { return g.wind; },
      get envSlow() { return g.envSlowVal; },
      setEnvSlow: (v) => { g.envSlowVal = v; },
      get mechDmgMul() { return g.mechDmgMulVal; },
      setMechDmgMul: (v) => { g.mechDmgMulVal = v; },
      get enemyHpMul() { return g.enemyHpMulVal; },
      setEnemyHpMul: (v) => { g.enemyHpMulVal = v; },
      get obstacles() { return g.obstaclesArr; },
      mechanicNotifyKill: (e) => g.mechSys?.notifyKill(e),
      dmgLog: (src, dmg) => g.dps.add(src, dmg),
      onEnemyKilled: (e) => g.onEnemyKilled(e),
      damagePlayer: (d, src) => g.damagePlayer(d, src),
      hitStop: (sec) => g.requestHitStop(sec), // M12：系统侧顿帧统一走预算（演出级直用 clock）
      addZone: (z) => g.zonesRef.add(z),
      slowAt: (x, y) => g.zonesRef.slowAt(x, y),
      playerSlowAt: (x, y) => g.zonesRef.playerSlowAt(x, y),
      hasteMulAt: (x, y) => g.zonesRef.hasteMulAt(x, y),
      magnetizeGems: (x, y, r) => g.pickupsRef.magnetizeGems(x, y, r),
      magnetizeAll: () => g.pickupsRef.magnetizeAll(),
      spawnEnemyBullet: (spec) => g.projectilesRef.spawn(spec),
      spawnGem: (x, y, v) => g.pickupsRef.spawnGem(x, y, v),
      spawnCoin: (x, y, v) => g.pickupsRef.spawnCoin(x, y, v),
      spawnPickup: (kind, x, y) => g.pickupsRef.spawnPickup(kind, x, y),
      spawnDropItem: (id, x, y) => g.pickupsRef.spawnDropPickup(id, x, y),
      spawnMapDrop: (x, y) => g.spawnMapDrop(x, y),
      get enemyFrozen() { return g.dropStateVal.freeze; },
      setDropState: (s) => g.setDropState(s),
      recomputeStats: () => g.recomputeStats(),
      bgmBoost: (sec) => { g.bgmBoostT = Math.max(g.bgmBoostT, sec); },
      // M13 契约：构筑随机统一入口（M17 注入种子流时只换此实现）
      rng: () => Math.random(),
      notifyCoinPicked: (v) => {
        for (const m of g.modifiers) m.onCoinPicked?.(v, g.ctx);
      },
      notifyGemPicked: (v) => {
        for (const m of g.modifiers) m.onGemPicked?.(v, g.ctx);
      },
      notifyEvolve: (id) => {
        if (g.run.firstEvolveAt === Infinity) g.run.firstEvolveAt = g.run.elapsed;
        for (const m of g.modifiers) m.onEvolve?.(id, g.ctx);
      },
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
    // M19 掉落道具持续 buff（疾风号角/花粉狂热/顺风等）：在规则卡之后乘入，到期由 dropSys 复位
    const d = this.dropStateVal;
    const s = this.run.stats;
    if (d.dmgMul !== 1) s.dmg *= d.dmgMul;
    if (d.areaMul !== 1) s.area *= d.areaMul;
    if (d.moveMul !== 1) s.moveSpeed *= d.moveMul;
    if (d.cdMul !== 1) s.cd = Math.max(0.4, s.cd * d.cdMul);
  }

  /** M19 掉落道具持续效果聚合态写入（DropItemSystem 调用）：触发属性重算 */
  private setDropState(s: DropState): void {
    this.dropStateVal = s;
    this.recomputeStats();
  }

  /** M19 地图专属道具：机制产物在奖励时刻调用，按掉率从本图专属池随机产出 */
  spawnMapDrop(x: number, y: number): void {
    const pool = this.map.drops;
    if (!pool || pool.length === 0) return;
    if (this.ctx.rng() >= DROP_RATES.mapDrop * this.run.dropRateMul) return;
    this.pickupsRef.spawnDropPickup(weightedDrop(pool, this.ctx.rng), x, y);
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
    if (!this.run.running || this.benchMode) {
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

  /** M17 施放反馈：玩家小幅 pop + 武器主题色环；0.15s 节流（6 武器齐射不闪疯） */
  private lastCastFx = -1;
  castFx(id: WeaponId): void {
    if (this.run.elapsed - this.lastCastFx < 0.15) return;
    this.lastCastFx = this.run.elapsed;
    this.playerSys.castPop();
    const color = WEAPON_META.find((m) => m.id === id)?.color ?? 0xfff2c0;
    this.fx.ring(this.player.x, this.player.y, color, 1.15, 0.22);
  }

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
    final *= this.enemies.shieldMulFor(e); // M15 护盾光环：圈内友方减伤（先点名击杀护盾怪）
    final *= this.mechDmgMulVal; // M18 lavender 花粉积蓄：站花粉带增伤
    e.hp -= final;
    if (!opts.quiet) {
      // 打击感分级（M12）：大伤害/暴击 → 微顿帧（预算化）+ 数字分级 + 音高上抬
      const big = final >= HITFEEL.bigHitMul * this.run.stats.dmg;
      this.fx.flash(e);
      this.fx.number(e.x, e.y - e.radius, final, crit, big, e);
      // M17 受击 punch：放大脉冲（EnemySystem 每帧缩放里回落）+ 沿击退法向粒子喷溅
      e.punchT = HITFEEL.punchDur;
      this.fx.spray(e.x, e.y, opts.kx ?? 0, opts.ky ?? 0, DEATH_COLOR[e.id]);
      SFX.hit((opts.pitch ?? 1) * (crit || big ? 1.3 : 1));
      if (crit || big) this.requestHitStop(HITFEEL.microStop);
    }
    if (opts.kb && e.knockMul > 0) {
      e.kvx += (opts.kx ?? 0) * opts.kb * e.knockMul;
      e.kvy += (opts.ky ?? 0) * opts.kb * e.knockMul;
    }
    if (e.hp <= 0) this.enemies.kill(e);
    // M13 钩子：武器伤害结算完成后；inOnHit 守卫防同步递归，钩子衍生伤害自带 noHook
    if (final > 0 && !opts.noHook && !this.inOnHit) {
      this.inOnHit = true;
      try {
        for (const m of this.modifiers) m.onWeaponHit?.(e, final, this.ctx, crit);
      } finally {
        this.inOnHit = false;
      }
    }
    return final;
  }

  /** onWeaponHit 递归守卫（M13）：钩子内同步引发的 hitEnemy 不再二次触发钩子 */
  private inOnHit = false;

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
    this.mechSys?.notifyKill(e); // M18 grove 孢子连锁：机制侧击杀钩子（在钩子产币/规则卡之后）
    if (e.isElite) {
      // 精英死亡 = 小高潮（M12）：冲击波双环 + 顿帧 + 低频闷响（精英是宝箱载体）
      this.run.eliteKills++;
      if (e.affix) this.run.affixKills++; // M15 affixSlayer 埋点（结算累计入档）
      this.clock.hitStop(HITFEEL.eliteStop);
      this.fx.ring(e.x, e.y, DEATH_COLOR[e.id], 10, 0.65);
      this.fx.ring(e.x, e.y, 0xfff2c0, 7, 0.45);
      SFX.boom(true);
      shakeCam(this, 180, 0.005);
      this.pickupsRef.spawnPickup('chest', e.x, e.y);
      // M19 规则卡专属宝箱（紫色）：按 arcana 概率额外掉落，与常规宝箱分离
      if (this.levelUp.shouldDropArcanaChest()) this.pickupsRef.spawnPickup('arcanachest', e.x + 30, e.y);
      for (let i = 0; i < DROPS.eliteCoinN; i++) {
        this.pickupsRef.spawnCoin(e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 50, DROPS.eliteCoinV);
      }
      // M19 精英额外掉通用道具（受商店掉率强化）
      if (this.ctx.rng() < DROP_RATES.eliteCommon * this.run.dropRateMul) {
        this.pickupsRef.spawnDropPickup(rollCommonDrop(this.ctx.rng), e.x, e.y - 16);
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
    // M19 普通击杀低概率掉通用道具（受商店掉率强化）
    if (this.ctx.rng() < DROP_RATES.kill * this.run.dropRateMul) {
      this.pickupsRef.spawnDropPickup(rollCommonDrop(this.ctx.rng), e.x, e.y - 12);
    }
  }

  /** 无尽 Boss 击杀（M11）：宝箱 + 金币雨（基础 25，轮衰减在拾取时生效）+ 全场磁吸脉冲 */
  private endlessBossDown(e: Enemy): void {
    emitEvent(this.game, 'hud:boss', false);
    this.clock.hitStop(0.2);
    shakeCam(this, 300, 0.006);
    this.fx.ring(e.x, e.y, PAL.white, 12, 0.8);
    this.pickupsRef.spawnPickup('chest', e.x, e.y);
    for (let i = 0; i < ENDLESS.bossCoinN; i++) {
      this.pickupsRef.spawnCoin(
        e.x + (Math.random() - 0.5) * 90, e.y + (Math.random() - 0.5) * 90, ENDLESS.bossCoinV,
      );
    }
    this.pickupsRef.magnetizeGems(e.x, e.y, 1e5);
    // M19 无尽 Boss 必掉一件通用道具（强力补给）
    this.pickupsRef.spawnDropPickup(rollCommonDrop(this.ctx.rng), e.x, e.y - 20);
    // M19 规则卡专属宝箱：Boss 同样按 arcana 概率额外掉落
    if (this.levelUp.shouldDropArcanaChest()) this.pickupsRef.spawnPickup('arcanachest', e.x + 36, e.y);
    SFX.victoryJingle();
    emitEvent(this.game, 'hud:warn', 'endlessBossDown');
  }

  damagePlayer(d: number, src?: Enemy): void {
    if (this.run.iframeT > 0 || !this.run.running) return;
    if (getSettings().invincible) return; // 调试：无敌（优先于复活，不消耗次数）
    if (this.dropStateVal.invuln) return; // M19 晨曦护盾 / 退潮庇护：持续无敌（不消耗 iframe）
    // M13 钩子：受伤结算前改写（iframe 判定后、扣血前）；返回 ≤0 = 完全免疫，不进 iframe
    for (const m of this.modifiers) {
      if (m.modifyPlayerDamage) d = m.modifyPlayerDamage(d, this.ctx, src);
    }
    if (d <= 0) return;
    this.run.iframeT = PLAYER.iframe;
    const applied = Math.max(1, d - this.run.stats.armor); // 永久强化：护甲平减，至少 1 点
    this.run.hp -= applied;
    // M13 成就埋点：首次受伤时刻 + Boss 战受伤标记（flawlessBoss/untouchable10）
    if (this.run.firstHurtAt === Infinity) this.run.firstHurtAt = this.run.elapsed;
    if (src?.affix === 'gravitic') this.run.gravHit = true; // M15 graviticEscape 埋点
    const boss = this.enemies.boss;
    if (boss && boss.active) this.run.bossHit = true;
    SFX.hurt();
    this.fx.flash(this.player, 0xf08080);
    // M17 受击强化：背离伤害来源位移 + 白圈冲击 + HUD 血条抖动
    if (src) {
      const dx = this.player.x - src.x;
      const dy = this.player.y - src.y;
      const d = Math.hypot(dx, dy) || 1;
      this.player.x += (dx / d) * HITFEEL.hurtKnock;
      this.player.y += (dy / d) * HITFEEL.hurtKnock;
    }
    this.fx.ring(this.player.x, this.player.y, 0xffffff, 2.4, 0.3);
    emitEvent(this.game, 'hud:hurt');
    shakeCam(this, 120, 0.004);
    // M13 钩子：实际扣血后、败北判定前（raw=护甲前；thorncore 蓄能用 raw，坦克体验不吃亏）
    for (const m of this.modifiers) m.onPlayerDamaged?.(d, applied, this.ctx);
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
    this.cameras.main.flash(350, 255, 252, 240); // M17 C8：复活白屏 flash（纸白）
    SFX.revive();
    emitEvent(this.game, 'hud:revive', run.revivesLeft);
  }

  // ---------- 胜负 ----------

  private victory(bx: number, by: number): void {
    this.run.running = false;
    this.clock.reset();
    emitEvent(this.game, 'hud:boss', false);
    shakeCam(this, 400, 0.008);
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
    this.fx.ring(this.player.x, this.player.y, 0x9a9489, 4.5, 1.0); // M17 C8：灰阶慢环送别
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
      passives: this.run.passives.size,
      arcana: this.run.arcana.length,
      bossNoHit: !this.run.bossHit,
      firstHurtAt: this.run.firstHurtAt,
      firstEvolveAt: this.run.firstEvolveAt,
      affixKills: this.run.affixKills,
      gravSeen: this.run.gravSeen,
      gravHit: this.run.gravHit,
    };
    this.scene.stop('hud');
    this.scene.start('result', result);
  }

  // ---------- M16 草甸秘密花圃（彩蛋：发现引导克制——微光 + 靠近轻响，游戏内不提示玩法） ----------

  /** 彩蛋状态：站立 5s 绽放 → run.bloomed → AchievementTracker 解锁 secretBloom（隐藏角色 blobby） */
  private secretSpot: {
    x: number; y: number; stand: number; noticed: boolean; done: boolean;
    glow: Phaser.GameObjects.Image; flowers: Phaser.GameObjects.Image[];
  } | null = null;

  private spawnSecretBloom(): void {
    // 离出生点 ≥600px：开局不会一眼撞见，要靠游荡途中注意微光
    const a = Math.random() * Math.PI * 2;
    const d = 600 + Math.random() * 300;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const glow = this.add.image(x, y, 'sb_glow').setDepth(7).setAlpha(0.45);
    this.tweens.add({ targets: glow, alpha: 0.8, scale: 1.25, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const flowers: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 5; i++) {
      const fa = (i / 5) * Math.PI * 2 + 0.5;
      flowers.push(this.add.image(x + Math.cos(fa) * 16, y + Math.sin(fa) * 11, 'd_flower' + (i % 3)).setDepth(8).setScale(0.9));
    }
    this.secretSpot = { x, y, stand: 0, noticed: false, done: false, glow, flowers };
  }

  private updateSecretBloom(dt: number): void {
    const s = this.secretSpot;
    if (!s || s.done) return;
    const dx = this.player.x - s.x;
    const dy = this.player.y - s.y;
    const d2 = dx * dx + dy * dy;
    if (!s.noticed && d2 < 320 * 320) {
      // 首次靠近：轻微音效 + 微光涟漪（可被注意但不打扰）
      s.noticed = true;
      SFX.chime();
      this.fx.ring(s.x, s.y, 0xfff2c0, 4, 0.6);
    }
    if (d2 < 70 * 70) {
      s.stand += dt;
      if (Math.random() < dt * 5) {
        this.fx.burst(s.x + (Math.random() - 0.5) * 40, s.y + (Math.random() - 0.5) * 28,
          { tex: 'p_star', color: 0xfff2c0, count: 1, speed: 30, life: 0.5, scale: 0.7, alpha: 0.85 });
      }
      if (s.stand >= 5) this.bloomSecret(s);
    } else {
      s.stand = 0;
    }
  }

  /** 绽放演出：花圃放大 + 花瓣纸屑；run.bloomed 由 Tracker 每秒评估接走（toast 即成就横幅） */
  private bloomSecret(s: NonNullable<GameScene['secretSpot']>): void {
    s.done = true;
    this.run.bloomed = true;
    for (const f of s.flowers) {
      this.tweens.add({ targets: f, scale: 1.6, angle: (Math.random() - 0.5) * 30, duration: 600, ease: 'Back.easeOut' });
    }
    this.tweens.add({ targets: s.glow, alpha: 1, scale: 2, duration: 800, ease: 'Sine.easeOut' });
    this.fx.ring(s.x, s.y, 0xf6b8c8, 9, 0.7);
    this.fx.ring(s.x, s.y, 0xfff2c0, 6, 0.5);
    this.fx.burst(s.x, s.y, { tex: 'p_petal', color: 0xf8b0c4, count: 26, speed: 220, life: 0.8, scale: 1.1, spin: true, grav: 60 });
    SFX.chime();
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

  /** DEV：自动化直接验证指定地图 Boss。 */
  private startBossTest(phase: 'p1' | 'p2'): void {
    this.run.elapsed = Math.max(0, this.map.minutes * 60 - 0.5);
    this.waveDir.debugSpawnBossNow();
    const boss = this.enemies.boss;
    if (boss && phase === 'p2') boss.hp = boss.maxHp * 0.46;
    this.bgmBoostT = Math.max(this.bgmBoostT, 18);
  }

  debugBossTestSnapshot(): { mapId: string; boss: string; active: boolean; phase: 'p1' | 'p2'; hpK: number; bullets: number; zones: number } {
    const boss = this.enemies.boss;
    const hpK = boss && boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
    return {
      mapId: this.map.id,
      boss: this.map.bossId,
      active: Boolean(boss?.active),
      phase: hpK > 0 && hpK < 0.5 ? 'p2' : 'p1',
      hpK,
      bullets: this.projectilesRef.activeCount,
      zones: this.zonesRef.count,
    };
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
