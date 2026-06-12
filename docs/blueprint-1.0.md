# 晨野 Dawnfield 1.0 开发蓝图

> 全量规划 + 分阶段执行。每个里程碑结束时游戏可玩、可验收。
> 状态标记：✅ 已完成 ｜ 🔶 部分提前完成 ｜ ⬜ 未开始

## 一、项目背景

晨野 Dawnfield 是 Phaser 4.1 + Vite 7 + TypeScript 5.8 的吸血鬼幸存者类网页游戏。从约 4.5K 行的垂直切片（1 角色、7 武器各带进化、6 被动、9 敌人、1 张无限地图、12 分钟单局、1 个 Boss）扩展为「角色/武器/地图/文案全原创」的大体量 1.0：

- **16 角色 / 8 地图 / 16 基础武器 + 16 超武 / 16 被动**
- 零外部美术（Canvas 程序化纹理）、零外部音频（WebAudio 合成）
- 全年龄明亮童话气质；中英双语
- 重点适配 iPhone 竖屏（402×874pt 安全区）与桌面横屏
- 预计全量 15K-20K 行代码

## 二、已确认的设计决策

| 决策点 | 选择 |
|---|---|
| 现有内容 | 保留并扩展（7 武器/6 被动/9 敌人计入总量，草甸为第 1 图） |
| 角色差异化 | VS 式：初始武器 + 属性偏移，16 角色 ↔ 16 武器一一配对 |
| 超武规则 | VS 标准：满级 + 配对被动 + 宝箱（`evolvable()` 已是满级+被动判定，宝箱内容分层在 M2） |
| 携带上限 | 6 武器 + 6 被动（✅ 已提前实施，HUD 常显 6+6 圆形令牌槽位） |
| 金币用途 | 仅属性永久强化商店（VS PowerUp 式，可重置全额返还） |
| 解锁机制 | 游玩成就式（用 X 角色生存 Y 分钟、武器升满级、通关地图 A 等） |
| 敌人量级 | 12-16 种行为模板 × 每图换皮调色 = 每图专属敌人池；8 个每图专属 Boss |
| 地图机制 | 全部无限平原 + 每图一条轻量机制（减速地皮/定时风暴/治愈泉等），不引入碰撞 |
| 图鉴成就 | 图鉴全覆盖（武器/被动/敌人/角色/地图，首遇点亮）；成就约 40 个，多数兼作解锁条件 |
| 单局时长 | 按地图 10-30 分钟；1x/2x 倍速单按钮（✅ 基础版已提前上线） |
| 文案 | 中英双语同步（M5 起加 check-i18n 脚本机械校验键覆盖） |
| 规则卡 | 10 张类 Arcana 原创卡，架构 M2 预留钩子，M9 最后实施 |
| UI 优先 | M1 先做响应式 UI 框架 + 全界面占位 |
| 设置项 | 伤害数字、屏幕震动、音量、调试（信息/无敌/全屏拾取）——✅ 均已实装生效 |

## 三、目标架构

### 目录结构（目标态）

```
src/
  main.ts                      # 仅注册场景
  core/
    events.ts                  # ✅ 类型化事件总线
    router.ts                  # ✅ 场景导航 + 返回栈
    settings.ts                # ✅ 临时设置存储（M3 并入版本化存档）
    input/                     # ✅ InputManager + Keyboard/Touch/Gamepad(stub)
    save/                      # schema/migrations/storage（M3）
    MetaState.ts               # 局外状态（M3）
    RunState.ts                # ✅ 局内状态 + 属性重算
    TimeController.ts          # ✅ 倍速+hitstop 统一时钟
    registry.ts                # ✅ defineTable<Id,Spec> 通用注册表
  content/                     # ✅ 纯数据层，无 Phaser 依赖（含武器平衡表）
    ids.ts weapons.ts passives.ts enemies.ts player.ts
    characters.ts maps.ts bosses.ts achievements.ts shop.ts arcana.ts  # M3+ 按批次补
  scenes/                      # ✅ 全部 11 个场景已建
    Boot Title Game HUD Result
    CharacterSelect MapSelect Shop Codex Achievements Settings
  systems/                     # ✅ M2 已拆分（Game.ts → 249 行编排器）
    context.ts                 # ✅ CombatContext + RunSystem + RunModifier
    WaveDirector EnemySystem behaviors BossController            # ✅
    weapons/ PlayerSystem PickupSystem ProjectileSystem ZoneSystem  # ✅
    LevelUpSystem DecorSystem  # ✅
    MapMechanicSystem AchievementTracker                         # M3/M5
    grid.ts effects.ts joystick.ts   # 保留
  ui/                          # ✅ M1 完成
    Viewport.ts                # 安全区/断点(compact|medium|wide)/缩放/防抖重建
    UIScene.ts layout.ts theme.ts
    widgets/                   # Button/Card/CardGrid/ScrollPanel/Modal/Tabs/Toggle/Slider
  gfx/
    palette.ts                 # 扩展每图主题色组（M5）
    textures/                  # 按域拆分 + 参数化生成器（M4）
  audio/sound.ts               # 扩展每图 BGM 种子（M5）
  i18n/                        # M4 起按域拆 dict/
scripts/check-i18n.mjs         # content ids ↔ 字典 diff，缺键即 build 失败（M5）
```

