# DPS 基准 — M22 32 武器多场景（2026-06-14）

> 当前基准覆盖 M22 后 32 把基础武器与 32 个超武。历史 16 武器基准见 `docs/balance/dps-M12.md`；专项评估与修复复测见 `docs/balance/weapon-evaluation-32.md`。

## 方法

| 项目 | 说明 |
|---|---|
| 工具 | `src/dev/bench.ts`（DEV-only；GameScene `bench:true`） |
| 自动化 | `scripts/run-weapon-eval.mjs` + headless Chromium |
| 当前 sweep | 32 武器 × `lv1/lv3/lv5/evo` × `staticRings/movingSwarm/singlePack`；每项 24s ×2 |
| 属性 | 全中性、暴击关闭、无角色 trait、无 Arcana、无商店、无地图机制、无突破 |
| 输出 | `docs/balance/weapon-evaluation-32-data.json`、`docs/balance/weapon-evaluation-32-bench.generated.md` |
| 视觉证据 | `weapon-evaluation-32-contact-base.jpg`、`weapon-evaluation-32-contact-evo.jpg` |

三场景定义：

- `staticRings`：三环 24 静止高血量标靶，r56/r110/r260 各 8。
- `movingSwarm`：三环 24 追踪高血量标靶，速度 64，模拟怪潮向玩家收束。
- `singlePack`：1 个主目标 + 4 个近旁卫星目标，检验单体、锁定、链式和小范围偏差。

完整 384 行矩阵见 `docs/balance/weapon-evaluation-32-bench.generated.md`。下表只摘当前前三批修复对象与仍需解释的代表项。

## 当前摘要

| 武器 | 静止 Lv5 | 怪潮 Lv5 | 单体 Lv5 | 静止进化/Lv5 | 怪潮进化/Lv5 | 单体进化/Lv5 | 备注 |
|---|---:|---:|---:|---:|---:|---:|---|
| `flask` | 1.01x | 1.96x | 0.79x | 2.03x | 1.70x | 2.34x | P1 全场景过强已修。 |
| `swarm` | 0.81x | 0.60x | 0.92x | 1.81x | 2.50x | 1.25x | 加单蜂命中上限与同目标节流。 |
| `meteor` | 1.63x | 1.99x | 1.45x | 2.14x | 1.89x | 2.23x | 保留预警大爆身份。 |
| `bomb` | 1.56x | 1.83x | 1.41x | 1.81x | 1.47x | 1.58x | 主爆/集束已降温。 |
| `gravity` | 1.88x | 1.16x | 1.51x | 1.46x | 1.46x | 1.42x | 控制折价后仍是静止强项。 |
| `spark` | 1.68x | 0.84x | 1.84x | 1.02x | 3.28x | 1.08x | 怪潮跃迁从 17.58x 降至 3.28x。 |
| `sling` | 1.17x | 1.77x | 1.01x | 2.02x | 1.70x | 2.11x | 从无条件高位降至强但可解释。 |
| `bolt` | 0.67x | 0.59x | 1.28x | 1.78x | 2.20x | 1.61x | 密集怪潮过高由命中上限修复。 |
| `bugle` | 0.75x | 0.68x | 1.84x | 1.39x | 1.01x | 1.68x | 进化开关已修，单体偏强。 |
| `axe` | 1.19x | 0.56x | 0.69x | 2.70x | 2.77x | 1.73x | 超武怪潮 6.30x 已修。 |
| `frost` | 0.60x | 0.71x | 1.01x | 2.12x | 1.61x | 2.04x | 超武 5x 跃迁已修。 |
| `prism` | 0.54x | 1.80x | 0.99x | 1.71x | 1.72x | 1.74x | 静止三环偏低，移动/单体健康。 |
| `petal` | 1.77x | 0.55x | 0.32x | 1.27x | 1.51x | 1.77x | 贴身环绕口径弱项。 |
| `star` | 1.64x | 0.82x | 0.52x | 1.77x | 1.14x | 3.25x | 远轨环绕仍需首次接敌强化。 |
| `wisp` | 0.88x | 0.44x | 1.70x | 2.80x | 2.62x | 2.54x | 单体追踪强，怪潮启动弱。 |
| `puff` | 0.68x | 0.36x | 1.65x | 2.20x | 2.21x | 1.35x | 慢追踪散射，怪潮弱。 |

## 第一批复核

最终代码对第一批 `flask/swarm/meteor/bomb/gravity/spark` 另跑 `60s ×3`。复核显示原 P1 高伤和 `spark` 超武开关均稳定收敛：

- 怪潮 `spark` 进化/Lv5 = 3.88x，低于 4x 复核阈值。
- `flask/bomb/meteor/gravity` 进化/Lv5 均约 1.4x-2.3x。
- 第一批复核 SD 多数低于 4%，`meteor` 单体 Lv5 为 9.1%，属于落点命中波动。

## 复现

启动开发服：

```bash
npm run dev -- --port 5183 --strictPort
```

自动化落档：

```bash
NODE_PATH=/path/to/node_modules node scripts/run-weapon-eval.mjs --url http://127.0.0.1:5183 --dps --visual
```

专项配置：

```js
window.__benchConfig = { preset: 'weaponEval32' }
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

输出：

- `window.__benchRows`
- `window.__benchResult`
- `window.__benchJson`
- `docs/balance/weapon-evaluation-32-data.json`
- `docs/balance/weapon-evaluation-32-contact-base.jpg`
- `docs/balance/weapon-evaluation-32-contact-evo.jpg`
