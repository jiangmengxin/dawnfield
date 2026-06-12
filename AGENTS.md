# AGENTS.md — 晨野 Dawnfield Agent 开发指南

面向 AI Agent（Claude Code 等）的开发手册。完整产品蓝图见 [docs/blueprint-1.0.md](docs/blueprint-1.0.md)。

## 项目概述

晨野 Dawnfield：Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。
1.0 目标：16 角色 / 8 地图 / 16 武器+16 超武 / 16 被动，分 9 个里程碑（M1-M9）实施。

**当前进度：M9 已完成（规则卡 Arcana 10 张 + 收尾——content/arcana.ts（ArcanaId×10 + ARCANA 获取规则 + ARC_FX 数值表）+ systems/arcana.ts（createArcanaModifier：RunModifier 六钩子全部实装）；开局选卡（RunState.pendingArcana → LevelUpSystem.openArcanaPick → hud:arcana 覆盖层：全部未持有卡铺成网格任选 1——横屏 5 列/竖屏 2 列、主题色顶带方卡、极矮卡自动省略描述，与升级三选一的横排大卡明显区分）；精英宝箱概率再得（buildChestReward 第二层 30%，单局上限 3 张；金币层改携带数额供 onChest 改写）；持有卡只在暂停面板展示（方形小卡行，HUD 不常显）；图鉴第六类「规则卡」（CodexCat+arcana 纯增量，首遇点亮）；设置「规则卡」开关（SaveSettings.arcana 纯增量默认开，关闭后行为与 M8 等价）+ 调试「获得规则卡」直给弹窗（绕过上限验 10 卡叠加）+「自动选卡」吞掉开局选卡时金色横幅告知；验收：10 卡叠加复合属性逐项精确、各钩子实测（专一之路过滤/罗盘开局宝箱+金币翻倍/甘露泉 25s 周期/金铃掉币）、关闭开关宝箱 100/100 无卡层、402×874/320×480/1280×800 中英文无溢出）。M1-M9 全里程碑完成，1.0 内容齐整。**

## 常用命令

```bash
npm run dev -- --port 5183 --strictPort   # 开发服务（约定端口 5183）
npx tsc --noEmit                          # 类型检查（每次改动后必跑）
npm run check:i18n                        # i18n 键覆盖校验（每内容批次必跑；build 链已含）
npm run build                             # 生产构建（含 check-i18n + tsc）
```

## 硬性约束（任何改动不得违反）

1. **零外部资源**：禁止引入图片/音频/字体文件。美术一律 Canvas 程序化纹理（`src/gfx/textures.ts`），音频一律 WebAudio 合成（`src/audio/sound.ts`）。
2. **中英双语同步**：所有面向玩家的文案走 `i18n.ts` 的 `t(key)`，新增键必须同时写 `[zh, en]` 两份。键名公约：`w_<id>(_d/_e/_e_d)` 武器、`p_<id>(_d)` 被动、`en_<id>` 敌人、`char_<id>` 角色、`map_<id>` 地图、`ach_<id>(_d)` 成就、`pu_<id>(_d)` 商店强化、`arc_<id>(_d)` 规则卡、`ui_*`/`set_*`/`scn_*` 界面。
3. **明亮童话画风**：配色只从 `src/gfx/palette.ts` 取；暖纸白底、粉彩+同系深一阶描边；UI 为纸面圆角风格。
4. **单局操作只有移动**：武器自动释放；键盘+触控双输入，输入层预留手柄扩展点。
5. **Phaser 4.x**：不降级、不换引擎、不引入额外运行时依赖。

## 架构速览

