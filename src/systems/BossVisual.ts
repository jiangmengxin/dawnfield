// Boss 视觉状态层：EnemySystem 只转发生命周期，BossController 只发施法意图。
import type Phaser from 'phaser';
import type { BossMoveId } from '../content/bosses';
import { PAL } from '../gfx/palette';
import {
  BOSS_ART_BY_KEY, BOSS_FRAME_COUNTS, BossFrameState, BossTelegraphStyle, bossTextureKey,
} from '../gfx/textures/bosses';
import type { Enemy } from './EnemySystem';

export type BossVisualMode = 'idle' | 'move' | 'hit' | 'cast_main' | 'cast_support' | 'phase' | 'death';
export type BossVisualCastRole = 'main' | 'support';

export interface BossVisualSnapshot {
  mode: BossVisualMode;
  textureState: BossFrameState;
  phase2: boolean;
  frame: number;
  scaleX: number;
  scaleY: number;
  aura: number;
}

const PRIORITY: Record<BossVisualMode, number> = {
  idle: 0,
  move: 1,
  hit: 2,
  cast_main: 3,
  cast_support: 3,
  phase: 4,
  death: 5,
};

const DUR: Record<Exclude<BossVisualMode, 'idle' | 'move'>, number> = {
  hit: 0.22,
  cast_main: 0.68,
  cast_support: 0.52,
  phase: 0.86,
  death: 0.95,
};

export class BossVisualStateMachine {
  private mode: BossVisualMode = 'idle';
  private timer = 0;
  private animT = 0;
  private phase2 = false;
  private hitCd = 0;

  get currentMode(): BossVisualMode {
    return this.mode;
  }

  get isPhase2(): boolean {
    return this.phase2;
  }

  setPhase2(v: boolean): void {
    if (v && !this.phase2) {
      this.phase2 = true;
      this.request('phase', DUR.phase);
    } else {
      this.phase2 = v;
    }
  }

  requestCast(role: BossVisualCastRole): boolean {
    return this.request(role === 'main' ? 'cast_main' : 'cast_support', role === 'main' ? DUR.cast_main : DUR.cast_support);
  }

  requestHit(): boolean {
    if (this.hitCd > 0) return false;
    this.hitCd = 0.16;
    return this.request('hit', DUR.hit);
  }

  requestDeath(): void {
    this.mode = 'death';
    this.timer = DUR.death;
  }

  update(dt: number, moving: boolean): BossVisualSnapshot {
    this.animT += dt;
    this.hitCd = Math.max(0, this.hitCd - dt);
    if (this.mode !== 'idle' && this.mode !== 'move') {
      this.timer -= dt;
      if (this.timer <= 0 && this.mode !== 'death') this.mode = moving ? 'move' : 'idle';
    } else {
      this.mode = moving ? 'move' : 'idle';
    }

    const textureState = this.textureStateFor(this.mode);
    const frame = this.frameFor(textureState);
    const pulse = Math.sin(this.animT * Math.PI * 2.2);
    const cast = this.mode === 'cast_main' || this.mode === 'cast_support';
    const scaleX = this.mode === 'hit' ? 1.08 : cast ? 0.98 : 1 + pulse * 0.018;
    const scaleY = this.mode === 'hit' ? 0.93 : cast ? 1.05 : 1 - pulse * 0.018;
    const aura = this.mode === 'phase' ? 1 : cast ? 0.75 : this.phase2 ? 0.42 : 0;
    return { mode: this.mode, textureState, phase2: this.phase2, frame, scaleX, scaleY, aura };
  }

  private request(mode: BossVisualMode, duration: number): boolean {
    if (this.mode === 'death') return false;
    const currentPriority = PRIORITY[this.mode];
    const nextPriority = PRIORITY[mode];
    const currentLocked = this.timer > 0 && this.mode !== 'idle' && this.mode !== 'move';
    if (currentLocked && nextPriority <= currentPriority) return false;
    this.mode = mode;
    this.timer = duration;
    return true;
  }

  private textureStateFor(mode: BossVisualMode): BossFrameState {
    if (mode === 'hit') return 'hit';
    if (mode === 'cast_main') return 'cast_main';
    if (mode === 'cast_support') return 'cast_support';
    if (mode === 'death') return 'death';
    return 'idle';
  }

  private frameFor(state: BossFrameState): number {
    const fps = state === 'idle' ? 7 : state === 'hit' ? 10 : state === 'death' ? 3 : 9;
    return Math.floor(this.animT * fps) % BOSS_FRAME_COUNTS[state];
  }
}

export class BossVisualController {
  readonly machine = new BossVisualStateMachine();
  private aura: Phaser.GameObjects.Graphics;
  private style: BossTelegraphStyle;

