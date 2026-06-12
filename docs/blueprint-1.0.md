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
    settings.ts                # ✅ 设置门面（M3 起由版本化存档承载）
    input/                     # ✅ InputManager + Keyboard/Touch/Gamepad(stub)
    save/                      # ✅ schema/migrations/storage（M3：v1+迁移链+损坏自愈+debounce）
    MetaState.ts               # ✅ 局外状态（M3：金币/强化/图鉴/成就/解锁/统计）
    RunState.ts                # ✅ 局内状态 + 属性重算
    TimeController.ts          # ✅ 倍速+hitstop 统一时钟
    registry.ts                # ✅ defineTable<Id,Spec> 通用注册表
  content/                     # ✅ 纯数据层，无 Phaser 依赖（含武器平衡表）
    ids.ts weapons.ts passives.ts enemies.ts player.ts
    shop.ts achievements.ts    # ✅ M3：11 项永久强化；成就 M7 起 40 个全量（含地图解锁链）
    characters.ts              # ✅ M4/M6/M7：16 角色 Spec 全量
    maps.ts bosses.ts          # ✅ M5/M6/M7：MapSpec 全链路 ×8 + BossSpec 配装表 ×8
    arcana.ts                  # ✅ M9：10 规则卡 META + 获取规则 + ARC_FX 数值表
  scenes/                      # ✅ 全部 11 个场景已建
    Boot Title Game HUD Result
    CharacterSelect MapSelect Shop Codex Achievements Settings
  systems/                     # ✅ M2 已拆分（Game.ts → 249 行编排器）
    context.ts                 # ✅ CombatContext + RunSystem + RunModifier
    WaveDirector EnemySystem behaviors BossController            # ✅
    weapons/ PlayerSystem PickupSystem ProjectileSystem ZoneSystem  # ✅
    LevelUpSystem DecorSystem  # ✅
    AchievementTracker         # ✅ M3 成就引擎
    arcana.ts                  # ✅ M9：规则卡行为工厂（RunModifier 六钩子实装）
    MapMechanicSystem          # ✅ M5/M6/M7：水皮/大风/治愈泉/顺风带/荆棘地皮/流星雨/晨光柱
    grid.ts effects.ts joystick.ts   # 保留
  ui/                          # ✅ M1 完成
    Viewport.ts                # 安全区/断点(compact|medium|wide)/缩放/防抖重建
    UIScene.ts layout.ts theme.ts
    widgets/                   # Button/Card/CardGrid/ScrollPanel/Modal/Tabs/Toggle/Slider
  gfx/
    palette.ts                 # ✅ M5-M7：每图主题色组（POND/HILLS/GROVE/LAVENDER/BRAMBLE/NOCTURNE/SUMMIT）+ DEATH_COLOR 全敌覆盖
    textures/                  # ✅ M4 按域拆分；M5 增 mapassets.ts（makeEnemy 换皮管线 18 形体 + ensureMapAssets 懒生成）
  audio/sound.ts               # ✅ M5：BgmSpec 每图主题（调式/速度/音色/打击乐/回声）
  i18n/                        # M6+ 视体量按域拆 dict/
scripts/check-i18n.mjs         # ✅ M5：content ids ↔ 字典 diff，缺键即 build 失败（已挂 build 链）
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

