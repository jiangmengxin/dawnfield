# 内容目录

> 更新日期：2026-06-14  
> 校验：本文件由 `npm run check:docs` 机械检查 ID 覆盖。表格只记录核心信息，不复制完整数值数组；完整数值以 `src/content/*` 为准。

当前规模：32 角色 / 12 地图 / 32 武器 + 32 超武 / 16 被动 / 105 敌 / 12 Boss / 24 规则卡 / 31 掉落道具 / 16 商店强化 / 73 成就 ID（66 当前成就 + 7 legacy）。

## 角色

源文件：`src/content/characters.ts`、`src/systems/traits.ts`、`src/gfx/textures/characters.ts`。

| id | 名称 | 初始武器 | 备注 |
|---|---|---|---|
| `spark` | 小萤 | `blade` | 基准角色 |
| `rosa` | 蔷蔷 | `petal` | 轻盈、范围、暴击 |
| `dew` | 露露 | `rain` | 高生命、回复 |
| `gale` | 风风 | `boomerang` | 高速、弹速 |
| `lumen` | 琉璃 | `prism` | 玻璃大炮 |
| `volt` | 闪闪 | `spark` | 急速、磁吸 |
| `pebble` | 墩墩 | `mine` | 重装、护甲 |
| `fluff` | 蒲蒲 | `puff` | 经济、经验 |
| `ember` | 暖暖 | `lantern` | 自愈、范围 |
| `luna` | 月月 | `star` | 冷却、磁吸 |
| `conker` | 栗栗 | `mallet` | 力量、护甲 |
| `jingle` | 铃铃 | `chime` | trait `resonance` |
| `ivy` | 藤藤 | `vine` | trait `collector` |
| `berry` | 莓莓 | `sling` | trait `sweettooth` |
| `wisp` | 悠悠 | `wisp` | trait `flicker` |
| `toot` | 嘟嘟 | `bugle` | trait `fanfare` |
| `willow` | 柳柳 | `dagger` | 柳叶镖配对角色 |
| `samara` | 翅翅 | `axe` | 旋翅果配对角色 |
| `cinder` | 熠熠 | `fireball` | 流光球配对角色 |
| `tidey` | 汐汐 | `flask` | 朝露瓶配对角色 |
| `ray` | 晖晖 | `bolt` | 落晖配对角色 |
| `pipit` | 啾啾 | `bird` | 候鸟配对角色 |
| `beanie` | 豆豆 | `ricochet` | 跳跳豆配对角色 |
| `wish` | 祈祈 | `wand` | 晨星杖配对角色 |
| `pollen` | 粉粉 | `breath` | 花粉拂配对角色 |
| `vorty` | 涡涡 | `gravity` | trait `moonwell` |
| `lancey` | 矛矛 | `sword` | trait `sunlance` |
| `beebee` | 蜜蜜 | `swarm` | trait `hivecall` |
| `frosty` | 霜霜 | `frost` | trait `frostguard` |
| `twirl` | 旋旋 | `tornado` | 卷叶风配对角色 |
| `blobby` | 小蓝团 | `bomb` | 隐藏，trait `bouncy` |
| `nova` | 小流星 | `meteor` | 隐藏，trait `comet` |

## 地图

源文件：`src/content/maps.ts`、`src/content/bosses.ts`、`src/systems/mechanics/*`、`src/gfx/textures/mapassets.ts`、`src/gfx/textures/bosses.ts`。

| id | 名称 | 时长 | 核心机制 | Boss | 专属掉落 |
|---|---|---:|---|---|---|
| `meadow` | 晨光草甸 | 10 | `bloomfield` | `boss` | `bloomburst`, `verdant` |
| `pond` | 露珠池塘 | 10 | `tide` | `bubbleking` | `ebbaegis`, `ripple` |
| `hills` | 晚霞山岗 | 10 | `wind` | `galecrow` | `tailwind`, `whirlwind` |
| `grove` | 萤暮林地 | 20 | `sporechain` | `sporeking` | `sporebloom`, `fireflies` |
| `lavender` | 紫露花田 | 20 | `pollen` | `flutterqueen` | `pollenfrenzy`, `beeswarm` |
| `bramble` | 莓果灌丛 | 20 | `thornwall` | `bramblebear` | `thornnova`, `berryfeast` |
| `nocturne` | 星语夜原 | 30 | `nightfall` | `starelk` | `fullmoon`, `meteor` |
| `summit` | 破晓之巅 | 30 | `beacon` | `nightowl` | `beaconsurge`, `dawnnova` |
| `orchard` | 琥珀果园 | 20 | `orchard` | `ciderwyrm` | `goldapple`, `seedwhirl` |
| `snowbell` | 雪铃庭院 | 20 | `frostseal` | `frosthare` | `snowglobe`, `frostbell` |
| `mirage` | 彩镜沙洲 | 30 | `prismfield` | `miragewhale` | `prismshard`, `mirrorbloom` |
| `clockwork` | 晨钟庭 | 30 | `bellring` | `clockrooster` | `clockkey`, `bellnova` |

