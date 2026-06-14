# AGENTS.md — Dawnfield Agent 开发指南

面向 AI Agent 与协作工程师。完整文档入口见 `README.md` 和 `docs/README.md`；当前代码事实见 `docs/当前项目状态.md`；专业手册见 `docs/handbook/`。

## 项目概述

晨露之野 Dawnfield 是 Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。当前为 1.0+ 扩展态：18 角色 / 8 地图 / 32 武器 + 32 超武 / 16 被动 / 73 敌 / 8 Boss / 24 规则卡 / 23 掉落道具 / 16 商店强化 / 55 成就 ID（48 当前成就 + 7 legacy）。

旧规划已归档到 `docs/archive/2026-06-14/`。新任务以当前代码、`docs/当前项目状态.md`、`docs/handbook/*` 和 `docs/reference/*` 为准。

## 常用命令

```bash
npm run dev -- --port 5183 --strictPort
npm run check:docs
npm run check:i18n
npx tsc --noEmit
npm test
npm run build
```

文档或内容索引改动至少跑 `npm run check:docs`。新增/修改玩家文案或 content ID 必跑 `npm run check:i18n`。代码改动至少跑 `npx tsc --noEmit`；内容、经济、存档、系统行为改动补跑 `npm test` 和 `npm run build`。

## 硬性约束

1. **零外部资源**：禁止引入图片、音频、字体文件。美术走 Canvas 程序化纹理，音频走 WebAudio 合成。
2. **中英同步**：玩家可见文案必须走 `i18n.ts` 的 `t(key)`，新增键必须同时写 `[zh, en]`。
3. **明亮童话画风**：配色只从 `src/gfx/palette.ts` 与地图色组取；暖纸白底、粉彩主体、同系深描边。
4. **单局操作只有移动**：武器自动释放；键盘与触控双输入，手柄仍为预留点。
5. **Phaser 4.x**：不降级、不换引擎、不引入额外运行时依赖。
6. **content 纯数据**：`src/content/*` 禁止依赖 Phaser 或运行时对象。

## 架构速览

```text
src/content/   纯数据：ids、characters、maps、weapons、passives、enemies、bosses、
               shop、achievements、arcana、affixes、dropItems
src/core/      RunState、MetaState、save、events、settings、router、TimeController、input
src/systems/   RunSystem、CombatContext、WaveDirector、EnemySystem、BossController、
               MapMechanicSystem、weapons、Pickup、Projectile、Zone、LevelUp、
               AchievementTracker、DropItemSystem、DpsTracker、arcana、traits
src/scenes/    Boot、Title、CharacterSelect、MapSelect、Shop、Codex、Achievements、
               Settings、Game、HUD、Result
src/ui/        Viewport、UIScene、layout、theme、widgets
src/gfx/       palette、procedural textures、map asset lifecycle
src/audio/     WebAudio SFX + BgmSpec 生成式 BGM
scripts/       check-docs、check-i18n、shot-receiver
```

关键模式：配置驱动、类型化事件、对象池、空间网格、系统编排、版本化存档、程序化资源。

## UI 约定

- 菜单场景继承 `UIScene`，实现 `buildLayout()`；resize/语言切换全量重建。
- 布局用 `vp.safe`、`layout.ts`、`vp.s()`、`vp.fs()`。
- 可点元素命中区不低于 `THEME.hitMin = 44`。
- 弹窗用 `Modal.open`；滚动列表用 `ScrollPanel`。
- 图标不用 emoji，使用 Graphics 或程序化纹理。
- HUD 竖屏紧凑态只保留核心信息，详情放暂停面板。
- Phaser 4 WebGL 不可靠支持 GeometryMask；裁剪优先使用 filter mask，参考 `ScrollPanel`。

UI 改动按四个分辨率验收：402×874、1440×900、320×480、1260×540。标准：不遮挡、不溢出、可操作、文本不压字。

## 游戏逻辑约定

- 倍速和 hit-stop 走 `TimeController`。systems 内禁止裸 `setTimeout`。
- 延迟用 `scene.time.delayedCall`，动画用 tween，并确认倍速/暂停语义。
- 快弹和高速投射物在大 dt 下拆步推进，避免穿隧。
- 武器伤害归账由 WeaponManager 子上下文处理；非武器来源需要统计时显式 `ctx.dmgLog(src, dmg)`。
- 构筑随机新代码走 `ctx.rng()`。
- 局内状态在 `RunState`；局外状态在 `Meta`；存档统一经 `core/save`。
- schema 改动必须递增 `SAVE_VERSION`，在 `migrations.ts` 登记迁移，并用旧档验证。
- 新系统实现 `RunSystem` 并通过 `CombatContext` 交互，避免系统互相私有引用。

## 内容扩展入口

新增内容先读：

- `docs/handbook/content-design.md`
- `docs/reference/content-catalog.md`
- `docs/reference/extension-playbooks.md`

常见源文件：

- 角色：`content/characters.ts` + `gfx/textures/characters.ts` + `systems/traits.ts`
- 地图：`content/maps.ts` + `content/bosses.ts` + `systems/mechanics/*` + `gfx/textures/mapassets.ts`
- 武器：`content/weapons.ts` + `systems/weapons/*` + `gfx/textures/icons.ts` + `gfx/textures/weapons.ts`
- Arcana：`content/arcana.ts` + `systems/arcana.ts`
- 掉落：`content/dropItems.ts` + `systems/dropItems.ts`
- 成就：`content/achievements.ts` + `AchievementTracker` + `MetaState`

## 文档规则

- 当前事实写入 `docs/当前项目状态.md`、手册和 reference；历史方案进入 `docs/archive/`。
- 入口数字同步 `README.md`、`docs/README.md`、`docs/当前项目状态.md`、`docs/blueprint-1.0.md`、`docs/reference/content-catalog.md`。
- 修改文档事实后运行 `npm run check:docs`。
- M22 后当前 DPS 基准为 `docs/balance/dps-M22-32-weapons.md`；`dps-M12.md` 仅为历史 16 武器基准。

## 自动化测试备忘

- dev 服务约定端口 5183。
- Phaser 4 忽略合成 pointer 事件；自动化点击可直接对按钮容器 `emit('pointerup')`。
- 后台标签页 RAF 不跑，可靠验证用同步批量 `game.loop.step(t)`。
- hidden 标签页的 `setInterval` 会节流；不要靠真实 interval 推进局内时间。
- 操作 `dawnfield.save` 前，注意旧页面 pagehide flush 可能覆盖手工写入。
- Vite 长时间运行后可能出现陈旧模块缓存；怀疑时重启 dev server。
- `preview_screenshot` 在后台标签页可能超时；用 `scripts/shot-receiver.mjs` + `renderer.snapshot` + 同步泵帧落盘。
- 后台标签页会触发自动暂停；泵帧时检测 paused 并发 `hud:togglepause`。
- `import('/src/xxx.ts')` 可能创建重复模块实例；验证模块状态时优先重启 dev server 或通过场景对象操作。

## 交付说明

最终回复列出改动范围、验证命令结果和未覆盖风险。若某项检查未运行或失败，明确说明原因。

## AGENTS.md 维护

本文件只放每次任务都要遵守的规则、命令、约束和验证标准。详细设计、里程碑、长验收记录放入 `docs/`。保持本文件小于 32 KiB，避免后半段被截断。
