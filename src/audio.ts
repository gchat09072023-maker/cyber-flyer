/**
 * Procedural Web Audio synthesizer for Cyber Flyer.
 * Zero external audio files (100% self-contained).
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private thrusterNode: AudioBufferSourceNode | null = null;
  private thrusterGain: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private isInitialized: boolean = false;

  constructor() {}

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Continuous engine oscillator
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 350;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      // Thruster noise generator (for flight & boost)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.3;
      }

      this.thrusterNode = this.ctx.createBufferSource();
      this.thrusterNode.buffer = noiseBuffer;
      this.thrusterNode.loop = true;

      const thrusterFilter = this.ctx.createBiquadFilter();
      thrusterFilter.type = 'bandpass';
      thrusterFilter.frequency.value = 650;
      thrusterFilter.Q.value = 1.3;

      this.thrusterGain = this.ctx.createGain();
      this.thrusterGain.gain.value = 0;

      this.thrusterNode.connect(thrusterFilter);
      thrusterFilter.connect(this.thrusterGain);
      this.thrusterGain.connect(this.ctx.destination);
      this.thrusterNode.start();

      // Continuous gentle rain sound loop
      const rainBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const rainData = rainBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        rainData[i] = (Math.random() * 2 - 1) * 0.25;
      }
      this.rainNode = this.ctx.createBufferSource();
      this.rainNode.buffer = rainBuf;
      this.rainNode.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1800;
      rainFilter.Q.value = 0.85;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;

      this.rainNode.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination);
      this.rainNode.start();

      this.isInitialized = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
      if (this.isMuted) {
        if (this.engineGain) this.engineGain.gain.value = 0;
        if (this.thrusterGain) this.thrusterGain.gain.value = 0;
        if (this.rainGain) this.rainGain.gain.value = 0;
      }
    }
  }

  public setRainVolume(volume: number) {
    if (!this.ctx || this.isMuted || !this.rainGain) return;
    const clamped = Math.max(0, Math.min(0.2, volume * 0.18));
    this.rainGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.2);
  }

  public playThunder() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(22, now + 1.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 1.8);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public updateEngine(speedKmh: number, isFlight: boolean, isNitro: boolean, isThrusting: boolean) {
    if (!this.ctx || this.isMuted || !this.engineGain || !this.engineOsc || !this.engineFilter || !this.thrusterGain) {
      return;
    }

    const t = this.ctx.currentTime;
    const baseFreq = 50 + speedKmh * 1.8 + (isNitro ? 45 : 0) + (isFlight ? 25 : 0);
    this.engineOsc.frequency.setTargetAtTime(Math.min(baseFreq, 380), t, 0.08);

    const filterCutoff = 280 + speedKmh * 7 + (isNitro ? 600 : 0);
    this.engineFilter.frequency.setTargetAtTime(Math.min(filterCutoff, 2200), t, 0.08);

    const targetGain = isThrusting ? 0.045 : 0.02;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.1);

    // Jet Thruster volume
    let jetGain = 0;
    if (isFlight) jetGain += 0.035;
    if (isNitro) jetGain += 0.08;
    this.thrusterGain.gain.setTargetAtTime(jetGain, t, 0.06);
  }

  public stopEngine() {
    if (this.engineGain) this.engineGain.gain.value = 0;
    if (this.thrusterGain) this.thrusterGain.gain.value = 0;
  }

  public playCoin() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.exponentialRampToValueAtTime(2093.0, now + 0.14);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playRingPass() {
    if (!this.ctx || this.isMuted) return;
    const notes = [587.33, 880, 1174.66];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.35);

      gain.gain.setValueAtTime(0.08, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.4);
    });
  }

  public playCoreCollect() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.25);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playTransform(toFlight: boolean) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    const startFreq = toFlight ? 220 : 700;
    const endFreq = toFlight ? 720 : 200;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.35);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCushion() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.2);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playLanding() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playCrash() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Heavy low crash thud
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(25, now + 0.45);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Metallic crunch noise
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.3);
    gain2.gain.setValueAtTime(0.25, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.3);
  }

  public playRespawn() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playGameOver() {
    if (!this.ctx || this.isMuted) return;
    const notes = [330, 293.66, 261.63, 196]; // E4, D4, C4, G3
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      gain.gain.setValueAtTime(0.18, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.3);
    });
  }

  public playVictory() {
    if (!this.ctx || this.isMuted) return;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    const now = this.ctx.currentTime;

    chord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65 + idx * 0.08);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + 0.7 + idx * 0.08);
    });
  }
}

export const sound = new SoundEngine();
