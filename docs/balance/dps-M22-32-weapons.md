# DPS 基准 — M22 32 武器多场景（2026-06-14）

> 当前基准：覆盖 M22 后 32 把基础武器与 32 个超武。历史 16 武器基准见 `docs/balance/dps-M12.md`；本次专项评估见 `docs/balance/weapon-evaluation-32.md`。

## 方法

| 项目 | 说明 |
|---|---|
| 工具 | `src/dev/bench.ts`（DEV-only；GameScene `bench:true`） |
| 自动化 | `scripts/run-weapon-eval.mjs` + headless Chromium；结果落 `docs/balance/weapon-evaluation-32-data.json` |
| 当前 sweep | 32 武器 × `lv1/lv3/lv5/evo` × `staticRings/movingSwarm/singlePack`；每项 24s ×2 轮 |
| 属性 | 全中性、暴击关闭、无角色 trait、无 Arcana、无商店、无地图机制、无突破 |
| 稳定性处理 | bench 内可静默纯视觉 FX、施放反馈和 hit-stop；延迟与 tween 伤害链由固定步长手动泵帧 |
| 视觉证据 | `weapon-evaluation-32-contact-base.jpg`、`weapon-evaluation-32-contact-evo.jpg` |

三场景定义：

- `staticRings`：三环 24 静止高血量标靶，r56/r110/r260 各 8。
- `movingSwarm`：三环 24 追踪高血量标靶，速度 64，模拟怪潮向玩家收束。
- `singlePack`：1 个主目标 + 4 个近旁卫星目标，检验单体、锁定、链式和小范围偏差。

完整 384 行矩阵见 `docs/balance/weapon-evaluation-32-bench.generated.md`。下表只列 Lv5 与进化，便于横向阅读。

## Lv5 / 进化摘要

### 静止三环

| 武器 | Lv5 DPS | /中位 | 进化 DPS | 进化/Lv5 |
|---|---:|---:|---:|---:|
| flask | 1321.3 | 4.38x | 3938.1 | 2.98x |
| gravity | 1063.3 | 3.52x | 2020.0 | 1.90x |
| bomb | 1014.7 | 3.36x | 2625.3 | 2.59x |
| meteor | 1013.7 | 3.36x | 3324.2 | 3.28x |
| sling | 800.5 | 2.65x | 2074.8 | 2.59x |
| mine | 584.5 | 1.94x | 1407.3 | 2.41x |
| blade | 579.9 | 1.92x | 803.7 | 1.39x |
| petal | 556.7 | 1.85x | 741.7 | 1.33x |
| swarm | 519.4 | 1.72x | 1237.6 | 2.38x |
| lantern | 499.6 | 1.66x | 649.4 | 1.30x |
| axe | 489.0 | 1.62x | 2501.8 | 5.12x |
| bolt | 478.1 | 1.58x | 1257.0 | 2.63x |
| tornado | 342.2 | 1.13x | 744.5 | 2.18x |
| breath | 330.0 | 1.09x | 547.3 | 1.66x |
| frost | 311.7 | 1.03x | 1560.3 | 5.01x |
| puff | 310.1 | 1.03x | 692.4 | 2.23x |
| chime | 293.3 | 0.97x | 769.7 | 2.62x |
| star | 292.4 | 0.97x | 665.2 | 2.27x |
| dagger | 286.7 | 0.95x | 747.6 | 2.61x |
| rain | 283.7 | 0.94x | 550.2 | 1.94x |
| sword | 270.0 | 0.90x | 485.3 | 1.80x |
| mallet | 262.9 | 0.87x | 1105.5 | 4.20x |
| wand | 255.1 | 0.85x | 462.2 | 1.81x |
| boomerang | 215.0 | 0.71x | 445.8 | 2.07x |
| wisp | 174.6 | 0.58x | 547.7 | 3.14x |
| bird | 174.3 | 0.58x | 385.7 | 2.21x |
| vine | 165.2 | 0.55x | 448.5 | 2.71x |
| fireball | 152.9 | 0.51x | 409.2 | 2.68x |
| ricochet | 128.2 | 0.42x | 336.5 | 2.63x |
| bugle | 127.8 | 0.42x | 717.2 | 5.61x |
| prism | 125.2 | 0.41x | 150.5 | 1.20x |
| spark | 100.0 | 0.33x | 412.8 | 4.13x |

### 移动怪潮

| 武器 | Lv5 DPS | /中位 | 进化 DPS | 进化/Lv5 |
|---|---:|---:|---:|---:|
| swarm | 6296.5 | 8.74x | 15155.1 | 2.41x |
| flask | 5080.0 | 7.05x | 10854.1 | 2.14x |
| bolt | 3633.4 | 5.04x | 6589.0 | 1.81x |
| meteor | 2405.6 | 3.34x | 6192.8 | 2.57x |
| sling | 1970.1 | 2.74x | 3697.2 | 1.88x |
| bomb | 1898.9 | 2.64x | 4075.0 | 2.15x |
| boomerang | 1705.8 | 2.37x | 2053.2 | 1.20x |
| frost | 1617.6 | 2.25x | 3635.4 | 2.25x |
| rain | 1569.6 | 2.18x | 1530.5 | 0.98x |
| gravity | 1312.1 | 1.82x | 2316.9 | 1.77x |
| fireball | 1087.6 | 1.51x | 1891.0 | 1.74x |
| mine | 1035.4 | 1.44x | 1885.1 | 1.82x |
| sword | 920.8 | 1.28x | 2050.5 | 2.23x |
| prism | 831.4 | 1.15x | 987.9 | 1.19x |
| tornado | 739.5 | 1.03x | 1312.8 | 1.78x |
| ricochet | 734.5 | 1.02x | 1837.5 | 2.50x |
| blade | 706.0 | 0.98x | 929.3 | 1.32x |
| mallet | 603.0 | 0.84x | 1629.1 | 2.70x |
| lantern | 583.6 | 0.81x | 779.9 | 1.34x |
| vine | 566.2 | 0.79x | 1584.3 | 2.80x |
| axe | 561.4 | 0.78x | 3536.4 | 6.30x |
| dagger | 497.8 | 0.69x | 1575.0 | 3.16x |
| chime | 360.8 | 0.50x | 960.1 | 2.66x |
| bird | 332.9 | 0.46x | 565.3 | 1.70x |
| puff | 318.1 | 0.44x | 750.6 | 2.36x |
| breath | 304.6 | 0.42x | 693.4 | 2.28x |
| wand | 253.4 | 0.35x | 838.3 | 3.31x |
| wisp | 176.0 | 0.24x | 509.5 | 2.89x |
| bugle | 123.7 | 0.17x | 874.9 | 7.08x |
| spark | 96.0 | 0.13x | 1688.2 | 17.58x |
| petal | 43.8 | 0.06x | 121.2 | 2.77x |
| star | 42.4 | 0.06x | 94.7 | 2.23x |

