# Dawnfield 文档总索引

> 更新日期：2026-06-14  
> 事实源：当前代码、`src/content/*`、`src/core/*`、`src/systems/*`、`src/gfx/*`、`src/audio/*` 与测试脚本。旧规划只保留历史语境，不作为当前待办。

当前项目规模：32 角色 / 12 地图 / 32 武器 + 32 超武 / 16 被动 / 105 敌 / 12 Boss / 24 规则卡 / 43 掉落道具 / 16 商店强化 / 73 成就 ID（66 当前成就 + 7 legacy）。

## 推荐阅读顺序

1. `README.md`：项目入口、命令与文档地图。
2. `AGENTS.md`：AI Agent 与工程协作必须遵守的硬规则。
3. `docs/当前项目状态.md`：当前代码事实快照、稳定契约与已知债。
4. `docs/handbook/game-design.md`：游戏设计总纲。
5. `docs/handbook/technical-architecture.md`：技术架构与扩展边界。
6. `docs/reference/content-catalog.md`：内容 ID 与代码源索引。

## 手册分册

| 文档 | 用途 |
|---|---|
| `docs/handbook/game-design.md` | 核心幻想、玩家动词、单局循环、构筑、模式、局外进度、胜败与奖励 |
| `docs/handbook/content-design.md` | 内容体系的设计口径与扩展规则 |
| `docs/handbook/art-direction.md` | 明亮童话画风、程序化纹理、色板与美术边界 |
| `docs/handbook/audio-direction.md` | WebAudio 合成、SFX 分类、BGM `BgmSpec` 与分轨音量 |
| `docs/handbook/technical-architecture.md` | Phaser/Vite/TS 架构、RunSystem、CombatContext、RunModifier、存档与性能 |
| `docs/handbook/ui-ux.md` | 响应式 UI、HUD、菜单组件、输入和体验债 |
| `docs/handbook/qa-playtest.md` | 校验命令、preview 自动化、截图、泵帧、DPS bench 与验收矩阵 |

## 参考资料

| 文档 | 用途 |
|---|---|
| `docs/reference/content-catalog.md` | 当前全部核心内容 ID、名称、定位与源文件 |
| `docs/reference/extension-playbooks.md` | 新增角色、地图、武器、敌人、Arcana、掉落、成就、存档字段的步骤清单 |
| `docs/reference/glossary.md` | 项目术语、缩写、系统名与数据表名 |

## 历史与专题

原专题文档已吸收进手册，旧正文保留在 `docs/archive/2026-06-14/pre-handbook-*`：

- `docs/规则卡系统设计-24张机制化.md`：当前只作为索引页，正文见 `game-design` / `content-design` / 归档原文。
- `docs/掉落道具系统设计.md`：当前只作为索引页，正文见 `content-design` / 归档原文。
- `docs/UI跨平台体验审查-专项报告.md`：当前只作为索引页，体验债见 `ui-ux` / 归档原文。
- `docs/balance/dps-M12.md`：16 武器历史基准。
- `docs/balance/dps-M22-32-weapons.md`：32 武器多场景 DPS 基准。
- `docs/balance/weapon-evaluation-32.md`：32 武器严格评估报告，覆盖数值、表现、相似性和调参建议。
- `docs/vfx-audit/weapon-vfx-evaluation-32.md`：32 武器 VFX、表现力与相似性审计，含三场景视觉证据。
- `docs/icon-audit/icon-audit-report.md`：武器、超武目标、被动、Arcana、掉落与基础拾取图标审查基线，含全量 sheet 和逐项整改表。

## 文档校验

内容规模、ID 覆盖和入口数字由轻量脚本守护：

```bash
npm run check:docs
```

新增或删除任何核心 ID 后，同步更新 `docs/reference/content-catalog.md`、`README.md`、`docs/README.md`、`docs/当前项目状态.md` 与 `docs/blueprint-1.0.md`，再运行该命令。
