import Phaser from 'phaser';
import { createAllTextures } from '../gfx/textures';
import { Meta } from '../core/MetaState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.image('title_bg_landscape', '/title/title-bg-landscape.webp');
    this.load.image('title_bg_portrait', '/title/title-bg-portrait.webp');
    this.load.image('title_logo_zh', '/title/title-logo-zh.png');
    this.load.image('title_logo_en', '/title/title-logo-en.png');
    this.load.image('title_btn_primary', '/title/title-btn-primary.png');
    this.load.image('title_btn_secondary', '/title/title-btn-secondary.png');
  }

  create(): void {
    createAllTextures(this);
    Meta.syncAchUnlocks(); // 旧档成就 → 角色解锁补同步
    this.scene.start('title');
  }
}