### ✅ M3 — 存档/金币/解锁/成就/图鉴骨架 + 调试面板完善（已完成并验收）
- save 模块（v1+迁移链+损坏兜底，吸收现有 lang/muted/volume/settings 键；300ms debounce + visibilitychange/pagehide 强制 flush）；MetaState 单例；金币掉落（普通 6% 概率/精英爆 5×3/宝箱金币层 30+治疗 30）+ 金币球磁吸收取 + 结算与中途退出入账；Shop 实装（11 项 PowerUp，逐级涨价 base×(lv+1)，重置全额返还，余额/不足提示）；永久强化汇入 RunState（伤害/生命/冷却/范围/移速/磁吸/经验/金币/护甲/回复/暴击，开局快照）；成就引擎（条件全在 content 表，局内每秒评估+金色 toast，结算/购买补评）+ 首批 12；图鉴首遇点亮（武器/被动/敌人/角色/地图五类全 hook）+ New 角标 + 浏览即清除 + 主菜单红点；调试面板补充（加币 +1000 不计累计/时间跳跃 +60s/指定武器弹窗/HUD 实体计数行：敌珠币弹域）；HUD 桌面金币计数；结算页金币行+本局新成就展示
- **验收记录**：`tsc --noEmit` 零错误；v0 散键吸收（lang=en/muted/volume=0.4/settings 全并入且旧键删除）；手工写入损坏 JSON → 原文备份 `dawnfield.save.corrupt` + 默认档重建零报错；刷新后成就/金币/图鉴/统计全保留；全流程通局（胜利 12:05/365 杀/+20 币）→ 结算入账 runs/wins/kills/bestSurvival/coinsEarned 精确累计；中途退出经 `recordRun` 入账不计胜场；商店购买 23→15（磁场 8 币）、二次价格 16、余额不足提示、重置返还 8 → 23、返还不计累计获得、firstBuy 成就即时解锁；图鉴 6 武器点亮带「新!」、未遇见细雨显示 ???、浏览后角标清除、敌人 9 种全点亮；成就页 6/12 锁定项显示条件；调试三键实测生效（+1000 币/暂停局 +60s/弹窗给武器并点亮图鉴）；402×874 / 320×480（设置页矮屏行高压缩修复）/ 1440×900 无溢出

### ✅ M4 — 角色系统 + 内容批次 A（角色 1-8）（已完成并验收）
- gfx/textures 拆为 6 域模块（core/characters/enemies/weapons/icons/misc）+ `makeCharacter(scene, key, recipe)` 参数化配方（异形剪影 round/drop/gem/stone/egg ×体色径向渐变×大高光眼 4 眼型×4 嘴型×17 种饰件），每角色一行配方、自动生成 4 帧动效纹理（姿态A/B 饰件摆动 × 睁眼/眨眼，PlayerSystem 驱动：移动 0.22s 摆动、随机眨眼、困倦角色眨眼帧睁眼偷看）；角色与敌人刻意拉开表现力：敌人保持扁平粉彩圆团静态单帧，角色独占渐变/异形剪影/常驻腮红/动效帧/专属移动拖尾粒子（CharacterSpec.trail，PlayerSystem 发射）；CharacterSpec 全链路生效（content/characters.ts：初始武器一一配对 + 基础 HP/移速/体积绝对值 + 乘/加属性偏移，RunState 按角色重算，PlayerSystem 体积接入接触判定/影子/血条高度）；8 角色（小萤均衡/蔷蔷小快暴击/露露厚血回复/风风极速弹快/琉璃玻璃炮/闪闪急速磁吸/墩墩重装护甲/蒲蒲金币经验幸运，HP 70-170、移速 142-215、半径 12-18 差异显著）；新武器「蒲公英」（扇形齐射飘摇种子穿透 2，进化「漫天飞絮」全周环射+缓追）；被动 6→8（瓢虫结暴击+4%/级、蜜糖罐回复 0.5/s/级）；成就解锁接入（AchievementSpec.unlockChar，7 角色挂既有成就，unlockAch 即时解锁 + Boot 旧档回填 syncAchUnlocks，成就页显示解锁奖励、未达成不剧透角色名）；图鉴角色页迁 content；CharacterSelect 实装（未解锁显示 ???+成就条件）；RunResult 携带 charId/mapId（结算谢幕用本局角色、再来一局同角色同图）；Card desc 开启 useAdvancedWrap（中文断行）
- **验收记录**：`tsc --noEmit` 零错误 + `npm run build` 通过；选人页 8 真卡（纹理/描边色各异）+8 锁定占位、锁定卡显示「达成「晨光初照」解锁」式条件；写入全成就存档 → Boot 回填 8 角色全解锁；蒲蒲开局实测 HP95/速180/金币×1.35/经验×1.15/暴击+3%、初始武器蒲公英扇形齐射；满级+瓢虫结 → evolvable 判定 → 漫天飞絮 16 粒环射；墩墩 HP170/护甲2/速142/半径18 体积观感明显；升级卡池 200 次抽样覆盖 8 武器+8 被动；蜜糖罐 2 级实测 5s 回 5.0 HP；战败结算谢幕显示墩墩、再来一局保持 pebble/HP170；图鉴角色 16 格、首遇点亮带「新!」；成就页「· 解锁角色：露露」奖励行；1280×800 / 402×874 / 320×480(英文) 无遮挡溢出

