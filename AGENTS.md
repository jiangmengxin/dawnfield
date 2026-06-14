# AGENTS.md — 晨露之野 Dawnfield Agent 开发指南

面向 AI Agent（Claude Code 等）的开发手册。当前事实表见 [docs/当前项目状态.md](docs/当前项目状态.md)，完整产品蓝图见 [docs/blueprint-1.0.md](docs/blueprint-1.0.md)。

## 项目概述

晨露之野 Dawnfield：Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。
当前为 1.0+ 扩展态：18 角色 / 8 地图 / 32 武器+32 超武 / 16 被动 / 73 敌 / 24 规则卡 / 23 掉落道具。

**当前进度：M1-M16.5、M18-M22 均已完成。M17 视觉/手感强化已被后续内容吸收；M18 地图核心机制、M19 掉落道具、M20 模式开关/突破、M21 规则卡 24 全机制化、M22 武器扩充至 32 把均已落地。旧规划文档已归档到 `docs/archive/2026-06-14/`，新任务优先以当前代码和 `docs/当前项目状态.md` 为准。**

## 常用命令

```bash
npm run dev -- --port 5183 --strictPort   # 开发服务（约定端口 5183）
npx tsc --noEmit                          # 类型检查（每次改动后必跑）
npm run check:i18n                        # i18n 键覆盖校验（每内容批次必跑；build 链已含）
npm run build                             # 生产构建（含 check-i18n + tsc）
```

## 硬性约束（任何改动不得违反）

1. **零外部资源**：禁止引入图片/音频/字体文件。美术一律 Canvas 程序化纹理（`src/gfx/textures.ts`），音频一律 WebAudio 合成（`src/audio/sound.ts`）。
2. **中英双语同步**：所有面向玩家的文案走 `i18n.ts` 的 `t(key)`，新增键必须同时写 `[zh, en]` 两份。键名公约：`w_<id>(_d/_e/_e_d)` 武器、`p_<id>(_d)` 被动、`en_<id>` 敌人、`char_<id>` 角色、`map_<id>` 地图、`ach_<id>(_d)` 成就、`pu_<id>(_d)` 商店强化、`arc_<id>(_d)` 规则卡、`trait_<id>(_d)` 角色机制、`affix_<id>` 精英词缀、`ui_*`/`set_*`/`scn_*` 界面。
3. **明亮童话画风**：配色只从 `src/gfx/palette.ts` 取；暖纸白底、粉彩+同系深一阶描边；UI 为纸面圆角风格。
4. **单局操作只有移动**：武器自动释放；键盘+触控双输入，输入层预留手柄扩展点。
5. **Phaser 4.x**：不降级、不换引擎、不引入额外运行时依赖。

## 架构速览