## 武器与超武

源文件：`src/content/weapons.ts`、`src/systems/weapons/*`、`src/gfx/textures/icons.ts`、`src/gfx/textures/weapons.ts`。

| id | 基础武器 | 超武 | 进化被动 |
|---|---|---|---|
| `blade` | 光刃 | 晨曦 | `power` |
| `petal` | 花瓣环 | 百花 | `bloom` |
| `prism` | 棱镜光束 | 虹折射 | `lens` |
| `rain` | 细雨 | 倾盆 | `cloud` |
| `spark` | 跃光 | 雷暴 | `battery` |
| `boomerang` | 疾风镖 | 旋风 | `wind` |
| `mine` | 星尘雷 | 新星 | 任意满级被动 |
| `puff` | 蒲公英 | 漫天飞絮 | `ladybug` |
| `lantern` | 暖灯笼 | 小太阳 | `honey` |
| `star` | 星星环 | 小银河 | `stardust` |
| `mallet` | 松果锤 | 山摇撼 | `acorn` |
| `chime` | 风铃环 | 晨钟 | `sprout` |
| `vine` | 卷卷藤 | 荆棘华尔兹 | `trellis` |
| `sling` | 莓果弹弓 | 果酱风暴 | `snack` |
| `wisp` | 流萤珠 | 萤光长河 | `feather` |
| `bugle` | 喇叭花号手 | 晨光号角 | `whistle` |
| `dagger` | 柳叶镖 | 千叶 | `wind` |
| `axe` | 旋翅果 | 千旋翅 | `power` |
| `fireball` | 流光球 | 赤曦 | `ladybug` |
| `flask` | 朝露瓶 | 朝露潮 | `cloud` |
| `bolt` | 落晖 | 万道霞光 | `battery` |
| `bird` | 候鸟 | 雁阵 | `feather` |
| `ricochet` | 跳跳豆 | 乱弹 | `stardust` |
| `wand` | 晨星杖 | 圣星杖 | `lens` |
| `breath` | 花粉拂 | 花粉风暴 | `snack` |
| `bomb` | 泡泡弹 | 连环泡 | `power` |
| `gravity` | 月华引 | 食蚀井 | `trellis` |
| `sword` | 光矛 | 贯日 | `power` |
| `swarm` | 群蜂 | 蜂巢 | `honey` |
| `meteor` | 坠星 | 流星雨 | `stardust` |
| `frost` | 晨霜 | 霜华 | `whistle` |
| `tornado` | 卷叶风 | 落叶旋 | `acorn` |

## 被动

源文件：`src/content/passives.ts`。

`power`, `bloom`, `lens`, `cloud`, `battery`, `wind`, `ladybug`, `honey`, `acorn`, `stardust`, `sprout`, `pouch`, `feather`, `snack`, `whistle`, `trellis`。

## 敌人与行为

源文件：`src/content/enemies.ts`、`src/systems/behaviors.ts`、`src/content/affixes.ts`。

行为模板：`chase`, `wobble`, `strafeShoot`, `dash`, `drift`, `hop`, `orbit`, `swoop`, `blink`, `pulse`, `turret`, `zigzag`, `spiral`, `ambush`, `burrow`, `phase`, `exploder`, `shielder`, `summoner`。

精英词缀：`swift`, `bulwark`, `splitting`, `gravitic`, `volley`。

敌人 ID：

- meadow：`blob`, `midge`, `shelly`, `spitter`, `dasher`, `splitter`, `mini`, `elite`, `boss`
- pond：`tad`, `bubble`, `snail`, `frog`, `squirt`, `jelly`, `bigbubble`, `bubbleking`
- hills：`leafy`, `grain`, `crow`, `thistle`, `wheatling`, `cone`, `gust`, `bigthistle`, `galecrow`
- grove：`shroom`, `glimmer`, `mottle`, `snapcap`, `puffcap`, `roller`, `eldercap`, `sporeking`, `bombcap`
- lavender：`budling`, `bumble`, `flutter`, `snippy`, `pompon`, `briar`, `queenbee`, `flutterqueen`, `hivebud`
- bramble：`berryling`, `bristle`, `mole`, `magpie`, `cubby`, `gourd`, `bigberry`, `bramblebear`, `husker`
- nocturne：`moonmote`, `twinkle`, `nightmoth`, `lunaling`, `owlet`, `sparkler`, `cometlord`, `starelk`, `novamote`
- summit：`shade`, `gloom`, `umbra`, `glint`, `nightbloom`, `eclipse`, `lurker`, `shadelord`, `nightowl`, `duskward`, `shadowmaw`
- orchard：`pip`, `ciderfly`, `appleling`, `nutkin`, `wormlet`, `scareseed`, `harvestorb`, `ciderwyrm`
- snowbell：`snowdrop`, `flakebunny`, `sleetwing`, `frostcap`, `crystalmite`, `bellfox`, `snowwarden`, `frosthare`
- mirage：`prismite`, `glassfin`, `mirrormoth`, `quartzbud`, `lensbeetle`, `sandsprite`, `prismguard`, `miragewhale`
- clockwork：`gearling`, `ticktock`, `cuckoobud`, `pendulum`, `brassbug`, `chimewisp`, `gearwarden`, `clockrooster`

