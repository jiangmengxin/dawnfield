// 精英词缀（M15，纯数据层，禁止依赖 Phaser）：让"又一只精英"变成"这只精英要换打法"
// 生效范围：狂暴 II 全部精英 / 无尽第 2 轮起的精英（含 surge/护卫）随机 1 个；
// 普通与狂暴 I 不带（守住"前 2 小时零变化"）。挂载与运行时逻辑在 systems/EnemySystem.ts
import type { AffixId } from './ids';

export const AFFIX_IDS: readonly AffixId[] = ['swift', 'bulwark', 'splitting', 'gravitic', 'volley'];

export const AFFIX = {
  /** swift 迅捷：移速 ×1.35，冲刺类行为 recover ×0.6；残影拖尾 */
  swiftSpeed: 1.35,
  swiftRecover: 0.6,
  swiftGhostEvery: 0.09,
  /** bulwark 壁垒：HP ×1.3、击退抗性 ×0.2、体型 ×1.15 */
  bulwarkHp: 1.3,
  bulwarkKnock: 0.2,
  bulwarkScale: 1.15,
  /** splitting 裂变：死亡分裂 4 只本图基础杂兵 */
  splitN: 4,
  /** gravitic 引力：每 5s 向自身拉拽玩家 0.5s（力度 120，可走位对抗），射程外不拉 */
  graviticCd: 5,
  graviticDur: 0.5,
  graviticForce: 120,
  graviticRange: 460,
  /** volley 弹幕：每 4s 环形 6 弹（speed 150, dmg 10）；发射前蓄力闪烁 */
  volleyCd: 4,
  volleyN: 6,
  volleySpeed: 150,
  volleyDmg: 10,
  volleyFlash: 0.45,
} as const;

/** 词缀标识色（头顶浮签 + 体表光环描边） */
export const AFFIX_COLOR: Record<AffixId, number> = {
  swift: 0x58a8d8,
  bulwark: 0xa08850,
  splitting: 0xc86878,
  gravitic: 0x8a68c8,
  volley: 0xe09040,
};
