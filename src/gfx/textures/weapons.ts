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

  // 卷卷藤鞭体（横向长鞭：S 形波浪 + 由粗到细渐收 + 对生小叶 + 末端卷须；origin 设在左端）
  makeTex(scene, 'w_vine', 160, 44, (ctx) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 采样 S 形波浪路径，向右逐渐收平
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = 4 + t * 150;
      const y = 22 + Math.sin(t * Math.PI * 1.7) * 9 * (1 - t * 0.35);
      pts.push([x, y]);
    }
    // 藤身：逐段画，线宽从粗(7)渐收到细(1)，形成鞭子的锥度
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      ctx.strokeStyle = '#74A858';
      ctx.lineWidth = 7 * (1 - t) + 1;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    // 亮面高光（细一档、上移 1px）
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      ctx.strokeStyle = '#A8D888';
      ctx.lineWidth = 3.4 * (1 - t) + 0.6;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1] - 1.2);
      ctx.lineTo(pts[i][0], pts[i][1] - 1.2);
      ctx.stroke();
    }
    // 对生小叶（沿曲线取点，左右交替，向尖端渐小）
    for (const [idx, side] of [[5, -1], [11, 1], [16, -1], [20, 1]] as const) {
      const [lx, ly] = pts[idx];
      const sz = 14 * (1 - idx / 30);
      petalShape(ctx, lx, ly + side * 3, sz, sz * 0.32, side * 1.1, '#A8D088', '#74A858');
    }
    // 末端卷须
    const tip = pts[pts.length - 1];
    ctx.strokeStyle = '#74A858';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.arc(tip[0] + 1, tip[1] + 2, 3, Math.PI * 1.2, Math.PI * 3.1);
    ctx.stroke();
  });

  // 莓果弹（弹弓抛射物：圆莓 + 籽点 + 小叶蒂）
  makeTex(scene, 'w_berry', 26, 26, (ctx) => {
    ctx.beginPath();
    ctx.arc(13, 14, 9.4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xd87888);
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = cssOf(0xa85060);
    ctx.stroke();
    // 籽点
    ctx.fillStyle = 'rgba(255,240,224,0.85)';
    for (const [dx, dy] of [[-3.5, -1], [0.5, 2.5], [3.8, -1.5], [-1, -4], [1.5, -0.5]] as const) {
      ctx.beginPath();
      ctx.ellipse(13 + dx, 14 + dy, 1.05, 1.45, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 叶蒂
    petalShape(ctx, 10.5, 4, 8, 3, -1.0, '#A8D088', '#74A858');
    petalShape(ctx, 16, 4, 8, 3, 1.0, '#A8D088', '#74A858');
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(9.5, 10.5, 2.4, 1.5, -0.5, 0, Math.PI * 2);
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
  makeTex(scene, 'w_bugleseed', 18, 22, (ctx) => {
    softGlow(ctx, 9, 11, 8.5, 'rgba(168,184,236,0.78)');
    ctx.beginPath();
    ctx.ellipse(9, 11, 4.1, 6.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xa8b8ec);
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = cssOf(0x7088c8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(7.7, 8.4, 1.4, 2.1, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(9, 5);
    ctx.lineTo(9, 17);
    ctx.stroke();
  });

  // 蒲公英种子（绒伞朝上 + 细茎 + 小籽；带暖色描边，避免纸底上消失）
  makeTex(scene, 'w_seed', 24, 30, (ctx) => {
    softGlow(ctx, 12, 12, 13, 'rgba(216,232,188,0.5)');
    const cx = 12;
    // 放射绒毛
    ctx.strokeStyle = 'rgba(132,148,96,0.42)';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx, 12);
      ctx.lineTo(cx + Math.cos(a) * 9, 12 + Math.sin(a) * 9);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx, 12);
      ctx.lineTo(cx + Math.cos(a) * 9, 12 + Math.sin(a) * 9);
      ctx.stroke();
    }
    // 绒毛尖小点
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 9, 12 + Math.sin(a) * 9, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
    // 茎
    ctx.strokeStyle = cssOf(PAL.puffDeep);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx, 24);
    ctx.stroke();
    // 籽
    ctx.beginPath();
    ctx.ellipse(cx, 25.5, 2.4, 3.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#C8A868';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = cssOf(PAL.puffDeep);
    ctx.stroke();
  });

  // ===== M22 批次 D/E/F 弹体/特效/地皮 =====

  // 柳叶镖弹体（朝右，origin 中心；锋利柳叶 + 叶脉）
  makeTex(scene, 'w_dagger', 34, 14, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(32, 7);
    ctx.quadraticCurveTo(16, 1.7, 3, 7);
    ctx.quadraticCurveTo(16, 12.3, 32, 7);
    ctx.closePath();
    ctx.fillStyle = cssOf(0xa8d088);
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(0x74a858);
    ctx.stroke();
    // 主脉
    ctx.strokeStyle = cssOf(0x74a858);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(30, 7);
    ctx.lineTo(4, 7);
    ctx.stroke();
    // 侧脉
    ctx.lineWidth = 0.7;
    for (const x of [11, 18, 24]) {
      ctx.beginPath();
      ctx.moveTo(x, 7);
      ctx.lineTo(x + 3.5, 4.3);
      ctx.moveTo(x, 7);
      ctx.lineTo(x + 3.5, 9.7);
      ctx.stroke();
    }
  });

  // 旋翅果弹体（旋转用，origin 中心；鼓鼓种子 + 透翅 + 翅脉）
  makeTex(scene, 'w_axe', 34, 34, (ctx) => {
    ctx.save();
    ctx.translate(17, 17);
    // 翅
    ctx.beginPath();
    ctx.moveTo(-2, 2);
    ctx.quadraticCurveTo(10, -9, 16, -4);
    ctx.quadraticCurveTo(9, 3, -2, 2);
    ctx.closePath();
    ctx.fillStyle = cssOf(0xe8d8a8);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(0xb89858);
    ctx.stroke();
    // 翅脉
    ctx.strokeStyle = 'rgba(184,152,88,0.8)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 1.5);
      ctx.lineTo(4 + i * 4, -4 + i * 1.5);
      ctx.stroke();
    }
    // 种子
    ctx.beginPath();
    ctx.arc(-4, 3, 6, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xb88a58);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(0x86603c);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-6.5, 0.5, 2, 1.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 流光球（柔光 + 暖金核 + 高光）
  makeTex(scene, 'w_fireball', 36, 36, (ctx) => {
    softGlow(ctx, 18, 18, 17, 'rgba(248,206,120,0.6)');
    ctx.beginPath();
    ctx.arc(18, 18, 11, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xf8c860);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cssOf(0xd89838);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(18, 18, 6, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xfff0c0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(15, 15, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 朝露瓶弹体（小药瓶）
  makeTex(scene, 'w_flaskbottle', 20, 28, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(7.3, 5);
    ctx.lineTo(7.3, 10);
    ctx.quadraticCurveTo(2.5, 15, 3.8, 23);
    ctx.quadraticCurveTo(6.2, 26.2, 10, 26.2);
    ctx.quadraticCurveTo(13.8, 26.2, 16.2, 23);
    ctx.quadraticCurveTo(17.5, 15, 12.7, 10);
    ctx.lineTo(12.7, 5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(200,236,232,0.92)';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cssOf(0x5fa8a0);
    ctx.stroke();
    ctx.fillStyle = cssOf(0x88d0c8);
    ctx.beginPath();
    ctx.ellipse(10, 20, 5.5, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#A07048';
    ctx.fillRect(6, 2, 8, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.ellipse(7.7, 15, 1.4, 3, 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  // 朝露地汐（burn 地皮：青露椭圆，带涟漪）
  makeTex(scene, 'w_dewpool', 96, 52, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, w / 2 - 2);
    g.addColorStop(0, 'rgba(150,224,212,0.5)');
    g.addColorStop(0.85, 'rgba(120,208,200,0.34)');
    g.addColorStop(1, 'rgba(80,168,160,0.5)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.4;
    for (const [rx, ry] of [[20, 7], [11, 4]] as const) {
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // 灼光地皮（burn 地皮：晨光暖斑，流光球火痕 / 坠星星坑共用）
  makeTex(scene, 'w_emberpool', 80, 44, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 5, 0, 0, w / 2 - 2);
    g.addColorStop(0, 'rgba(255,232,160,0.55)');
    g.addColorStop(0.8, 'rgba(248,200,110,0.32)');
    g.addColorStop(1, 'rgba(224,160,72,0.46)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 候鸟弹体（俯冲小鸟，origin 中心，朝右；按速度旋转）
  makeTex(scene, 'w_bird', 30, 22, (ctx) => {
    // 身体
    ctx.beginPath();
    ctx.ellipse(13, 13, 8, 5.5, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xc4d2ee);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = cssOf(0x7e8eb8);
    ctx.stroke();
    // 翼
    ctx.fillStyle = cssOf(0x9aa8d4);
    ctx.beginPath();
    ctx.moveTo(12, 10);
    ctx.quadraticCurveTo(4, 2, 2, 9);
    ctx.quadraticCurveTo(8, 10, 12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // 喙 + 眼
    ctx.fillStyle = cssOf(0xf0c060);
    ctx.beginPath();
    ctx.moveTo(20, 12);
    ctx.lineTo(27, 11);
    ctx.lineTo(20, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.beginPath();
    ctx.arc(18, 11, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 跳跳豆弹珠（发光玻璃珠）
  makeTex(scene, 'w_bead', 26, 26, (ctx) => {
    softGlow(ctx, 13, 13, 12, 'rgba(232,124,192,0.78)');
    ctx.beginPath();
    ctx.arc(13, 13, 8.4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xf0a0d8);
    ctx.fill();
    ctx.lineWidth = 1.9;
    ctx.strokeStyle = cssOf(0xc05898);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(10, 10, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(13, 13, 5.2, 0.2, Math.PI * 1.25);
    ctx.stroke();
  });

  // 晨星杖星弹（四芒星 + 外晕，和叶镖/种子弹拉开）
  makeTex(scene, 'w_wandbolt', 24, 24, (ctx) => {
    softGlow(ctx, 12, 12, 11, 'rgba(255,224,160,0.9)');
    star(ctx, 12, 12, 4, 10, 3.4, cssOf(0xffe8a8), cssOf(0xd0a040));
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.lineTo(20, 12);
    ctx.moveTo(12, 4);
    ctx.lineTo(12, 20);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(12, 12, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 花粉粒子（柔和发光花粉绒，origin 中心；龙息→花粉拂 复用此键）
  makeTex(scene, 'w_flame', 20, 16, (ctx) => {
    softGlow(ctx, 10, 8, 9, 'rgba(248,224,140,0.7)');
    ctx.beginPath();
    ctx.arc(10, 8, 4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xf8e0a0);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(208,168,80,0.6)';
    ctx.stroke();
    // 绒刺小点
    ctx.fillStyle = 'rgba(255,248,210,0.9)';
    for (const [dx, dy] of [[-3, -2], [3, -1], [1, 3], [-2, 2]] as const) {
      ctx.beginPath();
      ctx.arc(10 + dx, 8 + dy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(8.5, 6.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 泡泡弹本体（晶莹大泡 + 薄膜 + 高光，无引信）
  makeTex(scene, 'w_bomb', 28, 28, (ctx) => {
    ctx.beginPath();
    ctx.arc(14, 14, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168,216,236,0.4)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(0x6aa8c8);
    ctx.stroke();
    // 薄膜内圈
    ctx.beginPath();
    ctx.arc(14, 14, 8, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.stroke();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(9.5, 9.5, 3, 2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(19, 18, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 月华引漩涡（向心螺旋臂，逐帧旋转）
  makeTex(scene, 'w_void', 96, 96, (ctx) => {
    softGlow(ctx, 48, 48, 46, 'rgba(120,88,176,0.4)');
    ctx.strokeStyle = 'rgba(170,140,220,0.85)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a0 = (i / 4) * Math.PI * 2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.05) {
        const a = a0 + t * Math.PI * 1.8;
        const r = 42 * (1 - t * 0.92);
        const x = 48 + Math.cos(a) * r;
        const y = 48 + Math.sin(a) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(48, 48, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60,44,96,0.9)';
    ctx.fill();
  });

  // 光矛长刃（朝右，origin 在柄端 [0.12,0.5]；加厚发光晨光长矛）
  makeTex(scene, 'w_sword', 84, 24, (ctx) => {
    softGlow(ctx, 45, 12, 18, 'rgba(248,238,192,0.55)');
    // 矛身（长三角光刃，向右收尖）
    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(78, 12);
    ctx.lineTo(10, 19);
    ctx.closePath();
    ctx.fillStyle = cssOf(0xfaf0c8);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(0xd8c068);
    ctx.stroke();
    // 中脊亮线
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(72, 12);
    ctx.stroke();
    // 矛柄光握
    ctx.strokeStyle = cssOf(0xe0c878);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, 12);
    ctx.lineTo(10, 12);
    ctx.stroke();
  });

  // 群蜂弹体（条纹小蜂 + 翅）
  makeTex(scene, 'w_bee', 20, 18, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    for (const dy of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(8.5, 9 + dy * 3.8, 4.4, 2.6, dy * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(11, 9, 6.5, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xf0c850);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = cssOf(0xb08828);
    ctx.stroke();
    ctx.strokeStyle = cssOf(0x6a5a48);
    ctx.lineWidth = 1.6;
    for (const dx of [-1.8, 1.8]) {
      ctx.beginPath();
      ctx.moveTo(11 + dx, 4.6);
      ctx.lineTo(11 + dx, 13.4);
      ctx.stroke();
    }
    ctx.fillStyle = cssOf(0x5a5248);
    ctx.beginPath();
    ctx.arc(16.5, 8.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });

  // 坠星弹体（发光流星，origin 中心；星芒 + 暖金核）
  makeTex(scene, 'w_meteor', 30, 30, (ctx) => {
    softGlow(ctx, 15, 15, 14, 'rgba(248,232,170,0.6)');
    star(ctx, 15, 15, 5, 11, 4.6, cssOf(0xfaf0c0), cssOf(0xd0b860));
    ctx.beginPath();
    ctx.arc(15, 15, 4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xfff6e0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(13.5, 13.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 凛霜冰锥（朝右尖锥，origin 中心；外晕和粗描边提高移动端读感）
  makeTex(scene, 'w_icicle', 32, 20, (ctx) => {
    softGlow(ctx, 14, 10, 12, 'rgba(168,224,240,0.72)');
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(7, 4);
    ctx.lineTo(2, 10);
    ctx.lineTo(7, 16);
    ctx.closePath();
    ctx.fillStyle = cssOf(0xd2f0fa);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(0x7ec4dc);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(25, 10);
    ctx.lineTo(7, 10);
    ctx.stroke();
  });

  // 霜地（slow 地皮：冰晶椭圆）
  makeTex(scene, 'w_frost', 96, 52, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, w / 2 - 2);
    g.addColorStop(0, 'rgba(204,240,250,0.55)');
    g.addColorStop(0.85, 'rgba(168,224,240,0.36)');
    g.addColorStop(1, 'rgba(126,196,220,0.5)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 冰晶纹
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (const [cx, cy] of [[w / 2 - 16, h / 2 - 4], [w / 2 + 14, h / 2 + 5]] as const) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(a) * 6, cy - Math.sin(a) * 4);
        ctx.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 4);
        ctx.stroke();
      }
    }
  });

  // 卷叶风旋涡（俯视螺旋臂 + 卷叶，逐帧旋转）
  makeTex(scene, 'w_tornado', 80, 80, (ctx) => {
    softGlow(ctx, 40, 40, 38, 'rgba(168,196,160,0.35)');
    ctx.strokeStyle = 'rgba(136,168,120,0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2;
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.05) {
        const a = a0 + t * Math.PI * 2.2;
        const r = 34 * (1 - t * 0.85);
        const x = 40 + Math.cos(a) * r;
        const y = 40 + Math.sin(a) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    petalShape(ctx, 62, 26, 12, 4, 0.6, 'rgba(168,208,136,0.95)', '#74A858');
    petalShape(ctx, 20, 56, 11, 3.6, -0.7, 'rgba(168,208,136,0.95)', '#74A858');
  });
}
