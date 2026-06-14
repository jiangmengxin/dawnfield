# QA 与实机验证手册

> 事实源：`package.json`、`scripts/check-i18n.mjs`、`scripts/shot-receiver.mjs`、`tests/*`、`src/dev/bench.ts`、AGENTS 自动化备忘。

## 基础命令

```bash
npm run dev -- --port 5183 --strictPort
npm run check:docs
npm run check:i18n
npx tsc --noEmit
npm test
npm run build
```

推荐最低线：

- 文档或内容索引改动：`npm run check:docs`。
- 玩家文案或 content ID 改动：`npm run check:i18n`。
- TypeScript 改动：`npx tsc --noEmit`。
- 经济、存档、无尽、掉落、地图机制改动：`npm test`。
- 交付前：`npm run build`。

## 自动化测试覆盖

当前 Vitest 覆盖：

- `tests/save.test.ts`：SaveV2 sanitize、迁移、宽容保留和字段守卫。
- `tests/shop.test.ts`：商店价格曲线、金币总池、满级效果。
- `tests/endless.test.ts`：无尽轮次、金币衰减、Boss 事件、地图时长、机制参数、狂暴乘区。
- `tests/dropItems.test.ts`：掉落道具表、通用池、地图专属引用。

新增系统行为时优先补纯数据或纯函数测试；需要 Phaser 运行时的行为用 preview 泵帧验证。

## i18n 校验

`scripts/check-i18n.mjs` 从 `ids.ts` 推导必需键，并扫描 `t('key')` 字面量和 `hud:warn` 字面量。新增内容必须同步中英键，否则 build 失败。

键名约定：

- 武器：`w_<id>`、`w_<id>_d`、`w_<id>_e`、`w_<id>_e_d`
- 被动：`p_<id>`、`p_<id>_d`
- 敌人：`en_<id>`
- 角色：`char_<id>`、`char_<id>_d`
- 地图：`map_<id>`、`map_<id>_d`、`map_<id>_win`、`map_<id>_warn`
- 成就：`ach_<id>`、`ach_<id>_d`
- 商店：`pu_<id>`、`pu_<id>_d`
- Arcana：`arc_<id>`、`arc_<id>_d`
- trait：`trait_<id>`、`trait_<id>_d`
- 词缀：`affix_<id>`
- 掉落：`drop_<id>`、`drop_<id>_d`

## 文档事实校验

`npm run check:docs` 校验：

- `docs/reference/content-catalog.md` 覆盖所有核心 ID。
- 入口文档中的内容规模数字和代码一致。
- 当前成就和 legacy 成就数量一致。

该脚本不替代人工审阅，但能防止最常见的文档过期。

## Preview 自动化要点

开发服约定端口 5183。Phaser 4 在自动化里有几个坑：

- 合成 pointer 事件非 trusted，按钮点击要直接对容器 `emit('pointerup')`。
- 后台标签页 RAF 不跑，可靠做法是同步批量 `game.loop.step(t)`。
- hidden 标签页 `setInterval` 会被节流，不能用真实 interval 等游戏自然推进。
- 自动暂停会冻结 delayedCall，泵帧时检测 paused 并发 `hud:togglepause`。
- Vite 长时间运行可能有陈旧模块缓存，怀疑状态分叉时重启 dev server。
- `import('/src/xxx.ts')` 可能创建重复模块实例，优先通过场景对象或 localStorage 驱动。

## 截图

WebGL canvas 未开启 `preserveDrawingBuffer`，直接 `toDataURL` 不可靠。使用接收器：

```bash
node scripts/shot-receiver.mjs
```

然后在浏览器上下文调用 `game.renderer.snapshot(cb)`，同步泵帧触发渲染，把缩放后的 JPEG base64 POST 到本地接收器。截图落在 `.shots/` 后用本地图片查看。

## DPS Bench

DPS bench 在 DEV 构建中由 `src/dev/bench.ts` 驱动。方法：

- 真实 GameScene，`bench:true`。
- 默认口径：三环 24 个静止标靶，r56/r110/r260 各 8；遍历 `WEAPON_META`，每把测 Lv5 与进化形态。
- 专项口径：`window.__benchConfig = { preset: 'weaponEval32' }`，覆盖 `lv1/lv3/lv5/evo` 和 `staticRings/movingSwarm/singlePack`。
- 属性全中性，暴击关闭。
- 结果输出到 `console.table`、`window.__benchRows`、`window.__benchResult` 和 `window.__benchJson`。

复现入口：

```js
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

专项入口：

```js
window.__benchConfig = { preset: 'weaponEval32' }
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

视觉接触表入口：

```js
window.__benchConfig = { preset: 'weaponVisualSheets' }
__game.scene.getScene('title').scene.start('game', { charId: 'spark', mapId: 'meadow', bench: true })
```

自动化落档：

```bash
NODE_PATH=/path/to/node_modules node scripts/run-weapon-eval.mjs --url http://127.0.0.1:5183 --dps --visual
```

当前 32 武器基准见 `docs/balance/dps-M22-32-weapons.md`；严格评估报告见 `docs/balance/weapon-evaluation-32.md`；历史 16 武器基准见 `docs/balance/dps-M12.md`。

## 手工验收矩阵

UI 改动：

- 402×874
- 1440×900
- 320×480
- 1260×540

运行时行为改动：

- 新局启动、升级、宝箱、Boss、胜利、失败。
- 中英文切换。
- 静音与音量。
- 2x/4x 倍速。
- 无尽和狂暴。
- Arcana 开关、随机、突破。
- 旧存档与坏档自愈。
