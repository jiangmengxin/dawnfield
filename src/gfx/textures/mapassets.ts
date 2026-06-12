// 地图资产管线（M5）：每图专属敌人换皮 + 装饰 + 弹体/地皮纹理，进图懒生成（ensureMapAssets 幂等）
// 敌人换皮 = makeEnemy(形体 × 调色 × 表情)：保持「扁平粉彩圆团 + 小点眼、静态单帧」与角色拉开表现力
// Boss 为每图门面，单独手绘（与草甸 e_boss 同待遇）
import { GROVE, HILLS, LAVENDER, POND, PAL, cssOf } from '../palette';
import type { MapId } from '../../content/ids';
import { blobBody, Ctx, EyeStyle, eyes, makeTex, petalShape, softGlow, star } from './core';

function rgba(c: number, a: number): string {
  return `rgba(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff},${a})`;
}

// ---------- 换皮配方引擎 ----------

type EnemyShape =
  | 'round' | 'bubble' | 'tailed' | 'shelled' | 'spiky'
  | 'leaf' | 'winged' | 'wisp' | 'sprig' | 'cone' | 'jelly' | 'frog'
  | 'cap' | 'moth' | 'bee'; // M6：蘑菇盖 / 蝶蛾翅 / 条纹蜂

export interface EnemyRecipe {
  w: number;
  h: number;
  shape: EnemyShape;
  r: number; // 主体半径
  body: number;
  edge: number;
  accent?: number; // 形体附件色（壳/穗/喙…）
  eye?: { gap: number; r: number; style?: EyeStyle; dy?: number };
  mouth?: 'pout' | 'open' | 'smile' | 'none';
}

