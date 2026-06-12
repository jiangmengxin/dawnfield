// 极简 i18n：扁平字典 + t()，语言持久化进版本化存档（core/save），切换时广播
import { getSave, persistSave } from './core/save';

export type Lang = 'zh' | 'en';

type Dict = Record<string, [zh: string, en: string]>;

const D: Dict = {
  // 菜单
  title: ['晨野', 'DAWNFIELD'],
  subtitle: ['在晨野中坚守到光明降临', 'Hold the dawnfield until the light returns'],
  start: ['开 始', 'START'],
  langBtn: ['English', '中文'],
  soundOn: ['♪ 声音：开', '♪ Sound: On'],
  soundOff: ['♪ 声音：关', '♪ Sound: Off'],
  hintDesktop: ['WASD / 方向键移动 · 武器自动施放', 'Move with WASD / Arrows · Weapons auto-fire'],
  hintMobile: ['按住屏幕拖动移动 · 武器自动施放', 'Touch & drag to move · Weapons auto-fire'],

  // HUD
  pause: ['暂停', 'Paused'],
  resume: ['继续', 'Resume'],
  quit: ['返回主菜单', 'Main Menu'],
  level: ['等级', 'LV'],
  eliteWarn: ['! 精英来袭 !', '! An elite approaches !'],
  stormWarn: ['! 大风将至，站稳脚跟 !', '! A gale is coming, hold steady !'],

  // 升级
  levelUpTitle: ['升级！选择一项', 'Level Up! Pick one'],
  newTag: ['新!', 'New!'],
  evolveTag: ['进化', 'EVOLVE'],
  maxTag: ['满级', 'MAX'],

  // 宝箱
  chestTitle: ['晨光宝箱', 'Dawn Chest'],
  chestOpen: ['点击开启', 'Tap to open'],
  chestGold: ['金光闪闪！金币 +{c}，生命 +{h}', 'Shiny! +{c} coins, +{h} HP'],
  chestUpgrade: ['装备升级！', 'Gear upgraded!'],

  // 结算（胜利副标题随地图：map_<id>_win）
  victory: ['胜 利 ！', 'VICTORY!'],
  defeat: ['倒下了…', 'You fell...'],
  defeatSub: ['晨野会记得你的光', 'The dawnfield remembers your light'],
  statTime: ['存活时间', 'Time Survived'],
  statKills: ['击败', 'Defeated'],
  statLevel: ['最终等级', 'Final Level'],
  statCoins: ['获得金币', 'Coins Earned'],
  statBuild: ['你的武器', 'Your Arsenal'],
  retry: ['再来一局', 'Play Again'],

  // 武器（名称 + 升级卡描述）
  w_blade: ['光刃', 'Light Blade'],
  w_blade_d: ['向最近的敌人挥出弧形斩击', 'Sweeps an arc toward the nearest foe'],
  w_blade_e: ['晨曦', 'Dawn Edge'],
  w_blade_e_d: ['360° 全周斩 + 扩散冲击环', 'Full-circle slash with a shockwave ring'],
  w_petal: ['花瓣环', 'Petal Ring'],
  w_petal_d: ['花瓣环绕周身，触碰伤害并击退', 'Petals orbit you, damaging on contact'],
  w_petal_e: ['百花', 'Full Bloom'],
  w_petal_e_d: ['双层花环，定期绽放花瓣弹幕', 'Twin rings that burst into petal volleys'],
  w_prism: ['棱镜光束', 'Prism Beam'],
  w_prism_d: ['蓄能后射出贯穿彩虹光束', 'Charges, then fires a piercing rainbow beam'],
  w_prism_e: ['虹折射', 'Spectrum'],
  w_prism_e_d: ['光束末端折射出两道子光束', 'Beams refract into two more at the tip'],
  w_rain: ['细雨', 'Drizzle'],
  w_rain_d: ['雨滴落在敌人头顶，留下减速水洼', 'Raindrops splash foes, leaving slowing puddles'],
  w_rain_e: ['倾盆', 'Downpour'],
  w_rain_e_d: ['雨云跟随你，不断洒落大雨', 'A raincloud follows you, pouring endlessly'],
  w_spark: ['跃光', 'Spark Chain'],
  w_spark_d: ['闪电在敌人之间链式跳跃', 'Lightning leaps from foe to foe'],
  w_spark_e: ['雷暴', 'Storm Coil'],
  w_spark_e_d: ['链数翻倍，链末引发小爆炸', 'Twice the links, bursting at each end'],
  w_boomerang: ['疾风镖', 'Gale Boomerang'],
  w_boomerang_d: ['飞出折返，双程穿透敌人', 'Flies out and back, piercing both ways'],
  w_boomerang_e: ['旋风', 'Cyclone'],
  w_boomerang_e_d: ['三镖齐发，返程吸附经验光珠', 'Triple fan; the return sweep gathers XP'],
  w_mine: ['星尘雷', 'Star Mine'],
  w_mine_d: ['沿途布下星雷，触碰即爆', 'Drops star mines that burst on contact'],
  w_mine_e: ['新星', 'Supernova'],
  w_mine_e_d: ['巨大爆炸，留下灼热星尘场', 'Huge blasts that leave searing stardust'],
  w_puff: ['蒲公英', 'Dandelion Puff'],
  w_puff_d: ['扇形吹出一捧飘摇的种子', 'Blows a drifting fan of seeds'],
  w_puff_e: ['漫天飞絮', 'Wishstorm'],
  w_puff_e_d: ['种子四面纷飞，乘风追逐敌人', 'Seeds swirl in all directions, riding the wind after foes'],

  // 被动
  p_power: ['力量护符', 'Power Charm'],
  p_power_d: ['伤害 +15%', 'Damage +15%'],
  p_bloom: ['护身花', 'Guard Blossom'],
  p_bloom_d: ['生命上限 +20，并恢复 20', 'Max HP +20, heal 20'],
  p_lens: ['聚光透镜', 'Focus Lens'],
  p_lens_d: ['冷却 -8%', 'Cooldown -8%'],
  p_cloud: ['云朵', 'Little Cloud'],
  p_cloud_d: ['攻击范围 +12%', 'Area +12%'],
  p_battery: ['蓄电瓶', 'Charge Jar'],
  p_battery_d: ['拾取范围 +30%', 'Pickup range +30%'],
  p_wind: ['风袋', 'Wind Pouch'],
  p_wind_d: ['移速 +7%，弹速 +10%', 'Move +7%, projectile speed +10%'],
  p_ladybug: ['瓢虫结', 'Ladybug Charm'],
  p_ladybug_d: ['暴击率 +4%', 'Crit chance +4%'],
  p_honey: ['蜜糖罐', 'Honey Pot'],
  p_honey_d: ['每秒回复 0.5 生命', 'Regenerate 0.5 HP/s'],

  // 兜底卡
  c_heal: ['野莓甜点', 'Berry Treat'],
  c_heal_d: ['恢复 40 生命', 'Restore 40 HP'],
  c_gold: ['晨光碎片', 'Dawn Shards'],
  c_gold_d: ['获得 40 经验', 'Gain 40 XP'],

  // 敌人名称（图鉴）— 晨光草甸
  en_blob: ['墨团', 'Inkblob'],
  en_midge: ['小蠓', 'Midge'],
  en_shelly: ['壳壳', 'Shelly'],
  en_spitter: ['喷喷', 'Spitter'],
  en_dasher: ['冲冲', 'Dasher'],
  en_splitter: ['分裂球', 'Splitter'],
  en_mini: ['迷你球', 'Mini'],
  en_elite: ['精英墨团', 'Elite Inkblob'],
  en_boss: ['墨之王', 'Ink Monarch'],
  // 敌人名称 — 露珠池塘
  en_tad: ['蝌蚪宝', 'Tadlet'],
  en_bubble: ['泡泡儿', 'Bubbly'],
  en_snail: ['蜗蜗', 'Snaily'],
  en_frog: ['蛙蹦蹦', 'Hopfrog'],
  en_squirt: ['水枪鱼', 'Squirter'],
  en_jelly: ['软水母', 'Jellybell'],
  en_bigbubble: ['大泡泡', 'Grand Bubble'],
  en_bubbleking: ['泡泡大王', 'Bubble Monarch'],
  // 敌人名称 — 晚霞山岗
  en_leafy: ['叶娃娃', 'Leafkin'],
  en_grain: ['谷粒粒', 'Grainlet'],
  en_crow: ['小乌鸫', 'Dusklark'],
  en_thistle: ['蓟滚滚', 'Thistleball'],
  en_wheatling: ['麦穗芽', 'Wheatling'],
  en_cone: ['松果球', 'Coneball'],
  en_gust: ['风精灵', 'Gustling'],
  en_bigthistle: ['蓟王球', 'Thistle King'],
  en_galecrow: ['风暴鸦', 'Galecrow'],

  // 通用 UI
  ui_back: ['返回', 'Back'],
  ui_ok: ['好的', 'OK'],
  ui_cancel: ['取消', 'Cancel'],
  ui_locked: ['未解锁', 'Locked'],
  ui_lockedHint: ['达成条件后解锁', 'Unlocks via achievements'],
  ui_unlockBy: ['达成「{a}」解锁', 'Unlock: “{a}”'],
  ui_comingSoon: ['敬请期待', 'Coming soon'],
  ui_select: ['选择', 'Select'],
  ui_minutes: ['分钟', 'min'],

  // 主菜单入口
  menu_shop: ['商店', 'Shop'],
  menu_codex: ['图鉴', 'Codex'],
  menu_ach: ['成就', 'Feats'],
  menu_settings: ['设置', 'Settings'],

  // 场景标题
  scn_charSelect: ['选择角色', 'Choose a Hero'],
  scn_mapSelect: ['选择地图', 'Choose a Field'],
  scn_shop: ['晨光商店', 'Dawn Shop'],
  scn_codex: ['晨野图鉴', 'Codex'],
  scn_achievements: ['成就', 'Achievements'],
  scn_settings: ['设置', 'Settings'],

  // 角色（_d 描述同时点明性能差异）
  char_spark: ['小萤', 'Flicker'],
  char_spark_d: ['萤光小精灵，各项均衡', 'Glimmer sprite, balanced all around'],
  char_rosa: ['蔷蔷', 'Rosie'],
  char_rosa_d: ['小巧轻快，花环更大更易暴击', 'Tiny and quick, bigger ring, extra crits'],
  char_dew: ['露露', 'Dewy'],
  char_dew_d: ['生命厚实自带回复，走得慢', 'Thick HP and self-healing, but slow'],
  char_gale: ['风风', 'Gusty'],
  char_gale_d: ['全场最快、飞镖更急，拳头偏软', 'Fastest feet, quicker throws, softer hits'],
  char_lumen: ['琉璃', 'Lumen'],
  char_lumen_d: ['伤害爆表，身板最脆', 'Huge damage, fragile body'],
  char_volt: ['闪闪', 'Zappy'],
  char_volt_d: ['施法飞快磁吸超大，血量偏少', 'Rapid casts, huge magnet, lower HP'],
  char_pebble: ['墩墩', 'Pebble'],
  char_pebble_d: ['全场最大最耐打，慢慢走不慌', 'Biggest and toughest, in no hurry'],
  char_fluff: ['蒲蒲', 'Fluff'],
  char_fluff_d: ['金币经验双丰收，自带小幸运', 'Bonus coins and XP, a pinch of luck'],

  // 地图（_d 描述点明时长/机制差异；_win 胜利副标题；_warn Boss 预警横幅）
  map_meadow: ['晨光草甸', 'Morning Meadow'],
  map_meadow_d: ['一切开始的地方：花海、微风与墨之王', 'Where it all begins: flowers, breeze, and the Ink Monarch'],
  map_meadow_win: ['晨光驱散了墨之王', 'The dawn has banished the Ink Monarch'],
  map_meadow_warn: ['!! 墨之王 苏醒了 !!', '!! The Ink Monarch awakens !!'],
  map_pond: ['露珠池塘', 'Dewdrop Pond'],
  map_pond_d: ['水皮缠步、硬壳横行的幽静池畔，泡泡大王在深处吐着泡泡', 'Slowing waters and stubborn shells; the Bubble Monarch gurgles below'],
  map_pond_win: ['池水又清澈如镜了', 'The pond is mirror-clear once more'],
  map_pond_warn: ['!! 泡泡大王 浮出水面 !!', '!! The Bubble Monarch surfaces !!'],
  map_hills: ['晚霞山岗', 'Sunset Hills'],
  map_hills_d: ['麦浪翻滚、大风定时横扫的金色山岗，风暴鸦在霞光里盘旋', 'Rolling wheat and timed gales; the Galecrow circles in the afterglow'],
  map_hills_win: ['风停了，麦浪重新镀上金光', 'The wind rests; the wheat turns gold again'],
  map_hills_warn: ['!! 风暴鸦 俯冲而来 !!', '!! The Galecrow dives !!'],

  // 金币
  coins: ['金币', 'Coins'],

  // 商店（永久强化）
  shop_hint: ['永久强化对所有角色生效，可随时全额重置返还', 'Permanent boosts for every hero; reset any time for a full refund'],
  shop_price: ['价格', 'Cost'],
  shop_max: ['已满级', 'MAX'],
  shop_noCoins: ['金币不足', 'Not enough coins'],
  shop_reset: ['重置', 'Reset'],
  shop_resetTitle: ['重置永久强化', 'Reset Upgrades'],
  shop_resetDesc: ['将清空全部强化并返还 {n} 金币，确定吗？', 'Clear all upgrades and refund {n} coins?'],

  pu_power: ['晨光之力', 'Morning Might'],
  pu_power_d: ['每级伤害 +4%', '+4% damage per level'],
  pu_vitality: ['蒲公英活力', 'Dandelion Vigor'],
  pu_vitality_d: ['每级生命上限 +10', '+10 max HP per level'],
  pu_haste: ['露珠急速', 'Dewdrop Haste'],
  pu_haste_d: ['每级冷却 -2.5%', '-2.5% cooldown per level'],
  pu_area: ['晨雾扩散', 'Mist Spread'],
  pu_area_d: ['每级攻击范围 +4%', '+4% area per level'],
  pu_speed: ['轻风步', 'Breeze Step'],
  pu_speed_d: ['每级移速 +2.5%', '+2.5% move speed per level'],
  pu_magnet: ['花蜜磁场', 'Nectar Magnet'],
  pu_magnet_d: ['每级拾取范围 +12%', '+12% pickup range per level'],
  pu_growth: ['茁壮成长', 'Flourish'],
  pu_growth_d: ['每级经验获取 +4%', '+4% XP gain per level'],
  pu_greed: ['松鼠囤货', 'Squirrel Stash'],
  pu_greed_d: ['每级金币获取 +12%', '+12% coin gain per level'],
  pu_armor: ['坚果甲壳', 'Nutshell Armor'],
  pu_armor_d: ['每级受到伤害 -1', '-1 damage taken per level'],
  pu_regen: ['晨露回复', 'Morning Dew'],
  pu_regen_d: ['每级每秒回复 0.3 生命', '+0.3 HP/s per level'],
  pu_luck: ['四叶草', 'Lucky Clover'],
  pu_luck_d: ['每级暴击率 +2%', '+2% crit chance per level'],

  // 图鉴
  codex_weapons: ['武器', 'Weapons'],
  codex_passives: ['被动', 'Passives'],
  codex_enemies: ['敌人', 'Enemies'],
  codex_chars: ['角色', 'Heroes'],
  codex_maps: ['地图', 'Fields'],
  codex_hint: ['游玩中遇见即点亮', 'Encounter things in a run to light them up'],

  // 成就
  achUnlocked: ['成就达成！', 'Achievement!'],
  ach_count: ['已达成', 'Unlocked'],
  ach_reward: ['解锁角色：{c}', 'Unlocks hero: {c}'],
  ach_rewardMap: ['解锁地图：{m}', 'Unlocks field: {m}'],
  ach_swarm100: ['百敌斩', 'Centurion'],
  ach_swarm100_d: ['单局击败 100 个敌人', 'Defeat 100 foes in one run'],
  ach_survive5: ['晨光初照', 'First Light'],
  ach_survive5_d: ['单局存活 5 分钟', 'Survive 5 minutes in a run'],
  ach_level20: ['茁壮新芽', 'Sprouting Up'],
  ach_level20_d: ['单局达到 20 级', 'Reach level 20 in a run'],
  ach_eliteSlayer: ['精英克星', 'Elite Slayer'],
  ach_eliteSlayer_d: ['击败一只精英敌人', 'Defeat an elite enemy'],
  ach_firstEvolve: ['破晓进化', 'Dawn Evolution'],
  ach_firstEvolve_d: ['首次进化一件武器', 'Evolve a weapon for the first time'],
  ach_maxWeapon: ['锋芒毕露', 'Honed Edge'],
  ach_maxWeapon_d: ['将任一武器升至满级', 'Max out any weapon'],
  ach_fullArsenal: ['武库满载', 'Full Arsenal'],
  ach_fullArsenal_d: ['同时持有 6 件武器', 'Hold 6 weapons at once'],
  ach_fullCharms: ['护符满匣', 'Charm Collector'],
  ach_fullCharms_d: ['同时持有 6 件被动', 'Hold 6 passives at once'],
  ach_meadowClear: ['驱散墨色', 'Ink Banisher'],
  ach_meadowClear_d: ['通关晨光草甸', 'Clear the Morning Meadow'],
  ach_kills1000: ['千敌将', 'Thousandfold'],
  ach_kills1000_d: ['累计击败 1000 个敌人', 'Defeat 1000 foes in total'],
  ach_coins500: ['小小财富', 'Tidy Sum'],
  ach_coins500_d: ['累计获得 500 金币', 'Earn 500 coins in total'],
  ach_firstBuy: ['第一桶金', 'First Purchase'],
  ach_firstBuy_d: ['在商店购买一项永久强化', 'Buy a permanent upgrade'],
  ach_pondClear: ['还池清梦', 'Pond Purifier'],
  ach_pondClear_d: ['通关露珠池塘', 'Clear the Dewdrop Pond'],
  ach_hillsClear: ['驭风者', 'Galebreaker'],
  ach_hillsClear_d: ['通关晚霞山岗', 'Clear the Sunset Hills'],

  // 设置
  set_volume: ['音量', 'Volume'],
  set_dmgNum: ['伤害数字', 'Damage Numbers'],
  set_shake: ['屏幕震动', 'Screen Shake'],
  set_lang: ['语言', 'Language'],
  set_sound: ['声音', 'Sound'],

  // 调试
  set_debugTitle: ['调试', 'Debug'],
  set_debugInfo: ['调试信息', 'Debug Info'],
  set_invincible: ['无敌', 'Invincible'],
  set_fullPickup: ['全屏拾取', 'Magnet All'],
  set_autoPick: ['自动选卡', 'Auto Pick'],
  set_addCoins: ['金币 +1000', '+1000 Coins'],
  set_timeSkip: ['时间 +60s', '+60s Time'],
  set_giveWeapon: ['获得武器', 'Give Weapon'],
};

let lang: Lang = (() => {
  const saved = getSave().settings.lang;
  if (saved === 'zh' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
})();

const listeners: Array<() => void> = [];

export function t(key: string): string {
  const e = D[key];
  if (!e) return key;
  return lang === 'zh' ? e[0] : e[1];
}

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang): void {
  lang = l;
  getSave().settings.lang = l;
  persistSave();
  listeners.forEach((f) => f());
}

export function toggleLang(): void {
  setLang(lang === 'zh' ? 'en' : 'zh');
}

/** 返回反注册函数，场景 shutdown 时务必调用（防泄漏） */
export function onLangChange(f: () => void): () => void {
  listeners.push(f);
  return () => {
    const i = listeners.indexOf(f);
    if (i >= 0) listeners.splice(i, 1);
  };
}

// 圆润系统字体栈（零外部资源）
export const FONT = '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';
