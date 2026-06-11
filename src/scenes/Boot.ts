import Phaser from 'phaser';
import { createAllTextures } from '../gfx/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    createAllTextures(this);
    this.scene.start('menu');
  }
}
