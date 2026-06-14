// DPS 基准（DEV-only；生产构建经动态 import 摇树移除）
// 方案：真实 GameScene 挂 bench 模式（无波次/机制/成就），三环 24 标靶
// （r56×8 近战环 / r110×8 中环 / r260×8 远程环——比原方案 r120/r260 多一近战环，
//  否则 petal/lantern/blade/mine 等贴身武器测不到目标），
// 遍历 WEAPON_META 当前全部武器 ×{Lv5, 进化} ×3 轮取均值，每项固定步长加速模拟 60s。
// 注意：blade/mallet/prism/boomerang 等以 scene.time.delayedCall / tween 落伤害（真实时钟），
// 步进时同步手动泵 scene.time 与 tweens（模拟时间驱动），否则后台标签页计时器被节流会把
// 延迟伤害无限挂起（投射物清理也停摆，单轮可拖到分钟级）；轮间仍留短暂排空窗。
import { WEAPON_MAX_LEVEL, WEAPON_META } from '../content/weapons';
import type { WeaponId } from '../content/ids';
import { FONT, t } from '../i18n';
import { SFX } from '../audio/sound';
import type { Enemy } from '../systems/EnemySystem';
import type { GameScene } from '../scenes/Game';

const SIM_SECONDS = 60;
const ROUNDS = 3;
const DT = 1 / 60;
const RINGS: Array<[r: number, n: number]> = [[56, 8], [110, 8], [260, 8]];

// 让出主线程：MessageChannel 宏任务不受隐藏页 setTimeout 节流（intensive throttling
// 会把后台 setTimeout 钳到 1 次/分钟，整套 bench 会被拖到小时级）
const yieldTask = (): Promise<void> => new Promise((res) => {
  const ch = new MessageChannel();
  ch.port1.onmessage = () => res();
  ch.port2.postMessage(0);
});

function totalFor(gs: GameScene, id: WeaponId): number {
  let sum = 0;
  for (const [src, , total] of gs.dps.entries()) {
    if (src === id) sum += total;
  }
  return sum;
}

