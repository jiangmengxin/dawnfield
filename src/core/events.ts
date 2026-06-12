// 类型化事件总线：包装 game.events，事件名与载荷集中登记
import type Phaser from 'phaser';
import type { ChestReward, Offer } from '../systems/context';

export interface GameEventMap {
  'hud:levelup': [offers: Offer[]];
  'hud:chest': [reward: ChestReward];
  'hud:boss': [visible: boolean];
  'hud:warn': [i18nKey: string];
  'hud:refresh': [];
  'hud:togglepause': [];
  'hud:autopause': [];
}

export function emitEvent<K extends keyof GameEventMap>(
  game: Phaser.Game, key: K, ...args: GameEventMap[K]
): void {
  game.events.emit(key, ...args);
}

/** 订阅；返回反注册函数，场景 shutdown 时务必调用（防泄漏） */
export function onEvent<K extends keyof GameEventMap>(
  game: Phaser.Game, key: K, fn: (...args: GameEventMap[K]) => void,
): () => void {
  game.events.on(key, fn);
  return () => {
    game.events.off(key, fn);
  };
}
