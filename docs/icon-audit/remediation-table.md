# 图标逐项整改动作表

下表列出当前仍需处理的 P0/P1 阻断项；Candidate 行仅作为人工抽查提示，不自动阻断。

| 级别 | ID | 分类 | 现状 | 目标 | 验收 |
| --- | --- | --- | --- | --- | --- |
| OK | P0/P1 | 阻断项 | 当前没有 P0/P1 阻断项。 | 保持超武独立图标、掉落道具纸令牌底托、同族独立剪影、gem 蓝色露珠语义和全链路进化图标展示。 | 复跑 `scripts/run-icon-audit.mjs` 时 `issues.p0.length === 0` 且 `issues.p1.length === 0`。 |
| Candidate | puff | 基础武器 | minForegroundPixels=45，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | fireflyway | Arcana | minForegroundPixels=47，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | sword | 基础武器 | minForegroundPixels=49，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | ricochet | 基础武器 | minForegroundPixels=60，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | onepath | Arcana | minForegroundPixels=60，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | spark | 基础武器 | minForegroundPixels=63，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | wand | 基础武器 | minForegroundPixels=65，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | thornlace | Arcana | minForegroundPixels=65，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | blade | 基础武器 | minForegroundPixels=67，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | petal | 基础武器 | minForegroundPixels=67，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | rain | 基础武器 | minForegroundPixels=68，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | sling | 基础武器 | minForegroundPixels=69，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | swarm | 基础武器 | minForegroundPixels=69，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | prism | 基础武器 | minForegroundPixels=72，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | tailwind | Arcana | minForegroundPixels=72，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | vine | 基础武器 | minForegroundPixels=74，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | dagger | 基础武器 | minForegroundPixels=75，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | whistle | 被动 | minForegroundPixels=75，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | splinter | Arcana | minForegroundPixels=75，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | starfall | Arcana | minForegroundPixels=75，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | constellation | Arcana | minForegroundPixels=75，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | thorncore | Arcana | minForegroundPixels=76，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | mine | 基础武器 | minForegroundPixels=77，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |
| Candidate | slowburn | Arcana | minForegroundPixels=77，bbox=17×16 | 人工复核小尺寸剪影；若确认偏弱，放大主体并强化同系描边。 | 26px 无文字可识别主体类别，不依赖卡片大图。 |