### ✅ M5 — 地图框架 + 地图 2-3 + 轻机制 + 倍速细化（已完成并验收）
- MapSpec 全链路（content/maps.ts：时长/纸底配色/装饰层/专属敌池波次事件/机制/BGM 主题/Boss/解锁成就，DecorSystem·WaveDirector·GameScene 全数据驱动）；行为模板 4→12（新增 drift 飘近/hop 跃扑/orbit 绕轨/swoop 俯冲/blink 闪现/pulse 脉冲滚动/turret 炮台/zigzag 锯齿，调参常量全在 content）；换皮管线 `makeEnemy(shape×palette×face)` 12 形体配方 + `ensureMapAssets` 进图/进 UI 页幂等懒生成（Codex/Achievements/MapSelect 均接入）；地图 2「露珠池塘」15 分钟（厚血慢节奏：蜗蜗坦克/水枪鱼炮台/软水母绕轨/蛙蹦蹦，水绿纸底+睡莲芦苇涟漪，76BPM A 小调五声+水滴打击乐）与地图 3「晚霞山岗」18 分钟（轻血海量快节奏：蓟滚滚冲刺/小乌鸫俯冲/风精灵闪现/松果球脉冲，暖桃纸底+麦秆落叶雏菊，116BPM G 混合利底亚+沙锤）；MapMechanicSystem（图2 减速水皮：周期生成、敌我同减速、玩家涟漪反馈；图3 定时大风：预警横幅→7s 全场推挤按 knockMul+顺风飘叶+阵风音效）；BossSpec 配装表参数化 BossController（弹幕环/瞄准扇射/召唤/冲撞四模块自由配装供 8 Boss 复用）+Boss 2「泡泡大王」（弹幕区域型，无冲撞）/Boss 3「风暴鸦」（高频扇射+凶猛冲刺）；长图成长缩放 timeK=12/分钟（hp/dmg/弹幕/BGM 强度曲线统一）；倍速穿隧细化（敌弹/疾风镖/蒲公英种子 effDt>1/30 半步推进判定）；地图解锁链（meadowClear→pond→pondClear→hills，unlockMap 经 Meta 落档+Boot 旧档回填）+成就 12→14；每图 Boss 条名称/配色、预警横幅、胜利副标题（map_<id>_warn/_win）；check-i18n 脚本（ids 联合类型↔字典机械 diff+字面量扫描，缺键即 build 失败，已挂 build 链）
- **验收记录**：`npm run build` 通过（check-i18n 237 键/必需 220 全覆盖 + tsc 零错误）；地图选择页 3 真卡（图标/主题色/12·15·18 分钟标签各异）+5 锁定占位；写入 meadowClear+pondClear 旧档 → Boot 回填 pond/hills 解锁；池塘实测（水皮减速可见、泡泡/蝌蚪/蛙群/水母/大泡泡精英全运行、Boss 900s 准时 HP18312=hpScale(eff) 精确、泡泡弹幕、胜利副标题「池水又清澈如镜了」、pondClear 落档）；山岗实测（风暴预警→推挤实测 2s 位移 130px、风暴鸦 1080s 苏醒羽毛扇射、终局 185 敌在场 FPS143/桌面 56/竖屏、hillsClear 落档）；2x 专项（blade 二段斩双弧、rain 错峰落雨、boomerang 折返采样 2→0→2 周期归零无残留，半步判定在 2x 数学必然激活）；图鉴敌人页 26 项懒生成纹理全渲染、未遇 ???；402×874 竖屏选图/HUD/Boss 条无遮挡溢出；模拟环境峰值 FPS≥56（真机 4x throttle 基准归 M8）

