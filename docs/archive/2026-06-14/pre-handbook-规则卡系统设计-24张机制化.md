# 规则卡（Arcana）扩展至 24 张 · 全机制化设计文档

> 状态：**已实装（M21）**。本文为设计与逐卡机制说明，落地细节见文末「实装记录」。
> 关联代码：数据层 `src/content/arcana.ts`（`ARCANA_META` / `ARC_FX`）、行为层 `src/systems/arcana.ts`（`createArcanaModifier`）、ID `src/content/ids.ts:63`、文案 `src/i18n.ts`（`arc_*`）、解锁 `src/content/achievements.ts`（`unlockArcana`）。

---

## 1. 需求与已确认的方向

**目标**：规则卡从现有 **16 张 → 24 张**，且**全部机制化**——不允许存在"只有数值增加、没有独特机制"的卡。

**已与产品确认的四条方向**（本次对齐结论）：

| 议题 | 结论 |
|------|------|
| 现有纯数值卡（花开满野 / 顺风童谣 / 小小尖刺）与半机制卡（金铃 / 萤火）如何处理 | **保留主题、原地加机制**——卡名/配色/图标/定位不变，给每张补一个独特机制，数值仍在但不再是唯一效果 |
| 24 张的强度梯度 | **轻重搭配**——既有"小而独特"的轻机制，也有"整局转型"的构筑卡，池子有节奏 |
| 解锁/出现结构 | **延续分层解锁**——一部分开局常驻，一部分成就解锁 |
| 引擎范围 | **放开设计、引擎后补**——优先用现有 11 钩子；个别卡需要新钩子/`CombatContext` 能力的，在文中标注「⚙️需引擎」，后补 |

**待你最终拍板的三个默认项**（文中已按默认推进，可改）：

1. **单局持有上限 `maxPerRun`**：默认仍为 **3**。24 张后组合更丰富，可考虑提到 **4**（见 §8）。
2. **常驻/解锁分层比例**：默认 **12 常驻 + 12 解锁**（现状是 10+6）。
3. **6 张新机制卡的解锁成就**：文中给了建议条件（§6），具体绑哪条成就由产品定。

---

## 2. 总览：24 张分层表

> 轴 = 该卡主要影响的构筑方向；强度：●轻机制 / ●●构筑卡 / ●●●整局转型。

### 常驻卡（basic，开局选卡池恒在，12 张）

| # | id | 中文名 | EN | 轴 | 强度 | 主钩子 | 状态 |
|---|----|--------|----|----|------|--------|------|
| 1 | `petaltide` | 花开满野 | Blooming Tide | 范围/增伤 | ●● | `statMods`+`modifyDamage` | **改造** |
| 2 | `tailwind` | 顺风童谣 | Tailwind Rhyme | 走位/增伤 | ●● | `statMods`+`onTick`+`modifyDamage` | **改造** |
| 3 | `thornlace` | 小小尖刺 | Tiny Thorns | 暴击/DoT | ●● | `statMods`+`onWeaponHit` ⚙️ | **改造** |
| 4 | `goldbell` | 金铃叮当 | Golden Jingle | 经济/范围 | ●● | `statMods`+`onCoinPicked` | **改造** |
| 5 | `fireflyway` | 萤火向导 | Firefly Guide | 磁吸/召唤 | ●● | `statMods`+`onTick` | **改造** |
| 6 | `starpop` | 星屑爆响 | Star Pop | 清场 | ● | `onEnemyKilled` | 保留 |
| 7 | `moonheart` | 月夜勇气 | Moonlit Courage | 残血输出 | ● | `modifyDamage` | 保留 |
| 8 | `dewspring` | 甘露清泉 | Sweet Springwater | 续航 | ● | `onTick` | 保留 |
| 9 | `compass` | 藏宝罗盘 | Treasure Compass | 经济 | ● | `onTick`+`onChest` | 保留 |
| 10 | `onepath` | 专一之路 | The Single Path | 构筑收束 | ●● | `modifyOffers`+`statMods` | 保留 |
| 11 | `frost` | 晨霜 | Morning Frost | 防御/控场 | ● | `onPlayerDamaged` | **新增** |
| 12 | `harvest` | 丰收时节 | Harvest | 经济 | ● | `onCoinPicked`+`onTick` ⚙️ | **新增** |

