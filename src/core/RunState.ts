// 局内运行时状态（与局外 MetaState 配对）
// 纯状态 + 属性重算，无 Phaser 依赖；商店永久强化在 computeStats 汇入基础值
import type { PassiveId } from '../content/ids';
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

  constructor() {
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
    return {
      dmg: (1 + PASSIVE_FX.power * p('power')) * (1 + pu.dmg),
      cd: Math.max(0.4, (1 - PASSIVE_FX.lens * p('lens')) * pu.cdMul),
      area: (1 + PASSIVE_FX.cloud * p('cloud')) * (1 + pu.area),
      magnet: PLAYER.pickup * (1 + PASSIVE_FX.battery * p('battery') + pu.magnet),
      moveSpeed: PLAYER.speed * (1 + PASSIVE_FX.windMove * p('wind') + pu.speed),
      projSpeed: 1 + PASSIVE_FX.windProj * p('wind'),
      maxHp: PLAYER.hp + PASSIVE_FX.bloomHp * p('bloom') + pu.hp,
      xpGain: 1 + pu.xpGain,
      coinGain: 1 + pu.coinGain,
      armor: pu.armor,
      regen: pu.regen,
      crit: pu.crit,
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