### ✅ M6 — 内容批次 B（角色/武器 9-12、地图 4-5）（已完成并验收）
- 武器 9-12 补 zone/orbit/melee/burst 机制空缺：暖灯笼/小太阳（贴身暖光圈周期灼噬，进化加推力）、星星环/小银河（远轨呼吸公转 + 在场/休息占空循环，进化常驻 +2 星）、松果锤/山摇撼（瞄向砸点抡锤前摇→重击 + hitstop，进化二段震波）、风铃环/晨钟（自心扩张波前每敌一击，进化连响两记强击退）；被动 8→12（橡果壳护甲/星砂瓶弹速/新芽铃经验/小钱袋金币，RunState 汇入）；角色 9-12 一一配对（暖暖厚血自愈大光圈/月月弹速冷却磁吸/栗栗高伤护甲/铃铃轻快大范围）+ 4 新饰件（提灯果/绕头星月/松果鳞帽/铃铛领结）；地图 4「萤暮林地」21 分钟（中速韧性：害羞菇潜伏惊醒/孢孢菇炮台/滚滚甲冲滚，苔绿纸底+蕨叶蘑菇萤光，84BPM D 小调五声重回声）与地图 5「紫露花田」24 分钟（轻快缠绕：紫蝶螺旋盘入/嗡嗡蜂俯冲/绒球弹跳/刺莓莓射刺，淡紫纸底+薰衣草株蝶影，108BPM E 大调五声沙锤）；机制 springs 治愈泉（周期泉眼站入回血，ZoneSystem heal 接贴图地皮）与 gusts 花浪顺风带（haste 效果落地：hasteMulAt 敌我同加速 ×1.4）；行为模板 12→14（spiral 螺旋盘入 / ambush 原地潜伏-惊醒爆发循环）；Boss 4「蘑菇长老」（区域召唤型：慢速孢子环+全程召唤+二阶段瞄准孢子柱，不冲撞）/Boss 5「紫蝶女王」（优雅游击型：鳞粉扇射+翩跹冲掠+二阶段鳞粉环/蝶群）；makeEnemy 形体 12→15（cap 蘑菇盖/moth 蝶蛾翅/bee 条纹蜂）；成就 14→28（4 新角色解锁挂 survive15/level30/kills300/evolve3，地图解锁链 hillsClear→grove、groveClear→lavender；AchRunView 增 maxPassive 字段）
- **验收记录**：`npm run build` 通过（check-i18n 321 键/必需 304 全覆盖 + tsc 零错误）；选人页 12 真卡 +4 锁定、选图页 5 真卡（12·15·18·21·24 分钟标签）+3 锁定；暖暖×萤暮林地实测（HP125/光圈持续灼噬 60+ 杀、治愈泉 97s 涌出站入 60→92 回血、害羞菇潜伏 α0.78 不动→近身惊醒冲刺、蘑菇长老 hpScale 精确 5615 孢子环 12 弹 gz_spore + 召唤菇群、击杀→groveClear 落档并解锁紫露花田）；月月×紫露花田实测（星星环 2 星公转击杀、顺风带 lz_breeze mul1.4 玩家实测加速、紫蝶螺旋盘入、刺莓莓射 lz_thorn）；栗栗松果锤 / 铃铃风铃环均正常击杀且 4 帧动效轮换；图鉴敌人页 42 项新怪点亮带「新!」；成就页 28 项；402×874 竖屏选图/HUD 无遮挡溢出，桌面 1280×800 全页正常；运行全程 __errs 零错误

