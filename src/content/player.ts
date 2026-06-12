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

// 晨露精华（M12 Limit Break）：满构筑（武器/被动槽满且全满级）后，升级三选一替换为
// 微量永续成长卡，可无限叠加（XP ^1.85 曲线自限实际次数）；同时充当无尽模式玩家侧轮次补偿
export const ESSENCE = {
  dmg: 0.02,   // 伤害 +2% / 张（线性叠加）
  cd: 0.015,   // 冷却 −1.5% / 张（乘方叠加，受 0.4 下限保护）
  area: 0.02,  // 范围 +2% / 张（线性叠加）
  heal: 40,    // 保留的第四张回血卡数额
};

// 打击感分级（M12）：大伤害/暴击微顿帧 + hitstop 预算（防高频武器把游戏卡成幻灯片）
export const HITFEEL = {
  bigHitMul: 80,     // 单次伤害 ≥ bigHitMul × stats.dmg 视为大伤害
  microStop: 0.03,   // 大伤害/暴击微顿帧（秒）
  eliteStop: 0.08,   // 精英死亡顿帧（秒）
  budgetPerSec: 0.12, // 每秒 hitstop 预算（超出静默丢弃）
};