### 单体小队

| 武器 | Lv5 DPS | /中位 | 进化 DPS | 进化/Lv5 |
|---|---:|---:|---:|---:|
| flask | 424.2 | 3.81x | 1382.6 | 3.26x |
| meteor | 377.3 | 3.39x | 1190.9 | 3.16x |
| swarm | 351.5 | 3.15x | 923.7 | 2.63x |
| gravity | 331.6 | 2.98x | 562.9 | 1.70x |
| dagger | 331.5 | 2.97x | 592.6 | 1.79x |
| bomb | 315.1 | 2.83x | 911.4 | 2.89x |
| axe | 300.0 | 2.69x | 406.8 | 1.36x |
| sling | 299.2 | 2.69x | 717.5 | 2.40x |
| puff | 280.9 | 2.52x | 111.6 | 0.40x |
| bolt | 255.8 | 2.30x | 551.9 | 2.16x |
| wand | 254.5 | 2.28x | 761.3 | 2.99x |
| boomerang | 213.4 | 1.92x | 190.7 | 0.89x |
| rain | 156.4 | 1.40x | 184.7 | 1.18x |
| frost | 130.0 | 1.17x | 634.5 | 4.88x |
| fireball | 129.3 | 1.16x | 220.1 | 1.70x |
| bugle | 129.0 | 1.16x | 725.0 | 5.62x |
| tornado | 93.9 | 0.84x | 260.7 | 2.78x |
| prism | 92.9 | 0.83x | 112.6 | 1.21x |
| spark | 88.6 | 0.80x | 123.9 | 1.40x |
| breath | 82.6 | 0.74x | 137.0 | 1.66x |
| wisp | 68.8 | 0.62x | 180.8 | 2.63x |
| sword | 68.0 | 0.61x | 205.5 | 3.02x |
| mallet | 51.8 | 0.46x | 280.8 | 5.42x |
| blade | 48.0 | 0.43x | 49.5 | 1.03x |
| vine | 41.1 | 0.37x | 56.7 | 1.38x |
| star | 35.3 | 0.32x | 83.7 | 2.37x |
| lantern | 31.2 | 0.28x | 40.5 | 1.30x |
| petal | 30.2 | 0.27x | 64.5 | 2.14x |
| ricochet | 29.8 | 0.27x | 51.3 | 1.72x |
| bird | 23.2 | 0.21x | 41.3 | 1.78x |
| chime | 18.5 | 0.17x | 143.2 | 7.76x |
| mine | 0.0 | 0.00x | 0.0 | 0.00x |

## 解读

- `flask`、`meteor`、`bomb`、`sling`、`gravity` 在三环与单体小队都明显偏高，属于 AoE / 地面区域 / 大范围爆发同时吃满标靶的优势项。
- `swarm` 在移动怪潮极高，原因是怪群收束后蜂群反复命中密集目标；这说明实战怪潮强度可能高于旧木桩表。
- `spark`、`bugle`、`axe`、`frost`、`chime` 的超武跃迁很高，属于优先复核的投资跃迁。
- `prism`、`blade`、`lantern`、`rain`、`boomerang` 在部分场景进化倍率低，超武存在“表现增强大于数值增强”的风险。
- `mine` 在 `singlePack` 为 0 是口径限制：玩家静止、目标不踩地雷时无法触发；不应直接判为实战无伤害。
- `movingSwarm` 对贴身环绕武器不友好：目标先从远处收束，`petal`、`star` 在前半段几乎没有接触机会。它反映启动覆盖问题，而非全局终局强度。

## 旧 60s 木桩锚点

2026-06-14 早期 M22 表曾用 `staticRings`、Lv5/进化、60s ×3 轮，结果保留为历史锚点。该旧表与当前 sweep 排名大体一致，但当前表额外覆盖 Lv1/Lv3 和两个非静止场景；涉及调参时以当前 JSON 和专项评估为准。

## 复现

启动开发服：

```bash
npm run dev -- --port 5183 --strictPort
```

默认旧口径：

```js
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

多场景专项口径：

```js
window.__benchConfig = { preset: 'weaponEval32' }
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

自动化落档：

```bash
NODE_PATH=/path/to/node_modules node scripts/run-weapon-eval.mjs --url http://127.0.0.1:5183 --dps --visual
```

输出：

- `window.__benchRows`
- `window.__benchResult`
- `window.__benchJson`
- `docs/balance/weapon-evaluation-32-data.json`
- `docs/balance/weapon-evaluation-32-contact-base.jpg`
- `docs/balance/weapon-evaluation-32-contact-evo.jpg`