### 解锁卡（mechanic，成就解锁后入池，12 张）

| # | id | 中文名 | EN | 轴 | 强度 | 主钩子 | 状态 |
|---|----|--------|----|----|------|--------|------|
| 13 | `splinter` | 裂光回响 | Splinter Echo | 命中衍生 | ●● | `onWeaponHit` | 保留 |
| 14 | `thorncore` | 荆棘之心 | Bramble Heart | 承伤反击 | ●● | `onPlayerDamaged` | 保留 |
| 15 | `vow` | 燃晖之誓 | Vow of Embers | 禁疗换攻 | ●●● | `statMods` | 保留 |
| 16 | `allin` | 孤注一掷 | All In | 少而精 | ●●● | `statMods` | 保留 |
| 17 | `slowburn` | 凝光 | Slowlight | 大招化 | ●●● | `statMods` | 保留 |
| 18 | `dawnfield` | 晨光领域 | Dawnfield | 磁吸转伤 | ●●● | `statMods`+`onTick` | 保留 |
| 19 | `starfall` | 坠星之约 | Starfall Pact | 周期爆发 | ●● | `onTick` | **新增** |
| 20 | `constellation` | 众星拱月 | Constellation | 多武器 | ●●● | `statMods` ⚙️ | **新增** |
| 21 | `daynight` | 昼夜更迭 | Day & Night | 节奏切换 | ●●● | `statMods`+`onTick` | **新增** |
| 22 | `rooted` | 生根 | Rooted | 驻足输出 | ●●● | `statMods`+`onTick` | **新增** |
| 23 | `everbloom` | 不凋之花 | Everbloom | 保命兜底 | ●● | `onPlayerDamaged` ⚙️ | **新增** |
| 24 | `knell` | 暮鼓晨钟 | Tolling Bell | 命中节拍 | ● | `onWeaponHit` | **新增** |

**轴覆盖检查**：输出（thornlace/moonheart/starfall/knell）、清场（starpop）、范围（petaltide/goldbell）、走位（tailwind/rooted）、磁吸召唤（fireflyway/dawnfield）、经济（goldbell/compass/harvest）、续航（dewspring）、防御兜底（frost/everbloom/thorncore）、构筑收束/转型（onepath/allin/constellation/slowburn/vow/daynight）。无重复纯数值，轴分布均衡。

---

## 3. 旧卡机制化改造（5 张）

> 原则：**保留 id / 配色 / 图标 / 中英卡名 / 原有数值**，只新增一段独特机制并改写描述文案 `arc_*_d`。

### 3.1 `petaltide` 花开满野 —— 加「花环易伤领域」

- **原**：范围 ×1.25、弹速 ×1.10（纯数值）。
- **新增机制**：玩家周身存在一圈随范围扩张的「花环」，**身处花环内的敌人受到的伤害 +18%**（易伤光环）。范围越大、光环越大，把"范围数值"转成主动收益。
- **实现**：`statMods` 保留原乘区；新增 `modifyDamage(dmg, e)` 闭包读 `ctx.player` 与 `e` 距离，半径 = `ctx.stats.magnet`×系数 或独立半径常量，命中敌人在环内则 `dmg *= petaltideVuln`。`onTick` 每 ~1.5s 画一圈淡粉花环做视觉提示。
- **新文案**：`范围 +25%、弹速 +10%；身周绽放花环，环内敌人受伤 +18%`。

### 3.2 `tailwind` 顺风童谣 —— 加「风势（移动积攒增伤）」

