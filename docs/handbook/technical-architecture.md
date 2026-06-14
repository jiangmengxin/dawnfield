# 技术架构手册

> 事实源：`src/main.ts`、`src/scenes/*`、`src/systems/*`、`src/core/*`、`src/content/*`、`src/ui/*`、`src/gfx/*`、`src/audio/*`。

## 技术栈

Dawnfield 使用 Phaser 4.1、Vite 7、TypeScript 5.8。运行形态是单页网页游戏，核心渲染在 Phaser canvas 内完成，UI 也主要由 Phaser 场景和自研 widgets 绘制。

硬约束：

- 不降级 Phaser，不换引擎。
- 不引入额外运行时依赖。
- 不引入外部图片、音频、字体。
- content 层纯数据，不依赖 Phaser。

## 目录边界

| 目录 | 职责 |
|---|---|
| `src/content` | 纯数据和数值表：ID、角色、地图、武器、被动、敌人、Boss、商店、成就、Arcana、词缀、掉落 |
| `src/core` | 存档、局内状态、局外状态、设置、路由、事件、时间控制、输入 |
| `src/systems` | 局内运行系统、敌人、武器、投射物、拾取、地图机制、Arcana、trait、效果、性能统计 |
| `src/scenes` | Phaser 场景编排：菜单、选择、商店、图鉴、设置、游戏、HUD、结算 |
| `src/ui` | 响应式布局、主题、UIScene、通用 widgets |
| `src/gfx` | 色板、程序化纹理与地图资源生命周期 |
| `src/audio` | WebAudio SFX 与生成式 BGM |
| `scripts` | i18n、文档校验、截图接收等开发脚本 |

## 局内状态

`RunState` 是局内可保存/可计算状态的核心：HP、XP、等级、金币、击杀、被动、Arcana、晨露精华、复活次数、成就埋点、模式开关和属性快照。

属性通过 `computeStats()` 重算：

- 基础角色属性。
- 被动等级。
- 商店永久强化。
- 角色 mods。
- 晨露精华。
- Arcana 和 trait 的 `statMods`。
- 掉落道具和地图机制的临时乘区。

不要把 Phaser sprite、tween、timer 或场景对象写入 `RunState`。

## 局外状态与存档

局外状态由 `Meta` 单例管理，存档通过 `core/save`：

- `schema.ts`：SaveV2 类型、默认值、sanitize。
- `migrations.ts`：版本迁移和旧散键吸收。
- `storage.ts`：localStorage、debounce、pagehide/visibilitychange flush、损坏备份。

SaveV2 当前包含 coins、powerUps、unlocked、codex、achievements、stats、settings、endless、hyper、tipsSeen。

schema 改动必须：

1. 提升 `SAVE_VERSION`。
2. 在 `migrations.ts` 登记迁移。
3. 为旧档、坏档和新增字段补测试。
4. 用旧档手工或自动验证迁移结果。

## GameScene 与 RunSystem

`GameScene` 是局内编排器。它持有 `RunSystem[]`，按数组顺序每帧 update。系统只通过 `CombatContext` 读取世界和发起操作。

`RunSystem` 规则：

- 实现 `update(dt)`，可选 `destroy()`。
- 不拥有局外状态。
- 不越过 `CombatContext` 操作其他系统内部。
- 需要延迟时使用 `scene.time.delayedCall`。
- 需要动画时使用 tween，并确保倍速和暂停语义正确。

当前重要系统包括 WaveDirector、EnemySystem、BossController、MapMechanicSystem、WeaponManager、PlayerSystem、PickupSystem、ProjectileSystem、ZoneSystem、LevelUpSystem、AchievementTracker、DropItemSystem、DecorSystem、DpsTracker。

## CombatContext

`CombatContext` 是武器、敌人、地图机制、掉落和 Arcana 看见的世界接口。它提供：

- 当前 scene、player、run、map、stats、grid、enemies、fx。
- 伤害结算：`hitEnemy`、`damagePlayer`、`dmgLog`。
- 世界生成：敌弹、区域、光珠、金币、宝箱、掉落道具。
- 地图机制状态：风、环境减速、花粉伤害乘区、烽台 HP 乘区、障碍。
- 掉落状态：冻结、无敌、buff 乘区。
- 构筑随机：`rng()`。
- 事件通知：金币、经验、进化、敌人死亡。

新增系统能力优先扩展 `CombatContext`，避免系统之间私下互相引用。

## RunModifier

`RunModifier` 是 Arcana 和 trait 的统一扩展接口。当前钩子包括：

- `statMods`
- `modifyOffers`
- `onEnemyKilled`
- `modifyDamage`
- `onChest`
- `onTick`
- `onWeaponHit`
- `onPlayerDamaged`
- `modifyPlayerDamage`
- `onCoinPicked`
- `onGemPicked`
- `onEvolve`

钩子实现规则：

- 衍生伤害使用 `HitOpts.noHook` 防止递归。
- 需要统计时显式 `dmgLog`。
- 构筑随机走 `ctx.rng()`。
- 不要在 modifier 中持有跨局状态；闭包状态只活在本局。

## 时间与倍速

倍速由 `core/TimeController` 管理，统一同步 dt 乘子、`scene.time.timeScale` 和 `tweens.timeScale`。systems 内禁止裸 `setTimeout`，否则倍速、暂停和后台标签页都会错位。

快弹和高速投射物需要在 `effDt > 1/30` 时拆步推进，避免穿隧。参考 `systems/weapons/boomerang.ts`。

## 性能

性能策略：

- 敌人、粒子和弹体使用对象池或生命周期复用。
- SpatialGrid 减少近邻查询成本。
- 动态敌人上限 `dynCapMul` 根据 FPS 下调。
- Effects 粒子质量随性能降档。
- 地图纹理按地图懒生成和释放。

性能相关改动要同时考虑移动端和后台标签页行为。

## 测试与校验

基础命令：

```bash
npm run check:docs
npm run check:i18n
npx tsc --noEmit
npm test
npm run build
```

涉及 UI 或运行时手感时，还需要按 `qa-playtest.md` 使用 preview 泵帧、截图接收器和多视口矩阵复核。
