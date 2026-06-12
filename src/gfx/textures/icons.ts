// 武器/被动/商店图标（40×40 圆形令牌：白底圆 + 描边，铺满槽位即完整令牌）
import { PAL, RAINBOW, cssOf } from '../palette';
import { Ctx, makeTex, petalShape, softGlow, star } from './core';

export function createIcons(scene: Phaser.Scene): void {
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

  // 蒲公英：绒球（放射绒毛 + 飞散小绒）
  makeTex(scene, 'icon_puff', 40, 40, (ctx) => {
    bg(ctx);
    const bx = 18;
    const by = 20;
    ctx.strokeStyle = cssOf(PAL.puffDeep);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a) * 8.5, by + Math.sin(a) * 8.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(bx + Math.cos(a) * 8.5, by + Math.sin(a) * 8.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#F5EEDC';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 飞散的两粒小绒
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(31, 10, 1.6, 0, Math.PI * 2);
    ctx.arc(33, 16, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 暖灯笼：小灯笼 + 光晕
  makeTex(scene, 'icon_lantern', 40, 40, (ctx) => {
    bg(ctx);
    ctx.strokeStyle = '#A07048';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(20, 10, 3, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(20, 21, 7.5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD888';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#C08838';
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(192,136,56,0.6)';
    for (const dx of [-3.2, 3.2]) {
      ctx.beginPath();
      ctx.moveTo(20 + dx, 13);
      ctx.quadraticCurveTo(20 + dx * 1.7, 21, 20 + dx, 29);
      ctx.stroke();
    }
    ctx.fillStyle = '#A07048';
    ctx.fillRect(16.4, 11, 7.2, 2.6);
    ctx.fillRect(17, 29.4, 6, 2.2);
    ctx.fillStyle = 'rgba(255,250,220,0.95)';
    ctx.beginPath();
    ctx.arc(20, 21, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // 星星环：中央星 + 轨道圈
  makeTex(scene, 'icon_star', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.ellipse(20, 21, 13.5, 6.5, -0.35, 0, Math.PI * 2);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(138,144,200,0.7)';
    ctx.stroke();
    star(ctx, 20, 19, 5, 9, 4, '#FFF6CE', '#C0A858');
    ctx.fillStyle = '#8A90C8';
    ctx.beginPath();
    ctx.arc(31.5, 17, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 松果锤：斜握小锤
  makeTex(scene, 'icon_mallet', 40, 40, (ctx) => {
    bg(ctx);
    ctx.save();
    ctx.translate(20, 20);
    ctx.rotate(0.7);
    ctx.strokeStyle = '#8A6840';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.lineTo(0, -4);
    ctx.stroke();
    ctx.save();
    ctx.scale(1, 1.12);
    ctx.beginPath();
    ctx.arc(0, -8, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#B88A58';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#86603C';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(134,96,60,0.6)';
    for (let row = -1; row <= 1; row++) {
      ctx.beginPath();
      ctx.arc(0, -8 + row * 3.4 - 2.4, 5.2, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  });

  // 风铃环：小钟铃 + 音波
  makeTex(scene, 'icon_chime', 40, 40, (ctx) => {
    bg(ctx);
    // 铃身（钟形）
    ctx.beginPath();
    ctx.moveTo(13.5, 24);
    ctx.quadraticCurveTo(13.5, 12, 20, 11);
    ctx.quadraticCurveTo(26.5, 12, 26.5, 24);
    ctx.quadraticCurveTo(28, 26, 27.5, 26.5);
    ctx.lineTo(12.5, 26.5);
    ctx.quadraticCurveTo(12, 26, 13.5, 24);
    ctx.closePath();
    ctx.fillStyle = '#A8D8CC';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#68A89C';
    ctx.stroke();
    // 顶钮 + 铃舌
    ctx.fillStyle = '#68A89C';
    ctx.beginPath();
    ctx.arc(20, 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD878';
    ctx.beginPath();
    ctx.arc(20, 29, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#C09030';
    ctx.stroke();
    // 音波
    ctx.strokeStyle = 'rgba(104,168,156,0.7)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(20 + s * (12 + i * 3.4), 19, 2.6 + i * 1.6, s > 0 ? -0.7 : Math.PI - 0.7, s > 0 ? 0.7 : Math.PI + 0.7);
        ctx.stroke();
      }
    }
  });

  // 卷卷藤：S 形藤条 + 对生叶 + 卷须
  makeTex(scene, 'icon_vine', 40, 40, (ctx) => {
    bg(ctx);
    ctx.strokeStyle = '#74A858';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(11, 31);
    ctx.quadraticCurveTo(24, 26, 20, 18);
    ctx.quadraticCurveTo(16, 11, 27, 9);
    ctx.stroke();
    petalShape(ctx, 13, 22, 10, 3.6, -1.2, '#A8D088', '#74A858');
    petalShape(ctx, 26, 20, 10, 3.6, 1.1, '#A8D088', '#74A858');
    // 末端卷须
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(27, 9);
    ctx.arc(30.5, 9.5, 3, Math.PI, Math.PI * 2.6);
    ctx.stroke();
  });

  // 莓果弹弓：Y 形弓架 + 皮筋 + 莓果
  makeTex(scene, 'icon_sling', 40, 40, (ctx) => {
    bg(ctx);
    ctx.strokeStyle = '#8A6840';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 32);
    ctx.lineTo(20, 22);
    ctx.moveTo(20, 22);
    ctx.lineTo(12, 12);
    ctx.moveTo(20, 22);
    ctx.lineTo(28, 12);
    ctx.stroke();
    // 皮筋（拉满）
    ctx.strokeStyle = '#C09030';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(20, 17.5);
    ctx.lineTo(28, 12);
    ctx.stroke();
    // 莓果
    ctx.beginPath();
    ctx.arc(20, 16.5, 4.4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xd87888);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = cssOf(0xa85060);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,224,0.85)';
    for (const [dx, dy] of [[-1.6, -0.5], [1.4, 1], [0.2, -2]] as const) {
      ctx.beginPath();
      ctx.arc(20 + dx, 16.5 + dy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 流萤珠：发光萤珠 + 弧形飞迹
  makeTex(scene, 'icon_wisp', 40, 40, (ctx) => {
    bg(ctx);
    // 飞迹（渐淡小点）
    ctx.fillStyle = 'rgba(118,184,150,0.7)';
    for (const [x, y, r] of [[10, 27, 1.4], [13, 22.5, 1.8], [17.5, 19, 2.2]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(23, 15, 1, 24, 16, 9);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.55, '#C6ECD8');
    g.addColorStop(1, '#8CCCAA');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(24, 16, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cssOf(0x76b896);
    ctx.stroke();
    star(ctx, 30, 9, 4, 3.4, 1.4, '#FFF6CE', '#C0A858');
  });

  // 喇叭花号手：侧吹小号花
  makeTex(scene, 'icon_bugle', 40, 40, (ctx) => {
    bg(ctx);
    // 茎（从右下伸入）
    ctx.strokeStyle = '#74A858';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(30, 31);
    ctx.quadraticCurveTo(24, 26, 20, 21);
    ctx.stroke();
    petalShape(ctx, 28, 26, 9, 3.2, 0.9, '#A8D088', '#74A858');
    // 喇叭口（朝左上张开）
    ctx.save();
    ctx.translate(17, 17);
    ctx.rotate(-0.75);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(-9, 4, -10, -7);
    ctx.quadraticCurveTo(0, -2, 10, -7);
    ctx.quadraticCurveTo(9, 4, 0, 8);
    ctx.closePath();
    ctx.fillStyle = cssOf(0xa8b8ec);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(0x7088c8);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -6, 10, 3.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xc8d4f4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -6, 3.6, 1.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F7DD8A';
    ctx.fill();
    ctx.restore();
    // 音波
    ctx.strokeStyle = 'rgba(112,136,200,0.7)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(8, 8, 4 + i * 3.4, Math.PI * 0.85, Math.PI * 1.55);
      ctx.stroke();
    }
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

  // 瓢虫结：圆背 + 中线 + 黑点（幸运 → 暴击）
  makeTex(scene, 'icon_ladybug', 40, 40, (ctx) => {
    bg(ctx);
    // 头
    ctx.beginPath();
    ctx.arc(20, 12, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.fill();
    // 背壳
    ctx.beginPath();
    ctx.ellipse(20, 21, 10, 9.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.ladybug);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(PAL.ladybugDeep);
    ctx.stroke();
    // 中线
    ctx.beginPath();
    ctx.moveTo(20, 12);
    ctx.lineTo(20, 30.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 斑点
    ctx.fillStyle = cssOf(PAL.ink);
    for (const [x, y, r] of [[15, 18, 1.8], [25, 18, 1.8], [14.5, 25, 1.5], [25.5, 25, 1.5]] as Array<[number, number, number]>) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 背壳高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(16, 15.5, 2.4, 1.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 蜜糖罐：琥珀罐 + 滴落蜜珠
  makeTex(scene, 'icon_honey', 40, 40, (ctx) => {
    bg(ctx);
    // 罐身
    ctx.beginPath();
    ctx.moveTo(13, 15);
    ctx.quadraticCurveTo(10, 22, 13.5, 28);
    ctx.quadraticCurveTo(16, 30.5, 24, 30.5);
    ctx.quadraticCurveTo(30, 28.5, 27, 21);
    ctx.quadraticCurveTo(26, 17, 27, 15);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.honey);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(PAL.honeyDeep);
    ctx.stroke();
    // 罐口
    ctx.fillStyle = '#E8D8B0';
    ctx.beginPath();
    ctx.ellipse(20, 13.5, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 流蜜
    ctx.beginPath();
    ctx.moveTo(16, 15.5);
    ctx.quadraticCurveTo(15, 19, 17.5, 20);
    ctx.quadraticCurveTo(20, 20.5, 19.5, 17);
    ctx.fillStyle = '#FFD878';
    ctx.fill();
    // 高光 + 蜜珠
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(16, 23, 1.6, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD878';
    ctx.beginPath();
    ctx.arc(30, 24, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 橡果壳：饱满橡果（帽纹 + 果身高光）
  makeTex(scene, 'icon_acorn', 40, 40, (ctx) => {
    bg(ctx);
    // 果身
    ctx.beginPath();
    ctx.moveTo(12.5, 18);
    ctx.quadraticCurveTo(12.5, 29, 20, 31.5);
    ctx.quadraticCurveTo(27.5, 29, 27.5, 18);
    ctx.closePath();
    ctx.fillStyle = '#D8A868';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#A07048';
    ctx.stroke();
    // 帽
    ctx.beginPath();
    ctx.moveTo(11, 18.5);
    ctx.quadraticCurveTo(11.5, 12, 20, 11);
    ctx.quadraticCurveTo(28.5, 12, 29, 18.5);
    ctx.quadraticCurveTo(20, 21, 11, 18.5);
    ctx.closePath();
    ctx.fillStyle = '#A8845C';
    ctx.fill();
    ctx.strokeStyle = '#7A5C38';
    ctx.stroke();
    // 帽纹 + 小柄
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(122,92,56,0.55)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(20 + i * 3 - 1.5, 12);
      ctx.lineTo(20 + i * 3 + 1, 19);
      ctx.stroke();
    }
    ctx.strokeStyle = '#7A5C38';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 11);
    ctx.quadraticCurveTo(21.5, 8.5, 24, 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(16.5, 23, 1.8, 3.2, 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  // 星砂瓶：软木塞小瓶 + 瓶中星砂
  makeTex(scene, 'icon_stardust', 40, 40, (ctx) => {
    bg(ctx);
    // 瓶身
    ctx.beginPath();
    ctx.moveTo(15, 14);
    ctx.lineTo(15, 17);
    ctx.quadraticCurveTo(11.5, 20, 11.5, 25);
    ctx.quadraticCurveTo(11.5, 31.5, 20, 31.5);
    ctx.quadraticCurveTo(28.5, 31.5, 28.5, 25);
    ctx.quadraticCurveTo(28.5, 20, 25, 17);
    ctx.lineTo(25, 14);
    ctx.closePath();
    ctx.fillStyle = 'rgba(200,212,240,0.55)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8A90C8';
    ctx.stroke();
    // 瓶中星砂
    ctx.fillStyle = 'rgba(168,180,232,0.5)';
    ctx.beginPath();
    ctx.moveTo(12.5, 25);
    ctx.quadraticCurveTo(20, 22, 27.5, 25);
    ctx.quadraticCurveTo(27.5, 30.5, 20, 30.5);
    ctx.quadraticCurveTo(12.5, 30.5, 12.5, 25);
    ctx.fill();
    star(ctx, 18, 26, 4, 3.4, 1.4, '#FFF6CE');
    star(ctx, 23.5, 28, 4, 2.4, 1, '#FFF6CE');
    // 软木塞
    ctx.fillStyle = '#C8A878';
    ctx.fillRect(15.5, 9.5, 9, 5);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#96764E';
    ctx.strokeRect(15.5, 9.5, 9, 5);
    // 逸出的小星
    star(ctx, 29.5, 11, 4, 3, 1.2, '#FFF6CE', '#C0A858');
  });

  // 新芽铃：嫩芽双叶
  makeTex(scene, 'icon_sprout', 40, 40, (ctx) => {
    bg(ctx);
    // 土丘
    ctx.beginPath();
    ctx.arc(20, 33, 8, Math.PI, 0);
    ctx.fillStyle = '#C8A878';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#96764E';
    ctx.stroke();
    // 茎
    ctx.strokeStyle = cssOf(PAL.grassDark);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 30);
    ctx.quadraticCurveTo(20.5, 22, 20, 17);
    ctx.stroke();
    // 双叶
    petalShape(ctx, 14.5, 14.5, 12, 4.6, -0.9, cssOf(PAL.grass), cssOf(PAL.grassDark));
    petalShape(ctx, 25.5, 13, 13, 5, 0.8, cssOf(PAL.grass), cssOf(PAL.grassDark));
    // 叶尖小露珠
    ctx.fillStyle = 'rgba(168,224,248,0.9)';
    ctx.beginPath();
    ctx.arc(28.5, 8.5, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 小钱袋：束口布袋 + 金币
  makeTex(scene, 'icon_pouch', 40, 40, (ctx) => {
    bg(ctx);
    // 袋身
    ctx.beginPath();
    ctx.moveTo(17, 14);
    ctx.quadraticCurveTo(10.5, 19, 11, 26);
    ctx.quadraticCurveTo(11.5, 31.5, 20, 31.5);
    ctx.quadraticCurveTo(28.5, 31.5, 29, 26);
    ctx.quadraticCurveTo(29.5, 19, 23, 14);
    ctx.closePath();
    ctx.fillStyle = '#D8B888';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#A08050';
    ctx.stroke();
    // 束口
    ctx.beginPath();
    ctx.ellipse(20, 13, 4.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#C0A070';
    ctx.fill();
    ctx.stroke();
    // 束绳
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(15.5, 13.5);
    ctx.quadraticCurveTo(13, 15.5, 13.5, 17.5);
    ctx.stroke();
    // 袋上金币纹
    ctx.beginPath();
    ctx.arc(20, 24, 4.4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD870';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#D8A840';
    ctx.stroke();
    star(ctx, 20, 24, 4, 2.6, 1.1, '#FFF2C0');
  });

  // 飘飘羽：弯弧羽毛 + 羽絮
  makeTex(scene, 'icon_feather', 40, 40, (ctx) => {
    bg(ctx);
    ctx.save();
    ctx.translate(20, 20);
    ctx.rotate(0.6);
    // 羽轴
    ctx.strokeStyle = cssOf(0x88a8c0);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.quadraticCurveTo(1.5, 2, 0, -12);
    ctx.stroke();
    // 羽片（两侧弧带）
    ctx.fillStyle = 'rgba(200,220,232,0.95)';
    ctx.strokeStyle = cssOf(0x88a8c0);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(8, -6, 6.5, 4);
    ctx.quadraticCurveTo(3, 8, 0.5, 9);
    ctx.quadraticCurveTo(-5, 8, -6.5, 0);
    ctx.quadraticCurveTo(-6, -8, 0, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 羽枝
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(136,168,192,0.55)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0.4, i * 4 - 3);
      ctx.lineTo(i % 2 === 0 ? 5 : -5, i * 4 - 5.5);
      ctx.stroke();
    }
    ctx.restore();
    // 飘絮小点
    ctx.fillStyle = 'rgba(136,168,192,0.7)';
    ctx.beginPath();
    ctx.arc(30, 12, 1.4, 0, Math.PI * 2);
    ctx.arc(28, 18, 1, 0, Math.PI * 2);
    ctx.fill();
  });

  // 莓果蜜饯：罐装糖渍莓果
  makeTex(scene, 'icon_snack', 40, 40, (ctx) => {
    bg(ctx);
    // 罐身
    ctx.beginPath();
    ctx.moveTo(13, 15);
    ctx.quadraticCurveTo(11, 24, 13.5, 29);
    ctx.quadraticCurveTo(16, 31.5, 24, 31.5);
    ctx.quadraticCurveTo(29, 29.5, 27, 22);
    ctx.quadraticCurveTo(26.5, 17.5, 27, 15);
    ctx.closePath();
    ctx.fillStyle = 'rgba(232,144,152,0.55)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(0xb86878);
    ctx.stroke();
    // 罐口布盖
    ctx.fillStyle = '#F0D8A8';
    ctx.beginPath();
    ctx.ellipse(20, 13.5, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#C09858';
    ctx.stroke();
    // 罐内莓果
    ctx.fillStyle = cssOf(0xd87888);
    for (const [x, y, r] of [[16.5, 24, 3], [22.5, 26, 3.2], [21, 20, 2.6]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(15.5, 22.5, 1.3, 2.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // 旁边一颗带叶莓果
    ctx.beginPath();
    ctx.arc(30.5, 25, 3, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(0xd87888);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = cssOf(0xa85060);
    ctx.stroke();
    petalShape(ctx, 30, 20.5, 5, 2, 0.5, '#A8D088', '#74A858');
  });

  // 草叶哨：草茎口哨 + 音符波
  makeTex(scene, 'icon_whistle', 40, 40, (ctx) => {
    bg(ctx);
    // 双草叶（一长一短交叉）
    petalShape(ctx, 17, 21, 24, 4.6, 0.45, cssOf(PAL.grass), cssOf(PAL.grassDark));
    petalShape(ctx, 21, 22, 19, 3.8, 0.95, '#B8D898', cssOf(PAL.grassDark));
    // 叶脉
    ctx.strokeStyle = 'rgba(168,205,140,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(12, 30);
    ctx.lineTo(22, 12);
    ctx.stroke();
    // 音波弧
    ctx.strokeStyle = 'rgba(122,160,102,0.8)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(27, 11, 3.4 + i * 3.2, -Math.PI * 0.45, Math.PI * 0.35);
      ctx.stroke();
    }
  });

  // 小花架：木格架 + 攀花
  makeTex(scene, 'icon_trellis', 40, 40, (ctx) => {
    bg(ctx);
    // 交叉木格
    ctx.strokeStyle = '#A8845C';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    for (const x of [14, 21, 28]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, 31);
      ctx.lineTo(x + 4, 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 4, 31);
      ctx.lineTo(x - 4, 9);
      ctx.stroke();
    }
    // 攀藤
    ctx.strokeStyle = cssOf(PAL.grassDark);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(12, 30);
    ctx.quadraticCurveTo(22, 24, 19, 16);
    ctx.quadraticCurveTo(17.5, 11, 24, 9);
    ctx.stroke();
    // 小花两朵
    for (const [fx2, fy2, k] of [[15, 24, 1], [24, 12, 0.85]] as const) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(fx2 + Math.cos(a) * 2.8 * k, fy2 + Math.sin(a) * 2.8 * k, 2 * k, 1.5 * k, a, 0, Math.PI * 2);
        ctx.fillStyle = cssOf(0xd0a8e8);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(fx2, fy2, 1.4 * k, 0, Math.PI * 2);
      ctx.fillStyle = '#F7DD8A';
      ctx.fill();
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

  // ---------- 商店永久强化新增图标 ----------

  // 经验成长：发光经验珠 + 小星
  makeTex(scene, 'icon_growth', 40, 40, (ctx) => {
    bg(ctx);
    const g = ctx.createRadialGradient(19, 19, 1, 20, 20, 9);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.6, '#A8E0F8');
    g.addColorStop(1, '#78B8E0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(20, 21, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5898D0';
    ctx.stroke();
    star(ctx, 28, 12, 4, 4.5, 1.8, '#FFF6D8', '#E2B452');
  });

  // 金币获取：双层金币堆
  makeTex(scene, 'icon_greed', 40, 40, (ctx) => {
    bg(ctx);
    const coinAt = (cx: number, cy: number): void => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 9, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD870';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#D8A840';
      ctx.stroke();
    };
    coinAt(20, 25);
    coinAt(20, 18);
    star(ctx, 20, 17, 4, 3.4, 1.4, '#FFF2C0');
  });

  // 护甲：盾牌
  makeTex(scene, 'icon_armor', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.moveTo(20, 9);
    ctx.quadraticCurveTo(27, 12, 30, 12);
    ctx.quadraticCurveTo(30, 25, 20, 31);
    ctx.quadraticCurveTo(10, 25, 10, 12);
    ctx.quadraticCurveTo(13, 12, 20, 9);
    ctx.closePath();
    ctx.fillStyle = '#B8C8E0';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7088A8';
    ctx.stroke();
    star(ctx, 20, 19, 4, 5, 2, '#FFFFFF');
  });

  // 持续回复：心 + 新芽
  makeTex(scene, 'icon_regen', 40, 40, (ctx) => {
    bg(ctx);
    ctx.save();
    ctx.translate(11.5, 14);
    ctx.scale(0.78, 0.78);
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
    // 心上冒出的小芽
    ctx.strokeStyle = cssOf(PAL.grassDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 14);
    ctx.quadraticCurveTo(21, 9, 19.5, 7);
    ctx.stroke();
    petalShape(ctx, 16.5, 7.5, 7, 3, -0.9, cssOf(PAL.grass), cssOf(PAL.grassDark));
    petalShape(ctx, 22.5, 6, 7, 3, 0.7, cssOf(PAL.grass), cssOf(PAL.grassDark));
  });

  // 幸运：四叶草
  makeTex(scene, 'icon_luck', 40, 40, (ctx) => {
    bg(ctx);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.ellipse(19 + Math.cos(a) * 5.5, 18 + Math.sin(a) * 5.5, 5.2, 4.2, a, 0, Math.PI * 2);
      ctx.fillStyle = cssOf(PAL.grass);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = cssOf(PAL.grassDark);
      ctx.stroke();
    }
    // 茎
    ctx.strokeStyle = cssOf(PAL.grassDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(21, 23);
    ctx.quadraticCurveTo(25, 28, 24, 32);
    ctx.stroke();
  });

  // ---------- 规则卡 Arcana（M9）：10 张 ----------

  // 花开满野：满圈花瓣
  makeTex(scene, 'icon_arc_petaltide', 40, 40, (ctx) => {
    bg(ctx);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      petalShape(ctx, 20 + Math.cos(a) * 8.5, 20 + Math.sin(a) * 8.5, 11, 3.8, a + Math.PI / 2, cssOf(PAL.petal), cssOf(PAL.petalDeep));
    }
    ctx.beginPath();
    ctx.arc(20, 20, 4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.xp);
    ctx.fill();
  });

  // 顺风童谣：三道带回卷的风线
  makeTex(scene, 'icon_arc_tailwind', 40, 40, (ctx) => {
    bg(ctx);
    ctx.strokeStyle = cssOf(PAL.boomDeep);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    [13, 20, 27].forEach((yy, i) => {
      ctx.beginPath();
      ctx.moveTo(9, yy);
      ctx.quadraticCurveTo(20, yy - 3, 27, yy);
      if (i === 1) ctx.arc(29, yy - 2.5, 2.5, Math.PI / 2, Math.PI * 2);
      ctx.stroke();
    });
  });

  // 小小尖刺：带刺的蔷薇茎
  makeTex(scene, 'icon_arc_thornlace', 40, 40, (ctx) => {
    bg(ctx);
    ctx.strokeStyle = cssOf(PAL.grassDark);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13, 31);
    ctx.quadraticCurveTo(18, 22, 24, 13);
    ctx.stroke();
    // 刺
    ctx.fillStyle = cssOf(PAL.grassDark);
    for (const [tx, ty, dir] of [[16, 26, -1], [20, 19.5, 1], [17.5, 22.5, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + dir * 4.5, ty - 1);
      ctx.lineTo(tx + 1, ty - 3.5);
      ctx.closePath();
      ctx.fill();
    }
    // 顶端花苞
    ctx.beginPath();
    ctx.arc(25.5, 11, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.heart);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D86870';
    ctx.stroke();
  });

  // 金铃叮当：小金铃
  makeTex(scene, 'icon_arc_goldbell', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.moveTo(13, 24);
    ctx.quadraticCurveTo(13, 11, 20, 11);
    ctx.quadraticCurveTo(27, 11, 27, 24);
    ctx.lineTo(29, 27);
    ctx.lineTo(11, 27);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.xp);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssOf(PAL.honeyDeep);
    ctx.stroke();
    // 铃舌 + 提环
    ctx.beginPath();
    ctx.arc(20, 30, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.honeyDeep);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, 10, 2.4, Math.PI, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 星屑爆响：迸发的星星
  makeTex(scene, 'icon_arc_starpop', 40, 40, (ctx) => {
    bg(ctx);
    star(ctx, 20, 20, 5, 10, 4.5, cssOf(PAL.spark), cssOf(PAL.sparkDeep));
    ctx.fillStyle = cssOf(PAL.sparkDeep);
    for (const [dx, dy] of [[-11, -8], [12, -6], [-9, 10], [11, 10]] as const) {
      ctx.beginPath();
      ctx.arc(20 + dx, 20 + dy, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 月夜勇气：弯月
  makeTex(scene, 'icon_arc_moonheart', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.arc(19, 21, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#9AA8D8';
    ctx.fill();
    // 月牙缺口（以底色咬出）
    ctx.beginPath();
    ctx.arc(25, 16, 9.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
    star(ctx, 28, 12, 4, 3.5, 1.4, cssOf(PAL.spark));
  });

  // 甘露清泉：水滴与涟漪
  makeTex(scene, 'icon_arc_dewspring', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.moveTo(20, 7);
    ctx.quadraticCurveTo(27, 17, 20, 22);
    ctx.quadraticCurveTo(13, 17, 20, 7);
    ctx.fillStyle = cssOf(PAL.rain);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssOf(PAL.rainDeep);
    ctx.stroke();
    ctx.strokeStyle = cssOf(PAL.rainDeep);
    ctx.lineWidth = 2;
    for (const r of [5, 9]) {
      ctx.beginPath();
      ctx.ellipse(20, 28, r, r * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // 萤火向导：荧光与点点轨迹
  makeTex(scene, 'icon_arc_fireflyway', 40, 40, (ctx) => {
    bg(ctx);
    softGlow(ctx, 23, 15, 10, 'rgba(255,240,160,0.95)');
    ctx.beginPath();
    ctx.arc(23, 15, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = cssOf(PAL.spark);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = cssOf(PAL.sparkDeep);
    ctx.stroke();
    // 点点飞行轨迹
    ctx.fillStyle = cssOf(PAL.sparkDeep);
    for (const [px, py, pr] of [[11, 28, 1.8], [15, 24.5, 1.5], [18.5, 21, 1.2]] as const) {
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 藏宝罗盘：罗盘与指针
  makeTex(scene, 'icon_arc_compass', 40, 40, (ctx) => {
    bg(ctx);
    ctx.beginPath();
    ctx.arc(20, 20, 11.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF6D8';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = cssOf(PAL.honeyDeep);
    ctx.stroke();
    // 四向刻度
    ctx.strokeStyle = cssOf(PAL.honeyDeep);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(20 + Math.cos(a) * 9, 20 + Math.sin(a) * 9);
      ctx.lineTo(20 + Math.cos(a) * 11, 20 + Math.sin(a) * 11);
      ctx.stroke();
    }
    // 指针（北红南灰）
    ctx.beginPath();
    ctx.moveTo(20, 12.5);
    ctx.lineTo(23, 20);
    ctx.lineTo(17, 20);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.ladybug);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, 27.5);
    ctx.lineTo(23, 20);
    ctx.lineTo(17, 20);
    ctx.closePath();
    ctx.fillStyle = cssOf(PAL.ink);
    ctx.fill();
  });

  // 专一之路：一条蜿蜒虚线小路通向星星
  makeTex(scene, 'icon_arc_onepath', 40, 40, (ctx) => {
    bg(ctx);
    ctx.save();
    ctx.setLineDash([3.5, 3]);
    ctx.strokeStyle = cssOf(PAL.mineDeep);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(11, 31);
    ctx.quadraticCurveTo(24, 27, 17, 19);
    ctx.quadraticCurveTo(11, 12, 23, 11);
    ctx.stroke();
    ctx.restore();
    star(ctx, 27.5, 11, 5, 5, 2.2, cssOf(PAL.spark), cssOf(PAL.sparkDeep));
  });
}
