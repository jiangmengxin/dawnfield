# 晨露之野 Dawnfield 1.0+ 当前蓝图

> 更新日期：2026-06-14  
> 旧版 M1-M9 长蓝图已归档到 `docs/archive/2026-06-14/blueprint-1.0-旧版.md`。日常开发请优先阅读 `docs/当前项目状态.md`，本文只保留当前架构、内容边界与路线图。

## 项目定位

晨露之野 Dawnfield 是 Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。项目坚持零外部图片、音频与字体：美术走 Canvas 程序化纹理，音频走 WebAudio 合成；玩家文案走中英双语 i18n。

1.0 的原始目标已完成，当前项目已经进入 1.0+ 扩展态：

| 类别 | 当前规模 |
|---|---:|
| 角色 | 18 个：16 个常规角色 + 2 个隐藏角色 |
| 地图 | 8 张 |
| 武器 | 32 把基础武器 + 32 把超武 |
| 被动 | 16 个 |
| 敌人 | 73 个，19 种行为模板 |
| Boss | 8 个，数据驱动配装 |
| 规则卡 Arcana | 24 张，分 basic/mechanic 两层 |
| 一次性掉落道具 | 23 个：7 通用 + 16 地图专属 |
| 商店强化 | 16 项永久强化 |
| 成就 | 48 个当前成就 + 7 个 legacy 成就 |

## 当前架构

```text
src/content/   纯数据层：ids、player、characters、weapons、passives、enemies、maps、bosses、
               shop、achievements、arcana、affixes、dropItems
src/core/      events、router、settings、RunState、MetaState、TimeController、save、input
src/ui/        Viewport、UIScene、layout、theme、widgets
src/scenes/    Boot、Title、CharacterSelect、MapSelect、Shop、Codex、Achievements、Settings、
               Game、HUD、Result
src/systems/   CombatContext/RunSystem/RunModifier、WaveDirector、EnemySystem、BossController、
               MapMechanicSystem、mechanics/*、weapons/*、Player/Pickup/Projectile/Zone、
               LevelUp、AchievementTracker、DropItemSystem、DpsTracker、traits、arcana
src/gfx/       palette、procedural textures：core/characters/enemies/mapassets/weapons/icons/misc
src/audio/     sound.ts：SFX + 每图生成式 BGM
scripts/       check-i18n.mjs、shot-receiver.mjs
```

关键设计仍然保持不变：

- content 是数值与配置唯一来源，系统代码只消费数据。
- `GameScene` 按 `RunSystem[]` 编排帧序，系统只看 `CombatContext`。
- 局内状态在 `RunState`，局外状态在 `Meta`，存档统一经 `core/save`。
- 规则卡、角色 trait、地图机制、掉落道具都通过钩子或系统注册扩展，避免把玩法分支塞回 `Game.ts`。
- UI 场景继承 `UIScene`，resize 或语言切换全量重建。

## 1.0+ 功能轴

### 构筑

- 武器携带上限默认 6，把数值上限留给 `stats.maxWeapons`。
- 武器进化条件为基础武器满级 + 配对被动；`mine` 仍是任意满级被动通配。
- 满构筑后升级进入晨露精华 Limit Break：伤害、冷却、范围三轴累加。
- M20 增加突破模式，进化武器可继续吃突破等级。
- Arcana 从 M9 的 10 张扩到 M21 的 24 张，旧数值卡也完成机制化。

### 地图

- 8 图均由 `MapSpec` 驱动：时长、波次、事件、装饰、纸底色、机制、BGM、Boss、解锁。
- M18 后地图支持 `mechanics: MechanicSpec[]` 并行调度。
- 核心机制包括 `bloomfield`、`tide`、`wind`、`sporechain`、`pollen`、`thornwall`、`nightfall`、`beacon`，旧水皮、风暴、治愈泉等作为风味机制模块保留。
- 每图有 2 个地图专属掉落道具，和 M19 通用掉落系统共存。

### 模式

- 普通模式、无尽模式、狂暴 I/II 已完成。
- M20 将 MapSelect 改为独立模式开关：无尽、狂暴、规则卡、随机、2x、突破可以组合。
- 无尽与狂暴仍受逐图解锁约束。

### 局外

- 商店 16 项永久强化，金币总池当前测试口径为 9,195。
- SaveV2 包含 coins、powerUps、unlocked、codex、achievements、stats、settings、endless、hyper、tipsSeen。
- 成就承担解锁角色、地图、规则卡与奖励金币，不新增独立解锁存档字段。

## 里程碑状态

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M1 | 响应式 UI 框架 + 全界面占位 | 完成 |
| M2 | content 数据层、Game 拆系统、CombatContext、宝箱分层、RunModifier | 完成 |
| M3 | 存档、金币、解锁、成就、图鉴、调试面板 | 完成 |
| M4 | 角色系统 + 角色 1-8 | 完成 |
| M5 | 地图框架 + 地图 2-3 + 轻机制 | 完成 |
| M6 | 内容批次 B：角色/武器 9-12、地图 4-5 | 完成 |
| M7 | 内容批次 C：角色/武器 13-16、地图 6-8 | 完成 |
| M8 | 设置、性能、纹理生命周期、DPS 调试 | 完成 |
| M9 | Arcana 10 张 + 图鉴第六类 | 完成 |
| M10 | Reroll/Banish/Skip、复活、商店扩展 | 完成 |
| M11 | 无尽、狂暴、SaveV2、MapSelect 改版 | 完成 |
| M12 | 时长三档、晨露精华、surge、打击感与 UI 打磨、DPS bench | 完成 |
| M13 | RunModifier 新钩子、6 张机制 Arcana、成就重构 | 完成 |
| M14 | 5 个角色 trait、进化引导三件套 | 完成 |
| M15 | 3 个敌人新行为、5 个精英词缀、2 个成就 | 完成 |
| M16 | 2 个隐藏角色、2 条彩蛋链、隐藏成就、揭示动效 | 完成 |
| M16.5 | 摇杆黏滞、放逐改版、宝箱多件展示、结算对齐 | 完成 |
| M18 | 地图核心机制重构，多机制并行 | 完成 |
| M19 | 一次性掉落道具系统，商店 fortune 强化 | 完成 |
| M20 | 独立模式开关、随机/2x/突破模式 | 完成 |
| M21 | 规则卡扩至 24 张并全机制化 | 完成 |
| M22 | 武器扩充至 32 把 + 32 超武，美术统一 pass | 完成 |

## 当前文档索引

- `docs/当前项目状态.md`：当前代码事实、内容规模、系统状态、文档归档记录。
- `docs/规则卡系统设计-24张机制化.md`：M21 规则卡设计与实现说明。
- `docs/掉落道具系统设计.md`：M19 掉落道具系统设计与实现说明。
- `docs/UI跨平台体验审查-专项报告.md`：UI 跨平台审查报告，作为体验债务与验收参考。
- `docs/balance/dps-M12.md`：M12 时期 16 武器 DPS bench 历史基准；M22 后需要重跑 32 武器新版基准。
- `docs/archive/2026-06-14/`：旧规划、旧评审与旧蓝图，保留历史上下文，不再作为当前状态来源。

## 验证

常规改动后至少运行：

```bash
npm run check:i18n
npx tsc --noEmit
```

内容、经济或存档相关改动建议补跑：

```bash
npm test
npm run build
```
