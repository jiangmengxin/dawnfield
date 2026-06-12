// 首局脚本化引导 tips（M14 进化引导链路 ③）：精英首现 / 武器首次满级 各提示一次
// 节流：每条 tip 全存档生命周期一次（save.tipsSeen，M11 v2 搭车字段）；展示走 hud:tip 金色 toast
import { PASSIVE_MAX_LEVEL } from '../content/passives';
import { WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import { t } from '../i18n';
import { emitEvent } from '../core/events';
import { Meta } from '../core/MetaState';
import type { CombatContext, RunSystem } from './context';
import type { WeaponManager } from './weapons';

export class TipSystem implements RunSystem {
  private checkT = 0;
  private eliteDone = Meta.hasTip('eliteChest');
  private evoDone = Meta.hasTip('weaponMax');

  constructor(private ctx: CombatContext, private weapons: WeaponManager) {}

  update(dt: number): void {
    if (this.eliteDone && this.evoDone) return; // 老档常态：零扫描
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 0.5;
    if (!this.eliteDone) this.checkElite();
    if (!this.evoDone) this.checkWeaponMax();
  }

  /** 首次精英现身后 2s：宝箱 = 进化入口 */
  private checkElite(): void {
    const has = this.ctx.enemies.actives.some((e) => e.active && e.isElite && !e.isBoss);
    if (!has) return;
    this.eliteDone = true;
    if (!Meta.markTip('eliteChest')) return;
    this.ctx.scene.time.delayedCall(2000, () => {
      if (this.ctx.run.running) emitEvent(this.ctx.scene.game, 'hud:tip', t('tip_eliteChest'));
    });
  }

  /** 首次任意武器达满级：按配对被动持有与否给出下一步指引 */
  private checkWeaponMax(): void {
    const run = this.ctx.run;
    for (const w of this.weapons.list) {
      if (w.evolved || w.level < WEAPON_MAX_LEVEL) continue;
      const meta = WEAPON_META.find((m) => m.id === w.id);
      if (!meta) continue;
      let text: string | null = null;
      if (meta.evolvesWith === null) {
        // mine 通配（任意被动满级）：未就绪时无法点名单一被动，只在就绪时提示
        for (const lv of run.passives.values()) {
          if (lv >= PASSIVE_MAX_LEVEL) {
            text = t('tip_evoReady').replace('{w}', t('w_' + w.id));
            break;
          }
        }
        if (!text) continue;
      } else if (run.passives.has(meta.evolvesWith)) {
        text = t('tip_evoReady').replace('{w}', t('w_' + w.id));
      } else {
        text = t('tip_evoNeed').replace('{p}', t('p_' + meta.evolvesWith)).replace('{w}', t('w_' + w.id));
      }
      this.evoDone = true;
      if (Meta.markTip('weaponMax')) emitEvent(this.ctx.scene.game, 'hud:tip', text);
      return;
    }
  }
}
