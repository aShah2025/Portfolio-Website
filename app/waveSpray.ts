type Point = { x: number; y: number; strength: number };
type Crest = { x: number; y: number };
export type SpraySample = { x: number; y: number; alpha: number };
export const SPRAY_DURATION = 3.2;

export type WaveSpray = {
  sourceIndex: Uint32Array;
  sourceX: Float32Array;
  sourceY: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  release: Float32Array;
  drag: Float32Array;
  opacity: Float32Array;
  foam: Uint8Array;
  width: number;
  height: number;
  gravity: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const hash = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function packetNoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const tx = ease(x - ix), ty = ease(y - iy);
  const a = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
  const b = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
  return a * (1 - ty) + b * ty;
}

/** The detailed wave is cached separately; only a restrained crest spray moves. */
export function createWaveSpray(points: Point[], width: number, height: number, crest: Crest): WaveSpray {
  const budget = width < 600 ? 700 : width < 1000 ? 900 : 1200;
  const candidates: { index: number; score: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = (p.x - crest.x) / width, dy = (p.y - crest.y) / height;
    if (dx > .16 || dx < -.53 || dy < -.25 || dy > .49 || p.strength < .13) continue;
    const weight = .24 + .76 / (1 + dx * dx / .045 + dy * dy / .10);
    candidates.push({ index: i, score: hash(Math.round(p.x * 2) + 17, Math.round(p.y * 2) + 83) / weight });
  }
  candidates.sort((a, b) => a.score - b.score);
  const count = Math.min(budget, candidates.length);
  const floats = () => new Float32Array(count);
  const spray: WaveSpray = {
    sourceIndex: new Uint32Array(count), sourceX: floats(), sourceY: floats(),
    velocityX: floats(), velocityY: floats(), release: floats(), drag: floats(), opacity: floats(),
    foam: new Uint8Array(count), width, height, gravity: height * .72,
  };
  for (let i = 0; i < count; i++) {
    const source = candidates[i].index, p = points[source];
    const dx = (p.x - crest.x) / width, dy = (p.y - crest.y) / height;
    const packetX = packetNoise(p.x / 32 + 11, p.y / 32 + 29);
    const packetY = packetNoise(p.x / 32 + 67, p.y / 32 + 7);
    const grain = hash(Math.floor(p.x / 7) + 53, Math.floor(p.y / 9) + 97);
    const distance = Math.hypot(dx, dy * .7);
    const release = .20 + Math.min(.46, distance * .56 + Math.max(0, -dx) * .18) + packetX * .035;
    // Match the cached wave's small rightward drift when this glyph leaves it.
    const x = p.x + width * .10 * ease(release / .65);
    const y = p.y;
    const landsAt = 2.65 + packetY * .34 + grain * .055;
    const life = landsAt - release;
    const backSplash = hash(Math.floor(p.x / 42) + 19, Math.floor(p.y / 42) + 31) < .14;
    spray.sourceIndex[i] = source;
    spray.sourceX[i] = x; spray.sourceY[i] = y;
    spray.release[i] = release;
    spray.velocityX[i] = width * (backSplash ? -.10 - packetX * .13 : .53 + packetX * .31);
    spray.velocityY[i] = (height * 1.20 - y - .5 * spray.gravity * life * life) / life;
    spray.drag[i] = .95 + packetX * .35;
    spray.opacity[i] = .48 + packetY * .24;
    spray.foam[i] = 1;
  }
  return spray;
}

/** Allocation-free ballistic droplets. No per-frame trigonometry or exponentials. */
export function sampleWaveSpray(spray: WaveSpray, index: number, seconds: number,
  result: SpraySample = { x: 0, y: 0, alpha: 0 }): SpraySample {
  const age = seconds - spray.release[index];
  if (age <= 0 || seconds >= SPRAY_DURATION) {
    result.x = spray.sourceX[index]; result.y = spray.sourceY[index]; result.alpha = 0;
    return result;
  }
  result.x = spray.sourceX[index] + spray.velocityX[index] * age / (1 + spray.drag[index] * age);
  result.y = spray.sourceY[index] + spray.velocityY[index] * age + .5 * spray.gravity * age * age;
  result.alpha = spray.opacity[index] * ease(age / .10)
    * (1 - ease((result.y - spray.height * .98) / (spray.height * .16)));
  return result;
}
