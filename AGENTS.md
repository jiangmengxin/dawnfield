# AGENTS.md — 晨野 Dawnfield Agent 开发指南

面向 AI Agent（Claude Code 等）的开发手册。完整产品蓝图见 [docs/blueprint-1.0.md](docs/blueprint-1.0.md)。

## 项目概述

晨野 Dawnfield：Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。
1.0 目标：16 角色 / 8 地图 / 16 武器+16 超武 / 16 被动，分 9 个里程碑（M1-M9）实施。

**当前进度：M3 已完成（版本化存档 dawnfield.save、MetaState、金币掉落+结算入账、商店 11 项永久强化、成就引擎首批 12 个、图鉴首遇点亮+New 角标、调试面板补充）。下一步 M4：角色系统 + 内容批次 A（角色 1-8）。**

## 常用命令

```bash
npm run dev -- --port 5183 --strictPort   # 开发服务（约定端口 5183）
npx tsc --noEmit                          # 类型检查（每次改动后必跑）
npm run build                             # 生产构建
```

## 硬性约束（任何改动不得违反）

1. **零外部资源**：禁止引入图片/音频/字体文件。美术一律 Canvas 程序化纹理（`src/gfx/textures.ts`），音频一律 WebAudio 合成（`src/audio/sound.ts`）。
2. **中英双语同步**：所有面向玩家的文案走 `i18n.ts` 的 `t(key)`，新增键必须同时写 `[zh, en]` 两份。键名公约：`w_<id>(_d/_e/_e_d)` 武器、`p_<id>(_d)` 被动、`en_<id>` 敌人、`char_<id>` 角色、`map_<id>` 地图、`ach_<id>(_d)` 成就、`pu_<id>(_d)` 商店强化、`ui_*`/`set_*`/`scn_*` 界面。
3. **明亮童话画风**：配色只从 `src/gfx/palette.ts` 取；暖纸白底、粉彩+同系深一阶描边；UI 为纸面圆角风格。
4. **单局操作只有移动**：武器自动释放；键盘+触控双输入，输入层预留手柄扩展点。
5. **Phaser 4.x**：不降级、不换引擎、不引入额外运行时依赖。

## 架构速览

```
src/content/   ★ 纯数据层（无 Phaser）：ids player weapons(含平衡表) passives enemies(波次/Boss/行为指派)
               shop(11 项永久强化+价格公式) achievements(12 成就+check 条件)
src/core/      events(类型化事件) router settings(门面→save) RunState TimeController registry
               save/(schema/migrations/storage：v1+迁移链+损坏自愈+debounce) MetaState(局外状态单例)
               input/(键盘/触控/手柄stub)
src/ui/        Viewport(安全区/断点/缩放) UIScene(菜单基类) layout theme widgets/(8 组件)
src/scenes/    Boot Title CharacterSelect MapSelect Shop Codex Achievements Settings Game(编排器) HUD Result
src/systems/   context(CombatContext/RunSystem/RunModifier) WaveDirector EnemySystem behaviors BossController
               weapons/(基类+7武器) PlayerSystem PickupSystem(光珠+金币) ProjectileSystem ZoneSystem
               LevelUpSystem AchievementTracker DecorSystem grid effects joystick
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

## 游戏逻辑约定

- **时钟纪律**：倍速经 `core/TimeController`（`GameScene.setSpeed` 委托；同步 dt 乘子 + `time.timeScale` + `tweens.timeScale`），hit-stop 也在此。systems 内禁止 `setTimeout`，延迟一律 `scene.time.delayedCall`、动画一律 tween，否则倍速会错位。
- **设置即时生效**：屏幕震动（所有 `cameras.main.shake` 调用点都有 `getSettings().shake` 守卫）、伤害数字（`Effects.number` 入口守卫）、无敌/全屏拾取（调试用），新增同类效果时记得加守卫。
- **携带上限**：`MAX_WEAPONS/MAX_PASSIVES = 6`，选卡 offer 构建已按上限过滤。
- **进化条件**：`WeaponManager.evolvable()` = 武器满级 + 持有配对被动（mine 为任意被动满级）。
- **宝箱分层**（`LevelUpSystem.buildChestReward`）：可进化→进化；否则→已持有项升级×N（`CHEST.upgradeCount`）；无可升级→金币+治疗（`CHEST.goldCoins/goldHeal`）。
- **局内状态**全在 `core/RunState`（hp/xp/coins/kills/passives/stats…），HUD 经 `gs.run` 读取；新系统实现 `RunSystem` 并在 `GameScene.create` 的 systems 数组注册（顺序即帧序）。
- **局外状态**全经 `core/MetaState` 的 `Meta` 单例（金币/强化/图鉴/成就/解锁/统计），改动自动 debounce 落档；商店永久强化在 `RunState.computeStats` 汇入基础值（开局快照）。
- **金币链路**：掉落在 `Game.onEnemyKilled`（概率+精英爆币）→ `PickupSystem` 金币球磁吸收取（`run.addCoins` 乘 coinGain）→ 结算/中途退出 `Meta.recordRun` 入账。
- **图鉴首遇点亮**：武器 `WeaponManager.addOrUpgrade`、被动 `LevelUpSystem.applyOne`、敌人 `EnemySystem.spawn`、角色/地图 `GameScene.create`，全走 `Meta.codexLight(cat, id)`（Set 缓存 O(1)，高频安全）。
- **成就**：条件全在 `content/achievements.ts` 的 `check(view)`；局内 `AchievementTracker` 每秒评估并发 `hud:achievement` toast，结算/商店购买后调 `evalAchievements` 补评累计类与胜利类。
- **规则卡钩子**：`RunModifier`（statMods/modifyOffers/onEnemyKilled/modifyDamage/onChest/onTick）已在全部调用点空挂，M9 实装时向 `GameScene.modifiers` 推卡即可。

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
- 快速到达指定状态：设置页打开「无敌/全屏拾取」可加速验证；强制结算可在 eval 中调 `gs.defeat()`。

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
| M4 | 角色系统 + 内容批次 A（角色 1-8） | ⬜ 下一步 |
| M5 | 地图框架 + 地图 2-3 + 轻机制 + 倍速穿隧细化 | ⬜ |
| M6 | 内容批次 B（9-12、地图 4-5） | ⬜ |
| M7 | 内容批次 C（13-16、地图 6-8）补完 | ⬜ |
| M8 | 设置/调试完善 + 性能与平衡 pass | ⬜ |
| M9 | 规则卡 Arcana（10 张）+ 收尾 | ⬜ |

**M4 注意**：textures.ts 拆分+`makeCharacter` 参数化配方；`CharacterSpec` 生效（初始武器+属性偏移，`GameScene.init` 已接收 charId）；新角色/武器解锁条件挂成就（`content/achievements.ts` 加条目 + `Meta.unlock`）；图鉴角色页的 `CHARS` 临时表（Codex.ts 内）迁去 `content/characters.ts`。
