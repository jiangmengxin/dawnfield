// 敌人纹理（M5 起换皮管线扩展：makeEnemy(shape, palette, face) 按图懒生成）
import { PAL, cssOf } from '../palette';
import { blobBody, eyes, makeTex, petalShape, softGlow } from './core';

export function createEnemyTextures(scene: Phaser.Scene): void {
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
}
