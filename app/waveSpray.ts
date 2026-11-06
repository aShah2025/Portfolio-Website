type Point = { x: number; y: number; strength: number };
type Crest = { x: number; y: number };
export type SpraySample = { x: number; y: number; alpha: number };
export const SPRAY_DURATION = 4.5;

export type WaveSpray = {
  sourceIndex: Uint32Array;
  sourceX: Float32Array;
  sourceY: Float32Array;
  driftX: Float32Array;
  liftY: Float32Array;
  release: Float32Array;
  launchX: Float32Array;
  launchY: Float32Array;
  coastX: Float32Array;
  jetX: Float32Array;
  velocityY: Float32Array;
  drag: Float32Array;
  eddy: Float32Array;
  phase: Float32Array;
  scatterX: Float32Array;
  scatterY: Float32Array;
  foam: Uint8Array;
  width: number;
  height: number;
  gravity: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const easeVelocity = (t: number, duration: number) => t <= 0 || t >= duration ? 0 : 6 * (t / duration) * (1 - t / duration) / duration;
const launchIntegral = (t: number) => t - .12 * (1 - Math.exp(-t / .12));
const hash = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (((n ^ (n >>> 16)) >>> 0) / 4294967295) * 2 - 1;
};
function packetNoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const tx = ease(x - ix), ty = ease(y - iy);
  const a = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
  const b = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
  return a * (1 - ty) + b * ty;
}

/** Actual artwork glyphs form the moving water; extra lip sheets supply its foam. */
export function createWaveSpray(points: Point[], width: number, height: number, crest: Crest): WaveSpray {
  const candidates: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = (p.x - crest.x) / width, dy = (p.y - crest.y) / height;
    if (dx * dx / .075 + dy * dy / .10 < 1 && p.strength > .15) candidates.push(i);
  }
  const foamCount = candidates.length ? Math.max(0, Math.min(6000, candidates.length * 4, Math.floor(points.length * .42), 30000 - points.length)) : 0;
  const count = points.length + foamCount;
  const floats = () => new Float32Array(count);
  const spray: WaveSpray = {
    sourceIndex: new Uint32Array(count), sourceX: floats(), sourceY: floats(),
    driftX: floats(), liftY: floats(), release: floats(), launchX: floats(), launchY: floats(),
    coastX: floats(), jetX: floats(), velocityY: floats(), drag: floats(), eddy: floats(), phase: floats(),
    scatterX: floats(), scatterY: floats(),
    foam: new Uint8Array(count), width, height, gravity: height * .50,
  };

  for (let i = 0; i < count; i++) {
    const isFoam = i >= points.length;
    const foamIndex = i - points.length;
    const source = isFoam ? candidates[foamIndex % candidates.length] : i;
    const original = points[source];
    const layer = isFoam ? Math.floor(foamIndex / candidates.length) : 0;
    const nx = original.x / width, ny = original.y / height;
    const dx = (original.x - crest.x) / width, dy = (original.y - crest.y) / height;
    const distance = Math.hypot(dx, dy * .75);
    const lip = Math.exp(-(dx * dx / .055 + dy * dy / .085));
    // Foam breaks into nearby 24px packets with finer 9px droplets inside them.
    // These stable, multiscale impulses are applied only once the lip releases.
    const packetX = packetNoise(original.x / 24 + layer * .71, original.y / 24 + 13)
      * .72 + packetNoise(original.x / 9 + 37, original.y / 9 + layer * .53) * .28;
    const packetY = packetNoise(original.x / 24 + 81, original.y / 24 + layer * .83)
      * .72 + packetNoise(original.x / 9 + layer * .61, original.y / 9 + 59) * .28;
    const grainX = hash(Math.floor(original.x / 4) + layer * 19, Math.floor(original.y / 6) + 41);
    const grainY = hash(Math.floor(original.x / 5) + 93, Math.floor(original.y / 7) + layer * 23);
    const release = isFoam ? .70 + Math.min(.24, distance * .65) + layer * .045
      : Math.min(1.4, .58 + distance * .72 + Math.max(0, -dx) * .24);
    const x = isFoam ? crest.x + (original.x - crest.x) * .46 : original.x;
    const y = isFoam ? crest.y + (original.y - crest.y) * .38 + height * .035 : original.y;
    const drift = width * (.075 + lip * .055);
    const lift = -height * .025 * lip;
    const launchX = x + drift * ease(release / .72);
    const launchY = y + lift * ease(release / .60);
    // The lip's upper sheet jets right; its lower returning sheet rolls back left.
    // This broad fan is continuous across source rows, never random directions.
    const fan = .5 + .5 * Math.tanh(dy * 4.5 + dx * .8);
    const drag = isFoam ? 1.3 : 1.8;
    const targetX = width * (1.10 - 1.20 * fan + layer * .02 * Math.sin(nx * 4.2 + ny * 2.7));
    const jet = (isFoam ? drag * (targetX - launchX)
      : width * (.52 + .43 * lip + .10 * Math.sin(nx * 4.2 + ny * 3.1))) * (1 + packetX * .22);
    // Staggered ballistic lives prevent source rows converging into thin ribbons.
    // The same gravity still carries every packet out through the bottom.
    const exitAt = 3.71 + .65 * (.5 + .5 * packetY)
      + .045 * (.5 + .5 * Math.sin(nx * 3.8 + ny * 4.7 + layer * .6));
    const life = exitAt - release;
    const velocityY = (height * 1.22 - launchY - .5 * spray.gravity * life * life) / launchIntegral(life);

    spray.sourceIndex[i] = source;
    spray.sourceX[i] = x; spray.sourceY[i] = y;
    spray.driftX[i] = drift; spray.liftY[i] = lift;
    spray.release[i] = release; spray.launchX[i] = launchX; spray.launchY[i] = launchY;
    spray.coastX[i] = drift * easeVelocity(release, .72);
    spray.jetX[i] = jet; spray.velocityY[i] = velocityY;
    spray.drag[i] = drag;
    spray.eddy[i] = isFoam ? .023 : .009;
    spray.phase[i] = nx * 8.2 + ny * 5.1 + layer * .48;
    spray.scatterX[i] = packetX * 13 + grainX * 5;
    spray.scatterY[i] = packetY * 10 + grainY * 6;
    spray.foam[i] = isFoam ? 1 : 0;
  }
  return spray;
}

