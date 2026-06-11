// 卡片网格：列数随面板宽度自适应，内容装入 ScrollPanel
import { Card, CardOpts } from './Card';
import { ScrollPanel } from './ScrollPanel';
import { THEME } from '../theme';

export type CardGridItem = Omit<CardOpts, 'w' | 'h' | 'layout'>;

export interface CardGridOpts {
  items: CardGridItem[];
  minCellW: number;
  aspect: number; // 高/宽
  gap?: number;
}

/** 向 ScrollPanel 填充网格卡片；onTap 自动套拖动守卫 */
export function buildCardGrid(panel: ScrollPanel, opts: CardGridOpts): void {
  const gap = opts.gap ?? THEME.gapSm;
  const cols = Math.max(1, Math.floor((panel.view.w - 10 + gap) / (opts.minCellW + gap)));
  const cw = (panel.view.w - 10 - gap * (cols - 1)) / cols;
  const ch = cw * opts.aspect;

  panel.setContent((add) => {
    opts.items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const onTap = item.onTap;
      const card = new Card(panel.scene, col * (cw + gap) + cw / 2, row * (ch + gap) + ch / 2, {
        ...item,
        w: cw,
        h: ch,
        layout: 'column',
        onTap: onTap ? () => { if (!panel.dragMoved) onTap(); } : undefined,
      });
      add(card);
    });
    const rows = Math.ceil(opts.items.length / cols);
    return rows * ch + (rows - 1) * gap + THEME.gapMd;
  });
}