- **原**：移速 ×1.12、冷却 ×0.90（纯数值）。
- **新增机制**：**持续移动积攒"风势"**，最高叠到 +30% 伤害与弹速；**停下或受伤则风势消散**。奖励风筝走位，与同池新卡 `rooted`（驻足增益）形成正反两极玩法。
- **实现**：`onTick` 测 `ctx.player` 帧位移，移动则 `momentum` 向 1 爬升、静止/受伤清零（受伤可在 `onPlayerDamaged` 清零）；`modifyDamage` 闭包乘 `(1 + momentum * tailwindGust)`。HUD 可后续加风势条（非必须）。
- **新文案**：`移速 +12%、冷却 -10%；持续移动积攒风势，最高 +30% 伤害，停下即散`。

### 3.3 `thornlace` 小小尖刺 —— 加「暴击流血 + 尖刺迸裂」 ⚙️

- **原**：暴击率 +10%、伤害 ×1.08（纯数值）。
- **新增机制**：**暴击命中令敌人流血** N 秒（每秒 = 该次暴击伤害的一定比例）；**流血中的敌人死亡时迸裂尖刺**扎向最近 1–2 个敌人。让暴击构筑有独立的 DoT 收益层。
- **实现**：`onWeaponHit(e, applied, ctx)` 需新增"本次是否暴击"的信息——**⚙️需引擎**：`onWeaponHit` 增加 `crit: boolean`（或传 hit 详情）。流血用闭包 `Map<Enemy, {t, dps}>` + `onTick` 结算 `hitEnemy(noHook)`；迸裂在敌人死亡时（`onEnemyKilled` 判断是否在流血表）触发。
- **新文案**：`暴击 +10%、伤害 +8%；暴击使敌人流血，流血敌死亡迸裂尖刺`。

### 3.4 `goldbell` 金铃叮当 —— 把「掉币」升级为「金铃声波」

- **原**：金币获取 ×1.25 + 击杀 12% 掉币（半机制）。
- **新增机制**：**拾取金币积蓄铃音**，每满 X 枚迸发一圈「金铃声波」——范围伤害 + 击退 + 在原地撒落少量金币（金币越多攒得越快，经济直接转战力）。保留金币 +25%。
- **实现**：`onCoinPicked(value, ctx)` 累加计数，达阈值清零并 `grid.queryCircle` + `hitEnemy` + `fx.ring` + `spawnCoin`。移除原 `onEnemyKilled` 掉币（被声波撒币取代，避免重复）。
- **新文案**：`金币获取 +25%；拾取金币积蓄铃音，满 X 枚迸发金铃声波`。

### 3.5 `fireflyway` 萤火向导 —— 加「环绕萤火扑敌」

- **原**：磁吸 ×1.35 + 每 30s 吸来全场光珠（半机制）。
- **新增机制**：身边**环绕 N 只萤火**，周期性扑向最近敌人造成微量伤害并点亮（可叠"萤光"标记，命中即结算）。把磁吸/经验流构筑接上一条独立输出。保留周期吸珠。
- **实现**：`onTick` 维护 N 个萤火精灵（`ctx.scene.add.image`）绕玩家公转；每 ~0.8s 选最近敌人 tween 扑击 → `hitEnemy(quiet,noHook)` + `dmgLog('arc_fireflyway')`。无需新钩子。
- **新文案**：`磁吸 +35%、周期吸珠；身边萤火扑向敌人造成持续伤害`。

---

## 4. 保留卡（11 张，机制不变）

这些卡已是机制卡，**本次不改**，仅列出以确认它们满足"全机制化"：

