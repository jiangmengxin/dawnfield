// 26. 泡泡弹 / 连环泡（抛出泡泡，涨到极限啵地破开 + 击退；进化主泡迸出一串小泡接连炸开）
import Phaser from 'phaser';
import { W_BOMB } from '../../content/weapons';
import { SFX } from '../../audio/sound';
import { shakeCam } from '../../gfx/shake';
import { nearestK, Weapon, queryOut } from './base';

const BOMB_COLOR = 0xa8d8ec;

interface Bomb {
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  phase: 'fly' | 'fuse';
  t: number; // fly: 已飞时长 / fuse: 剩余引信
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  flyT: number;
}

interface Cluster {
  img: Phaser.GameObjects.Image;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t: number;
  dmg: number;
  r: number;
}

export class BombWeapon extends Weapon {
  private bombs: Bomb[] = [];
  private clusters: Cluster[] = [];

  protected cooldown(): number {
    return this.evolved ? W_BOMB.evoCd : W_BOMB.cd[this.level - 1];
  }

  private dmg(): number {
    return W_BOMB.dmg[this.level - 1] * this.ctx.stats.dmg * (this.evolved ? W_BOMB.evoDmgMul : 1);
  }

  private blastR(): number {
    return W_BOMB.blastR * this.ctx.stats.area * (this.evolved ? W_BOMB.evoBlastMul : 1);
  }

  protected fire(): void {
    const ctx = this.ctx;
    const n = W_BOMB.n[this.level - 1];
    const targets = nearestK(ctx, ctx.player.x, ctx.player.y, n, W_BOMB.range);
    const flyT = W_BOMB.flyT / Math.max(0.6, ctx.stats.projSpeed);
    SFX.throwSfx();
    for (let i = 0; i < n; i++) {
      const tgt = targets[i % Math.max(1, targets.length)];
      let tx: number;
      let ty: number;
      if (tgt) {
        tx = tgt.x + (Math.random() - 0.5) * 36;
        ty = tgt.y + (Math.random() - 0.5) * 36;
      } else {
        const a = Math.atan2(ctx.facing.y, ctx.facing.x) + (Math.random() - 0.5) * 0.6;
        const d = 140 + Math.random() * 120;
        tx = ctx.player.x + Math.cos(a) * d;
        ty = ctx.player.y + Math.sin(a) * d;
      }
      const shadow = ctx.scene.add.image(tx, ty, 'shadow').setDepth(6).setAlpha(0.5).setScale(0.9, 0.55);
      const img = ctx.scene.add.image(ctx.player.x, ctx.player.y, 'w_bomb').setDepth(1e6 + 2);
      this.bombs.push({ img, shadow, phase: 'fly', t: 0, sx: ctx.player.x, sy: ctx.player.y, tx, ty, flyT: flyT * (0.92 + i * 0.08) });
    }
  }

  protected tick(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      if (b.phase === 'fly') {
        b.t += dt;
        const k = Math.min(1, b.t / b.flyT);
        const lift = Math.sin(k * Math.PI) * W_BOMB.arcH;
        b.img.x = b.sx + (b.tx - b.sx) * k;
        b.img.y = b.sy + (b.ty - b.sy) * k - lift;
        b.img.rotation += dt * 5;
        b.img.setScale(1 + Math.sin(k * Math.PI) * 0.4);
        if (k >= 1) {
          b.phase = 'fuse';
          b.t = W_BOMB.fuse;
          b.img.setScale(1).setRotation(0).setPosition(b.tx, b.ty);
        }
      } else {
        b.t -= dt;
        // 泡泡涨大 + 薄膜微颤（涨到极限即破）
        const grow = W_BOMB.fuse - b.t;
        b.img.setScale((1 + grow * 0.6) * (1 + Math.sin(grow * 26) * 0.04));
        b.img.setAlpha(0.8 + Math.sin(grow * 22) * 0.18);
        if (b.t <= 0) {
          this.explode(b.tx, b.ty, this.dmg(), this.blastR(), true);
          b.img.destroy();
          b.shadow.destroy();
          this.bombs.splice(i, 1);
        }
      }
    }
    // 子炸弹飞散 + 落点二次爆
    for (let i = this.clusters.length - 1; i >= 0; i--) {
      const c = this.clusters[i];
      c.t -= dt;
      const k = Math.max(0, Math.min(1, 1 - c.t / 0.24));
      c.img.x = c.sx + (c.tx - c.sx) * k;
      c.img.y = c.sy + (c.ty - c.sy) * k;
      c.img.rotation += dt * 8;
      if (c.t <= 0) {
        c.img.destroy();
        this.clusters.splice(i, 1);
        this.explode(c.tx, c.ty, c.dmg, c.r, false);
      }
    }
  }

  private explode(x: number, y: number, dmg: number, r: number, main: boolean): void {
    const ctx = this.ctx;
    SFX.splash();
    shakeCam(ctx.scene, main ? 130 : 70, main ? 0.0045 : 0.0025);
    ctx.fx.ring(x, y, BOMB_COLOR, r / 42, 0.45);
    // 破裂水沫（小泡 + 水珠）
    ctx.fx.burst(x, y, { tex: 'p_dot', color: BOMB_COLOR, count: main ? 14 : 7, speed: main ? 230 : 150, life: 0.5, scale: 0.9, grav: 90 });
    ctx.fx.burst(x, y, { tex: 'p_dot', color: 0xffffff, count: main ? 8 : 4, speed: 150, life: 0.32, scale: 0.6, alpha: 0.9 });
    ctx.grid.queryCircle(x, y, r, queryOut);
    for (const e of queryOut) {
      const ea = Math.atan2(e.y - y, e.x - x);
      ctx.hitEnemy(e, dmg, { kb: W_BOMB.kb, kx: Math.cos(ea), ky: Math.sin(ea), pitch: 0.9 });
    }
    // 连环泡：主泡迸出一串小泡（tick 驱动飞散，落点二次破）
    if (main && this.evolved) {
      for (let i = 0; i < W_BOMB.evoCluster; i++) {
        const a = (i / W_BOMB.evoCluster) * Math.PI * 2 + Math.random() * 0.5;
        const d = r * 0.7;
        const spark = ctx.scene.add.image(x, y, 'w_bomb').setDepth(1e6 + 2).setScale(0.6);
        this.clusters.push({ img: spark, sx: x, sy: y, tx: x + Math.cos(a) * d, ty: y + Math.sin(a) * d, t: 0.24, dmg: dmg * W_BOMB.clusterDmgK, r: r * W_BOMB.clusterBlastK });
      }
    }
  }

  destroy(): void {
    this.bombs.forEach((b) => { b.img.destroy(); b.shadow.destroy(); });
    this.clusters.forEach((c) => c.img.destroy());
  }
}
