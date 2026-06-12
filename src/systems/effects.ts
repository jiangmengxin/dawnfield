// 特效：手写粒子池 + 伤害飘字 + 扩散环 + hit-stop / 震屏
// 不依赖 Phaser 粒子插件，行为完全可控且对象全池化
import Phaser from 'phaser';
import { FONT } from '../i18n';
import { getSettings } from '../core/settings';

const DEPTH_FX = 1e7;

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  drag: number;
  grav: number;
  life: number;
  maxLife: number;
  scale0: number;
  spin: number;
  active: boolean;
}

export class Effects {
  private scene: Phaser.Scene;
  private particles: Particle[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private mobile: boolean;
  /** 粒子数量系数（移动端 0.5） */
  private q: number;

  constructor(scene: Phaser.Scene, mobile: boolean) {
    this.scene = scene;
    this.mobile = mobile;
    this.q = mobile ? 0.5 : 1;
  }

  /** 动态画质（M8）：低帧率时粒子降档（基础系数 × 动态系数） */
  setQuality(mul: number): void {
    this.q = (this.mobile ? 0.5 : 1) * mul;
  }

  private getParticle(tex: string): Particle {
    for (const p of this.particles) {
      if (!p.active) {
        p.img.setTexture(tex);
        return p;
      }
    }
    if (this.particles.length >= (this.mobile ? 220 : 450)) return this.particles[0]; // 复用最老的
    const img = this.scene.add.image(0, 0, tex).setDepth(DEPTH_FX).setVisible(false);
    const p: Particle = { img, vx: 0, vy: 0, drag: 1, grav: 0, life: 0, maxLife: 1, scale0: 1, spin: 0, active: false };
    this.particles.push(p);
    return p;
  }

  /** 通用爆发粒子 */
  burst(x: number, y: number, opts: {
    tex?: string; color?: number; count: number; speed?: number; speedVar?: number;
    life?: number; scale?: number; grav?: number; drag?: number; spin?: boolean; alpha?: number;
  }): void {
    const n = Math.max(1, Math.round(opts.count * this.q));
    for (let i = 0; i < n; i++) {
      const p = this.getParticle(opts.tex ?? 'p_dot');
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 120) * (1 - (opts.speedVar ?? 0.5) * Math.random());
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.drag = opts.drag ?? 0.9;
      p.grav = opts.grav ?? 0;
      p.maxLife = p.life = (opts.life ?? 0.5) * (0.7 + Math.random() * 0.6);
      p.scale0 = (opts.scale ?? 1) * (0.7 + Math.random() * 0.6);
      p.spin = opts.spin ? (Math.random() - 0.5) * 10 : 0;
      p.active = true;
      p.img.setPosition(x, y).setVisible(true).setRotation(Math.random() * Math.PI * 2)
        .setScale(p.scale0).setAlpha(opts.alpha ?? 1);
      if (opts.color !== undefined) p.img.setTint(opts.color); else p.img.clearTint();
    }
  }

  /** 扩散环（爆炸/冲击波视觉） */
  ring(x: number, y: number, color: number, toScale: number, dur = 0.35): void {
    const img = this.scene.add.image(x, y, 'p_ring').setDepth(DEPTH_FX).setTint(color).setScale(0.2).setAlpha(0.9);
    this.scene.tweens.add({
      targets: img,
      scale: toScale,
      alpha: 0,
      duration: dur * 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  }

  /** 命中白闪 */
  flash(target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, color = 0xffffff): void {
    target.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (target.active) target.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  /** 伤害飘字（可在设置中关闭） */
  number(x: number, y: number, value: number, crit: boolean): void {
    if (!getSettings().dmgNumbers) return;
    let txt: Phaser.GameObjects.Text | undefined;
    for (const t of this.texts) {
      if (!t.visible) { txt = t; break; }
    }
    if (!txt) {
      if (this.texts.length >= (this.mobile ? 24 : 40)) return;
      txt = this.scene.add.text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#F08838',
        stroke: '#FFFDF6',
        strokeThickness: 4,
      }).setDepth(DEPTH_FX + 1).setOrigin(0.5);
      this.texts.push(txt);
    }
    txt.setText(String(Math.round(value)))
      .setColor(crit ? '#E84838' : '#F08838')
      .setFontSize(crit ? 22 : 16)
      .setPosition(x + (Math.random() - 0.5) * 16, y - 14)
      .setAlpha(1)
      .setScale(crit ? 1.2 : 1)
      .setVisible(true);
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 34,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.setVisible(false),
    });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.img.setVisible(false);
        continue;
      }
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.grav * dt;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      if (p.spin) p.img.rotation += p.spin * dt;
      const k = p.life / p.maxLife;
      p.img.setAlpha(Math.min(1, k * 2)).setScale(p.scale0 * (0.4 + 0.6 * k));
    }
  }

  destroy(): void {
    this.particles.forEach((p) => p.img.destroy());
    this.texts.forEach((t) => t.destroy());
    this.particles = [];
    this.texts = [];
  }
}
