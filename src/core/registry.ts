// 通用内容注册表：content/ 数据表的统一定义入口
// M4+ 内容批次按此模式登记（敌人/武器/角色/地图…），冻结防意外改写
export function defineTable<Id extends string, Spec>(entries: Record<Id, Spec>): Readonly<Record<Id, Spec>> {
  return Object.freeze({ ...entries }) as Readonly<Record<Id, Spec>>;
}

/** 表的全部 id（保持登记顺序） */
export function tableIds<Id extends string, Spec>(table: Readonly<Record<Id, Spec>>): Id[] {
  return Object.keys(table) as Id[];
}
