# 扩展步骤清单

本文件记录新增内容时的最小安全路径。所有步骤都以当前代码架构为准；若步骤与源码冲突，以源码为准并同步修正文档。

## 新增角色

1. 在 `src/content/ids.ts` 追加 `CharacterId`。
2. 在 `src/content/characters.ts` 增加 `CharacterSpec`，包含初始武器、体格、主题色、trail、mods、解锁成就。
3. 如需要专属机制，追加 `TraitId`、`TRAIT_FX` 和 `systems/traits.ts` 分支。
4. 在 `src/gfx/textures/characters.ts` 增加 `makeCharacter` 配方。
5. 在 `src/i18n.ts` 增加 `char_<id>` 和 `char_<id>_d`。
6. 如非默认可用，在 `achievements.ts` 增加或复用 `unlockChar`。
7. 运行 `npm run check:docs && npm run check:i18n && npx tsc --noEmit`。

## 新增地图

1. 在 `MapId` 追加 id。
2. 在 `src/content/maps.ts` 增加完整 `MapSpec`。
3. 在 `src/content/bosses.ts` 增加 Boss 配装。
4. 在 `src/gfx/textures/mapassets.ts` 增加敌人、装饰、弹体和 `ensureMapAssets` 接入。
5. 如有新机制，新增 `systems/mechanics/<kind>.ts` 并在 `systems/mechanics/index.ts` 注册。
6. 增加地图专属掉落道具或复用现有道具池。
7. 在 `src/i18n.ts` 增加 `map_<id>`、`map_<id>_d`、`map_<id>_win`、`map_<id>_warn`。
8. 增加或复用 `unlockMap` 成就。
9. 补充 `tests/endless.test.ts` 的时长、Boss 事件和机制 sanity 口径。

## 新增武器

1. 在 `WeaponId` 追加 id。
2. 在 `WEAPON_META` 增加主题色、图标、进化被动。
3. 在 `weapons.ts` 增加 `W_<ID>` 数值表。
4. 新增 `src/systems/weapons/<id>.ts` 行为类，并在 `systems/weapons/index.ts` 注册。
5. 在 `gfx/textures/icons.ts` 增加 `icon_<id>`。
6. 如需弹体、区域或地皮，在 `gfx/textures/weapons.ts` 增加程序化纹理。
7. 在 `i18n.ts` 增加四键：基础名、基础描述、超武名、超武描述。
8. 隔离跑 DPS bench 或局部验伤，确认归账和倍速穿隧。

## 新增被动

1. 在 `PassiveId` 追加 id。
2. 在 `PASSIVE_META` 增加图标和主题色。
3. 在 `PASSIVE_FX` 增加数值。
4. 在 `RunState.computeStats` 接入属性。
5. 在 `i18n.ts` 增加 `p_<id>` 和 `p_<id>_d`。
6. 如作为进化条件，更新对应 `WEAPON_META.evolvesWith`。

## 新增敌人或行为

1. 在 `EnemyId` 或 `BehaviorId` 追加 id。
2. 在 `src/content/enemies.ts` 增加 `EnemySpec` 或行为参数。
3. 新行为在 `systems/behaviors.ts` 增加函数并注册到 `BEHAVIORS`。
4. 在 `gfx/textures/mapassets.ts` 增加敌人 recipe。
5. 在地图 `waves/events` 中引用。
6. 在 `i18n.ts` 增加 `en_<id>`。
7. 若是高威胁行为，补预警、音效和测试路径。

## 新增 Arcana

1. 在 `ArcanaId` 追加 id。
2. 在 `ARCANA_META` 增加 id、色彩、图标、tier。
3. 在 `ARC_FX` 增加调参数值。
4. 在 `systems/arcana.ts` 实现 `RunModifier`。
5. 如需要新钩子，先扩展 `systems/context.ts` 的接口和调用点。
6. 在 `gfx/textures/icons.ts` 增加 `icon_arc_<id>`。
7. 在 `i18n.ts` 增加 `arc_<id>` 和 `arc_<id>_d`。
8. mechanic 卡要在 `achievements.ts` 挂 `unlockArcana`。

## 新增掉落道具

1. 在 `DropItemId` 追加 id。
2. 在 `DROP_ITEMS` 增加 spec，通用道具进入 common 池，地图道具由 `MapSpec.drops` 引用。
3. 在 `DROP_EFFECTS` 增加效果。
4. 在 `gfx/textures/misc.ts` 增加或复用 glyph。
5. 在 `i18n.ts` 增加 `drop_<id>` 和 `drop_<id>_d`。
6. 更新 `tests/dropItems.test.ts` 预期。

## 新增商店强化

1. 在 `PowerUpId` 追加 id。
2. 在 `POWERUPS` 增加 spec 和价格规则。
3. 在 `POWERUP_FX` / `PowerUpBonus` / `powerUpBonus` 接入效果。
4. 在 `RunState` 或对应系统消费加成。
5. 在 `i18n.ts` 增加 `pu_<id>` 和 `pu_<id>_d`。
6. 更新 `tests/shop.test.ts` 的价格和总池口径。

## 新增成就或存档字段

成就：

1. 在 `AchievementId` 追加 id。
2. 在 `ACHIEVEMENTS` 增加 spec、`check(view)`、奖励和解锁字段。
3. 若需要新视图字段，扩展 `AchView` 和对应汇总入口。
4. 在 `i18n.ts` 增加 `ach_<id>` 和 `ach_<id>_d`。

存档字段：

1. 判断是否可用现有宽容字段承载；不能承载时提升 `SAVE_VERSION`。
2. 更新 `SaveV2`、`defaultSave`、`sanitize`。
3. 在 `migrations.ts` 增加迁移。
4. 补旧档迁移和损坏自愈测试。
