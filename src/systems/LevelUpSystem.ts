// 升级/宝箱/规则卡系统：三选一候选生成、选卡应用、宝箱内容分层、规则卡开局三选一（M9）
// 宝箱分层：可进化 → 进化；否则概率再得规则卡；否则 → 已持有项升级×N；无可升级 → 金币
import { ARCANA, ARCANA_META } from '../content/arcana';
import { CHEST, WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import { MAX_PASSIVES, MAX_WEAPONS } from '../content/player';
import { PASSIVE_MAX_LEVEL, PASSIVE_META, PASSIVE_FX } from '../content/passives';
import type { ArcanaId, PassiveId, WeaponId } from '../content/ids';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { Meta } from '../core/MetaState';
import { getSettings } from '../core/settings';
import type { ChestReward, CombatContext, Offer, RunModifier, RunSystem } from './context';
import type { WeaponManager } from './weapons';

export class LevelUpSystem implements RunSystem {
  constructor(
    private ctx: CombatContext,
    private weapons: WeaponManager,
    private modifiers: RunModifier[],
    private grantArcana: (id: ArcanaId) => void,
  ) {}

  /** 每帧末尾检查待结算升级；规则卡开局三选一优先于升级 */
  update(_dt: number): void {
    const run = this.ctx.run;
    if (run.pendingArcana && !run.choosing) {
      this.openArcanaPick();
      return;
    }
    if (run.pendingLevels > 0 && !run.choosing) this.openLevelUp();
  }

  // ---------- 规则卡三选一（M9：开局选 1） ----------

  private openArcanaPick(): void {
    const ctx = this.ctx;
    const run = ctx.run;
    run.pendingArcana = false;
    const pool = ARCANA_META.map((m) => m.id).filter((id) => !run.arcana.includes(id));
    if (pool.length === 0) return;
    run.choosing = true;
    const choices: ArcanaId[] = [];
    for (let i = 0; i < ARCANA.pickCount && pool.length > 0; i++) {
      choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    SFX.levelup();
    ctx.fx.ring(ctx.player.x, ctx.player.y, 0xe2b452, 7, 0.6);
    ctx.scene.scene.pause();
    emitEvent(ctx.scene.game, 'hud:arcana', choices);
  }

  /** HUD 规则卡选卡回调 */
  applyArcana(id: ArcanaId): void {
    this.ctx.run.choosing = false;
    this.grantArcana(id);
  }

  // ---------- 升级三选一 ----------

  private openLevelUp(): void {
    const ctx = this.ctx;
    ctx.run.choosing = true;
    ctx.run.pendingLevels--;
    SFX.levelup();
    ctx.fx.ring(ctx.player.x, ctx.player.y, PAL.xp, 7, 0.6);
    let offers = this.buildOffers();
    for (const m of this.modifiers) {
      if (m.modifyOffers) offers = m.modifyOffers(offers);
    }
    ctx.scene.scene.pause();
    emitEvent(ctx.scene.game, 'hud:levelup', offers);
  }

  private buildOffers(): Offer[] {
    type Cand = { offer: Offer; w: number };
    const run = this.ctx.run;
    const cands: Cand[] = [];
    for (const meta of WEAPON_META) {
      const w = this.weapons.get(meta.id);
      if (w) {
        if (w.level < WEAPON_MAX_LEVEL && !w.evolved) {
          cands.push({ offer: { kind: 'weapon', id: meta.id, isNew: false, toLevel: w.level + 1 }, w: 3 });
        }
      } else if (this.weapons.list.length < MAX_WEAPONS) {
        cands.push({ offer: { kind: 'weapon', id: meta.id, isNew: true, toLevel: 1 }, w: 2.2 });
      }
    }
    for (const meta of PASSIVE_META) {
      const lv = run.passives.get(meta.id) ?? 0;
      if (lv > 0) {
        if (lv < PASSIVE_MAX_LEVEL) {
          cands.push({ offer: { kind: 'passive', id: meta.id, isNew: false, toLevel: lv + 1 }, w: 2.5 });
        }
      } else if (run.passives.size < MAX_PASSIVES) {
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
    this.ctx.run.choosing = false;
    this.applyOne(offer);
    emitEvent(this.ctx.scene.game, 'hud:refresh');
  }

  private applyOne(offer: Offer): void {
    const ctx = this.ctx;
    if (offer.kind === 'weapon' && offer.id) {
      this.weapons.addOrUpgrade(offer.id as WeaponId);
    } else if (offer.kind === 'passive' && offer.id) {
      const id = offer.id as PassiveId;
      if (!ctx.run.passives.has(id)) Meta.codexLight('passives', id); // 图鉴首遇点亮
      ctx.run.passives.set(id, (ctx.run.passives.get(id) ?? 0) + 1);
      ctx.recomputeStats();
      if (id === 'bloom') ctx.run.heal(PASSIVE_FX.bloomHp);
      if (id === 'snack') ctx.run.heal(PASSIVE_FX.snackHp);
    } else if (offer.kind === 'heal') {
      ctx.run.heal(40);
      SFX.heal();
    } else if (offer.kind === 'gold') {
      ctx.run.addXp(40);
    }
  }

  // ---------- 宝箱（分层） ----------

  openChest(): void {
    const ctx = this.ctx;
    let reward = this.buildChestReward();
    for (const m of this.modifiers) {
      if (m.onChest) reward = m.onChest(reward);
    }
    SFX.chest();
    ctx.scene.scene.pause();
    emitEvent(ctx.scene.game, 'hud:chest', reward);
  }

  private buildChestReward(): ChestReward {
    const run = this.ctx.run;
    // 第一层：进化
    const evolvable = this.weapons.evolvable();
    if (evolvable.length > 0) {
      return { kind: 'evolve', weapon: evolvable[Math.floor(Math.random() * evolvable.length)] };
    }
    // 第二层（M9 规则卡）：开关开启且未到单局上限时，有概率再得一张
    if (getSettings().arcana && run.arcana.length < ARCANA.maxPerRun && Math.random() < ARCANA.chestChance) {
      const pool = ARCANA_META.map((m) => m.id).filter((id) => !run.arcana.includes(id));
      if (pool.length > 0) {
        return { kind: 'arcana', card: pool[Math.floor(Math.random() * pool.length)] };
      }
    }
    // 第三层：已持有项升级 ×N
    const cands: Offer[] = [];
    for (const w of this.weapons.list) {
      if (!w.evolved && w.level < WEAPON_MAX_LEVEL) {
        cands.push({ kind: 'weapon', id: w.id, isNew: false, toLevel: w.level + 1 });
      }
    }
    for (const [pid, lv] of run.passives) {
      if (lv < PASSIVE_MAX_LEVEL) {
        cands.push({ kind: 'passive', id: pid, isNew: false, toLevel: lv + 1 });
      }
    }
    if (cands.length > 0) {
      const items: Offer[] = [];
      for (let i = 0; i < CHEST.upgradeCount && cands.length > 0; i++) {
        items.push(cands.splice(Math.floor(Math.random() * cands.length), 1)[0]);
      }
      return { kind: 'upgrade', items };
    }
    // 末层：金币（数额随结果携带，规则卡 onChest 可改写）
    return { kind: 'gold', coins: CHEST.goldCoins, heal: CHEST.goldHeal };
  }

  /** HUD 宝箱动画结束后回调 */
  applyChest(reward: ChestReward): void {
    const ctx = this.ctx;
    if (reward.kind === 'evolve') {
      this.weapons.evolve(reward.weapon);
      SFX.evolve();
    } else if (reward.kind === 'arcana') {
      this.grantArcana(reward.card);
      SFX.levelup();
    } else if (reward.kind === 'upgrade') {
      for (const offer of reward.items) this.applyOne(offer);
    } else {
      ctx.run.addCoins(reward.coins);
      ctx.run.heal(reward.heal);
      SFX.coin();
    }
    emitEvent(ctx.scene.game, 'hud:refresh');
  }
}
