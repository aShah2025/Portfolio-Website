type Crest = { x: number; y: number };
export type FoamSample = { cover: number; ink: number };
export type FoamWash = {
  width: number;
  height: number;
  p: number;
  crestX: number;
  crestY: number;
  headX: number;
  headY: number;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  plume: number;
  full: number;
  drain: number;
  flow: number;
  time: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, n: number) => ease((n - a) / (b - a));

// Coherent value noise: stable in space, so detail flows with the water rather
// than changing character positions or producing a new field of random spray.
const hash = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const tx = fx * fx * (3 - 2 * fx), ty = fy * fy * (3 - 2 * fy);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), tx),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), tx), ty);
}

function foamCells(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let nearest = Infinity, next = Infinity;
  for (let row = -1; row <= 1; row++) for (let col = -1; col <= 1; col++) {
    const gx = ix + col, gy = iy + row;
    const dx = gx + .08 + hash(gx, gy) * .84 - x;
    const dy = gy + .08 + hash(gx + 71, gy - 113) * .84 - y;
    const distance = dx * dx + dy * dy;
    if (distance < nearest) { next = nearest; nearest = distance; }
    else if (distance < next) next = distance;
  }
  // The gap between the nearest bubbles makes a connected, irregular network.
  return 1 - smooth(.022, .17, Math.sqrt(next) - Math.sqrt(nearest));
}

/** Prepare once per frame. All positions are normalized to the viewport. */
export function prepareFoamWash(width: number, height: number, progress: number, crest?: Crest): FoamWash {
  const p = clamp(progress);
  const crestX = (crest?.x ?? width * .5) / width;
  const crestY = (crest?.y ?? height * .3) / height;
  const impactX = Math.min(.78, Math.max(.42, crestX + .14));
  const impactY = Math.max(.74, Math.min(.84, crestY + .48));
  const fall = clamp(p / .34);
  const headX = mix(crestX, impactX, fall * .55 + fall * fall * .45);
  const headY = mix(crestY, impactY, fall * fall);
  const spread = ease((p - .18) / .47);
  const drain = ease((p - .75) / .25);
  return {
    width, height, p, crestX, crestY, headX, headY,
    centerX: mix(headX, .5, spread), centerY: mix(headY, .75, spread),
    radiusX: .006 + 1.45 * spread,
    radiusY: .006 + 1.27 * spread,
    plume: ease(p / .045) * (1 - ease((p - .43) / .15)),
    full: ease((p - .58) / .07), drain,
    flow: .14 * ease(p / .34) - .62 * ease((p - .26) / .46) + 1.05 * drain,
    time: p * 3.6,
  };
}

/** The same connected foam surface supplies both the image wipe and its ink. */
export function sampleFoamWash(field: FoamWash, x: number, y: number, result: FoamSample = { cover: 0, ink: 0 }): FoamSample {
  const { p } = field;
  if (p <= 0 || p >= 1) { result.cover = 0; result.ink = 0; return result; }
  const u = x / field.width, v = y / field.height;
  const advectedY = v - field.flow;
  const bend = noise(u * 3.4 + 9.2, advectedY * 3.1 - field.time * .12) - .5;
  const ux = u + bend * .075;
  const vy = advectedY + Math.sin(u * 5.3 + field.time * .45) * .036;
  const large = noise(ux * 7.1 + field.time * .08, vy * 6.4 + 3.7);

  // A falling curtain remains joined to its head. The spreading body is born
  // at that moving head, so there is no switch between a falling blob and sea.
  const span = field.headY - field.crestY;
  const along = clamp((v - field.crestY) / Math.max(.006, span));
  const axisX = mix(field.crestX, field.headX, along)
    + Math.sin(along * Math.PI) * .065 * ease(p / .34);
  const curtainWidth = (.05 + .065 * along * along + .018 * large) * ease(p / .07);
  const curtain = (1 - smooth(curtainWidth * .55, curtainWidth + .022, Math.abs(u - axisX)))
    * smooth(field.crestY - .025, field.crestY + .012, v)
    * (1 - smooth(field.headY, field.headY + .045, v)) * field.plume;
  const headRadius = .03 + .10 * ease(p / .34);
  const headDistance = Math.hypot((u - field.headX) / headRadius, (v - field.headY) / (headRadius * .65));
  const head = (1 - smooth(.6, 1.18, headDistance)) * field.plume;

  const dx = (u - field.centerX) / field.radiusX;
  const dy = (v - field.centerY) / field.radiusY;
  const signed = 1 - Math.sqrt(dx * dx + dy * dy);
  const billow = (large - .5) * .10 + Math.sin(u * 12 + field.time) * .018;
  const body = smooth(-.055, .055, signed + billow) * ease((p - .18) / .065);
  let cover = Math.max(curtain, head, body);
  cover = mix(cover, 1, field.full);

  // The upper edge retreats down the screen as one soft scalloped waterline.
  // Its last position is below every pixel, earning the final clear geometrically.
  const drainFront = mix(-.16, 1.18, field.drain)
    + (noise(u * 4.1 + 5, field.time * .24) - .5) * .085;
  cover *= smooth(drainFront - .045, drainFront + .045, v);

  // Rotate a physically square field, then bend its coordinates before finding
  // bubble boundaries. The strong smooth warp removes straight lattice edges;
  // unequal seed positions keep the connected foam cells varied in size.
  const sx = u * field.width / field.height;
  const rx = sx * .7986 + advectedY * .6018;
  const ry = advectedY * .7986 - sx * .6018;
  const warpX = bend * 1.8 + Math.sin(ry * 5.1 + field.time * .18) * .38;
  const warpY = (large - .5) * 1.7 + Math.sin(rx * 4.6 - field.time * .13) * .34;
  const broadWeb = foamCells(rx * 10.7 + warpX, ry * 10.7 + warpY);
  const detail = noise(rx * 31.3 + warpX * 2.3 + large,
    ry * 24.7 + warpY * 2.8 + bend);
  const fineWeb = 1 - smooth(.018, .105, Math.abs(detail - .49));
  const rim = 1 - smooth(.015, .16, Math.abs(signed + billow));
  const texture = .065 + detail * .075 + broadWeb * .43 + fineWeb * .15 + rim * .12;
  const ink = clamp(texture * cover * (1 - field.drain * .28));
  result.cover = clamp(cover); result.ink = ink;
  return result;
}

/** Convenience form for occasional samples; prepare once for a rendered grid. */
export function getFoamWash(x: number, y: number, width: number, height: number, progress: number, crest?: Crest) {
  return sampleFoamWash(prepareFoamWash(width, height, progress, crest), x, y);
}
