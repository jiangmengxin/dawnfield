// 角色纹理：makeCharacter 参数化配方（剪影/配色/眼型/嘴型/饰件）
// 与敌人（扁平粉彩圆团）刻意拉开表现力：
//   体色径向渐变 + 异形剪影（水滴/宝石/岩石/蛋形…）+ 大高光眼 + 专属饰件
// 每角色生成 4 帧动效纹理：姿态 A/B（饰件摆动）× 睁眼/眨眼，由 PlayerSystem 驱动切换
//   key（姿态A） / key_p1（姿态B） / key_k（眨眼A） / key_p1_k（眨眼B）
// 体积差异直接画进纹理（半径 r 即 content/characters 的 radius）
import { CHAR_PAL, PAL, cssOf } from '../palette';
import { Ctx, makeTex, petalShape, softGlow } from './core';

type Shape = 'round' | 'drop' | 'gem' | 'stone' | 'egg';
type Eye = 'sparkle' | 'happy' | 'sleepy' | 'surprised';
type Mouth = 'smile' | 'open' | 'pout' | 'cat';
type Deco =
  | 'wings' | 'antenna'            // 小萤：萤翅 + 发光天线
  | 'petalSkirt' | 'petalCrown'    // 蔷蔷：花瓣裙 + 花冠
  | 'shine' | 'droplets'           // 露露：水光 + 伴生小水珠
  | 'leafWings' | 'windLines'      // 风风：叶翼 + 风速线
  | 'facets' | 'glints'            // 琉璃：晶面 + 闪光
  | 'staticSparks' | 'bolt'        // 闪闪：环身静电 + 闪电呆毛
  | 'acornCap' | 'moss'            // 墩墩：橡果帽 + 苔藓
  | 'fluffRim' | 'fluffBall' | 'seeds'; // 蒲蒲：绒毛圈 + 绒球呆毛 + 飘絮

export interface CharRecipe {
  r: number;            // 身体半径（= 接触判定半径，体积观感同源）
  body: number;
  edge: number;
  glow: string;         // 周身柔光（rgba）
  shape: Shape;
  lean?: number;        // 身体倾斜（弧度，奔跑感）
  eye: Eye;
  mouth: Mouth;
  faceDy?: number;      // 五官纵向微调（×r）
  softGrad?: boolean;   // 弱化渐变高光（浅色身体防止泛白）
  deco: Deco[];
}

// ---------- 通用工具 ----------

function lighten(c: number, k: number): string {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  return `rgb(${Math.round(r + (255 - r) * k)},${Math.round(g + (255 - g) * k)},${Math.round(b + (255 - b) * k)})`;
}

/** 剪影两遍法：渐变填充 + 同系深色描边 */
function fillShape(ctx: Ctx, build: () => void, fill: string | CanvasGradient, edge: string): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  build();
  ctx.fillStyle = fill;
  ctx.fill();
  build();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.restore();
}

function bodyGrad(ctx: Ctx, cx: number, cy: number, r: number, body: number, soft = false): CanvasGradient {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.5, r * 0.15, cx, cy, r * 1.5);
  g.addColorStop(0, lighten(body, soft ? 0.25 : 0.55));
  g.addColorStop(0.55, lighten(body, soft ? 0.08 : 0.15));
  g.addColorStop(1, cssOf(body));
  return g;
}

/**
 * 大高光眼 + 嘴 + 常驻腮红：表情量级明显大于敌人的小点眼。
 * blink 帧：睁眼角色闭上（弧线眼睑）；困倦/眯眼角色反而睁开偷看（亮点眼）——表情不死板
 */
