// 武器 DPS 统计（M8 调试面板）：每武器滚动窗口 DPS + 累计伤害
// 直击经 WeaponManager 的武器子上下文归账；灼烧区域伤害经 ZoneSpec.src 归账
const WINDOW = 10; // 滚动窗口（秒）

export class DpsTracker {
  private buckets = new Map<string, Float64Array>(); // src → 每秒伤害环形桶
  private totals = new Map<string, number>();
  private slot = 0;
  private slotT = 0;
  private elapsed = 0;

  add(src: string, dmg: number): void {
    let b = this.buckets.get(src);
    if (!b) {
      b = new Float64Array(WINDOW);
      this.buckets.set(src, b);
    }
    b[this.slot] += dmg;
    this.totals.set(src, (this.totals.get(src) ?? 0) + dmg);
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.slotT += dt;
    while (this.slotT >= 1) {
      this.slotT -= 1;
      this.slot = (this.slot + 1) % WINDOW;
      for (const b of this.buckets.values()) b[this.slot] = 0;
    }
  }

  /** [src, 窗口 DPS, 累计伤害] 按 DPS 降序 */
  entries(): Array<[string, number, number]> {
    const span = Math.max(1, Math.min(this.elapsed, WINDOW));
    const out: Array<[string, number, number]> = [];
    for (const [src, b] of this.buckets) {
      let sum = 0;
      for (let i = 0; i < WINDOW; i++) sum += b[i];
      out.push([src, sum / span, this.totals.get(src) ?? 0]);
    }
    out.sort((a, b) => b[1] - a[1]);
    return out;
  }
}
