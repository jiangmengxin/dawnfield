// 武器/被动/商店图标（40×40 圆形令牌：白底圆 + 描边，铺满槽位即完整令牌）
import { PAL, RAINBOW, cssOf } from '../palette';
import { Ctx, makeTex, petalShape, star } from './core';

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
}