function face(ctx: Ctx, cx: number, cy: number, r: number, eye: Eye, mouth: Mouth, blink: boolean): void {
  const ey = cy - r * 0.14;
  const gap = r * 0.42;
  const er = r * 0.2;
  const ink = cssOf(PAL.ink);
  const eff: Eye | 'shut' = blink
    ? (eye === 'happy' || eye === 'sleepy' ? 'sparkle' : 'shut')
    : eye;
  for (const s of [-1, 1]) {
    const x = cx + s * gap;
    if (eff === 'shut') {
      // 闭眼眼睑（∪ 弧）
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, ey - er * 0.25, er * 1.05, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (eff === 'happy') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, ey + er * 0.7, er * 1.15, 1.12 * Math.PI, 1.88 * Math.PI);
      ctx.stroke();
    } else if (eff === 'sleepy') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, ey - er * 0.3, er * 1.1, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      // 小睫毛
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + s * er * 1.1, ey);
      ctx.lineTo(x + s * er * 1.55, ey - er * 0.35);
      ctx.stroke();
    } else {
      const k = eff === 'surprised' ? 1.2 : 1;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, ey, er * 0.9 * k, er * 1.3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      // 双高光（主角眼神光更亮更大）
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(x - er * 0.28, ey - er * 0.45, er * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + er * 0.3, ey + er * 0.35, er * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 嘴
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const my = cy + r * 0.3;
  if (mouth === 'smile') {
    ctx.beginPath();
    ctx.arc(cx, my - r * 0.06, r * 0.26, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'open') {
    ctx.beginPath();
    ctx.ellipse(cx, my, r * 0.17, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.fillStyle = '#F8A0A8';
    ctx.beginPath();
    ctx.ellipse(cx, my + r * 0.08, r * 0.1, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mouth === 'pout') {
    ctx.beginPath();
    ctx.arc(cx, my + r * 0.22, r * 0.2, 1.25 * Math.PI, 1.75 * Math.PI);
    ctx.stroke();
  } else { // cat（ω）
    ctx.beginPath();
    ctx.arc(cx - r * 0.12, my - r * 0.02, r * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.arc(cx + r * 0.12, my - r * 0.02, r * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  // 常驻腮红
  ctx.fillStyle = 'rgba(248,150,160,0.5)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * r * 0.66, cy + r * 0.2, r * 0.21, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- 剪影 ----------

function buildShape(ctx: Ctx, shape: Shape, cx: number, cy: number, r: number): () => void {
  switch (shape) {
    case 'drop':
      return () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 1.5);
        ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.05, cx + r, cy - r * 0.55, cx + r, cy + r * 0.12);
        ctx.arc(cx, cy + r * 0.12, r, 0, Math.PI);
        ctx.bezierCurveTo(cx - r, cy - r * 0.55, cx - r * 0.5, cy - r * 1.05, cx, cy - r * 1.5);
        ctx.closePath();
      };
    case 'gem':
      return () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 1.3);
        ctx.lineTo(cx + r * 0.95, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.66, cy + r * 0.92);
        ctx.lineTo(cx - r * 0.66, cy + r * 0.92);
        ctx.lineTo(cx - r * 0.95, cy - r * 0.3);
        ctx.closePath();
      };
    case 'stone':
      return () => {
        ctx.beginPath();
        ctx.moveTo(cx - r, cy + r * 0.5);
        ctx.quadraticCurveTo(cx - r * 1.1, cy - r * 0.25, cx - r * 0.7, cy - r * 0.72);
        ctx.quadraticCurveTo(cx - r * 0.28, cy - r * 1.08, cx + r * 0.2, cy - r * 0.98);
        ctx.quadraticCurveTo(cx + r * 0.95, cy - r * 0.82, cx + r * 1.02, cy - r * 0.02);
        ctx.quadraticCurveTo(cx + r * 1.06, cy + r * 0.55, cx + r * 0.55, cy + r * 0.85);
        ctx.quadraticCurveTo(cx, cy + r * 1.02, cx - r * 0.55, cy + r * 0.85);
        ctx.quadraticCurveTo(cx - r * 0.98, cy + r * 0.72, cx - r, cy + r * 0.5);
        ctx.closePath();
      };
    case 'egg':
      return () => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.95, r * 1.08, 0, 0, Math.PI * 2);
      };
    default: // round
      return () => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.96, 0, 0, Math.PI * 2);
      };
  }
}

// ---------- 饰件（behind = 身体之下；ph 为姿态相位 0/1，两帧交替产生摆动） ----------

const BEHIND: ReadonlySet<Deco> = new Set<Deco>(['wings', 'petalSkirt', 'leafWings']);