```
src/content/   ★ 纯数据层（无 Phaser）：ids player characters(18 角色 Spec，含 2 secret) weapons(32 武器含平衡表) passives(16)
               enemies(73 敌 Spec/19 行为指派+调参) maps(MapSpec 全链路×8：波次/装饰/机制/BGM/解锁)
               bosses(BossSpec 配装表×8) shop(16 项永久强化) achievements(48 成就+LEGACY 7+check+unlockChar/unlockMap/unlockArcana/rewardCoins)
               arcana(24 规则卡 META 含 tier 基础/机制+获取规则 ARCANA+数值 ARC_FX) affixes(M15 精英词缀 AFFIX 调参+AFFIX_COLOR 标识色) dropItems(M19 掉落道具)
src/core/      events(类型化事件) router settings(门面→save) RunState(按角色重算) TimeController registry
               save/(schema/migrations/storage：v1+迁移链+损坏自愈+debounce) MetaState(局外状态单例)
               input/(键盘/触控/手柄stub)
src/ui/        Viewport(安全区/断点/缩放) UIScene(菜单基类) layout theme widgets/(8 组件)
src/scenes/    Boot Title CharacterSelect MapSelect Shop Codex Achievements Settings Game(编排器) HUD Result
src/systems/   context(CombatContext/RunSystem/RunModifier) WaveDirector(map 驱动) EnemySystem behaviors(19 模板)
               BossController(BossSpec 数据驱动) MapMechanicSystem(M18 多机制调度+legacy 风味机制)
               weapons/(基类+32武器) PlayerSystem PickupSystem(光珠+金币+掉落道具) ProjectileSystem ZoneSystem(slow/burn/heal/haste)
               LevelUpSystem AchievementTracker DecorSystem(map 装饰层) DpsTracker(M8 调试统计) grid effects joystick
               arcana(24 规则卡行为工厂 createArcanaModifier) traits(M14/M16 角色机制)
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
- **地图差异化**（M5 起，M18 扩展）：`content/maps.ts` 的 `MapSpec` 是唯一来源——名义时长（10/20/30 分钟档，Boss 苏醒时刻）、`timeK = 12/分钟`（敌人 hp/dmg 成长、弹幕缩放、BGM 强度曲线统一用「有效分钟 = elapsed/60×timeK」，长图更平缓）、纸底配色 `paperCss`、装饰层 `decor`、专属敌池波次 `waves/events`、多机制数组 `mechanics`、地图掉落 `drops`、`bgm` 主题、`bossId/eliteId`、解锁成就。新地图 = 一份 MapSpec + 一组 `ensureMapAssets` 纹理 + BossSpec 配装 + i18n 四键（map_<id>/_d/_win/_warn）。
- **敌人换皮管线**：`makeEnemy(scene, key, recipe)`（gfx/textures/mapassets.ts，18 形体 × 调色 × 表情，一行配方一只）；每图纹理经 `ensureMapAssets(scene, mapId)` 幂等懒生成——**Game/Codex/Achievements/MapSelect 等任何要用地图纹理的场景先调它**。敌人行为模板 19 种（behaviors.ts），调参常量全在 content/enemies.ts；射击类敌人配 `EnemySpec.shoot`，冲刺类可配 `EnemySpec.dash` 覆盖默认。
- **Boss 配装**：`content/bosses.ts` 的 `BossSpec` 四技能模块（ring 弹幕环/spread 瞄准扇射/summon 召唤/dash 冲撞）自由组合，`BossController` 纯数据驱动；新 Boss = ENEMIES 体格行 + BossSpec 配装 + 专属纹理。
- **地图机制**：M18 起 `MapMechanicSystem` 调度 `MechanicSpec[]`，机制模块在 `systems/mechanics/`。核心机制包括 `bloomfield`/`tide`/`wind`/`sporechain`/`pollen`/`thornwall`/`nightfall`/`beacon`；旧 `puddles`/`storm`/`springs`/`gusts`/`brambles`/`starfall`/`dawnpillar` 作为 legacy 风味机制保留。新机制优先加独立模块并在 mechanics 注册表接入。
- **倍速穿隧**：快弹（敌弹/疾风镖/蒲公英种子）在 `effDt > 1/30` 时分两半步推进+判定；新增高速投射物按此模式写 update（参考 boomerang.ts 的 step 拆分）。
- **每图 BGM**：`MapSpec.bgm`（BgmSpec：bpm/音阶/低音/和弦/拨弦音色/打击乐 tick·drip·shaker/回声湿度），`SFX.startBgm(spec)` 切主题；新图配新主题即可，不改 sound.ts 结构。
- **宝箱分层**（`LevelUpSystem.buildChestReward`）：可进化→进化；否则→已持有项升级×N（`CHEST.upgradeCount`）；无可升级→金币+治疗（数额随 `ChestReward` 携带，规则卡 `onChest` 可改写）。M19 起 Arcana 改走专用 Arcana 宝箱/开局选卡链路，不再把普通宝箱随机层当主入口。
- **局内状态**全在 `core/RunState`（hp/xp/coins/kills/passives/stats…），HUD 经 `gs.run` 读取；新系统实现 `RunSystem` 并在 `GameScene.create` 的 systems 数组注册（顺序即帧序）。
- **局外状态**全经 `core/MetaState` 的 `Meta` 单例（金币/强化/图鉴/成就/解锁/统计），改动自动 debounce 落档；商店永久强化在 `RunState.computeStats` 汇入基础值（开局快照）。
- **金币链路**：掉落在 `Game.onEnemyKilled`（概率+精英爆币）→ `PickupSystem` 金币球磁吸收取（`run.addCoins` 乘 coinGain）→ 结算/中途退出 `Meta.recordRun` 入账。
- **图鉴首遇点亮**：武器 `WeaponManager.addOrUpgrade`、被动 `LevelUpSystem.applyOne`、敌人 `EnemySystem.spawn`、角色/地图 `GameScene.create`，全走 `Meta.codexLight(cat, id)`（Set 缓存 O(1)，高频安全）。
- **成就**：条件全在 `content/achievements.ts` 的 `check(view)`；局内 `AchievementTracker` 每秒评估并发 `hud:achievement` toast，结算/商店购买后调 `evalAchievements` 补评累计类与胜利类。
- **规则卡 Arcana**（M21 后共 24 张，旧数值卡也已机制化）：元数据/数值在 `content/arcana.ts`（ARCANA_META 含 tier/ARCANA/ARC_FX），行为在 `systems/arcana.ts` 的 `createArcanaModifier(id, ctx)`（RunModifier 钩子：statMods/modifyOffers/onEnemyKilled/modifyDamage/onChest/onTick/onWeaponHit/onPlayerDamaged/modifyPlayerDamage/onCoinPicked/onEvolve/onGemPicked 等）。机制卡入池过 `Meta.isArcanaUnlocked`（查 unlockArcana 挂钩成就，零存档字段）；新机制卡 = ids + META(tier:'mechanic') + ARC_FX + modifier 分支 + 挂钩成就 unlockArcana + 图标 + i18n 两键。M13 起「构筑随机」新代码一律走 `ctx.rng()`。获得统一走 `GameScene.grantArcana(id)`（去重 → 推 modifier 进 `modifiers` → 图鉴点亮 → 重算属性）；来源以开局选卡、专用 Arcana 宝箱、设置页调试直给为主，调试直给绕过单局上限。持有卡展示只在暂停面板（`HUD.drawArcanaRow` 方形小卡行），HUD 战斗界面不常显。设置开关 `SaveSettings.arcana`（默认开，关闭后局内行为与 M8 等价）；`GameScene.create` 必须 `modifiers.length = 0` 重置（LevelUpSystem 持同一数组引用，不可换新数组）。

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
- **武器平衡基准**：`docs/balance/dps-M12.md` 仍是 16 武器历史基准；M22 扩到 32 武器后需要重跑新版 bench。隔离验伤时只挂目标武器，`addOrUpgrade(id)×5` 或强制 `evolve(id)` 后泵帧读取 `gs.dps.totals`，避免快武器清场把慢/AoE 武器饿成 0。

## 本地存储键

| 键 | 内容 |
|---|---|
| `dawnfield.save` | 版本化存档 SaveV2 JSON：`{v, coins, powerUps, unlocked, codex{lit/seen}, achievements, stats, settings, endless, hyper, tipsSeen}`（settings 含语言/声音/倍速/调试项；endless/hyper 为 M11 每图无尽最佳与狂暴档位，tipsSeen M14 起由 TipSystem 消费——每条引导全存档生命周期一次；stats.winsByChar M13 起由 recordRun 入账、fiveCharWins 消费；stats.affixKills M15 起由 recordRun 入账、affixSlayer 消费；`powerUps.fortune` 为 M19 掉落率强化） |
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
| M10 | 发行补强首期：重抽/放逐/跳过、复活、商店扩展到 15 项（历史方案见 docs/archive/2026-06-14/发行补强开发方案-M10-M15.md） | ✅ |
| M11 | 无尽模式 + 狂暴两档 + 存档 v2 + 4 新成就 + MapSelect 改版 | ✅ |
| M12 | 手感与数值打磨：时长三档/晨露精华/surge/打击感分级/可读性规范/UI 打磨/DPS bench（历史方案见 docs/archive/2026-06-14/游戏内容优先开发方案-M12-M20.md） | ✅ |
| M13 | 构筑深度 I：5 新钩子 + Stats 3 字段、6 张机制 Arcana（成就解锁）、成就重构（7 结构性挑战 + LEGACY + unlockArcana/rewardCoins 挂钩） | ✅ |
| M14 | 构筑深度 II：5 角色专属 trait（wisp/berry/toot/ivy/jingle）+ 进化引导三件套（选卡角标/图鉴配方/首局 tips） | ✅ |
| M15 | 敌人行为扩展与精英词缀：3 新行为模板（exploder/shielder/summoner）+ 6 新敌人图 4-8 后段入池 + 5 精英词缀（狂暴 II/无尽 2 轮起）+ 剪影强化 + 2 新成就 | ✅ |
| M16 | 秘密内容：2 隐藏角色（blobby/nova，secret 不占位）+ 2 彩蛋链（草甸发光花圃/夜原流星雨反用）+ 隐藏成就（hidden ？？？行）+ 揭示动效 | ✅ |
| M16.5 | 体验修补：触控摇杆黏滞、放逐改版、宝箱多件展示、结算居中 | ✅ |
| M18 | 地图核心机制重构：`MechanicSpec[]` 并行调度 + 八图核心机制 | ✅ |
| M19 | 一次性掉落道具：7 通用 + 16 地图专属，商店 `fortune` 强化 | ✅ |
| M20 | 模式开关重做：无尽/狂暴/规则卡/随机/2x/突破可组合 | ✅ |
| M21 | Arcana 扩至 24 张，并将旧数值卡全机制化 | ✅ |
| M22 | 武器扩充至 32：参考吸血鬼幸存者补 16 把全新机制武器+16 超武（柳叶镖/旋翅果/流光球/朝露瓶/落晖/候鸟/跳跳豆/晨星杖/花粉拂/泡泡弹/月华引/光矛/群蜂/坠星/晨霜/卷叶风），机制/特效全互异，各配专属图标+弹体/地皮纹理；图鉴目标 16→32，调试「获得武器」弹窗双列防溢出。**美术统一 pass**：6 把违和武器换柔和田园类型（钢刀斧剑/地狱火/喷火龙/卡通炸弹 → 柳叶/翅果/晨光/花粉/泡泡），bolt 去与 spark 撞车（闪电→晨光柱）、meteor 去火石（→发光流星），frost 软化（凛霜→晨霜）（详见文末要点） | ✅ |

**当前内容口径**：1.0 原始目标已完成并扩展为 18 角色 / 8 地图 / 32 武器+32 超武 / 16 被动 / 73 敌 / 48 当前成就+7 legacy / 24 规则卡 / 23 掉落道具。M10-M16.5 与 M18-M22 的长篇历史设计保留在归档文档和下方要点中，新任务以 `docs/当前项目状态.md` 为准。

M10 要点：升级三选一支持重抽（R）/放逐（B；M16.5 起改为与重抽/跳过同排的按钮，进入选卡放逐模式，含宝箱升级层整局生效）/跳过（S），次数 = 1 + 商店等级；复活（`RunState.revivesLeft`，半血归来 + 2 秒无敌 + 清屏脉冲——计入击杀但经 `PickupSystem.suppressDrops` 总闸抑制一切掉落，含规则卡钩子产币，防送死换收益）；M10 时商店扩至 15 项，M19 后新增 `fortune` 成为 16 项，当前总池由 `tests/shop.test.ts` 锁定为 9,195。纯数据层单测：`npm test`（vitest，覆盖价格曲线/总池/存档 sanitize 宽容性——调经济参数后须同步 `tests/shop.test.ts` 的口径数字）。

M12 要点（手感与数值打磨，历史方案见 docs/archive/2026-06-14/游戏内容优先开发方案-M12-M20.md 第四章）：**地图时长三档** = 10（meadow/pond/hills，xpK 1.2/1.5/1.8 补偿短图升级节奏）/ 20（grove/lavender/bramble）/ 30 分钟（nocturne/summit），波次 `from` 与事件 `t` 等比缩放、boss 事件恒 = minutes×60（tests/endless.test.ts 卡口），`MapSpec.xpK` 经 `RunState.mapXpK` 进 `addXp`。**晨露精华（Limit Break）**：满构筑（候选耗尽）时升级三选一替换为 3 张精华卡（伤害+2%/冷却−1.5%/范围+2%，`content/player.ts ESSENCE`）+ 回血卡；`RunState.essence` 三轴计数进 `computeStats`（cd 乘方叠加防越 0.4 下限）；精华局禁 reroll（HUD 侧）、banish 天然不可用、skip 照常；结算页显示 ✦×N（`RunResult.essence`）。**surge 中场事件**：`WaveEvent kind:'surge'`（后 4 图中点 t=minutes×30，n 只精英环形包围 + `surgeWarn` 横幅 + `ctx.bgmBoost(18)` 强度抬升 + 75s 内精英击杀未增则玩家旁保底宝箱）；surge 不得落入无尽重放窗口（测试卡口）。**打击感分级**：`HITFEEL` 常量表——大伤害（≥80×stats.dmg）/暴击 → 0.03s 微顿帧（`Game.requestHitStop` 预算器，每秒 ≤0.12s，`ctx.hitStop` 已统一走预算）+ 数字放大变色 + 音高上抬；同目标 120ms 内伤害数字合并（`Effects.number` 的 key 参）；精英死亡 = 双环冲击波 + 0.08s 顿帧 + 低频 boom。**可读性规范**：敌方弹体 8 类统一走 `makeBulletTex`（暗描边 + 纸白外发光，gfx/textures/core.ts）；dash/swoop 预警线 `Effects.teleLine`（统一警示色 0xE06060、时长 ≥0.45s，snippy telegraph 0.4→0.45）；ambush 惊醒闪白 + 警示环；拾取物渲染深度 1100+y×0.01（敌人 1000+y×0.01 之上）。**UI**：暂停面板 = 构筑摘要 + 六项核心属性实时值 + 精华计数（h≥560）；选卡面板顶部 12 格构筑微缩条（`HUD.addBuildBar`，h≥560）；MapSelect 改两组常显开关（模式 + 难度，点图直接开局，逐图解锁约束以卡面提示 + toast 表达）；图鉴六类全部带简短详情（敌人显示基础生命/移速 + 精英/首领标签）；商店三分组小节头（局内操控/战斗/资源）+ lv≥5 阶梯溢价 ×2/×3/×4（M12 当时总池 9,906→8,690，M19 后当前测试口径为 9,195）。**DPS bench**（仅 DEV）：设置调试区「DPS 基准」→ `game` 场景 `bench:true`（无波次/机制/成就，`benchTick/benchReset`）+ `src/dev/bench.ts` 驱动（三环 24 标靶 r56/110/260、16 武器×{Lv5,进化}×3 轮、每项 60s 加速模拟、真实时钟伤害背压排空 450ms），结果出 console.table + `window.__benchResult`，落档 `docs/balance/dps-M12.md`。M22 后需重跑 32 武器新版基准。

M13 要点（构筑深度 I，历史方案见 docs/archive/2026-06-14/发行补强开发方案-M10-M15.md 第六章）：**钩子地基** = RunModifier 新增 5 钩子（onWeaponHit/onPlayerDamaged/modifyPlayerDamage/onCoinPicked/onEvolve，全部可选零卡零开销）；调用点：`Game.hitEnemy` 末尾（`inOnHit` 守卫防同步递归 + `HitOpts.noHook` 标记钩子衍生伤害——延迟结算会跑出守卫窗口，必须显式标记）、`Game.damagePlayer`（modifyPlayerDamage 在 iframe 判定后扣血前，返回 ≤0 不扣血不进 iframe；onPlayerDamaged 在扣血后败北判定前，raw=护甲前）、`PickupSystem` 经 `ctx.notifyCoinPicked`、`WeaponManager.evolve` 经 `ctx.notifyEvolve`（进化唯一入口，兼记 `run.firstEvolveAt`）。**Stats 3 字段** = `healMul`（`RunState.heal` 统一乘入，覆盖 regen/爱心/选卡回血/治愈泉全部入口）/`maxWeapons`（buildCands 与 HUD 槽位读此值）/`offers`（buildOffers 张数，M14 ivy 消费）。**ctx.rng()** = 构筑随机统一入口（M13 起新随机一律走它）。**6 张机制 Arcana**（`ArcanaMeta.tier:'mechanic'`，数值 ARC_FX）：splinter 裂光回响（命中 25% 迸 3 光屑 ×35%，星屑 tween 0.15s 飞行，noHook 不再回响）/thorncore 荆棘之心（护甲前承伤蓄能 35% maxHp → 新星 ×8 上限 1500×dmg）/vow 燃晖之誓（healMul=0 + dmg×1.45 + area×1.15，爱心转 2 金币在 PickupSystem 按 `stats.healMul<=0` 通用判定）/allin 孤注一掷（maxWeapons=4 + cd×0.6）/slowburn 凝光（cd×1.6 dmg×2.2 area×1.25）/dawnfield 晨光领域（0.5s 周期 magnet×0.9 域内 6×dmg/s 灼烧 + magnet×1.15）；arc_splinter/arc_thorncore/arc_dawnfield 经 `ctx.dmgLog` 入 DPS 占比口径。**解锁** = 零存档字段：`Meta.isArcanaUnlocked` 查 `AchievementSpec.unlockArcana` 挂钩成就；开局/宝箱卡池过滤，调试直给不受限；M21 后图鉴 arcana 已扩至 24。**成就重构** = 7 纯计数（kills5000/10000、coins5000、runs20/50、buy10/25）移入 `LEGACY_ACHIEVEMENTS`（仅已解锁档渲染于成就页 legacy 区，永不回收），7 结构性挑战顶替；当前成就总量为 48 + legacy 7。

M14 要点（构筑深度 II，历史方案见 docs/archive/2026-06-14/发行补强开发方案-M10-M15.md 第七章）：**角色 trait** = `CharacterSpec.trait?: TraitId`（ids.ts 新联合类型）+ 数值表 `TRAIT_FX`（content/characters.ts，调参只改 content）+ 行为 `systems/traits.ts` 的 `createTraitModifier(id, ctx, weapons)`（纯函数注册表，完全复用 M13 RunModifier 钩子，M16 隐藏角色直接复用）；`GameScene.create` 在一切 arcana 之前 push。五机制：wisp 轻盈残影 / berry 甜食小铺 / toot 晨光大合奏 / ivy 收集家 / jingle 进化共鸣。trait 衍生伤害一律 `noHook + dmgLog('trait_*')`。M16 又补入 `bouncy` 与 `comet`，当前 trait 总数 7。进化引导包括选卡角标、图鉴武器配方、首局 tips。

M15 要点（敌人行为扩展与精英词缀，历史方案见 docs/archive/2026-06-14/游戏内容优先开发方案-M12-M20.md 第七章）：**3 新行为模板**（behaviors.ts 16→19）——`exploder` 自爆 / `shielder` 护盾光环 / `summoner` 召唤。**6 新敌人后段入池**：bombcap / hivebud / husker / novamote / duskward / shadowmaw。**精英词缀**：swift / bulwark / splitting / gravitic / volley。**2 新成就**：affixSlayer / graviticEscape。

M16 要点（秘密内容，历史方案见 docs/archive/2026-06-14/游戏内容优先开发方案-M12-M20.md 第八章）：**2 隐藏角色** = `CharacterSpec.secret`（未解锁时 CharacterSelect/Codex 不占位不显示）——blobby + nova。**2 彩蛋链**：草甸发光花圃、夜原流星反用。**隐藏成就**：secretBloom→blobby、stargazer→nova；未达成时成就页隐藏条件与奖励。

M16.5 体验修补（四项）：**触控摇杆黏滞修复**——场景暂停（升级选卡/宝箱/暂停面板）期间收不到 pointerup，恢复后人物朝旧摇杆方向自走；Joystick 监听场景 PAUSE 即重置 + `poll()` 每帧轮询指针物理状态兜底（TouchSource.active 调用），并补 destroy 链。**放逐改版**——卡面 ✕ 角标 → 与重抽/跳过同排按钮（lvl_banish/lvl_banishCancel/banishPick 3 键，B 键同效）：点击进入选卡放逐模式（可放逐卡红 ✕ 脉动角标、不可放逐卡减淡、卡组上缘提示行），点卡红章盖卡 + 碎屑演出（`banishAnim` 屏蔽输入）后原位补抽；`makePickCard` 返回容器、`closeOverlay` 复位模式状态。**宝箱多件展示**——3/5 件从清单小图标改为金光令牌阵列（与单件同档演出）：大图标（56px 归一，coin 18px 源纹理也等大）+ 光晕呼吸 + 星屑迸出 + SFX.pickup(i) 音阶上行逐个入场，窄屏（<620）5 件拆 3+2 两行。**结算页居中**——标题尾随全角标点（！/…）按字号右移补偿；统计块标签列（CJK 宽）与数值列（短数字）实测宽度差的一半作对齐轴右移量，金币图标改跟随数值宽度。注意：Phaser 4 TweenManager 走真实时钟，同步泵帧（`loop.step`）只推进 dt 侧系统，验证 tween 演出要跨 eval 留真实时间。

M11 要点：**无尽** = 虚拟时间窗循环（`WaveDirector`：Boss 时刻后按虚拟时间复用 `[bossT−300, bossT)` 峰值波次 + 窗口事件按轮偏移重放 → Boss 每轮末重临、第 3 轮起带 2 精英护卫；数值表 `content/endless.ts`，轮乘区叠在 hpScale 自然增长上；**轮次推进放在事件处理之后**——结束第 k 轮的 Boss 持第 k 轮乘区，首 Boss 与普通模式同强度）；无尽 Boss 击杀不结算（`Game.endlessBossDown`：宝箱 + 25 基础金币 + 全场磁吸）；金币轮衰减只作用局内收益（`RunState.addCoins`，×max(0.4, 1−0.12k)）。**狂暴** = `content/difficulty.ts` 三档纯敌方乘区（不加玩家 debuff），与无尽正交相乘；解锁链 = 通关本图 → 狂暴 I → 狂暴 II（`save.hyper`），狂暴 II 精英事件双刷。**存档 v2**（一次迁移）：新增 `endless/hyper/tipsSeen/stats.winsByChar`，sanitize 走 MapId 白名单 + num 钳制；`Meta.recordRun` 扩参并返回是否破无尽纪录。4 新成就（hyperClear1/hyperAll/endless3/endless6；`AchievementSpec.rewardCoins` 经 `addCoins(n,false)` 发放不污染 coins 成就链）；MapSelect 顶部 Tabs（普通/无尽）+ 已通关图难度弹窗（无任何解锁时直接开局不弹窗）；HUD 轮次横幅走金色 toast 队列（轮边界与 Boss 横幅同帧，warnText 会被覆盖）；Result 无尽标题「坚守了 N 轮」+ 新纪录标记，retry 沿用 mode/diff。单测 `tests/endless.test.ts` 锁数值口径（轮边界/金币衰减/每图 boss 事件时刻 = minutes×60，调参后须同步）。

M22 要点（武器扩充至 32，参考吸血鬼幸存者；机制/特效全互异，避免雷同；id 不变、仅 i18n 名/配色/贴图/特效贴主题）：**16 把新武器**（ids.ts WeaponId 16→32，批次 D/E/F）——`dagger` 柳叶镖（朝移动方向甩穿透飞叶，进化千叶）/ `axe` 旋翅果（抛物上抛旋转翅果下落穿透高伤，进化千旋翅扇形多枚）/ `fireball` 流光球（缓行晨光球穿透全场+沿途 burn 灼光地皮，进化赤曦）/ `flask` 朝露瓶（抛瓶碎裂留 burn DoT 露洼，进化朝露潮）/ `bolt` 落晖（天降晨光柱随机劈落 n 敌+小爆，进化万道霞光）/ `bird` 候鸟（远轨巡飞伙伴+周期俯冲扫线，进化双飞加鸟）/ `ricochet` 跳跳豆（撞相机 worldView 边反弹久留可重复命中，进化乱弹）/ `wand` 晨星杖（自动锁最近 n 敌高频单发，进化圣星杖近无冷却+穿透）/ `breath` 花粉拂（朝向持续喷发光花粉锥 tick 灼烧，进化花粉风暴更宽更远）/ `bomb` 泡泡弹（抛泡涨大到极限啵破+击退，进化连环泡迸子泡）/ `gravity` 月华引（定点漩涡吸拢+持续灼蚀、消散内爆，进化食蚀井）/ `sword` 光矛（朝前细长晨光突刺高单体，进化贯日追射延伸光刃）/ `swarm` 群蜂（乱舞蜂群在身周反复叮咬，进化蜂巢）/ `meteor` 坠星（预警后发光流星坠地巨爆+震屏+星坑 burn，进化流星雨）/ `frost` 晨霜（霜锥命中碎裂溅射+留 slow 霜地，进化霜华）/ `tornado` 卷叶风（游走旋风柱反复卷击+切向旋舞击退，进化落叶旋）。**美术统一 pass（M22.1）**：初版 6 把违和（dagger 钢刀/axe 战斧/sword 钢剑/bomb 卡通炸弹/fireball 业火 Hellfire/breath 龙息喷火）+ bolt 闪电与 spark 撞车 + meteor 火石——全部按游戏「晨光/田园」语汇重做（柳叶/枫翅果/晨光长矛/泡泡/晨光球/花粉/晨光柱/发光流星），配色压成柔和粉彩、`WEAPON_META.color` 与行为内 *_COLOR 常量、图标、弹体/地皮纹理、粒子色、音效（zap→beam、boom→splash）同步换主题；`w_emberpool` 由橙红火痕改暖金灼光（流光球/坠星共用），`w_flame` 由火舌改花粉绒粒。机制逻辑零改动。**集成全数据驱动**：每把 = ids 联合类型 + `WEAPON_META` 行（color/icon/evolvesWith）+ 平衡表 `W_<ID>`（content/weapons.ts）+ 行为类（systems/weapons/<id>.ts，工厂 index.ts 注册）+ 图标 `icon_<id>`（gfx/textures/icons.ts）+ 弹体/地皮纹理（gfx/textures/weapons.ts，全程序化 Canvas 绘制，含 burn 地皮 w_dewpool/w_emberpool、slow 地皮 w_frost）+ i18n 四键（`w_<id>(_d/_e/_e_d)`）；升级三选一/图鉴/调试「获得武器」均遍历 `WEAPON_META` 自动入池，角色配置零改动（16 角色仍各配 1 把起手武器，其余 16 把仅升级池可得）。**惯例约束（重要）**：武器伤害链一律走 `tick()` 或 `scene.time.delayedCall`，**禁止经 tween.onComplete 出伤**——与全部既有武器一致；headless 验伤时 tween onComplete 不回调（meteor 子坠落、bomb 子炸弹据此改为 tick 自管倒计时）。验伤法：`gs.weapons.removeAll()` → 只加目标武器 `addOrUpgrade×5`（可 `evolve(id)` 强进化）→ `gs.sys.step(t,16)` 泵帧（`gs.update` 不推进计时器）→ 读 `gs.dps.totals` Map，**逐 2–5 把隔离测**避免快武器清场把慢/AoE 武器饿成 0 的误判。**Codex**：`TARGET.weapons` 16→32。**调试 UI**：设置页「获得武器」弹窗 >16 武器改双列网格（行高按行数自适应，矮屏不溢出 Modal 钳制高度；UIButton.fitText 自动缩长标签）。check-i18n 按 WeaponId 推导 `w_<id>` 四键全覆盖；i18n +64 键。
