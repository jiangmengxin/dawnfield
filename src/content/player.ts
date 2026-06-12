// 玩家基础数值 / 单局规则（纯数据层，禁止依赖 Phaser）
export const PLAYER = {
  hp: 100,
  speed: 175,
  pickup: 65,
  radius: 14,
  iframe: 0.6, // 受击无敌秒数
  touchTick: 0.45, // 接触伤害结算间隔
};

export const RUN_SECONDS = 12 * 60;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;

export function xpForLevel(level: number): number {
  // level: 当前等级，返回升到下一级所需 xp
  return Math.round(6 + (level - 1) * 7 + Math.pow(level - 1, 1.85) * 1.1);
}

export const DROPS = {
  heartChance: 0.035,
  heartHeal: 25,
  gemMergeCap: 260, // 场上光珠超过此数合并
  // 金币（M3：唯一用途为商店永久强化）
  coinChance: 0.06, // 普通敌人掉币概率
  coinBig: 5, // 大币面值
  coinBigChance: 0.1, // 掉币时出大币的概率
  eliteCoinN: 5, // 精英死亡掉币枚数
  eliteCoinV: 3, // 精英掉币单枚面值
  coinMergeCap: 60, // 场上金币超过此数合并
};

export const CRIT = { chance: 0.1, mul: 1.6 };
