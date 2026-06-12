// 地面装饰系统：无限延展的草甸（确定性伪随机 chunk + 对象池回收）
import Phaser from 'phaser';
import type { CombatContext, RunSystem } from './context';

const CHUNK = 460;

export class DecorSystem implements RunSystem {
  private chunks = new Map<string, Phaser.GameObjects.Image[]>();
  private decorPool: Phaser.GameObjects.Image[] = [];

  constructor(private ctx: CombatContext) {}

  update(_dt: number): void {
    if (this.ctx.run.frame % 10 !== 0) return;
    const cam = this.ctx.scene.cameras.main;
    const view = cam.worldView;
    const x0 = Math.floor((view.x - CHUNK / 2) / CHUNK);
    const x1 = Math.floor((view.right + CHUNK / 2) / CHUNK);
    const y0 = Math.floor((view.y - CHUNK / 2) / CHUNK);
    const y1 = Math.floor((view.bottom + CHUNK / 2) / CHUNK);
    const want = new Set<string>();
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = cx + ',' + cy;
        want.add(key);
        if (!this.chunks.has(key)) this.makeChunk(key, cx, cy);
      }
    }
    for (const [key, imgs] of this.chunks) {
      if (!want.has(key)) {
        for (const img of imgs) {
          img.setVisible(false);
          this.decorPool.push(img);
        }
        this.chunks.delete(key);
      }
    }
  }

  private makeChunk(key: string, cx: number, cy: number): void {
    // 确定性伪随机：同一 chunk 永远长一样
    let seed = (cx * 374761393 + cy * 668265263) ^ 0x5bf03635;
    const rnd = () => {
      seed = (seed ^ (seed << 13)) | 0;
      seed = (seed ^ (seed >>> 17)) | 0;
      seed = (seed ^ (seed << 5)) | 0;
      return ((seed >>> 0) % 10000) / 10000;
    };
    const imgs: Phaser.GameObjects.Image[] = [];
    const place = (tex: string, n: number) => {
      for (let i = 0; i < n; i++) {
        let img = this.decorPool.pop();
        if (!img) {
          img = this.ctx.scene.add.image(0, 0, tex);
        } else {
          img.setTexture(tex);
        }
        img.setPosition(cx * CHUNK + rnd() * CHUNK, cy * CHUNK + rnd() * CHUNK)
          .setDepth(2)
          .setVisible(true)
          .setAlpha(0.85)
          .setScale(0.8 + rnd() * 0.5)
          .setFlipX(rnd() > 0.5);
        imgs.push(img);
      }
    };
    const density = this.ctx.isMobile ? 0.6 : 1;
    place('d_grass' + Math.floor(rnd() * 3), Math.round((3 + rnd() * 3) * density));
    if (rnd() < 0.75) place('d_flower' + Math.floor(rnd() * 3), Math.round((1 + rnd() * 2) * density));
    if (rnd() < 0.5) place('d_pebble' + Math.floor(rnd() * 2), 1);
    this.chunks.set(key, imgs);
  }
}
