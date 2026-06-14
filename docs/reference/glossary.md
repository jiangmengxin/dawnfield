# 术语表

## 游戏术语

| 术语 | 含义 |
|---|---|
| Dawnfield / 晨露之野 | 项目名与游戏世界称呼 |
| 单局 | 从选择角色/地图进入 GameScene 到胜利、失败或退出结算 |
| 构筑 | 武器、被动、进化、Arcana、trait、掉落 buff、晨露精华共同形成的战斗方案 |
| 超武 | 基础武器满级并满足被动条件后进化出的形态 |
| 晨露精华 | 满构筑后升级溢出的无限成长卡 |
| Arcana / 规则卡 | 单局规则修改卡，由 RunModifier 实现 |
| trait / 角色机制 | 角色专属机制，复用 RunModifier |
| surge | 后 4 图中场强敌事件 |
| 无尽 | Boss 后循环峰值窗口的模式 |
| 狂暴 | 高难敌方乘区模式 |
| 突破 | 进化武器继续升级的模式 |

## 技术术语

| 术语 | 含义 |
|---|---|
| content 层 | `src/content/*` 纯数据层，不依赖 Phaser |
| RunState | 局内状态与属性重算源 |
| Meta | 局外状态单例，负责金币、成就、图鉴、解锁和统计 |
| SaveV2 | 当前版本化存档 schema |
| RunSystem | 局内系统统一 update 接口 |
| CombatContext | 系统之间共享的局内能力接口 |
| RunModifier | Arcana 和 trait 的钩子接口 |
| MapSpec | 地图全链路配置 |
| MechanicSpec | 地图机制配置联合类型 |
| BossSpec | Boss 模块化配装表 |
| DropState | 持续掉落道具聚合出的临时局内状态 |
| SpatialGrid | 敌人近邻查询网格 |
| TimeController | 倍速、hit-stop、timeScale 协调器 |
| DpsTracker | 武器和机制伤害归账统计 |

## 文档术语

| 术语 | 含义 |
|---|---|
| 当前事实 | 已在代码中实现并可由源码或测试解释的状态 |
| 历史归档 | 曾经的设计、评审或路线图，仅作溯源 |
| 体验债 | 已识别但未完全修复的 UI/手感/可读性问题 |
| 验证口径 | 运行命令、bench、preview 或测试中用于判定行为的标准 |
