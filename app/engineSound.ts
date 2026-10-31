import { TOP_MPH } from "./drive";

// A synthesised V8 for the drive scene, built from oscillators rather than a recording. A V8 fires four times per
// revolution, so the firing pulse runs at rpm / 60 * 4; a slower square wave lumps it into the burble, filtered
// noise adds the rasp, and a soft clipper plus a low-pass that opens with revs shape it into an exhaust note.
// Scroll speed is the throttle: revs climb through three gears while the car moves and settle to idle when it stops.

const IDLE = 850, REDLINE = 6900;
const GEARS = [28, 50, TOP_MPH]; // top speed of each gear, mph

type Graph = {
  ctx: AudioContext; master: GainNode; fire: OscillatorNode; fire2: OscillatorNode; sub: OscillatorNode; lump: OscillatorNode;
  tone: BiquadFilterNode; rasp: GainNode; noise: AudioBuffer;
};

class Engine {
  muted = false;
  running = false;
  private g: Graph | null = null;
  private listeners = new Set<() => void>();
  private t = 0;
  private moving = 0; // 0..1 throttle, from how fast the scroll is moving the car
  private lastMove = 0;
  private gear = 0;
  private timer = 0;

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((fn) => fn()); }

  private build(): Graph {
    const ctx = new AudioContext();
    const master = ctx.createGain(); master.gain.value = 0;
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.Q.value = 0.8; tone.frequency.value = 300;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 3); }
    shaper.curve = curve;
    // the firing pulse and a sub an octave down, amplitude-lumped by a slower square wave
    const body = ctx.createGain(); body.gain.value = 0.65;
    const fire = ctx.createOscillator(); fire.type = "sawtooth";
    const fire2 = ctx.createOscillator(); fire2.type = "sawtooth";
    const sub = ctx.createOscillator(); sub.type = "sine";
    const lump = ctx.createOscillator(); lump.type = "square";
    const lumpDepth = ctx.createGain(); lumpDepth.gain.value = 0.35;
    const mix = (o: OscillatorNode, level: number) => { const v = ctx.createGain(); v.gain.value = level; o.connect(v).connect(body); };
    mix(fire, 0.5); mix(fire2, 0.3); mix(sub, 0.6);
    lump.connect(lumpDepth).connect(body.gain);
    // looping noise through a band-pass for the rasp
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const hiss = ctx.createBufferSource(); hiss.buffer = noise; hiss.loop = true;
    const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = 1100; band.Q.value = 0.7;
    const rasp = ctx.createGain(); rasp.gain.value = 0;
    hiss.connect(band).connect(rasp).connect(shaper);
    body.connect(shaper).connect(tone).connect(master).connect(ctx.destination);
    for (const o of [fire, fire2, sub, lump]) o.start();
    hiss.start();
    return { ctx, master, fire, fire2, sub, lump, tone, rasp, noise };
  }

  // launch progress 0..1 from the scroll; the change between calls is the throttle
  drive(t: number) {
    const now = performance.now(), dt = Math.max(1, now - this.lastMove);
    const speed = Math.abs(t - this.t) / dt * 1000; // progress per second
    if (t !== this.t) { this.moving = Math.min(1, Math.max(this.moving, speed * 2.2)); this.lastMove = now; }
    this.t = t;
  }

  private tick = () => {
    const g = this.g;
    if (!g) return;
    // throttle decays once the scroll stops moving the car
    if (performance.now() - this.lastMove > 120) this.moving *= 0.86;
    const mph = TOP_MPH * this.t;
    const gear = GEARS.findIndex((top) => mph <= top + 0.01);
    const lo = gear > 0 ? GEARS[gear - 1] : 0, frac = (mph - lo) / (GEARS[gear] - lo);
    const geared = this.t > 0 ? 1500 + frac * (REDLINE - 1500) : IDLE;
    const rpm = IDLE + (geared - IDLE) * Math.min(1, 0.25 + this.moving);
    if (gear > this.gear && this.moving > 0.2) this.crackle();
    this.gear = gear;
    const f = (rpm / 60) * 4, at = g.ctx.currentTime, k = 0.06;
    g.fire.frequency.setTargetAtTime(f, at, k);
    g.fire2.frequency.setTargetAtTime(f * 1.005, at, k);
    g.sub.frequency.setTargetAtTime(f / 2, at, k);
    g.lump.frequency.setTargetAtTime(f / 4, at, k);
    g.tone.frequency.setTargetAtTime(220 + rpm * 0.16 + this.moving * 600, at, k);
    g.rasp.gain.setTargetAtTime(0.02 + this.moving * 0.09, at, k);
    g.master.gain.setTargetAtTime(this.muted ? 0 : 0.12 + this.moving * 0.2, at, 0.12);
  };

  // a short burst of filtered noise on each upshift
  private crackle() {
    const g = this.g;
    if (!g || this.muted) return;
    const src = g.ctx.createBufferSource(); src.buffer = g.noise;
    const bp = g.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 1.4;
    const env = g.ctx.createGain(), at = g.ctx.currentTime;
    env.gain.setValueAtTime(0.0001, at); env.gain.exponentialRampToValueAtTime(0.5, at + 0.01); env.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    src.connect(bp).connect(env).connect(g.master);
    src.start(at, Math.random() * 0.5, 0.25);
  }

  start() {
    if (this.muted) return;
    this.g ??= this.build();
    void this.g.ctx.resume();
    if (!this.timer) this.timer = window.setInterval(this.tick, 50);
    this.running = true; this.emit();
  }

  stop() {
    const g = this.g;
    if (g) { g.master.gain.setTargetAtTime(0, g.ctx.currentTime, 0.1); window.setTimeout(() => { if (!this.running) void g.ctx.suspend(); }, 600); }
    window.clearInterval(this.timer); this.timer = 0;
    this.running = false; this.emit();
  }

  toggle() {
    this.muted = !this.muted;
    if (this.muted) this.stop(); else this.start();
  }
}

export const engine = new Engine();
