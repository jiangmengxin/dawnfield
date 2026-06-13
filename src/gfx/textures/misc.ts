// 通用纹理：阴影 / 拾取物 / 粒子 / 地面装饰 / 虚拟摇杆
import { PAL, cssOf } from '../palette';
import { makeTex, petalShape, softGlow, star } from './core';

export function createMiscTextures(scene: Phaser.Scene): void {
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

  makeTex(scene, 'coin', 18, 18, (ctx) => {
    ctx.beginPath();
    ctx.arc(9, 9, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD870';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D8A840';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, 9, 4.6, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(216,168,64,0.7)';
    ctx.stroke();
    star(ctx, 9, 9, 4, 3.2, 1.3, '#FFF2C0');
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(6.4, 5.8, 1.8, 1.1, -0.6, 0, Math.PI * 2);
    ctx.fill();
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

  // 晨光宝箱：拱顶木盖 + 木纹箱体 + 金属箍/锁扣面板（明亮童话向，PAL.chest 金色系）
  makeTex(scene, 'chest', 44, 38, (ctx) => {
    softGlow(ctx, 22, 20, 18, 'rgba(232,200,120,0.5)');
    const rr = (x: number, y: number, w2: number, h2: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w2, y, x + w2, y + h2, r);
      ctx.arcTo(x + w2, y + h2, x, y + h2, r);
      ctx.arcTo(x, y + h2, x, y, r);
      ctx.arcTo(x, y, x + w2, y, r);
      ctx.closePath();
    };
    // 箱体（木纹渐变 + 板缝）
    const body = ctx.createLinearGradient(0, 17, 0, 34);
    body.addColorStop(0, '#EFC270');
    body.addColorStop(1, '#C8924A');
    rr(7, 17, 30, 17, 4);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#A87838';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(168,120,56,0.35)';
    for (const yy of [23.5, 28.5]) {
      ctx.beginPath();
      ctx.moveTo(9, yy);
      ctx.lineTo(35, yy);
      ctx.stroke();
    }
    // 箱体金属箍 ×2 + 铆钉
    for (const x of [10.5, 29.5]) {
      rr(x, 19.5, 4, 13, 1.5);
      ctx.fillStyle = '#F6E6B8';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#C09848';
      ctx.stroke();
      ctx.fillStyle = '#C09848';
      for (const yy of [22.5, 30]) {
        ctx.beginPath();
        ctx.arc(x + 2, yy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 拱顶箱盖（受光更亮）
    const lid = ctx.createLinearGradient(0, 5, 0, 18);
    lid.addColorStop(0, '#F8D88C');
    lid.addColorStop(1, '#D8A850');
    ctx.beginPath();
    ctx.moveTo(7, 18);
    ctx.lineTo(7, 13);
    ctx.quadraticCurveTo(7.5, 5, 22, 5);
    ctx.quadraticCurveTo(36.5, 5, 37, 13);
    ctx.lineTo(37, 18);
    ctx.closePath();
    ctx.fillStyle = lid;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#A87838';
    ctx.stroke();
    // 盖面高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(14.5, 9.5, 4.6, 2, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // 盖沿金属带（横贯）+ 端头铆钉
    rr(5.5, 15.5, 33, 4.5, 2);
    ctx.fillStyle = '#F6E6B8';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#C09848';
    ctx.stroke();
    ctx.fillStyle = '#C09848';
    for (const x of [8.5, 35.5]) {
      ctx.beginPath();
      ctx.arc(x, 17.8, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    // 锁扣面板 + 锁孔
    rr(18.5, 14, 7, 9.5, 2.5);
    ctx.fillStyle = '#FFF4CF';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#C09848';
    ctx.stroke();
    ctx.fillStyle = '#A87838';
    ctx.beginPath();
    ctx.arc(22, 17.6, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(21.2, 18.6);
    ctx.lineTo(22.8, 18.6);
    ctx.lineTo(22.5, 21.2);
    ctx.lineTo(21.5, 21.2);
    ctx.closePath();
    ctx.fill();
    // 星光点缀
    star(ctx, 35, 7, 4, 4.2, 1.7, '#FFFFFF');
    star(ctx, 9.5, 11, 4, 2.6, 1.1, 'rgba(255,255,255,0.85)');
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
  // M16 秘密花圃微光（草甸彩蛋）：柔和径向光晕，叠在花丛下方做「可被注意但不打扰」的提示
  makeTex(scene, 'sb_glow', 96, 96, (ctx) => {
    const g = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
    g.addColorStop(0, 'rgba(255,246,200,0.85)');
    g.addColorStop(0.55, 'rgba(255,236,170,0.35)');
    g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(48, 48, 46, 0, Math.PI * 2);
    ctx.fill();
  });
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
}
