// 难度分层「狂暴」数值表（M11，纯数据层，禁止依赖 Phaser）
// 每图 2 档加难：通关本图解锁狂暴 I，狂暴 I 通关解锁狂暴 II；与无尽完全正交（乘区相乘）。
// 刻意不加玩家限制类修正——压力全部走敌方乘区 + 精英双刷，避免与低速角色叠出陷阱组合。
export interface DifficultySpec {
  hpMul: number; // 敌 HP
  dmgMul: number; // 敌伤害
  speedMul: number; // 敌移速
  intervalMul: number; // 刷怪间隔
  aliveMul: number; // maxAlive
  eliteDouble: boolean; // 精英事件双刷
  coinMul: number; // 金币奖励
  xpMul: number; // 经验奖励
}

export const DIFFICULTY: readonly [DifficultySpec, DifficultySpec, DifficultySpec] = [
  // 普通
  { hpMul: 1,   dmgMul: 1,    speedMul: 1,    intervalMul: 1,    aliveMul: 1,    eliteDouble: false, coinMul: 1,   xpMul: 1 },
  // 狂暴 I
  { hpMul: 1.4, dmgMul: 1.25, speedMul: 1.08, intervalMul: 0.85, aliveMul: 1.15, eliteDouble: false, coinMul: 1.5, xpMul: 1.1 },
  // 狂暴 II
  { hpMul: 1.9, dmgMul: 1.5,  speedMul: 1.15, intervalMul: 0.7,  aliveMul: 1.3,  eliteDouble: true,  coinMul: 2,   xpMul: 1.2 },
];
