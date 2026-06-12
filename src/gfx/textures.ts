// 纹理工厂：零外部资源，全部用 Canvas 2D 程序化绘制
import { PAL, RAINBOW, cssOf } from './palette';
import { Viewport } from '../ui/Viewport';

type Ctx = CanvasRenderingContext2D;

// 超采样倍率：纹理按 TEX_SCALE 倍像素绘制，覆盖 相机 DPR × 局内变焦(≤1.25) 的放大采样，
// 否则 1x 光栅图被放大会发糊。createAllTextures 时按设备 DPR 确定。
let TEX_SCALE = 2;

function makeTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void): void {
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

function blobBody(ctx: Ctx, cx: number, cy: number, r: number, fill: number, edge: number, sx = 1, sy = 1): void {
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

function eyes(ctx: Ctx, cx: number, cy: number, gap: number, r: number, style: 'dot' | 'sleepy' | 'angry' | 'surprised' = 'dot'): void {
  ctx.fillStyle = cssOf(PAL.ink);
  ctx.strokeStyle = cssOf(PAL.ink);
  for (const s of [-1, 1]) {
    const x = cx + s * gap;
    if (style === 'sleepy') {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, cy, r, 0.15 * Math.PI, 0.85 * Math.PI);
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

function softGlow(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx: Ctx, cx: number, cy: number, points: number, rOut: number, rIn: number, fill: string, edge?: string): void {
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

function petalShape(ctx: Ctx, cx: number, cy: number, len: number, wid: number, rot: number, fill: string, edge?: string): void {
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

// ---------- 主入口 ----------

export function createAllTextures(scene: Phaser.Scene): void {
  // dpr1→2x、dpr2→3x、dpr3→4x；纹理都很小，显存开销可忽略
  TEX_SCALE = Math.min(4, Math.ceil(Viewport.dprNow() * 1.25));

  // === 玩家：萤光小精灵 ===
  makeTex(scene, 'player', 40, 44, (ctx) => {
    softGlow(ctx, 20, 26, 18, 'rgba(255,246,216,0.8)');
    // 天线
    ctx.strokeStyle = cssOf(PAL.playerEdge);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 14);
    ctx.quadraticCurveTo(22, 8, 20, 5);
    ctx.stroke();
    softGlow(ctx, 20, 5, 4.9, 'rgba(255,233,168,1)'); // r=4.9：渐变在画布上沿前衰减到 0，不被切
    ctx.fillStyle = '#FFF6D8';
    ctx.beginPath();
    ctx.arc(20, 5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // 身体
    blobBody(ctx, 20, 27, 13, PAL.playerBody, PAL.playerEdge);
    eyes(ctx, 20, 25, 5, 2.2);
    // 微笑
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(20, 28.5, 3.5, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    // 腮红
    ctx.fillStyle = 'rgba(248,160,168,0.55)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(20 + s * 8.5, 29, 2.6, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

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

  // === 敌人 ===
  makeTex(scene, 'e_blob', 36, 36, (ctx) => {
    blobBody(ctx, 18, 19, 14, PAL.blob, PAL.blobEdge, 1, 0.95);
    eyes(ctx, 18, 17, 5.5, 2);
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(18, 24, 2.6, 1.2 * Math.PI, 1.8 * Math.PI); // 撇嘴
    ctx.stroke();
  });

  makeTex(scene, 'e_midge', 30, 24, (ctx) => {
    // 翅膀（画布 30 宽：翅尖 15±13.5+描边 仍在界内，原 26 宽两侧被切平）
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeStyle = cssOf(PAL.midgeEdge);
    ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(15 + s * 8, 7, 6, 3.4, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    blobBody(ctx, 15, 14, 7.5, PAL.midge, PAL.midgeEdge);
    eyes(ctx, 15, 13, 3, 1.4);
  });

  makeTex(scene, 'e_shelly', 44, 40, (ctx) => {
    // 壳
    ctx.beginPath();
    ctx.arc(26, 18, 14, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.shellySpiral);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = cssOf(PAL.shellyEdge);
    ctx.stroke();
    // 螺旋纹
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(125,168,118,0.8)';
    ctx.beginPath();
    let r = 12;
    for (let a = 0; a < Math.PI * 3.5; a += 0.2) {
      const x = 26 + Math.cos(a) * r;
      const y = 18 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      r *= 0.93;
    }
    ctx.stroke();
    // 身体（探出）
    blobBody(ctx, 13, 27, 9, PAL.shelly, PAL.shellyEdge, 1.1, 0.95);
    eyes(ctx, 12, 26, 3.5, 2, 'sleepy');
  });

  makeTex(scene, 'e_spitter', 36, 36, (ctx) => {
    blobBody(ctx, 18, 19, 14, PAL.spitter, PAL.spitterEdge, 1, 0.95);
    eyes(ctx, 18, 14.5, 6, 1.8, 'surprised');
    // 大张的嘴
    ctx.beginPath();
    ctx.arc(18, 23, 5, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, 24.5, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.inkball);
    ctx.fill();
  });

  makeTex(scene, 'e_dasher', 38, 32, (ctx) => {
    // 尾部气流尖
    ctx.beginPath();
    ctx.moveTo(6, 16);
    ctx.lineTo(16, 9);
    ctx.lineTo(16, 23);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.dasher);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = cssOf(PAL.dasherEdge);
    ctx.stroke();
    blobBody(ctx, 23, 16, 11.5, PAL.dasher, PAL.dasherEdge, 1.1, 1);
    eyes(ctx, 25, 14, 4.5, 1.8, 'angry');
  });

  makeTex(scene, 'e_splitter', 42, 34, (ctx) => {
    blobBody(ctx, 14, 18, 10.5, PAL.splitter, PAL.splitterEdge);
    blobBody(ctx, 28, 18, 10.5, PAL.splitter, PAL.splitterEdge);
    // 中缝
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = cssOf(PAL.splitterEdge);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(21, 9);
    ctx.lineTo(21, 27);
    ctx.stroke();
    ctx.setLineDash([]);
    eyes(ctx, 14, 16, 3, 1.6);
    eyes(ctx, 28, 16, 3, 1.6);
  });

  makeTex(scene, 'e_mini', 20, 20, (ctx) => {
    blobBody(ctx, 10, 10, 7.5, PAL.splitter, PAL.splitterEdge);
    eyes(ctx, 10, 9, 3, 1.4);
  });

  makeTex(scene, 'e_elite', 104, 104, (ctx) => {
    softGlow(ctx, 52, 56, 48, 'rgba(160,144,200,0.25)'); // r=48：下沿恰好到画布底，不被切
    blobBody(ctx, 52, 56, 40, PAL.elite, PAL.eliteEdge, 1, 0.95);
    // 头顶小芽
    ctx.strokeStyle = cssOf(PAL.grassDark);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(52, 20);
    ctx.quadraticCurveTo(54, 12, 50, 8);
    ctx.stroke();
    petalShape(ctx, 46, 8, 10, 4, -0.9, cssOf(PAL.grass), cssOf(PAL.grassDark));
    petalShape(ctx, 54, 6, 10, 4, 0.7, cssOf(PAL.grass), cssOf(PAL.grassDark));
    eyes(ctx, 52, 50, 14, 4.5, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(52, 70, 8, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  makeTex(scene, 'e_boss', 168, 158, (ctx) => {
    softGlow(ctx, 84, 88, 70, 'rgba(138,150,184,0.3)'); // r=70：下沿恰好到画布底，不被切
    // 波浪裙摆
    ctx.beginPath();
    ctx.moveTo(22, 100);
    for (let i = 0; i <= 8; i++) {
      const x = 22 + (i * 124) / 8;
      const y = 138 + (i % 2 === 0 ? 0 : 10);
      ctx.quadraticCurveTo(x - 7, y + 8, x, y);
    }
    ctx.lineTo(146, 100);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.boss);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = cssOf(PAL.bossEdge);
    ctx.stroke();
    // 身体
    blobBody(ctx, 84, 84, 60, PAL.boss, PAL.bossEdge, 1.02, 0.92);
    (ctx.lineWidth = 4);
    // 王冠
    ctx.beginPath();
    ctx.moveTo(58, 36);
    ctx.lineTo(62, 14);
    ctx.lineTo(74, 30);
    ctx.lineTo(84, 8);
    ctx.lineTo(94, 30);
    ctx.lineTo(106, 14);
    ctx.lineTo(110, 36);
    ctx.closePath();
    ctx.fillStyle = '#F2DA9A';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#CCAA55';
    ctx.stroke();
    eyes(ctx, 84, 76, 22, 6.5, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(84, 106, 13, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // === 敌人墨弹 ===
  makeTex(scene, 'inkball', 16, 16, (ctx) => {
    blobBody(ctx, 8, 8, 5.5, PAL.inkball, PAL.blobEdge);
  });

  // === 武器 ===
  // 光刃弧光（朝右挥砍的月牙带）
  makeTex(scene, 'w_arc', 112, 112, (ctx) => {
    const cx = 56, cy = 56;
    for (let i = 0; i < 4; i++) {
      const r = 46 - i * 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -0.95, 0.95);
      ctx.lineWidth = 13 - i * 2.5;
      ctx.lineCap = 'round';
      const a = 0.85 - i * 0.18;
      ctx.strokeStyle = i === 0 ? `rgba(240,200,96,${a * 0.6})` : `rgba(255,246,216,${a})`;
      ctx.stroke();
    }
  });

  // 360° 全周斩（进化）
  makeTex(scene, 'w_arc_full', 132, 132, (ctx) => {
    const cx = 66, cy = 66;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, 54 - i * 4, 0, Math.PI * 2);
      ctx.lineWidth = 12 - i * 2.5;
      const a = 0.7 - i * 0.14;
      ctx.strokeStyle = i === 0 ? `rgba(240,200,96,${a * 0.7})` : `rgba(255,246,216,${a})`;
      ctx.stroke();
    }
  });

  makeTex(scene, 'w_petal', 24, 24, (ctx) => {
    petalShape(ctx, 12, 12, 18, 6.5, 0, cssOf(PAL.petal), cssOf(PAL.petalDeep));
    ctx.strokeStyle = 'rgba(224,120,152,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 5);
    ctx.lineTo(12, 19);
    ctx.stroke();
  });

  makeTex(scene, 'w_drop', 16, 24, (ctx) => {
    // 顶点 y=3：顶部尖角的斜接(miter)尖端会比路径再高出 ~1.8px，原 y=2 时被切
    ctx.beginPath();
    ctx.moveTo(8, 3);
    ctx.quadraticCurveTo(14.5, 13.5, 8, 21);
    ctx.quadraticCurveTo(1.5, 13.5, 8, 3);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.rain);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cssOf(PAL.rainDeep);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(6, 13, 1.6, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  makeTex(scene, 'w_puddle', 96, 52, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, w / 2 - 2);
    g.addColorStop(0, 'rgba(144,200,240,0.5)');
    g.addColorStop(0.85, 'rgba(144,200,240,0.32)');
    g.addColorStop(1, 'rgba(88,152,208,0.45)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 高光涟漪
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(w / 2 - 12, h / 2 - 5, 13, 4.5, -0.1, 0, Math.PI * 2);
    ctx.stroke();
  });

  makeTex(scene, 'w_boom', 36, 36, (ctx) => {
    ctx.beginPath();
    ctx.arc(18, 18, 14, -0.6, Math.PI + 0.6);
    ctx.arc(18, 11, 11, Math.PI + 0.85, -0.85, true);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.boom);
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(PAL.boomDeep);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(11, 22, 4, 2.2, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  makeTex(scene, 'w_mine', 30, 30, (ctx) => {
    softGlow(ctx, 15, 15, 14, 'rgba(192,160,232,0.5)');
    star(ctx, 15, 15, 4, 11, 4.5, cssOf(PAL.mine), cssOf(PAL.mineDeep));
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(15, 15, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });

  makeTex(scene, 'w_cloud', 116, 66, (ctx) => {
    // 底部云朵 y=45：45+19+描边1.25 < 66，原 y=46 时底缘描边被切
    const puffs: Array<[number, number, number]> = [[34, 40, 18], [58, 32, 22], [84, 40, 17], [58, 45, 19]];
    ctx.fillStyle = '#EAF2FA';
    ctx.strokeStyle = cssOf(PAL.rainDeep);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const [x, y, r] of puffs) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#EAF2FA';
    ctx.beginPath();
    for (const [x, y, r] of puffs) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    }
    ctx.fill();
    eyes(ctx, 58, 38, 9, 2.2, 'sleepy');
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

  makeTex(scene, 'chest', 44, 38, (ctx) => {
    softGlow(ctx, 22, 19, 19, 'rgba(232,200,120,0.45)'); // r=19：上下沿恰好到画布边，不被切
    const rr = (x: number, y: number, w2: number, h2: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w2, y, x + w2, y + h2, r);
      ctx.arcTo(x + w2, y + h2, x, y + h2, r);
      ctx.arcTo(x, y + h2, x, y, r);
      ctx.arcTo(x, y, x + w2, y, r);
      ctx.closePath();
    };
    rr(8, 10, 28, 22, 5);
    ctx.fillStyle = cssOf(PAL.chest);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#C09848';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 19);
    ctx.lineTo(36, 19);
    ctx.stroke();
    // 锁扣
    ctx.fillStyle = '#FFF2CC';
    ctx.beginPath();
    ctx.arc(22, 19, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    star(ctx, 34, 8, 4, 4.5, 1.8, '#FFFFFF');
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

  createIcons(scene);
}

// ---------- 武器/被动图标（40×40） ----------
function createIcons(scene: Phaser.Scene): void {
  const bg = (ctx: Ctx) => {
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(90,82,72,0.3)';
    ctx.stroke();
  };

  makeTex(scene, 'icon_blade', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.arc(20, 20, 11, -1.1, 1.1);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = cssOf(PAL.bladeDeep);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(20, 20, 11, -0.9, 0.9);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFF6D8';
    ctx.stroke();
  });

  makeTex(scene, 'icon_petal', 40, 40, (ctx) => {
    bg(ctx);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      petalShape(ctx, 20 + Math.cos(a) * 8, 20 + Math.sin(a) * 8, 13, 4.5, a + Math.PI / 2, cssOf(PAL.petal), cssOf(PAL.petalDeep));
    }
  });

  makeTex(scene, 'icon_prism', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.moveTo(20, 9);
    ctx.lineTo(29, 26);
    ctx.lineTo(11, 26);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.stroke();
    RAINBOW.forEach((c, i) => {
      ctx.strokeStyle = cssOf(c);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, 20);
      ctx.lineTo(34, 13 + i * 2.6);
      ctx.stroke();
    });
  });

  makeTex(scene, 'icon_rain', 40, 40, (ctx) => {
    bg(ctx);
    ctx.save();
    ctx.translate(12, 6);
    ctx.scale(0.9, 0.9);
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.quadraticCurveTo(14.5, 13, 8, 20);
    ctx.quadraticCurveTo(1.5, 13, 8, 2);
    ctx.fillStyle = cssOf(PAL.rain);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(PAL.rainDeep);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(20, 29, 10, 3.2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = cssOf(PAL.rainDeep);
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  makeTex(scene, 'icon_spark', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.moveTo(23, 8);
    ctx.lineTo(14, 22);
    ctx.lineTo(20, 22);
    ctx.lineTo(17, 32);
    ctx.lineTo(27, 18);
    ctx.lineTo(21, 18);
    ctx.lineTo(25, 8);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.spark);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(PAL.sparkDeep);
    ctx.stroke();
  });

  makeTex(scene, 'icon_boomerang', 40, 40, (ctx) => {
    bg(ctx);
    ctx.save();
    ctx.translate(20, 21);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.arc(0, 0, 11, -0.6, Math.PI + 0.6);
    ctx.arc(0, -5.5, 8.5, Math.PI + 0.85, -0.85, true);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.boom);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(PAL.boomDeep);
    ctx.stroke();
    ctx.restore();
  });

  makeTex(scene, 'icon_mine', 40, 40, (ctx) => {
    bg(ctx);
    star(ctx, 20, 20, 4, 12, 5, cssOf(PAL.mine), cssOf(PAL.mineDeep));
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(20, 20, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 被动图标
  makeTex(scene, 'icon_power', 40, 40, (ctx) => {
    bg(ctx);
    // 菱形护符
    ctx.beginPath();
    ctx.moveTo(20, 8);
    ctx.lineTo(30, 20);
    ctx.lineTo(20, 32);
    ctx.lineTo(10, 20);
    ctx.closePath();
    ctx.fillStyle = '#F09078';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#C86850';
    ctx.stroke();
    star(ctx, 20, 20, 4, 5, 2, '#FFE8D8');
  });

  makeTex(scene, 'icon_bloom', 40, 40, (ctx) => {
    bg(ctx);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(20 + Math.cos(a) * 7, 20 + Math.sin(a) * 7, 5, 3.4, a, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(PAL.petal);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = cssOf(PAL.petalDeep);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(20, 20, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#F7DD8A';
    ctx.fill();
  });

  makeTex(scene, 'icon_lens', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.arc(18, 18, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(184,216,240,0.6)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(25, 25);
    ctx.lineTo(31, 31);
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(15, 15, 4, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  });

  makeTex(scene, 'icon_cloud', 40, 40, (ctx) => {
    bg(ctx);
    const puffs: Array<[number, number, number]> = [[14, 22, 6], [21, 18, 7.5], [28, 22, 5.5], [21, 24, 6]];
    ctx.fillStyle = '#EAF2FA';
    ctx.strokeStyle = cssOf(PAL.rainDeep);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [x, y, r] of puffs) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  });

  makeTex(scene, 'icon_battery', 40, 40, (ctx) => {
    bg(ctx);
    // 小罐子
    ctx.beginPath();
    ctx.moveTo(13, 14);
    ctx.lineTo(27, 14);
    ctx.lineTo(26, 30);
    ctx.lineTo(14, 30);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248,224,144,0.9)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#C8A040';
    ctx.stroke();
    ctx.fillStyle = '#E8D8B0';
    ctx.fillRect(15, 10, 10, 4);
    ctx.strokeRect(15, 10, 10, 4);
    star(ctx, 20, 22, 4, 4.5, 1.8, '#FFFFFF');
  });

  makeTex(scene, 'icon_wind', 40, 40, (ctx) => {
    bg(ctx);
    ctx.strokeStyle = cssOf(PAL.boomDeep);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = 14 + i * 6;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.quadraticCurveTo(22, y - 3, 26 - i * 3, y);
      ctx.arc(26 - i * 3 + 2, y - 2, 2.5, Math.PI * 0.5, Math.PI * 1.9);
      ctx.stroke();
    }
  });

  // 兜底卡图标
  makeTex(scene, 'icon_heal', 40, 40, (ctx) => {
    bg(ctx);
    ctx.save();
    ctx.translate(9.5, 11);
    ctx.beginPath();
    ctx.moveTo(11, 18);
    ctx.bezierCurveTo(0, 10, 2, 1.5, 8, 2.5);
    ctx.bezierCurveTo(10, 3, 11, 5, 11, 6);
    ctx.bezierCurveTo(11, 5, 12, 3, 14, 2.5);
    ctx.bezierCurveTo(20, 1.5, 22, 10, 11, 18);
    ctx.fillStyle = cssOf(PAL.heart);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D86870';
    ctx.stroke();
    ctx.restore();
  });
  makeTex(scene, 'icon_gold', 40, 40, (ctx) => {
    bg(ctx);
    star(ctx, 16, 17, 4, 8, 3.2, '#FFD870', '#D8A840');
    star(ctx, 27, 25, 4, 5, 2, '#FFE8A0', '#D8A840');
  });
}
