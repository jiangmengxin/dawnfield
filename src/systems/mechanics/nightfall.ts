// nocturne 夜幕与光界（M18 核心）：全场罩暗（玩家光圈内正常），敌人在光外只剩剪影；
// 周期落下星屑，拾取临时照亮全场。策略轴：视野管理——光圈即资源，星屑是喘息窗口。
// 可读性红线（M12）：弹体/预警 depth 高于夜幕恒可见；夜幕最大压暗 darkAlpha（温和），不致眩晕。
// starfall 流星雨保留并存（流星瞬间照亮的正反馈）。
import type { MechanicSpec } from '../../content/maps';
import { NOCTURNE } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import type { CombatContext } from '../context';
import { aroundPlayer, Mechanic, Patch } from './types';

const NIGHT_DEPTH = 9e5; // 高于敌人/地面（压暗成剪影），低于弹体/预警/UI（恒可见）

export class NightfallMechanic implements Mechanic {
  private overlay: Phaser.GameObjects.Image;
  private litT = 0; // 星屑照亮剩余秒
  private starT: number;
  private stars: Patch[] = [];
  constructor(private ctx: CombatContext, private spec: Extract<MechanicSpec, { kind: 'nightfall' }>) {
    this.overlay = ctx.scene.add.image(0, 0, 'nz_dark').setDepth(NIGHT_DEPTH).setAlpha(spec.darkAlpha);
    this.starT = spec.starEvery * 0.6;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const spec = this.spec;
    const cam = ctx.scene.cameras.main;
    // 夜幕跟随玩家（透明光圈居中=玩家），覆盖全屏
    const cover = (Math.max(cam.width, cam.height) / cam.zoom) * 1.6;
    this.overlay.setPosition(ctx.player.x, ctx.player.y).setDisplaySize(cover, cover);
    // 星屑照亮衰减
    if (this.litT > 0) {
      this.litT -= dt;
      this.overlay.setAlpha(spec.darkAlpha * 0.35);
    } else {
      this.overlay.setAlpha(spec.darkAlpha);
    }
    // 周期生成星屑
    this.starT -= dt;
    if (this.starT <= 0) {
      this.starT = spec.starEvery;
      const [x, y] = aroundPlayer(ctx, 140, 340);
      const img = ctx.scene.add.image(x, y, 'p_star').setDepth(NIGHT_DEPTH + 1).setTint(NOCTURNE.starGlow)
        .setScale(0).setAlpha(0.95);
      ctx.scene.tweens.add({ targets: img, scale: 1.3, duration: 400, ease: 'Back.easeOut' });
      ctx.scene.tweens.add({ targets: img, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
      this.stars.push({ img, x, y, r: 40, t: 16, tick: 0 });
    }
    // 星屑拾取（玩家靠近）/ 过期
    const px = ctx.player.x;
    const py = ctx.player.y;
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.t -= dt;
      if ((px - s.x) ** 2 + (py - s.y) ** 2 < s.r * s.r) {
        this.litT = spec.litT;
        ctx.fx.ring(s.x, s.y, NOCTURNE.starGlow, 6, 0.7);
        ctx.fx.burst(s.x, s.y, { tex: 'p_star', color: NOCTURNE.starShot, count: 12, speed: 200, life: 0.6, scale: 1, spin: true });
        SFX.heal();
        s.img.destroy();
        this.stars.splice(i, 1);
      } else if (s.t <= 0) {
        const img = s.img;
        ctx.scene.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
        this.stars.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.overlay.destroy();
    this.stars.forEach((s) => s.img.destroy());
    this.stars.length = 0;
  }
}
