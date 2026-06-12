// 局内运行时状态（与局外 MetaState 配对）
// 纯状态 + 属性重算，无 Phaser 依赖；商店永久强化在 computeStats 汇入基础值
// M4 起角色差异化：基础 HP/移速/体积来自 CharacterSpec，属性偏移在重算时叠乘
import type { ArcanaId, PassiveId } from '../content/ids';
import type { RunMode } from '../systems/context';
import { CharacterSpec, getCharacter } from '../content/characters';
import { DIFFICULTY } from '../content/difficulty';
import { endlessCoinMul } from '../content/endless';
import { PASSIVE_FX } from '../content/passives';
import { ESSENCE, PLAYER, xpForLevel } from '../content/player';
import { powerUpBonus, PowerUpBonus } from '../content/shop';
import { getSave } from './save';

export interface Stats {
  dmg: number;
  cd: number;
  area: number;
  magnet: number;
  moveSpeed: number;
  projSpeed: number;
  maxHp: number;
  xpGain: number; // 经验获取乘子
  coinGain: number; // 金币获取乘子
  armor: number; // 受到伤害平减
  regen: number; // 每秒回复
  crit: number; // 暴击率增量（叠加在基础暴击上）
}

export class RunState {
  /** 本局角色（基础体格 + 属性偏移来源） */
  readonly char: CharacterSpec;
  /** 模式与难度（M11）：金币/经验乘区与敌方乘区读此处；普通局恒 'normal'/0 */
  readonly mode: RunMode;
  readonly diff: 0 | 1 | 2;
  /** 无尽当前轮次（1-based，WaveDirector 推进；Boss 前与普通局恒 0） */
  cycle = 0;
  hp = PLAYER.hp;
  level = 1;
  xp = 0;
  xpNeed = xpForLevel(1);
  kills = 0;
  eliteKills = 0;
  coins = 0; // 局内累计（浮点；结算时取整入账）
  elapsed = 0;
  frame = 0;
  running = false;
  iframeT = 0; // 受击无敌帧剩余秒数
  pendingLevels = 0;
  choosing = false;
  /** 规则卡（M9）：开局选卡待开（设置开关开启时置位），LevelUpSystem 消费 */
  pendingArcana = false;
  /** 本局已持有的规则卡（modifier 实体在 GameScene.modifiers） */
  arcana: ArcanaId[] = [];
  /** 晨露精华（M12 Limit Break）：满构筑后升级溢出选项的微量永续成长，本局有效不入存档 */
  essence = { dmg: 0, cd: 0, area: 0 };
  /** 地图升级节奏乘子（M12，= MapSpec.xpK；GameScene.create 写入） */
  mapXpK = 1;
  difficultyHp = 1;
  passives = new Map<PassiveId, number>();
  stats: Stats;

  // M10 构筑操控：基础次数免费送 1，商店永久升级追加（开局快照，局中不变）
  rerolls: number;
  banishes: number;
  skips: number;
  /** 已放逐项（'w_blade' / 'p_power'），局内持久，不入存档 */
  banished = new Set<string>();
  // M10 复活：本局剩余次数 = 商店等级（最高 2）；任何来源均可 +1（M13 机制卡复用）
  revivesLeft: number;
  revivesUsed = 0;

  /** 商店永久强化加成（开局快照，局中不变） */
  private readonly pu: PowerUpBonus = powerUpBonus(getSave().powerUps);

  constructor(charId = 'spark', mode: RunMode = 'normal', diff: 0 | 1 | 2 = 0) {
    this.char = getCharacter(charId);
    this.mode = mode;
    this.diff = diff;
    const puLv = getSave().powerUps;
    this.rerolls = 1 + (puLv.reroll ?? 0);
    this.banishes = 1 + (puLv.banish ?? 0);
    this.skips = 1 + (puLv.skip ?? 0);
    this.revivesLeft = puLv.revive ?? 0;
    this.stats = this.computeStats();
    this.hp = this.stats.maxHp;
  }

  /** 重算属性；statMods 为规则卡钩子（M9 实装，当前恒为空） */
  recomputeStats(statMods: Array<(stats: Stats) => void> = []): void {
    const s = this.computeStats();
    for (const mod of statMods) mod(s);
    this.stats = s;
  }

  private computeStats(): Stats {
    const p = (id: PassiveId) => this.passives.get(id) ?? 0;
    const pu = this.pu;
    const c = this.char;
    const m = c.mods ?? {};
    const ess = this.essence; // 晨露精华（M12）：线性微量叠加；冷却走乘方防无限叠加越过下限
    return {
      dmg: (1 + PASSIVE_FX.power * p('power')) * (1 + pu.dmg) * (m.dmg ?? 1) * (1 + ESSENCE.dmg * ess.dmg),
      cd: Math.max(0.4, (1 - PASSIVE_FX.lens * p('lens')) * pu.cdMul * (m.cd ?? 1) * Math.pow(1 - ESSENCE.cd, ess.cd)),
      area: (1 + PASSIVE_FX.cloud * p('cloud') + PASSIVE_FX.whistleArea * p('whistle')) * (1 + pu.area) * (m.area ?? 1)
        * (1 + ESSENCE.area * ess.area),
      magnet: PLAYER.pickup * (1 + PASSIVE_FX.battery * p('battery') + PASSIVE_FX.trellisMagnet * p('trellis') + pu.magnet) * (m.magnet ?? 1),
      moveSpeed: c.speed * (1 + PASSIVE_FX.windMove * p('wind') + PASSIVE_FX.featherMove * p('feather') + pu.speed),
      projSpeed: (1 + PASSIVE_FX.windProj * p('wind') + PASSIVE_FX.stardustProj * p('stardust') + PASSIVE_FX.whistleProj * p('whistle')) * (m.projSpeed ?? 1),
      maxHp: c.hp + PASSIVE_FX.bloomHp * p('bloom') + PASSIVE_FX.snackHp * p('snack') + pu.hp,
      xpGain: (1 + pu.xpGain + PASSIVE_FX.sproutXp * p('sprout') + PASSIVE_FX.trellisXp * p('trellis')) * (m.xpGain ?? 1),
      coinGain: (1 + pu.coinGain + PASSIVE_FX.pouchCoin * p('pouch')) * (m.coinGain ?? 1),
      armor: pu.armor + (m.armor ?? 0) + PASSIVE_FX.acornArmor * p('acorn'),
      regen: pu.regen + (m.regen ?? 0) + PASSIVE_FX.honeyRegen * p('honey') + PASSIVE_FX.snackRegen * p('snack'),
      crit: pu.crit + (m.crit ?? 0) + PASSIVE_FX.ladybugCrit * p('ladybug'),
    };
  }

  addXp(v: number): void {
    this.xp += v * this.stats.xpGain * DIFFICULTY[this.diff].xpMul * this.mapXpK;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = xpForLevel(this.level);
      this.pendingLevels++;
    }
  }

  addCoins(v: number): void {
    // 狂暴奖励乘区 × 无尽轮衰减（只作用于局内收益，保护商店经济曲线；cycle=0 时衰减恒 1）
    const decay = this.mode === 'endless' ? endlessCoinMul(this.cycle) : 1;
    this.coins += v * this.stats.coinGain * DIFFICULTY[this.diff].coinMul * decay;
  }

  heal(v: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + v);
  }
}
