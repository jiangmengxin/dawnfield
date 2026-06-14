# 物品与掉落道具图标复审记录

日期：2026-06-14

## 范围

- 被动物品：16 个，沿用 40×40 圆形纸令牌契约。
- 掉落道具：43 个，沿用 28×28 拾取/HUD 契约。
- 基础拾取物：gem、coin、heart、chest、arcanachest。

## 结论

- 被动物品：未发现 P0/P1。当前主体剪影在 26px 下可区分，暂不重绘。
- 基础拾取：未发现 P0/P1。gem 已改为蓝色露珠语义，基础拾取 5 项在 28px 下可区分。
- 掉落道具：已补齐统一纸令牌底托，并重绘同族高相似候选，当前无 P0/P1 阻断项。

## 已整改项

| ID | 原问题 | 整改 |
| --- | --- | --- |
| all drops | 28px 下直接落在地图上时边界偏弱。 | 所有 43 个掉落图标增加纸令牌底托、同系描边和主题色弧线。 |
| frenzy | 通用加速道具主体偏小，和普通风系符号语义不够强。 | 改为金色闪电靴/疾行剪影。 |
| blossomsalvo | 与 bloomburst 都是粉色花朵爆发，三件套内撞脸。 | 改为飞行花瓣弹幕，保留草甸粉色系但换成斜向投射剪影。 |
| tidalcrush | 与 ripple 都是水波椭圆。 | 改为卷浪主剪影，与 ripple 的水滴同心波分离。 |
| tailwind | 初版修正后接近 verdant 叶片。 | 改为三段风带气流线，避开植物剪影。 |
| galeblades | 与 tailwind 同为绿色风线。 | 改为三枚叶刃斜切剪影。 |
| honeytempest | 与 beeswarm 都像蜜蜂群。 | 改为蜂巢旋涡，和单蜂 beeswarm 分离。 |
| bramblecrown | 与 thornnova 都是粉色爆星。 | 改为空心刺冠和莓点。 |
| meteor | 彗星主体过小。 | 放大星核和尾迹。 |
| constellationfall | 与 meteor 同为小星符号。 | 改为多枚坠落星阵。 |
| beaconsurge | 与 dawnlance 都是金色竖向物。 | 改为圆形信标脉冲。 |
| frostbell | 与 frostcarillon 都是单个蓝铃。 | 强化手铃 + 雪花核心。 |
| frostcarillon | 与 frostbell 都是单个蓝铃。 | 改为三铃风铃。 |
| prismstorm | 与 prismshard 都是单枚紫晶。 | 改为三枚旋转棱晶。 |
| grandchime | 与 bellnova 都是单个金铃。 | 改为三铃钟架，保留回响弧。 |

## 验收证据

- `docs/icon-audit/icon-audit-sheet.png`：全量图标源尺寸与最小尺寸预览。
- `docs/icon-audit/summary.json`：`dropPresent=43`、`passivePresent=16`、`pickupPresent=5`，且 `issues.p0.length === 0`、`issues.p1.length === 0`。
- `scripts/run-icon-audit.mjs --url http://127.0.0.1:5185`：真实 Phaser 纹理审查通过。
