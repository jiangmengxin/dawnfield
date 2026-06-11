// WebAudio 程序化音频：SFX 即时合成 + 生成式五声音阶 BGM（零外部资源）
const LS_KEY = 'dawnfield.muted';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmIntensity = 0;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  constructor() {
    try { this.muted = localStorage.getItem(LS_KEY) === '1'; } catch { /* ignore */ }
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
    try { localStorage.setItem(LS_KEY, m ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  // ---------- 基础合成单元 ----------

  private tone(opts: {
    freq: number; end?: number; dur: number; type?: OscillatorType;
    vol?: number; attack?: number; delay?: number; sendEcho?: boolean;
  }): void {
    if (!this.ctx || !this.master || this.muted) return;
    const { ctx } = this;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.end && opts.end !== opts.freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.end), t0 + opts.dur);
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.12;
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

  private noise(opts: { dur: number; vol?: number; filter?: number; q?: number; type?: BiquadFilterType; slide?: number; delay?: number }): void {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
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
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.1, t0 + 0.008);
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
  warning(): void {
    this.tone({ freq: 220, dur: 0.18, type: 'square', vol: 0.07 });
    this.tone({ freq: 220, dur: 0.18, type: 'square', vol: 0.07, delay: 0.25 });
  }
  bossRoar(): void {
    this.tone({ freq: 90, end: 55, dur: 0.9, type: 'sawtooth', vol: 0.14 });
    this.noise({ dur: 0.8, vol: 0.1, filter: 400, slide: 100 });
  }
  victoryJingle(): void {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.45, vol: 0.09, delay: i * 0.14, type: 'triangle', sendEcho: true }));
  }
  defeatJingle(): void {
    [392, 370, 311, 262].forEach((f, i) => this.tone({ freq: f, dur: 0.6, vol: 0.08, delay: i * 0.3, type: 'triangle' }));
  }

  // ---------- 生成式 BGM ----------
  // 五声音阶随机拨弦 + 每 4 小节柔和 pad，强度随局内时间提升

  startBgm(): void {
    if (this.bgmTimer !== null || !this.ctx) return;
    this.bgmStep = 0;
    const stepDur = 60 / 96 / 2; // 96 BPM 八分音符
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
    const pent = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]; // C 大调五声两个八度
    const density = 0.32 + this.bgmIntensity * 0.3;
    // 拨弦
    if (Math.random() < density) {
      const n = pent[Math.floor(Math.random() * pent.length)];
      this.tone({ freq: n, dur: 0.5, type: 'triangle', vol: 0.045, attack: 0.004, sendEcho: true });
    }
    // 低音（每小节第一拍）
    if (s % 8 === 0) {
      const roots = [130.8, 98.0, 110.0, 146.8];
      this.tone({ freq: roots[(s / 8) % 4], dur: stepDur * 7, type: 'sine', vol: 0.05, attack: 0.02 });
    }
    // pad（每 4 小节）
    if (s % 32 === 0) {
      const chords = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [196.0, 246.9, 293.7], [261.6, 349.2, 440.0]];
      const ch = chords[(s / 32) % 4];
      ch.forEach((f) => this.tone({ freq: f * 2, dur: stepDur * 30, type: 'sine', vol: 0.018, attack: 1.2 }));
    }
    // 轻打点
    if (s % 4 === 2 && Math.random() < 0.3 + this.bgmIntensity * 0.5) {
      this.noise({ dur: 0.04, vol: 0.02, type: 'highpass', filter: 6000 });
    }
  }
}

export const SFX = new SoundEngine();