- 常驻 5 张：`starpop`（击杀星屑爆炸）、`moonheart`（残血增伤曲线）、`dewspring`（周期治愈泉）、`compass`（开局宝箱 + 金币翻倍）、`onepath`（升级只出已持有）。
- 解锁 6 张：`splinter`（命中迸光屑）、`thorncore`（承伤蓄能爆新星）、`vow`（禁疗换攻、爱心转金币）、`allin`（武器槽降为 4、全武器急速）、`slowburn`（大招化）、`dawnfield`（磁吸化作灼光领域）。

---

## 5. 新增 8 张详述

> 主题统一在《晨露之野》的"花/萤/露/月/星/晨光/荆棘/钟"暖色童话调性。配色为建议值，图标需新增 `icon_arc_*` 纹理（`src/gfx/textures/icons.ts`）。

### 常驻 · 轻机制（2 张）

#### 5.1 `frost` 晨霜 · Morning Frost ｜防御/控场 ●
- **机制**：**受击时在脚下迸发一圈寒霜**，将周围敌人减速 X 秒（短内置 CD，防连击刷屏）。被打反而创造喘息窗口。
- **实现**：`onPlayerDamaged` → `addZone({effect:'slow', affectsPlayer:false, ...})` + `fx.ring`，闭包记 CD。复用现有 `ZoneSpec` slow。**无需引擎**。
- **配色/图标**：`0xbfe3f0` / `icon_arc_frost`（雪花）。

#### 5.2 `harvest` 丰收时节 · Harvest ｜经济 ● ⚙️
- **机制**：拾取的金币/经验光珠有概率**当场复制一份**（丰收溢出）。轻量经济正反馈，喂养金币/经验流构筑。
- **实现**：金币侧 `onCoinPicked` → 概率 `spawnCoin` 复制；经验侧需 **⚙️新钩子 `onGemPicked`**（当前无）。若不想加钩子，可降级为"周期在脚下撒一小撮光珠"用 `onTick`+`spawnGem` 近似。
- **配色/图标**：`0xe8c878` / `icon_arc_harvest`（麦穗）。

### 解锁 · 构筑/转型（6 张）

#### 5.3 `starfall` 坠星之约 · Starfall Pact ｜周期爆发 ●●
- **机制**：**每 X 秒天降一颗流星**砸向最近/最强敌人，造成大范围爆发伤害 + 击退。与任何构筑兼容的稳定爆发源（夜原主题点题）。
- **实现**：`onTick` 计时 → 选目标（`grid` 最近或最高 HP）→ 下落 tween → `queryCircle` AoE `hitEnemy(noHook)` + `fx`。**无需引擎**。
- **解锁建议**：图 7「星语夜原」通关，或单局击败某夜系 Boss。
- **配色/图标**：`0x9fb0e8` / `icon_arc_starfall`（坠星）。

#### 5.4 `constellation` 众星拱月 · Constellation ｜多武器 ●●●
- **机制**：**每持有 1 把武器，全武器伤害 +Y%**（铺满武器越强）。与 `allin`（少而精）正好相反，给"贪多"流派一张压舱卡。
- **实现**：`statMods(s)` 读当前武器数 → `s.dmg *= 1 + (count * constellationPer)`。**⚙️需引擎**：`statMods` 需能拿到当前武器数（经 `ctx.run` 暴露武器列表，或 `CombatContext` 加 `weaponCount`）。
- **解锁建议**：单局集满 6 把武器（可复用 `fullArsenal` 链或新成就）。
- **配色/图标**：`0xc8b8f0` / `icon_arc_constellation`（星座连线）。

#### 5.5 `daynight` 昼夜更迭 · Day & Night ｜节奏切换 ●●●
- **机制**：**每 X 秒在「昼/夜」间切换**——昼：伤害↑、范围↑；夜：冷却↓、暴击↑。强迫玩家随节奏调整站位与爆发时机。
- **实现**：`onTick` 翻转 `phase` 并 `ctx.recomputeStats()`；`statMods(s)` 读闭包 `phase` 施加对应乘区。`recomputeStats` 已存在，**无需引擎**。HUD 可加昼夜小图标（非必须）。
- **解锁建议**：同一局内分别在白天/夜晚地图各通关一次，或累计游玩时长。
- **配色/图标**：`0x8fb0d8`（昼夜双色）/ `icon_arc_daynight`（半日半月）。

