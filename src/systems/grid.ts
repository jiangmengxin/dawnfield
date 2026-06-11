// 均匀网格空间索引：敌人查询（武器索敌/AoE/接触判定/分离）都走这里，不用物理引擎
export interface GridItem {
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

export class SpatialGrid<T extends GridItem> {
  private cell: number;
  private map = new Map<number, T[]>();

  constructor(cell = 72) {
    this.cell = cell;
  }

  private key(cx: number, cy: number): number {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  rebuild(items: T[]): void {
    this.map.clear();
    for (const it of items) {
      if (!it.active) continue;
      const cx = Math.floor(it.x / this.cell);
      const cy = Math.floor(it.y / this.cell);
      const k = this.key(cx, cy);
      let arr = this.map.get(k);
      if (!arr) {
        arr = [];
        this.map.set(k, arr);
      }
      arr.push(it);
    }
  }

  /** 圆形范围查询（含目标半径），结果写入 out 并返回 */
  queryCircle(x: number, y: number, r: number, out: T[]): T[] {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r - 24) / c);
    const x1 = Math.floor((x + r + 24) / c);
    const y0 = Math.floor((y - r - 24) / c);
    const y1 = Math.floor((y + r + 24) / c);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const arr = this.map.get(this.key(cx, cy));
        if (!arr) continue;
        for (const it of arr) {
          const rr = r + it.radius;
          const dx = it.x - x;
          const dy = it.y - y;
          if (dx * dx + dy * dy <= rr * rr) out.push(it);
        }
      }
    }
    return out;
  }
}