function drawDeco(ctx: Ctx, deco: Deco, rec: CharRecipe, cx: number, cy: number, ph: number): void {
  const r = rec.r;
  const edge = cssOf(rec.edge);
  const topY = cy - r; // 头顶基准
  const sway = ph === 0 ? -1 : 1; // 摆动方向
  switch (deco) {
    case 'wings': { // 精灵翼（肩后，半透明渐变 + 细翼脉；两帧扇动）
      // 翼形：根部圆润、尖端收细的上挑曲线，避免读成"耳朵"
      const wing = (len: number, wid: number, alpha: number): void => {
        const g = ctx.createLinearGradient(0, 0, -wid * 0.6, -len);
        g.addColorStop(0, `rgba(255,255,255,${alpha * 0.55})`);
        g.addColorStop(0.55, `rgba(255,252,238,${alpha})`);
        g.addColorStop(1, `rgba(255,246,216,${alpha * 0.8})`);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-wid * 1.15, -len * 0.22, -wid * 1.25, -len * 0.82, -wid * 0.42, -len);
        ctx.bezierCurveTo(-wid * 0.05, -len * 1.05, wid * 0.32, -len * 0.42, 0, 0);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(216,172,90,0.55)';
        ctx.stroke();
        // 翼脉
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = 'rgba(216,172,90,0.35)';
        ctx.beginPath();
        ctx.moveTo(-wid * 0.12, -len * 0.12);
        ctx.quadraticCurveTo(-wid * 0.62, -len * 0.5, -wid * 0.44, -len * 0.88);
        ctx.stroke();
      };
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + s * r * 0.72, cy - r * 0.32);
        ctx.scale(s, 1); // 镜像：两侧共用同一翼形
        ctx.rotate(0.62 + (ph ? 0.2 : 0)); // 扇动：抬翼角度变化（正角 = 翼尖朝外上方）
        wing(r * (ph ? 1.12 : 1.0), r * 0.42, 0.85); // 前翼
        ctx.rotate(0.34);
        wing(r * (ph ? 0.74 : 0.66), r * 0.32, 0.6); // 后翼（小，更透）
        ctx.restore();
      }
      break;
    }
    case 'antenna': {
      // 天线左右摇曳 + 光球呼吸
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, topY + 2);
      ctx.quadraticCurveTo(cx + sway * 3, topY - 6, cx + sway * 1.8, topY - 9);
      ctx.stroke();
      const bx = cx + sway * 1.8;
      softGlow(ctx, bx, topY - 10, ph ? 6.4 : 5, 'rgba(255,233,168,1)');
      ctx.fillStyle = '#FFF6D8';
      ctx.beginPath();
      ctx.arc(bx, topY - 10, ph ? 3.1 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'petalSkirt': // 下半身花瓣裙（身体之下；两帧旋摆）
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (0.22 + (i / 4) * 0.56) + sway * 0.045;
        petalShape(ctx, cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92,
          r * 0.95, r * 0.34, a - Math.PI / 2, lighten(rec.body, 0.25), edge);
      }
      break;
    case 'petalCrown': {
      // 花冠侧瓣摆动
      petalShape(ctx, cx - r * 0.52, topY - 3, 12, 4.2, -0.75 - sway * 0.1, cssOf(PAL.petal), cssOf(PAL.petalDeep));
      petalShape(ctx, cx + r * 0.52, topY - 3, 12, 4.2, 0.75 - sway * 0.1, cssOf(PAL.petal), cssOf(PAL.petalDeep));
      petalShape(ctx, cx + sway * 0.8, topY - 7, 13.5, 5, sway * 0.08, '#FFFFFF', cssOf(PAL.petalDeep));
      ctx.beginPath();
      ctx.arc(cx, topY - 0.5, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = '#F7DD8A';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#D8A840';
      ctx.stroke();
      break;
    }
    case 'shine': // 水光月牙 + 顶部高亮（两帧微移，水体晃动感）
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx + sway * 0.8, cy + r * 0.12, r * 0.66, Math.PI * 0.62, Math.PI * 0.95);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.3 - sway * 0.8, cy - r * 0.78, r * 0.13, r * 0.26, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'droplets': // 伴生小水珠（两帧上下漂）
      for (const [dx, dy, k, dir] of [[-r * 1.18, -r * 0.85, 0.8, 1], [r * 1.22, -r * 0.35, 0.6, -1]] as Array<[number, number, number, number]>) {
        const x = cx + dx, y = cy + dy + sway * dir * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y - 4.5 * k);
        ctx.quadraticCurveTo(x + 3.4 * k, y - 0.5 * k, x, y + 2.8 * k);
        ctx.quadraticCurveTo(x - 3.4 * k, y - 0.5 * k, x, y - 4.5 * k);
        ctx.closePath();
        ctx.fillStyle = cssOf(PAL.rain);
        ctx.fill();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = cssOf(PAL.rainDeep);
        ctx.stroke();
      }
      break;
    case 'leafWings': // 后掠叶翼（身体之下；两帧扑扇）
      for (const [ox, oy, rot, len] of [[-r * 0.95, -r * 0.62, -1.35, r * 1.45], [-r * 1.12, -r * 0.05, -1.62, r * 1.2]] as Array<[number, number, number, number]>) {
        petalShape(ctx, cx + ox, cy + oy + sway * 1.2, len, r * 0.32, rot + sway * 0.12, lighten(rec.body, 0.2), edge);
      }
      break;
    case 'windLines': // 风速线（两帧长短交替，流动感）
      ctx.strokeStyle = 'rgba(104,184,144,0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const y = cy - r * 0.4 + i * r * 0.42;
        const len = 1.7 + ((i + ph) % 2) * 0.28;
        ctx.beginPath();
        ctx.moveTo(cx + r * 1.12, y);
        ctx.quadraticCurveTo(cx + r * 1.55, y - 2, cx + r * len, y);
        ctx.stroke();
      }
      break;
    case 'facets': // 晶面折线（静态结构）
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 1.3);
      ctx.lineTo(cx - r * 0.42, cy - r * 0.25);
      ctx.lineTo(cx - r * 0.28, cy + r * 0.92);
      ctx.moveTo(cx, cy - r * 1.3);
      ctx.lineTo(cx + r * 0.42, cy - r * 0.25);
      ctx.lineTo(cx + r * 0.28, cy + r * 0.92);
      ctx.moveTo(cx - r * 0.42, cy - r * 0.25);
      ctx.lineTo(cx + r * 0.42, cy - r * 0.25);
      ctx.stroke();
      break;
    case 'glints': // 四芒闪光（两帧大小互换 = 闪烁）
      for (const [dx, dy, k0, k1] of [[r * 0.92, -r * 0.95, 1, 0.5], [-r * 1.05, r * 0.45, 0.5, 1]] as Array<[number, number, number, number]>) {
        const k = ph ? k1 : k0;
        const x = cx + dx, y = cy + dy, g = 4.6 * k;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.moveTo(x, y - g);
        ctx.quadraticCurveTo(x + g * 0.18, y - g * 0.18, x + g, y);
        ctx.quadraticCurveTo(x + g * 0.18, y + g * 0.18, x, y + g);
        ctx.quadraticCurveTo(x - g * 0.18, y + g * 0.18, x - g, y);
        ctx.quadraticCurveTo(x - g * 0.18, y - g * 0.18, x, y - g);
        ctx.fill();
      }
      break;
    case 'staticSparks': // 环身静电（两帧换位 = 电火花蹦跳）
      ctx.strokeStyle = cssOf(PAL.sparkDeep);
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      for (const [a0, k] of [[-0.5, 1], [2.6, 0.8], [3.9, 0.9]] as Array<[number, number]>) {
        const a = a0 + ph * 0.9;
        const x = cx + Math.cos(a) * r * 1.22;
        const y = cy + Math.sin(a) * r * 1.12;
        ctx.beginPath();
        ctx.moveTo(x - 3 * k, y + 2 * k);
        ctx.lineTo(x, y - 1.5 * k);
        ctx.lineTo(x + 1.5 * k, y + 0.5 * k);
        ctx.lineTo(x + 4 * k, y - 2.5 * k);
        ctx.stroke();
      }
      break;
    case 'bolt': { // 闪电呆毛（两帧亮度脉冲 + 微倾）
      ctx.save();
      ctx.translate(cx, topY - 6);
      ctx.rotate(sway * 0.07);
      ctx.translate(-cx, -(topY - 6));
      ctx.beginPath();
      ctx.moveTo(cx + 1, topY - 13);
      ctx.lineTo(cx - 4.5, topY - 5.5);
      ctx.lineTo(cx - 0.5, topY - 5.5);
      ctx.lineTo(cx - 2.5, topY + 1.5);
      ctx.lineTo(cx + 5, topY - 7);
      ctx.lineTo(cx + 1, topY - 7);
      ctx.lineTo(cx + 4, topY - 13);
      ctx.closePath();
      ctx.fillStyle = ph ? '#FFF2A8' : cssOf(PAL.spark);
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = cssOf(PAL.sparkDeep);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'acornCap': { // 橡果帽（小柄随姿态摆）
      const capY = topY + r * 0.18;
      ctx.strokeStyle = '#7A5C38';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.08, capY - r * 0.42);
      ctx.quadraticCurveTo(cx + r * 0.2 + sway * 1.5, capY - r * 0.75, cx + r * 0.42 + sway * 2, capY - r * 0.8);
      ctx.stroke();
      fillShape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.82, capY + r * 0.1);
        ctx.quadraticCurveTo(cx - r * 0.85, capY - r * 0.42, cx - r * 0.3, capY - r * 0.52);
        ctx.quadraticCurveTo(cx + r * 0.35, capY - r * 0.62, cx + r * 0.78, capY - r * 0.18);
        ctx.quadraticCurveTo(cx + r * 0.88, capY + r * 0.02, cx + r * 0.82, capY + r * 0.1);
        ctx.quadraticCurveTo(cx, capY + r * 0.3, cx - r * 0.82, capY + r * 0.1);
        ctx.closePath();
      }, '#A8845C', '#7A5C38');
      // 帽面交叉纹
      ctx.strokeStyle = 'rgba(122,92,56,0.45)';
      ctx.lineWidth = 1.2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * r * 0.3 - r * 0.18, capY - r * 0.5);
        ctx.lineTo(cx + i * r * 0.3 + r * 0.12, capY + r * 0.18);
        ctx.stroke();
      }
      break;
    }
    case 'moss': // 肩头苔藓 + 小草芽（芽尖摆动）
      ctx.fillStyle = cssOf(PAL.grass);
      ctx.strokeStyle = cssOf(PAL.grassDark);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.62, cy - r * 0.52, r * 0.3, r * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.62, cy - r * 0.62);
      ctx.quadraticCurveTo(cx - r * 0.58 + sway * 1.5, cy - r * 0.92, cx - r * 0.72 + sway * 2.4, cy - r * 1.05);
      ctx.stroke();
      break;
    case 'fluffRim': // 身体边缘放射绒毛 + 尖端绒点（两帧角度偏转 = 绒毛拂动）
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + 0.18 + sway * 0.06;
        const x0 = cx + Math.cos(a) * r * 0.95;
        const y0 = cy + Math.sin(a) * r * 0.91;
        const x1 = cx + Math.cos(a) * (r + 5.5);
        const y1 = cy + Math.sin(a) * (r * 0.96 + 5.5);
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.95)' : cssOf(PAL.puffDeep);
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(x1, y1, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'fluffBall': { // 绒球呆毛（茎弯摆）
      ctx.strokeStyle = cssOf(PAL.puffDeep);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, topY + 2);
      ctx.quadraticCurveTo(cx + sway * 1.6, topY - 2, cx + sway * 2.2, topY - 5);
      ctx.stroke();
      const bx = cx + sway * 2.2, by = topY - 9.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + ph * 0.2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a) * 4.8, by + Math.sin(a) * 4.8);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(bx, by, 2.1, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = cssOf(PAL.puffDeep);
      ctx.stroke();
      break;
    }
    case 'seeds': // 身侧飘絮（两帧漂移）
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (const [dx, dy, k, dir] of [[r * 1.25, -r * 0.9, 1, 1], [-r * 1.3, r * 0.2, 0.75, -1]] as Array<[number, number, number, number]>) {
        const x = cx + dx + sway * dir * 1.5, y = cy + dy - sway * 1.5;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.45 + sway * 0.15;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 3.6 * k, y + Math.sin(a) * 3.6 * k);
          ctx.stroke();
        }
      }
      break;
  }
}