#### 5.6 `rooted` 生根 · Rooted ｜驻足输出 ●●●
- **机制**：**静止不动满 X 秒进入「生根」态**，伤害与范围大增；**一旦移动即解除**、需重新蓄。炮台流/守点流的招牌卡，与 `tailwind`（移动增伤）成镜像。
- **实现**：`onTick` 累计静止时间，跨阈值切 `rooted` 标志并 `recomputeStats`；`statMods` 据标志施加乘区。**无需引擎**。脚下生根藤蔓视觉提示。
- **解锁建议**：单局某段时间几乎不移动通关，或 `soloWeaponClear` 类硬核成就。
- **配色/图标**：`0x9ad07a` / `icon_arc_rooted`（根须）。

#### 5.7 `everbloom` 不凋之花 · Everbloom ｜保命兜底 ●● ⚙️
- **机制**：生命**首次跌破 50% 与 25% 时各触发一次**：全屏清场（范围伤害）+ 短暂无敌（每局仅 2 次，绽放即重生）。给高难/无尽一张兜底。
- **实现**：`onPlayerDamaged` 检测阈值穿越，闭包记已用次数 → 全场 `hitEnemy` + 短暂无敌。**⚙️需引擎**：临时授予无敌（可复用 `setDropState({invuln:true})` 通道，定时关）。
- **解锁建议**：达成某"残血翻盘"或高难通关成就。
- **配色/图标**：`0xf6b8c8` / `icon_arc_everbloom`（重瓣花）。

#### 5.8 `knell` 暮鼓晨钟 · Tolling Bell ｜命中节拍 ●
- **机制**：**武器每第 N 次命中"钟鸣"一下**——对目标及周围追加一次回响伤害（半倍、`noHook` 防递归）。攻速越高、命中越密，钟鸣越频，奖励高频武器。
- **实现**：`onWeaponHit(e, applied, ctx)` 闭包计数，第 N 次 → `queryCircle` + `hitEnemy(noHook)` 半倍 + `fx.ring` + `dmgLog('arc_knell')`。**无需引擎**。
- **解锁建议**：单局达成某"高命中次数/高 DPS"成就。
- **配色/图标**：`0xe0c060` / `icon_arc_knell`（钟）。

---

## 6. 解锁结构与成就映射（延续分层）

现有 6 张机制卡的解锁（`src/content/achievements.ts`，不变）：

| 成就 | 解锁卡 |
|------|--------|
| `maxWeapon` | `splinter` |
| `fullArsenal` | `allin` |
| `eliteHunter` | `thorncore` |
| `maxPassive` | `slowburn` |
| `level40` | `vow` |
| `wins10` | `dawnfield` |

**新增 6 张需各绑一条解锁成就**（建议条件，最终由产品定；可新增成就或复用尚无 `unlockArcana` 的现有成就）：

| 新卡 | 建议解锁条件 |
|------|--------------|
| `starfall` | 通关「星语夜原」/ 击败夜系 Boss |
| `constellation` | 单局集满 6 把武器 |
| `daynight` | 累计游玩时长 / 昼夜地图各通关一次 |
| `rooted` | 硬核（少移动 / 单武器）通关 |
| `everbloom` | 残血翻盘 / 高难通关 |
| `knell` | 单局高命中次数 / 高 DPS |

> `frost`、`harvest` 列为**常驻**，无需解锁。

---

## 7. `ARC_FX` 数值新增/调整（建议初值，待调参）

> 仅列改造卡的新增项与新卡项；保留卡沿用现值。最终平衡在实装后用 `docs/balance` 基准回归。