```
src/content/   ★ 纯数据层（无 Phaser）：ids player characters(16 角色 Spec) weapons(16 武器含平衡表) passives(16)
               enemies(67 敌 Spec/16 行为指派+调参) maps(MapSpec 全链路×8：波次/装饰/机制/BGM/解锁)
               bosses(BossSpec 配装表×8) shop(11 项永久强化) achievements(40 成就+check+unlockChar/unlockMap)
               arcana(10 规则卡 META+获取规则 ARCANA+数值 ARC_FX)
src/core/      events(类型化事件) router settings(门面→save) RunState(按角色重算) TimeController registry
               save/(schema/migrations/storage：v1+迁移链+损坏自愈+debounce) MetaState(局外状态单例)
               input/(键盘/触控/手柄stub)
src/ui/        Viewport(安全区/断点/缩放) UIScene(菜单基类) layout theme widgets/(8 组件)
src/scenes/    Boot Title CharacterSelect MapSelect Shop Codex Achievements Settings Game(编排器) HUD Result
src/systems/   context(CombatContext/RunSystem/RunModifier) WaveDirector(map 驱动) EnemySystem behaviors(16 模板)
               BossController(BossSpec 数据驱动) MapMechanicSystem(水皮/大风/治愈泉/顺风带/荆棘/流星雨/晨光柱)
               weapons/(基类+16武器) PlayerSystem PickupSystem(光珠+金币) ProjectileSystem ZoneSystem(slow/burn/heal/haste)
               LevelUpSystem AchievementTracker DecorSystem(map 装饰层) DpsTracker(M8 调试统计) grid effects joystick
               arcana(M9 规则卡行为工厂 createArcanaModifier)
src/gfx/       palette(全游戏配色+CHAR_PAL+POND/HILLS/GROVE/LAVENDER/BRAMBLE/NOCTURNE/SUMMIT 图色组+DEATH_COLOR) textures/(core｜characters+
               makeCharacter 配方｜enemies(草甸)｜mapassets(makeEnemy 换皮管线 18 形体+每图敌人/装饰/弹体+ensureMapAssets)｜weapons｜icons｜misc)
src/audio/     sound(SFX + BgmSpec 主题化生成式 BGM：每图调式/速度/音色/打击乐/回声)
scripts/       check-i18n.mjs(ids↔字典 diff) shot-receiver.mjs(Agent 截图接收器，验证用)
```

关键模式：对象池（敌人/粒子/弹体）、类型化事件总线（`core/events` 的 `hud:*`）、配置驱动（数值全在 content/ 调参，不碰行为代码）、空间网格索引、系统编排（GameScene 持 `RunSystem[]` 按帧序 update，系统只看 `CombatContext`）。

## UI 开发约定

- **菜单场景**继承 `UIScene`：实现 `buildLayout()`，resize/语言切换会全量重建（销毁全部 children 后重跑），不要做增量布局。
- **布局**用 `vp.safe`（安全区矩形）+ `layout.ts` 的 vstack/hstack/gridCells；字号经 `vp.fs()`、尺寸经 `vp.s()`。
- **成组按钮**统一规格 `THEME.btnW/btnH/btnFs`（240×54/19）；触控命中区 ≥ `THEME.hitMin`（44pt）。
- **图标禁用 emoji**（平台字形不一致），用 Graphics 绘制（参考 HUD 暂停图标）或程序化纹理。
- **技能槽位**是圆形令牌样式（图标纹理本身为圆形白底），见 `HUD.drawSlotRow`。
- **HUD 双形态**：`compactHud`（竖屏且短边<480）只保留 XP/HP/计时/倍速/暂停/6+6 槽位，详情进暂停面板。
- 弹窗用 `Modal.open`（自带模态栈，ESC 关最顶层）；可滚动列表用 `ScrollPanel`（卡片 onTap 要套 `dragMoved` 守卫，`CardGrid` 已自动处理）。
- **裁剪/遮罩**：Phaser 4 WebGL 不支持 `setMask`/GeometryMask（仅 console 告警不生效）；需要裁剪用 Mask filter——`obj.enableFilters()` + `obj.filters.internal.addMask(maskGfx)`（ScrollPanel 已内置，Canvas 渲染器自动回退 GeometryMask）。ScrollPanel 工作在世界坐标，放进 Modal 时按 `屏幕中心 + inner` 折算视口并 `panel.once('destroy', () => sp.destroy())`（参考 Settings.openWavePreview）。

## 游戏逻辑约定

