// 角色专属机制 trait（M14）：TraitId → RunModifier，完全复用 M13 规则卡钩子体系
// 纯函数注册表风格（M16 隐藏角色直接复用）；数值全在 content/characters.ts 的 TRAIT_FX
import { TRAIT_FX } from '../content/characters';
import { PASSIVE_MAX_LEVEL } from '../content/passives';
import type { PassiveId, TraitId } from '../content/ids';
import { SFX } from '../audio/sound';
import type { CombatContext, RunModifier } from './context';
import type { Enemy } from './EnemySystem';
import type { WeaponManager } from './weapons';

export function createTraitModifier(id: TraitId, ctx: CombatContext, weapons: WeaponManager): RunModifier {
  switch (id) {
    case 'flicker': // 悠悠：每 12s 蓄一次闪避——受击完全免疫并朝移动方向闪现留残影
      return {
        onTick: (dt, c) => {
          if (c.run.flickerCdLeft > 0) c.run.flickerCdLeft = Math.max(0, c.run.flickerCdLeft - dt);
        },
        modifyPlayerDamage: (d, c) => {
          if (c.run.flickerCdLeft > 0) return d;
          c.run.flickerCdLeft = TRAIT_FX.flickerCd;
          const p = c.player;
          // 残影：原地留一帧本体剪影淡出
          const ghost = c.scene.add.image(p.x, p.y, p.texture.key)
            .setAlpha(0.55).setDepth(999).setFlipX(p.flipX);
          c.scene.tweens.add({
            targets: ghost, alpha: 0, scale: 0.85, duration: 350, onComplete: () => ghost.destroy(),
          });
          const fx = c.facing.x;
          const fy = c.facing.y;
          const len = Math.hypot(fx, fy) || 1;
          p.x += (fx / len) * TRAIT_FX.flickerDist;
          p.y += (fy / len) * TRAIT_FX.flickerDist;
          c.fx.burst(p.x, p.y, { tex: 'p_star', color: 0xc6ecd8, count: 8, speed: 130, life: 0.35, scale: 0.8 });
          c.fx.ring(p.x, p.y, 0x76b896, 5, 0.4);
          SFX.swish();
          return 0; // 完全免疫：不扣血不进 iframe（M13 契约）
        },
      };

    case 'sweettooth': {
      // 莓莓：每拾取 8 枚金币，在最近敌人处果酱爆炸 + 减速果酱；周围无敌人则保留计数待发
      let n = 0;
      return {
        onCoinPicked: (_v, c) => {
          n++;
          if (n < TRAIT_FX.sweetPer) return;
          const px = c.player.x;
          const py = c.player.y;
          const out: Enemy[] = [];
          c.grid.queryCircle(px, py, TRAIT_FX.sweetSeekR, out);
          let best: Enemy | null = null;
          let bd = Infinity;
          for (const e of out) {
            if (!e.active || e.dying) continue;
            const d = (e.x - px) ** 2 + (e.y - py) ** 2;
            if (d < bd) { bd = d; best = e; }
          }
          if (!best) return;
          n = 0;
          const bx = best.x;
          const by = best.y;
          const hit: Enemy[] = [];
          c.grid.queryCircle(bx, by, TRAIT_FX.sweetR, hit);
          const dmg = TRAIT_FX.sweetDmg * c.stats.dmg;
          for (const e of hit) {
            const ap = c.hitEnemy(e, dmg, { quiet: true, noHook: true });
            if (ap > 0) c.dmgLog('trait_sweet', ap); // 伤害占比统计口径（与 arc_* 同列）
          }
          c.addZone({ x: bx, y: by, r: TRAIT_FX.sweetJamR, dur: TRAIT_FX.sweetJamDur, effect: 'slow' });
          c.fx.burst(bx, by, { tex: 'p_dot', color: 0xf8b8c0, count: 12, speed: 180, life: 0.45, scale: 1 });
          c.fx.ring(bx, by, 0xc86878, 6, 0.5);
          SFX.splash();
        },
      };
    }

    case 'fanfare': {
      // 嘟嘟：每 40s 全部武器立即同时施放一次（号角合奏）
      let tLeft = TRAIT_FX.fanfareEvery;
      return {
        onTick: (dt, c) => {
          tLeft -= dt;
          if (tLeft > 0) return;
          tLeft = TRAIT_FX.fanfareEvery;
          for (const w of weapons.list) w.triggerNow();
          c.fx.ring(c.player.x, c.player.y, 0x7088c8, 9, 0.6);
          c.fx.burst(c.player.x, c.player.y, { tex: 'p_star', color: 0xb8c8f0, count: 14, speed: 220, life: 0.5, scale: 1 });
          SFX.fanfare();
        },
      };
    }

    case 'collector': // 藤藤：升级三选一变四选一
      return {
        statMods: (s) => {
          s.offers = TRAIT_FX.collectorOffers;
        },
      };

    case 'resonance': // 铃铃：每次武器进化——随机未满级被动 +1 级 + 钟鸣新星
      return {
        onEvolve: (_id, c) => {
          const cands: PassiveId[] = [];
          for (const [pid, lv] of c.run.passives) {
            if (lv < PASSIVE_MAX_LEVEL) cands.push(pid);
          }
          if (cands.length > 0) {
            const pid = cands[Math.floor(c.rng() * cands.length)];
            c.run.passives.set(pid, (c.run.passives.get(pid) ?? 0) + 1);
            c.recomputeStats();
          }
          const px = c.player.x;
          const py = c.player.y;
          const out: Enemy[] = [];
          c.grid.queryCircle(px, py, TRAIT_FX.resonanceR, out);
          const dmg = TRAIT_FX.resonanceDmg * c.stats.dmg;
          for (const e of out) {
            const ap = c.hitEnemy(e, dmg, { quiet: true, noHook: true });
            if (ap > 0) c.dmgLog('trait_resonance', ap);
          }
          c.fx.ring(px, py, 0x80b8a8, 11, 0.6);
          c.fx.ring(px, py, 0xd8f0e8, 7, 0.45);
          SFX.chime();
        },
      };
  }
}
