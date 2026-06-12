// 武器弹体/特效纹理
import { PAL, cssOf } from '../palette';
import { makeTex, petalShape, softGlow, star } from './core';

export function createWeaponTextures(scene: Phaser.Scene): void {
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
    // 困倦眼（与敌人共用风格，本地直绘避免引 helpers 的 ink 风格冲突）
    ctx.strokeStyle = cssOf(PAL.ink);
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(58 + s * 9, 38, 2.2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  });

  // 蒲公英种子（绒伞朝上 + 细茎 + 小籽）
  makeTex(scene, 'w_seed', 18, 24, (ctx) => {
    const cx = 9;
    // 放射绒毛
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.34;
      ctx.beginPath();
      ctx.moveTo(cx, 9);
      ctx.lineTo(cx + Math.cos(a) * 7, 9 + Math.sin(a) * 7);
      ctx.stroke();
    }
    // 绒毛尖小点
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.34;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 7, 9 + Math.sin(a) * 7, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    // 茎
    ctx.strokeStyle = cssOf(PAL.puffDeep);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, 9);
    ctx.lineTo(cx, 19);
    ctx.stroke();
    // 籽
    ctx.beginPath();
    ctx.ellipse(cx, 20.5, 1.8, 2.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#C8A868';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = cssOf(PAL.puffDeep);
    ctx.stroke();
  });
}
