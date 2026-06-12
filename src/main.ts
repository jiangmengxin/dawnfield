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
import { emitEvent } from './core/events';
import { Viewport } from './ui/Viewport';

// 高分屏适配：画布按 物理像素(CSS × DPR) 渲染，否则浏览器拉伸导致整体模糊。
// 游戏内逻辑坐标保持 CSS 像素，由各场景相机 zoom × DPR 映射到物理像素（见 Viewport）。
const DPR = Viewport.dprNow();

// 所有 add.text 默认注入 resolution = DPR：文字纹理按物理像素栅格化，
// 相机 DPR 缩放下依旧清晰（Phaser 不提供全局默认，只能包一层工厂）
const textFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (
  this: Phaser.GameObjects.GameObjectFactory,
  x: number,
  y: number,
  content: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  return textFactory.call(this, x, y, content, { resolution: Viewport.dprNow(), ...style });
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: PAL.paperCss,
  scale: {
    mode: Phaser.Scale.NONE,
    width: Math.round(window.innerWidth * DPR),
    height: Math.round(window.innerHeight * DPR),
    zoom: 1 / DPR,
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
    emitEvent(game, 'hud:autopause');
  } else {
    SFX.unlock();
  }
});

// 便于调试/自动化验证
(window as unknown as { __game: Phaser.Game }).__game = game;

export default game;
