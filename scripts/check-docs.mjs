// check-docs: keep handbook-level facts aligned with current content IDs.
// This script is intentionally dependency-free and conservative: it verifies
// ID coverage in docs/reference/content-catalog.md and headline counts in the
// main entry docs. It does not try to understand prose quality.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const idsSrc = read('src/content/ids.ts');
const mapsSrc = read('src/content/maps.ts');
const achSrc = read('src/content/achievements.ts');
const catalog = read('docs/reference/content-catalog.md');

function unionMembers(typeName) {
  const match = idsSrc.match(new RegExp(`export type ${typeName} =([^;]+);`));
  if (!match) throw new Error(`ids.ts missing type ${typeName}`);
  return [...match[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]);
}

function section(title) {
  const marker = `## ${title}\n`;
  const start = catalog.indexOf(marker);
  if (start < 0) throw new Error(`content-catalog missing section: ${title}`);
  const bodyStart = start + marker.length;
  const next = catalog.indexOf('\n## ', bodyStart);
  return next < 0 ? catalog.slice(bodyStart) : catalog.slice(bodyStart, next);
}

function countSpecIds(exportName) {
  const match = achSrc.match(new RegExp(`export const ${exportName}[\\s\\S]*?= \\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`achievements.ts missing ${exportName}`);
  return [...match[1].matchAll(/\bid: '/g)].length;
}

function assertIds(sectionTitle, ids) {
  const body = section(sectionTitle);
  const missing = ids.filter((id) => !new RegExp(`\\\`${id}\\\``).test(body));
  if (missing.length > 0) {
    throw new Error(`${sectionTitle} missing IDs: ${missing.join(', ')}`);
  }
}

const groups = {
  CharacterId: unionMembers('CharacterId'),
  MapId: unionMembers('MapId'),
  WeaponId: unionMembers('WeaponId'),
  PassiveId: unionMembers('PassiveId'),
  EnemyId: unionMembers('EnemyId'),
  BehaviorId: unionMembers('BehaviorId'),
  AffixId: unionMembers('AffixId'),
  ArcanaId: unionMembers('ArcanaId'),
  DropItemId: unionMembers('DropItemId'),
  PowerUpId: unionMembers('PowerUpId'),
  AchievementId: unionMembers('AchievementId'),
};

const bossIds = [...new Set([...mapsSrc.matchAll(/bossId: '([^']+)'/g)].map((x) => x[1]))];
const currentAchievements = countSpecIds('ACHIEVEMENTS');
const legacyAchievements = countSpecIds('LEGACY_ACHIEVEMENTS');

assertIds('角色', groups.CharacterId);
assertIds('地图', groups.MapId);
assertIds('武器与超武', groups.WeaponId);
assertIds('被动', groups.PassiveId);
assertIds('敌人与行为', [...groups.EnemyId, ...groups.BehaviorId, ...groups.AffixId]);
assertIds('Boss', bossIds);
assertIds('Arcana', groups.ArcanaId);
assertIds('掉落道具', groups.DropItemId);
assertIds('商店强化', groups.PowerUpId);
assertIds('成就', groups.AchievementId);

const entryDocs = [
  'README.md',
  'docs/README.md',
  'docs/当前项目状态.md',
  'docs/blueprint-1.0.md',
  'docs/reference/content-catalog.md',
];

const facts = [
  [`${groups.CharacterId.length} 角色`, 'CharacterId count'],
  [`${groups.MapId.length} 地图`, 'MapId count'],
  [`${groups.WeaponId.length} 武器`, 'WeaponId count'],
  [`${groups.PassiveId.length} 被动`, 'PassiveId count'],
  [`${groups.EnemyId.length} 敌`, 'EnemyId count'],
  [`${bossIds.length} Boss`, 'Boss count'],
  [`${groups.ArcanaId.length} 规则卡`, 'ArcanaId count'],
  [`${groups.DropItemId.length} 掉落道具`, 'DropItemId count'],
  [`${groups.PowerUpId.length} 商店强化`, 'PowerUpId count'],
  [`${groups.AchievementId.length} 成就 ID`, 'AchievementId count'],
  [`${currentAchievements} 当前成就 + ${legacyAchievements} legacy`, 'current/legacy achievement split'],
];

for (const docPath of entryDocs) {
  const text = read(docPath);
  const missing = facts.filter(([literal]) => !text.includes(literal));
  if (missing.length > 0) {
    throw new Error(`${docPath} missing facts: ${missing.map(([, label]) => label).join(', ')}`);
  }
}

console.log([
  'check-docs: OK',
  `characters=${groups.CharacterId.length}`,
  `maps=${groups.MapId.length}`,
  `weapons=${groups.WeaponId.length}`,
  `passives=${groups.PassiveId.length}`,
  `enemies=${groups.EnemyId.length}`,
  `bosses=${bossIds.length}`,
  `arcana=${groups.ArcanaId.length}`,
  `drops=${groups.DropItemId.length}`,
  `powerUps=${groups.PowerUpId.length}`,
  `achievements=${groups.AchievementId.length} (${currentAchievements}+${legacyAchievements})`,
].join(' · '));
