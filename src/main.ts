import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { TitleScene } from './scenes/Title';
import { CharacterSelectScene } from './scenes/CharacterSelect';
import { MapSelectScene } from './scenes/MapSelect';
import { ShopScene } from './scenes/Shop';
import { CodexScene } from './scenes/Codex';
import { AchievementsScene } from './scenes/Achievements';
import { SettingsScene } from './scenes/Settings';
import { GameScene } from './scenes/Game';
import { HUDScene } from './scenes/HUD';
import { ResultScene } from './scenes/Result';
import { PAL } from './gfx/palette';
import { SFX } from './audio/sound';
import { Viewport } from './ui/Viewport';

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
  scene: [
    BootScene, TitleScene,
    CharacterSelectScene, MapSelectScene,
    ShopScene, CodexScene, AchievementsScene, SettingsScene,
    GameScene, HUDScene, ResultScene,
  ],
});

Viewport.init(game);

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