### ✅ M7 — 内容批次 C（13-16、地图 6-8）补完（已完成并验收）
- 武器 13-16 补 whip/炮射/追踪/哨塔 机制空缺：卷卷藤/荆棘华尔兹（藤鞭长条判定横扫，进化加打身后第二鞭更长）、莓果弹弓/果酱风暴（瞄准最近 n 敌抛物线炮射落地爆炸，进化加爆炸并留黏滞果酱减速区）、流萤珠/萤光长河（全周放出转向追敌的萤光，进化更多更快可穿透 2）、喇叭花号手/晨光号角（种植哨塔朝最近敌连射种子，进化双株齐奏更快可穿透）；被动 12→16（飘飘羽移速/莓果蜜饯生命+回复/草叶哨范围+弹速/小花架磁吸+经验，RunState 汇入 + snack 获得时回复）；角色 13-16 一一配对（藤藤磁吸经验收集者/莓莓暴击金币甜莓/悠悠极速施法最小体格 r11/嘟嘟大范围护甲号手）+ 4 新饰件（卷须呆毛+肩叶/草莓小帽/幽光苗+飘浮光点/头顶喇叭花+音符）；地图 6「莓果灌丛」26 分钟（中坚黏人：钻钻鼠 burrow 地下突进/莓爪崽 hop 扑袭/浆果炮 turret，莓红橄榄纸底，92BPM F 大调五声沙锤）与地图 7「星语夜原」28 分钟（夜行游击：星闪闪 blink/月相灵 phase 明暗变速/小枭枭 orbit/星火花 strafeShoot，淡夜蓝纸底，72BPM B 小调五声重回声水滴）与地图 8「破晓之巅」30 分钟终局图（影群海量：影伏伏 ambush/蚀月轮 pulse/夜昙昙 turret，暖金纸底，100BPM C 大调五声跨两八度）；机制三新增（brambles 荆棘地皮扎玩家不伤敌、starfall 流星雨预警圈→敌我同伤可借力清群、dawnpillar 晨光柱站入回血+灼烧柱中敌人）；行为模板 14→16（burrow 地表慢走-钻地疾掘-破土僵直 / phase 明相缓行-暗相疾行）；makeEnemy 形体 15→18（eared 圆耳团/starlet 星形身/crescent 月相轮）；Boss 6「莓刺熊王」（贴身蛮力：扑撞+莓果扇射+二阶段莓果环/召唤）/Boss 7「星角鹿王」（星辉游走：星屑环+疾掠+二阶段瞄准星屑/召唤月尘）/Boss 8「永夜枭」（终局全能：夜瓣环+扇射+全程召唤影群+俯冲）；成就 28→40（地图解锁链 lavenderClear→bramble→nocturne→summit；4 新角色挂 survive20/coins2000/wins5/kills500，coins2000/wins5 为既有成就 Boot 回填）；图鉴五类全覆盖（16/16/67/16/8）
- **验收记录**：`npm run build` 通过（check-i18n 414 键/必需 396 全覆盖 + tsc 零错误）；选人页 16 真卡（4 新角色纹理/饰件各异）、选图页 8 真卡（12-30 分钟标签）；写入全成就存档 → Boot 回填 16 角色 + 8 地图全解锁；藤藤×莓果灌丛通局实测（HP115/磁吸 78=65×1.2/经验×1.1、卷卷藤横扫、22s 荆棘地皮可见且扎脚、钻钻鼠/莓爪崽/浆果炮全运行、Boss 1560s 准时 HP23496=hpScale 精确、莓果扇射+二阶段环射、胜利副标题「莓果又能安心采摘了」）；莓莓×星语夜原通局（暴击+0.06/金币×1.1、流星雨预警圈→落星敌我同伤实测玩家被砸 12、星角鹿王星屑弹幕环）；嘟嘟×破晓之巅 30 分钟终局通局（HP130/范围×1.18/护甲 1、晨光柱站入回血、永夜枭全技能、胜利副标题「黎明回到了晨野」）；悠悠冒烟（HP75/cd0.88/4 帧动效轮换）；四新武器满级+配对被动 → evolvable 全过 → 进化运行零错误；新被动数值逐项精确（蜜饯+20HP+0.4 回复、飘羽×1.18、草叶哨×1.12、花架×1.15 磁吸）；结算入账 3 胜 4 局/1260 杀/bestSurvival 1813s；图鉴 67 敌 8 图懒生成全渲染、新条目带「新!」；成就页 40 项；402×874 竖屏选图/HUD 无遮挡溢出；运行全程 __errs 零错误