- **时钟纪律**：倍速经 `core/TimeController`（`GameScene.setSpeed` 委托；同步 dt 乘子 + `time.timeScale` + `tweens.timeScale`），hit-stop 也在此。systems 内禁止 `setTimeout`，延迟一律 `scene.time.delayedCall`、动画一律 tween，否则倍速会错位。
- **设置即时生效**：屏幕震动（所有 `cameras.main.shake` 调用点都有 `getSettings().shake` 守卫）、伤害数字（`Effects.number` 入口守卫）、无敌/全屏拾取（调试用），新增同类效果时记得加守卫。
- **音频分轨**（M8）：`SFX.volBgm/volSfx` 两轨音量，`tone/noise` 的 `bus` 选项（默认 'sfx'）在合成时乘入轨音量——新增 BGM 侧声音记得带 `bus: 'bgm'`；静音仍走 `setMuted`（master 增益）。
- **DPS 归账**（M8 调试）：`ctx.hitEnemy` 返回实际结算伤害；武器拿到的是 WeaponManager 的归账子上下文（hitEnemy 自动记账、addZone 自动注入 `src`），武器代码无须关心；非武器来源造成伤害想进统计就显式调 `ctx.dmgLog(src, dmg)`。
- **动态敌人上限**（M8）：`GameScene.dynCapMul`（FPS<45 逐秒降至 0.4，≥57 回升）乘进 `ctx.enemyCapMul` 并联动 `Effects.setQuality` 粒子降档；测试时可覆写 `gs.sampleFps = () => 30` 模拟低帧率。
- **纹理生命周期**（M8）：进图时 `releaseMapAssets(scene, mapId)` 释放其它图的懒生成纹理（草甸 Boot 常驻不在册）；任何 UI 页要用地图纹理仍照旧先调 `ensureMapAssets`（释放后会重新生成）。
- **携带上限**：`MAX_WEAPONS/MAX_PASSIVES = 6`，选卡 offer 构建已按上限过滤。
- **进化条件**：`WeaponManager.evolvable()` = 武器满级 + 持有配对被动（mine 为任意被动满级）。
- **角色差异化**（M4 起）：`content/characters.ts` 的 `CharacterSpec` 是唯一来源——初始武器一一配对、基础 HP/移速/体积（radius）为绝对值、`mods` 属性偏移（dmg/cd/area/magnet/projSpeed/xpGain/coinGain 乘、armor/regen/crit 加）、`trail` 移动拖尾粒子（PlayerSystem 发射）；`RunState` 构造时按 charId 取 Spec，体积经 `run.char.radius` 进接触判定/影子/血条；角色纹理用 `makeCharacter` 配方（gfx/textures/characters.ts），新角色 = 一行 Spec + 一行配方 + i18n 两键。
- **角色 vs 敌人的美术分界**：敌人 = 扁平粉彩圆团 + 小点眼（`blobBody`），静态单帧；角色独占 体色径向渐变 + 异形剪影（round/drop/gem/stone/egg）+ 大双高光眼 + 常驻腮红 + 专属饰件 + 移动拖尾 + 4 帧动效（`makeCharacter` 自动生成 `key/_p1/_k/_p1_k` = 姿态A/B × 睁眼/眨眼；PlayerSystem.updateFrame 驱动：移动 0.22s/静止 0.5s 摆动一次、1.6-4.4s 随机眨眼 0.16s，困倦/眯眼角色眨眼帧反而睁眼偷看）。新增敌人不要用渐变/多帧，新增角色不要用 blobBody，保持两侧辨识差。
- **角色/地图解锁**：成就表 `unlockChar`/`unlockMap` 字段；`Meta.unlockAch` 即时应用，Boot 调 `Meta.syncAchUnlocks()` 为旧档回填。地图解锁链 = 通关上一图（meadowClear→pond，pondClear→hills）。
- **地图差异化**（M5 起）：`content/maps.ts` 的 `MapSpec` 是唯一来源——名义时长（12/15/18 分钟，Boss 苏醒时刻）、`timeK = 12/分钟`（敌人 hp/dmg 成长、弹幕缩放、BGM 强度曲线统一用「有效分钟 = elapsed/60×timeK」，长图更平缓）、纸底配色 `paperCss`、装饰层 `decor`、专属敌池波次 `waves/events`、机制 `mechanic`、`bgm` 主题、`bossId/eliteId`、解锁成就。新地图 = 一份 MapSpec + 一组 `ensureMapAssets` 纹理 + BossSpec 配装 + i18n 四键（map_<id>/_d/_win/_warn）。
- **敌人换皮管线**：`makeEnemy(scene, key, recipe)`（gfx/textures/mapassets.ts，12 形体 × 调色 × 表情，一行配方一只）；每图纹理经 `ensureMapAssets(scene, mapId)` 幂等懒生成——**Game/Codex/Achievements/MapSelect 等任何要用地图纹理的场景先调它**。敌人行为模板 12 种（behaviors.ts），调参常量全在 content/enemies.ts（HOP/DRIFT/ORBIT/SWOOP/BLINK/PULSE/TURRET/ZIGZAG）；射击类敌人配 `EnemySpec.shoot`，冲刺类可配 `EnemySpec.dash` 覆盖默认。
- **Boss 配装**：`content/bosses.ts` 的 `BossSpec` 四技能模块（ring 弹幕环/spread 瞄准扇射/summon 召唤/dash 冲撞）自由组合，`BossController` 纯数据驱动；新 Boss = ENEMIES 体格行 + BossSpec 配装 + 专属纹理。
- **地图机制**：`MapMechanicSystem` 按 `MechanicSpec` 四选一——`puddles`（周期水皮，`ZoneSpec.affectsPlayer` 让玩家也减速，PlayerSystem 接 `ctx.playerSlowAt`）/`storm`（预警→定时推挤，敌人按 knockMul 受风）/`springs`（M6 治愈泉：周期 heal 区域 + `gz_spring` 贴图，站入回血）/`gusts`（M6 花浪顺风带：haste 区域敌我同加速，`ctx.hasteMulAt` 供 EnemySystem/PlayerSystem 取乘子）。新机制在此文件加分支。
- **倍速穿隧**：快弹（敌弹/疾风镖/蒲公英种子）在 `effDt > 1/30` 时分两半步推进+判定；新增高速投射物按此模式写 update（参考 boomerang.ts 的 step 拆分）。
- **每图 BGM**：`MapSpec.bgm`（BgmSpec：bpm/音阶/低音/和弦/拨弦音色/打击乐 tick·drip·shaker/回声湿度），`SFX.startBgm(spec)` 切主题；新图配新主题即可，不改 sound.ts 结构。
- **宝箱分层**（`LevelUpSystem.buildChestReward`）：可进化→进化；否则规则卡层（M9：开关开启且未到单局上限 `ARCANA.maxPerRun` 时 30% 概率再得一张）；否则→已持有项升级×N（`CHEST.upgradeCount`）；无可升级→金币+治疗（数额随 `ChestReward` 携带，规则卡 `onChest` 可改写）。
- **局内状态**全在 `core/RunState`（hp/xp/coins/kills/passives/stats…），HUD 经 `gs.run` 读取；新系统实现 `RunSystem` 并在 `GameScene.create` 的 systems 数组注册（顺序即帧序）。
- **局外状态**全经 `core/MetaState` 的 `Meta` 单例（金币/强化/图鉴/成就/解锁/统计），改动自动 debounce 落档；商店永久强化在 `RunState.computeStats` 汇入基础值（开局快照）。
- **金币链路**：掉落在 `Game.onEnemyKilled`（概率+精英爆币）→ `PickupSystem` 金币球磁吸收取（`run.addCoins` 乘 coinGain）→ 结算/中途退出 `Meta.recordRun` 入账。
- **图鉴首遇点亮**：武器 `WeaponManager.addOrUpgrade`、被动 `LevelUpSystem.applyOne`、敌人 `EnemySystem.spawn`、角色/地图 `GameScene.create`，全走 `Meta.codexLight(cat, id)`（Set 缓存 O(1)，高频安全）。
- **成就**：条件全在 `content/achievements.ts` 的 `check(view)`；局内 `AchievementTracker` 每秒评估并发 `hud:achievement` toast，结算/商店购买后调 `evalAchievements` 补评累计类与胜利类。
- **规则卡 Arcana**（M9）：元数据/数值在 `content/arcana.ts`（ARCANA_META/ARCANA/ARC_FX），行为在 `systems/arcana.ts` 的 `createArcanaModifier(id, ctx)`（RunModifier 六钩子：statMods/modifyOffers/onEnemyKilled/modifyDamage/onChest/onTick）。获得统一走 `GameScene.grantArcana(id)`（去重 → 推 modifier 进 `modifiers` → 图鉴点亮 → 重算属性）；来源三处——开局选卡（`RunState.pendingArcana` → `LevelUpSystem.openArcanaPick` → `hud:arcana` 事件，候选 = 全部未持有卡，HUD 铺网格任选 1）、宝箱第二层（随机一张）、设置页调试直给（绕过单局上限）。持有卡展示只在暂停面板（`HUD.drawArcanaRow` 方形小卡行），HUD 战斗界面不常显。设置开关 `SaveSettings.arcana`（默认开，关闭后局内行为与 M8 等价）；`GameScene.create` 必须 `modifiers.length = 0` 重置（LevelUpSystem 持同一数组引用，不可换新数组）。新卡 = ids 联合类型 + META 行 + ARC_FX 数值 + createArcanaModifier 分支 + 图标（`icon_arc_<id>`）+ i18n 两键。

