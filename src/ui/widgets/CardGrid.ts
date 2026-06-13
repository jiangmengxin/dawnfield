// 卡片网格：列数随面板宽度自适应，内容装入 ScrollPanel
import { Card, CardOpts } from './Card';
import { ScrollPanel } from './ScrollPanel';
import { THEME } from '../theme';

/** 网格内容四周留白：防卡片描边/阴影贴 ScrollPanel mask 被裁（左/上=描边余量，
 *  右=描边+阴影(3)+滚动条(5) 余量）。所有用 ScrollPanel 网格的页面统一复用。 */
export const GRID_PAD = { l: 6, t: 6, r: 12 } as const;

export type CardGridItem = Omit<CardOpts, 'w' | 'h' | 'layout'> & {
  /** 揭示动效（M16 隐藏角色首次亮相）：卡片翻转入场 + 星屑迸发 */
  reveal?: boolean;
};

export interface CardGridOpts {
  items: CardGridItem[];
  minCellW: number;
  aspect: number; // 高/宽
  gap?: number;
  /** 卡片布局（默认 column）；地图卡传 'banner' 走顶部色带版式（CARD1） */
  layout?: 'column' | 'banner';
}

/** 向 ScrollPanel 填充网格卡片；onTap 自动套拖动守卫 */
export function buildCardGrid(panel: ScrollPanel, opts: CardGridOpts): void {
  const gap = opts.gap ?? THEME.gapSm;
  const avail = panel.view.w - GRID_PAD.l - GRID_PAD.r;
  const cols = Math.max(1, Math.floor((avail + gap) / (opts.minCellW + gap)));
  const cw = (avail - gap * (cols - 1)) / cols;
  const ch = cw * opts.aspect;

  panel.setContent((add) => {
    opts.items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const { reveal, ...rest } = item;
      const onTap = rest.onTap;
      const cx = GRID_PAD.l + col * (cw + gap) + cw / 2;
      const cy = GRID_PAD.t + row * (ch + gap) + ch / 2;
      const card = new Card(panel.scene, cx, cy, {
        ...rest,
        w: cw,
        h: ch,
        layout: opts.layout ?? 'column',
        onTap: onTap ? () => { if (!panel.dragMoved) onTap(); } : undefined,
      });
      add(card);
      if (reveal) {
        // 揭示动效（M16）：横向翻转入场 + 星屑迸发（星屑与卡片同住内容容器，跟随滚动）
        card.setScale(0, 1);
        panel.scene.tweens.add({ targets: card, scaleX: 1, duration: 480, delay: 250, ease: 'Back.easeOut' });
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + Math.random() * 0.5;
          const star = panel.scene.add.image(cx, cy, 'p_star')
            .setTint(0xffd970).setScale(0.9 + Math.random() * 0.6).setAlpha(0);
          add(star);
          panel.scene.tweens.add({
            targets: star,
            x: cx + Math.cos(a) * (cw * 0.55 + Math.random() * 30),
            y: cy + Math.sin(a) * (ch * 0.55 + Math.random() * 30),
            alpha: { from: 1, to: 0 },
            rotation: (Math.random() - 0.5) * 4,
            delay: 250,
            duration: 700 + Math.random() * 300,
            ease: 'Cubic.easeOut',
            onComplete: () => star.destroy(),
          });
        }
      }
    });
    const rows = Math.ceil(opts.items.length / cols);
    return GRID_PAD.t + rows * ch + (rows - 1) * gap + THEME.gapMd;
  });
}