export async function runBench(gs: GameScene): Promise<void> {
  const cfg = (window as unknown as { __benchConfig?: { ids?: WeaponId[]; rounds?: number; simSeconds?: number } }).__benchConfig ?? {};
  const metas = cfg.ids?.length
    ? WEAPON_META.filter((m) => cfg.ids?.includes(m.id))
    : WEAPON_META;
  const rounds = cfg.rounds ?? ROUNDS;
  const simSeconds = cfg.simSeconds ?? SIM_SECONDS;
  const wasMuted = SFX.muted;
  SFX.setMuted(true); // 加速模拟期高频命中音会刷爆音频图

  const label = gs.add.text(16, 16, 'DPS bench…', {
    fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#5A5248',
    stroke: '#FFFFFF', strokeThickness: 4,
  }).setScrollFactor(0).setDepth(1e9);

  // Bench measures damage only. Visual feedback creates thousands of particles/tweens
  // in accelerated headless runs and can dominate runtime without changing DPS.
  const quietFx = gs.fx as unknown as Record<string, (...args: unknown[]) => void>;
  for (const k of ['burst', 'spray', 'teleLine', 'teleCircle', 'ring', 'flash', 'number']) quietFx[k] = () => {};
  (gs as unknown as { castFx: () => void; requestHitStop: () => void }).castFx = () => {};
  (gs as unknown as { requestHitStop: () => void }).requestHitStop = () => {};

  gs.player.setPosition(0, 0);

  // 标靶：blob 换皮覆写为 不动/不伤/不退/不掉珠 的木桩
  const targets: Enemy[] = [];
  for (const [r, n] of RINGS) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r * 0.01; // 各环错相
      targets.push(gs.enemies.spawn('blob', Math.cos(a) * r, Math.sin(a) * r));
    }
  }
  const resetTargets = (): void => {
    for (const e of targets) {
      e.hp = e.maxHp = 1e9;
      e.spd = 0;
      e.dmg = 0;
      e.xpVal = 0;
      e.knockMul = 0;
      e.kvx = e.kvy = 0;
    }
  };

  // 中性化属性：商店强化/角色偏移归一；crit 压成 0（基础 0.1 + (-0.1)）保证低方差
  const neutralize = (): void => {
    Object.assign(gs.run.stats, {
      dmg: 1, cd: 1, area: 1, magnet: 0, moveSpeed: 0, projSpeed: 1,
      maxHp: 9999, xpGain: 1, coinGain: 1, armor: 0, regen: 0, crit: -1,
    });
  };

  const results: Array<{ id: WeaponId; lv5: number; evo: number }> = [];
  const totalSteps = metas.length * 2 * rounds;
  let step = 0;
  const frames = Math.round(simSeconds / DT);
  const setProgress = (id = '', mode = ''): void => {
    (window as unknown as { __benchProgress?: unknown }).__benchProgress = { step, totalSteps, id, mode };
  };
  setProgress();

  for (const meta of metas) {
    const row = { id: meta.id, lv5: 0, evo: 0 };
    for (const mode of ['lv5', 'evo'] as const) {
      let acc = 0;
      for (let round = 0; round < rounds; round++) {
        gs.weapons.removeAll();
        gs.benchReset();
        resetTargets();
        for (let i = 0; i < WEAPON_MAX_LEVEL; i++) gs.weapons.addOrUpgrade(meta.id);
        if (mode === 'evo') gs.weapons.evolve(meta.id);
        neutralize();
        const before = totalFor(gs, meta.id);
        let fakeNow = performance.now();
        for (let f = 0; f < frames; f++) {
          fakeNow += DT * 1000;
          gs.benchTick(DT);
          // 手动泵场景计时器：delayedCall 伤害链按模拟时间结算；
          // preUpdate 把新建计时器从 pending 队列激活——缺了它本帧 delayedCall 永不触发
          gs.time.preUpdate();
          gs.time.update(fakeNow, DT * 1000);
          // 手动泵 tween（内部按 Date.now 墙钟走）：rain/mallet 的伤害在 tween onComplete 里，
          // 隐藏页无 RAF 时若不泵则永不结算
          gs.tweens.update();
          if (f % 900 === 899) await yieldTask(); // 让出主线程，页面保持响应
        }
        // 排空窗：tween 伤害按墙钟成熟（rain 雨滴 360ms / mallet 前摇 160ms），
        // 继续泵 ~600ms 墙钟时间让尾部伤害入账（不用 setTimeout——隐藏页会被钳到分钟级）
        const drainUntil = Date.now() + 600;
        while (Date.now() < drainUntil) {
          fakeNow += DT * 1000;
          gs.time.preUpdate();
          gs.time.update(fakeNow, DT * 1000);
          gs.tweens.update();
          await yieldTask();
        }
        acc += (totalFor(gs, meta.id) - before) / simSeconds;
        step++;
        setProgress(meta.id, mode);
        label.setText(`DPS bench ${step}/${totalSteps} · ${t('w_' + meta.id)} ${mode}`);
      }
      row[mode] = acc / rounds;
    }
    results.push(row);
  }

  // 输出：console.table + 可直接落档 docs/balance/ 的 Markdown（window.__benchResult）
  const sorted = [...results].sort((a, b) => b.lv5 - a.lv5);
  const lv5s = results.map((r) => r.lv5).sort((a, b) => a - b);
  const mid = Math.floor(lv5s.length / 2);
  const median = lv5s.length % 2 === 0 ? (lv5s[mid - 1] + lv5s[mid]) / 2 : lv5s[mid];
  const fmt = (v: number): string => v.toFixed(1);
  const md = [
    '| 武器 | Lv5 DPS | /中位 | 进化 DPS | 进化/Lv5 |',
    '|------|--------:|------:|---------:|---------:|',
    ...sorted.map((r) => `| ${r.id} | ${fmt(r.lv5)} | ${(r.lv5 / median).toFixed(2)}x | ${fmt(r.evo)} | ${(r.evo / Math.max(1, r.lv5)).toFixed(2)}x |`),
    '',
    `中位（Lv5）= ${fmt(median)}；标靶三环 24（r56/r110/r260 各 8）；每项 ${SIM_SECONDS}s ×${ROUNDS} 轮取均值；属性全中性、暴击关闭。`,
  ].join('\n');
  console.table(results.map((r) => ({
    weapon: r.id, lv5: Math.round(r.lv5), ratio: (r.lv5 / median).toFixed(2), evo: Math.round(r.evo),
  })));
  (window as unknown as { __benchResult: string; __benchRows?: unknown }).__benchResult = md;
  (window as unknown as { __benchRows: Array<{ id: WeaponId; lv5: number; evo: number }> }).__benchRows = results;
  SFX.setMuted(wasMuted);
  label.setText('DPS bench 完成：console.table / window.__benchResult\n点击任意处返回主菜单');
  gs.input.once('pointerup', () => gs.scene.start('title'));
}
