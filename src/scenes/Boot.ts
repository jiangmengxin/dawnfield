import Phaser from 'phaser';
import { createAllTextures } from '../gfx/textures';
import { Meta } from '../core/MetaState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    createAllTextures(this);
    Meta.syncAchUnlocks(); // 旧档成就 → 角色解锁补同步
    this.scene.start('title');
  }
}
