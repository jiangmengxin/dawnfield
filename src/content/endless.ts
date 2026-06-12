// 无尽模式数值表（M11，纯数据层，禁止依赖 Phaser）
// 核心方案：虚拟时间窗循环——Boss 时刻后以 cycleLen 为周期循环该图最后一段峰值波次，
// 并按轮偏移重放窗口内事件（天然含 ring/精英/Boss → Boss 每轮末重临）。
// 现有 hpScale/dmgScale 随 elapsed 自然增长继续生效，轮次乘区在其上叠加。
export const ENDLESS = {
  /** 循环周期（秒）：全图统一 5 分钟一轮，记录刻度 = 活到第几轮 */
  cycleLen: 300,
  /** 敌 HP ×(1 + hpMulPerCycle×k) */
  hpMulPerCycle: 0.35,
  /** 敌伤害 ×(1 + dmgMulPerCycle×k) */
  dmgMulPerCycle: 0.18,
  /** 敌移速 ×(1 + speedMulPerCycle×k)，封顶 speedCap */
  speedMulPerCycle: 0.04,
  speedCap: 1.25,
  /** maxAlive ×(1 + aliveMulPerCycle×k)，封顶 aliveCap，且乘区结果再与 aliveHardCap 取 min */
  aliveMulPerCycle: 0.08,
  aliveCap: 1.25,
  aliveHardCap: 340,
  /** 刷怪间隔 ×max(intervalFloor, 1 − intervalMulPerCycle×k) */
  intervalMulPerCycle: 0.05,
  intervalFloor: 0.8,
  /** Boss 额外 HP 乘区 ×(1 + bossExtraPerCycle×k)（叠加在通用 HP 乘区上） */
  bossExtraPerCycle: 0.25,
  /** 金币收益 ×max(coinFloor, 1 − coinDecayPerCycle×k) —— 防通胀，保护 M10 商店经济曲线 */
  coinDecayPerCycle: 0.12,
  coinFloor: 0.4,
  /** 第 escortFromCycle 轮起，轮末 Boss 带 escortCount 名精英护卫同刷 */
  escortFromCycle: 3,
  escortCount: 2,
  /** 无尽 Boss 击杀奖励：bossCoinN 枚 × bossCoinV 面值（基础 25，金币衰减在拾取时生效） */
  bossCoinN: 5,
  bossCoinV: 5,
};

/** 当前轮次（1-based）：Boss 时刻前为 0，之后每 cycleLen 秒进一轮 */
export function endlessCycleAt(elapsed: number, bossT: number): number {
  if (elapsed < bossT) return 0;
  return Math.floor((elapsed - bossT) / ENDLESS.cycleLen) + 1;
}

/** 无尽金币衰减乘子（cycle=0 时恒 1，普通模式同样安全） */
export function endlessCoinMul(cycle: number): number {
  return Math.max(ENDLESS.coinFloor, 1 - ENDLESS.coinDecayPerCycle * cycle);
}
