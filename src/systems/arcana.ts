// 规则卡行为实现（M9）：ArcanaId → RunModifier；数值全在 content/arcana.ts 的 ARC_FX
// 卡牌可叠加：每张卡一个独立 modifier 推进 GameScene.modifiers，钩子彼此无共享状态
import { ARC_FX } from '../content/arcana';
import type { ArcanaId } from '../content/ids';
import { PAL } from '../gfx/palette';
import type { CombatContext, RunModifier } from './context';
import type { Enemy } from './EnemySystem';

export function createArcanaModifier(id: ArcanaId, ctx: CombatContext): RunModifier {
  switch (id) {
    case 'petaltide': // 花开满野：范围 + 弹速
      return {
        statMods: (s) => {
          s.area *= ARC_FX.petaltideArea;
          s.projSpeed *= ARC_FX.petaltideProj;
        },
      };

    case 'tailwind': // 顺风童谣：移速 + 冷却
      return {
        statMods: (s) => {
          s.moveSpeed *= ARC_FX.tailwindMove;
          s.cd = Math.max(0.4, s.cd * ARC_FX.tailwindCd);
        },
      };

    case 'thornlace': // 小小尖刺：暴击 + 伤害
      return {
        statMods: (s) => {
          s.crit += ARC_FX.thornlaceCrit;
          s.dmg *= ARC_FX.thornlaceDmg;
        },
      };

    case 'goldbell': // 金铃叮当：金币获取 + 击杀偶尔掉币
      return {
        statMods: (s) => {
          s.coinGain *= ARC_FX.goldbellCoin;
        },
        onEnemyKilled: (e, c) => {
          if (Math.random() < ARC_FX.goldbellChance) c.spawnCoin(e.x, e.y, ARC_FX.goldbellValue);
        },
      };

    case 'starpop': // 星屑爆响：击杀概率迸发星屑爆炸
      return {
        onEnemyKilled: (e, c) => {
          if (Math.random() >= ARC_FX.starpopChance) return;
          // 本地数组：爆炸击杀可连锁再触发自身，共享缓冲会被嵌套查询覆写
          const out: Enemy[] = [];
          c.grid.queryCircle(e.x, e.y, ARC_FX.starpopR, out);
          const dmg = ARC_FX.starpopDmg * c.stats.dmg;
          for (const n of out) {
            if (n !== e) c.hitEnemy(n, dmg, { quiet: true });
          }
          c.fx.burst(e.x, e.y, { tex: 'p_star', color: 0xffe070, count: 8, speed: 190, life: 0.4, scale: 0.9 });
          c.fx.ring(e.x, e.y, 0xffe070, 5, 0.35);
        },
      };

    case 'moonheart': // 月夜勇气：生命越低伤害越高
      return {
        modifyDamage: (dmg) => {
          const missing = 1 - ctx.run.hp / ctx.run.stats.maxHp;
          return dmg * (1 + Math.min(ARC_FX.moonheartMax, missing * ARC_FX.moonheartK));
        },
      };

    case 'dewspring': {
      // 甘露清泉：周期在脚下涌出治愈泉（复用 ZoneSystem heal 区域）
      let t = ARC_FX.dewspringEvery;
      return {
        onTick: (dt, c) => {
          t -= dt;
          if (t > 0) return;
          t = ARC_FX.dewspringEvery;
          c.addZone({
            x: c.player.x, y: c.player.y, r: ARC_FX.dewspringR,
            dur: ARC_FX.dewspringDur, effect: 'heal', dps: ARC_FX.dewspringHps,
          });
        },
      };
    }

    case 'fireflyway': {
      // 萤火向导：磁吸加成 + 周期吸来全场光珠
      let t = ARC_FX.fireflyEvery;
      return {
        statMods: (s) => {
          s.magnet *= ARC_FX.fireflyMagnet;
        },
        onTick: (dt, c) => {
          t -= dt;
          if (t > 0) return;
          t = ARC_FX.fireflyEvery;
          c.magnetizeGems(c.player.x, c.player.y, 1e5);
          c.fx.ring(c.player.x, c.player.y, PAL.xp, 6, 0.5);
        },
      };
    }

    case 'compass': {
      // 藏宝罗盘：开局在身旁掉落宝箱 + 宝箱金币层翻倍
      let dropped = false;
      return {
        onTick: (_dt, c) => {
          if (dropped) return;
          dropped = true;
          c.spawnPickup('chest', c.player.x + 70, c.player.y - 10);
        },
        onChest: (r) => ({
          items: r.items.map((it) => (it.kind === 'gold' ? { ...it, coins: it.coins * ARC_FX.compassGoldMul } : it)),
        }),
      };
    }

    case 'onepath': // 专一之路：三选一只出现已持有项（无可升级时回落原样）+ 冷却
      return {
        statMods: (s) => {
          s.cd = Math.max(0.4, s.cd * ARC_FX.onepathCd);
        },
        modifyOffers: (offers) => {
          const kept = offers.filter((o) => !o.isNew);
          return kept.length > 0 ? kept : offers;
        },
      };
  }
}
