// Plays the pieces I'm working on through Web Audio using the Salamander Grand Piano samples, and tells the
// 3D piano which keys are sounding. Note data is converted from Mutopia Project MIDI files (see public/music).

export type Note = [t: number, midi: number, velocity: number, duration: number];
export type Piece = { id: string; composer: string; title: string; credit: string };

export const PIECES: Piece[] = [
  { id: "moonlight-3", composer: "Beethoven", title: "Moonlight Sonata, III. Presto agitato", credit: "MIDI: Mutopia Project, CC BY-SA 2.5" },
  { id: "venetian-boat-song", composer: "Mendelssohn", title: "Venetian Boat Song, Op. 19 No. 6", credit: "MIDI: Mutopia Project, public domain" },
];

// Salamander Grand Piano by Alexander Holm, CC BY 3.0: one sample every minor third from A0
const SAMPLE_NAMES = ["A0", "C1", "Ds1", "Fs1"].concat(...Array.from({ length: 6 }, (_, o) => ["A", "C", "Ds", "Fs"].map((n) => `${n}${n === "A" ? o + 1 : o + 2}`)), ["A7", "C8"]);
const sampleMidi = (i: number) => 21 + i * 3;

type Listener = () => void;

export const pianoPlayer = {
  piece: PIECES[0],
  notes: [] as Note[],
  duration: 0,
  playing: false,
  ctx: null as AudioContext | null,
  bus: null as GainNode | null,
  samples: [] as AudioBuffer[],
  startAt: 0,
  offset: 0,
  next: 0,
  timer: 0 as ReturnType<typeof setInterval> | 0,
  listeners: new Set<Listener>(),
  loading: null as Promise<void> | null,

  emit() { this.listeners.forEach((l) => l()); },
  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; },

  async load(id: string) {
    const piece = PIECES.find((p) => p.id === id) ?? PIECES[0];
    const res = await fetch(`/music/${piece.id}.json`);
    const data = (await res.json()) as { duration: number; notes: Note[] };
    this.piece = piece; this.notes = data.notes; this.duration = data.duration; this.offset = 0;
    this.emit();
  },

  /** Seconds into the piece when sound is playing, otherwise null. */
  position(): number | null {
    if (!this.playing || !this.ctx) return null;
    return Math.max(0, this.ctx.currentTime - this.startAt);
  },

  async ensureAudio() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;
    this.ctx ??= new Ctx();
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});
    if (this.ctx.state !== "running") return false;
    const ctx = this.ctx;
    this.loading ??= Promise.all(SAMPLE_NAMES.map(async (n, i) => {
      const buf = await fetch(`/audio/salamander/${n}.mp3`).then((r) => r.arrayBuffer());
      this.samples[i] = await ctx.decodeAudioData(buf);
    })).then(() => {});
    await this.loading;
    return true;
  },

  async play(id = this.piece.id, from = 0) {
    this.stop();
    if (id !== this.piece.id || !this.notes.length) await this.load(id);
    this.playing = true; this.emit();
    if (!(await this.ensureAudio()) || !this.playing) { this.playing = false; this.emit(); return; }
    const ctx = this.ctx!;
    const bus = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    bus.gain.value = 0.85; bus.connect(comp).connect(ctx.destination);
    this.bus = bus;
    this.startAt = ctx.currentTime + 0.15 - from;
    this.next = this.notes.findIndex((n) => n[0] >= from);
    if (this.next < 0) this.next = this.notes.length;
    const tick = () => {
      const horizon = ctx.currentTime + 0.4;
      while (this.next < this.notes.length && this.startAt + this.notes[this.next][0] <= horizon) this.strike(this.notes[this.next++]);
      if (this.next >= this.notes.length && ctx.currentTime > this.startAt + this.duration + 1) this.stop(true);
    };
    tick();
    this.timer = setInterval(tick, 80);
  },

  strike([t, m, v, d]: Note) {
    const ctx = this.ctx!, bus = this.bus!;
    const i = Math.max(0, Math.min(SAMPLE_NAMES.length - 1, Math.round((m - 21) / 3)));
    const buf = this.samples[i]; if (!buf) return;
    const when = this.startAt + t, off = when + d;
    if (when < ctx.currentTime - 0.05) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; src.playbackRate.value = Math.pow(2, (m - sampleMidi(i)) / 12);
    g.gain.setValueAtTime(Math.pow(v, 1.6) * 0.9, when);
    g.gain.setTargetAtTime(0, off, 0.12);
    src.connect(g).connect(bus);
    src.start(Math.max(when, ctx.currentTime)); src.stop(off + 1.2);
  },

  stop(ended = false) {
    clearInterval(this.timer);
    if (this.ctx && this.bus) { const bus = this.bus; bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); setTimeout(() => bus.disconnect(), 500); }
    if (this.playing && !ended) this.offset = this.position() ?? 0;
    if (ended) this.offset = 0;
    this.bus = null;
    const was = this.playing; this.playing = false;
    if (was) this.emit();
  },
};