### 核心接口（M2 落地）

```ts
// systems/context.ts — 武器/敌人系统看到的世界，GameScene 实现
interface CombatContext {
  player / facing / stats / grid / enemies / fx / running / elapsed
  hitEnemy(e, dmg, opts?); addZone(z: ZoneSpec); magnetizeGems(x, y, r);
  spawnEnemyBullet(spec); scene: Phaser.Scene;
}
// GameScene → ~200 行编排器：systems: RunSystem[] 顺序 update
// RunModifier（规则卡钩子，M2 即挂空）:
//   statMods / modifyOffers / onEnemyKilled / modifyDamage / onChest / onTick
// 存档 SaveV1{v, coins, powerUps, unlocked, codex, achievements, stats, settings}
//   解析失败→原文备份 .corrupt 键重建；v0 吸收旧 lang/muted/settings 键
//   persist(): 300ms debounce + visibilitychange/结算强制 flush
```

### Game.ts 拆分映射（M2）

| 原 Game.ts | 新归属 |
|---|---|
| movePlayer | PlayerSystem |
| updateGems / updatePickups | PickupSystem（金币掉落在此新增） |
| inkballs | ProjectileSystem（参数化供 8 Boss 复用） |
| addPuddle / addStardust | ZoneSystem（`effect: slow/heal/burn/haste`，兼地图机制地皮） |
| openLevelUp / buildOffers | LevelUpSystem |
| updateDecor | DecorSystem |
| 胜负判定 | 留在 GameScene |

### 响应式 UI 要点（✅ M1 已落地）

- **Viewport**：DOM 探针读 `env(safe-area-inset-*)`；断点 compact(<480)/medium(<840)/wide；`s()/fs()` 缩放；onChange 150ms 防抖 + 尺寸漂移二次校验 + `scale.refresh()` 兜底
- **布局哲学**：不做约束求解，「一次性布局函数 + resize 全量重建」；UIScene 基类统一 buildLayout/rebuild/goBack
- **HUD 双形态**：单场景 + compact 判定（竖屏 < 480）；竖屏常驻 XP 通栏/HP/计时/倍速/暂停 + 6+6 槽位，详情进暂停面板；桌面加击杀/等级
- **统一规格**：标准菜单按钮 `THEME.btnW/btnH/btnFs`（240×54/19）；技能槽位为圆形令牌（图标本身是圆形纹理）；暂停图标用 Graphics 绘制（避免 emoji 平台差异）
- **导航**：Title 枢纽 → CharacterSelect → MapSelect → Game(+HUD) → Result；Shop/Codex/Achievements/Settings 平级；未解锁内容显示「???+解锁条件」占位卡
- **语言选择**：弹窗列表（`Settings.LANGS` 登记制，支持多语言扩展）

### 程序化资产规模化（M4+）

- 角色：`makeCharacter(scene, key, recipe)` 参数化配方（形体/配色/眼型/帽饰/拖尾），每角色一行配方
- 敌人换皮：`makeEnemy(scene, key, shape(~8 形体), palette, face)`；进图懒生成、离图 `textures.remove`；简单变体用 tint
- 超武视觉：复用基础武器纹理 + 缩放/叠层/换色为主
- i18n 键名公约：`char_<id>` / `w_<id>(_d/_e/_e_d)` / `p_<id>(_d)` / `en_<id>` / `map_<id>(_d)` / `ach_<id>(_d)` / `arc_<id>(_d)` / `ui_*` / `set_*`；预估 600+ 键

## 四、里程碑

### ✅ M1 — 响应式 UI 框架 + 全界面占位（已完成并验收）
- ui/ 全套（Viewport/UIScene/layout/theme/8 组件）；Title 重做；CharacterSelect（1 真 15 锁）、MapSelect（1 真 7 锁）、Shop/Codex/Achievements 占位页、Settings 实装；HUD 双 Profile；router；安全区探针
- **验收记录**：402×874 竖屏全流程、1440×900 桌面、320×480、21:9 均无遮挡溢出；语言切换全页重建；设置持久化
- **超出计划完成**：1x/2x 倍速基础版（dt/time/tweens 三时钟同步+持久化）；6+6 携带上限与 HUD 圆形令牌槽位常显；调试开关（信息/无敌/全屏拾取）实际生效；伤害数字/屏幕震动开关接入全部调用点；语言选择弹窗

