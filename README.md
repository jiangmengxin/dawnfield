# 晨露之野 Dawnfield

晨露之野 Dawnfield 是一款 Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。项目坚持零外部图片、音频与字体资源：美术由 Canvas 程序化生成，音频由 WebAudio 合成，玩家文案通过 `src/i18n.ts` 保持中文/英文同步。

当前代码事实：32 角色 / 12 地图 / 32 武器 + 32 超武 / 16 被动 / 105 敌 / 12 Boss / 24 规则卡 / 31 掉落道具 / 16 商店强化 / 73 成就 ID（66 当前成就 + 7 legacy）。

## 快速开始

```bash
npm install
npm run dev -- --port 5183 --strictPort
```

常用校验：

```bash
npm run check:docs
npm run check:i18n
npx tsc --noEmit
npm test
npm run build
```

## 文档入口

- `docs/README.md`：文档总索引与阅读顺序。
- `docs/handbook/game-design.md`：核心玩法、构筑、模式与局内/局外循环。
- `docs/handbook/content-design.md`：角色、地图、武器、敌人、Boss、Arcana、掉落、商店与成就的设计口径。
- `docs/handbook/art-direction.md`：程序化美术、色彩、角色/敌人区分、地图视觉与 UI 图标规范。
- `docs/handbook/audio-direction.md`：WebAudio SFX 与生成式 BGM 规范。
- `docs/handbook/technical-architecture.md`：运行时架构、系统边界、存档、性能与扩展点。
- `docs/handbook/ui-ux.md`：响应式 UI、HUD、输入、触控和体验债。
- `docs/handbook/qa-playtest.md`：自动化检查、实机验证、preview 技巧与 DPS bench。
- `docs/balance/dps-M22-32-weapons.md`：32 武器多场景 DPS 基准。
- `docs/balance/weapon-evaluation-32.md`：32 武器严格评估报告。
- `docs/reference/content-catalog.md`：当前内容目录，覆盖全部核心 ID。
- `docs/reference/extension-playbooks.md`：新增内容与系统扩展步骤。
- `docs/reference/glossary.md`：术语表。

## 开发约束

新增内容优先改 `src/content/*` 的纯数据表，再接入系统行为、程序化纹理、i18n 与验证。不要引入外部图片、音频、字体或额外运行时依赖；不要把 Phaser 对象放进 content 层或存档层。

所有面向玩家的文本必须走 `t(key)`，新增内容必须补齐中英双语键，并通过 `npm run check:i18n`。文档事实必须能由代码解释，涉及内容规模或 ID 覆盖时运行 `npm run check:docs`。
