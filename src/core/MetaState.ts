// 局外状态（MetaState）：金币 / 商店强化 / 图鉴点亮 / 成就 / 解锁 / 累计统计
// 存档读写经 core/save；与局内 RunState 配对
import type { PowerUpId } from '../content/ids';
import { POWERUPS, PowerUpSpec, powerUpPrice } from '../content/shop';
import { CodexCat, flushSave, getSave, persistSave, SaveV1 } from './save';

class MetaStateImpl {
  /** 图鉴点亮 Set 缓存：EnemySystem.spawn 高频调用，避免每次扫数组 */
  private litCache: Partial<Record<CodexCat, Set<string>>> = {};

  get save(): SaveV1 {
    return getSave();
  }

  // ---------- 金币 ----------

  get coins(): number {
    return this.save.coins;
  }

  /** countEarned=false 用于重置返还 / 调试加币（不计入累计获得） */
  addCoins(n: number, countEarned = true): void {
    const s = this.save;
    s.coins += n;
    if (countEarned) s.stats.coinsEarned += n;
    persistSave();
  }

  trySpend(n: number): boolean {
    const s = this.save;
    if (s.coins < n) return false;
    s.coins -= n;
    persistSave();
    return true;
  }

  // ---------- 商店强化 ----------

  powerUpLevel(id: PowerUpId): number {
    return this.save.powerUps[id] ?? 0;
  }

  buyPowerUp(spec: PowerUpSpec): boolean {
    const lv = this.powerUpLevel(spec.id);
    if (lv >= spec.max) return false;
    if (!this.trySpend(powerUpPrice(spec, lv))) return false;
    this.save.powerUps[spec.id] = lv + 1;
    this.save.stats.purchases++;
    persistSave();
    return true;
  }

  /** 已花费总额（重置返还数额 = 此值，按价格公式确定性重算） */
  powerUpSpent(): number {
    let sum = 0;
    for (const spec of POWERUPS) {
      const lv = this.powerUpLevel(spec.id);
      for (let i = 0; i < lv; i++) sum += powerUpPrice(spec, i);
    }
    return sum;
  }

  /** 重置全部强化并全额返还；返回返还数额 */
  resetPowerUps(): number {
    const refund = this.powerUpSpent();
    this.save.powerUps = {};
    this.save.coins += refund; // 返还不计入累计获得
    flushSave();
    return refund;
  }

  // ---------- 图鉴（首遇点亮 + New 角标） ----------

  private lit(cat: CodexCat): Set<string> {
    let s = this.litCache[cat];
    if (!s) {
      s = new Set(this.save.codex.lit[cat]);
      this.litCache[cat] = s;
    }
    return s;
  }

  /** 首遇点亮；返回是否为新点亮 */
  codexLight(cat: CodexCat, id: string): boolean {
    const set = this.lit(cat);
    if (set.has(id)) return false;
    set.add(id);
    this.save.codex.lit[cat].push(id);
    persistSave();
    return true;
  }

  codexLit(cat: CodexCat, id: string): boolean {
    return this.lit(cat).has(id);
  }

  /** 点亮但未浏览 → New 角标 */
  codexIsNew(cat: CodexCat, id: string): boolean {
    return this.codexLit(cat, id) && !this.save.codex.seen[cat].includes(id);
  }

  /** 浏览该分类后调用：清除整类 New 角标 */
  codexMarkSeen(cat: CodexCat): void {
    if (this.save.codex.seen[cat].length === this.save.codex.lit[cat].length) return;
    this.save.codex.seen[cat] = [...this.save.codex.lit[cat]];
    persistSave();
  }

  /** 图鉴是否有任何未浏览的新条目（主菜单角标） */
  codexHasNew(): boolean {
    const c = this.save.codex;
    return (Object.keys(c.lit) as CodexCat[]).some((k) => c.lit[k].length > c.seen[k].length);
  }

  // ---------- 成就 ----------

  hasAch(id: string): boolean {
    return this.save.achievements.includes(id);
  }

  /** 返回是否为新解锁 */
  unlockAch(id: string): boolean {
    if (this.hasAch(id)) return false;
    this.save.achievements.push(id);
    persistSave();
    return true;
  }

  // ---------- 解锁 ----------

  isUnlocked(kind: 'chars' | 'maps', id: string): boolean {
    return this.save.unlocked[kind].includes(id);
  }

  unlock(kind: 'chars' | 'maps', id: string): void {
    if (this.isUnlocked(kind, id)) return;
    this.save.unlocked[kind].push(id);
    persistSave();
  }

  // ---------- 结算入账 ----------

  /** 单局结束（结算页 / 中途退出）：统计累计 + 金币入账，立即落盘 */
  recordRun(r: { win: boolean; time: number; kills: number; coins: number }): void {
    const st = this.save.stats;
    st.runs++;
    if (r.win) st.wins++;
    st.kills += r.kills;
    st.playSeconds += Math.round(r.time);
    st.bestSurvival = Math.max(st.bestSurvival, Math.round(r.time));
    this.addCoins(Math.max(0, Math.round(r.coins)));
    flushSave();
  }
}

export const Meta = new MetaStateImpl();
