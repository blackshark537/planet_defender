export class SoundService {
  private audioCtx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private bg_audio: HTMLAudioElement;
  private explotion_audio: HTMLAudioElement;
  private explosionAudioPool: HTMLAudioElement[] = [];
  private explosionPoolIndex = 0;
  private lastEnemyExplosionTime = 0;

  constructor() {
    this.bg_audio = new Audio('/assets/through_space.ogg');
    this.bg_audio.volume = 0.3;
    this.bg_audio.loop = true;

    this.explotion_audio = new Audio('/assets/explosion.wav');
    this.explotion_audio.volume = 0.5;

    for (let i = 0; i < 6; i++) {
      const audio = new Audio('/assets/explosion.wav');
      audio.volume = 0.45;
      this.explosionAudioPool.push(audio);
    }
  }

  getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  resumeAudio(): void {
    this.getAudioContext();
    if (this.bg_audio && this.bg_audio.paused) {
      this.bg_audio.play().catch(() => {});
    }
  }

  playBGM(): void {
    if (this.bg_audio && this.bg_audio.paused) {
      this.bg_audio.play().catch(() => {});
    }
  }

  pauseBGM(): void {
    if (this.bg_audio && !this.bg_audio.paused) {
      this.bg_audio.pause();
    }
  }

  triggerHaptic(pattern: number | number[]): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  private getNoise(aCtx: AudioContext): AudioBuffer {
    if (!this.noiseBuf || this.noiseBuf.sampleRate !== aCtx.sampleRate) {
      const bufferSize = Math.floor(aCtx.sampleRate * 0.3);
      this.noiseBuf = aCtx.createBuffer(1, bufferSize, aCtx.sampleRate);
      const output = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuf;
  }

  playNativeExplosion(): void {
    try {
      const audio = this.explosionAudioPool[this.explosionPoolIndex % this.explosionAudioPool.length];
      this.explosionPoolIndex++;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  playPlayerHitSound(isShield: boolean = false): void {
    this.triggerHaptic(isShield ? 35 : 70);
    try {
      const aCtx = this.getAudioContext();
      if (!aCtx) {
        if (this.explotion_audio) {
          this.explotion_audio.currentTime = 0;
          this.explotion_audio.play().catch(() => {});
        }
        return;
      }

      const now = aCtx.currentTime;
      if (isShield) {
        const osc = aCtx.createOscillator();
        const gain = aCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(aCtx.destination);
        osc.start(now);
        osc.stop(now + 0.21);
      } else {
        const osc = aCtx.createOscillator();
        const gain = aCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        const whiteNoise = aCtx.createBufferSource();
        whiteNoise.buffer = this.getNoise(aCtx);
        const noiseGain = aCtx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        whiteNoise.connect(noiseGain);
        noiseGain.connect(aCtx.destination);
        whiteNoise.start(now);
        whiteNoise.stop(now + 0.19);

        osc.connect(gain);
        gain.connect(aCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        if (this.explotion_audio) {
          this.explotion_audio.currentTime = 0;
          this.explotion_audio.play().catch(() => {});
        }
      }
    } catch (e) {
      this.playNativeExplosion();
    }
  }

  playEnemyExplosionSound(isGiant: boolean = false, dropsPowerUp: boolean = false, comboMultiplier: number = 1): void {
    this.triggerHaptic(isGiant ? 50 : 25);
    const nowMs = performance.now();
    const timeSinceLast = nowMs - this.lastEnemyExplosionTime;
    this.lastEnemyExplosionTime = nowMs;

    this.playNativeExplosion();

    try {
      const aCtx = this.getAudioContext();
      if (!aCtx) return;

      const now = aCtx.currentTime;
      const dur = isGiant ? 0.38 : 0.22;
      const pitchMultiplier = 1 + Math.min(0.65, (comboMultiplier - 1) * 0.09);
      const startFreq = (isGiant ? 95 : (160 + (Math.random() - 0.5) * 30)) * pitchMultiplier;
      const endFreq = (isGiant ? 22 : 38) * pitchMultiplier;

      const osc = aCtx.createOscillator();
      const oscGain = aCtx.createGain();
      osc.type = isGiant ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

      const volume = isGiant ? 0.45 : (timeSinceLast < 40 ? 0.22 : 0.35);
      oscGain.gain.setValueAtTime(volume, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + dur);

      osc.connect(oscGain);
      oscGain.connect(aCtx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);

      const whiteNoise = aCtx.createBufferSource();
      whiteNoise.buffer = this.getNoise(aCtx);

      const filter = aCtx.createBiquadFilter();
      filter.type = isGiant ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(isGiant ? 450 : 850, now);
      filter.frequency.exponentialRampToValueAtTime(isGiant ? 120 : 250, now + dur);

      const noiseGain = aCtx.createGain();
      noiseGain.gain.setValueAtTime(isGiant ? 0.35 : 0.25, now);
      const noiseDur = isGiant ? 0.26 : 0.16;
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + noiseDur);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(aCtx.destination);
      whiteNoise.start(now);
      whiteNoise.stop(now + noiseDur + 0.02);

      if (dropsPowerUp) {
        const chimeOsc = aCtx.createOscillator();
        const chimeGain = aCtx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(587.33, now + 0.05); // D5
        chimeOsc.frequency.setValueAtTime(880.00, now + 0.12); // A5

        chimeGain.gain.setValueAtTime(0.01, now);
        chimeGain.gain.setValueAtTime(0.25, now + 0.06);
        chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(aCtx.destination);
        chimeOsc.start(now + 0.05);
        chimeOsc.stop(now + 0.34);
      }
    } catch (e) {}
  }

  playBombSound(): void {
    this.playNativeExplosion();
    try {
      const aCtx = this.getAudioContext();
      if (!aCtx) return;
      const now = aCtx.currentTime;
      const osc = aCtx.createOscillator();
      const gain = aCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(18, now + 0.6);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(aCtx.destination);
      osc.start(now);
      osc.stop(now + 0.62);
    } catch (e) {}
  }

  playStageClearedSound(): void {
    this.triggerHaptic([40, 50, 70]);
    try {
      const aCtx = this.getAudioContext();
      if (!aCtx) return;
      const now = aCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = aCtx.createOscillator();
        const gain = aCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.11);
        gain.gain.setValueAtTime(0.01, now + i * 0.11);
        gain.gain.setValueAtTime(0.25, now + i * 0.11 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.11 + 0.35);
        osc.connect(gain);
        gain.connect(aCtx.destination);
        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 0.36);
      });
    } catch (e) {}
  }

  playButtonClickSound(): void {
    this.triggerHaptic(20);
    try {
      const aCtx = this.getAudioContext();
      if (!aCtx) return;
      const now = aCtx.currentTime;
      const osc = aCtx.createOscillator();
      const gain = aCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(aCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  playPauseSound(): void {
    try {
      const aCtx = this.getAudioContext();
      if (!aCtx) return;
      const now = aCtx.currentTime;
      const osc = aCtx.createOscillator();
      const gain = aCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(aCtx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  playResumeSound(): void {
    try {
      const aCtx = this.getAudioContext();
      if (!aCtx) return;
      const now = aCtx.currentTime;
      const osc = aCtx.createOscillator();
      const gain = aCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(aCtx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }
}