// ---------- 主入口 ----------

/** 角色动效帧后缀（PlayerSystem 按 姿态/眨眼 状态拼 key） */
export const CHAR_FRAMES: ReadonlyArray<{ suffix: string; ph: 0 | 1; blink: boolean }> = [
  { suffix: '', ph: 0, blink: false },
  { suffix: '_p1', ph: 1, blink: false },
  { suffix: '_k', ph: 0, blink: true },
  { suffix: '_p1_k', ph: 1, blink: true },
];

/** 参数化角色生成：画布按半径与饰件外延自适应；一次生成 4 帧动效纹理 */
export function makeCharacter(scene: Phaser.Scene, key: string, rec: CharRecipe): void {
  const r = rec.r;
  const tall = rec.shape === 'drop' || rec.shape === 'gem';
  const w = Math.ceil(r * 2 + 26);
  const h = Math.ceil(r * 2 + (tall ? 22 : 30) + 10);
  const cx = w / 2;
  const cy = h - r - 9;
  for (const f of CHAR_FRAMES) {
    makeTex(scene, key + f.suffix, w, h, (ctx) => {
      softGlow(ctx, cx, cy, Math.min(r + 9, cy), rec.glow);
      ctx.save();
      if (rec.lean) {
        ctx.translate(cx, cy);
        ctx.rotate(rec.lean);
        ctx.translate(-cx, -cy);
      }
      for (const d of rec.deco) if (BEHIND.has(d)) drawDeco(ctx, d, rec, cx, cy, f.ph);
      fillShape(ctx, buildShape(ctx, rec.shape, cx, cy, r), bodyGrad(ctx, cx, cy, r, rec.body, rec.softGrad), cssOf(rec.edge));
      for (const d of rec.deco) if (!BEHIND.has(d)) drawDeco(ctx, d, rec, cx, cy, f.ph);
      face(ctx, cx, cy + (rec.faceDy ?? 0) * r, r, rec.eye, rec.mouth, f.blink);
      ctx.restore();
    });
  }
}

