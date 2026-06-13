// 升级/宝箱/规则卡系统：三选一候选生成、选卡应用、宝箱内容分层、规则卡开局选卡（M9）
// 宝箱分层：可进化 → 进化；否则概率再得规则卡；否则 → 已持有项升级×N；无可升级 → 金币
import { ARCANA, ARCANA_META } from '../content/arcana';
import { CHEST, WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import { ESSENCE, MAX_PASSIVES } from '../content/player';
import { PASSIVE_MAX_LEVEL, PASSIVE_META, PASSIVE_FX } from '../content/passives';
import type { ArcanaId, PassiveId, WeaponId } from '../content/ids';
import { PAL } from '../gfx/palette';
import { SFX } from '../audio/sound';
import { emitEvent } from '../core/events';
import { Meta } from '../core/MetaState';
import { getSettings } from '../core/settings';
import type { ChestItem, ChestReward, CombatContext, Offer, RunModifier, RunSystem } from './context';
import type { WeaponManager } from './weapons';

type Cand = { offer: Offer; w: number };

/** 权重随机取下标 */
function weightedIndex(cands: Cand[]): number {
  let sum = 0;
  for (const c of cands) sum += c.w;
  let r = Math.random() * sum;
  for (let i = 0; i < cands.length; i++) {
    r -= cands[i].w;
    if (r <= 0) return i;
  }
  return 0;
}

export class LevelUpSystem implements RunSystem {
  constructor(
    private ctx: CombatContext,
    private weapons: WeaponManager,
    private modifiers: RunModifier[],
    private grantArcana: (id: ArcanaId) => void,
  ) {}

  /** 每帧末尾检查待结算升级；规则卡开局选卡优先于升级 */
  update(_dt: number): void {
    const run = this.ctx.run;
    if (run.pendingArcana && !run.choosing) {
      this.openArcanaPick();
      return;
    }
    if (run.pendingLevels > 0 && !run.choosing) this.openLevelUp();
  }

  // ---------- 规则卡选卡（M9：开局从全部未持有卡中任选 1） ----------

  private openArcanaPick(): void {
    const ctx = this.ctx;
    const run = ctx.run;
    run.pendingArcana = false;
    // M13：机制卡未达成对应成就时不进池（basic 恒可用；调试直给不受限）
    const pool = ARCANA_META.map((m) => m.id)
      .filter((id) => !run.arcana.includes(id) && Meta.isArcanaUnlocked(id));
    if (pool.length === 0) return;
    run.choosing = true;
    SFX.levelup();
    ctx.fx.ring(ctx.player.x, ctx.player.y, 0xe2b452, 7, 0.6);
    ctx.scene.scene.pause();
    emitEvent(ctx.scene.game, 'hud:arcana', pool);
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
    this.curOffers = this.rollOffers();
    ctx.scene.scene.pause();
    emitEvent(ctx.scene.game, 'hud:levelup', this.curOffers);
  }

  /** 当前面板上的三选一（reroll/banish 原位改写后重发事件） */
  private curOffers: Offer[] = [];

  private rollOffers(): Offer[] {
    let offers = this.buildOffers();
    for (const m of this.modifiers) {
      if (m.modifyOffers) offers = m.modifyOffers(offers);
    }
    return offers;
  }

  private buildCands(): Cand[] {
    const run = this.ctx.run;
    const cands: Cand[] = [];
    for (const meta of WEAPON_META) {
      if (run.banished.has('w_' + meta.id)) continue;
      const w = this.weapons.get(meta.id);
      if (w) {
        if (w.level < WEAPON_MAX_LEVEL && !w.evolved) {
          cands.push({ offer: { kind: 'weapon', id: meta.id, isNew: false, toLevel: w.level + 1 }, w: 3 });
        }
      } else if (this.weapons.list.length < run.stats.maxWeapons) {
        // 槽上限读 stats（M13 allin 降为 4：已超出不移除，仅停止新供给；精华触发随之提前）
        cands.push({ offer: { kind: 'weapon', id: meta.id, isNew: true, toLevel: 1 }, w: 2.2 });
      }
    }
    for (const meta of PASSIVE_META) {
      if (run.banished.has('p_' + meta.id)) continue;
      const lv = run.passives.get(meta.id) ?? 0;
      if (lv > 0) {
        if (lv < PASSIVE_MAX_LEVEL) {
          cands.push({ offer: { kind: 'passive', id: meta.id, isNew: false, toLevel: lv + 1 }, w: 2.5 });
        }
      } else if (run.passives.size < MAX_PASSIVES) {
        cands.push({ offer: { kind: 'passive', id: meta.id, isNew: true, toLevel: 1 }, w: 2 });
      }
    }
    return cands;
  }

  private buildOffers(): Offer[] {
    const cands = this.buildCands();
    if (cands.length === 0) {
      // 晨露精华（M12 Limit Break）：满构筑后升级溢出 = 三轴微量永续成长 + 保留回血
      // （reroll/banish 对精华卡不可用——HUD 侧禁用；skip 照常可用）
      return [
        { kind: 'essence', essence: 'dmg', isNew: false, toLevel: 0 },
        { kind: 'essence', essence: 'cd', isNew: false, toLevel: 0 },
        { kind: 'essence', essence: 'area', isNew: false, toLevel: 0 },
        { kind: 'heal', isNew: false, toLevel: 0 },
      ];
    }
    const out: Offer[] = [];
    // 候选张数读 stats（M13 默认 3；M14 ivy 四选一消费）
    for (let pick = 0; pick < this.ctx.stats.offers && cands.length > 0; pick++) {
      out.push(cands.splice(weightedIndex(cands), 1)[0].offer);
    }
    return out;
  }

  // ---------- 构筑操控（M10）：重抽 / 放逐 / 跳过 ----------

  /** 重抽：整组重跑候选与 modifiers 链，重发事件（HUD 先关旧面板再调用） */
  reroll(): void {
    const run = this.ctx.run;
    if (run.rerolls <= 0) return;
    run.rerolls--;
    this.curOffers = this.rollOffers();
    emitEvent(this.ctx.scene.game, 'hud:levelup', this.curOffers);
  }

  /** 放逐：仅 weapon/passive 卡；该卡原位重抽一张（其余不动），整局（含宝箱升级层）不再出现 */
  banish(offer: Offer): void {
    const run = this.ctx.run;
    if (run.banishes <= 0 || !offer.id) return;
    if (offer.kind !== 'weapon' && offer.kind !== 'passive') return;
    run.banishes--;
    run.banished.add((offer.kind === 'weapon' ? 'w_' : 'p_') + offer.id);
    const others = this.curOffers.filter((o) => o !== offer);
    let cands = this.buildCands().filter(
      (c) => !others.some((o) => o.kind === c.offer.kind && o.id === c.offer.id),
    );
    // onepath 等规则卡的 modifyOffers 对补抽卡同样生效（过滤空则保持原候选，兜底口径一致）
    for (const m of this.modifiers) {
      if (!m.modifyOffers) continue;
      const kept = m.modifyOffers(cands.map((c) => c.offer));
      const next = cands.filter((c) => kept.includes(c.offer));
      if (next.length > 0) cands = next;
    }
    const repl: Offer = cands.length > 0
      ? cands[weightedIndex(cands)].offer
      : { kind: 'heal', isNew: false, toLevel: 0 };
    const idx = this.curOffers.indexOf(offer);
    if (idx >= 0) this.curOffers[idx] = repl;
    emitEvent(this.ctx.scene.game, 'hud:levelup', this.curOffers);
  }

  /** 跳过：直接回到战斗，无补偿（跳过的价值 = 留着卡池位）；HUD 负责 resume */
  skip(): void {
    const run = this.ctx.run;
    if (run.skips <= 0) return;
    run.skips--;
    run.choosing = false;
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
    } else if (offer.kind === 'essence' && offer.essence) {
      ctx.run.essence[offer.essence]++;
      ctx.recomputeStats();
      ctx.fx.ring(ctx.player.x, ctx.player.y, 0xf2cf6e, 6, 0.55);
      SFX.chime();
    } else if (offer.kind === 'heal') {
      ctx.run.heal(ESSENCE.heal);
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

  /** 规则卡专属宝箱（M19）：只给规则卡（全卡池任选一），紫色箱体，独立于常规宝箱 */
  openArcanaChest(): void {
    const ctx = this.ctx;
    const pool = this.arcanaPool();
    // 兜底：spawn 前已校验 pool 非空；并发耗尽时给金币替代，避免空箱
    const reward: ChestReward = pool.length > 0
      ? { items: [{ kind: 'arcana', cards: pool }], arcana: true }
      : { items: [{ kind: 'gold', coins: CHEST.goldCoins, heal: CHEST.goldHeal }], arcana: true };
    SFX.chest();
    ctx.scene.scene.pause();
    emitEvent(ctx.scene.game, 'hud:chest', reward);
  }

  /** 精英是否额外掉规则卡宝箱：设置开 + 未达上限 + 仍有可得卡 + 命中概率（沿用 ARCANA.chestChance） */
  shouldDropArcanaChest(): boolean {
    const run = this.ctx.run;
    if (!getSettings().arcana || run.arcana.length >= ARCANA.maxPerRun) return false;
    if (this.arcanaPool().length === 0) return false;
    return this.ctx.rng() < ARCANA.chestChance;
  }

  /** 当前可获取的规则卡候选（未持有且已解锁） */
  private arcanaPool(): ArcanaId[] {
    const run = this.ctx.run;
    return ARCANA_META.map((m) => m.id).filter((id) => !run.arcana.includes(id) && Meta.isArcanaUnlocked(id));
  }

  private buildChestReward(): ChestReward {
    const run = this.ctx.run;
    // 件数：1 常见，3 / 5 稀有惊喜（先判 5 再判 3）
    const r = Math.random();
    const n = r < CHEST.pentaChance ? 5 : r < CHEST.pentaChance + CHEST.tripleChance ? 3 : 1;
    const items: ChestItem[] = [];
    // 1) 进化优先（每箱至多一件）
    const evolvable = this.weapons.evolvable();
    if (evolvable.length > 0) {
      items.push({ kind: 'evolve', weapon: evolvable[Math.floor(Math.random() * evolvable.length)] });
    }
    // 2) 已持有项升级（不放回抽取；放逐对宝箱升级件同样生效，保持一致性）
    //    M19：常规宝箱不再含规则卡——规则卡改由精英额外掉落的「规则卡专属宝箱」提供
    const cands: Offer[] = [];
    for (const w of this.weapons.list) {
      if (!w.evolved && w.level < WEAPON_MAX_LEVEL && !run.banished.has('w_' + w.id)) {
        cands.push({ kind: 'weapon', id: w.id, isNew: false, toLevel: w.level + 1 });
      }
    }
    for (const [pid, lv] of run.passives) {
      if (lv < PASSIVE_MAX_LEVEL && !run.banished.has('p_' + pid)) {
        cands.push({ kind: 'passive', id: pid, isNew: false, toLevel: lv + 1 });
      }
    }
    while (items.length < n && cands.length > 0) {
      items.push({ kind: 'upgrade', offer: cands.splice(Math.floor(Math.random() * cands.length), 1)[0] });
    }
    // 4) 金币兜底：候选耗尽的剩余件按件给金币（数额随件携带，规则卡 onChest 可改写）
    while (items.length < n) {
      items.push({ kind: 'gold', coins: CHEST.goldCoins, heal: CHEST.goldHeal });
    }
    return { items };
  }

  /** HUD 宝箱动画结束后回调；pick = 规则卡件玩家选中的卡（缺省取首张，autoPick 调试路径用） */
  applyChest(reward: ChestReward, pick?: ArcanaId): void {
    const ctx = this.ctx;
    for (const it of reward.items) {
      if (it.kind === 'evolve') {
        this.weapons.evolve(it.weapon);
        SFX.evolve();
      } else if (it.kind === 'arcana') {
        this.grantArcana(pick ?? it.cards[0]);
        SFX.levelup();
      } else if (it.kind === 'upgrade') {
        this.applyOne(it.offer);
      } else {
        ctx.run.addCoins(it.coins);
        ctx.run.heal(it.heal);
        SFX.coin();
      }
    }
    emitEvent(ctx.scene.game, 'hud:refresh');
  }
}
