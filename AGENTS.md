# AGENTS.md — 晨野 Dawnfield Agent 开发指南

面向 AI Agent（Claude Code 等）的开发手册。完整产品蓝图见 [docs/blueprint-1.0.md](docs/blueprint-1.0.md)。

## 项目概述

晨野 Dawnfield：Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。
1.0 目标：16 角色 / 8 地图 / 16 武器+16 超武 / 16 被动，分 9 个里程碑（M1-M9）实施。

**当前进度：M1 已完成（响应式 UI 框架 + 全界面占位 + 倍速/6+6 槽位/调试开关提前落地）。下一步 M2：核心重构。**

## 常用命令

```bash
npm run dev -- --port 5183 --strictPort   # 开发服务（约定端口 5183）
npx tsc --noEmit                          # 类型检查（每次改动后必跑）
npm run build                             # 生产构建
```

## 硬性约束（任何改动不得违反）

1. **零外部资源**：禁止引入图片/音频/字体文件。美术一律 Canvas 程序化纹理（`src/gfx/textures.ts`），音频一律 WebAudio 合成（`src/audio/sound.ts`）。
2. **中英双语同步**：所有面向玩家的文案走 `i18n.ts` 的 `t(key)`，新增键必须同时写 `[zh, en]` 两份。键名公约：`w_<id>(_d/_e/_e_d)` 武器、`p_<id>(_d)` 被动、`en_<id>` 敌人、`char_<id>` 角色、`map_<id>` 地图、`ach_<id>` 成就、`ui_*`/`set_*`/`scn_*` 界面。
3. **明亮童话画风**：配色只从 `src/gfx/palette.ts` 取；暖纸白底、粉彩+同系深一阶描边；UI 为纸面圆角风格。
4. **单局操作只有移动**：武器自动释放；键盘+触控双输入，输入层预留手柄扩展点。
5. **Phaser 4.x**：不降级、不换引擎、不引入额外运行时依赖。

## 架构速览

```
src/core/      router(场景导航栈) settings(临时设置,M3 并入存档)
src/ui/        Viewport(安全区/断点/缩放) UIScene(菜单基类) layout theme widgets/(8 组件)
src/scenes/    Boot Title CharacterSelect MapSelect Shop Codex Achievements Settings Game HUD Result
src/systems/   weapons(809行,M2 拆) enemies(波次+行为) grid(空间索引) effects(粒子池) joystick
src/config.ts  全部平衡数值/元数据（M2 迁入 content/ 数据层）
```

关键模式：对象池（敌人/粒子/弹体）、事件总线（`game.events` 的 `hud:*`）、配置驱动、空间网格索引。

## UI 开发约定

- **菜单场景**继承 `UIScene`：实现 `buildLayout()`，resize/语言切换会全量重建（销毁全部 children 后重跑），不要做增量布局。
- **布局**用 `vp.safe`（安全区矩形）+ `layout.ts` 的 vstack/hstack/gridCells；字号经 `vp.fs()`、尺寸经 `vp.s()`。
- **成组按钮**统一规格 `THEME.btnW/btnH/btnFs`（240×54/19）；触控命中区 ≥ `THEME.hitMin`（44pt）。
- **图标禁用 emoji**（平台字形不一致），用 Graphics 绘制（参考 HUD 暂停图标）或程序化纹理。
- **技能槽位**是圆形令牌样式（图标纹理本身为圆形白底），见 `HUD.drawSlotRow`。
- **HUD 双形态**：`compactHud`（竖屏且短边<480）只保留 XP/HP/计时/倍速/暂停/6+6 槽位，详情进暂停面板。
- 弹窗用 `Modal.open`（自带模态栈，ESC 关最顶层）；可滚动列表用 `ScrollPanel`（卡片 onTap 要套 `dragMoved` 守卫，`CardGrid` 已自动处理）。

## 游戏逻辑约定

- **时钟纪律**：倍速经 `GameScene.setSpeed`（同步 dt 乘子 + `time.timeScale` + `tweens.timeScale`）。systems 内禁止 `setTimeout`，延迟一律 `scene.time.delayedCall`、动画一律 tween，否则倍速会错位。
- **设置即时生效**：屏幕震动（所有 `cameras.main.shake` 调用点都有 `getSettings().shake` 守卫）、伤害数字（`Effects.number` 入口守卫）、无敌/全屏拾取（调试用），新增同类效果时记得加守卫。
- **携带上限**：`MAX_WEAPONS/MAX_PASSIVES = 6`，选卡 offer 构建已按上限过滤。
- **进化条件**：`WeaponManager.evolvable()` = 武器满级 + 持有配对被动；触发方式（宝箱分层）M2 改造。

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
- **后台标签页 RAF 不跑**：预览页面 hidden 时需手动泵帧 `setInterval(() => { if (document.hidden) game.loop.step(performance.now()); }, 16)`。
- resize 后 UIScene 重建有 150ms 防抖 + 二次校验，截图前等约 1-2 秒。
- 调试钩子：`window.__game`（Phaser.Game）、`window.__errs`（运行时错误数组）。
- 快速到达指定状态：设置页打开「无敌/全屏拾取」可加速验证；强制结算可在 eval 中调 `gs.defeat()`。

## 本地存储键

| 键 | 内容 |
|---|---|
| `dawnfield.lang` | 语言（'zh'/'en'） |
| `dawnfield.muted` / `dawnfield.volume` | 声音开关 / 音量 |
| `dawnfield.settings` | TempSettings JSON（伤害数字/震动/倍速/调试四项：信息/无敌/全屏拾取/自动选卡） |

M3 起合并为版本化存档 `dawnfield.save`（含迁移链，旧键作 v0 吸收）。

## 里程碑路线图（详见 docs/blueprint-1.0.md）

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M1 | 响应式 UI 框架 + 全界面占位 | ✅ |
| M2 | 核心重构：content 数据层、Game.ts 拆系统、CombatContext、宝箱分层、RunModifier 钩子 | ⬜ 下一步 |
| M3 | 存档/金币/解锁/成就/图鉴骨架 + 调试面板完善 | ⬜ |
| M4 | 角色系统 + 内容批次 A（角色 1-8） | ⬜ |
| M5 | 地图框架 + 地图 2-3 + 轻机制 + 倍速穿隧细化 | ⬜ |
| M6 | 内容批次 B（9-12、地图 4-5） | ⬜ |
| M7 | 内容批次 C（13-16、地图 6-8）补完 | ⬜ |
| M8 | 设置/调试完善 + 性能与平衡 pass | ⬜ |
| M9 | 规则卡 Arcana（10 张）+ 收尾 | ⬜ |

**M2 注意**：零新功能、行为等价重构。开工前先列行为快照清单（波次时间点/进化条件/Boss 阶段阈值），完成后逐项对照；`tsc --noEmit` 通过且 Game.ts < 250 行为验收线。
