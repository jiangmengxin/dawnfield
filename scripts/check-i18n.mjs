// check-i18n：content ids ↔ i18n 字典机械校验（M5 起每内容批次必跑，缺键即 build 失败）
// 1. 解析 src/content/ids.ts 的 ID 联合类型 → 按键名公约推导必需键
//    w_<id>(_d/_e/_e_d) / p_<id>(_d) / en_<id> / char_<id>(_d) /
//    map_<id>(_d/_win/_warn) / ach_<id>(_d) / pu_<id>(_d)
// 2. 扫描 src/**/*.ts 中 t('key') 字面量与 'hud:warn' 字面量键
// 3. 缺键 → exit 1；字典里从未被引用的键 → 警告（不失败）
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

// ---------- 收集字典键 ----------

const i18nSrc = readFileSync(join(src, 'i18n.ts'), 'utf8');
const dictKeys = new Set();
for (const m of i18nSrc.matchAll(/^\s{2}([A-Za-z_]\w*):\s*\[/gm)) dictKeys.add(m[1]);
if (dictKeys.size === 0) {
  console.error('check-i18n: 未能从 i18n.ts 解析出任何字典键（解析器失配？）');
  process.exit(1);
}

// ---------- 解析 content ids ----------

const idsSrc = readFileSync(join(src, 'content', 'ids.ts'), 'utf8');
function unionMembers(typeName) {
  const m = idsSrc.match(new RegExp(`export type ${typeName} =([^;]+);`));
  if (!m) {
    console.error(`check-i18n: ids.ts 中找不到类型 ${typeName}`);
    process.exit(1);
  }
  return [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]);
}

const required = new Map(); // key → 来源说明
function need(key, why) {
  if (!required.has(key)) required.set(key, why);
}

for (const id of unionMembers('WeaponId')) {
  for (const suf of ['', '_d', '_e', '_e_d']) need(`w_${id}${suf}`, `WeaponId:${id}`);
}
for (const id of unionMembers('PassiveId')) {
  for (const suf of ['', '_d']) need(`p_${id}${suf}`, `PassiveId:${id}`);
}
for (const id of unionMembers('EnemyId')) need(`en_${id}`, `EnemyId:${id}`);
for (const id of unionMembers('CharacterId')) {
  for (const suf of ['', '_d']) need(`char_${id}${suf}`, `CharacterId:${id}`);
}
for (const id of unionMembers('MapId')) {
  for (const suf of ['', '_d', '_win', '_warn']) need(`map_${id}${suf}`, `MapId:${id}`);
}
for (const id of unionMembers('AchievementId')) {
  for (const suf of ['', '_d']) need(`ach_${id}${suf}`, `AchievementId:${id}`);
}
for (const id of unionMembers('PowerUpId')) {
  for (const suf of ['', '_d']) need(`pu_${id}${suf}`, `PowerUpId:${id}`);
}

// ---------- 扫描源码中的字面量键 ----------

const usedKeys = new Set();
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.ts')) {
      const code = readFileSync(p, 'utf8');
      const rel = p.slice(root.length + 1);
      // 仅匹配完整实参的字面量键；t('char_' + id) 这类动态拼接由 id 推导覆盖
      for (const m of code.matchAll(/\bt\(\s*'([\w-]+)'\s*\)/g)) {
        usedKeys.add(m[1]);
        need(m[1], `t() @ ${rel}`);
      }
      // hud:warn 事件载荷即 i18n 键（同样只认完整字面量；map_<id>_warn 拼接由 MapId 推导覆盖）
      for (const m of code.matchAll(/'hud:warn',\s*'([\w-]+)'\s*\)/g)) {
        usedKeys.add(m[1]);
        need(m[1], `hud:warn @ ${rel}`);
      }
    }
  }
}
walk(src);

// ---------- 判定 ----------

const missing = [...required.entries()].filter(([k]) => !dictKeys.has(k));
if (missing.length > 0) {
  console.error(`check-i18n: 缺少 ${missing.length} 个字典键：`);
  for (const [k, why] of missing) console.error(`  - ${k}  (${why})`);
  process.exit(1);
}

// 动态拼接键的前缀（w_/p_/en_/char_/map_/ach_/pu_ 已被 id 推导覆盖）+ 字面量使用
const unused = [...dictKeys].filter((k) => !required.has(k) && !usedKeys.has(k));
if (unused.length > 0) {
  console.warn(`check-i18n: ${unused.length} 个字典键未检出引用（动态键或确属冗余，请人工确认）：`);
  console.warn('  ' + unused.join(', '));
}

console.log(`check-i18n: OK — 字典 ${dictKeys.size} 键，必需 ${required.size} 键全覆盖`);
