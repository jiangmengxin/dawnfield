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

  // 暖灯笼光圈（径向暖光 + 边缘亮环；ZoneSystem 式 setDisplaySize 调用）
  makeTex(scene, 'w_lantern_aura', 180, 180, (ctx) => {
    const g = ctx.createRadialGradient(90, 90, 10, 90, 90, 88);
    g.addColorStop(0, 'rgba(255,232,176,0.32)');
    g.addColorStop(0.72, 'rgba(255,216,136,0.22)');
    g.addColorStop(0.95, 'rgba(248,184,104,0.4)');
    g.addColorStop(1, 'rgba(248,184,104,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(90, 90, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(90, 90, 84, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,244,210,0.7)';
    ctx.stroke();
  });

  // 小灯笼本体（飘在角色头侧）
  makeTex(scene, 'w_lantern', 22, 28, (ctx) => {
    softGlow(ctx, 11, 15, 10, 'rgba(255,216,140,0.9)');
    // 提环
    ctx.strokeStyle = '#A07048';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(11, 6, 3, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();
    // 灯身
    ctx.beginPath();
    ctx.ellipse(11, 15, 6, 7.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD888';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#C08838';
    ctx.stroke();
    // 骨线
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(192,136,56,0.6)';
    for (const dx of [-2.6, 2.6]) {
      ctx.beginPath();
      ctx.moveTo(11 + dx, 8.6);
      ctx.quadraticCurveTo(11 + dx * 1.7, 15, 11 + dx, 21.4);
      ctx.stroke();
    }
    // 顶盖/底座
    ctx.fillStyle = '#A07048';
    ctx.fillRect(8, 7, 6, 2.4);
    ctx.fillRect(8.6, 21, 4.8, 2);
    // 灯芯亮点
    ctx.fillStyle = 'rgba(255,250,220,0.95)';
    ctx.beginPath();
    ctx.arc(11, 15, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 绕身小星（星星环弹体）
  makeTex(scene, 'w_orbstar', 26, 26, (ctx) => {
    softGlow(ctx, 13, 13, 12, 'rgba(200,212,255,0.6)');
    star(ctx, 13, 13, 5, 10, 4.4, '#FFF6CE', '#C0A858');
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(13, 12, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 松果锤（鳞纹锤头 + 木柄；origin 设在柄端做抡砸动画）
  makeTex(scene, 'w_mallet', 34, 44, (ctx) => {
    // 木柄
    ctx.strokeStyle = '#8A6840';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(17, 40);
    ctx.lineTo(17, 18);
    ctx.stroke();
    // 锤头（松果蛋形 + 鳞片网纹）
    ctx.save();
    ctx.translate(17, 11);
    ctx.scale(1, 1.12);
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fillStyle = '#B88A58';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#86603C';
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(134,96,60,0.6)';
    for (let row = -1; row <= 1; row++) {
      ctx.beginPath();
      ctx.arc(0, row * 4 - 3.6, 6.6, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(13.5, 7, 2.4, 1.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 铃音冲击环（双层细环；ChimeWave setDisplaySize 扩张）
  makeTex(scene, 'w_chimering', 128, 128, (ctx) => {
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(144,204,192,0.85)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.stroke();
  });

  // 卷卷藤鞭体（横向长鞭：渐细藤条 + 对生小叶 + 末端卷须；origin 设在左端）
  makeTex(scene, 'w_vine', 150, 40, (ctx) => {
    ctx.lineCap = 'round';
    // 主藤（带轻微波浪，向右渐细）
    ctx.strokeStyle = '#74A858';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(3, 20);
    ctx.quadraticCurveTo(40, 14, 78, 20);
    ctx.quadraticCurveTo(108, 25, 128, 19);
    ctx.stroke();
    ctx.strokeStyle = '#8CC070';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(3, 19);
    ctx.quadraticCurveTo(40, 13, 78, 19);
    ctx.quadraticCurveTo(108, 24, 128, 18);
    ctx.stroke();
    // 对生小叶
    for (const [x, y, rot] of [[28, 14, -1.1], [52, 22, 1.2], [80, 15, -1.0], [104, 25, 1.15]] as const) {
      petalShape(ctx, x, y, 14, 4.5, rot, '#A8D088', '#74A858');
    }
    // 末端卷须
    ctx.strokeStyle = '#74A858';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 19);
    ctx.quadraticCurveTo(142, 14, 144, 21);
    ctx.arc(141, 21, 3.2, 0, Math.PI * 1.5);
    ctx.stroke();
  });

  // 莓果弹（弹弓抛射物：圆莓 + 籽点 + 小叶蒂）
  makeTex(scene, 'w_berry', 22, 22, (ctx) => {
    ctx.beginPath();
    ctx.arc(11, 12, 8, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xd87888);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cssOf(0xa85060);
    ctx.stroke();
    // 籽点
    ctx.fillStyle = 'rgba(255,240,224,0.85)';
    for (const [dx, dy] of [[-3.5, -1], [0.5, 2.5], [3.8, -1.5], [-1, -4], [1.5, -0.5]] as const) {
      ctx.beginPath();
      ctx.ellipse(11 + dx, 12 + dy, 0.9, 1.3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 叶蒂
    petalShape(ctx, 9, 3.5, 7, 2.6, -1.0, '#A8D088', '#74A858');
    petalShape(ctx, 13.5, 3.5, 7, 2.6, 1.0, '#A8D088', '#74A858');
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(8, 9, 2, 1.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 果酱减速区（进化「果酱风暴」地皮：黏滞莓酱椭圆）
  makeTex(scene, 'w_jam', 96, 52, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, w / 2 - 2);
    g.addColorStop(0, 'rgba(216,120,136,0.5)');
    g.addColorStop(0.85, 'rgba(216,120,136,0.34)');
    g.addColorStop(1, 'rgba(168,80,96,0.5)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 黏稠光斑 + 小籽
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 13, h / 2 - 5, 11, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,224,0.7)';
    for (const [dx, dy] of [[-22, 4], [8, 8], [22, -2], [-4, -7]] as const) {
      ctx.beginPath();
      ctx.ellipse(w / 2 + dx, h / 2 + dy, 1.2, 1.7, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 流萤珠（追踪萤光：柔光 + 亮核 + 拖尾小点）
  makeTex(scene, 'w_wisp', 22, 22, (ctx) => {
    softGlow(ctx, 11, 11, 10, 'rgba(154,220,192,0.85)');
    ctx.beginPath();
    ctx.arc(11, 11, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xc6ecd8);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = cssOf(0x76b896);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(10, 10, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 喇叭花哨塔（仰天小号花：花茎 + 喇叭口 + 底叶）
  makeTex(scene, 'w_bugle', 34, 46, (ctx) => {
    // 茎
    ctx.strokeStyle = '#74A858';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(17, 43);
    ctx.quadraticCurveTo(15, 32, 17, 24);
    ctx.stroke();
    // 底叶
    petalShape(ctx, 10, 36, 12, 4, -1.15, '#A8D088', '#74A858');
    petalShape(ctx, 24, 38, 12, 4, 1.1, '#A8D088', '#74A858');
    // 喇叭口（漏斗形，朝上张开）
    ctx.beginPath();
    ctx.moveTo(17, 25);
    ctx.quadraticCurveTo(5, 20, 4, 8);
    ctx.quadraticCurveTo(17, 15, 30, 8);
    ctx.quadraticCurveTo(29, 20, 17, 25);
    ctx.closePath();
    ctx.fillStyle = cssOf(0xa8b8ec);
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(0x7088c8);
    ctx.stroke();
    // 喇叭口缘（椭圆开口）
    ctx.beginPath();
    ctx.ellipse(17, 9.5, 13, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xc8d4f4);
    ctx.fill();
    ctx.stroke();
    // 花心
    ctx.beginPath();
    ctx.ellipse(17, 9.5, 5, 1.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F7DD8A';
    ctx.fill();
    // 花纹放射线
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(112,136,200,0.5)';
    for (const dx of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(17 + dx * 0.4, 23);
      ctx.lineTo(17 + dx, 12);
      ctx.stroke();
    }
  });

  // 喇叭花种子弹
  makeTex(scene, 'w_bugleseed', 14, 18, (ctx) => {
    softGlow(ctx, 7, 9, 6.5, 'rgba(168,184,236,0.7)');
    ctx.beginPath();
    ctx.ellipse(7, 9, 3.2, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xa8b8ec);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = cssOf(0x7088c8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(6, 7, 1.1, 1.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
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