## 多分辨率验收基准（UI 改动必测）

| 场景 | 分辨率 |
|---|---|
| iPhone 17 Pro 竖屏（主要目标） | 402×874 |
| 桌面横屏（主要目标） | 1440×900 |
| 极端小屏 | 320×480 |
| 超宽屏 | 21:9（如 1260×540） |

标准：不遮挡、不溢出、可操作。

## Agent 自动化测试备忘（preview 工具）

- dev 服务配置在仓库外层 `.claude/launch.json`（dawnfield-dev，端口 5183）。
- **Phaser 4 会忽略合成 pointer 事件**（非 isTrusted），自动化点击需直接在按钮容器上 `emit('pointerup')`；递归遍历 `children.list`（含容器嵌套）筛 `o.input && o.listenerCount('pointerup') > 0`。
- **后台标签页 RAF 不跑**，且 hidden 标签页的 `setInterval` 会被浏览器节流到 ~1Hz（泵帧 interval 失效，dt 又被钳到 50ms → 游戏近乎冻结）。可靠做法是**同步批量步进**：`let t = performance.now(); for (let i = 0; i < frames; i++) { t += 16.7; game.loop.step(t); }`（一次 eval 模拟 N 帧，确定性强）。
- **操控 `dawnfield.save` 做存档测试时**，旧页面卸载会触发 pagehide flush 把内存缓存写回、覆盖你手工写入的值。先 `Storage.prototype.setItem` 打补丁屏蔽 `dawnfield.save` 写入再 reload（补丁只影响当前页面实例）。
- dev 服务长时间运行后 Vite 可能给出**陈旧的模块转换缓存**（部分文件新、部分旧的诡异混合）；怀疑时直接重启 dev 服务。
- resize 后 UIScene 重建有 150ms 防抖 + 二次校验，截图前等约 1-2 秒。
- 调试钩子：`window.__game`（Phaser.Game）、`window.__errs`（运行时错误数组）。
- **`preview_screenshot` 在后台标签页会超时**（合成器不产帧）。替代：`game.renderer.snapshot(cb)` 注册回调 → 同步泵帧触发渲染 → 回调里把图画到 2D canvas 缩放转 JPEG base64，`fetch` POST 给本地接收器落盘 `.shots/`，再用 Read 工具查看。接收器已固化为 `node scripts/shot-receiver.mjs`（端口 5199，后台跑，用完停掉）。直接 `canvas.toDataURL` 拿不到 WebGL 帧（非 preserveDrawingBuffer）。
- **后台标签页会触发自动暂停**（`hud:autopause` 失焦保护）冻结 `delayedCall`（胜利/失败结算 1.3-1.5s 延迟也会被冻住）。泵帧循环里检测 `game.scene.isPaused('game')` 则 `game.events.emit('hud:togglepause')` 自动恢复。
- **MapMechanicSystem 的机制计时是系统自身倒计时**，`debugTimeSkip` 不会推进它（波次/事件按 run.elapsed 走、会跳）。验证水皮/大风要泵真实帧等它自然触发。
- **预览视口可能塌缩成 1×N**（预览窗格隐藏时）；Phaser 以创建时的 innerWidth 定画布，必须先 `preview_resize` 恢复尺寸再 reload。
- **删除/移动模块文件后 Vite 模块图可能仍指向旧路径**（404 ERR_ABORTED 循环），重启 dev 服务即可。
- 快速到达指定状态：设置页打开「无敌/全屏拾取」可加速验证；「解锁全部内容」开关让角色/地图视为全解锁（`Meta.isUnlocked` 放行，不写 `unlocked` 列表，关闭即恢复）；强制结算可在 eval 中调 `gs.defeat()`。
- **eval 里 `import('/src/xxx.ts')` 可能拿到重复模块实例**：HMR 失效过的模块会以 `?t=` 查询串挂在模块图里，裸 URL 会让 Vite 再实例化一份（单例状态分叉、写设置不生效）。改动代码后要做模块级状态验证，先重启 dev 服务再整页 reload；或绕开 import——经 localStorage 写档后 reload、经 `__game.scene` 拿场景对象直接操作。
- **武器平衡基准**（M8 巡检用法）：固定图固定时刻给单武器满级实测 30s——`g.scene.start('game', {charId:'spark', mapId:'meadow'})` → `gs.weapons.addOrUpgrade(id)×5` → `gs.debugTimeSkip(300-elapsed)` → 泵 1800 帧 → `gs.dps.entries()` 取该武器累计差值。16 武器中位 ≈190 DPS（2026-06 M8 基线）。

