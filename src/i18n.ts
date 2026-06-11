// 极简 i18n：扁平字典 + t()，localStorage 持久化，切换时广播
export type Lang = 'zh' | 'en';

const LS_KEY = 'dawnfield.lang';

type Dict = Record<string, [zh: string, en: string]>;

const D: Dict = {
  // 菜单
  title: ['晨野', 'DAWNFIELD'],
  subtitle: ['在晨光草甸中坚守 12 分钟', 'Survive 12 minutes in the morning meadow'],
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
  bossName: ['墨之王', 'Ink Monarch'],
  bossWarn: ['!! 墨之王 苏醒了 !!', '!! The Ink Monarch awakens !!'],
  eliteWarn: ['! 精英墨团出现 !', '! Elite Inkblob appears !'],

  // 升级
  levelUpTitle: ['升级！选择一项', 'Level Up! Pick one'],
  newTag: ['新!', 'New!'],
  evolveTag: ['进化', 'EVOLVE'],
  maxTag: ['满级', 'MAX'],

  // 宝箱
  chestTitle: ['晨光宝箱', 'Dawn Chest'],
  chestOpen: ['点击开启', 'Tap to open'],
  chestGold: ['一捧晨光！+80 经验 +30 生命', 'A handful of dawnlight! +80 XP, +30 HP'],

  // 结算
  victory: ['胜 利 ！', 'VICTORY!'],
  victorySub: ['晨光驱散了墨之王', 'The dawn has banished the Ink Monarch'],
  defeat: ['倒下了…', 'You fell...'],
  defeatSub: ['草甸会记得你的光', 'The meadow remembers your light'],
  statTime: ['存活时间', 'Time Survived'],
  statKills: ['击败', 'Defeated'],
  statLevel: ['最终等级', 'Final Level'],
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

  // 兜底卡
  c_heal: ['野莓甜点', 'Berry Treat'],
  c_heal_d: ['恢复 40 生命', 'Restore 40 HP'],
  c_gold: ['晨光碎片', 'Dawn Shards'],
  c_gold_d: ['获得 40 经验', 'Gain 40 XP'],
};

let lang: Lang = (() => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch { /* ignore */ }
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
  try { localStorage.setItem(LS_KEY, l); } catch { /* ignore */ }
  listeners.forEach((f) => f());
}

export function toggleLang(): void {
  setLang(lang === 'zh' ? 'en' : 'zh');
}

export function onLangChange(f: () => void): void {
  listeners.push(f);
}

// 圆润系统字体栈（零外部资源）
export const FONT = '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';
