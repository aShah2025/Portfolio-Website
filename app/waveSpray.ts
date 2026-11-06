type Point = { x: number; y: number; strength: number };
type Frame = { x: number; y: number; width: number; height: number };
export const SPRAY_DURATION = 3.65;
const FOLD_DURATION = 1.72;
const FOLD_STEPS = 32;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const hash = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), tx = ease(x - ix), ty = ease(y - iy);
  const a = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
  const b = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
  return a * (1 - ty) + b * ty;
}

export type WaveCrash = {
  count: number;
  fold: Float32Array;
  impact: Float32Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  drag: Float32Array;
  height: number;
  gravity: number;
};

/** One continuous displacement field bends the lip around the wave's foot. */
function foldPoint(p: Point, time: number, frame: Frame, result: { x: number; y: number }) {
  const top = 1 - ease((p.y - frame.y - frame.height * .30) / (frame.height * .58));
  const advance = ease(time / 1.18);
  const angle = .92 * advance * Math.pow(top, 1.3);
  const px = frame.x + frame.width * .30, py = frame.y + frame.height * .78;
  const dx = p.x - px, dy = p.y - py;
  const s = Math.sin(angle), c = Math.cos(angle);
  result.x = px + dx * c - dy * s + frame.width * .08 * advance * (.25 + .75 * top);
  result.y = py + dx * s + dy * c + frame.height * .90 * Math.pow(Math.max(0, time - .72), 2);
}

/** Every letter stays in the connected wave until it reaches the impact surface. */
export function createWaveCrash(points: Point[], width: number, height: number, frame: Frame): WaveCrash {
  const count = points.length, floats = () => new Float32Array(count);
  const crash: WaveCrash = { count, fold: new Float32Array(count * FOLD_STEPS * 2), impact: floats(),
    x: floats(), y: floats(), vx: floats(), vy: floats(), drag: floats(), height, gravity: height * 1.28 };
  const surface = Math.min(height * .78, frame.y + frame.height * .80);
  const pos = { x: 0, y: 0 };
  for (let i = 0; i < count; i++) {
    const p = points[i];
    const packet = noise(p.x / 40 + 17, p.y / 40 + 83);
    const spread = noise(p.x / 40 + 59, p.y / 40 + 11);
    const floor = surface + frame.height * (.055 * (p.x / width - .5) + .035 * (packet - .5));
    const top = 1 - ease((p.y - frame.y - frame.height * .30) / (frame.height * .58));
    let low = .94 + packet * .055, high = FOLD_DURATION;
    // Locate the collision on the continuous field, rather than emitting an
    // unrelated cloud while the source print dissolves.
    foldPoint(p, low, frame, pos);
    if (pos.y < floor) {
      for (let step = 0; step < 12; step++) {
        const mid = (low + high) * .5;
        foldPoint(p, mid, frame, pos);
        if (pos.y < floor) low = mid; else high = mid;
      }
    } else high = low;
    const impact = (low + high) * .5;
    crash.impact[i] = impact;
    foldPoint(p, impact, frame, pos);
    crash.x[i] = pos.x; crash.y[i] = pos.y;
    const backwash = packet < .40;
    const jet = top * (.38 + .62 * ease((spread - .32) / .52));
    crash.vx[i] = width * (backwash ? -.42 - spread * .66 : .40 + packet * .75);
    crash.vy[i] = -height * (.10 + .24 * packet + .89 * jet);
    crash.drag[i] = .62 + packet * .44;
    for (let step = 0; step < FOLD_STEPS; step++) {
      foldPoint(p, step / (FOLD_STEPS - 1) * FOLD_DURATION, frame, pos);
      const offset = (step * count + i) * 2;
      crash.fold[offset] = pos.x; crash.fold[offset + 1] = pos.y;
    }
  }
  return crash;
}

/** Writes one GPU batch; the fine wave never needs thousands of canvas draws. */
export function writeWaveCrash(crash: WaveCrash, seconds: number, output: Float32Array) {
  const frame = clamp(seconds / FOLD_DURATION) * (FOLD_STEPS - 1);
  const a = Math.min(FOLD_STEPS - 2, Math.floor(frame)), mix = frame - a;
  const stride = crash.count * 2, start = a * stride, end = start + stride;
  for (let i = 0; i < crash.count; i++) {
    const offset = i * 4, age = seconds - crash.impact[i];
    let x: number, y: number;
    if (age <= 0) {
      const index = i * 2;
      x = crash.fold[start + index] * (1 - mix) + crash.fold[end + index] * mix;
      y = crash.fold[start + index + 1] * (1 - mix) + crash.fold[end + index + 1] * mix;
      output[offset + 3] = 0;
    } else {
      x = crash.x[i] + crash.vx[i] * age / (1 + crash.drag[i] * age);
      y = crash.y[i] + crash.vy[i] * age + .5 * crash.gravity * age * age;
      output[offset + 3] = ease(age / .12);
    }
    output[offset] = x; output[offset + 1] = y;
    // Clearance comes from gravity carrying the actual wave off the page.
    output[offset + 2] = y > crash.height + 12 || seconds >= SPRAY_DURATION ? 0 : 1;
  }
}