## 本地存储键

| 键 | 内容 |
|---|---|
| `dawnfield.save` | 版本化存档 SaveV1 JSON：`{v, coins, powerUps, unlocked, codex{lit/seen}, achievements, stats, settings}`（settings 含语言/声音/倍速/调试项） |
| `dawnfield.save.corrupt` | 解析/校验失败时的原文备份（自愈重建前写入） |

旧散键 `dawnfield.lang/muted/volume/settings` 已作 v0 吸收（首次加载迁移后删除）。存档读写统一走 `core/save`（300ms debounce + visibilitychange/pagehide 强制 flush）；**schema 改动必须递增 `SAVE_VERSION` 并在 `save/migrations.ts` 登记迁移，用旧档验证**。

## 里程碑路线图（详见 docs/blueprint-1.0.md）

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M1 | 响应式 UI 框架 + 全界面占位 | ✅ |
| M2 | 核心重构：content 数据层、Game.ts 拆系统、CombatContext、宝箱分层、RunModifier 钩子 | ✅ |
| M3 | 存档/金币/解锁/成就/图鉴骨架 + 调试面板完善 | ✅ |
| M4 | 角色系统 + 内容批次 A（角色 1-8） | ✅ |
| M5 | 地图框架 + 地图 2-3 + 轻机制 + 倍速穿隧细化 | ✅ |
| M6 | 内容批次 B（9-12、地图 4-5） | ✅ |
| M7 | 内容批次 C（13-16、地图 6-8）补完 | ✅ |
| M8 | 设置/调试完善 + 性能与平衡 pass | ✅ |
| M9 | 规则卡 Arcana（10 张）+ 收尾 | ✅ |

**M1-M9 全部完成**：1.0 内容齐整（16 角色 / 8 地图 / 16 武器+16 超武 / 16 被动 / 67 敌 / 40 成就 / 10 规则卡，图鉴六类全覆盖）。