```ts
// —— 改造卡新增 ——
petaltideVuln: 1.18,        // 花环内敌人受伤乘子
petaltideRingK: 0.9,        // 花环半径 = magnet × K（或独立常量）
tailwindGust: 0.30,         // 风势满层增伤/弹速上限
tailwindRamp: 0.6,          // 每秒风势爬升（约 1.7s 满）
thornlaceBleedDur: 3,       // 暴击流血持续（秒）
thornlaceBleedK: 0.4,       // 每秒流血 = 该次暴击伤害 × K
thornlaceBurstN: 2,         // 流血敌死亡迸裂尖刺枚数
goldbellSonicEvery: 8,      // 金铃声波所需拾币枚数
goldbellSonicR: 200,        // 声波半径
goldbellSonicDmg: 30,       // 声波伤害 × stats.dmg
fireflyN: 3,                // 环绕萤火数量
fireflyEveryHit: 0.8,       // 萤火扑击间隔（秒）
fireflyDmgK: 0.5,           // 萤火伤害 = stats.dmg × K

// —— 新增卡 ——
frostSlowDur: 2.5, frostR: 150, frostSlowMul: 0.5, frostCd: 4,
harvestChance: 0.25,        // 拾取复制概率
starfallEvery: 6, starfallR: 180, starfallDmg: 80, starfallKb: 220,
constellationPer: 0.10,     // 每把武器全员增伤
daynightEvery: 12, daynightDayDmg: 1.25, daynightDayArea: 1.15,
  daynightNightCd: 0.8, daynightNightCrit: 0.15,
rootedDelay: 3, rootedDmg: 1.6, rootedArea: 1.35,
everbloomThresholds: [0.5, 0.25], everbloomR: 520, everbloomDmg: 200,
  everbloomInvuln: 1.5,
knellEvery: 5, knellR: 120, knellK: 0.5,
```

---

## 8. ⚙️需引擎后补的能力清单

按"放开设计、引擎后补"，以下能力缺口集中列出，落地时统一补：

| 能力 | 服务的卡 | 备注 |
|------|----------|------|
| `onWeaponHit` 暴露**暴击标志**（`crit`/hit 详情） | `thornlace` | 当前 `onWeaponHit(e, applied, ctx)` 无暴击信息 |
| 通用**流血/DoT 登记**（或确认用闭包 `Map`+`onTick` 自实现可接受） | `thornlace` | 多卡未来可复用，建议做成小工具 |
| `statMods` / `ctx` 暴露**当前武器数** | `constellation` | 经 `ctx.run` 武器列表或 `CombatContext.weaponCount` |
| 新钩子 `onGemPicked(value, ctx)` | `harvest`（经验侧） | 不加则 `harvest` 降级为 `onTick` 撒珠近似 |
| 临时**授予无敌**接口 | `everbloom` | 可复用 `setDropState({invuln:true})` + 定时关 |

> 其余新机制（`frost`/`starfall`/`daynight`/`rooted`/`knell` 及 `petaltide`/`tailwind`/`goldbell`/`fireflyway` 改造）**均可用现有 11 钩子 + `ctx`（含 `recomputeStats`/`addZone`/`hitEnemy`/`grid`/`fx`/`spawnCoin`）实现，无需引擎改动**。

---

## 9. 待确认项（请拍板）

1. **`maxPerRun`**：保持 3，还是提到 4？（24 张后组合更深，4 张能玩出更多 combo；3 张更克制。）
2. **分层比例**：认可 **12 常驻 + 12 解锁** 吗？（也可 14+10 等。）
3. **6 张新机制卡的解锁成就**：用 §6 建议条件，还是你另指定？是否接受为此**新增成就**（会进图鉴成就页）？
4. **改造卡的数值取舍**：花环易伤 +18%、风势 +30% 等初值是否符合预期强度？
5. **`harvest` 经验复制**：接受新增 `onGemPicked` 钩子，还是用 `onTick` 撒珠近似（不动引擎）？
6. **`everbloom` 兜底**：每局 2 次清场+无敌是否过强？是否限定仅无尽/高难可选？

