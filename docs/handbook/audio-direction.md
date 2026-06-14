# 音频方向手册

> 事实源：`src/audio/sound.ts`、`src/content/maps.ts`、`src/core/save/schema.ts`、`src/scenes/Settings.ts`。

## 音频原则

Dawnfield 的音频和美术一样坚持零外部资源。所有声音由 WebAudio 即时合成，目标是轻快、明亮、不会长时间疲劳。

设计原则：

- SFX 服务可读性：命中、击杀、升级、宝箱、受伤、Boss、机制预警必须辨识明确。
- BGM 服务地图气质：每图通过调式、速度、音色、打击乐和回声形成主题。
- 声音不抢操作反馈：高频命中音量要克制，避免密集战斗刺耳。
- 音量分轨：BGM 与 SFX 独立，静音仍走 master gain。

## SoundEngine

`src/audio/sound.ts` 暴露 `SFX` 单例。首次用户手势后调用 `unlock()` 初始化 AudioContext、master、压缩器、共享回声和噪声缓冲。

基础合成单元：

- `tone()`：振荡器音，高度、滑音、包络、音色、回声和 bus。
- `noise()`：噪声源，滤波、滑频、包络和 bus。

bus 规则：

- 默认 `bus: 'sfx'`。
- BGM 侧声音必须显式传 `bus: 'bgm'`。
- `volBgm`、`volSfx` 写入 SaveV2 `settings` 并持久化。

## SFX 分类

当前 SFX 可按用途分组：

| 分组 | 方法 | 用途 |
|---|---|---|
| 战斗基础 | `swish`、`hit`、`kill`、`boom`、`zap`、`beam`、`splash`、`throwSfx` | 武器释放、命中、爆炸、能量、投掷 |
| 拾取与成长 | `pickup`、`coin`、`heal`、`levelup`、`chest`、`evolve` | XP、金币、治疗、升级、宝箱、进化 |
| UI 与状态 | `uiClick`、`warning`、`revive` | 按钮、预警、复活 |
| 角色与事件 | `chime`、`bossRoar`、`windGust`、`fanfare` | 专属武器、Boss、地图机制、trait |
| 结算 | `victoryJingle`、`defeatJingle` | 胜利与失败 |

新增 SFX 应优先复用 `tone/noise`，不要建立独立音频管线。高频 SFX 需要控制音量和触发频率。

## 生成式 BGM

BGM 配置在 `MapSpec.bgm`，类型为 `BgmSpec`：

- `bpm`：速度。
- `scale`：拨弦音池。
- `bass`：低音根音循环。
- `chords`：pad 和弦循环。
- `pluckType` / `pluckVol`：拨弦音色与音量。
- `density` / `densityK`：基础密度与强度加成。
- `perc`：打击乐类型，当前为 `tick`、`drip`、`shaker`。
- `echo`：回声湿度。

`SFX.startBgm(spec)` 切换主题；`SFX.setIntensity(v)` 根据局内进度或事件提高密度。`document.hidden` 时 BGM tick 只推进步数，不实际发声。

## 地图主题

| 地图 | 音乐口径 |
|---|---|
| meadow | C 大调五声，96 BPM，三角拨弦，tick，明亮基准 |
| pond | A 小调五声，76 BPM，正弦拨弦，drip，水汽重回声 |
| hills | G 混合利底亚，116 BPM，三角拨弦，shaker，干声轻快 |
| grove | D 小调五声，84 BPM，正弦拨弦，tick，暮色虫鸣 |
| lavender | E 大调五声，108 BPM，三角拨弦，shaker，花田香风 |
| bramble | F 大调五声，92 BPM，三角拨弦，shaker，丰收感 |
| nocturne | B 小调五声，72 BPM，正弦拨弦，drip，午夜星光 |
| summit | C 大调跨八度，100 BPM，三角拨弦，shaker，破晓昂扬 |

新增地图应先确定情绪和机制节奏，再配 `BgmSpec`。不要为新地图改 `sound.ts` 结构，除非新增的音乐语汇无法由现有字段表达。

## 设置与存档

音频设置保存在 SaveV2：

- `muted`
- `volBgm`
- `volSfx`

旧散键 `dawnfield.muted` / `dawnfield.volume` 已由迁移吸收。新增音频设置必须走 `core/save`，不能再写散键。

## 验收

音频改动后至少验证：

- 首次点击后 `unlock()` 正常，不触发移动端自动播放限制。
- 静音和 BGM/SFX 分轨音量即时生效并持久化。
- 高密度战斗中没有明显爆音或刺耳循环。
- 背景标签页不继续发声。
- 新 SFX 在 `npm run build` 中没有引入外部资源。
