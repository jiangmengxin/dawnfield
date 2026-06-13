// 地图资产管线（M5）：每图专属敌人换皮 + 装饰 + 弹体/地皮纹理，进图懒生成（ensureMapAssets 幂等）
// 敌人换皮 = makeEnemy(形体 × 调色 × 表情)：保持「扁平粉彩圆团 + 小点眼、静态单帧」与角色拉开表现力
// Boss 为每图门面，单独手绘（与草甸 e_boss 同待遇）
import { BRAMBLE, GROVE, HILLS, LAVENDER, NOCTURNE, POND, PAL, SUMMIT, cssOf } from '../palette';
import type { MapId } from '../../content/ids';
import { blobBody, Ctx, EyeStyle, eyes, makeBulletTex, makeTex, petalShape, softGlow, star } from './core';

function rgba(c: number, a: number): string {
  return `rgba(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff},${a})`;
}

// ---------- 换皮配方引擎 ----------

type EnemyShape =
  | 'round' | 'bubble' | 'tailed' | 'shelled' | 'spiky'
  | 'leaf' | 'winged' | 'wisp' | 'sprig' | 'cone' | 'jelly' | 'frog'
  | 'cap' | 'moth' | 'bee' // M6：蘑菇盖 / 蝶蛾翅 / 条纹蜂
  | 'eared' | 'starlet' | 'crescent'; // M7：圆耳团 / 星形身 / 月相轮

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

      case 'eared': {
        // 圆耳团（鼹鼠/熊崽/小枭）：头顶双圆耳 + 圆身；accent = 耳内色
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + s * r * 0.62, cy - r * 0.78, r * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = bc;
          ctx.fill();
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = ec;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx + s * r * 0.62, cy - r * 0.78, r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = ac;
          ctx.fill();
        }
        blobBody(ctx, cx, cy, r, rc.body, rc.edge, 1, 0.95);
        break;
      }

      case 'starlet': {
        // 星形身（星闪闪/星火花）：五角星 + 中心柔光
        softGlow(ctx, cx, cy, r * 1.5, rgba(rc.body, 0.4));
        star(ctx, cx, cy, 5, r * 1.3, r * 0.62, bc, ec);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.3, cy - r * 0.38, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'crescent': {
        // 月相轮（月相灵/蚀月轮）：圆轮 + 暗影偏移盘 + 亮缘月牙；accent = 月牙亮色
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = bc;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = ec;
        ctx.stroke();
        // 暗影盘（偏右上 → 左下露出月牙亮带）
        ctx.beginPath();
        ctx.arc(cx + r * 0.32, cy - r * 0.22, r * 0.82, 0, Math.PI * 2);
        ctx.fillStyle = rgba(rc.edge, 0.45);
        ctx.fill();
        // 月牙亮带
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.78, Math.PI * 0.45, Math.PI * 1.25);
        ctx.lineWidth = r * 0.26;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(rc.accent ?? 0xfff0c0, 0.9);
        ctx.stroke();
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
  makeBulletTex(scene, 'pz_bub', 18, 18, (ctx) => {
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
  makeBulletTex(scene, 'hz_feather', 20, 28, (ctx) => {
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
  // M15 自爆菇（exploder）：暖红警示配色 = 高威胁专属描边（剪影规范）
  makeEnemy(scene, 'e_bombcap', { w: 40, h: 42, shape: 'cap', r: 13,    body: GROVE.bombcap, edge: GROVE.bombcapEdge, accent: GROVE.bombcapCap, eye: { gap: 4.5, r: 1.8, dy: 5, style: 'surprised' }, mouth: 'open' });

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
  makeBulletTex(scene, 'gz_spore', 18, 18, (ctx) => {
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
  // M15 蜂巢芽（summoner）：蜜檀配色条纹蜂身 = 高威胁专属描边（剪影规范）
  makeEnemy(scene, 'e_hivebud', { w: 42, h: 44, shape: 'bee', r: 14,    body: LAVENDER.hivebud, edge: LAVENDER.hivebudEdge, accent: LAVENDER.hivebudComb, eye: { gap: 5, r: 1.9, dy: -4, style: 'angry' }, mouth: 'open' });

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
  makeBulletTex(scene, 'lz_thorn', 16, 22, (ctx) => {
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

// ---------- 莓果灌丛 ----------

function createBrambleAssets(scene: Phaser.Scene): void {
  makeEnemy(scene, 'e_berryling', { w: 32, h: 32, shape: 'round', r: 11.5,  body: BRAMBLE.berryling, edge: BRAMBLE.berrylingEdge, eye: { gap: 4, r: 1.7 }, mouth: 'smile' });
  makeEnemy(scene, 'e_bristle',   { w: 38, h: 38, shape: 'spiky', r: 10.5,  body: BRAMBLE.bristle, edge: BRAMBLE.bristleEdge, eye: { gap: 4, r: 1.7, style: 'angry' } });
  makeEnemy(scene, 'e_mole',      { w: 38, h: 40, shape: 'eared', r: 12,    body: BRAMBLE.mole, edge: BRAMBLE.moleEdge, accent: BRAMBLE.moleNose, eye: { gap: 4, r: 1.6, style: 'sleepy' }, mouth: 'pout' });
  makeEnemy(scene, 'e_magpie',    { w: 42, h: 32, shape: 'winged', r: 10.5, body: BRAMBLE.magpie, edge: BRAMBLE.magpieEdge, accent: BRAMBLE.magpieBeak, eye: { gap: 4, r: 1.8 } });
  makeEnemy(scene, 'e_cubby',     { w: 44, h: 46, shape: 'eared', r: 14,    body: BRAMBLE.cubby, edge: BRAMBLE.cubbyEdge, accent: BRAMBLE.cubbyMuzzle, eye: { gap: 5, r: 1.9 }, mouth: 'open' });
  makeEnemy(scene, 'e_gourd',     { w: 38, h: 38, shape: 'round', r: 13.5,  body: BRAMBLE.gourd, edge: BRAMBLE.gourdEdge, eye: { gap: 5, r: 1.8, style: 'surprised' }, mouth: 'open' });
  // M15 果壳卫（shielder）：厚壳配色 = 高威胁专属描边（剪影规范）
  makeEnemy(scene, 'e_husker',    { w: 46, h: 42, shape: 'shelled', r: 14,  body: BRAMBLE.husker, edge: BRAMBLE.huskerEdge, accent: BRAMBLE.huskerShell, mouth: 'pout' });

  // 精英：大莓王（巨莓 + 叶冠 + 满身籽点）
  makeTex(scene, 'e_bigberry', 104, 108, (ctx) => {
    softGlow(ctx, 52, 62, 46, rgba(BRAMBLE.bigberry, 0.28));
    blobBody(ctx, 52, 62, 36, BRAMBLE.bigberry, BRAMBLE.bigberryEdge, 1.05, 1);
    // 籽点
    ctx.fillStyle = 'rgba(255,240,224,0.85)';
    for (const [dx, dy] of [[-22, -6], [-10, 12], [6, 20], [20, 4], [12, -14], [-6, -18], [24, 18], [-24, 14]] as const) {
      ctx.beginPath();
      ctx.ellipse(52 + dx, 62 + dy, 2.2, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 叶冠（三片）
    petalShape(ctx, 38, 24, 22, 7, -0.85, cssOf(BRAMBLE.bush), cssOf(BRAMBLE.bushEdge));
    petalShape(ctx, 66, 24, 22, 7, 0.85, cssOf(BRAMBLE.bush), cssOf(BRAMBLE.bushEdge));
    petalShape(ctx, 52, 18, 24, 8, 0, cssOf(BRAMBLE.clover), cssOf(BRAMBLE.bushEdge));
    eyes(ctx, 52, 56, 12, 4.2, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(52, 74, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // Boss：莓刺熊王（立熊 + 莓果肚兜 + 荆棘披肩）
  makeTex(scene, 'e_bramblebear', 168, 158, (ctx) => {
    softGlow(ctx, 84, 88, 70, rgba(BRAMBLE.bramblebear, 0.3));
    // 双耳
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(84 + s * 34, 32, 17, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(BRAMBLE.bramblebear);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = cssOf(BRAMBLE.bramblebearEdge);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(84 + s * 34, 32, 8, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(BRAMBLE.cubbyMuzzle);
      ctx.fill();
    }
    // 身体（蹲坐宽身）
    blobBody(ctx, 84, 90, 52, BRAMBLE.bramblebear, BRAMBLE.bramblebearEdge, 1.08, 1);
    // 荆棘披肩（肩头刺藤）
    ctx.strokeStyle = cssOf(BRAMBLE.thornDecorEdge);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(84 + s * 18, 52);
      ctx.quadraticCurveTo(84 + s * 44, 46, 84 + s * 58, 60);
      ctx.stroke();
      for (const k of [0.35, 0.7]) {
        const tx = 84 + s * (18 + 40 * k);
        const ty = 50 + 8 * k;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + s * 3, ty - 6);
        ctx.stroke();
      }
    }
    // 浅色口鼻 + 莓果肚兜
    ctx.beginPath();
    ctx.ellipse(84, 96, 17, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(BRAMBLE.cubbyMuzzle);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = cssOf(BRAMBLE.bramblebearEdge);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(84, 92, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.fill();
    // 肚口小莓果
    for (const [bx, by] of [[64, 122], [84, 128], [104, 122]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(BRAMBLE.berryling);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = cssOf(BRAMBLE.berrylingEdge);
      ctx.stroke();
    }
    eyes(ctx, 84, 74, 16, 5.5, 'angry');
  });

  // 莓果弹（浆果炮手/莓刺熊王弹幕）
  makeBulletTex(scene, 'bz_berry', 18, 18, (ctx) => {
    ctx.beginPath();
    ctx.arc(9, 9, 6, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(BRAMBLE.berryShot);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cssOf(BRAMBLE.berryShotDeep);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,224,0.85)';
    for (const [dx, dy] of [[-2, -1], [1.5, 1.5], [0.5, -2.5]] as const) {
      ctx.beginPath();
      ctx.arc(9 + dx, 9 + dy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(6.8, 6.8, 1.5, 1, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 荆棘地皮（地图机制；椭圆刺丛）
  makeTex(scene, 'bz_thorns', 116, 64, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, w / 2 - 2);
    g.addColorStop(0, rgba(BRAMBLE.thornDecor, 0.28));
    g.addColorStop(0.85, rgba(BRAMBLE.thornDecor, 0.2));
    g.addColorStop(1, rgba(BRAMBLE.thornDecorEdge, 0.42));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 交错刺藤
    ctx.strokeStyle = rgba(BRAMBLE.thornDecorEdge, 0.85);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[18, 38, 52, 22], [40, 46, 80, 36], [62, 20, 98, 34], [30, 26, 58, 40]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 6, x1, y1);
      ctx.stroke();
      // 小刺
      for (const k of [0.3, 0.65]) {
        const tx = x0 + (x1 - x0) * k;
        const ty = y0 + (y1 - y0) * k - 4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + 2.5, ty - 5);
        ctx.stroke();
      }
    }
  });

  // 装饰：莓果灌木 / 落莓 / 刺藤团 / 三叶草 / 小树桩
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'bd_bush' + v, 36, 30, (ctx) => {
      // 灌木冠（三球）
      ctx.fillStyle = cssOf(BRAMBLE.bush);
      ctx.strokeStyle = cssOf(BRAMBLE.bushEdge);
      ctx.lineWidth = 1.8;
      const puffs: Array<[number, number, number]> = v === 0
        ? [[12, 18, 9], [24, 17, 9.5], [18, 11, 9]]
        : [[11, 16, 8], [25, 18, 9], [18, 10, 8.5]];
      ctx.beginPath();
      for (const [x, y, r2] of puffs) {
        ctx.moveTo(x + r2, y);
        ctx.arc(x, y, r2, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      // 挂果
      ctx.fillStyle = cssOf(BRAMBLE.berryDecor);
      for (const [x, y] of v === 0 ? [[13, 16], [22, 20], [19, 9]] as const : [[12, 14], [25, 15]] as const) {
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  makeTex(scene, 'bd_berry', 24, 18, (ctx) => {
    for (const [x, y, r2] of [[8, 10, 5], [17, 12, 4]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r2, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(BRAMBLE.berryDecor);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = cssOf(BRAMBLE.berryDeep);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,224,0.8)';
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 0.8, 0, Math.PI * 2);
      ctx.arc(x + 1.5, y + 1, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    petalShape(ctx, 7, 3.5, 6, 2.2, -0.6, cssOf(BRAMBLE.clover), cssOf(BRAMBLE.bushEdge));
  });
  makeTex(scene, 'bd_thorn', 30, 20, (ctx) => {
    ctx.strokeStyle = cssOf(BRAMBLE.thornDecorEdge);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1, bend] of [[3, 14, 27, 8, -5], [5, 8, 25, 16, 5]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + bend, x1, y1);
      ctx.stroke();
      for (const k of [0.35, 0.7]) {
        const tx = x0 + (x1 - x0) * k;
        const ty = y0 + (y1 - y0) * k + bend * 0.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + 2, ty - 4);
        ctx.stroke();
      }
    }
  });
  makeTex(scene, 'bd_clover', 22, 18, (ctx) => {
    for (const [cx2, cy2, k] of [[8, 9, 1], [16, 12, 0.7]] as const) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(cx2 + Math.cos(a) * 3 * k, cy2 + Math.sin(a) * 3 * k, 3.2 * k, 2.5 * k, a, 0, Math.PI * 2);
        ctx.fillStyle = cssOf(BRAMBLE.clover);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(BRAMBLE.cloverEdge, 0.8);
        ctx.stroke();
      }
    }
  });
  makeTex(scene, 'bd_stump', 26, 20, (ctx) => {
    // 侧视小树桩：桩身 + 顶面年轮
    ctx.fillStyle = cssOf(BRAMBLE.stump);
    ctx.strokeStyle = cssOf(BRAMBLE.stumpEdge);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, 9);
    ctx.lineTo(6, 16);
    ctx.quadraticCurveTo(13, 19.5, 20, 16);
    ctx.lineTo(20, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(13, 9, 7, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xe2d2b8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rgba(BRAMBLE.stumpEdge, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(13, 9, 3.6, 1.9, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// ---------- 星语夜原 ----------

function createNocturneAssets(scene: Phaser.Scene): void {
  makeEnemy(scene, 'e_moonmote',  { w: 24, h: 24, shape: 'round', r: 8.5,    body: NOCTURNE.moonmote, edge: NOCTURNE.moonmoteEdge, eye: { gap: 3.2, r: 1.5 } });
  makeEnemy(scene, 'e_twinkle',   { w: 36, h: 36, shape: 'starlet', r: 10.5, body: NOCTURNE.twinkle, edge: NOCTURNE.twinkleEdge, eye: { gap: 3.8, r: 1.6, dy: 0 }, mouth: 'smile' });
  makeEnemy(scene, 'e_nightmoth', { w: 46, h: 36, shape: 'moth', r: 11,      body: NOCTURNE.nightmoth, edge: NOCTURNE.nightmothEdge, accent: NOCTURNE.nightmothSpot, eye: { gap: 3.5, r: 1.6, dy: -3 } });
  makeEnemy(scene, 'e_lunaling',  { w: 34, h: 34, shape: 'crescent', r: 12,  body: NOCTURNE.lunaling, edge: NOCTURNE.lunalingEdge, accent: NOCTURNE.lunalingMoon, eye: { gap: 4.2, r: 1.7, dy: 1 }, mouth: 'pout' });
  makeEnemy(scene, 'e_owlet',     { w: 36, h: 38, shape: 'eared', r: 11.5,   body: NOCTURNE.owlet, edge: NOCTURNE.owletEdge, accent: NOCTURNE.owletBeak, eye: { gap: 4.5, r: 2, style: 'surprised' }, mouth: 'pout' });
  makeEnemy(scene, 'e_sparkler',  { w: 40, h: 40, shape: 'starlet', r: 12,   body: NOCTURNE.sparkler, edge: NOCTURNE.sparklerEdge, eye: { gap: 4.2, r: 1.7, style: 'angry' }, mouth: 'open' });
  // M15 星爆尘（exploder）：橙红警示配色 = 高威胁专属描边（剪影规范）
  makeEnemy(scene, 'e_novamote',  { w: 32, h: 32, shape: 'starlet', r: 9.5,  body: NOCTURNE.novamote, edge: NOCTURNE.novamoteEdge, eye: { gap: 3.5, r: 1.6, style: 'surprised' }, mouth: 'open' });

  // 精英：大彗星（拖尾巨星核）
  makeTex(scene, 'e_cometlord', 116, 100, (ctx) => {
    softGlow(ctx, 70, 50, 44, rgba(NOCTURNE.cometlord, 0.32));
    // 彗尾（向左三道渐淡光带）
    ctx.lineCap = 'round';
    for (const [dy, len, w2, a] of [[-8, 52, 9, 0.5], [2, 62, 11, 0.65], [12, 48, 8, 0.45]] as const) {
      ctx.strokeStyle = rgba(NOCTURNE.cometlord, a);
      ctx.lineWidth = w2;
      ctx.beginPath();
      ctx.moveTo(64, 50 + dy);
      ctx.quadraticCurveTo(40 - len * 0.3, 48 + dy * 1.4, 64 - len, 44 + dy * 1.8);
      ctx.stroke();
    }
    // 星核
    star(ctx, 72, 50, 5, 36, 17, cssOf(NOCTURNE.cometlord), cssOf(NOCTURNE.cometlordEdge));
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(62, 38, 7, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, 72, 46, 11, 4, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(72, 60, 6, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // Boss：星角鹿王（星辉鹿首 + 发光大角 + 颈毛）
  makeTex(scene, 'e_starelk', 172, 156, (ctx) => {
    softGlow(ctx, 86, 92, 68, rgba(NOCTURNE.starelk, 0.3));
    // 发光大角（对称分叉）
    ctx.strokeStyle = cssOf(NOCTURNE.starelkAntler);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(86 + s * 22, 52);
      ctx.quadraticCurveTo(86 + s * 46, 30, 86 + s * 54, 10);
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(86 + s * 36, 36);
      ctx.lineTo(86 + s * 52, 32);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(86 + s * 46, 22);
      ctx.lineTo(86 + s * 62, 20);
      ctx.stroke();
      ctx.lineWidth = 6;
      // 角尖小星
      star(ctx, 86 + s * 54, 9, 4, 6, 2.6, '#FFF6CE', cssOf(NOCTURNE.twinkleEdge));
    }
    // 双耳
    for (const s of [-1, 1]) {
      petalShape(ctx, 86 + s * 36, 60, 22, 7.5, s * 1.25, cssOf(NOCTURNE.starelk), cssOf(NOCTURNE.starelkEdge));
    }
    // 头脸（长椭圆）
    ctx.beginPath();
    ctx.ellipse(86, 94, 42, 50, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(NOCTURNE.starelk);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = cssOf(NOCTURNE.starelkEdge);
    ctx.stroke();
    // 顶部高光 + 额前星斑
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(72, 64, 13, 7, -0.5, 0, Math.PI * 2);
    ctx.fill();
    star(ctx, 86, 70, 4, 7, 3, cssOf(NOCTURNE.starGlow));
    // 浅色口鼻
    ctx.beginPath();
    ctx.ellipse(86, 122, 18, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(NOCTURNE.moonmote);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(86, 117, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.fill();
    eyes(ctx, 86, 98, 17, 5.5, 'angry');
  });

  // 星屑弹（星火花/星角鹿王弹幕）
  makeBulletTex(scene, 'nz_star', 18, 18, (ctx) => {
    softGlow(ctx, 9, 9, 8, rgba(NOCTURNE.starShot, 0.7));
    star(ctx, 9, 9, 5, 6.5, 3, cssOf(NOCTURNE.starShot), cssOf(NOCTURNE.starShotDeep));
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(9, 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 流星预警圈（地图机制；代码控制 alpha 闪烁）
  makeTex(scene, 'nz_warn', 96, 96, (ctx) => {
    ctx.strokeStyle = rgba(NOCTURNE.starShotDeep, 0.9);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(48, 48, 43, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(NOCTURNE.starShot, 0.6);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(48, 48, 34, 0, Math.PI * 2);
    ctx.stroke();
    star(ctx, 48, 48, 4, 10, 4, rgba(NOCTURNE.starShot, 0.85));
  });

  // 装饰：银草 / 地面星光 / 月铃花 / 星晶 / 淡石
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'nd_grass' + v, 30, 22, (ctx) => {
      ctx.lineCap = 'round';
      const blades = 4 + v;
      for (let i = 0; i < blades; i++) {
        const x = 5 + (i * 20) / blades;
        const bend = (i % 3 - 1) * 6;
        const tipX = Math.min(27, Math.max(3, x + bend * 1.4));
        ctx.strokeStyle = i % 2 === 0 ? cssOf(NOCTURNE.grass) : cssOf(NOCTURNE.grassEdge);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.quadraticCurveTo(Math.max(2, Math.min(28, x + bend)), 11, tipX, 3 + (i % 2) * 4);
        ctx.stroke();
      }
    });
  }
  makeTex(scene, 'nd_star', 20, 20, (ctx) => {
    softGlow(ctx, 10, 10, 8, rgba(NOCTURNE.starGlow, 0.55));
    star(ctx, 10, 10, 4, 5.5, 2.2, rgba(NOCTURNE.starGlow, 0.95));
  });
  makeTex(scene, 'nd_bell', 24, 38, (ctx) => {
    // 月铃花：弯茎垂吊三铃
    ctx.strokeStyle = cssOf(NOCTURNE.grassEdge);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6, 36);
    ctx.quadraticCurveTo(8, 18, 16, 8);
    ctx.stroke();
    for (const [x, y, k] of [[16, 10, 1], [11, 18, 0.85], [8, 26, 0.7]] as const) {
      ctx.beginPath();
      ctx.moveTo(x - 3.6 * k, y);
      ctx.quadraticCurveTo(x, y - 3.5 * k, x + 3.6 * k, y);
      ctx.lineTo(x + 2.6 * k, y + 5 * k);
      ctx.quadraticCurveTo(x, y + 6.5 * k, x - 2.6 * k, y + 5 * k);
      ctx.closePath();
      ctx.fillStyle = cssOf(NOCTURNE.bell);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = cssOf(NOCTURNE.bellDeep);
      ctx.stroke();
      ctx.fillStyle = cssOf(NOCTURNE.bellCore);
      ctx.beginPath();
      ctx.arc(x, y + 5.6 * k, 1.2 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  makeTex(scene, 'nd_crystal', 22, 24, (ctx) => {
    // 星晶簇（两根斜立晶柱）
    for (const [x, y, h2, w2, rot] of [[9, 14, 14, 5, -0.15], [16, 16, 9, 3.6, 0.3]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -h2 * 0.7);
      ctx.lineTo(w2 / 2, -h2 * 0.25);
      ctx.lineTo(w2 / 2, h2 * 0.45);
      ctx.lineTo(-w2 / 2, h2 * 0.45);
      ctx.lineTo(-w2 / 2, -h2 * 0.25);
      ctx.closePath();
      ctx.fillStyle = rgba(NOCTURNE.crystal, 0.9);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = cssOf(NOCTURNE.crystalEdge);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w2 * 0.15, -h2 * 0.5);
      ctx.lineTo(-w2 * 0.15, h2 * 0.35);
      ctx.stroke();
      ctx.restore();
    }
  });
  makeTex(scene, 'nd_pebble', 18, 13, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(9, 7.5, 6.5, 4, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(NOCTURNE.pebble);
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(110,122,170,0.25)';
    ctx.stroke();
  });
}

// ---------- 破晓之巅 ----------

function createSummitAssets(scene: Phaser.Scene): void {
  makeEnemy(scene, 'e_shade',      { w: 32, h: 32, shape: 'round', r: 11.5,   body: SUMMIT.shade, edge: SUMMIT.shadeEdge, eye: { gap: 4, r: 1.7 } });
  makeEnemy(scene, 'e_gloom',      { w: 40, h: 32, shape: 'wisp', r: 11,      body: SUMMIT.gloom, edge: SUMMIT.gloomEdge, eye: { gap: 4, r: 1.7, style: 'sleepy' }, mouth: 'pout' });
  makeEnemy(scene, 'e_umbra',      { w: 42, h: 34, shape: 'winged', r: 10.5,  body: SUMMIT.umbra, edge: SUMMIT.umbraEdge, accent: SUMMIT.umbraEar, eye: { gap: 4, r: 1.8, style: 'angry' } });
  makeEnemy(scene, 'e_glint',      { w: 22, h: 22, shape: 'round', r: 7.5,    body: SUMMIT.glint, edge: SUMMIT.glintEdge, eye: { gap: 3, r: 1.4, style: 'happy' } });
  makeEnemy(scene, 'e_nightbloom', { w: 42, h: 44, shape: 'cap', r: 13.5,     body: SUMMIT.nightbloom, edge: SUMMIT.nightbloomEdge, accent: SUMMIT.nightbloomCap, eye: { gap: 4.5, r: 1.8, dy: 6, style: 'surprised' }, mouth: 'open' });
  makeEnemy(scene, 'e_eclipse',    { w: 40, h: 40, shape: 'crescent', r: 14,  body: SUMMIT.eclipse, edge: SUMMIT.eclipseEdge, accent: SUMMIT.eclipseRim, eye: { gap: 4.5, r: 1.8, dy: 1, style: 'angry' } });
  makeEnemy(scene, 'e_lurker',     { w: 38, h: 38, shape: 'round', r: 13,     body: SUMMIT.lurker, edge: SUMMIT.lurkerEdge, eye: { gap: 5, r: 1.9, style: 'angry' }, mouth: 'pout' });
  // M15 暗幕守（shielder）/ 影隙口（summoner）：极深紫描边 = 高威胁专属描边（剪影规范）
  makeEnemy(scene, 'e_duskward',   { w: 46, h: 42, shape: 'shelled', r: 14,   body: SUMMIT.duskward, edge: SUMMIT.duskwardEdge, accent: SUMMIT.duskwardShell, mouth: 'pout' });
  makeEnemy(scene, 'e_shadowmaw',  { w: 42, h: 40, shape: 'wisp', r: 13.5,    body: SUMMIT.shadowmaw, edge: SUMMIT.shadowmawEdge, accent: SUMMIT.shadowmawMaw, eye: { gap: 5, r: 2, style: 'angry' }, mouth: 'open' });

  // 精英：大夜影（罩袍影团 + 冷光内眸）
  makeTex(scene, 'e_shadelord', 108, 108, (ctx) => {
    softGlow(ctx, 54, 58, 48, rgba(SUMMIT.shadelord, 0.3));
    // 罩袍剪影（圆顶 + 波浪下摆）
    ctx.beginPath();
    ctx.arc(54, 52, 38, Math.PI, 0);
    for (let i = 0; i <= 4; i++) {
      const x0 = 92 - (i * 76) / 4;
      ctx.quadraticCurveTo(x0 + 9.5, 102, x0 - 9.5, 90);
    }
    ctx.closePath();
    ctx.fillStyle = cssOf(SUMMIT.shadelord);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(SUMMIT.shadelordEdge);
    ctx.stroke();
    // 内影
    ctx.fillStyle = rgba(SUMMIT.shadelordEdge, 0.4);
    ctx.beginPath();
    ctx.ellipse(54, 60, 24, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(40, 32, 10, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, 54, 54, 12, 4.2, 'angry');
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(54, 70, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  });

  // Boss：永夜枭（展翼大枭 + 耳羽 + 月纹胸口）
  makeTex(scene, 'e_nightowl', 176, 152, (ctx) => {
    softGlow(ctx, 88, 80, 72, rgba(SUMMIT.nightowl, 0.32));
    ctx.fillStyle = cssOf(SUMMIT.nightowl);
    ctx.strokeStyle = cssOf(SUMMIT.nightowlEdge);
    // 展翼（下垂三段羽指）
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(88 + s * 26, 60);
      ctx.quadraticCurveTo(88 + s * 76, 44, 88 + s * 86, 70);
      ctx.quadraticCurveTo(88 + s * 78, 78, 88 + s * 70, 76);
      ctx.quadraticCurveTo(88 + s * 76, 92, 88 + s * 62, 92);
      ctx.quadraticCurveTo(88 + s * 62, 104, 88 + s * 46, 100);
      ctx.quadraticCurveTo(88 + s * 36, 102, 88 + s * 26, 94);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    // 耳羽
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(88 + s * 16, 36);
      ctx.quadraticCurveTo(88 + s * 30, 16, 88 + s * 40, 12);
      ctx.quadraticCurveTo(88 + s * 34, 30, 88 + s * 26, 40);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    // 身体
    blobBody(ctx, 88, 80, 46, SUMMIT.nightowl, SUMMIT.nightowlEdge, 1, 1.1);
    // 浅色胸腹 + 月纹
    ctx.beginPath();
    ctx.ellipse(88, 98, 26, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(SUMMIT.nightowlBelly);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = cssOf(SUMMIT.nightowlEdge);
    ctx.stroke();
    // 胸口月牙纹
    ctx.beginPath();
    ctx.arc(88, 98, 9, 0.7, Math.PI * 2 - 0.7);
    ctx.arc(92, 98, 7, Math.PI * 2 - 1.0, 1.0, true);
    ctx.closePath();
    ctx.fillStyle = cssOf(SUMMIT.eclipseRim);
    ctx.fill();
    // 眼盘（双大圆盘 + 凶眼）
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(88 + s * 17, 58, 14, 0, Math.PI * 2);
      ctx.fillStyle = rgba(SUMMIT.nightowlBelly, 0.85);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = cssOf(SUMMIT.nightowlEdge);
      ctx.stroke();
    }
    eyes(ctx, 88, 58, 17, 5.5, 'angry');
    // 喙
    ctx.beginPath();
    ctx.moveTo(82, 70);
    ctx.lineTo(88, 80);
    ctx.lineTo(94, 70);
    ctx.closePath();
    ctx.fillStyle = cssOf(SUMMIT.nightowlBeak);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = cssOf(SUMMIT.nightowlEdge);
    ctx.stroke();
  });

  // 夜瓣弹（夜昙昙/永夜枭弹幕）
  makeBulletTex(scene, 'sz_petal', 18, 24, (ctx) => {
    softGlow(ctx, 9, 12, 8, rgba(SUMMIT.petalShot, 0.5));
    petalShape(ctx, 9, 12, 16, 5, 0, cssOf(SUMMIT.petalShot), cssOf(SUMMIT.petalShotDeep));
    ctx.strokeStyle = rgba(SUMMIT.petalShotDeep, 0.7);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(9, 5);
    ctx.lineTo(9, 19);
    ctx.stroke();
  });

  // 晨光柱（地图机制；金光椭圆地皮 + 光柱条纹）
  makeTex(scene, 'sz_pillar', 130, 72, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, w / 2 - 2);
    g.addColorStop(0, rgba(SUMMIT.pillar, 0.55));
    g.addColorStop(0.55, rgba(SUMMIT.pillar, 0.36));
    g.addColorStop(1, rgba(SUMMIT.pillarDeep, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 中心亮斑 + 放射光纹
    ctx.fillStyle = 'rgba(255,252,236,0.75)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,224,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 30, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,224,0.35)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 48, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 装饰：金穗草 / 破晓花 / 光斑 / 山石 / 萤金点
  for (let v = 0; v < 2; v++) {
    makeTex(scene, 'sd_tuft' + v, 32, 22, (ctx) => {
      ctx.lineCap = 'round';
      const blades = 4 + v;
      for (let i = 0; i < blades; i++) {
        const x = 5 + (i * 22) / blades;
        const bend = (i % 3 - 1) * 7;
        const tipX = Math.min(29, Math.max(3, x + bend * 1.5));
        ctx.strokeStyle = i % 2 === 0 ? cssOf(SUMMIT.tuft) : cssOf(SUMMIT.tuftEdge);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.quadraticCurveTo(Math.max(2, Math.min(30, x + bend)), 11, tipX, 3 + (i % 2) * 4);
        ctx.stroke();
      }
    });
  }
  makeTex(scene, 'sd_bloom', 26, 26, (ctx) => {
    // 破晓金阳花：柔光 + 12 根细长金瓣 + 亮白花心（与山岗雏菊拉开辨识）
    softGlow(ctx, 13, 13, 12, rgba(SUMMIT.pillar, 0.55));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      petalShape(ctx, 13 + Math.cos(a) * 6.4, 13 + Math.sin(a) * 6.4, 9.5, 2.2, a + Math.PI / 2,
        cssOf(SUMMIT.dawnbloom), rgba(SUMMIT.dawnbloomDeep, 0.8));
    }
    ctx.beginPath();
    ctx.arc(13, 13, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF8E0';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = cssOf(SUMMIT.dawnbloomDeep);
    ctx.stroke();
  });
  makeTex(scene, 'sd_ray', 36, 20, (ctx) => {
    // 斜落地面的光斑带
    const g = ctx.createLinearGradient(4, 16, 32, 4);
    g.addColorStop(0, rgba(SUMMIT.ray, 0.0));
    g.addColorStop(0.5, rgba(SUMMIT.ray, 0.55));
    g.addColorStop(1, rgba(SUMMIT.ray, 0.0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(18, 10, 16, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,252,236,0.5)';
    ctx.beginPath();
    ctx.ellipse(18, 10, 7, 2.6, -0.25, 0, Math.PI * 2);
    ctx.fill();
  });
  makeTex(scene, 'sd_rock', 24, 17, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(3, 13);
    ctx.quadraticCurveTo(4, 6, 10, 4.5);
    ctx.quadraticCurveTo(18, 2.5, 21, 8);
    ctx.quadraticCurveTo(22.5, 13, 17, 14.5);
    ctx.quadraticCurveTo(8, 16, 3, 13);
    ctx.closePath();
    ctx.fillStyle = cssOf(SUMMIT.rock);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(90,82,72,0.2)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(9, 7, 4, 2, -0.2, 0, Math.PI * 2);
    ctx.fill();
  });
  makeTex(scene, 'sd_glow', 22, 22, (ctx) => {
    for (const [x, y, r2, a] of [[7, 9, 3, 0.75], [15, 6, 2.2, 0.55], [14, 15, 2.6, 0.65]] as const) {
      softGlow(ctx, x, y, r2 * 2.2, rgba(SUMMIT.pillar, a * 0.6));
      ctx.fillStyle = rgba(SUMMIT.pillar, a);
      ctx.beginPath();
      ctx.arc(x, y, r2 * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ---------- 入口：进图/进 UI 页懒生成（幂等） ----------

const MARKERS: Record<MapId, string> = {
  meadow: 'e_blob', pond: 'e_tad', hills: 'e_leafy', grove: 'e_shroom', lavender: 'e_budling',
  bramble: 'e_berryling', nocturne: 'e_moonmote', summit: 'e_shade',
};

/** 各图懒生成纹理键登记（M8 纹理生命周期：离图释放用；草甸 Boot 常驻不在册） */
const CREATED: Partial<Record<MapId, string[]>> = {};

/** 确保某图的敌人/装饰/弹体纹理已生成（草甸在 Boot 全量生成，此处天然命中跳过） */
export function ensureMapAssets(scene: Phaser.Scene, mapId: MapId): void {
  if (scene.textures.exists(MARKERS[mapId])) return;
  const before = new Set(scene.textures.getTextureKeys());
  if (mapId === 'pond') createPondAssets(scene);
  else if (mapId === 'hills') createHillsAssets(scene);
  else if (mapId === 'grove') createGroveAssets(scene);
  else if (mapId === 'lavender') createLavenderAssets(scene);
  else if (mapId === 'bramble') createBrambleAssets(scene);
  else if (mapId === 'nocturne') createNocturneAssets(scene);
  else if (mapId === 'summit') createSummitAssets(scene);
  else return;
  CREATED[mapId] = scene.textures.getTextureKeys().filter((k) => !before.has(k));
}

/** 纹理生命周期（M8）：释放除 keep 外所有已懒生成的地图纹理（8 图全量常驻 → 进图按需）。
 *  仅在进图时调用（此刻其余场景已停止、无对象引用旧纹理）；
 *  图鉴/成就/选图页需要时会经 ensureMapAssets 重新懒生成 */
export function releaseMapAssets(scene: Phaser.Scene, keep: MapId): void {
  for (const id of Object.keys(CREATED) as MapId[]) {
    if (id === keep) continue;
    for (const k of CREATED[id] ?? []) {
      if (scene.textures.exists(k)) scene.textures.remove(k);
    }
    delete CREATED[id];
  }
}
