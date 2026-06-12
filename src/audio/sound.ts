// WebAudio 程序化音频：SFX 即时合成 + 生成式五声音阶 BGM（零外部资源）
// M5 起 BGM 按 BgmSpec 主题化（content/maps.ts）：每图各自的调式/速度/音色/打击乐/回声湿度
// 静音/分轨音量（M8：BGM/SFX 各一轨）持久化进版本化存档（core/save），旧散键由 v0 迁移吸收
import type { BgmSpec } from '../content/maps';
import { getSave, persistSave } from '../core/save';

/** 缺省主题（C 大调五声，title 等无图场合兜底） */
const DEFAULT_BGM: BgmSpec = {
  bpm: 96,
  scale: [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3],
  bass: [130.8, 98.0, 110.0, 146.8],
  chords: [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [196.0, 246.9, 293.7], [261.6, 349.2, 440.0]],
  pluckType: 'triangle',
  pluckVol: 0.045,
  density: 0.32,
  densityK: 0.3,
  perc: 'tick',
  echo: 0.35,
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private wet: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmIntensity = 0;
  private bgmSpec: BgmSpec = DEFAULT_BGM;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;
  /** M8 分轨音量：BGM / SFX 各自 0..1，合成时按声音所属轨乘入（回声随声源同轨缩放） */
  volBgm = 1;
  volSfx = 1;

  constructor() {
    const st = getSave().settings;
    this.muted = st.muted;
    this.volBgm = st.volBgm;
    this.volSfx = st.volSfx;
  }

  /** 必须在用户手势中首次调用（移动端 AudioContext 解锁） */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    // 共享回声发送（BGM 拨弦用）
    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = 0.28;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.3;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(this.master);
    this.wet = wet;
    this.delaySend = this.ctx.createGain();
    this.delaySend.connect(delay);
    // 噪声缓冲
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    getSave().settings.muted = m;
    persistSave();
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  /** BGM 轨音量（已发声的长音不追溯，下一拍起生效——八分音符粒度足够跟手） */
  setVolBgm(v: number): void {
    this.volBgm = Math.max(0, Math.min(1, v));
    getSave().settings.volBgm = this.volBgm;
    persistSave();
  }

  setVolSfx(v: number): void {
    this.volSfx = Math.max(0, Math.min(1, v));
    getSave().settings.volSfx = this.volSfx;
    persistSave();
  }

  // ---------- 基础合成单元 ----------

  private tone(opts: {
    freq: number; end?: number; dur: number; type?: OscillatorType;
    vol?: number; attack?: number; delay?: number; sendEcho?: boolean; bus?: 'sfx' | 'bgm';
  }): void {
    if (!this.ctx || !this.master || this.muted) return;
    const busVol = (opts.bus ?? 'sfx') === 'bgm' ? this.volBgm : this.volSfx;
    if (busVol <= 0) return;
    const { ctx } = this;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.end && opts.end !== opts.freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.end), t0 + opts.dur);
    const g = ctx.createGain();
    const vol = (opts.vol ?? 0.12) * busVol;
    const atk = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g);
    g.connect(this.master);
    if (opts.sendEcho && this.delaySend) g.connect(this.delaySend);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  private noise(opts: { dur: number; vol?: number; filter?: number; q?: number; type?: BiquadFilterType; slide?: number; delay?: number; bus?: 'sfx' | 'bgm' }): void {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
    const busVol = (opts.bus ?? 'sfx') === 'bgm' ? this.volBgm : this.volSfx;
    if (busVol <= 0) return;
    const { ctx } = this;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.setValueAtTime(opts.filter ?? 1200, t0);
    if (opts.slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slide), t0 + opts.dur);
    f.Q.value = opts.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((opts.vol ?? 0.1) * busVol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.05);
  }

  // ---------- SFX ----------

  swish(): void { this.noise({ dur: 0.16, vol: 0.06, type: 'bandpass', filter: 900, slide: 2600, q: 1.2 }); }
  hit(pitch = 1): void { this.noise({ dur: 0.07, vol: 0.055, filter: 1800 * pitch, slide: 500, q: 1 }); }
  kill(): void { this.tone({ freq: 360, end: 120, dur: 0.16, type: 'square', vol: 0.05 }); }
  pickup(combo = 0): void {
    const f = 620 * Math.pow(1.06, Math.min(combo, 12));
    this.tone({ freq: f, end: f * 1.5, dur: 0.1, type: 'sine', vol: 0.07 });
  }
  coin(): void {
    this.tone({ freq: 1050, end: 1400, dur: 0.09, type: 'triangle', vol: 0.06 });
    this.tone({ freq: 1580, dur: 0.07, type: 'sine', vol: 0.04, delay: 0.05 });
  }
  heal(): void {
    this.tone({ freq: 520, end: 780, dur: 0.22, vol: 0.08 });
    this.tone({ freq: 660, end: 990, dur: 0.22, vol: 0.06, delay: 0.08 });
  }
  hurt(): void {
    this.tone({ freq: 200, end: 90, dur: 0.22, type: 'sawtooth', vol: 0.1 });
    this.noise({ dur: 0.12, vol: 0.06, filter: 600 });
  }
  boom(big = false): void {
    this.noise({ dur: big ? 0.6 : 0.3, vol: big ? 0.16 : 0.1, filter: big ? 900 : 700, slide: 60 });
    this.tone({ freq: big ? 120 : 150, end: 40, dur: big ? 0.5 : 0.25, type: 'triangle', vol: 0.12 });
  }
  zap(): void {
    this.noise({ dur: 0.12, vol: 0.06, type: 'highpass', filter: 2400, q: 2 });
    this.tone({ freq: 1400, end: 300, dur: 0.1, type: 'sawtooth', vol: 0.035 });
  }
  beam(): void { this.tone({ freq: 300, end: 1500, dur: 0.22, type: 'sawtooth', vol: 0.04 }); }
  splash(): void { this.noise({ dur: 0.18, vol: 0.05, filter: 2200, slide: 700 }); }
  throwSfx(): void { this.noise({ dur: 0.12, vol: 0.04, type: 'bandpass', filter: 700, slide: 1600, q: 1.5 }); }
  levelup(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.3, vol: 0.08, delay: i * 0.07, sendEcho: true }));
  }
  chest(): void {
    [392, 523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.35, vol: 0.08, delay: i * 0.09, type: 'triangle', sendEcho: true }));
  }
  evolve(): void {
    [523, 622, 784, 932, 1245].forEach((f, i) => this.tone({ freq: f, dur: 0.4, vol: 0.09, delay: i * 0.1, type: 'triangle', sendEcho: true }));
    this.noise({ dur: 0.5, vol: 0.05, type: 'highpass', filter: 3000, delay: 0.3 });
  }
  uiClick(): void { this.tone({ freq: 800, end: 1000, dur: 0.06, vol: 0.05 }); }
  /** 风铃环：清脆铃音（基音 + 高泛音 + 回声） */
  chime(): void {
    this.tone({ freq: 1318, dur: 0.5, type: 'sine', vol: 0.06, attack: 0.003, sendEcho: true });
    this.tone({ freq: 1976, dur: 0.35, type: 'sine', vol: 0.03, attack: 0.003, delay: 0.02, sendEcho: true });
    this.tone({ freq: 659, dur: 0.4, type: 'triangle', vol: 0.025, delay: 0.01 });
  }
  warning(): void {
    this.tone({ freq: 220, dur: 0.18, type: 'square', vol: 0.07 });
    this.tone({ freq: 220, dur: 0.18, type: 'square', vol: 0.07, delay: 0.25 });
  }
  bossRoar(): void {
    this.tone({ freq: 90, end: 55, dur: 0.9, type: 'sawtooth', vol: 0.14 });
    this.noise({ dur: 0.8, vol: 0.1, filter: 400, slide: 100 });
  }
  /** 大风掠过（晚霞山岗风暴机制） */
  windGust(): void {
    this.noise({ dur: 1.6, vol: 0.09, type: 'bandpass', filter: 500, slide: 1600, q: 0.7 });
    this.noise({ dur: 1.2, vol: 0.05, filter: 900, slide: 250, delay: 0.5 });
  }
  victoryJingle(): void {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.45, vol: 0.09, delay: i * 0.14, type: 'triangle', sendEcho: true }));
  }
  defeatJingle(): void {
    [392, 370, 311, 262].forEach((f, i) => this.tone({ freq: f, dur: 0.6, vol: 0.08, delay: i * 0.3, type: 'triangle' }));
  }

  // ---------- 生成式 BGM ----------
  // 按 BgmSpec 主题随机拨弦 + 低音 + 每 4 小节柔和 pad + 主题打击乐，强度随局内时间提升

  startBgm(spec: BgmSpec = DEFAULT_BGM): void {
    this.stopBgm();
    this.bgmSpec = spec;
    this.bgmStep = 0;
    if (!this.ctx) return;
    if (this.wet) this.wet.gain.setTargetAtTime(spec.echo, this.ctx.currentTime, 0.1);
    const stepDur = 60 / spec.bpm / 2; // 八分音符
    this.bgmTimer = window.setInterval(() => this.bgmTick(stepDur), stepDur * 1000);
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setIntensity(v: number): void { this.bgmIntensity = Math.max(0, Math.min(1, v)); }

  private bgmTick(stepDur: number): void {
    if (!this.ctx || this.muted || document.hidden) { this.bgmStep++; return; }
    const s = this.bgmStep++;
    const t = this.bgmSpec;
    const density = t.density + this.bgmIntensity * t.densityK;
    // 拨弦
    if (Math.random() < density) {
      const n = t.scale[Math.floor(Math.random() * t.scale.length)];
      this.tone({ freq: n, dur: 0.5, type: t.pluckType, vol: t.pluckVol, attack: 0.004, sendEcho: true, bus: 'bgm' });
    }
    // 低音（每小节第一拍）
    if (s % 8 === 0) {
      this.tone({ freq: t.bass[(s / 8) % t.bass.length], dur: stepDur * 7, type: 'sine', vol: 0.05, attack: 0.02, bus: 'bgm' });
    }
    // pad（每 4 小节）
    if (s % 32 === 0) {
      const ch = t.chords[(s / 32) % t.chords.length];
      ch.forEach((f) => this.tone({ freq: f * 2, dur: stepDur * 30, type: 'sine', vol: 0.018, attack: 1.2, bus: 'bgm' }));
    }
    // 主题打击乐
    if (s % 4 === 2 && Math.random() < 0.3 + this.bgmIntensity * 0.5) {
      if (t.perc === 'tick') {
        this.noise({ dur: 0.04, vol: 0.02, type: 'highpass', filter: 6000, bus: 'bgm' });
      } else if (t.perc === 'drip') {
        // 水滴：短促上滑的小圆音
        const f = 480 + Math.random() * 320;
        this.tone({ freq: f, end: f * 2.1, dur: 0.09, type: 'sine', vol: 0.035, sendEcho: true, bus: 'bgm' });
      } else {
        // 沙锤：中频带通短噪声
        this.noise({ dur: 0.06, vol: 0.028, type: 'bandpass', filter: 4200, q: 1.6, bus: 'bgm' });
      }
    }
  }
}

export const SFX = new SoundEngine();