export function createCharacterTextures(scene: Phaser.Scene): void {
  const C = CHAR_PAL;
  // 小萤：萤翅 + 发光天线（沿用 'player' 键，全 UI 自动升级）
  makeCharacter(scene, 'player', { r: 14, body: 0xffe9a8, edge: 0xe2b452, glow: 'rgba(255,246,216,0.85)',
    shape: 'round', eye: 'sparkle', mouth: 'smile', deco: ['wings', 'antenna'] });
  // 蔷蔷：花苞裙摆 + 花冠
  makeCharacter(scene, 'char_rosa', { r: 12, ...C.rosa, glow: 'rgba(248,176,196,0.6)',
    shape: 'round', eye: 'happy', mouth: 'cat', deco: ['petalSkirt', 'petalCrown'] });
  // 露露：水滴剪影 + 水光 + 伴生水珠
  makeCharacter(scene, 'char_dew', { r: 17, ...C.dew, glow: 'rgba(170,212,240,0.6)',
    shape: 'drop', eye: 'sleepy', mouth: 'smile', faceDy: 0.06, deco: ['shine', 'droplets'] });
  // 风风：前倾蛋形 + 叶翼 + 风速线
  makeCharacter(scene, 'char_gale', { r: 12, ...C.gale, glow: 'rgba(168,224,192,0.6)',
    shape: 'egg', lean: -0.12, eye: 'sparkle', mouth: 'open', deco: ['leafWings', 'windLines'] });
  // 琉璃：多面宝石剪影 + 晶面 + 闪光
  makeCharacter(scene, 'char_lumen', { r: 13, ...C.lumen, glow: 'rgba(216,208,240,0.7)',
    shape: 'gem', eye: 'sparkle', mouth: 'smile', faceDy: -0.02, deco: ['facets', 'glints'] });
  // 闪闪：环身静电 + 闪电呆毛
  makeCharacter(scene, 'char_volt', { r: 12, ...C.volt, glow: 'rgba(255,224,112,0.65)',
    shape: 'round', eye: 'surprised', mouth: 'open', deco: ['staticSparks', 'bolt'] });
  // 墩墩：岩石剪影 + 橡果帽 + 苔藓
  makeCharacter(scene, 'char_pebble', { r: 18, ...C.pebble, glow: 'rgba(216,192,160,0.55)',
    shape: 'stone', eye: 'sleepy', mouth: 'pout', faceDy: 0.05, deco: ['acornCap', 'moss'] });
  // 蒲蒲：绒毛圈 + 绒球呆毛 + 飘絮（浅色身体走弱渐变防泛白）
  makeCharacter(scene, 'char_fluff', { r: 13, ...C.fluff, glow: 'rgba(245,238,220,0.9)',
    shape: 'round', eye: 'sparkle', mouth: 'smile', softGrad: true, deco: ['fluffRim', 'fluffBall', 'seeds'] });
}
