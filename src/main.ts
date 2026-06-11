import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { MenuScene } from './scenes/Menu';
import { GameScene } from './scenes/Game';
import { HUDScene } from './scenes/HUD';
import { ResultScene } from './scenes/Result';
import { PAL } from './gfx/palette';
import { SFX } from './audio/sound';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: PAL.paperCss,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
  },
  scene: [BootScene, MenuScene, GameScene, HUDScene, ResultScene],
});

// 标签页隐藏时自动暂停（移动端切后台必备）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.events.emit('hud:autopause');
  } else {
    SFX.unlock();
  }
});

// 便于调试/自动化验证
(window as unknown as { __game: Phaser.Game }).__game = game;

export default game;
