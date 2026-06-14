// Evolved weapon icons: 40x40 paper tokens with a distinct upgraded silhouette per weapon.
import { WEAPON_META } from '../../content/weapons';
import { PAL, cssOf } from '../palette';
import { Ctx, makeTex, petalShape, softGlow, star } from './core';

function hex(n: number): string {
  return cssOf(n);
}

function mix(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bl;
}

function grad(ctx: Ctx, x: number, y: number, r: number, color: number): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.12, x, y, r);
  g.addColorStop(0, hex(mix(color, PAL.white, 0.7)));
  g.addColorStop(0.62, hex(mix(color, PAL.white, 0.25)));
  g.addColorStop(1, hex(mix(color, PAL.ink, 0.24)));
  return g;
}

function edge(color: number): string {
  return hex(mix(color, PAL.ink, 0.38));
}

function bg(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.arc(20, 20, 18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,253,246,0.9)';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#D8B45C';
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = hex(mix(color, PAL.white, 0.25));
  ctx.beginPath();
  ctx.arc(20, 20, 14.4, 0.15, Math.PI * 1.82);
  ctx.stroke();
  star(ctx, 30.5, 10.5, 5, 3.4, 1.4, '#FFF3C8', '#D8B45C');
}

function hi(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = -0.5): void {
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function line(ctx: Ctx, color: number, width: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = edge(color);
}

function blade(ctx: Ctx, color: number): void {
  line(ctx, color, 5.6);
  ctx.beginPath();
  ctx.arc(20, 20, 11, -1.95, 0.2);
  ctx.stroke();
  line(ctx, mix(color, PAL.white, 0.55), 2.6);
  ctx.beginPath();
  ctx.arc(20, 20, 11, -1.8, 0.06);
  ctx.stroke();
  ctx.save();
  ctx.translate(21, 20);
  ctx.rotate(-0.35);
  star(ctx, 0, 0, 4, 6, 2.1, '#FFF5C8', '#D8B45C');
  ctx.restore();
}

function petal(ctx: Ctx, color: number): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    petalShape(ctx, 20 + Math.cos(a) * 7, 20 + Math.sin(a) * 7, 12, 4.2, a + Math.PI / 2, hex(mix(color, PAL.white, 0.2)), edge(color));
  }
  star(ctx, 20, 20, 6, 5.4, 2.2, '#FFF3BC', '#D8B45C');
}

function prism(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.moveTo(20, 7);
  ctx.lineTo(31, 27);
  ctx.lineTo(9, 27);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 20, 18, 14, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = ['#F4A0A8', '#F2D26E', '#8ED0B0', '#8EC8E8'][i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 18);
    ctx.lineTo(34, 12 + i * 4.5);
    ctx.stroke();
  }
  hi(ctx, 17, 13, 2.6, 1.2);
}

function rain(ctx: Ctx, color: number): void {
  const drop = (x: number, y: number, s: number): void => {
    ctx.beginPath();
    ctx.moveTo(x, y - 9 * s);
    ctx.quadraticCurveTo(x + 7 * s, y + 2 * s, x, y + 9 * s);
    ctx.quadraticCurveTo(x - 7 * s, y + 2 * s, x, y - 9 * s);
    ctx.fillStyle = grad(ctx, x, y, 9 * s, color);
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = edge(color);
    ctx.stroke();
  };
  drop(20, 19, 1.08);
  drop(10, 25, 0.45);
  drop(30, 12, 0.42);
  hi(ctx, 17, 14, 2.2, 1.2);
}

function spark(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.moveTo(25, 6);
  ctx.lineTo(12, 21);
  ctx.lineTo(19, 21);
  ctx.lineTo(15, 34);
  ctx.lineTo(29, 17);
  ctx.lineTo(22, 17);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 20, 20, 15, color);
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  softGlow(ctx, 20, 20, 13, 'rgba(255,240,160,0.42)');
}

function boomerang(ctx: Ctx, color: number): void {
  for (const rot of [-0.55, 2.55]) {
    ctx.save();
    ctx.translate(20, 20);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.arc(0, 0, 12, -0.55, Math.PI + 0.55);
    ctx.arc(0, -5.8, 8.3, Math.PI + 0.8, -0.8, true);
    ctx.closePath();
    ctx.fillStyle = grad(ctx, 0, 0, 12, color);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = edge(color);
    ctx.stroke();
    ctx.restore();
  }
}