/** Seconds since the sideways break begins. Reuse result for allocation-free frames. */
export function sampleWaveSpray(spray: WaveSpray, index: number, seconds: number,
  result: SpraySample = { x: 0, y: 0, alpha: 0 }): SpraySample {
  const t = Math.max(0, seconds), release = spray.release[index];
  if (t >= SPRAY_DURATION) { result.x = spray.launchX[index]; result.y = spray.height * 1.3; result.alpha = 0; return result; }
  if (t < release) {
    result.x = spray.sourceX[index] + spray.driftX[index] * ease(t / .72);
    result.y = spray.sourceY[index] + spray.liftY[index] * ease(t / .60);
    result.alpha = spray.foam[index] ? 0 : 1;
    return result;
  }
  const age = t - release, drag = spray.drag[index];
  const travel = 1 - Math.exp(-drag * age);
  const curl = ease(age / .20) * (1 - ease((age - .8) / 1.3));
  const eddyX = Math.sin(spray.phase[index] + age * 2.6) * spray.width * spray.eddy[index] * curl;
  const eddyY = Math.sin(spray.phase[index] * .73 + age * 2.1) * spray.height * spray.eddy[index] * .6 * curl;
  const separation = (1 - Math.exp(-age * 3.4)) ** 2;
  result.x = spray.launchX[index] + spray.coastX[index] * travel / drag
    + spray.jetX[index] * travel * travel / drag + eddyX + spray.scatterX[index] * separation;
  result.y = spray.launchY[index] + spray.velocityY[index] * launchIntegral(age)
    + .5 * spray.gravity * age * age + eddyY + spray.scatterY[index] * separation;
  // Opacity follows the water over the bottom edge; there is no full-field dissolve.
  result.alpha = (spray.foam[index] ? ease(age / .11) * .84 : 1)
    * (1 - ease((result.y - spray.height * .96) / (spray.height * .20)));
  return result;
}
