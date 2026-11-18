function createBrowserAudioContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  return AudioContext ? new AudioContext() : null;
}

export class RaceAudio {
  constructor(contextFactory = createBrowserAudioContext) {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.rollingNodes = [];
    this.contextFactory = contextFactory;
  }

  disable() {
    this.stopRolling();
    try { this.master?.disconnect?.(); } catch { /* already disconnected */ }
    this.enabled = false;
    this.context = null;
    this.master = null;
  }

  async unlock() {
    if (!this.enabled) return false;
    try {
      if (!this.context) {
        this.context = this.contextFactory();
        if (!this.context) {
          this.disable();
          return false;
        }
        this.master = this.context.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return true;
    } catch {
      this.disable();
      return false;
    }
  }

  tone(frequency, delay = 0, duration = 0.12, type = 'sine', volume = 0.18) {
    if (!this.enabled || !this.context || !this.master) return;
    try {
      const start = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.03);
    } catch {
      this.disable();
    }
  }

  countdown() {
    this.tone(430, 0, 0.13, 'square', 0.13);
    this.tone(430, 0.42, 0.13, 'square', 0.13);
    this.tone(430, 0.84, 0.13, 'square', 0.13);
    this.tone(840, 1.24, 0.32, 'sawtooth', 0.18);
  }

  startRolling() {
    if (!this.enabled || !this.context || !this.master || this.rollingNodes.length) return;
    try {
      const gain = this.context.createGain();
      const low = this.context.createOscillator();
      const high = this.context.createOscillator();
      const lfo = this.context.createOscillator();
      const lfoGain = this.context.createGain();

      gain.gain.value = 0.035;
      low.type = 'sawtooth';
      low.frequency.value = 74;
      high.type = 'triangle';
      high.frequency.value = 148;
      lfo.type = 'sine';
      lfo.frequency.value = 5.2;
      lfoGain.gain.value = 14;

      lfo.connect(lfoGain).connect(low.frequency);
      low.connect(gain);
      high.connect(gain);
      gain.connect(this.master);
      low.start();
      high.start();
      lfo.start();
      this.rollingNodes = [low, high, lfo, gain];
    } catch {
      this.disable();
    }
  }

  arrival(position) {
    const base = Math.max(420, 900 - position * 42);
    this.tone(base, 0, 0.1, 'triangle', 0.16);
    this.tone(base * 1.26, 0.08, 0.15, 'sine', 0.13);
  }

  finishFanfare() {
    this.stopRolling();
    [523, 659, 784, 1047].forEach((frequency, index) => {
      this.tone(frequency, index * 0.12, 0.34, 'triangle', 0.16);
    });
  }

  stopRolling() {
    this.rollingNodes.forEach((node) => {
      try { node.stop?.(); } catch { /* already stopped */ }
      try { node.disconnect?.(); } catch { /* already disconnected */ }
    });
    this.rollingNodes = [];
  }

  stopAll() {
    this.stopRolling();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }
}
