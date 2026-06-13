// 规则卡行为实现（M9）：ArcanaId → RunModifier；数值全在 content/arcana.ts 的 ARC_FX
// 卡牌可叠加：每张卡一个独立 modifier 推进 GameScene.modifiers，钩子彼此无共享状态
import type Phaser from 'phaser';
import { ARC_FX } from '../content/arcana';
import type { ArcanaId } from '../content/ids';
import { PAL } from '../gfx/palette';
import type { CombatContext, RunModifier } from './context';
import type { Enemy } from './EnemySystem';

export function createArcanaModifier(id: ArcanaId, ctx: CombatContext): RunModifier {
  switch (id) {
    case 'petaltide': { // 花开满野：范围 + 弹速 + 身周花环易伤领域
      let pulse = 0;
      return {
        statMods: (s) => {
          s.area *= ARC_FX.petaltideArea;
          s.projSpeed *= ARC_FX.petaltideProj;
        },
        modifyDamage: (dmg, e) => {
          const r = ctx.stats.magnet * ARC_FX.petaltideRingK;
          const dx = e.x - ctx.player.x;
          const dy = e.y - ctx.player.y;
          return dx * dx + dy * dy <= r * r ? dmg * ARC_FX.petaltideVuln : dmg;
        },
        onTick: (dt, c) => {
          // 花环氛围：周期淡粉环提示易伤范围
          pulse -= dt;
          if (pulse > 0) return;
          pulse = 1.5;
          const r = c.stats.magnet * ARC_FX.petaltideRingK;
          c.fx.ring(c.player.x, c.player.y, 0xf8a8c0, Math.max(4, r / 16), 0.5);
        },
      };
    }

    case 'tailwind': { // 顺风童谣：移速 + 冷却 + 持续移动积攒「风势」增伤
      let momentum = 0;
      let px = ctx.player.x;
      let py = ctx.player.y;
      return {
        statMods: (s) => {
          s.moveSpeed *= ARC_FX.tailwindMove;
          s.cd = Math.max(0.4, s.cd * ARC_FX.tailwindCd);
        },
        onTick: (dt, c) => {
          const moved = Math.hypot(c.player.x - px, c.player.y - py);
          px = c.player.x;
          py = c.player.y;
          momentum = moved > 1 ? Math.min(1, momentum + ARC_FX.tailwindRamp * dt) : 0;
        },
        onPlayerDamaged: () => {
          momentum = 0; // 受伤风势消散
        },
        modifyDamage: (dmg) => dmg * (1 + momentum * ARC_FX.tailwindGust),
      };
    }

    case 'thornlace': { // 小小尖刺：暴击 + 伤害 + 暴击流血，流血敌死亡迸裂尖刺
      const bleeding = new Map<Enemy, { t: number; dps: number }>();
      let tick = 0;
      return {
        statMods: (s) => {
          s.crit += ARC_FX.thornlaceCrit;
          s.dmg *= ARC_FX.thornlaceDmg;
        },
        onWeaponHit: (e, applied, _c, crit) => {
          if (!crit) return;
          bleeding.set(e, { t: ARC_FX.thornlaceBleedDur, dps: applied * ARC_FX.thornlaceBleedK });
        },
        onTick: (dt, c) => {
          if (bleeding.size === 0) return;
          tick -= dt;
          const doTick = tick <= 0;
          if (doTick) tick = ARC_FX.thornlaceTick;
          for (const [e, b] of bleeding) {
            if (!e.active || e.dying) {
              bleeding.delete(e);
              continue;
            }
            b.t -= dt;
            if (doTick) {
              const ap = c.hitEnemy(e, b.dps * ARC_FX.thornlaceTick, { quiet: true, noHook: true });
              if (ap > 0) c.dmgLog('arc_thornlace', ap);
            }
            if (b.t <= 0) bleeding.delete(e);
          }
        },
        onEnemyKilled: (e, c) => {
          if (!bleeding.has(e)) return;
          bleeding.delete(e);
          const out: Enemy[] = [];
          c.grid.queryCircle(e.x, e.y, ARC_FX.thornlaceBurstR, out);
          const targets = out
            .filter((n) => n.active && !n.dying && n !== e)
            .sort((a, b) => ((a.x - e.x) ** 2 + (a.y - e.y) ** 2) - ((b.x - e.x) ** 2 + (b.y - e.y) ** 2))
            .slice(0, ARC_FX.thornlaceBurstN);
          const dmg = ARC_FX.thornlaceBurstDmg * c.stats.dmg;
          for (const tgt of targets) {
            const ap = c.hitEnemy(tgt, dmg, { quiet: true, noHook: true });
            if (ap > 0) c.dmgLog('arc_thornlace', ap);
            c.fx.burst(tgt.x, tgt.y, { tex: 'p_dot', color: 0xe88898, count: 3, speed: 90, life: 0.25, scale: 0.7 });
          }
        },
      };
    }

    case 'goldbell': { // 金铃叮当：金币获取 + 拾币积蓄铃音，满阈值迸发金铃声波
      let coins = 0;
      return {
        statMods: (s) => {
          s.coinGain *= ARC_FX.goldbellCoin;
        },
        onCoinPicked: (value, c) => {
          coins += value;
          if (coins < ARC_FX.goldbellSonicEvery) return;
          coins -= ARC_FX.goldbellSonicEvery;
          const px = c.player.x;
          const py = c.player.y;
          const out: Enemy[] = [];
          c.grid.queryCircle(px, py, ARC_FX.goldbellSonicR, out);
          const dmg = ARC_FX.goldbellSonicDmg * c.stats.dmg;
          for (const n of out) {
            const d = Math.hypot(n.x - px, n.y - py) || 1;
            const ap = c.hitEnemy(n, dmg, {
              quiet: true, noHook: true,
              kb: ARC_FX.goldbellSonicKb, kx: (n.x - px) / d, ky: (n.y - py) / d,
            });
            if (ap > 0) c.dmgLog('arc_goldbell', ap);
          }
          for (let i = 0; i < ARC_FX.goldbellSonicCoins; i++) {
            const a = c.rng() * Math.PI * 2;
            c.spawnCoin(px + Math.cos(a) * 30, py + Math.sin(a) * 30, 1);
          }
          c.fx.ring(px, py, 0xf0c860, 8, 0.5);
        },
      };
    }

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
      // 萤火向导：磁吸加成 + 周期吸珠 + 身边环绕萤火扑向最近敌人
      let t = ARC_FX.fireflyEvery;
      let atkT = ARC_FX.fireflyEveryHit;
      let phase = 0;
      const flies: Phaser.GameObjects.Image[] = [];
      return {
        statMods: (s) => {
          s.magnet *= ARC_FX.fireflyMagnet;
        },
        onTick: (dt, c) => {
          // 周期吸来全场光珠
          t -= dt;
          if (t <= 0) {
            t = ARC_FX.fireflyEvery;
            c.magnetizeAll();
            c.fx.ring(c.player.x, c.player.y, PAL.xp, 6, 0.5);
          }
          // 环绕萤火（懒创建，随玩家公转）
          if (flies.length === 0) {
            for (let i = 0; i < ARC_FX.fireflyN; i++) {
              flies.push(c.scene.add.image(c.player.x, c.player.y, 'p_dot').setTint(0xfff0a0).setScale(1.1).setDepth(1140));
            }
          }
          phase += dt * 2.2;
          for (let i = 0; i < flies.length; i++) {
            const a = phase + (i / flies.length) * Math.PI * 2;
            flies[i].x = c.player.x + Math.cos(a) * ARC_FX.fireflyOrbitR;
            flies[i].y = c.player.y + Math.sin(a) * ARC_FX.fireflyOrbitR;
          }
          // 扑击最近敌人
          atkT -= dt;
          if (atkT > 0) return;
          atkT = ARC_FX.fireflyEveryHit;
          const out: Enemy[] = [];
          c.grid.queryCircle(c.player.x, c.player.y, ARC_FX.fireflySeekR, out);
          let best: Enemy | null = null;
          let bd = Infinity;
          for (const n of out) {
            if (!n.active || n.dying) continue;
            const d = (n.x - c.player.x) ** 2 + (n.y - c.player.y) ** 2;
            if (d < bd) { bd = d; best = n; }
          }
          if (!best) return;
          const ap = c.hitEnemy(best, c.stats.dmg * ARC_FX.fireflyDmgK, { quiet: true, noHook: true });
          if (ap > 0) c.dmgLog('arc_fireflyway', ap);
          c.fx.burst(best.x, best.y, { tex: 'p_dot', color: 0xfff0a0, count: 3, speed: 80, life: 0.25, scale: 0.7 });
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

    // ---------- M21 扩展卡 ----------

    case 'frost': { // 晨霜：受击在脚下迸发寒霜，减速周围敌人（短内置 CD）
      let cd = 0;
      return {
        onTick: (dt) => {
          if (cd > 0) cd -= dt;
        },
        onPlayerDamaged: (_raw, _ap, c) => {
          if (cd > 0) return;
          cd = ARC_FX.frostCd;
          c.addZone({ x: c.player.x, y: c.player.y, r: ARC_FX.frostR, dur: ARC_FX.frostSlowDur, effect: 'slow' });
          c.fx.ring(c.player.x, c.player.y, 0xbfe3f0, 8, 0.5);
          c.fx.burst(c.player.x, c.player.y, { tex: 'p_dot', color: 0xbfe3f0, count: 8, speed: 140, life: 0.4, scale: 0.7 });
        },
      };
    }

    case 'harvest': // 丰收时节：拾取的金币/经验有概率当场复制一份
      return {
        onCoinPicked: (value, c) => {
          if (c.rng() >= ARC_FX.harvestChance) return;
          const a = c.rng() * Math.PI * 2;
          c.spawnCoin(c.player.x + Math.cos(a) * 26, c.player.y + Math.sin(a) * 26, Math.max(1, value));
        },
        onGemPicked: (value, c) => {
          if (c.rng() >= ARC_FX.harvestChance) return;
          const a = c.rng() * Math.PI * 2;
          c.spawnGem(c.player.x + Math.cos(a) * 26, c.player.y + Math.sin(a) * 26, Math.max(1, value));
        },
      };

    case 'starfall': { // 坠星之约：周期天降流星砸向最近敌人，大范围爆发
      let t = ARC_FX.starfallEvery;
      return {
        onTick: (dt, c) => {
          t -= dt;
          if (t > 0) return;
          t = ARC_FX.starfallEvery;
          const out: Enemy[] = [];
          c.grid.queryCircle(c.player.x, c.player.y, ARC_FX.starfallSeekR, out);
          let best: Enemy | null = null;
          let bd = Infinity;
          for (const n of out) {
            if (!n.active || n.dying) continue;
            const d = (n.x - c.player.x) ** 2 + (n.y - c.player.y) ** 2;
            if (d < bd) { bd = d; best = n; }
          }
          const tx = best ? best.x : c.player.x;
          const ty = best ? best.y : c.player.y;
          const star = c.scene.add.image(tx, ty - 220, 'p_star').setTint(0x9fb0e8).setScale(1.7).setDepth(1200);
          c.scene.tweens.add({
            targets: star, y: ty, scale: 1, duration: 380, ease: 'Quad.easeIn',
            onComplete: () => {
              star.destroy();
              if (!c.run.running) return;
              const hit: Enemy[] = [];
              c.grid.queryCircle(tx, ty, ARC_FX.starfallR, hit);
              const dmg = ARC_FX.starfallDmg * c.stats.dmg;
              for (const n of hit) {
                const d = Math.hypot(n.x - tx, n.y - ty) || 1;
                const ap = c.hitEnemy(n, dmg, {
                  quiet: true, noHook: true,
                  kb: ARC_FX.starfallKb, kx: (n.x - tx) / d, ky: (n.y - ty) / d,
                });
                if (ap > 0) c.dmgLog('arc_starfall', ap);
              }
              c.fx.ring(tx, ty, 0x9fb0e8, 10, 0.55);
              c.fx.burst(tx, ty, { tex: 'p_star', color: 0xc8d0f0, count: 14, speed: 240, life: 0.5 });
              c.hitStop(0.04);
            },
          });
        },
      };
    }

    case 'constellation': // 众星拱月：每持有 1 把武器，全武器伤害 +constellationPer
      return {
        statMods: (s) => {
          s.dmg *= 1 + ctx.weaponCount * ARC_FX.constellationPer;
        },
      };

    case 'daynight': { // 昼夜更迭：周期在昼/夜间切换，各侧偏重不同属性
      let day = true;
      let t = ARC_FX.daynightEvery;
      return {
        statMods: (s) => {
          if (day) {
            s.dmg *= ARC_FX.daynightDayDmg;
            s.area *= ARC_FX.daynightDayArea;
          } else {
            s.cd = Math.max(0.4, s.cd * ARC_FX.daynightNightCd);
            s.crit += ARC_FX.daynightNightCrit;
          }
        },
        onTick: (dt, c) => {
          t -= dt;
          if (t > 0) return;
          t = ARC_FX.daynightEvery;
          day = !day;
          c.recomputeStats();
          c.fx.ring(c.player.x, c.player.y, day ? 0xffe070 : 0x8fb0d8, 9, 0.6);
        },
      };
    }

    case 'rooted': { // 生根：静止满 N 秒进入生根态，伤害/范围大增；移动即解除
      let rootedNow = false;
      let still = 0;
      let px = ctx.player.x;
      let py = ctx.player.y;
      return {
        statMods: (s) => {
          if (rootedNow) {
            s.dmg *= ARC_FX.rootedDmg;
            s.area *= ARC_FX.rootedArea;
          }
        },
        onTick: (dt, c) => {
          const moved = Math.hypot(c.player.x - px, c.player.y - py);
          px = c.player.x;
          py = c.player.y;
          if (moved > ARC_FX.rootedMove) {
            still = 0;
            if (rootedNow) {
              rootedNow = false;
              c.recomputeStats();
            }
          } else {
            still += dt;
            if (!rootedNow && still >= ARC_FX.rootedDelay) {
              rootedNow = true;
              c.recomputeStats();
              c.fx.ring(c.player.x, c.player.y, 0x9ad07a, 9, 0.6);
            } else if (rootedNow) {
              // 生根态持续氛围：周期淡绿根环
              if (Math.floor(still * 2) !== Math.floor((still - dt) * 2)) {
                c.fx.ring(c.player.x, c.player.y, 0x9ad07a, 3, 0.4);
              }
            }
          }
        },
      };
    }

    case 'everbloom': { // 不凋之花：生命跌破阈值各触发一次全屏清场 + 短暂无敌
      const fired = new Set<number>();
      return {
        onPlayerDamaged: (_raw, _ap, c) => {
          const frac = c.run.hp / c.stats.maxHp;
          for (const th of ARC_FX.everbloomThresholds) {
            if (frac > th || fired.has(th)) continue;
            fired.add(th);
            const px = c.player.x;
            const py = c.player.y;
            const out: Enemy[] = [];
            c.grid.queryCircle(px, py, ARC_FX.everbloomR, out);
            const dmg = ARC_FX.everbloomDmg * c.stats.dmg;
            for (const n of out) {
              const d = Math.hypot(n.x - px, n.y - py) || 1;
              const ap = c.hitEnemy(n, dmg, {
                quiet: true, noHook: true,
                kb: ARC_FX.everbloomKb, kx: (n.x - px) / d, ky: (n.y - py) / d,
              });
              if (ap > 0) c.dmgLog('arc_everbloom', ap);
            }
            c.run.iframeT = Math.max(c.run.iframeT, ARC_FX.everbloomInvuln);
            c.fx.ring(px, py, 0xf6b8c8, 14, 0.7);
            c.fx.burst(px, py, { tex: 'p_confetti', color: 0xf6b8c8, count: 24, speed: 280, life: 0.6, spin: true });
            c.hitStop(0.06);
            break; // 一次受伤至多触发一档
          }
        },
      };
    }

    case 'knell': { // 暮鼓晨钟：武器每第 N 次命中钟鸣一下，对目标周围追加回响伤害
      let n = 0;
      return {
        onWeaponHit: (e, applied, c) => {
          n++;
          if (n < ARC_FX.knellEvery) return;
          n = 0;
          const out: Enemy[] = [];
          c.grid.queryCircle(e.x, e.y, ARC_FX.knellR, out);
          const dmg = applied * ARC_FX.knellK;
          for (const tgt of out) {
            if (!tgt.active || tgt.dying) continue;
            const ap = c.hitEnemy(tgt, dmg, { quiet: true, noHook: true });
            if (ap > 0) c.dmgLog('arc_knell', ap);
          }
          c.fx.ring(e.x, e.y, 0xe0c060, 6, 0.4);
        },
      };
    }
  }
}
