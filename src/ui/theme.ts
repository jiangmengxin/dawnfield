// UI 主题常量：间距 / 圆角 / 字号档 / 命中区，配色沿用 gfx/palette
export const THEME = {
  // 间距档
  gapXs: 6,
  gapSm: 10,
  gapMd: 16,
  gapLg: 24,

  // 圆角
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 16,

  // 字号基准（经 vp.fs() 缩放）
  fontTitle: 40,
  fontH1: 28,
  fontH2: 22,
  fontBody: 17,
  fontSmall: 14,
  fontTiny: 12,

  // 触控命中区下限（pt）
  hitMin: 44,

  // 标准菜单按钮规格（暂停/结算/确认等成组按钮统一用这一档）
  btnW: 240,
  btnH: 54,
  btnFs: 19,

  // 描边
  strokeCard: 2.5,
  strokeAccent: 3,

  // 投影偏移（纸面风格）
  shadowDx: 2,
  shadowDy: 4,
  shadowAlpha: 0.08,

  // 动效令牌（克制统一：入场 ≤300ms，回弹幅度收小）——FX2
  animFast: 180,
  animIn: 280,
  animSlow: 420,
  easeIn: 'Back.easeOut',
  easeOut: 'Cubic.easeOut',
} as const;