## Boss

源文件：`src/content/bosses.ts`、`src/gfx/textures/bosses.ts`、`src/systems/BossVisual.ts`。Boss 以地图为 key 配装，敌人体格仍来自 `EnemyId`；每个 Boss 有独占主招 + 轻辅招，旧四模块只作低频辅压；实战视觉使用多帧/P2/施法/受击/死亡状态。

`boss`, `bubbleking`, `galecrow`, `sporeking`, `flutterqueen`, `bramblebear`, `starelk`, `nightowl`, `ciderwyrm`, `frosthare`, `miragewhale`, `clockrooster`。

独占招式：

| 地图 | 主招 | 辅招 |
|---|---|---|
| meadow | `ink_recall` | `crown_drip` |
| pond | `bubble_lane` | `bubble_pressure` |
| hills | `feather_return` | `sidewind_shear` |
| grove | `spore_breath` | `mushroom_drop` |
| lavender | `butterfly_clasp` | `dust_curve` |
| bramble | `bear_paws` | `bramble_rift` |
| nocturne | `constellation_lines` | `meteor_mark` |
| summit | `owl_gaze` | `feather_curtain` |
| orchard | `fruit_roll` | `cider_sprout` |
| snowbell | `snow_footsteps` | `frost_breath` |
| mirage | `mirror_tide` | `mirror_shards` |
| clockwork | `dawn_beat` | `pendulum_sweep` |

## Arcana

源文件：`src/content/arcana.ts`、`src/systems/arcana.ts`。

basic：`petaltide`, `tailwind`, `thornlace`, `goldbell`, `starpop`, `moonheart`, `dewspring`, `fireflyway`, `compass`, `onepath`, `frost`, `harvest`。

mechanic：`splinter`, `thorncore`, `vow`, `allin`, `slowburn`, `dawnfield`, `starfall`, `constellation`, `daynight`, `rooted`, `everbloom`, `knell`。

## 掉落道具

源文件：`src/content/dropItems.ts`、`src/systems/dropItems.ts`。

通用：`magnet`, `nuke`, `timestop`, `heal`, `frenzy`, `aegis`, `xpburst`。

地图专属：`bloomburst`, `verdant`, `ebbaegis`, `ripple`, `tailwind`, `whirlwind`, `sporebloom`, `fireflies`, `pollenfrenzy`, `beeswarm`, `thornnova`, `berryfeast`, `fullmoon`, `meteor`, `beaconsurge`, `dawnnova`, `goldapple`, `seedwhirl`, `snowglobe`, `frostbell`, `prismshard`, `mirrorbloom`, `clockkey`, `bellnova`。

## 商店强化

源文件：`src/content/shop.ts`、`tests/shop.test.ts`。

`power`, `vitality`, `haste`, `area`, `speed`, `magnet`, `growth`, `greed`, `armor`, `regen`, `luck`, `revive`, `reroll`, `banish`, `skip`, `fortune`。

## 成就

源文件：`src/content/achievements.ts`。

当前成就：`swarm100`, `survive5`, `level20`, `eliteSlayer`, `firstEvolve`, `maxWeapon`, `fullArsenal`, `fullCharms`, `meadowClear`, `kills1000`, `coins500`, `firstBuy`, `pondClear`, `hillsClear`, `groveClear`, `lavenderClear`, `survive15`, `level30`, `kills300`, `evolve3`, `eliteHunter`, `coins2000`, `wins5`, `fullHouse`, `maxPassive`, `brambleClear`, `nocturneClear`, `summitClear`, `orchardClear`, `snowbellClear`, `mirageClear`, `clockworkClear`, `survive20`, `kills500`, `level40`, `evolve6`, `wins10`, `hyperClear1`, `hyperAll`, `endless3`, `endless6`, `flawlessBoss`, `fiveCharWins`, `noPassiveClear`, `untouchable10`, `evolveRush`, `soloWeaponClear`, `arcanaTrio`, `affixSlayer`, `graviticEscape`, `secretBloom`, `stargazer`, `survive10`, `kills750`, `level35`, `evolve4`, `evolve5`, `arcanaDuo`, `endless1`, `endless2`, `hyperClear2`, `wins15`, `charWins10`, `affixHunter50`, `flawlessHyperBoss`, `fullBuildClear`。

legacy 成就：`kills5000`, `kills10000`, `coins5000`, `runs20`, `runs50`, `buy10`, `buy25`。
