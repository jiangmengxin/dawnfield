// 成就引擎：单局内每秒评估 + 局外（结算/商店）按需评估
// 成就条件全在 content/achievements.ts，本模块只负责评估与解锁落档
import { ACHIEVEMENTS, AchView } from '../content/achievements';
import type { AchievementId } from '../content/ids';
import { PASSIVE_MAX_LEVEL } from '../content/passives';
import { WEAPON_MAX_LEVEL } from '../content/weapons';
import { emitEvent } from '../core/events';
import { Meta } from '../core/MetaState';
import type { CombatContext, RunSystem } from './context';
import type { WeaponManager } from './weapons';

/** 评估全部未解锁成就并落档；返回本次新解锁的 id（提示展示由调用方负责） */
export function evalAchievements(view: AchView): AchievementId[] {
  const out: AchievementId[] = [];
  for (const a of ACHIEVEMENTS) {
    if (Meta.hasAch(a.id)) continue;
    if (a.check(view)) {
      Meta.unlockAch(a.id);
      out.push(a.id);
    }
  }
  return out;
}

export class AchievementTracker implements RunSystem {
  private t = 0;

  constructor(private ctx: CombatContext, private weapons: WeaponManager) {}

  update(dt: number): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 1; // 每秒评估一次
    const run = this.ctx.run;
    const st = Meta.save.stats;
    const view: AchView = {
      run: {
        kills: run.kills,
        time: run.elapsed,
        level: run.level,
        weapons: this.weapons.list.length,
        passives: run.passives.size,
        evolves: this.weapons.list.filter((w) => w.evolved).length,
        maxWeapon: this.weapons.list.some((w) => w.level >= WEAPON_MAX_LEVEL),
        maxPassive: [...run.passives.values()].some((lv) => lv >= PASSIVE_MAX_LEVEL),
        eliteKills: run.eliteKills,
        win: false,
        mapId: this.ctx.map.id,
        difficulty: run.diff,
        endlessCycle: run.cycle,
        // M13 结构性挑战埋点（win 类在 Result 终评，时间类在此逐秒评估）
        bossNoHit: !run.bossHit,
        firstHurtAt: run.firstHurtAt,
        firstEvolveAt: run.firstEvolveAt,
        arcana: run.arcana.length,
        gravSeen: run.gravSeen,
        gravHit: run.gravHit,
      },
      // 累计类并入当前局进度，避免要再开一局才能解锁
      stats: {
        ...st,
        kills: st.kills + run.kills,
        coinsEarned: st.coinsEarned + Math.floor(run.coins),
        charWins: Object.keys(st.winsByChar).length,
        affixKills: st.affixKills + run.affixKills,
      },
      hyper: Meta.save.hyper,
    };
    for (const id of evalAchievements(view)) {
      emitEvent(this.ctx.scene.game, 'hud:achievement', id);
    }
  }
}