### ✅ M8 — 设置/调试完善 + 性能与平衡 pass（已完成并验收）
- BGM/SFX 分轨音量（SaveSettings.volBgm/volSfx 纯增量字段，旧档单一 volume 在 sanitize 作两轨默认值吸收、v0 散键迁移同步改写；合成时按声音所属轨乘入音量，回声随声源同轨缩放；设置页双滑杆替代「单音量+声音开关」两行，SFX 滑杆拖动即时试听；静音开关仍在主菜单/暂停面板）；武器 DPS 统计（systems/DpsTracker 滚动 10s 窗口+累计，hitEnemy 改为返回实际结算伤害，WeaponManager 给每武器发归账子上下文——原型链委托 + 重写 hitEnemy/addZone 注入来源，16 个武器行为文件零改动；ZoneSpec.src 让星尘雷灼烧区域伤害也归账；HUD 调试覆盖层第三行显示 top6）；波次预览（WaveDirector.preview() 当前波+下一事件进 HUD 调试第二行；设置页调试区第 4 键弹出当前局完整波次/事件时间表弹窗，当前波金色高亮、ScrollPanel 滚动）；FPS 采样动态敌人上限（每秒采样 actualFps：<45 每秒 cap×-0.1 至 0.4、≥57 每秒 +0.05 回升；ctx.enemyCapMul 乘入动态系数，Effects.setQuality 粒子同步降档 0.6；HUD 调试行显示 cap×N）；纹理生命周期（ensureMapAssets 以前后 getTextureKeys 差集登记每图懒生成键，进图 releaseMapAssets 释放其它图——8 图全量 293 纹理 → 进图 180；图鉴/成就/选图页需要时经 ensureMapAssets 重新懒生成）；ScrollPanel 遮罩修复（存量 bug：Phaser 4 WebGL 不支持 GeometryMask，setMask 仅 console 告警导致滚动内容溢出视口——WebGL 改用 Mask filter（enableFilters+filters.internal.addMask），Canvas 渲染器保留 GeometryMask）；数值平衡巡检（16 武器同场景单武器 Lv5×30s 实测横向对比，中位 ≈190 DPS：流萤珠 49→86（+弹数/弹伤/转向力 520/弹速 280）、喇叭花 79（哨塔射程内供怪饱和非弹伤不足，仍提弹伤 27→33+射速 0.5 利后期高血量）、蒲公英 90→101（粒伤+15%）；星尘雷 333 居顶属站桩基准虚高保留；其余 100-308 按角色定位（纯输出/带控制/带防御）认定合理）
- **验收记录**：`npm run build` 通过（check-i18n 416 键/必需 397 全覆盖 + tsc 零错误）；旧档 volume=0.4 → 重载后两轨各 0.4 精确吸收；8 图全链路脚本通局（每图 Boss 准时苏醒 → 斩杀 → 结算页，`__errs` 全程零错误，无一软锁）；峰值帧耗实测（1280×800 dpr2、Boss 在场+刷怪满上限 94-210 敌、终局图另测满配 6 武器全进化）avg 1.25-1.98ms / p95 2.7-4.4ms——按 4x CPU throttle 折算 p95 ≈17.6ms ≈ 57 FPS ≥45 达标；动态上限实测（采样源置 30fps → 5 秒后 cap×0.5+粒子 0.6 档；恢复 60fps → 15 秒回升 ×1.0）；纹理释放实测（池塘→山岗 e_tad 移除、图鉴全量生成后进图 293→180、重进图鉴 67 敌全部重新懒生成渲染）；DPS 归账实测（四武器并行独立计数、星尘雷含灼烧区域伤害）；波次预览弹窗当前波金色高亮、内容精确裁剪在面板内；402×874 / 320×480（中英文）/ 1260×540 / 1280×800 设置页、竖屏 HUD 三行调试覆盖层、图鉴滚动页均无遮挡溢出

