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

    // ---------- M13 机制卡 ----------

    case 'splinter': // 裂光回响：武器命中概率迸出追踪光屑（光屑 noHook，不再触发回响）
      return {
        onWeaponHit: (e, applied, c) => {
          if (c.rng() >= ARC_FX.splinterChance) return;
          const out: Enemy[] = [];
          c.grid.queryCircle(e.x, e.y, ARC_FX.splinterSeekR, out);
          const sx = e.x;
          const sy = e.y;
          const targets = out
            .filter((n) => n.active && !n.dying && n !== e)
            .sort((a, b) => ((a.x - sx) ** 2 + (a.y - sy) ** 2) - ((b.x - sx) ** 2 + (b.y - sy) ** 2))
            .slice(0, ARC_FX.splinterN);
          if (targets.length === 0) return;
          const dmg = applied * ARC_FX.splinterDmgK;
          for (const tgt of targets) {
            // 光屑飞行：星屑 tween 0.15s 到目标（倍速/顿帧随 tweens.timeScale），命中结算带 noHook
            const p = c.scene.add.image(sx, sy, 'p_star').setTint(0xf0d878).setScale(0.8).setDepth(1150);
            c.scene.tweens.add({
              targets: p, x: tgt.x, y: tgt.y, scale: 0.5, duration: 150, ease: 'Sine.easeIn',
              onComplete: () => {
                p.destroy();
                if (!c.run.running) return;
                const ap = c.hitEnemy(tgt, dmg, { quiet: true, noHook: true });
                if (ap > 0) {
                  c.dmgLog('arc_splinter', ap); // 伤害占比统计口径（M13）
                  c.fx.burst(tgt.x, tgt.y, { tex: 'p_dot', color: 0xf0d878, count: 3, speed: 90, life: 0.25, scale: 0.7 });
                }
              },
            });
          }
        },
      };

    case 'thorncore': {
      // 荆棘之心：按护甲前承伤蓄能，达最大生命 35% 时自动爆发荆棘新星并清空
      let charge = 0;
      let fxT = 0;
      return {
        onPlayerDamaged: (raw, _applied, c) => {
          charge += raw;
          const need = c.stats.maxHp * ARC_FX.thorncoreThreshold;
          if (charge < need) return;
          const burst = Math.min(charge * ARC_FX.thorncoreBurstK, ARC_FX.thorncoreCapDmg * c.stats.dmg);
          charge = 0;
          const px = c.player.x;
          const py = c.player.y;
          const out: Enemy[] = [];
          c.grid.queryCircle(px, py, ARC_FX.thorncoreR, out);
          for (const n of out) {
            const d = Math.hypot(n.x - px, n.y - py) || 1;
            const ap = c.hitEnemy(n, burst, {
              quiet: true, noHook: true,
              kb: ARC_FX.thorncoreKb, kx: (n.x - px) / d, ky: (n.y - py) / d,
            });
            if (ap > 0) c.dmgLog('arc_thorncore', ap);
          }
          c.fx.ring(px, py, 0xd87884, 10, 0.55);
          c.fx.burst(px, py, { tex: 'p_dot', color: 0xd87884, count: 18, speed: 260, life: 0.5 });
          c.hitStop(0.05);
        },
        onTick: (dt, c) => {
          // 蓄能提示：≥70% 阈值时周期红环呼吸
          fxT -= dt;
          if (fxT > 0) return;
          fxT = 1.1;
          if (charge >= c.stats.maxHp * ARC_FX.thorncoreThreshold * 0.7) {
            c.fx.ring(c.player.x, c.player.y, 0xd87884, 3, 0.4);
          }
        },
      };
    }

    case 'vow': // 燃晖之誓：禁疗（healMul=0 覆盖一切回血入口）+ 伤害/范围；爱心转金币在 PickupSystem
      return {
        statMods: (s) => {
          s.healMul = 0;
          s.dmg *= ARC_FX.vowDmg;
          s.area *= ARC_FX.vowArea;
        },
      };

    case 'allin': // 孤注一掷：武器槽上限 4（已超出不移除，停止新供给）+ 全武器冷却
      return {
        statMods: (s) => {
          s.maxWeapons = Math.min(s.maxWeapons, ARC_FX.allinCap);
          s.cd = Math.max(0.4, s.cd * ARC_FX.allinCd);
        },
      };

    case 'slowburn': // 凝光：大招化——冷却变长、单发伤害与范围暴涨（偏爱爆发武器）
      return {
        statMods: (s) => {
          s.cd *= ARC_FX.slowburnCd;
          s.dmg *= ARC_FX.slowburnDmg;
          s.area *= ARC_FX.slowburnArea;
        },
      };

    case 'dawnfield': {
      // 晨光领域：拾取范围化作灼光领域，域内敌人持续灼烧（磁吸系构筑变伤害构筑，点题卡）
      let t = 0;
      let pulse = 0;
      return {
        statMods: (s) => {
          s.magnet *= ARC_FX.dawnfieldMagnet;
        },
        onTick: (dt, c) => {
          t -= dt;
          if (t > 0) return;
          t = ARC_FX.dawnfieldTick;
          const r = c.stats.magnet * ARC_FX.dawnfieldRK;
          const out: Enemy[] = [];
          c.grid.queryCircle(c.player.x, c.player.y, r, out);
          const dmg = ARC_FX.dawnfieldDps * c.stats.dmg * ARC_FX.dawnfieldTick;
          for (const n of out) {
            const ap = c.hitEnemy(n, dmg, { quiet: true, noHook: true });
            if (ap > 0) c.dmgLog('arc_dawnfield', ap);
          }
          // 领域氛围：每 2s 一圈淡金环（不逐 tick 出环防视觉噪音）
          pulse = (pulse + 1) % 4;
          if (pulse === 0) c.fx.ring(c.player.x, c.player.y, 0xf2cf6e, Math.max(4, r / 16), 0.6);
        },
      };
    }
  }
}
