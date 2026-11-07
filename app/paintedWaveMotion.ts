export type WaveFrame = { x: number; y: number; width: number; height: number };
export type WavePoint = { u: number; v: number; strength: number };

export const PAINTED_WAVE_DURATION = 2.95;
export const PAINTED_WAVE_REVEAL = 2.32;

type StillGlyph = { kind: "still"; u: number; v: number; sweep: number };
type WaterGlyph = { kind: "water"; u: number; v: number; release: number; speed: number; packet: number };
type CrestGlyph = {
  kind: "crest";
  u: number;
  v: number;
  release: number;
  drift: number;
  fall: number;
  impact: number;
  hitU: number;
  hitV: number;
  impactX: number;
  impactY: number;
  washX: number;
  washY: number;
  gravity: number;
  jet: boolean;
};

export type PaintedWaveMotion = {
  count: number;
  frame: WaveFrame;
  viewportWidth: number;
  viewportHeight: number;
  glyphs: (CrestGlyph | WaterGlyph | StillGlyph)[];
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function hash(x: number, y: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function parcel(u: number, v: number) {
  const x = 22 * u + 9;
  const y = 16 * v + 13;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const a = smooth(0, 1, x - ix);
  const b = smooth(0, 1, y - iy);
  const top = hash(ix, iy) * (1 - a) + hash(ix + 1, iy) * a;
  const bottom = hash(ix, iy + 1) * (1 - a) + hash(ix + 1, iy + 1) * a;
  return top * (1 - b) + bottom * b;
}

function advance(age: number) {
  return age * age / (age + .10);
}

function crestGlyph({ u, v, strength }: WavePoint, weight: number, packet: number): CrestGlyph {
  const front = smooth(.34, .565, u);
  const foot = smooth(.48, .67, v);
  // Delay the rear of the wave while neighbouring rows of its face fall together.
  const release = .025 + .30 * (1 - front) + .035 * foot + .025 * packet;
  const drift = (.22 + .065 * front - .03 * foot) * (.72 + .28 * weight);
  const fall = (1.57 + .12 * packet) * (.87 + .13 * weight);

  // Find where the falling sheet reaches the uneven water below the curl.
  let low = Math.max(0, .55 + .045 * (1 - front) + .045 * foot - release);
  let high = 1.48 - release;
  for (let step = 0; step < 12; step++) {
    const age = (low + high) * .5;
    const x = u + drift * advance(age);
    const surface = .668 + .044 * Math.sin((x - .55) * 13) + .045 * foot + .05 * (packet - .5);
    if (v + .5 * fall * age * age < surface) low = age;
    else high = age;
  }
  const age = (low + high) * .5;
  const grain = hash(Math.round(u * 9719), Math.round(v * 8971));
  const jet = grain < (.055 + .16 * packet + .09 * (1 - strength)) * (1 - .82 * foot);
  return {
    kind: "crest", u, v, release, drift, fall,
    impact: release + age,
    hitU: u + drift * advance(age),
    hitV: v + .5 * fall * age * age,
    impactX: drift * age * (age + .20) / ((age + .10) ** 2),
    impactY: fall * age,
    washX: jet && packet < .24 ? -.20 - .23 * grain : .28 + .44 * packet + .10 * front,
    washY: jet ? -.54 - .29 * packet : .065 + .18 * packet + .11 * foot,
    gravity: jet ? 1.42 + .24 * packet : .28 + .23 * packet,
    jet,
  };
}

export function createPaintedWaveMotion(
  points: readonly WavePoint[], frame: WaveFrame, viewportWidth: number, viewportHeight: number,
): PaintedWaveMotion {
  const glyphs = points.map((point): CrestGlyph | WaterGlyph | StillGlyph => {
    const { u, v } = point;
    const packet = parcel(u, v);
    const signature = u < .12 && v < .32;
    const fuji = u > .55 && u < .70 && v > .60 && v < .72;
    const crest = smooth(.085, .235, u) * (1 - smooth(.60, .635, u)) * (1 - smooth(.50, .68, v));
    if (!signature && !fuji && crest > .15) return crestGlyph(point, crest, packet);

    const waterline = .72 - .18 * (1 - smooth(.38, .55, u)) - .28 * smooth(.80, .975, u);
    if (!fuji && v > waterline) {
      return {
        kind: "water", u, v, packet,
        release: .79 + .82 * Math.max(0, u - .48) + .12 * smooth(.82, 1, v) + .07 * packet,
        speed: .19 + .33 * packet,
      };
    }
    const sweep = fuji ? 1.12 + .8 * Math.max(0, u - .55) : 1.53 + .32 * u + .22 * (1 - v);
    return { kind: "still", u, v, sweep };
  });
  return { count: glyphs.length, frame, viewportWidth, viewportHeight, glyphs };
}

/** Move the original glyphs through the break, then redirect their momentum into foam. */
export function writePaintedWaveMotion(motion: PaintedWaveMotion, seconds: number, output: Float32Array) {
  const { frame, viewportWidth, viewportHeight, glyphs } = motion;
  const tail = 1 - smooth(2.55, PAINTED_WAVE_DURATION, seconds);
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    let { u, v } = glyph;
    let opacity = 1;
    let foam = 0;
    if (glyph.kind === "crest") {
      if (seconds <= glyph.impact) {
        const age = Math.max(0, seconds - glyph.release);
        u += glyph.drift * advance(age);
        v += .5 * glyph.fall * age * age;
      } else {
        const age = seconds - glyph.impact;
        const transition = glyph.jet ? .044 : .065;
        const incoming = transition * (1 - Math.exp(-age / transition));
        const outgoing = age - incoming;
        u = glyph.hitU + glyph.impactX * incoming + glyph.washX * outgoing;
        v = glyph.hitV + glyph.impactY * incoming + glyph.washY * outgoing + .5 * glyph.gravity * outgoing * outgoing;
        foam = (glyph.jet ? 1 : .91) * smooth(0, .11, age);
        opacity = 1 - smooth(glyph.jet ? .92 : 1.13, glyph.jet ? 1.50 : 1.75, age);
      }
    } else if (glyph.kind === "water") {
      const age = Math.max(0, seconds - glyph.release);
      const flow = advance(age);
      // The passing front lifts the foreground slightly before it drains away.
      const lift = .018 + .027 * glyph.packet;
      v += (.075 + .055 * glyph.packet) * flow + .20 * age * age;
      v -= lift * smooth(0, .18, age) * (1 - smooth(.18, .62, age));
      u += glyph.speed * flow;
      foam = .54 * smooth(0, .38, age);
      opacity = 1 - smooth(1.12, 1.66, age);
    } else {
      opacity = 1 - smooth(glyph.sweep, glyph.sweep + .48, seconds);
    }

    const x = frame.x + u * frame.width;
    const y = frame.y + v * frame.height;
    const offset = i * 4;
    output[offset] = x;
    output[offset + 1] = y;
    output[offset + 2] = seconds > 0 && (x > viewportWidth + 16 || y > viewportHeight + 16) ? 0 : opacity * tail;
    output[offset + 3] = foam;
  }
}