  constructor(private scene: Phaser.Scene, private baseKey: string) {
    this.style = BOSS_ART_BY_KEY[baseKey]?.style ?? 'ink';
    this.aura = scene.add.graphics().setDepth(999);
  }

  notifyCast(role: BossVisualCastRole, _moveId?: BossMoveId): void {
    this.machine.requestCast(role);
  }

  update(e: Enemy, dt: number, phase2: boolean, moving: boolean): void {
    this.machine.setPhase2(phase2);
    if (e.punchT > 0) this.machine.requestHit();
    const snap = this.machine.update(dt, moving);
    const key = bossTextureKey(this.baseKey, snap.textureState, snap.phase2, snap.frame);
    if (this.scene.textures.exists(key) && e.texture.key !== key) e.setTexture(key);
    const sx = e.baseScale * snap.scaleX;
    const sy = e.baseScale * snap.scaleY;
    e.setScale(sx, sy);
    this.drawAura(e, snap);
  }

  playDeath(e: Enemy): void {
    this.machine.requestDeath();
    const key = bossTextureKey(this.baseKey, 'death', this.machine.isPhase2, 0);
    const tex = this.scene.textures.exists(key) ? key : this.baseKey;
    const ghost = this.scene.add.image(e.x, e.y, tex)
      .setDepth(e.depth + 2)
      .setScale(e.scaleX, e.scaleY)
      .setFlipX(e.flipX)
      .setAlpha(0.95);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: Math.abs(e.scaleX) * 1.12,
      scaleY: Math.abs(e.scaleY) * 0.78,
      y: e.y + e.radius * 0.42,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => ghost.destroy(),
    });
    const scatter = this.scene.add.graphics().setDepth(e.depth + 1);
    drawDeathScatter(scatter, this.style, e.x, e.y, e.radius, BOSS_ART_BY_KEY[this.baseKey]?.accent2 ?? PAL.white);
    this.scene.tweens.add({
      targets: scatter,
      alpha: 0,
      y: e.radius * 0.28,
      duration: 820,
      ease: 'Sine.easeOut',
      onComplete: () => scatter.destroy(),
    });
  }

  destroy(): void {
    this.aura.destroy();
  }

  private drawAura(e: Enemy, snap: BossVisualSnapshot): void {
    const g = this.aura.clear();
    if (snap.aura <= 0) return;
    const spec = BOSS_ART_BY_KEY[this.baseKey];
    const color = spec?.accent2 ?? PAL.white;
    const edge = spec?.edge ?? PAL.ink;
    g.setDepth(e.depth - 0.4);
    const r = e.radius * (snap.mode === 'phase' ? 1.45 : 1.2);
    const alpha = snap.aura;
    g.lineStyle(3, color, 0.18 + alpha * 0.32);
    g.strokeCircle(e.x, e.y + e.radius * 0.12, r);
    g.lineStyle(1.4, edge, 0.16 + alpha * 0.18);
    g.strokeCircle(e.x, e.y + e.radius * 0.12, r * 0.78);
    const n = snap.mode === 'phase' ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + snap.frame * 0.12;
      drawGraphicsMotif(g, this.style, e.x + Math.cos(a) * r, e.y + e.radius * 0.12 + Math.sin(a) * r * 0.68, 4.5, color, edge, 0.32 + alpha * 0.35);
    }
  }
}

function drawDeathScatter(g: Phaser.GameObjects.Graphics, style: BossTelegraphStyle, x: number, y: number, r: number, color: number): void {
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rr = r * (0.35 + (i % 4) * 0.12);
    drawGraphicsMotif(g, style, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75, 4 + (i % 3), color, PAL.ink, 0.55);
  }
}

function drawGraphicsMotif(g: Phaser.GameObjects.Graphics, style: BossTelegraphStyle, x: number, y: number, r: number, color: number, edge: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.lineStyle(1.4, edge, alpha * 0.7);
  if (style === 'bubble' || style === 'spore' || style === 'cider') {
    g.fillCircle(x, y, r);
    g.strokeCircle(x, y, r * 1.35);
  } else if (style === 'star' || style === 'frost' || style === 'clock') {
    const points = style === 'frost' ? 4 : 5;
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 === 0 ? r * 1.45 : r * 0.55;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (style === 'mirror') {
    g.beginPath();
    g.moveTo(x, y - r * 1.4);
    g.lineTo(x + r, y);
    g.lineTo(x, y + r * 1.4);
    g.lineTo(x - r, y);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else {
    g.beginPath();
    g.moveTo(x, y - r * 1.4);
    g.lineTo(x + r * 0.75, y + r * 0.2);
    g.lineTo(x, y + r * 1.4);
    g.lineTo(x - r * 0.75, y + r * 0.2);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }
}
