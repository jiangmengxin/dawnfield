# DPS 基准 — M22 32 武器（2026-06-14）

> 当前基准：覆盖 M22 后 32 把基础武器与 32 个超武。历史 16 武器基准见 `docs/balance/dps-M12.md`。

| 项目 | 说明 |
|---|---|
| 工具 | `src/dev/bench.ts`（DEV-only；GameScene `bench:true`） |
| 方法 | 真实 GameScene、无波次/机制/成就，三环 24 静止标靶（r56/r110/r260 各 8），遍历 `WEAPON_META` 当前全部武器 |
| 口径 | 每把武器测 Lv5 与进化形态；每项 60s ×3 轮取均值；属性全中性、暴击关闭 |
| 运行方式 | headless Chrome 中按 4 把武器分片执行 `window.__benchConfig.ids`，每片完成后关闭浏览器并合并原始行 |
| 稳定性处理 | bench 内静默纯视觉 FX、施放反馈和 hit-stop；这些不改变伤害数值，但可避免加速 headless 环境中粒子/tween 开销主导运行时间 |
| 结果来源 | 2026-06-14 本地 dev server `localhost:5183`，Codex bundled Playwright + 本机 Chrome headless |

## 结果

| 武器 | Lv5 DPS | /中位 | 进化 DPS | 进化/Lv5 |
|------|--------:|------:|---------:|---------:|
| flask | 1304.9 | 4.46x | 3916.8 | 3.00x |
| meteor | 1033.9 | 3.53x | 3308.8 | 3.20x |
| gravity | 1026.1 | 3.51x | 1749.2 | 1.70x |
| bomb | 955.7 | 3.27x | 2533.9 | 2.65x |
| sling | 765.1 | 2.61x | 2052.5 | 2.68x |
| mine | 564.5 | 1.93x | 1343.1 | 2.38x |
| blade | 560.9 | 1.92x | 766.9 | 1.37x |
| petal | 532.7 | 1.82x | 712.2 | 1.34x |
| sword | 522.2 | 1.78x | 1155.8 | 2.21x |
| swarm | 510.1 | 1.74x | 1240.4 | 2.43x |
| lantern | 475.8 | 1.63x | 618.1 | 1.30x |
| axe | 464.3 | 1.59x | 2400.9 | 5.17x |
| bolt | 421.7 | 1.44x | 1142.8 | 2.71x |
| tornado | 346.6 | 1.18x | 705.5 | 2.04x |
| breath | 319.6 | 1.09x | 529.6 | 1.66x |
| puff | 297.2 | 1.02x | 649.5 | 2.19x |
| frost | 288.1 | 0.98x | 1490.6 | 5.17x |
| star | 279.3 | 0.95x | 634.7 | 2.27x |
| chime | 277.3 | 0.95x | 729.4 | 2.63x |
| dagger | 276.1 | 0.94x | 721.5 | 2.61x |
| rain | 254.4 | 0.87x | 348.1 | 1.37x |
| wand | 245.7 | 0.84x | 447.2 | 1.82x |
| mallet | 240.2 | 0.82x | 1055.3 | 4.39x |
| boomerang | 206.3 | 0.70x | 418.3 | 2.03x |
| bird | 167.7 | 0.57x | 369.6 | 2.20x |
| wisp | 163.3 | 0.56x | 524.9 | 3.21x |
| vine | 156.3 | 0.53x | 430.6 | 2.75x |
| fireball | 149.2 | 0.51x | 392.2 | 2.63x |
| ricochet | 143.0 | 0.49x | 345.6 | 2.42x |
| bugle | 127.9 | 0.44x | 761.5 | 5.95x |
| prism | 116.5 | 0.40x | 143.5 | 1.23x |
| spark | 93.9 | 0.32x | 385.8 | 4.11x |

中位（Lv5）= 292.6。

## 解读

- 静止密集标靶明显利好 AoE、地面区域和大范围爆发。`flask`、`meteor`、`gravity`、`bomb`、`sling` 的高位结果不应直接等同于实战强度。
- 链式、直线、追踪和哨塔类在该口径下系统性偏低。`spark`、`prism`、`bugle`、`wisp`、`bird` 的实战表现需要结合怪群移动和目标刷新判断。
- 部分进化倍率较高是设计形态：`bugle`、`axe`、`frost`、`mallet`、`spark` 属投资后跃迁明显的武器。
- 本次只建立 M22 当前基准，不直接做数值调参。

## 复现

基础入口：

```js
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

分片入口示例：

```js
window.__benchConfig = { ids: ['blade', 'petal', 'prism', 'rain'] }
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

完成后读取：

```js
window.__benchRows
window.__benchResult
```

全量单页 bench 在本次 headless Chrome 环境中出现过一次 360s 超时和一次长会话 target crashed；因此当前记录采用 4 武器分片、合并原始 `__benchRows` 后统一计算全局中位数。
