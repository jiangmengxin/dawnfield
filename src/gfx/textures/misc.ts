// 通用纹理：阴影 / 拾取物 / 粒子 / 地面装饰 / 掉落道具图标 / 虚拟摇杆
import { PAL, cssOf } from '../palette';
import { makeTex, petalShape, softGlow, star } from './core';
import { DROP_ITEMS } from '../../content/dropItems';
import type { DropItemId } from '../../content/ids';

type Ctx2D = CanvasRenderingContext2D;

function rrPath(c: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** 白色椭圆高光（受光点），所有掉落道具图标共用 */
function hi(c: Ctx2D, x: number, y: number, rx: number, ry: number, rot = 0, a = 0.6): void {
  c.fillStyle = `rgba(255,255,255,${a})`;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fill();
}

/** 物件主体径向渐变（左上受光）：a=高光色 → b=暗部色 */
function rad(c: Ctx2D, x: number, y: number, r: number, a: string, b: string): CanvasGradient {
  const g = c.createRadialGradient(x - r * 0.32, y - r * 0.34, r * 0.15, x, y, r);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

// 掉落道具图标：每个 id 一个立体小物件（渐变主体 + 同色系描边 + 白色高光），与金币/红心同级质感。
// 画布 28×28，物件居中（约半径 11，留 3px 边距）；spec.color 仅供 HUD/粒子，图标用各自更丰富的配色。
const DROP_ICONS: Record<DropItemId, (c: Ctx2D) => void> = {
  // ===== 通用 =====
  magnet: (c) => {
    const x = 14, y = 11, R = 6.4, by = 20;
    c.lineCap = 'round';
    const path = (): void => { c.beginPath(); c.arc(x, y, R, Math.PI, 0); c.moveTo(x - R, y); c.lineTo(x - R, by); c.moveTo(x + R, y); c.lineTo(x + R, by); };
    c.lineWidth = 8.5; c.strokeStyle = '#3E86B0'; path(); c.stroke();
    c.lineWidth = 5; c.strokeStyle = '#79C6E6'; path(); c.stroke();
    for (const tx of [x - R, x + R]) { rrPath(c, tx - 2.8, by - 1, 5.6, 3.8, 1.2); c.fillStyle = '#ECEFF1'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = '#A7B2BA'; c.stroke(); }
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(x, y, R, Math.PI * 1.12, Math.PI * 1.62); c.stroke();
  },
  nuke: (c) => {
    const x = 14, y = 14;
    c.beginPath();
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 4.6 : 11; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath(); c.fillStyle = rad(c, x, y, 11, '#FFC766', '#EE8B36'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#CC6F26'; c.stroke();
    c.fillStyle = rad(c, x, y, 5, '#FFF6D8', '#FBC95E'); c.beginPath(); c.arc(x, y, 4.4, 0, Math.PI * 2); c.fill();
    hi(c, x - 1.6, y - 1.8, 1.7, 1.1, -0.5, 0.85);
  },
  timestop: (c) => {
    const x = 14;
    c.fillStyle = '#BBA2E2'; c.strokeStyle = '#8C72BE'; c.lineWidth = 1.6;
    rrPath(c, x - 7, 4, 14, 3, 1.3); c.fill(); c.stroke();
    rrPath(c, x - 7, 21, 14, 3, 1.3); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.4; c.strokeStyle = '#8C72BE';
    c.beginPath(); c.moveTo(x - 5.4, 7.2); c.lineTo(x + 5.4, 7.2); c.lineTo(x, 14); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x, 14); c.lineTo(x - 5.4, 20.8); c.lineTo(x + 5.4, 20.8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#F1C95F';
    c.beginPath(); c.moveTo(x - 3, 9); c.lineTo(x + 3, 9); c.lineTo(x, 12.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - 4.6, 20); c.lineTo(x + 4.6, 20); c.lineTo(x, 16.2); c.closePath(); c.fill();
    c.fillRect(x - 0.5, 13, 1, 4.5);
  },
  heal: (c) => {
    const x = 14, y = 15;
    c.beginPath(); c.moveTo(x, y - 9.5); c.bezierCurveTo(x + 8, y - 1.5, x + 6.2, y + 8, x, y + 8); c.bezierCurveTo(x - 6.2, y + 8, x - 8, y - 1.5, x, y - 9.5); c.closePath();
    c.fillStyle = rad(c, x, y + 1, 10, '#FFCBD6', '#E87C95'); c.fill(); c.lineWidth = 1.7; c.strokeStyle = '#D2647E'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.fillRect(x - 1, y - 2.6, 2, 6.2); c.fillRect(x - 3.1, y - 0.5, 6.2, 2);
    hi(c, x - 2.6, y - 2, 1.5, 3, -0.3, 0.5);
  },
  frenzy: (c) => {
    c.beginPath();
    c.moveTo(7, 12); c.quadraticCurveTo(14, 9, 20, 8); c.quadraticCurveTo(25, 9, 24.5, 14);
    c.quadraticCurveTo(25, 19, 20, 20); c.quadraticCurveTo(14, 19, 7, 16); c.quadraticCurveTo(4.5, 14, 7, 12); c.closePath();
    c.fillStyle = rad(c, 16, 14, 11, '#FFE79A', '#E6B146'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#C7902F'; c.stroke();
    c.fillStyle = '#D7A23C'; c.beginPath(); c.ellipse(22, 14, 2.2, 4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#F2CC60'; c.beginPath(); c.arc(6.5, 14, 2.4, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#C7902F'; c.stroke();
    hi(c, 12, 11, 3.4, 1.2, -0.2, 0.6);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(3, 11); c.lineTo(1, 11); c.moveTo(3.2, 14); c.lineTo(0.8, 14); c.moveTo(3, 17); c.lineTo(1.2, 17); c.stroke();
  },
  aegis: (c) => {
    const x = 14, y = 13;
    c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 8, y - 6); c.lineTo(x + 8, y); c.quadraticCurveTo(x + 8, y + 7, x, y + 11); c.quadraticCurveTo(x - 8, y + 7, x - 8, y); c.lineTo(x - 8, y - 6); c.closePath();
    c.fillStyle = rad(c, x, y, 12, '#FFE69A', '#E3B24E'); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#C18F35'; c.stroke();
    star(c, x, y, 5, 4.2, 1.8, '#FFF7DC');
    hi(c, x - 3, y - 4, 2.6, 1.4, -0.4, 0.45);
  },
  xpburst: (c) => {
    const spark = (x: number, y: number, s: number, fill: string | CanvasGradient): void => {
      c.fillStyle = fill; c.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = i % 2 ? s * 0.32 : s; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.closePath(); c.fill();
    };
    spark(14, 14, 10, rad(c, 14, 14, 10, '#F0DBFF', '#B583E8')); c.lineWidth = 1.4; c.strokeStyle = '#9A63D0'; c.stroke();
    spark(22, 8, 4, '#E9CBFF'); spark(7, 20, 3.2, '#E9CBFF');
    hi(c, 12, 12, 1.8, 1.8, 0, 0.85);
  },

  // ===== meadow =====
  bloomburst: (c) => {
    const x = 14, y = 14;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; c.fillStyle = rad(c, x + Math.cos(a) * 5.2, y + Math.sin(a) * 5.2, 5, '#FFD3E2', '#F6A6C4'); c.beginPath(); c.ellipse(x + Math.cos(a) * 5.2, y + Math.sin(a) * 5.2, 4.4, 3, a, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#E083AC'; c.stroke(); }
    c.fillStyle = rad(c, x, y, 4, '#FFECA8', '#F0B24E'); c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#D7912F'; c.stroke();
    hi(c, x - 1.2, y - 1.4, 1.3, 0.9, -0.4, 0.6);
  },
  verdant: (c) => {
    const x = 14, y = 14;
    c.beginPath(); c.moveTo(x - 6, y + 7); c.quadraticCurveTo(x - 9, y - 5, x + 2, y - 8); c.quadraticCurveTo(x + 9, y + 1, x - 6, y + 7); c.closePath();
    c.fillStyle = rad(c, x - 1, y - 1, 12, '#C7E89A', '#7FBF5A'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#5E9A40'; c.stroke();
    c.strokeStyle = '#5E9A40'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x - 5, y + 6); c.quadraticCurveTo(x - 1, y - 1, x + 1.5, y - 7); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.moveTo(x - 2.6, y + 1.6); c.lineTo(x - 4.6, y + 3); c.moveTo(x - 0.6, y - 2); c.lineTo(x - 2.8, y - 1); c.stroke();
    hi(c, x + 1, y - 3, 2, 1.1, -0.6, 0.5);
  },

  // ===== pond =====
  ebbaegis: (c) => {
    const x = 14, y = 14;
    c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fillStyle = rad(c, x, y, 9, '#CFEFF8', '#5FB6D8'); c.fill(); c.lineWidth = 1.7; c.strokeStyle = '#3E94BE'; c.stroke();
    c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(x, y + 1, 5, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    hi(c, x - 3, y - 3.4, 2.6, 1.7, -0.5, 0.85);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x + 3.5, y - 2, 1.2, 0, Math.PI * 2); c.fill();
  },
  ripple: (c) => {
    const x = 14, y = 15;
    c.strokeStyle = '#4FA6CE'; c.lineWidth = 1.8;
    for (const r of [9.5, 6.5, 3.6]) { c.globalAlpha = r > 7 ? 0.5 : r > 5 ? 0.75 : 1; c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); c.stroke(); }
    c.globalAlpha = 1;
    c.beginPath(); c.moveTo(x, y - 8); c.bezierCurveTo(x + 3.4, y - 3.5, x + 2.6, y - 0.5, x, y - 0.5); c.bezierCurveTo(x - 2.6, y - 0.5, x - 3.4, y - 3.5, x, y - 8); c.closePath();
    c.fillStyle = rad(c, x, y - 3, 4, '#CFEFF8', '#69B8DA'); c.fill(); c.lineWidth = 1.3; c.strokeStyle = '#3E94BE'; c.stroke();
  },

  // ===== hills =====
  tailwind: (c) => {
    c.lineCap = 'round';
    const line = (y: number, len: number, w: number): void => { c.lineWidth = w; c.beginPath(); c.moveTo(5, y); c.lineTo(5 + len, y); c.quadraticCurveTo(5 + len + 5, y, 5 + len + 1, y - 4); c.stroke(); };
    c.strokeStyle = '#6FA248'; line(9, 11, 4.6); line(15, 14, 5); line(21, 8, 4.2);
    c.strokeStyle = '#C2E29A'; line(9, 11, 2.6); line(15, 14, 3); line(21, 8, 2.4);
  },
  whirlwind: (c) => {
    c.beginPath(); c.moveTo(5, 6); c.quadraticCurveTo(14, 4, 23, 6); c.lineTo(17, 22); c.quadraticCurveTo(14, 24, 11, 22); c.closePath();
    c.fillStyle = rad(c, 14, 12, 12, '#CFE6BE', '#8FC06A'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#5E9A40'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(14, 8, 8, 2.2, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(14, 13, 6, 1.9, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(14, 18, 3.5, 1.4, 0, 0, Math.PI * 2); c.stroke();
  },

  // ===== grove =====
  sporebloom: (c) => {
    const x = 14;
    c.fillStyle = '#EDE3C8'; c.strokeStyle = '#B7A878'; c.lineWidth = 1.4; rrPath(c, x - 3, 13, 6, 9, 2.5); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 9, 14); c.quadraticCurveTo(x - 9, 5, x, 5); c.quadraticCurveTo(x + 9, 5, x + 9, 14); c.closePath();
    c.fillStyle = rad(c, x, 9, 12, '#A7D684', '#6FAE4E'); c.fill(); c.lineWidth = 1.7; c.strokeStyle = '#54893C'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [dx, dy, r] of [[-3.5, 9, 1.6], [2.5, 8, 2], [5, 11, 1.3], [-0.5, 11.5, 1.2]]) { c.beginPath(); c.arc(x + dx, dy, r, 0, Math.PI * 2); c.fill(); }
    hi(c, x - 3, 7.5, 2.4, 1.2, -0.4, 0.5);
  },
  fireflies: (c) => {
    softGlow(c, 14, 14, 12, 'rgba(248,232,128,0.5)');
    c.fillStyle = rad(c, 14, 14, 5, '#FFF6C2', '#F2D24E'); c.beginPath(); c.arc(14, 14, 4.6, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.3; c.strokeStyle = '#D8B23A'; c.stroke();
    hi(c, 12.4, 12.4, 1.5, 1, -0.5, 0.85);
    for (const [x, y, r] of [[22, 8, 2.2], [7, 9, 1.8], [20, 20, 1.9], [8, 21, 1.6]]) { softGlow(c, x, y, r * 2.2, 'rgba(248,232,128,0.55)'); c.fillStyle = '#FFF1A8'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  },

  // ===== lavender =====
  pollenfrenzy: (c) => {
    c.strokeStyle = '#7FA85A'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, 23); c.lineTo(14, 12); c.stroke();
    for (const [x, y, rx, ry] of [[14, 8, 4.5, 5.5], [11, 12, 3, 3.6], [17, 12, 3, 3.6], [14, 13.5, 3.2, 4]]) { c.fillStyle = rad(c, x, y - 1, ry + 1, '#E6CCF6', '#B07FDC'); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.3; c.strokeStyle = '#8E5EBE'; c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.85)'; for (const [x, y] of [[12, 6], [16, 9]]) { c.beginPath(); c.arc(x, y, 0.9, 0, Math.PI * 2); c.fill(); }
    hi(c, 12.5, 6.5, 1.6, 1, -0.4, 0.5);
  },
  beeswarm: (c) => {
    const x = 14, y = 15;
    c.fillStyle = 'rgba(255,255,255,0.82)'; c.strokeStyle = 'rgba(150,150,160,0.6)'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(x - 2, y - 5, 3.4, 2.2, -0.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(x + 3, y - 5, 3.4, 2.2, 0.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = rad(c, x, y, 8, '#FFE08A', '#F2C03E'); c.beginPath(); c.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#C9912E'; c.stroke();
    c.fillStyle = '#5A4632'; for (const dy of [-1.5, 2.5]) { c.beginPath(); c.ellipse(x, y + dy, 4.4, 1.4, 0, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.arc(x, y - 6.6, 2.2, 0, Math.PI * 2); c.fill();
    hi(c, x - 2.4, y - 2, 1.5, 2, -0.3, 0.4);
  },

  // ===== bramble =====
  thornnova: (c) => {
    const x = 14, y = 14;
    c.beginPath();
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 3.8 : 11; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath(); c.fillStyle = rad(c, x, y, 11, '#F2A6BE', '#C86680'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#A84E68'; c.stroke();
    c.fillStyle = rad(c, x, y, 4, '#FFE0EA', '#E58CA8'); c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fill();
    hi(c, x - 1.4, y - 1.6, 1.4, 1, -0.5, 0.7);
  },
  berryfeast: (c) => {
    c.fillStyle = '#8FBF5C'; c.strokeStyle = '#5E9A40'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(15, 6, 4, 2.2, 0.5, 0, Math.PI * 2); c.fill(); c.stroke();
    const berry = (x: number, y: number, r: number): void => { c.fillStyle = rad(c, x, y, r, '#F4889E', '#C84E6E'); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#A83E5C'; c.stroke(); hi(c, x - r * 0.4, y - r * 0.45, r * 0.32, r * 0.22, -0.5, 0.8); };
    berry(10, 15, 5); berry(18, 15, 5); berry(14, 20, 5);
  },

  // ===== nocturne =====
  fullmoon: (c) => {
    softGlow(c, 14, 14, 13, 'rgba(245,245,225,0.4)');
    c.fillStyle = rad(c, 14, 14, 9, '#FFFDF0', '#E6E2C8'); c.beginPath(); c.arc(14, 14, 8.5, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#C9C4A4'; c.stroke();
    c.fillStyle = 'rgba(190,186,158,0.45)';
    for (const [x, y, r] of [[11, 11, 2], [17, 13, 1.5], [13, 17, 1.7]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    hi(c, 11, 10, 2.4, 1.5, -0.4, 0.6);
  },
  meteor: (c) => {
    c.fillStyle = 'rgba(168,180,232,0.5)'; c.beginPath(); c.moveTo(6, 22); c.lineTo(14, 12); c.lineTo(17, 15); c.closePath(); c.fill();
    c.fillStyle = 'rgba(208,216,248,0.7)'; c.beginPath(); c.moveTo(8, 21); c.lineTo(14, 13); c.lineTo(15.5, 14.5); c.closePath(); c.fill();
    c.fillStyle = rad(c, 18, 10, 6, '#FFFFFF', '#A8B4E8'); c.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = i % 2 ? 2 : 5.6; c[i ? 'lineTo' : 'moveTo'](18 + Math.cos(a) * r, 10 + Math.sin(a) * r); }
    c.closePath(); c.fill(); c.lineWidth = 1.3; c.strokeStyle = '#7E8AC8'; c.stroke();
  },

  // ===== summit =====
  beaconsurge: (c) => {
    const x = 14;
    c.fillStyle = '#C89848'; c.strokeStyle = '#A87838'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x - 5, 22); c.lineTo(x + 5, 22); c.lineTo(x + 3, 16); c.lineTo(x - 3, 16); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x, 4); c.quadraticCurveTo(x + 6, 11, x + 3.5, 15); c.quadraticCurveTo(x + 4, 17, x, 17); c.quadraticCurveTo(x - 4, 17, x - 3.5, 15); c.quadraticCurveTo(x - 2, 11, x, 4); c.closePath();
    c.fillStyle = rad(c, x, 12, 9, '#FFE27A', '#F0902E'); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#D2792A'; c.stroke();
    c.fillStyle = rad(c, x, 13, 5, '#FFF6C8', '#F7C24E'); c.beginPath(); c.moveTo(x, 9); c.quadraticCurveTo(x + 2.6, 13, x, 16); c.quadraticCurveTo(x - 2.6, 13, x, 9); c.closePath(); c.fill();
  },
  dawnnova: (c) => {
    const x = 14, y = 16;
    c.strokeStyle = '#F4C84E'; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI; c.beginPath(); c.moveTo(x + Math.cos(a) * 8.5, y + Math.sin(a) * 8.5); c.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); c.stroke(); }
    c.fillStyle = rad(c, x, y, 8, '#FFF0B0', '#F4B43E'); c.beginPath(); c.arc(x, y, 7, Math.PI, 0); c.closePath(); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#D89A2E'; c.stroke();
    c.strokeStyle = '#D89A2E'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.stroke();
    hi(c, x - 2.5, y - 3.5, 2.4, 1.3, -0.3, 0.6);
  },

  // ===== orchard =====
  goldapple: (c) => {
    c.beginPath(); c.arc(14, 15, 8.5, 0, Math.PI * 2); c.fillStyle = rad(c, 14, 14, 10, '#FFD88A', '#D98A48'); c.fill(); c.lineWidth = 1.7; c.strokeStyle = '#A85E34'; c.stroke();
    c.strokeStyle = '#7C6A38'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(14, 7); c.quadraticCurveTo(15, 4, 18, 3); c.stroke();
    c.fillStyle = '#8FBC62'; c.beginPath(); c.ellipse(18, 6, 4, 2.2, 0.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#5F8A40'; c.stroke();
    hi(c, 11, 11, 2.2, 1.4, -0.5, 0.7);
  },
  seedwhirl: (c) => {
    c.strokeStyle = '#8A6A34'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.arc(14, 14, 8.5, 0.2, Math.PI * 1.65); c.stroke();
    c.beginPath(); c.arc(14, 14, 5, Math.PI * 1.2, Math.PI * 2.65); c.stroke();
    for (const [x, y, r] of [[21, 8, 2.4], [7, 17, 2], [15, 13, 1.8]] as const) { c.fillStyle = rad(c, x, y, r + 1, '#F5D48A', '#B98842'); c.beginPath(); c.ellipse(x, y, r, r + 1, -0.3, 0, Math.PI * 2); c.fill(); }
  },

  // ===== snowbell =====
  snowglobe: (c) => {
    c.beginPath(); c.arc(14, 13, 9, 0, Math.PI * 2); c.fillStyle = rad(c, 14, 12, 10, '#FFFFFF', '#8EC8E0'); c.fill(); c.lineWidth = 1.7; c.strokeStyle = '#5F9FC0'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(10, 9, 2.5, 1.5, -0.5, 0, Math.PI * 2); c.fill();
    rrPath(c, 8, 21, 12, 3.5, 1.2); c.fillStyle = '#B88A58'; c.fill(); c.strokeStyle = '#8A6038'; c.stroke();
  },
  frostbell: (c) => {
    c.beginPath(); c.moveTo(7, 19); c.quadraticCurveTo(8, 7, 14, 4); c.quadraticCurveTo(20, 7, 21, 19); c.lineTo(23, 22); c.lineTo(5, 22); c.closePath();
    c.fillStyle = rad(c, 14, 12, 11, '#E8FCFF', '#86C6DA'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#5A9EB8'; c.stroke();
    star(c, 14, 13, 6, 4.6, 1.9, '#FFFFFF');
  },

  // ===== mirage =====
  prismshard: (c) => {
    c.beginPath(); c.moveTo(14, 3); c.lineTo(24, 12); c.lineTo(18, 25); c.lineTo(8, 25); c.lineTo(4, 12); c.closePath();
    c.fillStyle = rad(c, 14, 12, 13, '#FFFFFF', '#B99BE8'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#8A66C0'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(14, 3); c.lineTo(18, 25); c.lineTo(14, 18); c.closePath(); c.fill();
  },
  mirrorbloom: (c) => {
    const x = 14, y = 14;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 2.6, a, 0, Math.PI * 2); c.fillStyle = rad(c, x, y, 12, '#FCEBFF', '#C79BE8'); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#9A66C0'; c.stroke(); }
    star(c, x, y, 5, 4.4, 1.8, '#FFFFFF');
  },

  // ===== clockwork =====
  clockkey: (c) => {
    c.strokeStyle = '#A87838'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.arc(8, 14, 4.8, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(13, 14); c.lineTo(25, 14); c.moveTo(20, 14); c.lineTo(20, 19); c.moveTo(23, 14); c.lineTo(23, 17); c.stroke();
    c.strokeStyle = '#F2D078'; c.lineWidth = 1.2; c.beginPath(); c.arc(8, 14, 2.2, 0, Math.PI * 2); c.stroke();
  },
  bellnova: (c) => {
    const x = 14, y = 15;
    c.strokeStyle = '#E0B850'; c.lineWidth = 1.8; c.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); c.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); c.stroke(); }
    c.beginPath(); c.moveTo(x - 6, y + 4); c.quadraticCurveTo(x - 5, y - 7, x, y - 10); c.quadraticCurveTo(x + 5, y - 7, x + 6, y + 4); c.lineTo(x + 8, y + 7); c.lineTo(x - 8, y + 7); c.closePath();
    c.fillStyle = rad(c, x, y, 10, '#FFE28A', '#D89838'); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#A86E2E'; c.stroke();
  },

  // ===== lethal map drops =====
  blossomsalvo: (c) => {
    const x = 14, y = 14;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.fillStyle = i % 2 ? '#F9B7D0' : '#FFDDE8'; c.beginPath(); c.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5, 2.2, a, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.1; c.strokeStyle = '#D86F9A'; c.stroke(); }
    star(c, x, y, 5, 5.2, 2.2, '#FFF2B8');
    hi(c, 11.5, 10.5, 1.7, 1.1, -0.4, 0.65);
  },
  tidalcrush: (c) => {
    const g = rad(c, 14, 14, 13, '#D8FAFF', '#56ADD8');
    c.fillStyle = g; c.beginPath(); c.ellipse(14, 15, 11, 8, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#378BB8'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.lineCap = 'round';
    for (const y of [10, 14, 18]) { c.beginPath(); c.moveTo(5, y); c.bezierCurveTo(9, y - 4, 19, y + 4, 23, y); c.stroke(); }
    hi(c, 10, 9.5, 2.6, 1.4, -0.4, 0.65);
  },
  galeblades: (c) => {
    c.strokeStyle = '#6CA058'; c.lineWidth = 2.4; c.lineCap = 'round';
    for (const [x1, y1, x2, y2] of [[5, 21, 23, 7], [4, 15, 20, 4], [9, 24, 25, 14]] as const) { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + 3, (y1 + y2) / 2, x2, y2); c.stroke(); }
    c.strokeStyle = '#D9E98E'; c.lineWidth = 1.2;
    for (const [x1, y1, x2, y2] of [[5, 21, 23, 7], [4, 15, 20, 4], [9, 24, 25, 14]] as const) { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + 3, (y1 + y2) / 2, x2, y2); c.stroke(); }
    star(c, 21, 7, 4, 2.7, 1.1, '#FFF6B8');
  },
  sporecascade: (c) => {
    softGlow(c, 14, 14, 12, 'rgba(143,200,120,0.45)');
    for (const [x, y, r] of [[10, 9, 4.5], [17, 11, 5], [13, 18, 6], [21, 19, 3.4]] as const) { c.fillStyle = rad(c, x, y, r + 2, '#CBE89A', '#6FAE4E'); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#4F8A3A'; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.25, r * 0.22, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#EDE3C8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(10, 9); c.lineTo(17, 11); c.lineTo(13, 18); c.lineTo(21, 19); c.stroke();
  },
  honeytempest: (c) => {
    softGlow(c, 14, 14, 12, 'rgba(240,200,80,0.45)');
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const x = 14 + Math.cos(a) * 7; const y = 14 + Math.sin(a) * 5; c.fillStyle = '#FFE08A'; c.beginPath(); c.ellipse(x, y, 3.3, 2.1, a, 0, Math.PI * 2); c.fill(); c.lineWidth = 1; c.strokeStyle = '#9A6A2A'; c.stroke(); c.strokeStyle = '#5A4632'; c.beginPath(); c.moveTo(x - 1.8, y); c.lineTo(x + 1.8, y); c.stroke(); }
    star(c, 14, 14, 5, 4.4, 1.8, '#FFF7C8');
  },
  bramblecrown: (c) => {
    const x = 14, y = 14;
    c.strokeStyle = '#A84860'; c.lineWidth = 2; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const r = i % 2 ? 7 : 11; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath(); c.stroke();
    c.fillStyle = rad(c, x, y, 8, '#F8A8C0', '#C85878'); c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#9A3F58'; c.stroke();
    hi(c, 12, 11, 1.8, 1.2, -0.4, 0.6);
  },
  constellationfall: (c) => {
    c.strokeStyle = '#A8B8F0'; c.lineWidth = 1.5; c.lineCap = 'round';
    const pts = [[6, 20], [10, 8], [18, 6], [23, 15], [16, 22]] as const;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.stroke();
    for (const [x, y] of pts) star(c, x, y, 4, 3.2, 1.3, '#FFFDF0');
    softGlow(c, 14, 14, 13, 'rgba(168,184,240,0.28)');
  },
  dawnlance: (c) => {
    c.fillStyle = rad(c, 14, 14, 12, '#FFF6C8', '#F4B43E'); c.beginPath(); c.moveTo(14, 3); c.lineTo(20, 14); c.lineTo(15.5, 25); c.lineTo(12.5, 25); c.lineTo(8, 14); c.closePath(); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#D09028'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(14, 5); c.lineTo(14, 22); c.stroke();
    star(c, 14, 7, 5, 4, 1.6, '#FFFFFF');
  },
  harvestcomet: (c) => {
    c.fillStyle = 'rgba(240,168,80,0.45)'; c.beginPath(); c.moveTo(4, 22); c.lineTo(15, 12); c.lineTo(18, 16); c.closePath(); c.fill();
    c.fillStyle = rad(c, 18, 10, 8, '#FFD88A', '#D87440'); c.beginPath(); c.arc(18, 10, 6.5, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#A85E34'; c.stroke();
    for (const [x, y] of [[8, 20], [12, 17], [6, 15]] as const) { c.fillStyle = '#B98842'; c.beginPath(); c.ellipse(x, y, 2, 2.8, -0.5, 0, Math.PI * 2); c.fill(); }
    hi(c, 15.5, 7.5, 1.8, 1, -0.4, 0.65);
  },
  frostcarillon: (c) => {
    c.beginPath(); c.moveTo(6, 19); c.quadraticCurveTo(8, 5, 14, 3); c.quadraticCurveTo(20, 5, 22, 19); c.lineTo(24, 22); c.lineTo(4, 22); c.closePath();
    c.fillStyle = rad(c, 14, 12, 12, '#FFFFFF', '#88D8E8'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#4E9CB8'; c.stroke();
    c.strokeStyle = '#E8FBFF'; c.lineWidth = 1.4; for (const r of [4, 7, 10]) { c.beginPath(); c.arc(14, 13, r, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    star(c, 14, 13, 6, 4.2, 1.7, '#FFFFFF');
  },
  prismstorm: (c) => {
    const pts = [[14, 3], [24, 11], [21, 23], [7, 23], [4, 11]] as const;
    c.fillStyle = rad(c, 14, 13, 14, '#FFFFFF', '#B99BE8'); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#8A66C0'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.1; for (let i = 0; i < pts.length; i++) { const a = pts[i]; const b = pts[(i + 2) % pts.length]; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    star(c, 14, 14, 5, 3.8, 1.5, '#FFFFFF');
  },
  grandchime: (c) => {
    const x = 14, y = 15;
    c.strokeStyle = '#E0B850'; c.lineWidth = 1.4; for (const r of [7, 10, 13]) { c.beginPath(); c.arc(x, y, r, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); }
    c.beginPath(); c.moveTo(x - 7, y + 5); c.quadraticCurveTo(x - 6, y - 8, x, y - 11); c.quadraticCurveTo(x + 6, y - 8, x + 7, y + 5); c.lineTo(x + 9, y + 8); c.lineTo(x - 9, y + 8); c.closePath();
    c.fillStyle = rad(c, x, y, 11, '#FFE69A', '#D89838'); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#A86E2E'; c.stroke();
    star(c, x, y - 1, 4, 3.6, 1.4, '#FFF7D0');
  },
};

export function createMiscTextures(scene: Phaser.Scene): void {
  // === 阴影 ===
  makeTex(scene, 'shadow', 64, 28, (ctx, w, h) => {
    // 渐变必须在 translate/scale 之后创建（渐变坐标按填充时的 CTM 变换），
    // 否则中心会偏到画布右侧；半径内缩 1px 防边缘截断
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2 - 1);
    g.addColorStop(0, 'rgba(90,82,72,0.20)');
    g.addColorStop(1, 'rgba(90,82,72,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // === 拾取物 ===
  makeTex(scene, 'gem', 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 7, 1, 8, 8, 7);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.55, '#E8E8E8');
    g.addColorStop(1, '#B8B8B8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(8, 8, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,120,120,0.6)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });

  makeTex(scene, 'coin', 18, 18, (ctx) => {
    ctx.beginPath();
    ctx.arc(9, 9, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD870';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D8A840';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, 9, 4.6, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(216,168,64,0.7)';
    ctx.stroke();
    star(ctx, 9, 9, 4, 3.2, 1.3, '#FFF2C0');
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(6.4, 5.8, 1.8, 1.1, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 击杀计数图标：柔和骨白小骷髅（粉彩向，不阴森）；尺寸对齐 coin(18) 便于 HUD 等大并列
  makeTex(scene, 'icon_kill', 18, 18, (ctx) => {
    ctx.lineJoin = 'round';
    // 头骨剪影：上圆下收 + 锯齿下颌（牙）；放大填满画布，与 coin(14px 圆) 视觉等大
    ctx.beginPath();
    ctx.moveTo(2.7, 9);
    ctx.bezierCurveTo(2.7, 2.6, 15.3, 2.6, 15.3, 9);
    ctx.bezierCurveTo(15.3, 12.4, 13.6, 13.2, 13.1, 15);
    ctx.lineTo(11.8, 17.1);
    ctx.lineTo(10.4, 15);
    ctx.lineTo(9, 17.1);
    ctx.lineTo(7.6, 15);
    ctx.lineTo(6.2, 17.1);
    ctx.lineTo(4.9, 15);
    ctx.bezierCurveTo(4.4, 13.2, 2.7, 12.4, 2.7, 9);
    ctx.closePath();
    ctx.fillStyle = '#F2ECDC';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#9A8F78';
    ctx.stroke();
    // 眼窝
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.beginPath();
    ctx.ellipse(5.9, 8, 2.4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12.1, 8, 2.4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 鼻
    ctx.beginPath();
    ctx.moveTo(9, 10.2);
    ctx.lineTo(7.8, 12.2);
    ctx.lineTo(10.2, 12.2);
    ctx.closePath();
    ctx.fill();
  });

  makeTex(scene, 'heart', 22, 20, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(11, 18);
    ctx.bezierCurveTo(0, 10, 2, 1.5, 8, 2.5);
    ctx.bezierCurveTo(10, 3, 11, 5, 11, 6);
    ctx.bezierCurveTo(11, 5, 12, 3, 14, 2.5);
    ctx.bezierCurveTo(20, 1.5, 22, 10, 11, 18);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.heart);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#D86870';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(7, 6, 2.4, 1.6, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 晨光宝箱：拱顶木盖 + 木纹箱体 + 金属箍/锁扣面板（明亮童话向，PAL.chest 金色系）
  makeTex(scene, 'chest', 44, 38, (ctx) => {
    softGlow(ctx, 22, 20, 18, 'rgba(232,200,120,0.5)');
    const rr = (x: number, y: number, w2: number, h2: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w2, y, x + w2, y + h2, r);
      ctx.arcTo(x + w2, y + h2, x, y + h2, r);
      ctx.arcTo(x, y + h2, x, y, r);
      ctx.arcTo(x, y, x + w2, y, r);
      ctx.closePath();
    };
    // 箱体（木纹渐变 + 板缝）
    const body = ctx.createLinearGradient(0, 17, 0, 34);
    body.addColorStop(0, '#EFC270');
    body.addColorStop(1, '#C8924A');
    rr(7, 17, 30, 17, 4);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#A87838';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(168,120,56,0.35)';
    for (const yy of [23.5, 28.5]) {
      ctx.beginPath();
      ctx.moveTo(9, yy);
      ctx.lineTo(35, yy);
      ctx.stroke();
    }
    // 箱体金属箍 ×2 + 铆钉
    for (const x of [10.5, 29.5]) {
      rr(x, 19.5, 4, 13, 1.5);
      ctx.fillStyle = '#F6E6B8';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#C09848';
      ctx.stroke();
      ctx.fillStyle = '#C09848';
      for (const yy of [22.5, 30]) {
        ctx.beginPath();
        ctx.arc(x + 2, yy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 拱顶箱盖（受光更亮）
    const lid = ctx.createLinearGradient(0, 5, 0, 18);
    lid.addColorStop(0, '#F8D88C');
    lid.addColorStop(1, '#D8A850');
    ctx.beginPath();
    ctx.moveTo(7, 18);
    ctx.lineTo(7, 13);
    ctx.quadraticCurveTo(7.5, 5, 22, 5);
    ctx.quadraticCurveTo(36.5, 5, 37, 13);
    ctx.lineTo(37, 18);
    ctx.closePath();
    ctx.fillStyle = lid;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#A87838';
    ctx.stroke();
    // 盖面高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(14.5, 9.5, 4.6, 2, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // 盖沿金属带（横贯）+ 端头铆钉
    rr(5.5, 15.5, 33, 4.5, 2);
    ctx.fillStyle = '#F6E6B8';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#C09848';
    ctx.stroke();
    ctx.fillStyle = '#C09848';
    for (const x of [8.5, 35.5]) {
      ctx.beginPath();
      ctx.arc(x, 17.8, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    // 锁扣面板 + 锁孔
    rr(18.5, 14, 7, 9.5, 2.5);
    ctx.fillStyle = '#FFF4CF';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#C09848';
    ctx.stroke();
    ctx.fillStyle = '#A87838';
    ctx.beginPath();
    ctx.arc(22, 17.6, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(21.2, 18.6);
    ctx.lineTo(22.8, 18.6);
    ctx.lineTo(22.5, 21.2);
    ctx.lineTo(21.5, 21.2);
    ctx.closePath();
    ctx.fill();
    // 星光点缀
    star(ctx, 35, 7, 4, 4.2, 1.7, '#FFFFFF');
    star(ctx, 9.5, 11, 4, 2.6, 1.1, 'rgba(255,255,255,0.85)');
  });

  // M19 规则卡宝箱：与晨光宝箱同形，紫罗兰配色 + 盖面 ✦ 徽记，一眼区分「这是规则卡箱」
  makeTex(scene, 'arcanachest', 44, 38, (ctx) => {
    softGlow(ctx, 22, 20, 18, 'rgba(180,140,224,0.5)');
    const rr = (x: number, y: number, w2: number, h2: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w2, y, x + w2, y + h2, r);
      ctx.arcTo(x + w2, y + h2, x, y + h2, r);
      ctx.arcTo(x, y + h2, x, y, r);
      ctx.arcTo(x, y, x + w2, y, r);
      ctx.closePath();
    };
    // 箱体（紫木纹渐变 + 板缝）
    const body = ctx.createLinearGradient(0, 17, 0, 34);
    body.addColorStop(0, '#C9A8E8');
    body.addColorStop(1, '#8E6BC0');
    rr(7, 17, 30, 17, 4);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#6E4FA0';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(110,79,160,0.4)';
    for (const yy of [23.5, 28.5]) {
      ctx.beginPath();
      ctx.moveTo(9, yy);
      ctx.lineTo(35, yy);
      ctx.stroke();
    }
    // 箱体金属箍 ×2 + 铆钉
    for (const x of [10.5, 29.5]) {
      rr(x, 19.5, 4, 13, 1.5);
      ctx.fillStyle = '#ECE0F8';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#9A7FC8';
      ctx.stroke();
      ctx.fillStyle = '#9A7FC8';
      for (const yy of [22.5, 30]) {
        ctx.beginPath();
        ctx.arc(x + 2, yy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 拱顶箱盖
    const lid = ctx.createLinearGradient(0, 5, 0, 18);
    lid.addColorStop(0, '#DCC2F2');
    lid.addColorStop(1, '#A887D8');
    ctx.beginPath();
    ctx.moveTo(7, 18);
    ctx.lineTo(7, 13);
    ctx.quadraticCurveTo(7.5, 5, 22, 5);
    ctx.quadraticCurveTo(36.5, 5, 37, 13);
    ctx.lineTo(37, 18);
    ctx.closePath();
    ctx.fillStyle = lid;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#6E4FA0';
    ctx.stroke();
    // 盖面高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(14.5, 9.5, 4.6, 2, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // 盖沿金属带 + 端头铆钉
    rr(5.5, 15.5, 33, 4.5, 2);
    ctx.fillStyle = '#ECE0F8';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#9A7FC8';
    ctx.stroke();
    ctx.fillStyle = '#9A7FC8';
    for (const x of [8.5, 35.5]) {
      ctx.beginPath();
      ctx.arc(x, 17.8, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    // 锁扣面板 + 锁孔
    rr(18.5, 14, 7, 9.5, 2.5);
    ctx.fillStyle = '#F4ECFF';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#9A7FC8';
    ctx.stroke();
    ctx.fillStyle = '#6E4FA0';
    ctx.beginPath();
    ctx.arc(22, 17.6, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(21.2, 18.6);
    ctx.lineTo(22.8, 18.6);
    ctx.lineTo(22.5, 21.2);
    ctx.lineTo(21.5, 21.2);
    ctx.closePath();
    ctx.fill();
    // 盖面 ✦ 规则卡徽记 + 星光点缀
    star(ctx, 22, 9.5, 4, 3.6, 1.5, '#FFF2C0');
    star(ctx, 35, 7, 4, 4.2, 1.7, '#FFFFFF');
    star(ctx, 9.5, 11, 4, 2.6, 1.1, 'rgba(255,255,255,0.85)');
  });

  // === 粒子 ===
  makeTex(scene, 'p_dot', 16, 16, (ctx) => {
    softGlow(ctx, 8, 8, 7.5, 'rgba(255,255,255,1)');
  });
  makeTex(scene, 'p_petal', 12, 12, (ctx) => {
    petalShape(ctx, 6, 6, 9, 3.4, 0.5, 'rgba(255,255,255,0.95)');
  });
  makeTex(scene, 'p_star', 16, 16, (ctx) => {
    star(ctx, 8, 8, 4, 7, 2.8, 'rgba(255,255,255,0.95)');
  });
  makeTex(scene, 'p_confetti', 8, 8, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(1, 1, 6, 6);
  });
  makeTex(scene, 'p_ring', 104, 104, (ctx) => {
    // 画布 104：外圈宽描边 42+6=48 < 52，原 96 时恰好顶边四侧被切；
    // 环半径保持 42，调用方 scale 语义不变
    ctx.beginPath();
    ctx.arc(52, 52, 42, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(52, 52, 42, 0, Math.PI * 2);
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.stroke();
  });

  // === 地面装饰 ===
  for (let v = 0; v < 3; v++) {
    makeTex(scene, 'd_grass' + v, 30, 24, (ctx) => {
      const blades = 3 + v;
      for (let i = 0; i < blades; i++) {
        const x = 5 + (i * 20) / blades + (v * 7 + i * 13) % 5;
        const bend = ((i + v) % 3 - 1) * 5;
        // 叶尖/控制点夹在画布内（v0 首叶左弯时尖端原本算到 x=-3 被切）
        const tipX = Math.min(26.5, Math.max(3.5, x + bend * 1.6));
        const ctrlX = Math.min(27, Math.max(2.5, x + bend));
        ctx.strokeStyle = i % 2 === 0 ? cssOf(PAL.grassDark) : cssOf(PAL.grass);
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.quadraticCurveTo(ctrlX, 12, tipX, 4 + (i % 2) * 4);
        ctx.stroke();
      }
    });
  }
  const flowerCols = ['#F6B8C8', '#F7DD8A', '#FFFFFF'];
  for (let v = 0; v < 3; v++) {
    makeTex(scene, 'd_flower' + v, 20, 20, (ctx) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(10 + Math.cos(a) * 5, 10 + Math.sin(a) * 5, 3.6, 2.4, a, 0, Math.PI * 2);
        ctx.fillStyle = flowerCols[v];
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(90,82,72,0.25)';
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(10, 10, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = v === 1 ? '#E89858' : '#F7DD8A';
      ctx.fill();
    });
  }
  // M16 秘密花圃微光（草甸彩蛋）：柔和径向光晕，叠在花丛下方做「可被注意但不打扰」的提示
  makeTex(scene, 'sb_glow', 96, 96, (ctx) => {
    const g = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
    g.addColorStop(0, 'rgba(255,246,200,0.85)');
    g.addColorStop(0.55, 'rgba(255,236,170,0.35)');
    g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(48, 48, 46, 0, Math.PI * 2);
    ctx.fill();
  });
  // M18 meadow 花圃育成：花苞（绿萼裹含苞粉尖）；催熟时机制按进度放大发亮，绽放炸 XP/治疗
  makeTex(scene, 'mz_bud', 64, 64, (ctx) => {
    const cx = 32, cy = 36;
    // 绿萼花托（饱满水滴向上收）
    ctx.beginPath();
    ctx.moveTo(cx, cy + 18);
    ctx.bezierCurveTo(cx - 16, cy + 10, cx - 13, cy - 6, cx - 8, cy - 14);
    ctx.bezierCurveTo(cx - 3, cy - 20, cx + 3, cy - 20, cx + 8, cy - 14);
    ctx.bezierCurveTo(cx + 13, cy - 6, cx + 16, cy + 10, cx, cy + 18);
    ctx.closePath();
    ctx.fillStyle = '#8FB46A';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5E8A44';
    ctx.stroke();
    // 萼片纵向分隔弧
    ctx.strokeStyle = 'rgba(94,138,68,0.5)';
    ctx.lineWidth = 1.4;
    for (const dx of [-6, 0, 6]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + 14);
      ctx.quadraticCurveTo(cx + dx * 1.4, cy - 2, cx + dx * 0.5, cy - 14);
      ctx.stroke();
    }
    // 顶端含苞粉瓣尖
    ctx.beginPath();
    ctx.moveTo(cx, cy - 22);
    ctx.quadraticCurveTo(cx - 7, cy - 14, cx - 4, cy - 8);
    ctx.quadraticCurveTo(cx, cy - 6, cx + 4, cy - 8);
    ctx.quadraticCurveTo(cx + 7, cy - 14, cx, cy - 22);
    ctx.closePath();
    ctx.fillStyle = '#F6C2D8';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#D88AAC';
    ctx.stroke();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 2, 3, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'd_pebble' + v, 18, 14, (ctx) => {
      ctx.beginPath();
      ctx.ellipse(9, 8, 6.5 - v, 4.2, v * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(PAL.pebble);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(90,82,72,0.18)';
      ctx.stroke();
    });
  }

  // === M19 掉落道具图标（立体小物件，每个 id 专属造型；图鉴/拾取物/HUD 倒计时共用） ===
  for (const id of Object.keys(DROP_ICONS) as DropItemId[]) {
    makeTex(scene, DROP_ITEMS[id].icon, 28, 28, (ctx) => DROP_ICONS[id](ctx));
  }

  // === 规则卡通用徽记（宝箱多件清单里代表「规则卡」一件，区别于星屑粒子） ===
  makeTex(scene, 'icon_arcana', 28, 28, (ctx) => {
    rrPath(ctx, 5, 3, 18, 22, 4);
    const g = ctx.createLinearGradient(0, 3, 0, 25);
    g.addColorStop(0, '#FFE9A6');
    g.addColorStop(1, '#E2B452');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#C18F35';
    ctx.stroke();
    hi(ctx, 10, 8, 3, 1.4, -0.4, 0.45);
    star(ctx, 14, 14, 4, 6.6, 2.6, '#FFFDF0');
  });

  // === 虚拟摇杆 ===
  makeTex(scene, 'joy_base', 140, 140, (ctx) => {
    ctx.beginPath();
    ctx.arc(70, 70, 62, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(90,82,72,0.10)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(90,82,72,0.28)';
    ctx.stroke();
  });
  makeTex(scene, 'joy_thumb', 64, 64, (ctx) => {
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(90,82,72,0.4)';
    ctx.stroke();
  });
}