function mouth(ctx: Ctx, cx: number, cy: number, kind: 'pout' | 'open' | 'smile', r: number): void {
  ctx.strokeStyle = cssOf(PAL.ink);
  ctx.lineWidth = 1.6;
  if (kind === 'pout') {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.6, r * 0.22, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
  } else if (kind === 'smile') {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.28, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (kind === 'open') {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.fill();
  }
}

/** 参数化敌人纹理：形体 × 调色 × 表情（一行配方一只新怪） */
export function makeEnemy(scene: Phaser.Scene, key: string, rc: EnemyRecipe): void {
  makeTex(scene, key, rc.w, rc.h, (ctx) => {
    const cx = rc.w / 2;
    const cy = rc.h / 2;
    const r = rc.r;
    const ec = cssOf(rc.edge);
    const bc = cssOf(rc.body);
    const ac = cssOf(rc.accent ?? rc.edge);

    switch (rc.shape) {
      case 'round':
        blobBody(ctx, cx, cy + 1, r, rc.body, rc.edge, 1, 0.95);
        break;

      case 'bubble': {
        // 半透明泡泡：双层描边 + 月牙高光
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(rc.body, 0.5);
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = rgba(rc.edge, 0.95);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.62, 1.05 * Math.PI, 1.55 * Math.PI);
        ctx.stroke();
        break;
      }

      case 'tailed': {
        // 蝌蚪：左侧摆尾 + 右侧圆身（纹理朝右）
        ctx.strokeStyle = bc;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.4, cy);
        ctx.quadraticCurveTo(cx - r * 1.3, cy - r * 0.7, cx - r * 1.9, cy + r * 0.35);
        ctx.stroke();
        ctx.strokeStyle = ec;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.6, cy - r * 0.45);
        ctx.quadraticCurveTo(cx - r * 1.4, cy - r * 0.7, cx - r * 1.9, cy + r * 0.35);
        ctx.stroke();
        blobBody(ctx, cx + r * 0.5, cy, r, rc.body, rc.edge, 1.05, 0.95);
        break;
      }

      case 'shelled': {
        // 蜗蜗：后壳同心环 + 前身 + 眼柄
        ctx.beginPath();
        ctx.arc(cx + r * 0.55, cy - r * 0.25, r * 0.95, 0, Math.PI * 2);
        ctx.fillStyle = ac;
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = ec;
        ctx.stroke();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = rgba(rc.edge, 0.65);
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc(cx + r * 0.55, cy - r * 0.25, r * (0.62 - i * 0.3), 0, Math.PI * 2);
          ctx.stroke();
        }
        blobBody(ctx, cx - r * 0.75, cy + r * 0.45, r * 0.62, rc.body, rc.edge, 1.25, 0.85);
        // 眼柄
        ctx.strokeStyle = ec;
        ctx.lineWidth = 1.8;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.75 + s * 3, cy + r * 0.1);
          ctx.lineTo(cx - r * 0.75 + s * 5, cy - r * 0.45);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx - r * 0.75 + s * 5, cy - r * 0.55, 2, 0, Math.PI * 2);
          ctx.fillStyle = cssOf(PAL.ink);
          ctx.fill();
        }
        break;
      }

      case 'spiky': {
        // 蓟球：刺圈 + 圆身
        ctx.fillStyle = bc;
        ctx.strokeStyle = ec;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + 0.3;
          const x0 = cx + Math.cos(a) * r * 0.85;
          const y0 = cy + Math.sin(a) * r * 0.85;
          const x1 = cx + Math.cos(a) * (r + 4.5);
          const y1 = cy + Math.sin(a) * (r + 4.5);
          ctx.beginPath();
          ctx.moveTo(x0 + Math.cos(a + Math.PI / 2) * 3, y0 + Math.sin(a + Math.PI / 2) * 3);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x0 - Math.cos(a + Math.PI / 2) * 3, y0 - Math.sin(a + Math.PI / 2) * 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        blobBody(ctx, cx, cy, r, rc.body, rc.edge);
        break;
      }

      case 'leaf': {
        // 叶娃娃：叶形身体 + 主叶脉 + 顶部小梗
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(0.18);
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.25);
        ctx.quadraticCurveTo(r * 1.15, -r * 0.3, 0, r * 1.25);
        ctx.quadraticCurveTo(-r * 1.15, -r * 0.3, 0, -r * 1.25);
        ctx.closePath();
        ctx.fillStyle = bc;
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = ec;
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = rgba(rc.edge, 0.6);
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.1);
        ctx.lineTo(0, r * 1.1);
        ctx.stroke();
        ctx.restore();
        // 小梗
        ctx.strokeStyle = ec;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - r * 1.2);
        ctx.quadraticCurveTo(cx + 5, cy - r * 1.5, cx + 8, cy - r * 1.45);
        ctx.stroke();
        break;
      }

      case 'winged': {
        // 小乌鸫：双翼 + 圆身 + 小喙
        ctx.fillStyle = rgba(rc.body, 0.85);
        ctx.strokeStyle = ec;
        ctx.lineWidth = 1.6;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(cx + s * r * 1.05, cy - r * 0.35, r * 0.78, r * 0.4, s * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        blobBody(ctx, cx, cy, r, rc.body, rc.edge, 1, 0.95);
        // 小喙（朝下的小菱形）
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy + r * 0.18);
        ctx.lineTo(cx, cy + r * 0.55);
        ctx.lineTo(cx + 3, cy + r * 0.18);
        ctx.closePath();
        ctx.fillStyle = ac;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;
      }

      case 'wisp': {
        // 风精灵：半透圆身 + 卷尾气旋
        ctx.strokeStyle = rgba(rc.body, 0.9);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.5, cy + r * 0.4);
        ctx.quadraticCurveTo(cx + r * 1.7, cy + r * 0.9, cx + r * 1.75, cy - r * 0.1);
        ctx.quadraticCurveTo(cx + r * 1.78, cy - r * 0.7, cx + r * 1.25, cy - r * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(rc.body, 0.72);
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = rgba(rc.edge, 0.9);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.32, r * 0.2, -0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'sprig': {
        // 麦穗芽：穗粒交错堆叠 + 顶芒
        ctx.strokeStyle = ec;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx, cy - r * 1.05);
          ctx.lineTo(cx + (i - 1) * 5, cy - r * 1.05 - 7);
          ctx.stroke();
        }
        ctx.fillStyle = bc;
        for (let row = 0; row < 3; row++) {
          const y = cy - r * 0.7 + row * r * 0.62;
          const wRow = r * (0.95 - row * 0.08);
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(cx + s * wRow * 0.42, y, wRow * 0.5, wRow * 0.36, s * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = ec;
            ctx.stroke();
          }
        }
        // 底粒（脸）
        blobBody(ctx, cx, cy + r * 0.95, r * 0.62, rc.body, rc.edge, 1.1, 0.9);
        break;
      }

      case 'cone': {
        // 松果球：蛋形 + 鳞片网纹 + 顶梗
        ctx.save();
        ctx.translate(cx, cy + 1);
        ctx.scale(1, 1.12);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = bc;
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = ec;
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(rc.edge, 0.55);
        for (let row = -2; row <= 2; row++) {
          ctx.beginPath();
          ctx.arc(0, row * r * 0.42 - r * 0.5, r * 0.8, 0.25 * Math.PI, 0.75 * Math.PI);
          ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = ec;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 1.15);
        ctx.lineTo(cx - 3, cy - r * 1.15 - 5);
        ctx.stroke();
        break;
      }

      case 'jelly': {
        // 软水母：半透穹顶 + 裙边 + 飘带触手
        ctx.strokeStyle = rgba(rc.body, 0.9);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const x = cx + (i - 1) * r * 0.55;
          ctx.beginPath();
          ctx.moveTo(x, cy + r * 0.35);
          ctx.quadraticCurveTo(x + (i - 1) * 4 + 3, cy + r * 0.95, x + (i - 1) * 5, cy + r * 1.45);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0);
        // 裙边波浪
        for (let i = 0; i <= 4; i++) {
          const x0 = cx + r - (i * r * 2) / 4;
          ctx.quadraticCurveTo(x0 + r * 0.25, cy + r * 0.42, x0 - r * 0.25, cy + r * 0.2);
        }
        ctx.closePath();
        ctx.fillStyle = rgba(rc.body, 0.78);
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = rgba(rc.edge, 0.95);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'frog': {
        // 蛙蹦蹦：宽身 + 头顶眼包 + 浅色肚皮
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + s * r * 0.52, cy - r * 0.82, r * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = bc;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = ec;
          ctx.stroke();
        }
        blobBody(ctx, cx, cy, r, rc.body, rc.edge, 1.15, 0.9);
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.42, r * 0.62, r * 0.36, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fill();
        // 眼包上的瞳
        ctx.fillStyle = cssOf(PAL.ink);
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + s * r * 0.52, cy - r * 0.85, 1.9, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'cap': {
        // 蘑菇：矮胖菌柄（脸在柄上）+ 宽圆菌盖 + 盖上斑点
        blobBody(ctx, cx, cy + r * 0.35, r * 0.72, rc.body, rc.edge, 1.15, 0.95);
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.15, cy - r * 0.18);
        ctx.quadraticCurveTo(cx - r * 1.05, cy - r * 1.25, cx, cy - r * 1.3);
        ctx.quadraticCurveTo(cx + r * 1.05, cy - r * 1.25, cx + r * 1.15, cy - r * 0.18);
        ctx.quadraticCurveTo(cx, cy + r * 0.12, cx - r * 1.15, cy - r * 0.18);
        ctx.closePath();
        ctx.fillStyle = ac;
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = ec;
        ctx.stroke();
        // 盖上斑点
        ctx.fillStyle = 'rgba(255,250,238,0.85)';
        for (const [dx, dy, br] of [[-r * 0.55, -r * 0.62, r * 0.16], [r * 0.2, -r * 0.95, r * 0.2], [r * 0.7, -r * 0.5, r * 0.13]] as const) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, br, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'moth': {
        // 蝶蛾：两对圆瓣翅（上大下小）+ 绒身 + 触角
        ctx.fillStyle = rgba(rc.body, 0.88);
        ctx.strokeStyle = ec;
        ctx.lineWidth = 1.8;
        for (const s of [-1, 1]) {
          // 上翅
          ctx.beginPath();
          ctx.ellipse(cx + s * r * 0.95, cy - r * 0.45, r * 0.85, r * 0.62, s * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // 下翅（小）
          ctx.beginPath();
          ctx.ellipse(cx + s * r * 0.75, cy + r * 0.5, r * 0.55, r * 0.42, s * -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // 翅斑
          ctx.fillStyle = cssOf(rc.accent ?? 0xf8e8b0);
          ctx.beginPath();
          ctx.arc(cx + s * r * 1.0, cy - r * 0.45, r * 0.22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba(rc.body, 0.88);
        }
        // 绒身（窄椭圆）
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.42, r * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = bc;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = ec;
        ctx.stroke();
        // 触角
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * 2, cy - r * 0.75);
          ctx.quadraticCurveTo(cx + s * r * 0.45, cy - r * 1.25, cx + s * r * 0.7, cy - r * 1.15);
          ctx.stroke();
        }
        break;
      }

      case 'bee': {
        // 小蜂：头顶半透双翅 + 条纹圆身 + 小尾针
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.strokeStyle = rgba(rc.edge, 0.7);
        ctx.lineWidth = 1.4;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(cx + s * r * 0.55, cy - r * 1.05, r * 0.62, r * 0.34, s * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        blobBody(ctx, cx, cy, r, rc.body, rc.edge, 1.1, 0.95);
        // 条纹（深色横带 ×2）
        ctx.fillStyle = cssOf(rc.accent ?? PAL.ink);
        for (const dy of [-r * 0.1, r * 0.42]) {
          ctx.beginPath();
          ctx.ellipse(cx, cy + dy + r * 0.12, r * 0.98, r * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // 小尾针
        ctx.beginPath();
        ctx.moveTo(cx - 2.5, cy + r * 0.95);
        ctx.lineTo(cx, cy + r * 1.35);
        ctx.lineTo(cx + 2.5, cy + r * 0.95);
        ctx.closePath();
        ctx.fillStyle = cssOf(rc.accent ?? PAL.ink);
        ctx.fill();
        break;
      }
    }

    if (rc.eye) {
      eyes(ctx, cx + (rc.shape === 'tailed' ? r * 0.5 : 0), cy + (rc.eye.dy ?? -2), rc.eye.gap, rc.eye.r, rc.eye.style ?? 'dot');
    }
    if (rc.mouth && rc.mouth !== 'none') {
      mouth(ctx, cx + (rc.shape === 'tailed' ? r * 0.5 : 0), cy, rc.mouth, r);
    }
  });
}

