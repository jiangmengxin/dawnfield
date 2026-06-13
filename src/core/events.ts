// 类型化事件总线：包装 game.events，事件名与载荷集中登记
import type Phaser from 'phaser';
import type { ArcanaId } from '../content/ids';
import type { ChestReward, Offer } from '../systems/context';

export interface GameEventMap {
  'hud:levelup': [offers: Offer[]];
  'hud:chest': [reward: ChestReward];
  'hud:arcana': [choices: ArcanaId[]];
  'hud:boss': [visible: boolean];
  'hud:warn': [i18nKey: string];
  'hud:cycle': [cycle: number]; // M11 无尽：新一轮开始（金色 toast「第 {n} 轮！」）
  'hud:revive': [revivesLeft: number];
  'hud:achievement': [achId: string];
  'hud:tip': [text: string]; // M14 引导 tips（已 t() 完成的成文，金色 toast 停留 3.5s）
  'hud:hurt': []; // M17 受击反馈：HUD 血条抖动
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
