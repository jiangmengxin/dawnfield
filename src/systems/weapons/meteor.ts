// 30. 坠星 / 流星雨（预警后陨石坠地巨爆、震开四周；进化坠星更多更广留灼热陨坑）
import Phaser from 'phaser';
import { W_METEOR } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import { shakeCam } from '../../gfx/shake';
import { nearestK, Weapon, queryOut } from './base';

const METEOR_COLOR = 0xc0c8ec;

interface Meteor {
  x: number;
  y: number;
  r: number;
  phase: 'wait' | 'fall';
  t: number; // wait: 错峰倒计时 / fall: 坠落剩余
  rock?: Phaser.GameObjects.Image;
  sx: number;
  sy: number;
}

export class MeteorWeapon extends Weapon {
  private meteors: Meteor[] = [];

  protected cooldown(): number {
    return this.evolved ? W_METEOR.evoCd : W_METEOR.cd[this.level - 1];
  }

  private dmg(): number {
    return W_METEOR.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_METEOR.evoDmgMul : 1);
  }

  private blastR(): number {
    return W_METEOR.blastR * this.ctx.stats.area * (this.evolved ? W_METEOR.evoBlastMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = this.evolved ? W_METEOR.evoN : W_METEOR.n[this.level - 1];
    const targets = nearestK(ctx, ctx.player.x, ctx.player.y, n, W_METEOR.range);
    const r = this.blastR();
    SFX.warning();
    for (let i = 0; i < n; i++) {
      const tgt = targets[i % Math.max(1, targets.length)];
      let x: number;
      let y: number;
      if (tgt) {
        x = tgt.x + (Math.random() - 0.5) * 80;
        y = tgt.y + (Math.random() - 0.5) * 80;
      } else {
        const a = Math.atan2(ctx.facing.y, ctx.facing.x) + (Math.random() - 0.5) * 1.2;
        const d = 120 + Math.random() * 200;
        x = ctx.player.x + Math.cos(a) * d;
        y = ctx.player.y + Math.sin(a) * d;
      }
      this.meteors.push({ x, y, r, phase: 'wait', t: i * 0.18, sx: x - 150, sy: y - 300 });
    }
  }

  protected tick(dt: number): void {
    const ctx = this.ctx;
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.t -= dt;
      if (m.phase === 'wait') {
        if (m.t <= 0) {
          ctx.fx.teleCircle(m.x, m.y, m.r, W_METEOR.fallT);
          m.rock = ctx.scene.add.image(m.sx, m.sy, 'w_meteor').setDepth(1e6 + 4).setScale(1.4);
          m.phase = 'fall';
          m.t = W_METEOR.fallT;
        }
        continue;
      }
      // 坠落：自上空斜插落点
      const k = 1 - Math.max(0, m.t) / W_METEOR.fallT;
      const ease = k * k; // easeIn
      if (m.rock) {
        m.rock.x = m.sx + (m.x - m.sx) * ease;
        m.rock.y = m.sy + (m.y - m.sy) * ease;
        m.rock.rotation += dt * 5;
      }
      if (m.t <= 0) {
        if (m.rock) m.rock.destroy();
        this.meteors.splice(i, 1);
        this.impact(m.x, m.y, m.r);
      }
    }
  }

  private impact(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    if (!ctx.run.running) return;
    SFX.boom(true);
    shakeCam(ctx.scene, 200, 0.007);
    ctx.fx.ring(x, y, METEOR_COLOR, r / 42, 0.5);
    ctx.fx.ring(x, y, 0xf0e0a0, (r * 1.3) / 42, 0.4);
    ctx.fx.burst(x, y, { tex: 'p_star', color: 0xf0e0a0, count: 16, speed: 240, life: 0.55, scale: 1.1, spin: true });
    ctx.fx.burst(x, y, { tex: 'p_dot', color: 0xfff2d0, count: 8, speed: 150, life: 0.4, grav: 120 });
    const dmg = this.dmg();
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      ctx.hitEnemy(e, dmg, { kb: W_METEOR.kb, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.6 });
    }
    // 流星雨：灼热陨坑
    if (this.evolved) {
      ctx.addZone({ x, y, r: r * 0.8, dur: W_METEOR.craterDur, effect: 'burn', dps: W_METEOR.evoCraterDps * ctx.stats.dmg, tex: 'w_emberpool' });
    }
  }

  destroy(): void {
    this.meteors.forEach((m) => m.rock && m.rock.destroy());
  }
}
