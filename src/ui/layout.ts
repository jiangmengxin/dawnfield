// 布局原语：不做约束求解，只提供一次性布局计算（resize 时全量重建）
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

/** 四边内缩（单值 = 四边等距） */
export function inset(r: Rect, top: number, right = top, bottom = top, left = right): Rect {
  return { x: r.x + left, y: r.y + top, w: r.w - left - right, h: r.h - top - bottom };
}

export function centerOf(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

type Track = number | 'flex';

function splitTracks(total: number, gap: number, tracks: Track[]): number[] {
  const fixed = tracks.reduce<number>((s, t) => s + (t === 'flex' ? 0 : t), 0);
  const flexN = tracks.filter((t) => t === 'flex').length;
  const flexSize = flexN > 0 ? Math.max(0, (total - fixed - gap * (tracks.length - 1)) / flexN) : 0;
  return tracks.map((t) => (t === 'flex' ? flexSize : t));
}

/** 垂直堆叠：heights 中 'flex' 平分剩余空间 */
export function vstack(r: Rect, gap: number, heights: Track[]): Rect[] {
  const hs = splitTracks(r.h, gap, heights);
  const out: Rect[] = [];
  let y = r.y;
  for (const h of hs) {
    out.push({ x: r.x, y, w: r.w, h });
    y += h + gap;
  }
  return out;
}

/** 水平排列：widths 中 'flex' 平分剩余空间 */
export function hstack(r: Rect, gap: number, widths: Track[]): Rect[] {
  const ws = splitTracks(r.w, gap, widths);
  const out: Rect[] = [];
  let x = r.x;
  for (const w of ws) {
    out.push({ x, y: r.y, w, h: r.h });
    x += w + gap;
  }
  return out;
}

/** 均分网格单元（按行优先顺序返回） */
export function gridCells(r: Rect, cols: number, rows: number, gap: number): Rect[] {
  const cw = (r.w - gap * (cols - 1)) / cols;
  const ch = (r.h - gap * (rows - 1)) / rows;
  const out: Rect[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      out.push({ x: r.x + i * (cw + gap), y: r.y + j * (ch + gap), w: cw, h: ch });
    }
  }
  return out;
}