function mine(ctx: Ctx, color: number): void {
  star(ctx, 20, 20, 8, 13, 5.8, hex(mix(color, PAL.white, 0.16)), edge(color));
  star(ctx, 20, 20, 4, 6.5, 2.5, '#FFF4C2', '#D8B45C');
  ctx.beginPath();
  ctx.arc(20, 20, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
}

function puff(ctx: Ctx, color: number): void {
  line(ctx, color, 1.8);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(18, 21);
    ctx.lineTo(18 + Math.cos(a) * 11.5, 21 + Math.sin(a) * 11.5);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(18 + Math.cos(a) * 11.5, 21 + Math.sin(a) * 11.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  star(ctx, 29, 11, 5, 4, 1.5, '#FFF3C8', '#D8B45C');
  hi(ctx, 15, 16, 2.6, 1.2);
}

function lantern(ctx: Ctx, color: number): void {
  softGlow(ctx, 20, 21, 15, 'rgba(255,220,130,0.48)');
  ctx.beginPath();
  ctx.ellipse(20, 21, 8.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad(ctx, 20, 21, 12, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  ctx.fillStyle = '#FFF8D6';
  ctx.beginPath();
  ctx.arc(20, 21, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = edge(color);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(20, 10, 4, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function starOrbit(ctx: Ctx, color: number): void {
  ctx.strokeStyle = edge(color);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(20, 21, 14, 7, -0.45, 0, Math.PI * 2);
  ctx.stroke();
  star(ctx, 20, 18, 5, 10, 4, '#FFF5C8', edge(color));
  star(ctx, 31, 16, 5, 3.6, 1.4, hex(color), edge(color));
  star(ctx, 10, 25, 5, 3.2, 1.2, '#FFFFFF', edge(color));
}

function mallet(ctx: Ctx, color: number): void {
  ctx.save();
  ctx.translate(20, 21);
  ctx.rotate(0.7);
  line(ctx, 0x8a6840, 4);
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.lineTo(0, -5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -9, 8, 0, Math.PI * 2);
  ctx.fillStyle = grad(ctx, 0, -9, 9, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  ctx.restore();
  star(ctx, 27, 12, 5, 4, 1.6, '#FFF1B8', '#D8B45C');
}

function chime(ctx: Ctx, color: number): void {
  ctx.strokeStyle = edge(color);
  ctx.lineWidth = 1.5;
  for (const r of [8, 12, 15]) {
    ctx.beginPath();
    ctx.arc(20, 22, r, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(11, 25);
  ctx.quadraticCurveTo(12, 10, 20, 6);
  ctx.quadraticCurveTo(28, 10, 29, 25);
  ctx.lineTo(31, 29);
  ctx.lineTo(9, 29);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 20, 19, 14, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  star(ctx, 20, 20, 4, 4.2, 1.6, '#FFF6D6');
}

function vine(ctx: Ctx, color: number): void {
  line(ctx, color, 4);
  ctx.beginPath();
  ctx.moveTo(9, 27);
  ctx.bezierCurveTo(12, 11, 26, 31, 31, 11);
  ctx.stroke();
  for (const [x, y, r] of [[12, 17, -0.8], [20, 23, 0.7], [28, 16, -0.5]] as const) {
    petalShape(ctx, x, y, 8, 3, r, hex(mix(color, PAL.white, 0.25)), edge(color));
  }
  star(ctx, 21, 12, 5, 3.6, 1.4, '#FFF0B8', '#D8B45C');
}

function sling(ctx: Ctx, color: number): void {
  line(ctx, 0x8a6040, 3.8);
  ctx.beginPath();
  ctx.moveTo(14, 31);
  ctx.lineTo(18, 18);
  ctx.moveTo(26, 31);
  ctx.lineTo(22, 18);
  ctx.stroke();
  ctx.strokeStyle = edge(color);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(14, 17);
  ctx.quadraticCurveTo(20, 22, 26, 17);
  ctx.stroke();
  star(ctx, 20, 14, 6, 7.2, 3, hex(color), edge(color));
}

function wisp(ctx: Ctx, color: number): void {
  softGlow(ctx, 20, 20, 16, 'rgba(140,220,190,0.45)');
  for (const [x, y, s] of [[16, 20, 1], [25, 16, 0.72], [24, 27, 0.55]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - 8 * s);
    ctx.quadraticCurveTo(x + 7 * s, y, x, y + 8 * s);
    ctx.quadraticCurveTo(x - 7 * s, y, x, y - 8 * s);
    ctx.fillStyle = grad(ctx, x, y, 8 * s, color);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = edge(color);
    ctx.stroke();
  }
}

function bugle(ctx: Ctx, color: number): void {
  ctx.save();
  ctx.translate(20, 20);
  ctx.rotate(-0.45);
  ctx.beginPath();
  ctx.moveTo(-10, -4);
  ctx.lineTo(5, -3);
  ctx.lineTo(13, -9);
  ctx.lineTo(13, 9);
  ctx.lineTo(5, 3);
  ctx.lineTo(-10, 4);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, 0, 14, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  ctx.restore();
  star(ctx, 11, 12, 5, 3.4, 1.2, '#FFF5C8', '#D8B45C');
  star(ctx, 30, 28, 5, 2.8, 1, '#FFF5C8', '#D8B45C');
}

function dagger(ctx: Ctx, color: number): void {
  for (const rot of [-0.65, 0.65]) {
    ctx.save();
    ctx.translate(20, 20);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 11);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fillStyle = grad(ctx, 0, 0, 14, color);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = edge(color);
    ctx.stroke();
    ctx.restore();
  }
  star(ctx, 20, 20, 4, 4.4, 1.6, '#FFF5C8', '#D8B45C');
}

function axe(ctx: Ctx, color: number): void {
  line(ctx, 0x8a6840, 3.4);
  ctx.beginPath();
  ctx.moveTo(12, 30);
  ctx.lineTo(26, 10);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(22, 14);
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.quadraticCurveTo(11, -2, 3, 8);
    ctx.quadraticCurveTo(0, 3, 0, -7);
    ctx.fillStyle = grad(ctx, 4, 0, 11, color);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = edge(color);
    ctx.stroke();
    ctx.restore();
  }
}

function fireball(ctx: Ctx, color: number): void {
  softGlow(ctx, 20, 20, 15, 'rgba(255,210,110,0.5)');
  ctx.beginPath();
  ctx.moveTo(21, 6);
  ctx.quadraticCurveTo(31, 16, 25, 30);
  ctx.quadraticCurveTo(20, 36, 14, 30);
  ctx.quadraticCurveTo(7, 21, 17, 13);
  ctx.quadraticCurveTo(20, 10, 21, 6);
  ctx.fillStyle = grad(ctx, 20, 22, 15, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  ctx.fillStyle = '#FFF5C8';
  ctx.beginPath();
  ctx.moveTo(20, 16);
  ctx.quadraticCurveTo(25, 23, 20, 29);
  ctx.quadraticCurveTo(15, 23, 20, 16);
  ctx.fill();
}

function flask(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.moveTo(16, 8);
  ctx.lineTo(24, 8);
  ctx.lineTo(24, 16);
  ctx.quadraticCurveTo(31, 23, 26, 31);
  ctx.quadraticCurveTo(20, 35, 14, 31);
  ctx.quadraticCurveTo(9, 23, 16, 16);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  ctx.fillStyle = grad(ctx, 20, 26, 11, color);
  ctx.beginPath();
  ctx.ellipse(20, 26, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  star(ctx, 28, 13, 5, 3, 1.1, '#FFF5C8', '#D8B45C');
}

function bolt(ctx: Ctx, color: number): void {
  spark(ctx, color);
  ctx.strokeStyle = edge(color);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(20, 20, 14, 0.2, Math.PI * 1.55);
  ctx.stroke();
}

function bird(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.moveTo(8, 24);
  ctx.quadraticCurveTo(17, 8, 20, 24);
  ctx.quadraticCurveTo(25, 8, 32, 24);
  ctx.quadraticCurveTo(23, 18, 20, 31);
  ctx.quadraticCurveTo(17, 18, 8, 24);
  ctx.fillStyle = grad(ctx, 20, 21, 15, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  star(ctx, 20, 15, 5, 3.8, 1.4, '#FFF5C8', '#D8B45C');
}

function ricochet(ctx: Ctx, color: number): void {
  ctx.strokeStyle = edge(color);
  ctx.lineWidth = 2.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(9, 27);
  ctx.lineTo(16, 12);
  ctx.lineTo(25, 27);
  ctx.lineTo(31, 13);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y, s] of [[9, 27, 4], [16, 12, 5.2], [25, 27, 4.4], [31, 13, 3.8]] as const) {
    ctx.fillStyle = grad(ctx, x, y, s + 2, color);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = edge(color);
    ctx.stroke();
  }
}

function wand(ctx: Ctx, color: number): void {
  ctx.save();
  ctx.translate(20, 20);
  ctx.rotate(0.75);
  line(ctx, 0x8a6840, 3.6);
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.lineTo(0, -8);
  ctx.stroke();
  ctx.restore();
  star(ctx, 17, 12, 5, 7.5, 3, hex(color), edge(color));
  star(ctx, 29, 22, 5, 3.4, 1.2, '#FFF5C8', '#D8B45C');
  star(ctx, 11, 27, 5, 2.8, 1, '#FFF5C8', '#D8B45C');
}

function breath(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.moveTo(8, 27);
  ctx.quadraticCurveTo(16, 7, 32, 12);
  ctx.quadraticCurveTo(28, 24, 13, 31);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 19, 20, 17, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  star(ctx, 23, 18, 5, 4.2, 1.6, '#FFF5C8', '#D8B45C');
}

function bomb(ctx: Ctx, color: number): void {
  ctx.fillStyle = grad(ctx, 19, 22, 12, color);
  ctx.beginPath();
  ctx.arc(19, 22, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  ctx.strokeStyle = '#D8B45C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(25, 14);
  ctx.quadraticCurveTo(29, 8, 34, 11);
  ctx.stroke();
  star(ctx, 32, 10, 5, 3.5, 1.3, '#FFF3C8', '#D8B45C');
  hi(ctx, 16, 18, 2.4, 1.4);
}

function gravity(ctx: Ctx, color: number): void {
  softGlow(ctx, 20, 20, 15, 'rgba(150,120,210,0.35)');
  ctx.strokeStyle = edge(color);
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(20, 20, 12, 0.1, Math.PI * 1.75);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(20, 20, 7, Math.PI * 1.2, Math.PI * 2.9);
  ctx.stroke();
  star(ctx, 20, 20, 6, 5.3, 2.1, hex(mix(color, PAL.white, 0.25)), edge(color));
}

function sword(ctx: Ctx, color: number): void {
  ctx.save();
  ctx.translate(20, 20);
  ctx.rotate(-0.2);
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(5, 5);
  ctx.lineTo(0, 15);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, 0, 16, color);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(color);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#D8B45C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(11, 14);
  ctx.lineTo(29, 26);
  ctx.stroke();
}

function swarm(ctx: Ctx, color: number): void {
  const bee = (x: number, y: number, s: number): void => {
    ctx.fillStyle = grad(ctx, x, y, 7 * s, color);
    ctx.beginPath();
    ctx.ellipse(x, y, 5 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = edge(color);
    ctx.stroke();
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.fillRect(x - 4 * s, y - 1 * s, 8 * s, 1.6 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(x - 3 * s, y - 6 * s, 3 * s, 2 * s, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + 3 * s, y - 6 * s, 3 * s, 2 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  bee(16, 22, 1);
  bee(27, 14, 0.7);
  star(ctx, 29, 27, 5, 3, 1.1, '#FFF5C8', '#D8B45C');
}

function meteor(ctx: Ctx, color: number): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(248,222,130,0.62)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(23, 23);
  ctx.stroke();
  ctx.strokeStyle = '#FFF5C8';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(24, 24);
  ctx.stroke();
  star(ctx, 27, 27, 5, 9, 3.6, hex(color), edge(color));
}

function frost(ctx: Ctx, color: number): void {
  softGlow(ctx, 20, 20, 15, 'rgba(168,224,240,0.48)');
  ctx.strokeStyle = edge(color);
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(20 + Math.cos(a) * 14, 20 + Math.sin(a) * 14);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    const bx = 20 + Math.cos(a) * 8;
    const by = 20 + Math.sin(a) * 8;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + s * 0.68) * 4.5, by + Math.sin(a + s * 0.68) * 4.5);
      ctx.stroke();
    }
  }
  star(ctx, 20, 20, 6, 5, 2, '#F6FDFF', edge(color));
}

function tornado(ctx: Ctx, color: number): void {
  ctx.strokeStyle = edge(color);
  ctx.lineCap = 'round';
  for (const [y, w, lw] of [[9, 14, 2.7], [14, 12, 2.5], [19, 9, 2.3], [24, 6, 2.1], [29, 3.6, 1.9]] as const) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(20, y, w, 2.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  petalShape(ctx, 10, 14, 7.5, 3, -0.55, hex(mix(color, PAL.white, 0.2)), edge(color));
  petalShape(ctx, 30, 18, 7, 2.8, 0.8, hex(mix(color, PAL.white, 0.2)), edge(color));
  star(ctx, 20, 31, 5, 3.2, 1.2, '#FFF5C8', '#D8B45C');
}

const DRAW: Record<string, (ctx: Ctx, color: number) => void> = {
  blade,
  petal,
  prism,
  rain,
  spark,
  boomerang,
  mine,
  puff,
  lantern,
  star: starOrbit,
  mallet,
  chime,
  vine,
  sling,
  wisp,
  bugle,
  dagger,
  axe,
  fireball,
  flask,
  bolt,
  bird,
  ricochet,
  wand,
  breath,
  bomb,
  gravity,
  sword,
  swarm,
  meteor,
  frost,
  tornado,
};

export function createEvolvedWeaponIcons(scene: Phaser.Scene): void {
  for (const meta of WEAPON_META) {
    makeTex(scene, meta.evolvedIcon, 40, 40, (ctx) => {
      bg(ctx, meta.color);
      DRAW[meta.id](ctx, meta.color);
    });
  }
}
