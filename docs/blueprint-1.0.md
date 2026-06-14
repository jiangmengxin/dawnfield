# 晨露之野 Dawnfield 1.0+ 当前蓝图

> 更新日期：2026-06-14  
> 旧版 M1-M9 长蓝图和后续历史方案已归档到 `docs/archive/2026-06-14/`。本文只保留当前架构、功能轴和路线判断；详细规范见 `docs/handbook/`。

## 项目定位

Dawnfield 是 Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。项目坚持零外部资源：Canvas 程序化纹理、WebAudio 合成、中文/英文 i18n 同步。

当前规模：18 角色 / 12 地图 / 32 武器 + 32 超武 / 16 被动 / 105 敌 / 12 Boss / 24 规则卡 / 31 掉落道具 / 16 商店强化 / 59 成就 ID（52 当前成就 + 7 legacy）。

## 当前架构

```text
src/content/   纯数据层：ids、characters、maps、weapons、passives、enemies、bosses、
               shop、achievements、arcana、affixes、dropItems
src/core/      RunState、MetaState、save、events、settings、router、TimeController、input
src/systems/   CombatContext、RunSystem、RunModifier、WaveDirector、EnemySystem、
               BossController、MapMechanicSystem、weapons、Pickup、Projectile、Zone、
               LevelUp、AchievementTracker、DropItemSystem、DpsTracker、traits、arcana
src/scenes/    Boot、Title、CharacterSelect、MapSelect、Shop、Codex、Achievements、
               Settings、Game、HUD、Result
src/ui/        Viewport、UIScene、layout、theme、widgets
src/gfx/       palette、procedural textures、map asset lifecycle
src/audio/     WebAudio SFX + BgmSpec 生成式 BGM
scripts/       check-docs、check-i18n、shot-receiver
```

关键设计：

- content 是数值与配置唯一来源。
- GameScene 负责系统编排，不承载全部玩法分支。
- 局内状态在 RunState，局外状态在 Meta，存档统一经 core/save。
- 规则卡、角色 trait、地图机制、掉落道具通过钩子或系统注册扩展。
- UI 场景继承 UIScene，resize/语言切换全量重建。

## 1.0+ 功能轴

### 构筑

- 武器携带上限默认 6；Arcana/trait 可改写上限。
- 武器进化条件为基础武器满级 + 配对被动；`mine` 为任意满级被动通配。
- 满构筑后升级进入晨露精华三轴成长。
- 突破模式下，进化武器可继续无限升级。
- Arcana 当前 24 张，旧数值卡已全部机制化。

### 地图

- 12 图由 `MapSpec` 驱动：时长、波次、事件、机制、装饰、掉落、BGM、Boss 和解锁。
- M18 后地图支持多个 `MechanicSpec` 并行调度，首项为核心机制。
- 每图 2 个地图专属掉落道具。

### 模式

- 普通、无尽、狂暴、规则、随机、2x、突破由选图页开关组合。
- 无尽和狂暴仍受逐图解锁约束。
- 倍速由 `TimeController` 管理。

### 局外

- 商店 16 项永久强化，总池 9,195。
- SaveV2 覆盖金币、强化、解锁、图鉴、成就、统计、设置、无尽、狂暴和引导。
- 成就承担解锁角色、地图、Arcana 与金币奖励。

## 里程碑状态

M1-M16.5、M18-M22 已完成。M17 视觉/手感强化被后续内容吸收。当前不再维护旧长路线图，历史记录保留在 `docs/archive/2026-06-14/`。

已完成的关键扩展：

- M18 地图核心机制重构。
- M19 一次性掉落道具与 `fortune` 商店强化。
- M20 独立模式开关、随机、2x、突破。
- M21 规则卡扩至 24 张并全机制化。
- M22 武器扩至 32 把 + 32 超武，美术统一 pass。

## 文档索引

- `docs/README.md`：总索引。
- `docs/当前项目状态.md`：当前事实快照。
- `docs/handbook/game-design.md`：游戏设计。
- `docs/handbook/content-design.md`：内容设计。
- `docs/handbook/art-direction.md`：美术方向。
- `docs/handbook/audio-direction.md`：音频方向。
- `docs/handbook/technical-architecture.md`：技术架构。
- `docs/handbook/ui-ux.md`：UI 与体验。
- `docs/handbook/qa-playtest.md`：QA 与实机验证。
- `docs/balance/dps-M22-32-weapons.md`：32 武器多场景 DPS 基准。
- `docs/balance/weapon-evaluation-32.md`：32 武器严格评估报告。
- `docs/reference/content-catalog.md`：内容目录。
- `docs/reference/extension-playbooks.md`：扩展步骤。
- `docs/reference/glossary.md`：术语表。

## 验证

```bash
npm run check:docs
npm run check:i18n
npx tsc --noEmit
npm test
npm run build
```
