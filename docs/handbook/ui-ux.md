# UI 与体验手册

> 事实源：`src/ui/*`、`src/scenes/*`、`src/core/input/*`、`docs/archive/2026-06-14/pre-handbook-UI跨平台体验审查-专项报告.md`。

## UI 原则

Dawnfield 的 UI 是纸面童话风：暖纸背景、柔和描边、圆角卡片、清晰层级。界面必须优先服务重复游玩效率，避免把菜单做成营销页或装饰页。

硬规则：

- 菜单场景继承 `UIScene`，实现 `buildLayout()`。
- resize 和语言切换会销毁 children 后重建，不做增量布局。
- 布局以 `vp.safe` 为边界，尺寸走 `vp.s()`，字号走 `vp.fs()`。
- 可点击目标不低于 `THEME.hitMin = 44`。
- 文案不能溢出按钮、卡片或弹窗。
- 图标不用 emoji。

## 响应式底座

`Viewport` 管理：

- DPR 上限。
- safe area。
- compact / medium / wide 断点。
- 尺寸缩放 `s()`。
- 字号缩放 `fs()`。

`layout.ts` 提供 `inset`、`hstack`、`vstack`、`gridCells`。新增界面优先用这些原语，而不是散落魔法数字。

## 组件

| 组件 | 用途 |
|---|---|
| `UIButton` | 主按钮、选卡操作、调试操作 |
| `Card` | 角色、地图、图鉴、商店等重复项 |
| `CardGrid` | 可滚动卡片网格 |
| `ScrollPanel` | 滚动列表，WebGL 使用 filter mask |
| `Tabs` | 分段切换 |
| `Toggle` | 二元开关 |
| `Slider` | 音量等数值设置 |
| `Modal` | 模态弹窗与模态栈 |
| `Toast` | 简短反馈 |

同语义控件应复用同一组件变体，不新增局部样式。

## 场景口径

- Title：入口、语言、声音、次级导航。
- CharacterSelect：角色肖像卡，隐藏角色未解锁不占位。
- MapSelect：地图选择与模式开关，锁定态弱化，模式约束用 toast 反馈。
- Shop：永久强化、分组、价格、重置。
- Codex：武器、物品、敌人、角色、地图、Arcana 图鉴。
- Achievements：横向列表，当前成就与 legacy 分区。
- Settings：音量、语言、显示、调试和测试入口。
- Game/HUD：战斗、暂停、升级、宝箱、Arcana、结算跳转。
- Result：胜败摘要、金币、构筑、纪录、重开。

## HUD

HUD 有两种形态：

- compact：竖屏且短边 < 480，保留 XP、HP、计时、倍速、暂停、6+6 槽位。
- full：显示更多局内信息。

构筑详情、Arcana 持有、属性摘要放在暂停面板，不常驻挤占战斗画面。

新增 HUD 元素要先回答：

- 是否必须战斗中常显？
- compact 下是否有位置？
- 是否会遮挡敌弹、预警、Boss 血条或安全区？
- 是否可以放入暂停面板？

## 输入

输入层在 `src/core/input/*`：

- KeyboardSource：WASD / 方向键。
- TouchSource：触控拖动。
- GamepadSource：预留。
- InputManager：合并移动源。

当前玩家动词只有移动。UI 输入需要照顾触控和键盘，未来手柄导航要从现有输入边界扩展。

## 多分辨率验收

UI 改动必须至少验证：

| 场景 | 分辨率 |
|---|---|
| iPhone 17 Pro 竖屏 | 402×874 |
| 桌面横屏 | 1440×900 |
| 极端小屏 | 320×480 |
| 超宽屏 | 1260×540 |

标准：不遮挡、不溢出、可操作、文本不压字、触控目标达标。

## 已知体验债

当前专项审查原文在 `docs/archive/2026-06-14/pre-handbook-UI跨平台体验审查-专项报告.md`。高优先级债务：

- 三选一按钮曾出现高度不足 44、间距偏小、取消放逐文案自适应风险。
- HUD 多处硬编码尺寸，令牌存在非等比缩放风险。
- 规则卡覆盖层卡多时需要滚动或分页策略。
- 角色卡和地图卡结构差异不足。
- 图鉴标签和选图标签样式需要收敛。
- 屏幕震动需要全局强度口径和三档设置回归。

实施 UI 债务时，优先改组件和布局规则，再改单点样式。
