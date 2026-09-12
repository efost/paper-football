export class TableAudio {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on && this.ctx) this.ctx.suspend();
    if (on && this.ctx) this.ctx.resume();
  }

  async unlock() {
    if (!this.enabled) return;
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  #env(freq, dur, type = "triangle", gain = 0.08, slide = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  #noise(dur, gain = 0.04, filterFreq = 900) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + dur + 0.02);
  }

  flick(power) {
    this.#noise(0.09, 0.05 + power * 0.05, 1400);
    this.#env(180 + power * 80, 0.08, "square", 0.03);
  }

  slide(speed) {
    if (speed < 40) return;
    this.#noise(0.05, Math.min(0.025, speed / 40000), 600);
  }

  fall() {
    this.#env(220, 0.28, "sine", 0.06, -160);
    this.#noise(0.2, 0.03, 400);
  }

  score() {
    this.#env(392, 0.18, "triangle", 0.07);
    this.#env(523, 0.28, "triangle", 0.06);
  }

  miss() {
    this.#env(160, 0.22, "sawtooth", 0.04, -70);
  }

  good() {
    this.#env(349, 0.16, "triangle", 0.06);
    this.#env(440, 0.22, "triangle", 0.05);
    this.#env(523, 0.3, "triangle", 0.05);
  }

  whistle() {
    this.#env(1800, 0.35, "sine", 0.03, 200);
  }
}
