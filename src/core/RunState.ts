// 局内运行时状态（M3 起与局外 MetaState 配对）
// 纯状态 + 属性重算，无 Phaser 依赖
import type { PassiveId } from '../content/ids';
import { PASSIVE_FX } from '../content/passives';
import { PLAYER, xpForLevel } from '../content/player';

export interface Stats {
  dmg: number;
  cd: number;
  area: number;
  magnet: number;
  moveSpeed: number;
  projSpeed: number;
  maxHp: number;
}

export class RunState {
  hp = PLAYER.hp;
  level = 1;
  xp = 0;
  xpNeed = xpForLevel(1);
  kills = 0;
  elapsed = 0;
  frame = 0;
  running = false;
  iframeT = 0; // 受击无敌帧剩余秒数
  pendingLevels = 0;
  choosing = false;
  difficultyHp = 1;
  passives = new Map<PassiveId, number>();
  stats: Stats;

  constructor() {
    this.stats = this.computeStats();
  }

  /** 重算属性；statMods 为规则卡钩子（M9 实装，当前恒为空） */
  recomputeStats(statMods: Array<(stats: Stats) => void> = []): void {
    const s = this.computeStats();
    for (const mod of statMods) mod(s);
    this.stats = s;
  }

  private computeStats(): Stats {
    const p = (id: PassiveId) => this.passives.get(id) ?? 0;
    return {
      dmg: 1 + PASSIVE_FX.power * p('power'),
      cd: Math.max(0.5, 1 - PASSIVE_FX.lens * p('lens')),
      area: 1 + PASSIVE_FX.cloud * p('cloud'),
      magnet: PLAYER.pickup * (1 + PASSIVE_FX.battery * p('battery')),
      moveSpeed: PLAYER.speed * (1 + PASSIVE_FX.windMove * p('wind')),
      projSpeed: 1 + PASSIVE_FX.windProj * p('wind'),
      maxHp: PLAYER.hp + PASSIVE_FX.bloomHp * p('bloom'),
    };
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

  heal(v: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + v);
  }
}
