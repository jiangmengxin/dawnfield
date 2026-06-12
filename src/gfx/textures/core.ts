// 纹理工厂核心：makeTex + 共用绘制辅助（零外部资源，全部 Canvas 2D 程序化绘制）
import { PAL, cssOf } from '../palette';

export type Ctx = CanvasRenderingContext2D;

// 超采样倍率：纹理按 TEX_SCALE 倍像素绘制，覆盖 相机 DPR × 局内变焦(≤1.25) 的放大采样，
// 否则 1x 光栅图被放大会发糊。createAllTextures 时按设备 DPR 确定。
let TEX_SCALE = 2;

export function setTexScale(v: number): void {
  TEX_SCALE = v;
}

export function makeTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void): void {
  const ss = TEX_SCALE;
  const tex = scene.textures.createCanvas(key, Math.ceil(w * ss), Math.ceil(h * ss));
  if (!tex) throw new Error('createCanvas failed: ' + key);
  const ctx = tex.context as Ctx;
  ctx.save();
  ctx.scale(ss, ss);
  draw(ctx, w, h);
  ctx.restore();
  tex.refresh();
  // 高密度像素、逻辑尺寸 w×h：渲染端按 source.resolution 折算（与 Text 同机制），
  // setTrim 把 realWidth/Height 标回逻辑尺寸，调用方 setScale/setDisplaySize 语义不变
  const frame = tex.get();
  frame.source.resolution = ss;
  frame.setTrim(w, h, 0, 0, w, h);
}

// ---------- 绘制辅助 ----------

export function blobBody(ctx: Ctx, cx: number, cy: number, r: number, fill: number, edge: number, sx = 1, sy = 1): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = cssOf(fill);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = cssOf(edge);
  ctx.stroke();
  // 顶部高光
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.42, r * 0.32, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  ctx.restore();
}

export type EyeStyle = 'dot' | 'sleepy' | 'angry' | 'surprised' | 'happy';

export function eyes(ctx: Ctx, cx: number, cy: number, gap: number, r: number, style: EyeStyle = 'dot'): void {
  ctx.fillStyle = cssOf(PAL.ink);
  ctx.strokeStyle = cssOf(PAL.ink);
  for (const s of [-1, 1]) {
    const x = cx + s * gap;
    if (style === 'sleepy') {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, cy, r, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (style === 'happy') {
      // 弯弯笑眼（∩ 形）
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, cy + r * 0.6, r * 1.1, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(x, cy, r * (style === 'surprised' ? 1.15 : 0.85), r * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      // 眼神光
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x - r * 0.25, cy - r * 0.35, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cssOf(PAL.ink);
      if (style === 'angry') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - s * r * 1.2, cy - r * 1.5);
        ctx.lineTo(x + s * r * 0.9, cy - r * 2.1);
        ctx.stroke();
      }
    }
  }
}

export function softGlow(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function star(ctx: Ctx, cx: number, cy: number, points: number, rOut: number, rIn: number, fill: string, edge?: string): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (edge) {
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = edge;
    ctx.stroke();
  }
}

export function petalShape(ctx: Ctx, cx: number, cy: number, len: number, wid: number, rot: number, fill: string, edge?: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -len / 2);
  ctx.quadraticCurveTo(wid, 0, 0, len / 2);
  ctx.quadraticCurveTo(-wid, 0, 0, -len / 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (edge) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = edge;
    ctx.stroke();
  }
  ctx.restore();
}