### ✅ M2 — 核心重构（不加内容，行为等价）（已完成并验收）
- content/ 数据层建立（config.ts 全量迁入，武器平衡表一并抽出）；Game.ts 拆 8 系统 + RunState；敌人行为模板表（chase/wobble/strafeShoot/dash）；weapons 拆目录接 CombatContext；InputManager（键盘/触控/手柄 stub）；类型化事件（core/events）；TimeController 正式化；宝箱内容分层（可进化→进化，否则→升级×N，无可升级→金币）；RunModifier 六钩子全部空挂；registry.ts defineTable
- **验收记录**：`tsc --noEmit` 零错误；Game.ts 249 行；运行时逐项对照——波次混合/定点事件、7 武器全运行、喷喷弹幕、冲冲冲刺、分裂球死亡分裂×2、水洼减速与星尘灼烧（ZoneSystem）、升级三选一（暂停/恢复/属性重算 65→84.5 磁吸）、宝箱三层（进化「晨曦」/升级「疾风镖 Lv2」/金币）、Boss 720s 准时苏醒（HP 15696=hpScale 精确一致）二阶段弹幕环、胜负两条结算链、重开局状态清零、1x/2x 三时钟同步

### ⬜ M3 — 存档/金币/解锁/成就/图鉴骨架 + 调试面板完善
- save 模块（v1+迁移+损坏兜底，吸收现有 lang/muted/settings 键）；MetaState；金币掉落+结算入账；Shop 实装（10-12 项 PowerUp，重置全返）；成就引擎+首批 ~12；图鉴首遇点亮+New 角标；调试面板补充（加币/时间跳跃/指定武器/实体计数）
- **验收**：刷新数据保留；手工破坏 localStorage 自愈且留备份；商店买/重置数额正确

### ⬜ M4 — 角色系统 + 内容批次 A（角色 1-8）
- textures 拆分+参数化生成器；CharacterSpec 生效（初始武器+属性偏移）；8 角色配对现 7 武器+新武器 1 把；被动 6→8；解锁成就接入；图鉴角色页
- **验收**：8 角色外观/属性/初始武器各异可解锁；新武器+超武完整

### ⬜ M5 — 地图框架 + 地图 2-3 + 轻机制 + 倍速细化
- MapSpec 全链路（波次/时长/敌池/装饰/配色/BGM 种子）；行为模板扩到 ~12；换皮管线；MapMechanicSystem（图2 减速水皮、图3 定时风暴）；Boss 2-3；倍速穿隧细化（快弹 effDt>1/30 时半步判定）；地图解锁链；check-i18n 脚本
- **验收**：3 图节奏明显差异；2x 下 blade 二段斩/rain 错峰/boomerang 折返专项查；手机峰值 FPS≥50

### ⬜ M6 — 内容批次 B（角色/武器 9-12、地图 4-5）
- 武器 9-12+超武（补 zone/orbit/melee/burst 空缺）；角色 9-12；被动→12；地图 4-5+Boss+机制（治愈泉/麦浪阵风）；行为模板→14；成就→28

### ⬜ M7 — 内容批次 C（13-16、地图 6-8）补完
- 武器/角色 13-16；被动→16；地图 6-8+Boss 6-8（图 8 为 30 分钟终局图）；成就→40；图鉴五类全覆盖
- **验收**：16/16/16/8/8 全量；任一角色×任一图可通局；存档迁移通过

### ⬜ M8 — 设置/调试完善 + 性能与平衡 pass
- 调试面板补齐（武器 DPS 统计/波次预览）；FPS 采样动态敌人上限；纹理生命周期；全比例回归；数值平衡巡检；BGM/SFX 分轨音量
- **验收**：4x CPU throttle 峰值 ≥45 FPS；全 8 图无软锁

### ⬜ M9 — 规则卡 Arcana（10 张）+ 收尾
- ArcanaSpec+10 卡实装 RunModifier 钩子（开局选 1，Boss 宝箱可再得）；选卡 UI；规则卡图鉴页；最终润色
- **验收**：10 卡可叠加无冲突；关闭规则卡开关行为与 M8 等价

## 五、风险与缓解

| 风险 | 缓解 |
|---|---|
| 手机性能 | enemyCapMul/粒子降档 + FPS 动态降刷怪上限 + 伤害数字开关 + M5/M8 throttle 基准验收 |
| 存档损坏/演进 | 版本号+迁移链+类型守卫+corrupt 备份+debounce 写入；schema 改动必配迁移并用旧档验证 |
| 倍速时钟错位 | 统一经 `setSpeed`（M2 起 TimeController）；禁止 systems 内裸 setTimeout；M5 专项验收 |
| 内容平衡发散 | M3 先交 DPS 调试面板；数值全在 content 表调参不碰行为代码 |
| 重构回归 | M2 零新功能；行为快照清单逐项对照 |
| resize 重建闪烁 | 150ms 防抖；ScrollPanel 记忆位置；游戏中旋转仅 HUD 重建 |

## 六、验证方式

- 每里程碑：`npx tsc --noEmit` + `npm run dev`（端口 5183），按验收清单操作截图验证
- 移动竖屏：402×874 模拟 iPhone 17 Pro；极端比例 320×480、21:9 抽查
- M5 起每内容批次跑 `npm run check:i18n`；M8 用 4x CPU throttle 测峰值帧率
