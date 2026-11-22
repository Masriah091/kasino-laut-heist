// Suara WebAudio murni synth — tanpa file audio eksternal.
// Langkah kaki, denting chip, sting alarm, bunyi ambil loot, dan dengung kasino.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambientNodes = null;
    this.stepPhase = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // Nada pendek dengan envelope naik-turun.
  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Desis singkat (untuk langkah dan gemerincing chip).
  noise(dur, vol, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  step() {
    this.stepPhase = 1 - this.stepPhase;
    this.noise(0.07, 0.10, this.stepPhase ? 420 : 300);
  }

  pickup() {
    // Denting koin emas: tiga nada naik.
    this.tone(880, 0.12, 'sine', 0.22);
    this.tone(1174, 0.14, 'sine', 0.22, 0.07);
    this.tone(1568, 0.22, 'sine', 0.2, 0.14);
    this.noise(0.18, 0.08, 5200, 0.02);
  }

  decoy() {
    this.noise(0.25, 0.16, 3400);
    this.tone(1568, 0.1, 'triangle', 0.12, 0.05);
  }

  alarmSting() {
    // Dua nada sirene turun-naik.
    this.tone(660, 0.22, 'sawtooth', 0.14, 0, 440);
    this.tone(440, 0.22, 'sawtooth', 0.14, 0.22, 660);
  }

  caught() {
    this.tone(220, 0.5, 'sawtooth', 0.2, 0, 110);
    this.tone(110, 0.7, 'square', 0.12, 0.1, 55);
  }

  win() {
    // Arpeggio jackpot.
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, i * 0.11));
    this.noise(0.5, 0.06, 6000, 0.1);
  }

  click() {
    this.tone(700, 0.06, 'square', 0.1);
  }

  // Dengung kasino: hum rendah + lonceng slot sesekali (dijadwalkan dari world).
  startAmbient() {
    this.ensure();
    if (!this.ctx || this.ambientNodes) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.045;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.ambientNodes = { osc, lfo, gain };
  }

  slotChime() {
    this.tone(2093, 0.09, 'sine', 0.05);
    this.tone(2637, 0.09, 'sine', 0.04, 0.08);
  }
}