---

## 10. 实施改动点清单（确认后开发用）

> 本期**不开发**，仅预登记落地时要动的文件，便于评估工作量。

1. `src/content/ids.ts:63` — `ArcanaId` 追加 8 个新 id。
2. `src/content/arcana.ts` — `ARCANA_META` 加 8 条（id/color/icon/tier）；`ARC_FX` 加 §7 数值；改造卡描述无需改此处。
3. `src/systems/arcana.ts` — 5 张改造卡补机制；新增 8 个 `case`。
4. `src/i18n.ts` — 8 组新 `arc_*` / `arc_*_d`；改写 5 张改造卡的 `arc_*_d` 文案（中英）。
5. `src/gfx/textures/icons.ts` — 新增 8 个 `icon_arc_*` 纹理。
6. `src/content/achievements.ts` — 6 张新机制卡绑 `unlockArcana`（新增或复用成就）。
7. ⚙️引擎缺口（§8）：`onWeaponHit` 暴击标志、`onGemPicked` 钩子、武器数暴露、临时无敌接口、`RunModifier` 接口注释更新。
8. 图鉴 `src/scenes/Codex.ts` 规则卡页自动随表扩展，核对布局容纳 24 张。
9. 测试：若有 `tests/arcana*.test.ts`，补新卡用例与机制断言。

---

## 11. 实装记录（M21）

按设计文档 + §9 默认值落地，关键决策与实际实现：

**确认项取值**：`maxPerRun` 维持 **3**；分层 **12 常驻 + 12 解锁**；6 张新机制卡按 §6 建议绑定既有成就（未新增成就，复用并叠加 `unlockArcana`）：
- `starfall` ← `nocturneClear`、`constellation` ← `fullHouse`、`daynight` ← `survive20`、`rooted` ← `soloWeaponClear`、`everbloom` ← `hyperClear1`、`knell` ← `kills1000`。

**§8 引擎缺口处理**：
- `onWeaponHit` 增加第 4 参 `crit: boolean`（`context.ts` + `Game.ts:434` 调用点）→ thornlace 暴击流血。
- 新增 `onGemPicked` 钩子 + `ctx.notifyGemPicked`（`context.ts` + `Game.ts` ctx + `PickupSystem.ts:165` 拾珠点）→ harvest 经验复制。
- 新增 `ctx.weaponCount`（`Game.ts` getter）→ constellation `statMods` 读取（武器增减经 `LevelUpSystem.applyOffer` recompute 同步）。
- everbloom 无敌直接写 `ctx.run.iframeT`（无需新接口）；frost 减速复用 `addZone({effect:'slow'})`（区内敌人减速由 ZoneSystem 固定 0.55×，故 `frostSlowMul` 未落地）。
- thornlace 流血用闭包 `Map<Enemy,…>` + `onTick` 自实现（未做通用 DoT 工具）。

**实际改动文件**：`ids.ts`、`content/arcana.ts`、`systems/arcana.ts`、`systems/context.ts`、`scenes/Game.ts`、`systems/PickupSystem.ts`、`i18n.ts`、`gfx/textures/icons.ts`、`content/achievements.ts`。

**验证**：`tsc --noEmit` 通过；`check-i18n` 必需键全覆盖；`vitest` 35/35 通过；预览实跑——24 张图标全部生成、13 张新/改造卡同局叠加 40s（23 击杀 + 玩家受伤 + 升级）零运行时报错，`arc_fireflyway` / `arc_everbloom` 等新伤害源经 DpsTracker 确认归账。

> 仍开放、可后续微调：各卡平衡数值（§7 为初值，建议用 `docs/balance` 基准回归）；`everbloom` 是否限定无尽/高难；`tailwind`「风势」是否补 HUD 提示条。
