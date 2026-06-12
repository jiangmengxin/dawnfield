// 局内运行时状态（与局外 MetaState 配对）
// 纯状态 + 属性重算，无 Phaser 依赖；商店永久强化在 computeStats 汇入基础值
// M4 起角色差异化：基础 HP/移速/体积来自 CharacterSpec，属性偏移在重算时叠乘
import type { PassiveId } from '../content/ids';
import { CharacterSpec, getCharacter } from '../content/characters';
import { PASSIVE_FX } from '../content/passives';
import { PLAYER, xpForLevel } from '../content/player';
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
  difficultyHp = 1;
  passives = new Map<PassiveId, number>();
  stats: Stats;

  /** 商店永久强化加成（开局快照，局中不变） */
  private readonly pu: PowerUpBonus = powerUpBonus(getSave().powerUps);

  constructor(charId = 'spark') {
    this.char = getCharacter(charId);
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
    return {
      dmg: (1 + PASSIVE_FX.power * p('power')) * (1 + pu.dmg) * (m.dmg ?? 1),
      cd: Math.max(0.4, (1 - PASSIVE_FX.lens * p('lens')) * pu.cdMul * (m.cd ?? 1)),
      area: (1 + PASSIVE_FX.cloud * p('cloud')) * (1 + pu.area) * (m.area ?? 1),
      magnet: PLAYER.pickup * (1 + PASSIVE_FX.battery * p('battery') + pu.magnet) * (m.magnet ?? 1),
      moveSpeed: c.speed * (1 + PASSIVE_FX.windMove * p('wind') + pu.speed),
      projSpeed: (1 + PASSIVE_FX.windProj * p('wind') + PASSIVE_FX.stardustProj * p('stardust')) * (m.projSpeed ?? 1),
      maxHp: c.hp + PASSIVE_FX.bloomHp * p('bloom') + pu.hp,
      xpGain: (1 + pu.xpGain + PASSIVE_FX.sproutXp * p('sprout')) * (m.xpGain ?? 1),
      coinGain: (1 + pu.coinGain + PASSIVE_FX.pouchCoin * p('pouch')) * (m.coinGain ?? 1),
      armor: pu.armor + (m.armor ?? 0) + PASSIVE_FX.acornArmor * p('acorn'),
      regen: pu.regen + (m.regen ?? 0) + PASSIVE_FX.honeyRegen * p('honey'),
      crit: pu.crit + (m.crit ?? 0) + PASSIVE_FX.ladybugCrit * p('ladybug'),
    };
  }

  addXp(v: number): void {
    this.xp += v * this.stats.xpGain;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = xpForLevel(this.level);
      this.pendingLevels++;
    }
  }

  addCoins(v: number): void {
    this.coins += v * this.stats.coinGain;
  }

  heal(v: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + v);
  }
}