// ---------- 露珠池塘 ----------

function createPondAssets(scene: Phaser.Scene): void {
  // 敌人池（配方一行一只）
  makeEnemy(scene, 'e_tad',    { w: 38, h: 24, shape: 'tailed', r: 8,    body: POND.tad, edge: POND.tadEdge, eye: { gap: 3.2, r: 1.5 } });
  makeEnemy(scene, 'e_bubble', { w: 34, h: 34, shape: 'bubble', r: 13,   body: POND.bubble, edge: POND.bubbleEdge, eye: { gap: 4.5, r: 1.8 }, mouth: 'open' });
  makeEnemy(scene, 'e_snail',  { w: 44, h: 40, shape: 'shelled', r: 13,  body: POND.snail, edge: POND.snailEdge, accent: POND.snailShell });
  makeEnemy(scene, 'e_frog',   { w: 40, h: 36, shape: 'frog', r: 12.5,   body: POND.frog, edge: POND.frogEdge, mouth: 'smile' });
  makeEnemy(scene, 'e_squirt', { w: 36, h: 34, shape: 'round', r: 12.5,  body: POND.squirt, edge: POND.squirtEdge, eye: { gap: 5.5, r: 1.8, style: 'surprised' }, mouth: 'open' });
  makeEnemy(scene, 'e_jelly',  { w: 36, h: 40, shape: 'jelly', r: 12,    body: POND.jelly, edge: POND.jellyEdge, eye: { gap: 4.5, r: 2, dy: -4 } });

  // 精英：大泡泡（角上挂两颗小泡随从）
  makeTex(scene, 'e_bigbubble', 104, 104, (ctx) => {
    softGlow(ctx, 52, 54, 48, rgba(POND.bigbubble, 0.28));
    ctx.beginPath();
    ctx.arc(52, 54, 38, 0, Math.PI * 2);
    ctx.fillStyle = rgba(POND.bigbubble, 0.55);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = cssOf(POND.bigbubbleEdge);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(42, 44, 24, 1.05 * Math.PI, 1.55 * Math.PI);
    ctx.stroke();
    for (const [bx, by, br] of [[16, 26, 7], [88, 36, 5]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = rgba(POND.bubble, 0.6);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = cssOf(POND.bubbleEdge);
      ctx.stroke();
    }
    eyes(ctx, 52, 48, 12, 4.2, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(52, 66, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // Boss：泡泡大王（泡冠 + 泡沫裙）
  makeTex(scene, 'e_bubbleking', 168, 152, (ctx) => {
    softGlow(ctx, 84, 84, 68, rgba(POND.bubbleking, 0.3));
    // 泡沫裙
    ctx.fillStyle = rgba(POND.bubble, 0.65);
    ctx.strokeStyle = cssOf(POND.bubbleEdge);
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) {
      const bx = 36 + i * 16;
      const by = 128 + (i % 2) * 8;
      ctx.beginPath();
      ctx.arc(bx, by, 11 - (i % 2) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // 身体（半透大泡）
    ctx.beginPath();
    ctx.arc(84, 82, 56, 0, Math.PI * 2);
    ctx.fillStyle = rgba(POND.bubbleking, 0.62);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = cssOf(POND.bubblekingEdge);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(70, 68, 34, 1.05 * Math.PI, 1.55 * Math.PI);
    ctx.stroke();
    // 泡泡王冠（三颗泡）
    for (const [bx, by, br] of [[60, 22, 9], [84, 12, 12], [108, 22, 9]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = rgba(POND.bubble, 0.7);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = cssOf(POND.bigbubbleEdge);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(bx - br * 0.3, by - br * 0.35, br * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    eyes(ctx, 84, 74, 20, 6, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(84, 102, 12, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // 泡泡弹（水枪鱼/泡泡大王弹幕）
  makeTex(scene, 'pz_bub', 18, 18, (ctx) => {
    ctx.beginPath();
    ctx.arc(9, 9, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba(POND.pool, 0.55);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cssOf(POND.poolDeep);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(7.4, 7.4, 3.4, 1.05 * Math.PI, 1.55 * Math.PI);
    ctx.stroke();
  });

  // 减速水皮（地图机制；slowAt 椭圆判定 → 高宽比 ~0.55）
  makeTex(scene, 'pz_pool', 120, 66, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, w / 2 - 2);
    g.addColorStop(0, rgba(POND.pool, 0.42));
    g.addColorStop(0.85, rgba(POND.pool, 0.3));
    g.addColorStop(1, rgba(POND.poolDeep, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 涟漪高光两圈
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 26, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 42, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 装饰：睡莲 / 芦苇 / 涟漪 / 莲花 / 贝壳
  for (let v = 0; v < 3; v++) {
    makeTex(scene, 'pd_lily' + v, 36, 28, (ctx) => {
      ctx.save();
      ctx.translate(18, 14);
      ctx.scale(1, 0.72);
      const notch = 0.5 + v * 0.7; // 缺口朝向随变体转
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 15, notch + 0.55, notch - 0.55 + Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = cssOf(POND.lily);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = cssOf(POND.lilyEdge);
      ctx.stroke();
      // 叶脉
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = cssOf(POND.lilyVein);
      for (let i = 0; i < 4; i++) {
        const a = notch + Math.PI * 0.5 + i * 0.75;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'pd_reed' + v, 26, 42, (ctx) => {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const x = 6 + i * 7 + v * 2;
        const bend = (i - 1) * 4 + v * 3;
        ctx.strokeStyle = i % 2 === 0 ? cssOf(POND.reed) : cssOf(POND.reedEdge);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.quadraticCurveTo(x + bend * 0.6, 22, x + bend, 6 + (i % 2) * 5);
        ctx.stroke();
      }
      if (v === 0) {
        // 香蒲头
        ctx.fillStyle = cssOf(POND.cattail);
        ctx.beginPath();
        ctx.ellipse(13, 10, 2.6, 6, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  makeTex(scene, 'pd_ripple', 40, 18, (ctx) => {
    ctx.strokeStyle = rgba(POND.ripple, 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(20, 9, 17, 6.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(POND.ripple, 0.45);
    ctx.beginPath();
    ctx.ellipse(20, 9, 10, 3.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  makeTex(scene, 'pd_lotus', 28, 28, (ctx) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      petalShape(ctx, 14 + Math.cos(a) * 7, 14 + Math.sin(a) * 7, 11, 4, a + Math.PI / 2, cssOf(POND.lotus), cssOf(POND.lotusDeep));
    }
    ctx.beginPath();
    ctx.arc(14, 14, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(POND.lotusCore);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = cssOf(POND.lotusDeep);
    ctx.stroke();
  });
  makeTex(scene, 'pd_shell', 20, 16, (ctx) => {
    ctx.beginPath();
    ctx.arc(10, 11, 7, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = cssOf(POND.shell);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = cssOf(POND.shellEdge);
    ctx.stroke();
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(10, 11);
      ctx.lineTo(10 + Math.sin(a) * 6.5, 11 - Math.cos(a) * 6.5);
      ctx.stroke();
    }
  });
}

// ---------- 晚霞山岗 ----------

function createHillsAssets(scene: Phaser.Scene): void {
  makeEnemy(scene, 'e_leafy',     { w: 36, h: 36, shape: 'leaf', r: 11,   body: HILLS.leafy, edge: HILLS.leafyEdge, eye: { gap: 4, r: 1.8, dy: -1 }, mouth: 'smile' });
  makeEnemy(scene, 'e_grain',     { w: 20, h: 22, shape: 'round', r: 7.5, body: HILLS.grain, edge: HILLS.grainEdge, eye: { gap: 3, r: 1.4 } });
  makeEnemy(scene, 'e_crow',      { w: 40, h: 30, shape: 'winged', r: 10, body: HILLS.crow, edge: HILLS.crowEdge, accent: HILLS.crowBeak, eye: { gap: 4, r: 1.8 } });
  makeEnemy(scene, 'e_thistle',   { w: 40, h: 40, shape: 'spiky', r: 11,  body: HILLS.thistle, edge: HILLS.thistleEdge, eye: { gap: 4.5, r: 1.8, style: 'angry' } });
  makeEnemy(scene, 'e_wheatling', { w: 34, h: 42, shape: 'sprig', r: 11,  body: HILLS.wheatling, edge: HILLS.wheatlingEdge, eye: { gap: 3.5, r: 1.6, dy: 9 } });
  makeEnemy(scene, 'e_cone',      { w: 36, h: 40, shape: 'cone', r: 12,   body: HILLS.cone, edge: HILLS.coneEdge, eye: { gap: 4.5, r: 1.8, dy: -5 } });
  makeEnemy(scene, 'e_gust',      { w: 44, h: 34, shape: 'wisp', r: 11,   body: HILLS.gust, edge: HILLS.gustEdge, eye: { gap: 4, r: 1.8 }, mouth: 'open' });

  // 精英：蓟王球（更密的刺 + 头顶蓟花冠）
  makeTex(scene, 'e_bigthistle', 104, 104, (ctx) => {
    softGlow(ctx, 52, 56, 46, rgba(HILLS.bigthistle, 0.28));
    ctx.fillStyle = cssOf(HILLS.bigthistle);
    ctx.strokeStyle = cssOf(HILLS.bigthistleEdge);
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      const x0 = 52 + Math.cos(a) * 28;
      const y0 = 58 + Math.sin(a) * 28;
      ctx.beginPath();
      ctx.moveTo(x0 + Math.cos(a + Math.PI / 2) * 7, y0 + Math.sin(a + Math.PI / 2) * 7);
      ctx.lineTo(52 + Math.cos(a) * 47, 58 + Math.sin(a) * 47);
      ctx.lineTo(x0 - Math.cos(a + Math.PI / 2) * 7, y0 - Math.sin(a + Math.PI / 2) * 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    blobBody(ctx, 52, 58, 34, HILLS.bigthistle, HILLS.bigthistleEdge);
    // 头顶蓟花
    petalShape(ctx, 46, 16, 14, 4.5, -0.5, cssOf(HILLS.crow), cssOf(HILLS.crowEdge));
    petalShape(ctx, 52, 13, 15, 4.5, 0, cssOf(HILLS.crow), cssOf(HILLS.crowEdge));
    petalShape(ctx, 58, 16, 14, 4.5, 0.5, cssOf(HILLS.crow), cssOf(HILLS.crowEdge));
    eyes(ctx, 52, 52, 12, 4.2, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(52, 70, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // Boss：风暴鸦（展翼 + 头顶三根风羽 + 尾羽）
  makeTex(scene, 'e_galecrow', 176, 150, (ctx) => {
    softGlow(ctx, 88, 80, 70, rgba(HILLS.galecrow, 0.3));
    ctx.fillStyle = cssOf(HILLS.galecrow);
    ctx.strokeStyle = cssOf(HILLS.galecrowEdge);
    // 展翼（三段羽指）
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(88 + s * 30, 78);
      ctx.quadraticCurveTo(88 + s * 78, 36, 88 + s * 84, 58);
      ctx.quadraticCurveTo(88 + s * 70, 62, 88 + s * 64, 72);
      ctx.quadraticCurveTo(88 + s * 78, 74, 88 + s * 76, 86);
      ctx.quadraticCurveTo(88 + s * 62, 84, 88 + s * 56, 92);
      ctx.quadraticCurveTo(88 + s * 48, 100, 88 + s * 28, 96);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    // 尾羽
    ctx.beginPath();
    ctx.moveTo(74, 116);
    ctx.lineTo(88, 142);
    ctx.lineTo(102, 116);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    // 身体
    blobBody(ctx, 88, 84, 44, HILLS.galecrow, HILLS.galecrowEdge, 1, 1.05);
    // 头顶风羽（被吹起的呆毛 ×3）
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = cssOf(HILLS.galecrowEdge);
    for (const [dx, len] of [[-10, 16], [0, 22], [10, 16]] as const) {
      ctx.beginPath();
      ctx.moveTo(88 + dx, 40);
      ctx.quadraticCurveTo(88 + dx + 8, 40 - len, 88 + dx + 18, 36 - len);
      ctx.stroke();
    }
    // 喙
    ctx.beginPath();
    ctx.moveTo(80, 92);
    ctx.lineTo(88, 106);
    ctx.lineTo(96, 92);
    ctx.closePath();
    ctx.fillStyle = cssOf(HILLS.crowBeak);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = cssOf(HILLS.galecrowEdge);
    ctx.stroke();
    eyes(ctx, 88, 76, 17, 5.5, 'angry');
  });

  // 羽毛弹（风暴鸦弹幕）
  makeTex(scene, 'hz_feather', 20, 28, (ctx) => {
    petalShape(ctx, 10, 12, 18, 5.5, 0, cssOf(HILLS.feather), cssOf(HILLS.crowEdge));
    ctx.strokeStyle = cssOf(HILLS.crowEdge);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.lineTo(10, 24);
    ctx.stroke();
  });

  // 风暴飘叶粒子
  makeTex(scene, 'hz_leaf', 16, 14, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(2, 7);
    ctx.quadraticCurveTo(8, 0, 14, 5);
    ctx.quadraticCurveTo(9, 13, 2, 7);
    ctx.closePath();
    ctx.fillStyle = cssOf(HILLS.leafFall);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = cssOf(HILLS.leafFallEdge);
    ctx.stroke();
  });

  // 装饰：麦秆 / 草垛 / 落叶 / 雏菊 / 暖石
  for (let v = 0; v < 3; v++) {
    makeTex(scene, 'hd_wheat' + v, 28, 44, (ctx) => {
      const x = 12 + v * 2;
      const bend = (v - 1) * 6;
      ctx.strokeStyle = cssOf(HILLS.wheatDark);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, 42);
      ctx.quadraticCurveTo(x + bend * 0.5, 24, x + bend, 12);
      ctx.stroke();
      // 麦穗（三层成对穗粒沿秆顶向上收窄）
      ctx.fillStyle = cssOf(HILLS.wheat);
      ctx.strokeStyle = cssOf(HILLS.wheatEdge);
      ctx.lineWidth = 1.2;
      for (let row = 0; row < 3; row++) {
        const px = x + bend;
        const py = 17 - row * 4.5;
        const rw = 3.4 - row * 0.5;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(px + s * 2.6, py, rw, 2.2, s * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      // 顶芒
      ctx.strokeStyle = cssOf(HILLS.wheatEdge);
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + bend, 5);
        ctx.lineTo(x + bend + i * 4, 0.5);
        ctx.stroke();
      }
    });
  }
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'hd_tuft' + v, 32, 22, (ctx) => {
      ctx.lineCap = 'round';
      const blades = 4 + v;
      for (let i = 0; i < blades; i++) {
        const x = 5 + (i * 22) / blades;
        const bend = (i % 3 - 1) * 7;
        const tipX = Math.min(29, Math.max(3, x + bend * 1.5));
        ctx.strokeStyle = i % 2 === 0 ? cssOf(HILLS.tuft) : cssOf(HILLS.tuftEdge);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.quadraticCurveTo(Math.max(2, Math.min(30, x + bend)), 11, tipX, 3 + (i % 2) * 4);
        ctx.stroke();
      }
    });
  }
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'hd_leaf' + v, 20, 16, (ctx) => {
      ctx.save();
      ctx.translate(10, 8);
      ctx.rotate(v * 0.9 - 0.4);
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.quadraticCurveTo(0, -7, 8, -1);
      ctx.quadraticCurveTo(0, 7, -7, 0);
      ctx.closePath();
      ctx.fillStyle = rgba(v === 0 ? HILLS.leafFall : HILLS.wheat, 0.9);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = cssOf(HILLS.leafFallEdge);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(7, -1);
      ctx.stroke();
      ctx.restore();
    });
  }
  makeTex(scene, 'hd_daisy', 24, 24, (ctx) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(12 + Math.cos(a) * 6.2, 12 + Math.sin(a) * 6.2, 4, 2.4, a, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(HILLS.daisy);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(HILLS.daisyDeep, 0.7);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(12, 12, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(HILLS.daisyCore);
    ctx.fill();
  });
  makeTex(scene, 'hd_stone', 20, 14, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(10, 8, 7, 4.4, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(HILLS.stone);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(90,82,72,0.18)';
    ctx.stroke();
  });
}

// ---------- 萤暮林地 ----------

function createGroveAssets(scene: Phaser.Scene): void {
  makeEnemy(scene, 'e_shroom',  { w: 38, h: 40, shape: 'cap', r: 12,    body: GROVE.shroom, edge: GROVE.shroomEdge, accent: GROVE.shroomCap, eye: { gap: 4, r: 1.7, dy: 5 }, mouth: 'smile' });
  makeEnemy(scene, 'e_glimmer', { w: 24, h: 24, shape: 'round', r: 8.5, body: GROVE.glimmer, edge: GROVE.glimmerEdge, eye: { gap: 3.2, r: 1.5, style: 'happy' } });
  makeEnemy(scene, 'e_mottle',  { w: 46, h: 36, shape: 'moth', r: 11,   body: GROVE.mottle, edge: GROVE.mottleEdge, accent: GROVE.mottleSpot, eye: { gap: 3.5, r: 1.6, dy: -3 } });
  makeEnemy(scene, 'e_snapcap', { w: 42, h: 44, shape: 'cap', r: 14,    body: GROVE.snapcap, edge: GROVE.snapcapEdge, accent: GROVE.snapcapCap, eye: { gap: 4.5, r: 1.8, dy: 6, style: 'angry' }, mouth: 'pout' });
  makeEnemy(scene, 'e_puffcap', { w: 40, h: 40, shape: 'cap', r: 13,    body: GROVE.puffcap, edge: GROVE.puffcapEdge, accent: GROVE.puffcapCap, eye: { gap: 4.5, r: 1.7, dy: 5, style: 'surprised' }, mouth: 'open' });
  makeEnemy(scene, 'e_roller',  { w: 38, h: 42, shape: 'cone', r: 13,   body: GROVE.roller, edge: GROVE.rollerEdge, eye: { gap: 4.5, r: 1.8, dy: -4 } });

  // 精英：大菇王（宽盖三斑 + 苔藓披肩）
  makeTex(scene, 'e_eldercap', 108, 104, (ctx) => {
    softGlow(ctx, 54, 58, 46, rgba(GROVE.eldercap, 0.28));
    // 菌柄（脸）
    blobBody(ctx, 54, 70, 24, GROVE.eldercap, GROVE.eldercapEdge, 1.25, 0.95);
    // 苔藓披肩
    ctx.fillStyle = cssOf(GROVE.fern);
    ctx.strokeStyle = cssOf(GROVE.fernEdge);
    ctx.lineWidth = 1.6;
    for (const [dx, k] of [[-22, 1], [24, 0.8]] as const) {
      ctx.beginPath();
      ctx.ellipse(54 + dx, 56, 9 * k, 5 * k, dx > 0 ? 0.5 : -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // 宽盖
    ctx.beginPath();
    ctx.moveTo(8, 52);
    ctx.quadraticCurveTo(14, 14, 54, 12);
    ctx.quadraticCurveTo(94, 14, 100, 52);
    ctx.quadraticCurveTo(54, 64, 8, 52);
    ctx.closePath();
    ctx.fillStyle = cssOf(GROVE.eldercapCap);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(GROVE.eldercapEdge);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,238,0.85)';
    for (const [bx, by, br] of [[34, 32, 5.5], [60, 24, 7], [82, 36, 4.5]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    eyes(ctx, 54, 70, 11, 4, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(54, 84, 6, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // Boss：蘑菇长老（巨盖 + 白胡子 + 盖上小菇群）
  makeTex(scene, 'e_sporeking', 168, 156, (ctx) => {
    softGlow(ctx, 84, 86, 70, rgba(GROVE.sporeking, 0.3));
    // 菌柄（脸 + 长须）
    blobBody(ctx, 84, 106, 38, GROVE.sporeking, GROVE.sporekingEdge, 1.2, 0.92);
    // 巨盖
    ctx.beginPath();
    ctx.moveTo(12, 78);
    ctx.quadraticCurveTo(20, 18, 84, 14);
    ctx.quadraticCurveTo(148, 18, 156, 78);
    ctx.quadraticCurveTo(84, 96, 12, 78);
    ctx.closePath();
    ctx.fillStyle = cssOf(GROVE.sporekingCap);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(GROVE.sporekingEdge);
    ctx.stroke();
    // 盖上斑点 + 小菇群（长老的"王冠"）
    ctx.fillStyle = 'rgba(255,250,238,0.85)';
    for (const [bx, by, br] of [[48, 50, 8], [90, 36, 10], [124, 54, 6.5]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const [mx2, my2, mr] of [[52, 16, 7], [110, 12, 8]] as const) {
      ctx.fillStyle = cssOf(GROVE.shroom);
      ctx.beginPath();
      ctx.arc(mx2, my2 + 6, mr * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx2 - mr, my2 + 4);
      ctx.quadraticCurveTo(mx2, my2 - mr, mx2 + mr, my2 + 4);
      ctx.quadraticCurveTo(mx2, my2 + 8, mx2 - mr, my2 + 4);
      ctx.closePath();
      ctx.fillStyle = cssOf(GROVE.shroomCap);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = cssOf(GROVE.shroomEdge);
      ctx.stroke();
    }
    // 白眉白须
    ctx.strokeStyle = 'rgba(250,246,238,0.95)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(84 + s * 8, 96);
      ctx.quadraticCurveTo(84 + s * 16, 92, 84 + s * 24, 96);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(250,246,238,0.95)';
    ctx.beginPath();
    ctx.moveTo(70, 122);
    ctx.quadraticCurveTo(84, 152, 98, 122);
    ctx.quadraticCurveTo(84, 132, 70, 122);
    ctx.closePath();
    ctx.fill();
    eyes(ctx, 84, 104, 16, 5.5, 'angry');
  });

  // 孢子弹（孢孢菇/蘑菇长老弹幕）
  makeTex(scene, 'gz_spore', 18, 18, (ctx) => {
    softGlow(ctx, 9, 9, 8, rgba(GROVE.spore, 0.6));
    ctx.beginPath();
    ctx.arc(9, 9, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(GROVE.spore);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = cssOf(GROVE.sporeDeep);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(7.2, 7.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 治愈泉（地图机制；ZoneSystem 椭圆地皮）
  makeTex(scene, 'gz_spring', 120, 66, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, w / 2 - 2);
    g.addColorStop(0, rgba(GROVE.springGold, 0.5));
    g.addColorStop(0.45, rgba(GROVE.spring, 0.42));
    g.addColorStop(1, rgba(GROVE.springDeep, 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 泉心亮斑 + 双圈涟漪
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 28, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 44, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 装饰：蕨叶 / 蘑菇丛 / 萤光点 / 苔石 / 落枝
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'gd_fern' + v, 30, 40, (ctx) => {
      const bend = v === 0 ? 5 : -4;
      ctx.strokeStyle = cssOf(GROVE.fernEdge);
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(15, 38);
      ctx.quadraticCurveTo(15 + bend, 20, 15 + bend * 1.6, 6);
      ctx.stroke();
      // 对生小羽叶
      for (let i = 0; i < 4; i++) {
        const t = 0.25 + i * 0.18;
        const x = 15 + bend * t * 1.4;
        const y = 38 - t * 30;
        const len = 9 - i * 1.6;
        for (const s of [-1, 1]) {
          petalShape(ctx, x + s * len * 0.4, y - 1, len, 2.6, s * 1.25 + bend * 0.02, cssOf(GROVE.fern), cssOf(GROVE.fernEdge));
        }
      }
    });
  }
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'gd_shroom' + v, 28, 26, (ctx) => {
      // 一大一小双菇
      const draw = (x: number, y: number, k: number): void => {
        ctx.fillStyle = cssOf(0xf2e8da);
        ctx.strokeStyle = cssOf(GROVE.decorShroomEdge);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - 2.4 * k, y);
        ctx.quadraticCurveTo(x, y + 1 * k, x + 2.4 * k, y);
        ctx.lineTo(x + 1.8 * k, y + 6 * k);
        ctx.quadraticCurveTo(x, y + 7 * k, x - 1.8 * k, y + 6 * k);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 6.5 * k, y + 0.5 * k);
        ctx.quadraticCurveTo(x - 5 * k, y - 6.5 * k, x, y - 7 * k);
        ctx.quadraticCurveTo(x + 5 * k, y - 6.5 * k, x + 6.5 * k, y + 0.5 * k);
        ctx.quadraticCurveTo(x, y + 2.5 * k, x - 6.5 * k, y + 0.5 * k);
        ctx.closePath();
        ctx.fillStyle = cssOf(GROVE.decorShroom);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = cssOf(GROVE.decorShroomDot);
        ctx.beginPath();
        ctx.arc(x - 2 * k, y - 3.5 * k, 1.3 * k, 0, Math.PI * 2);
        ctx.arc(x + 3 * k, y - 2.5 * k, 1 * k, 0, Math.PI * 2);
        ctx.fill();
      };
      if (v === 0) {
        draw(11, 12, 1.3);
        draw(22, 16, 0.8);
      } else {
        draw(17, 11, 1.1);
        draw(7, 17, 0.7);
      }
    });
  }
  makeTex(scene, 'gd_glow', 22, 22, (ctx) => {
    for (const [x, y, r2, a] of [[7, 9, 3.2, 0.8], [15, 6, 2.2, 0.6], [14, 15, 2.6, 0.7]] as const) {
      softGlow(ctx, x, y, r2 * 2.2, rgba(GROVE.glowdot, a * 0.6));
      ctx.fillStyle = rgba(GROVE.glowdot, a);
      ctx.beginPath();
      ctx.arc(x, y, r2 * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  makeTex(scene, 'gd_mossrock', 24, 18, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(12, 11, 9, 5.5, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(GROVE.mossrock);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(GROVE.mossrockEdge, 0.6);
    ctx.stroke();
    // 顶部苔斑
    ctx.fillStyle = rgba(GROVE.fern, 0.8);
    ctx.beginPath();
    ctx.ellipse(9, 7.5, 4.5, 2.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
  });
  makeTex(scene, 'gd_twig', 30, 14, (ctx) => {
    ctx.strokeStyle = cssOf(GROVE.twig);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, 10);
    ctx.quadraticCurveTo(15, 7, 27, 9);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = cssOf(GROVE.twigEdge);
    ctx.beginPath();
    ctx.moveTo(12, 8.5);
    ctx.lineTo(16, 3);
    ctx.stroke();
  });
}

// ---------- 紫露花田 ----------

function createLavenderAssets(scene: Phaser.Scene): void {
  makeEnemy(scene, 'e_budling', { w: 30, h: 40, shape: 'sprig', r: 10,  body: LAVENDER.budling, edge: LAVENDER.budlingEdge, eye: { gap: 3.4, r: 1.6, dy: 8 } });
  makeEnemy(scene, 'e_bumble',  { w: 30, h: 38, shape: 'bee', r: 10,    body: LAVENDER.bumble, edge: LAVENDER.bumbleEdge, accent: LAVENDER.bumbleStripe, eye: { gap: 3.8, r: 1.7, dy: -4 } });
  makeEnemy(scene, 'e_flutter', { w: 46, h: 36, shape: 'moth', r: 11,   body: LAVENDER.flutter, edge: LAVENDER.flutterEdge, accent: LAVENDER.flutterSpot, eye: { gap: 3.5, r: 1.6, dy: -3 }, mouth: 'smile' });
  makeEnemy(scene, 'e_snippy',  { w: 38, h: 38, shape: 'leaf', r: 12,   body: LAVENDER.snippy, edge: LAVENDER.snippyEdge, eye: { gap: 4, r: 1.7, dy: -1, style: 'angry' } });
  makeEnemy(scene, 'e_pompon',  { w: 36, h: 36, shape: 'spiky', r: 11,  body: LAVENDER.pompon, edge: LAVENDER.pomponEdge, eye: { gap: 4, r: 1.7 }, mouth: 'smile' });
  makeEnemy(scene, 'e_briar',   { w: 36, h: 36, shape: 'round', r: 12.5, body: LAVENDER.briar, edge: LAVENDER.briarEdge, eye: { gap: 4.5, r: 1.8, style: 'angry' }, mouth: 'pout' });

  // 精英：蜂后大人（大蜂 + 小金冠 + 四翅）
  makeTex(scene, 'e_queenbee', 104, 108, (ctx) => {
    softGlow(ctx, 52, 60, 46, rgba(LAVENDER.queenbee, 0.28));
    // 四翅
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeStyle = rgba(LAVENDER.queenbeeEdge, 0.6);
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(52 + s * 22, 26, 20, 9.5, s * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(52 + s * 30, 38, 13, 6.5, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    blobBody(ctx, 52, 60, 34, LAVENDER.queenbee, LAVENDER.queenbeeEdge, 1.05, 1);
    // 条纹
    ctx.fillStyle = cssOf(LAVENDER.bumbleStripe);
    for (const dy of [2, 18]) {
      ctx.beginPath();
      ctx.ellipse(52, 60 + dy, 33, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 小金冠
    ctx.beginPath();
    ctx.moveTo(40, 28);
    ctx.lineTo(42, 16);
    ctx.lineTo(48, 24);
    ctx.lineTo(52, 13);
    ctx.lineTo(56, 24);
    ctx.lineTo(62, 16);
    ctx.lineTo(64, 28);
    ctx.closePath();
    ctx.fillStyle = '#FFD878';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#C09030';
    ctx.stroke();
    // 尾针
    ctx.beginPath();
    ctx.moveTo(46, 92);
    ctx.lineTo(52, 102);
    ctx.lineTo(58, 92);
    ctx.closePath();
    ctx.fillStyle = cssOf(LAVENDER.bumbleStripe);
    ctx.fill();
    eyes(ctx, 52, 52, 12, 4.2, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(52, 70, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // Boss：紫蝶女王（双层大翅 + 触角 + 小金冠）
  makeTex(scene, 'e_flutterqueen', 180, 150, (ctx) => {
    softGlow(ctx, 90, 78, 72, rgba(LAVENDER.flutterqueen, 0.3));
    ctx.strokeStyle = cssOf(LAVENDER.flutterqueenEdge);
    for (const s of [-1, 1]) {
      // 上翅（大）
      ctx.beginPath();
      ctx.moveTo(90 + s * 14, 72);
      ctx.quadraticCurveTo(90 + s * 56, 14, 90 + s * 84, 36);
      ctx.quadraticCurveTo(90 + s * 88, 64, 90 + s * 46, 80);
      ctx.closePath();
      ctx.fillStyle = rgba(LAVENDER.flutter, 0.92);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      // 下翅（小）
      ctx.beginPath();
      ctx.moveTo(90 + s * 14, 88);
      ctx.quadraticCurveTo(90 + s * 62, 92, 90 + s * 58, 122);
      ctx.quadraticCurveTo(90 + s * 30, 124, 90 + s * 12, 100);
      ctx.closePath();
      ctx.fillStyle = rgba(LAVENDER.bloom, 0.92);
      ctx.fill();
      ctx.stroke();
      // 翅斑
      ctx.fillStyle = cssOf(LAVENDER.flutterSpot);
      ctx.beginPath();
      ctx.arc(90 + s * 56, 44, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(90 + s * 38, 104, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // 绒身
    ctx.beginPath();
    ctx.ellipse(90, 84, 17, 36, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(LAVENDER.flutterqueen);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    // 触角
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(90 + s * 5, 52);
      ctx.quadraticCurveTo(90 + s * 18, 30, 90 + s * 30, 26);
      ctx.stroke();
      ctx.fillStyle = cssOf(LAVENDER.flutterqueenEdge);
      ctx.beginPath();
      ctx.arc(90 + s * 30, 26, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 小金冠
    ctx.beginPath();
    ctx.moveTo(81, 50);
    ctx.lineTo(83, 40);
    ctx.lineTo(87, 47);
    ctx.lineTo(90, 38);
    ctx.lineTo(93, 47);
    ctx.lineTo(97, 40);
    ctx.lineTo(99, 50);
    ctx.closePath();
    ctx.fillStyle = '#FFD878';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#C09030';
    ctx.stroke();
    eyes(ctx, 90, 62, 8, 4, 'angry');
  });

  // 鳞粉弹（紫蝶女王弹幕）
  makeTex(scene, 'lz_dust', 18, 18, (ctx) => {
    softGlow(ctx, 9, 9, 8, rgba(LAVENDER.dust, 0.7));
    star(ctx, 9, 9, 4, 6, 2.6, cssOf(LAVENDER.dust), cssOf(LAVENDER.bloomDeep));
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(9, 9, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 刺果弹（刺莓莓）
  makeTex(scene, 'lz_thorn', 16, 22, (ctx) => {
    petalShape(ctx, 8, 11, 15, 4.5, 0, cssOf(LAVENDER.thorn), cssOf(LAVENDER.thornDeep));
    ctx.strokeStyle = cssOf(LAVENDER.thornDeep);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(8, 4.5);
    ctx.lineTo(8, 17.5);
    ctx.stroke();
  });

  // 顺风带（地图机制；ZoneSystem 椭圆地皮 — 风纹流线）
  makeTex(scene, 'lz_breeze', 150, 70, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, w / 2 - 2);
    g.addColorStop(0, rgba(LAVENDER.breeze, 0.34));
    g.addColorStop(0.8, rgba(LAVENDER.breeze, 0.22));
    g.addColorStop(1, rgba(LAVENDER.breezeDeep, 0.36));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 风纹流线（三道带回钩的弧线）
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = h / 2 - 10 + i * 9;
      const x0 = w / 2 - 44 + i * 8;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo(x0 + 36, y - 5, x0 + 62, y);
      ctx.arc(x0 + 64, y - 2.4, 2.6, Math.PI * 0.5, Math.PI * 1.9);
      ctx.stroke();
    }
  });

  // 装饰：薰衣草株 / 草丛 / 紫花 / 淡石 / 歇脚蝶
  for (let v = 0; v < 3; v++) {
    makeTex(scene, 'ld_lav' + v, 26, 44, (ctx) => {
      const x = 12 + v * 1.5;
      const bend = (v - 1) * 5;
      ctx.strokeStyle = cssOf(LAVENDER.lavLeaf);
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, 42);
      ctx.quadraticCurveTo(x + bend * 0.5, 26, x + bend, 14);
      ctx.stroke();
      // 底部小叶
      petalShape(ctx, x - 4, 34, 9, 2.6, -1.1, cssOf(LAVENDER.lavLeaf));
      petalShape(ctx, x + 4, 36, 9, 2.6, 1.15, cssOf(LAVENDER.lavLeaf));
      // 穗状花序（交错小粒向上收窄）
      ctx.fillStyle = cssOf(LAVENDER.lav);
      ctx.strokeStyle = cssOf(LAVENDER.lavEdge);
      ctx.lineWidth = 1;
      for (let row = 0; row < 4; row++) {
        const py = 14 - row * 3.6 + bend * 0;
        const px = x + bend + (bend !== 0 ? row * bend * 0.06 : 0);
        const rw = 3 - row * 0.45;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(px + s * rw * 0.7, py - 1, rw, 2, s * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.ellipse(x + bend, 2.5, 1.8, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'ld_grass' + v, 30, 20, (ctx) => {
      ctx.lineCap = 'round';
      const blades = 4 + v;
      for (let i = 0; i < blades; i++) {
        const x = 5 + (i * 20) / blades;
        const bend = (i % 3 - 1) * 6;
        const tipX = Math.min(27, Math.max(3, x + bend * 1.4));
        ctx.strokeStyle = i % 2 === 0 ? cssOf(LAVENDER.grass) : cssOf(LAVENDER.grassEdge);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 18);
        ctx.quadraticCurveTo(Math.max(2, Math.min(28, x + bend)), 10, tipX, 3 + (i % 2) * 3);
        ctx.stroke();
      }
    });
  }
  makeTex(scene, 'ld_bloom', 22, 22, (ctx) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(11 + Math.cos(a) * 5.4, 11 + Math.sin(a) * 5.4, 3.8, 2.5, a, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(LAVENDER.bloom);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(LAVENDER.bloomDeep, 0.7);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(11, 11, 3, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(LAVENDER.bloomCore);
    ctx.fill();
  });
  makeTex(scene, 'ld_pebble', 18, 13, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(9, 7.5, 6.5, 4, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(LAVENDER.pebble);
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(120,100,140,0.2)';
    ctx.stroke();
  });
  makeTex(scene, 'ld_bfly', 20, 16, (ctx) => {
    // 歇脚的小蝶（侧视双翅合拢）
    ctx.fillStyle = rgba(LAVENDER.flutter, 0.92);
    ctx.strokeStyle = cssOf(LAVENDER.flutterEdge);
    ctx.lineWidth = 1.2;
    for (const [ox, rot] of [[-2.5, -0.35], [2.5, 0.35]] as const) {
      ctx.save();
      ctx.translate(10 + ox, 8);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, -2.5, 3.6, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = cssOf(LAVENDER.flutterEdge);
    ctx.beginPath();
    ctx.ellipse(10, 9.5, 1.4, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------- 入口：进图/进 UI 页懒生成（幂等） ----------

const MARKERS: Record<MapId, string> = {
  meadow: 'e_blob', pond: 'e_tad', hills: 'e_leafy', grove: 'e_shroom', lavender: 'e_budling',
};

/** 确保某图的敌人/装饰/弹体纹理已生成（草甸在 Boot 全量生成，此处天然命中跳过） */
export function ensureMapAssets(scene: Phaser.Scene, mapId: MapId): void {
  if (scene.textures.exists(MARKERS[mapId])) return;
  if (mapId === 'pond') createPondAssets(scene);
  else if (mapId === 'hills') createHillsAssets(scene);
  else if (mapId === 'grove') createGroveAssets(scene);
  else if (mapId === 'lavender') createLavenderAssets(scene);
}
