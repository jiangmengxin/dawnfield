# 内容设计手册

> 事实源：`src/content/*`、`src/systems/arcana.ts`、`src/systems/traits.ts`、`src/systems/dropItems.ts`、`src/systems/mechanics/*`、`src/systems/weapons/*`。

## 内容边界

content 层是所有内容事实的唯一来源，禁止依赖 Phaser。行为系统消费 content 表；UI、图鉴、测试和文档都应从这些表解释当前状态。

当前规模：18 角色 / 8 地图 / 32 武器 + 32 超武 / 16 被动 / 73 敌 / 8 Boss / 24 规则卡 / 23 掉落道具 / 16 商店强化 / 55 成就 ID（48 当前成就 + 7 legacy）。

## 角色

角色定义在 `src/content/characters.ts`。`CharacterSpec` 包含初始武器、纹理 key、主题色、基础生命、移速、碰撞半径、视觉半径、移动拖尾、属性偏移、trait、隐藏标记和解锁成就。

设计规则：

- 常规角色在选择页和图鉴中可见；隐藏角色未解锁前不占位。
- `radius` 只影响接触判定，`artR` 决定视觉体量。
- 初始武器来自 `weapon` 字段；16 个常规角色承担原 16 把起手武器，其余 M22 武器进入升级池。
- 后期角色通过 `trait` 获得机制差异，行为在 `systems/traits.ts`。

新增角色步骤见 `docs/reference/extension-playbooks.md`。

## 地图

地图定义在 `src/content/maps.ts`。`MapSpec` 是地图全链路数据：时长、成长曲线、图标、纸底色、Boss、精英、波次、事件、装饰、机制、专属掉落、BGM 和解锁成就。

设计规则：

- 新地图必须提供核心机制，首个 `mechanics` 项决定策略轴。
- 每图至少 2 个地图专属掉落道具，并通过机制产物调用 `ctx.spawnMapDrop`。
- 所有使用地图纹理的场景必须先调用 `ensureMapAssets(scene, mapId)`。
- Boss 使用 `src/content/bosses.ts` 的配装表，避免把 Boss 逻辑写死在场景中。

## 武器与超武

武器元数据和数值在 `src/content/weapons.ts`；行为在 `src/systems/weapons/*`；图标在 `src/gfx/textures/icons.ts`；弹体和地皮在 `src/gfx/textures/weapons.ts`。

每把武器必须具备：

- `WeaponId`。
- `WEAPON_META` 行：主题色、图标、进化被动。
- `W_<ID>` 数值表。
- 行为类并在 `systems/weapons/index.ts` 注册。
- 基础与超武 i18n 四键：`w_<id>`、`w_<id>_d`、`w_<id>_e`、`w_<id>_e_d`。
- 程序化图标和必要弹体/区域纹理。

武器行为约束：

- 伤害链走 `tick()` 或 `scene.time.delayedCall`，不要依赖 tween `onComplete` 作为唯一伤害来源。
- 高速投射物在大 dt 下做半步或多步推进，避免倍速穿隧。
- 归账由 WeaponManager 子上下文处理，武器行为通常不需要手动 `dmgLog`。

## 被动

被动定义在 `src/content/passives.ts`，当前 16 个，最高 5 级。被动承担三类职责：

- 属性成长：伤害、生命、冷却、范围、磁吸、移速、弹速、暴击、护甲、回复、经验、金币。
- 进化条件：与武器一一或多对一配对。
- 构筑填充：在升级池里提供非武器成长路线。

新增被动要同步 `PassiveId`、`PASSIVE_META`、`PASSIVE_FX`、i18n、图标和武器进化引用。

## 敌人与 Boss

敌人定义在 `src/content/enemies.ts`，行为模板定义在 `src/systems/behaviors.ts`。当前 73 敌、19 行为模板、5 精英词缀。

设计规则：

- 敌人是扁平粉彩圆团、小点眼、静态单帧，避免和角色的渐变、多帧、饰件体系混淆。
- 行为模板只描述运动和攻击模式，数值调参保留在 content 表。
- 射击敌人使用 `EnemySpec.shoot`，冲刺敌人可用 `EnemySpec.dash` 覆盖默认参数。
- 高威胁行为需要足够预警线、闪白或警示环。

Boss 配装在 `src/content/bosses.ts`，由 ring、spread、summon、dash 四类模块组合。新增 Boss 要提供敌人体格、纹理、BossSpec 与地图引用。

## Arcana

Arcana 元数据和数值在 `src/content/arcana.ts`，行为在 `src/systems/arcana.ts`。当前 24 张：12 basic、12 mechanic。

设计规则：

- 每张卡必须有独特机制表达。
- 新机制优先使用现有 `RunModifier` 钩子；确实需要新钩子时先更新 `systems/context.ts` 的接口说明。
- 成就解锁通过 `unlockArcana`，不新增独立存档字段。
- 衍生伤害使用 `noHook` 防递归，必要时显式 `ctx.dmgLog('arc_<id>', dmg)`。

原 M21 设计正文归档在 `docs/archive/2026-06-14/pre-handbook-规则卡系统设计-24张机制化.md`。

## 掉落道具

掉落道具定义在 `src/content/dropItems.ts`，效果在 `src/systems/dropItems.ts`。当前 23 个：7 通用 + 16 地图专属。

设计规则：

- 触发方式固定为即拾即用，不做道具栏。
- 瞬发型立即结算；持续型进入 `DropItemSystem.active` 并在 HUD 显示倒计时。
- 持续 buff 汇总成 `DropState`，由 `GameScene.recomputeStats` 叠进局内属性。
- 图鉴复用 `codex.passives` 分类，UI 呈现为“物品”页。
- 商店 `fortune` 影响掉率，入口为 `RunState.dropRateMul`。

原 M19 设计正文归档在 `docs/archive/2026-06-14/pre-handbook-掉落道具系统设计.md`。

## 商店与经济

商店强化定义在 `src/content/shop.ts`，当前 16 项。价格曲线和总池由 `tests/shop.test.ts` 锁定，当前全部买满为 9,195 金币。

经济规则：

- 金币获取经角色、被动、商店、难度、无尽轮次衰减等乘区结算。
- 商店重置全额返还，不污染累计金币成就。
- 新经济项必须同步 `PowerUpId`、`POWERUPS`、`POWERUP_FX`、`PowerUpBonus`、i18n、商店 UI 与测试口径。

## 成就与解锁

成就定义在 `src/content/achievements.ts`，局内追踪在 `src/systems/AchievementTracker.ts`，局外补评在 `Meta.recordRun`、商店购买等入口。

成就职责：

- 奖励金币。
- 解锁角色。
- 解锁地图。
- 解锁 Arcana。
- 记录结构性挑战和长期目标。

M13 后 7 个纯计数成就移入 legacy，仅旧档已解锁时渲染。当前联合类型仍包含 55 个 ID；当前成就是 48 个，legacy 是 7 个。

## 内容校验

新增内容后至少运行：

```bash
npm run check:docs
npm run check:i18n
npx tsc --noEmit
```

涉及经济、存档、无尽、掉落或成就时补跑 `npm test` 和 `npm run build`。
