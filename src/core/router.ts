// 场景导航：历史栈 + 统一返回（ESC / 返回按钮）
import Phaser from 'phaser';

const stack: string[] = [];

export type SceneKey =
  | 'title' | 'charselect' | 'mapselect' | 'shop' | 'codex' | 'achievements' | 'settings'
  | 'game' | 'result';

/** 前进：当前场景入栈 */
export function go(from: Phaser.Scene, key: SceneKey, data?: object): void {
  stack.push(from.scene.key);
  from.scene.start(key, data);
}

/** 返回上一场景；栈空回 Title */
export function back(from: Phaser.Scene): void {
  const prev = stack.pop() ?? 'title';
  from.scene.start(prev);
}

/** 进入单局 / 回主菜单时清空历史 */
export function resetStack(): void {
  stack.length = 0;
}