### ✅ M9 — 规则卡 Arcana（10 张）+ 收尾（已完成并验收）
- content/arcana.ts（ArcanaId×10 + ArcanaMeta + ARCANA 获取规则{开局三选一/宝箱 30% 再得/单局上限 3}+ ARC_FX 数值表）+ systems/arcana.ts `createArcanaModifier(id, ctx)`——RunModifier 六钩子全部实装：statMods（花开满野 范围1.25×弹速1.1 / 顺风童谣 移速1.12×冷却0.9 / 小小尖刺 暴击+0.1×伤害1.08 / 金铃叮当 金币1.25 / 萤火向导 磁吸1.35 / 专一之路 冷却0.92）、modifyOffers（专一之路：三选一只出已持有项，无可升级回落原样）、onEnemyKilled（金铃 12% 掉币——CombatContext 新增 spawnCoin；星屑爆响 15% 半径 90 爆炸 16×stats.dmg，本地数组防连锁嵌套覆写）、modifyDamage（月夜勇气：损失生命×0.5 至多 +40%）、onChest（藏宝罗盘：金币层 ×2——ChestReward gold 改携带 coins/heal 数额）、onTick（甘露清泉 25s 周期 heal 区域复用 ZoneSystem / 萤火向导 30s 全场磁吸 / 罗盘开局掉宝箱）
- 获取链路：开局选卡（`RunState.pendingArcana` → LevelUpSystem.openArcanaPick 优先于升级 → `hud:arcana` 事件 → HUD 全卡池网格覆盖层：全部未持有卡铺开任选 1，横屏 5 列/竖屏 2 列、末行居中、主题色顶带方卡、极矮卡（ch<96）自动省略描述；autoPick 调试直选时金色横幅告知所得卡）+ 宝箱第二层（进化层之后 30% 概率随机一张，未到上限且开关开启）+ 设置页调试「获得规则卡」直给弹窗（绕过单局上限，供叠加验收）；统一入口 `GameScene.grantArcana`（去重 → 推 modifier → 图鉴点亮 → 重算属性 → 金环特效）；`modifiers` 每局 create 重置（保数组引用）
- UI/存档：持有卡只在暂停面板展示（方形小卡行：白卡底+主题色描边 40px，HUD 战斗界面不常显；矮屏时按钮区动态下移）；宝箱开出规则卡的图标+文案展示；图鉴第六类「规则卡」标签页（CodexCat 增 'arcana' 纯增量、emptyCats/sanitize 兜底旧档，首遇点亮带「新!」）；设置「规则卡」开关（SaveSettings.arcana 纯增量默认开，sanitize 双向兼容无需迁移）；i18n `arc_<id>(_d)` ×10 + 5 UI 键（check-i18n 增 ArcanaId 推导）；图标 `icon_arc_<id>` ×10 程序化令牌；设置页行高极矮屏下限 34→26（12 行 + 5 调试键 320×480 收入屏内）
- **验收记录**：`npm run build` 通过（check-i18n 441 键全覆盖 + tsc 零错误）；开局三选一桌面 1280×800 三卡横排 / 竖屏 402×874 纵排（中英文、320×480 英文长名无重叠）；选「顺风童谣」→ 移速 196=175×1.12、冷却 0.9 精确，选后即恢复运行；10 卡全叠加（调试直给）复合属性逐项精确（范围 1.25/冷却 0.828=0.9×0.92/暴击 +0.1/伤害 ×1.08/金币 ×1.25/磁吸 87.75=65×1.35/弹速 ×1.1），带 10 卡跑 50+ 秒 `__errs` 零错误；钩子逐项实测——专一之路升级三选一仅出已持有「光刃 Lv2」一张、罗盘开局宝箱在场且金币层 30→60、甘露泉 50.4s 准时二次涌泉（25s 周期）站入回满、金铃击杀掉币经 coinGain 入账 2.5；宝箱分层采样：持有全部 10 张 200/200 不出卡层、未持有 49/200≈30% 出卡层；宝箱开出「月夜勇气」展示链路（图标弹出+名称+描述+OK 应用）；关闭设置开关 → 新局无开局选卡、modifiers 空、宝箱 100/100 无卡层（与 M8 等价）；图鉴规则卡页 10 卡点亮带「新!」、HUD 第三行 3 令牌（竖屏）/10 令牌（调试满给桌面）均不遮挡；设置页 12 行 1280×800 / 402×874 / 320×480 无溢出；旧档（无 arcana 字段）加载默认开关开、图鉴类目自动补空，零报错

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
