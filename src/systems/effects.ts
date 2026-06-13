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

  /** 预警线（M12 telegraph 规范）：冲刺/俯冲路径预示——统一警示色、双层粗细、淡入淡出 */
  teleLine(x: number, y: number, nx: number, ny: number, len: number, dur: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH_FX - 1).setAlpha(0);
    g.lineStyle(9, 0xe06060, 0.16);
    g.lineBetween(x, y, x + nx * len, y + ny * len);
    g.lineStyle(3.5, 0xe06060, 0.45);
    g.lineBetween(x, y, x + nx * len, y + ny * len);
    this.scene.tweens.add({
      targets: g, alpha: 1, duration: dur * 1000 * 0.35, yoyo: true, hold: dur * 1000 * 0.3,
      onComplete: () => g.destroy(),
    });
  }

  /** 预警圈（M12 telegraph 规范两段式）：半透明警示区常显 + 描边圈从外收缩到爆炸半径（M15 自爆引信用） */
  teleCircle(x: number, y: number, r: number, dur: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH_FX - 1);
    g.fillStyle(0xe06060, 0.13);
    g.fillCircle(0, 0, r);
    g.lineStyle(3, 0xe06060, 0.55);
    g.strokeCircle(0, 0, r);
    g.setPosition(x, y).setScale(1.45).setAlpha(0);
    this.scene.tweens.add({
      targets: g, scale: 1, alpha: 1, duration: dur * 1000, ease: 'Cubic.easeIn',
      onComplete: () => g.destroy(),
    });
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

  /** 短窗内同目标数字合并（M12 打击感分级：多段武器不刷屏） */
  private numMerge = new Map<object, { txt: Phaser.GameObjects.Text; value: number; at: number; crit: boolean; big: boolean }>();

  /** 伤害飘字（可在设置中关闭）；crit/big 分级配色字号，key（敌人）相同且 120ms 内合并数值 */
  number(x: number, y: number, value: number, crit: boolean, big = false, key?: object): void {
    if (!getSettings().dmgNumbers) return;
    const now = this.scene.time.now;
    if (key) {
      const m = this.numMerge.get(key);
      if (m && m.txt.visible && now - m.at < 120) {
        m.value += value;
        m.crit = m.crit || crit;
        m.big = m.big || big;
        this.styleNumber(m.txt, m.value, m.crit, m.big);
        return;
      }
    }
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
    this.styleNumber(txt, value, crit, big);
    txt.setPosition(x + (Math.random() - 0.5) * 16, y - 14)
      .setAlpha(1)
      .setScale(crit || big ? 1.25 : 1)
      .setVisible(true);
    if (key) this.numMerge.set(key, { txt, value, at: now, crit, big });
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 34,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.setVisible(false),
    });
  }

  /** 分级样式：普通橙 16 / 大伤害金橙 21 / 暴击红 22（暴击+大伤害 24） */
  private styleNumber(txt: Phaser.GameObjects.Text, value: number, crit: boolean, big: boolean): void {
    txt.setText(String(Math.round(value)))
      .setColor(crit ? '#E84838' : big ? '#E89018' : '#F08838')
      .setFontSize(crit ? (big ? 24 : 22) : big ? 21 : 16);
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
    this.numMerge.clear();
  }
}
