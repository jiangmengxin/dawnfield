// 武器基类与共用工具
// 约定：武器自行计算最终伤害（含 stats.dmg），交给 ctx.hitEnemy 结算暴击/击退/死亡
import type { WeaponId } from '../../content/ids';
import type { CombatContext } from '../context';
import type { Enemy } from '../EnemySystem';

/** 共享网格查询缓冲（单线程帧内复用） */
export const queryOut: Enemy[] = [];

/** 距离 (x,y) 最近的 k 个敌人 */
export function nearestK(ctx: CombatContext, x: number, y: number, k: number, maxDist: number): Enemy[] {
  const md2 = maxDist * maxDist;
  const list: Array<[number, Enemy]> = [];
  for (const e of ctx.enemies.actives) {
    if (!e.active || e.dying) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < md2) list.push([d2, e]);
  }
  list.sort((a, b) => a[0] - b[0]);
  return list.slice(0, k).map(([, e]) => e);
}

export abstract class Weapon {
  id: WeaponId;
  level = 1;
  evolved = false;
  /** 突破模式（M20）：已进化超武额外升级层（0 = 未突破）；只驱动中央伤害乘区 */
  breakthrough = 0;
  protected cdT = 0.5;
  protected ctx: CombatContext;

  constructor(ctx: CombatContext, id: WeaponId) {
    this.ctx = ctx;
    this.id = id;
  }

  update(dt: number): void {
    this.cdT -= dt;
    if (this.cdT <= 0) {
      this.fire();
      this.ctx.castFx(this.id); // M17 施放反馈（节流在 GameScene）
      this.cdT = Math.max(0.15, this.cooldown() * this.ctx.stats.cd);
    }
    this.tick(dt);
  }

  /** 立即施放（M14 toot 合奏）：清零冷却，下帧 update 自然走 fire（哨塔/地雷池上限照常生效） */
  triggerNow(): void {
    this.cdT = 0;
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
