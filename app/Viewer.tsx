"use client";

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { pianoPlayer, type Note } from "./pianoPlayer";
import { makeGlyphPass } from "./glyphPass";

type Scene = "printer" | "wing" | "desk" | "mac" | "flight" | "piano" | "car";
type Frame = (camera: THREE_NS.PerspectiveCamera, p: number, aspect: number) => void;
type T = typeof THREE_NS;

const TAU = Math.PI * 2;

function printerScene(THREE: T, RoundedBoxGeometry: new (w: number, h: number, d: number, seg: number, r: number) => THREE_NS.BufferGeometry, ParametricGeometry: new (fn: (u: number, v: number, t: THREE_NS.Vector3) => void, s: number, st: number) => THREE_NS.BufferGeometry, scene: THREE_NS.Scene, renderer: THREE_NS.WebGLRenderer) {
  const mat = (color: string, rough = 0.55, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const black = mat("#1c1d20", 0.55), graphite = mat("#2b2d31", 0.5), white = mat("#d8d9da", 0.45), alu = mat("#9ea3a8", 0.35, 1), brass = mat("#b08d57", 0.3, 1), pei = mat("#2f2a24", 0.85);
  const screenMat = new THREE.MeshStandardMaterial({ color: "#101214", emissive: "#6f8a8f", emissiveIntensity: 0.35, roughness: 0.3 });
  const box = (w: number, h: number, d: number, m: THREE_NS.Material, r = 0.25) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); o.castShadow = o.receiveShadow = true; return o; };
  const cyl = (rt: number, rb: number, h: number, m: THREE_NS.Material, seg = 32) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.castShadow = o.receiveShadow = true; return o; };
  const root = new THREE.Group();
  scene.add(root);

  // base with front panel and screen
  const base = box(42, 5, 40, black, 0.8); base.position.y = 2.5; root.add(base);
  const lip = box(42.2, 0.6, 40.2, graphite, 0.2); lip.position.y = 5; root.add(lip);
  const screen = box(6, 3, 0.3, screenMat, 0.1); screen.position.set(13, 2.6, 20.1); root.add(screen);
  const knob = cyl(0.9, 0.9, 0.5, graphite); knob.rotation.x = Math.PI / 2; knob.position.set(7.5, 2.6, 20.2); root.add(knob);
  for (const x of [-17, 17]) for (const z of [-16, 16]) { const f = cyl(1.3, 1.5, 0.8, graphite); f.position.set(x, -0.3, z); root.add(f); }

  // Y rails + moving bed
  for (const x of [-9, 9]) { const rail = cyl(0.35, 0.35, 34, alu, 16); rail.rotation.x = Math.PI / 2; rail.position.set(x, 5.7, 0); root.add(rail); }
  const bed = new THREE.Group(); bed.position.y = 6.2; root.add(bed);
  const carriage = box(27, 1.2, 27, graphite, 0.3); carriage.position.y = 0.6; bed.add(carriage);
  const heater = box(25.6, 0.7, 25.6, black, 0.1); heater.position.y = 1.55; bed.add(heater);
  const plate = box(25.2, 0.35, 25.2, pei, 0.05); plate.position.y = 2.1; bed.add(plate);
  const topY = 2.3;

  // left tower with dual lead screws
  const tower = box(4.2, 38, 6, white, 0.7); tower.position.set(-21.5, 21, -12); root.add(tower);
  const towerCap = box(4.6, 1.2, 6.4, graphite, 0.3); towerCap.position.set(-21.5, 40.2, -12); root.add(towerCap);
  for (const z of [-14.2, -9.8]) { const lead = cyl(0.3, 0.3, 36, alu, 12); lead.position.set(-18.9, 21, z); root.add(lead); }
  const zRod = cyl(0.35, 0.35, 36, alu, 12); zRod.position.set(-18.9, 21, -12); root.add(zRod);

  // spool + holder on top-left
  const arm = box(2, 1.2, 9, graphite, 0.3); arm.position.set(-21.5, 41.4, -6); root.add(arm);
  const spool = new THREE.Group(); spool.position.set(-21.5, 46, -4.5); spool.rotation.z = Math.PI / 2; root.add(spool);
  const flangeM = new THREE.MeshStandardMaterial({ color: "#cfd2d4", roughness: 0.2, transparent: true, opacity: 0.55 });
  for (const y of [-3.6, 3.6]) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.4, 48), flangeM); fl.position.y = y; spool.add(fl); }
  const filament = cyl(7.2, 7.2, 6.8, mat("#a96a52", 0.6), 48); spool.add(filament);
  const hub = cyl(2.4, 2.4, 7.4, mat("#e6e6e4", 0.5)); spool.add(hub);

  // gantry (rides up with z), toolhead rides on x rods
  const gantry = new THREE.Group(); gantry.position.set(0, 10, -4.8); root.add(gantry);
  const beam = box(46, 3, 4.2, white, 0.6); beam.position.set(-0.5, 0, 0); gantry.add(beam);
  for (const y of [-0.6, 0.9]) { const rod = cyl(0.3, 0.3, 40, alu, 12); rod.rotation.z = Math.PI / 2; rod.position.set(1, y, 2.6); gantry.add(rod); }
  const bracket = box(4.4, 3.4, 8, white, 0.6); bracket.position.set(-21.5, 0, -3.6); gantry.add(bracket);
  const head = new THREE.Group(); head.position.z = 3; gantry.add(head);
  const hb = box(6.6, 6.5, 6, graphite, 0.5); hb.position.set(0, -0.2, 1.8); head.add(hb);
  const hc = box(7, 1.4, 6.4, black, 0.3); hc.position.set(0, 2.3, 1.6); head.add(hc);
  const duct = box(3.4, 2.8, 3.4, white, 0.5); duct.position.set(0, -3.4, 2.2); head.add(duct);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 20), brass); nozzle.rotation.x = Math.PI; nozzle.position.set(0, -5.4, 1.8); nozzle.castShadow = true; head.add(nozzle);
  const noz = (): number => -5.4 - 0.8; // nozzle tip relative to head origin

  // print: a rippled twisting vase revealed by a rising clip plane
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const H = 15, R = 5.2;
  const vase = new THREE.Mesh(
    new ParametricGeometry((u: number, v: number, t: THREE_NS.Vector3) => {
      const y = u * H, a = v * TAU;
      const prof = 1 + 0.35 * Math.sin(u * Math.PI * 1.1) + 0.12 * Math.sin(a * 8 + u * 9);
      t.set(Math.cos(a) * R * prof * 0.72, y, Math.sin(a) * R * prof * 0.72);
    }, 220, 160),
    new THREE.MeshStandardMaterial({ color: "#b0725a", roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: [clip] }),
  );
  vase.castShadow = true;
  const printGroup = new THREE.Group(); printGroup.position.y = topY; bed.add(printGroup); printGroup.add(vase);

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
  renderer.localClippingEnabled = true;

  root.position.y = -12;
  const CYCLE = 18, PRINT = 14, SPIN = 2.2;
  let time = 0;
  const update = (dt: number, still: boolean) => {
    time = still ? PRINT : (time + dt) % CYCLE;
    const p = Math.min(time / PRINT, 1);
    const h = Math.max(p * H, 0.01);
    clip.constant = h;
    const worldTop = 6.2 + topY + h; // bed local y + surface + print height (root space)
    gantry.position.y = worldTop + 6.8;
    const prof = 1 + 0.35 * Math.sin(p * Math.PI * 1.1);
    const r = R * prof * 0.72;
    const th = still ? 0.6 : (time / SPIN) * TAU;
    head.position.x = r * Math.cos(th);
    bed.position.z = -r * Math.sin(th);
    head.position.y = 0; // nozzle follows gantry
    spool.rotation.y = still ? 0 : -time * 0.3;
    void noz;
  };
  update(0, false);
  return { update, target: new THREE.Vector3(0, 14, 0), camera: new THREE.Vector3(78, 46, 92) };
}

// NACA 4-digit airfoil as a closed loop of [chord, thickness] points, chord 0..1: upper surface then lower
function naca(t: number, m: number, p: number, n: number) {
  const up: [number, number][] = [], lo: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos((i / n) * Math.PI)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = m === 0 ? 0 : x < p ? (m / (p * p)) * (2 * p * x - x * x) : (m / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * x - x * x);
    const dyc = m === 0 ? 0 : x < p ? ((2 * m) / (p * p)) * (p - x) : ((2 * m) / ((1 - p) ** 2)) * (p - x);
    const th = Math.atan(dyc);
    up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]); lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return [...up, ...lo.reverse().slice(1)];
}

function wingScene(THREE: T, scene: THREE_NS.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const pts = naca(0.12, 0.04, 0.4, 60).map(([x, y]) => new THREE.Vector2((x - 0.4) * 22, y * 22));
  const shape = new THREE.Shape(pts);
  const wingGeo = new THREE.ExtrudeGeometry(shape, { depth: 30, bevelEnabled: false, curveSegments: 4 });
  wingGeo.translate(0, 0, -15);
  const wingMat = new THREE.MeshStandardMaterial({ color: "#c9ccd0", roughness: 0.32, metalness: 0.25 });
  const wing = new THREE.Mesh(wingGeo, wingMat); wing.castShadow = true; wing.receiveShadow = true;
  const holder = new THREE.Group(); holder.rotation.z = THREE.MathUtils.degToRad(-8); holder.add(wing); root.add(holder);
  for (const z of [-15.4, 15.4]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(17, 5, 0.5), new THREE.MeshStandardMaterial({ color: "#3b4048", roughness: 0.5 })); ep.position.set(0, 0.5, z); ep.castShadow = true; holder.add(ep); }

  // flow particles bending around the wing
  const N = 520, pos = new Float32Array(N * 3), seed: { y: number; z: number; s: number; x0: number }[] = [];
  for (let i = 0; i < N; i++) seed.push({ y: (Math.random() - 0.5) * 18, z: (Math.random() - 0.5) * 30, s: 0.6 + Math.random() * 0.7, x0: Math.random() * 70 - 35 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pm = new THREE.PointsMaterial({ color: "#a9b4bd", size: 0.28, transparent: true, opacity: 0.75, sizeAttenuation: true });
  const points = new THREE.Points(geo, pm); root.add(points);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.25 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -11; ground.receiveShadow = true; scene.add(ground);
  let time = 0;
  const update = (dt: number, still: boolean) => {
    time += still ? 0 : dt;
    for (let i = 0; i < N; i++) {
      const s = seed[i];
      const x = ((s.x0 + time * 11 * s.s + 35) % 70) - 35;
      const near = Math.exp(-(x * x) / 60) ;
      const side = s.y >= 0 ? 1 : -1;
      const y = s.y + side * near * (side > 0 ? 2.6 : -0.6) * Math.exp(-Math.abs(s.y) / 5);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = s.z;
    }
    geo.attributes.position.needsUpdate = true;
    holder.rotation.z = THREE.MathUtils.degToRad(-8 + (still ? 0 : Math.sin(time * 0.6) * 4));
  };
  update(0, false);
  return { update, target: new THREE.Vector3(0, 0, 0), camera: new THREE.Vector3(44, 20, 62) };
}

function pianoScene(THREE: T, scene: THREE_NS.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const dot = document.createElement("canvas"); dot.width = dot.height = 32;
  const dc = dot.getContext("2d")!; dc.fillStyle = "#fff"; dc.beginPath(); dc.arc(16, 16, 14, 0, Math.PI * 2); dc.fill();
  const sprite = new THREE.CanvasTexture(dot);
  const mat = (size: number) => new THREE.PointsMaterial({ size, map: sprite, alphaTest: 0.4, vertexColors: true, sizeAttenuation: true });

  // concert-grand plan view, Steinway proportions: x across the keyboard (bass at -x), d = depth back from the keys (scene z = -d)
  const plan = new THREE.Shape();
  plan.moveTo(-7.5, 0); plan.lineTo(7.5, 0); plan.lineTo(7.5, 4.5);
  plan.bezierCurveTo(7.5, 9.5, 1.8, 9.8, 1.1, 15.2);
  plan.bezierCurveTo(0.7, 19.4, -1.1, 21.6, -4.1, 21.6);
  plan.bezierCurveTo(-6.6, 21.6, -7.5, 20, -7.5, 17.4);
  plan.lineTo(-7.5, 0);
  const outline = plan.getSpacedPoints(560).map((v) => [v.x, v.y]);
  const insideOf = (poly: number[][], x: number, d: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[j];
      if ((ay > d) !== (by > d) && x < ((bx - ax) * (d - ay)) / (by - ay) + ax) c = !c;
    }
    return c;
  };
  const inset = (dist: number) => outline.map(([x, d], i) => {
    const [px, pd] = outline[(i + outline.length - 2) % outline.length], [nx, nd] = outline[(i + 2) % outline.length];
    let tx = nx - px, td = nd - pd; const l = Math.hypot(tx, td) || 1; tx /= l; td /= l;
    const n = insideOf(outline, x - td * 0.05, d + tx * 0.05) ? [-td, tx] : [td, -tx];
    return [x + n[0] * dist, d + n[1] * dist];
  });
  const inner = inset(0.32), plateEdge = inset(0.55), strEnd = inset(0.75), bridgeLine = inset(1.5), plateBand = inset(1.25);

  const pos: number[] = [], col: number[] = [];
  const C = (hex: string, k = 1) => { const c = new THREE.Color(hex); return [c.r * k, c.g * k, c.b * k]; };
  const CASE = C("#e8e6df"), CASE_DIM = C("#e8e6df", 0.5), GOLD = C("#d4ab55"), GOLD_DIM = C("#d4ab55", 0.62), STEEL = C("#dfe3e8", 0.85), COPPER = C("#d98a50", 1),
    WOOD = C("#a77a4c", 0.85), BOARD = C("#a07a4c", 0.45), FELT = C("#b4bac0", 0.6), BRASS = C("#e2bb63");
  const add = (x: number, y: number, z: number, c: number[]) => { pos.push(x, y, z); col.push(c[0], c[1], c[2]); };
  const line = (a: number[], b: number[], step: number, c: number[]) => {
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (let i = 0; i <= n; i++) { const t = i / n; add(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, c); }
  };
  const ring = (cx: number, y: number, cz: number, r: number, step: number, c: number[]) => { for (let a = 0; a < Math.PI * 2; a += step / r) add(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, c); };
  const RIM_LO = 6, RIM_HI = 8.6;

  // rim: outer wall, a heavier top molding, the inner wall and the belly edge
  for (const [x, d] of outline) for (let y = RIM_LO; y <= RIM_HI + 0.01; y += 0.18) add(x, y, -d, y < RIM_LO + 0.1 || y > RIM_HI - 0.1 ? CASE : CASE_DIM);
  for (const [x, d] of outline) add(x, RIM_HI + 0.12, -d, CASE);
  for (const [x, d] of inner) { add(x, RIM_HI, -d, CASE); for (let y = 7.2; y < RIM_HI; y += 0.35) add(x, y, -d, CASE_DIM); }
  for (const [x, d] of inset(0.6)) add(x, RIM_LO, -d, CASE_DIM);

  // soundboard with ribs running across the grain
  for (let x = -7.2; x <= 7.2; x += 0.34) for (let d = 1; d <= 21.2; d += 0.34) if (insideOf(inner, x, d)) add(x, 6.95, -d, BOARD);
  for (let r = -16; r <= 22; r += 2.2) for (let t = 0; t <= 26; t += 0.16) { const x = -7.5 + t * 0.62, d = r + t * 0.78; if (insideOf(inner, x, d) && d > 4) add(x, 6.98, -d, C("#8a6a45", 0.55)); }

  // bridges: the long treble bridge follows the bentside, the short bass bridge sits near the tail
  for (const [x, d] of bridgeLine) if (x > -3.3 && d > 3.6 && d < 20.6) { add(x, 7.15, -d, WOOD); add(x, 7.35, -d, WOOD); }
  line([-6.6, 7.35, -15.4], [-2.6, 7.35, -18.9], 0.1, WOOD); line([-6.6, 7.15, -15.4], [-2.6, 7.15, -18.9], 0.1, WOOD);

  // cast-iron plate: gold rim band, front capo with round holes, and the struts between the openings
  const PY = 7.6;
  for (const [x, d] of plateEdge) add(x, PY, -d, GOLD);
  for (const [x, d] of plateBand) if (d > 3.8) add(x, PY, -d, GOLD);
  const holes = [-5.6, -3.2, -0.8, 1.6, 4.0, 6.2].map((x) => [x, 3.1]);
  for (const [hx, hd] of holes) ring(hx, PY + 0.02, -hd, 0.42, 0.07, GOLD);
  const struts = [[-4.6, 3.8, -6.6, 16.6], [-2.1, 3.8, -3.6, 20.2], [1.0, 3.8, -0.4, 15.6], [4.4, 3.8, 3.6, 9.8]];
  for (let x = -7.2; x <= 7.2; x += 0.16) for (let d = 0.5; d <= 21.4; d += 0.16) {
    if (!insideOf(plateEdge, x, d)) continue;
    const band = !insideOf(plateBand, x, d) || d < 3.8;
    const strut = struts.some(([x0, d0, x1, d1]) => { const t = Math.min(1, Math.max(0, ((x - x0) * (x1 - x0) + (d - d0) * (d1 - d0)) / ((x1 - x0) ** 2 + (d1 - d0) ** 2))); return Math.hypot(x - (x0 + (x1 - x0) * t), d - (d0 + (d1 - d0) * t)) < 0.3; });
    const hole = holes.some(([hx, hd]) => Math.hypot(x - hx, d - hd) < 0.42);
    if ((band || strut) && !hole) add(x, PY, -d, GOLD_DIM);
  }
  for (const [x0, d0, x1, d1] of struts) for (const o of [-0.3, 0.3]) line([x0 + o, PY + 0.02, -d0], [x1 + o, PY + 0.02, -d1], 0.12, GOLD);

  // tuning pins in staggered rows across the pinblock
  for (let row = 0; row < 3; row++) for (let x = -7.0 + row * 0.08; x <= 7.0; x += 0.24) for (let h = 0; h < 3; h++) add(x, PY + 0.08 + h * 0.1, -(0.9 + row * 0.35), STEEL);

  // strings: treble and tenor run straight back; copper-wound bass strings cross over them toward the tail
  for (let x = -3.6; x <= 7.0; x += 0.12) for (let d = 1.6; d < 22; d += 0.13) { const sx = x - (d - 1.6) * 0.035; if (!insideOf(strEnd, sx, d)) break; add(sx, PY + 0.25, -d, STEEL); }
  for (let x = -7.0; x <= -3.9; x += 0.15) for (let t = 0; t < 30; t += 0.13) { const sx = x + t * 0.27, d = 1.6 + t * 0.96; if (t > 2 && !insideOf(strEnd, sx, d)) break; add(sx, PY + 0.45, -d, COPPER); }

  // dampers: felt blocks on wires over the strings, up to the top two octaves
  for (let x = -6.9; x <= 3.8; x += 0.22) { for (let y = PY + 0.35; y <= PY + 0.75; y += 0.1) { add(x, y, -4.4, FELT); add(x, y, -4.65, FELT); } add(x, PY + 0.8, -4.52, FELT); }
  line([-7, PY + 0.95, -4.52], [3.9, PY + 0.95, -4.52], 0.1, CASE_DIM);

  // lid on its hinges along the straight bass side, with the front flap fold and prop stick
  const lid = new THREE.Group(); lid.position.set(-7.5, RIM_HI + 0.2, 0); lid.rotation.z = THREE.MathUtils.degToRad(33);
  const lp: number[] = [], lc: number[] = [];
  for (const [x, d] of outline) { lp.push(x + 7.5, 0, -d); lc.push(1, 1, 1); }
  for (let x = -7.4; x <= 7.4; x += 0.1) { lp.push(x + 7.5, 0, -3.4); lc.push(0.8, 0.8, 0.8); }
  for (let i = 0; i < 5200; i++) { const x = -7.5 + Math.random() * 15, d = Math.random() * 21.6; if (insideOf(outline, x, d)) { lp.push(x + 7.5, -0.05, -d); lc.push(0.3, 0.3, 0.31); } }
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
  lid.add(new THREE.Points(lg, mat(0.15))); root.add(lid);
  const tip = new THREE.Vector3(6.4 + 7.5, 0, -7.6).applyEuler(lid.rotation).add(lid.position);
  line([6.4, RIM_HI, -7.6], [tip.x, tip.y, tip.z], 0.12, CASE);
  for (const d of [1.2, 9, 18]) line([-7.55, RIM_HI + 0.1, -d], [-7.55, RIM_HI + 0.3, -d], 0.08, BRASS);

  // tapered legs with a molded top block and brass casters
  for (const [lx, ld] of [[-6.5, 1.5], [6.5, 1.5], [-3.9, 19.2]]) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      line([lx + sx * 0.5, RIM_LO, -ld + sz * 0.5], [lx + sx * 0.5, 5.3, -ld + sz * 0.5], 0.1, CASE);
      line([lx + sx * 0.4, 5.3, -ld + sz * 0.4], [lx + sx * 0.22, 0.6, -ld + sz * 0.22], 0.14, CASE);
    }
    for (const y of [RIM_LO, 5.3, 4.9]) for (let t = -1; t <= 1; t += 0.2) { const w = y === 4.9 ? 0.38 : 0.5; add(lx + t * w, y, -ld - w, CASE_DIM); add(lx + t * w, y, -ld + w, CASE_DIM); add(lx - w, y, -ld + t * w, CASE_DIM); add(lx + w, y, -ld + t * w, CASE_DIM); }
    ring(lx, 0.3, -ld, 0.24, 0.06, BRASS); ring(lx, 0.55, -ld, 0.22, 0.06, BRASS);
  }

  // pedal lyre: curved posts, pedal box, three brass pedals and braces back to the belly
  for (const sx of [-1, 1]) {
    for (let t = 0; t <= 1; t += 0.02) add(sx * (0.3 + 0.28 * Math.sin(Math.PI * t)), 1.1 + t * 4.8, -0.9, CASE);
    line([sx * 0.3, 5.9, -0.9], [sx * 0.3, RIM_LO, -4.6], 0.14, CASE_DIM);
  }
  for (const y of [0.45, 1.1]) { line([-0.9, y, -0.6], [0.9, y, -0.6], 0.08, CASE); line([-0.9, y, -1.2], [0.9, y, -1.2], 0.08, CASE); }
  for (const x of [-0.45, 0, 0.45]) for (const o of [-0.06, 0, 0.06]) line([x + o, 0.62, -0.6], [x + o * 1.6, 0.5, 0.75], 0.06, BRASS);

  // music desk with a fretwork panel and ledge
  const desk = (u: number, v: number) => [u * 4.3, RIM_HI + 0.5 + v * 3.2, -1.5 - v * 1.05];
  for (let u = -1; u <= 1.001; u += 0.02) { add(...(desk(u, 0) as [number, number, number]), CASE); add(...(desk(u, 1) as [number, number, number]), CASE); add(...(desk(u, 0.12) as [number, number, number]), CASE_DIM); }
  for (let v = 0; v <= 1.001; v += 0.03) for (const u of [-1, 1]) add(...(desk(u, v) as [number, number, number]), CASE);
  for (let u = -0.9; u <= 0.91; u += 0.075) for (let v = 0.2; v <= 0.92; v += 0.05) add(...(desk(u + Math.sin(v * 9) * 0.015, v) as [number, number, number]), CASE_DIM);
  for (let u = -1; u <= 1.001; u += 0.02) line(desk(u, 0), [u * 4.3, RIM_HI + 0.5, -1.0], 1, CASE);

  // fallboard, key slip and the rounded cheek blocks at each end of the keys
  for (let x = -7.15; x <= 7.15; x += 0.1) for (let y = 7.05; y <= 7.75; y += 0.14) add(x, y, -0.15, y > 7.7 ? CASE : C("#e8e6df", 0.3));
  for (let x = -0.5; x <= 0.5; x += 0.06) for (let y = 7.32; y <= 7.48; y += 0.06) add(x, y, -0.1, GOLD);
  for (let x = -7.15; x <= 7.15; x += 0.08) for (let y = 6.35; y <= 6.75; y += 0.1) add(x, y, 1.95, y > 6.7 ? CASE : CASE_DIM);
  for (const sx of [-1, 1]) for (const xo of [7.15, 7.5]) {
    for (let z = -0.2; z <= 1.95; z += 0.1) { add(sx * xo, 6.3, z, CASE_DIM); add(sx * xo, z < 1.55 ? 7.75 : 7.75 - (z - 1.55) * 1.2, z, CASE); }
    for (let y = 6.3; y <= 7.75; y += 0.12) add(sx * xo, y, 1.95 - Math.max(0, y - 7.27) * 0.8, CASE);
  }

  // floor ring
  for (let a = 0; a < Math.PI * 2; a += 0.01) add(Math.cos(a) * 18, 0, -9 + Math.sin(a) * 18, C("#ffffff", 0.18));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  root.add(new THREE.Points(g, mat(0.13)));

  // 88 shaped keys: white keys notched around the sharps, sharps raised with sloped fronts; each key pivots at the back when played
  const isBlack = (k: number) => [1, 4, 6, 9, 11].includes(k % 12);
  const ww = 14.3 / 52, keyX: number[] = [], BW = ww * 0.58, KL = 1.75, BL = 1.12;
  let wi = 0;
  for (let k = 0; k < 88; k++) { if (isBlack(k)) keyX.push(-7.15 + wi * ww); else { keyX.push(-7.15 + (wi + 0.5) * ww); wi++; } }
  const kp: number[] = [], owner: number[] = [], base: number[][] = [];
  const kadd = (k: number, x: number, y: number, z: number, c: number[]) => { kp.push(x, y, z); owner.push(k); base.push(c); };
  const IVORY = C("#f4f1e8"), IVORY_SIDE = C("#f4f1e8", 0.45), EBONY = C("#6d7177", 0.55), EBONY_TOP = C("#9aa0a8", 0.8);
  for (let k = 0; k < 88; k++) {
    const cx = keyX[k];
    if (!isBlack(k)) {
      const half = (ww - 0.035) / 2, nb = [k - 1, k + 1].filter((j) => j >= 0 && j < 88 && isBlack(j)).map((j) => keyX[j]);
      for (let x = -half; x <= half + 1e-6; x += half / 2.5) for (let z = 0; z <= KL + 1e-6; z += 0.075) {
        if (z < BL + 0.04 && nb.some((bx) => Math.abs(cx + x - bx) < BW / 2 + 0.03)) continue;
        kadd(k, cx + x, 6.9, z, Math.abs(x) > half - 0.01 || z > KL - 0.04 ? IVORY : C("#f4f1e8", 0.82));
      }
      for (let x = -half; x <= half + 1e-6; x += half / 2.5) for (let y = 6.58; y < 6.9; y += 0.08) kadd(k, cx + x, y, KL, IVORY_SIDE);
    } else {
      const h = BW / 2;
      for (let z = 0; z <= BL + 1e-6; z += 0.075) {
        const top = z < BL - 0.18 ? 7.28 : 7.28 - (z - (BL - 0.18)) * 0.9;
        for (let x = -h * 0.7; x <= h * 0.7 + 1e-6; x += h * 0.7) kadd(k, cx + x, top, z, EBONY_TOP);
        for (const sx of [-h, h]) for (let y = 6.95; y <= top; y += 0.1) kadd(k, cx + sx, y, z, EBONY);
      }
    }
  }
  const kc = base.flat();
  const kg = new THREE.BufferGeometry(); kg.setAttribute("position", new THREE.Float32BufferAttribute(kp, 3)); kg.setAttribute("color", new THREE.Float32BufferAttribute(kc, 3));
  root.add(new THREE.Points(kg, mat(0.1)));
  const restY = kp.filter((_, i) => i % 3 === 1), restZ = kp.filter((_, i) => i % 3 === 2);

  // notes drift up off the strings as keys are played
  const NN = 320, np = new Float32Array(NN * 3), nc = new Float32Array(NN * 3), life = new Float32Array(NN);
  const ng = new THREE.BufferGeometry(); ng.setAttribute("position", new THREE.BufferAttribute(np, 3)); ng.setAttribute("color", new THREE.BufferAttribute(nc, 3));
  root.add(new THREE.Points(ng, mat(0.42)));
  let nextNote = 0;

  // the keys play whichever piece is loaded in the player: in step with the audio when it's on, silently otherwise
  const accent = new THREE.Color("#ff5a36");
  const press = new Float32Array(88);
  let time = 0, prevT = -1, idx = 0, notes: Note[] = [];
  const hit = ([, m, v]: Note) => {
    const k = m - 21; if (k < 0 || k > 87) return;
    press[k] = Math.max(press[k], 0.45 + v * 0.55);
    if (m < 52) return;
    const i = nextNote++ % NN; life[i] = 0.4 + v * 0.6;
    np[i * 3] = keyX[k] - 1 + (Math.random() - 0.5) * 0.8; np[i * 3 + 1] = 8.6; np[i * 3 + 2] = -5 - Math.random() * 8;
  };
  const update = (dt: number, still: boolean) => {
    if (!still) time += dt;
    if (notes !== pianoPlayer.notes) { notes = pianoPlayer.notes; prevT = -1; idx = 0; }
    const heard = pianoPlayer.position();
    const t = heard ?? (pianoPlayer.duration ? (pianoPlayer.offset + time) % pianoPlayer.duration : 0);
    if (t < prevT || t - prevT > 2) { idx = 0; while (idx < notes.length && notes[idx][0] <= t) idx++; }
    else if (!still) while (idx < notes.length && notes[idx][0] <= t) hit(notes[idx++]);
    prevT = t;
    const pa = kg.attributes.position.array as Float32Array, ca = kg.attributes.color.array as Float32Array;
    for (let k = 0; k < 88; k++) press[k] = Math.max(0, press[k] - dt * 4);
    for (let i = 0; i < owner.length; i++) {
      const p = press[owner[i]], b = base[i];
      pa[i * 3 + 1] = restY[i] - p * 0.24 * (restZ[i] / KL);
      ca[i * 3] = b[0] + (accent.r - b[0]) * p; ca[i * 3 + 1] = b[1] + (accent.g - b[1]) * p; ca[i * 3 + 2] = b[2] + (accent.b - b[2]) * p;
    }
    kg.attributes.position.needsUpdate = true; kg.attributes.color.needsUpdate = true;
    for (let i = 0; i < NN; i++) {
      if (life[i] <= 0) { nc[i * 3] = nc[i * 3 + 1] = nc[i * 3 + 2] = 0; continue; }
      life[i] -= dt * 0.5; np[i * 3 + 1] += dt * 2.4; np[i * 3] += Math.sin(time * 2 + i) * dt * 0.4;
      const l = Math.max(0, life[i]);
      nc[i * 3] = accent.r * l; nc[i * 3 + 1] = accent.g * l; nc[i * 3 + 2] = accent.b * l;
    }
    ng.attributes.position.needsUpdate = true; ng.attributes.color.needsUpdate = true;
  };
  update(0, false);
  return { update, target: new THREE.Vector3(0, 6.8, -8), camera: new THREE.Vector3(20, 32, 20) };
}

// MacBook Pro 14" (M-series) at about 1:20.8 scale: flat aluminium slab, black keyboard well with a full-height
// function row and Touch ID, speaker grilles either side, the large Force Touch trackpad, a notched display with
// thin bezels, the black hinge, ports on both sides and rubber feet underneath.
function buildMac(THREE: T, RoundedBoxGeometry: new (w: number, h: number, d: number, seg: number, r: number) => THREE_NS.BufferGeometry) {
  const mat = (color: string, rough = 0.5, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const alu = mat("#c3c6cb", 0.3, 1), aluDark = mat("#9ea2a8", 0.35, 1), well = mat("#0c0d0f", 0.75), keyMat = mat("#121315", 0.55), black = mat("#050506", 0.4), pad = mat("#b4b8bd", 0.22, 0.9);
  const W = 15, D = 10.6, BASE = 0.46, LID = 0.28, R = 0.55;
  const slab = (w: number, d: number, h: number, r: number, m: THREE_NS.Material) => {
    const s = new THREE.Shape(), inset = Math.min(0.05, h * 0.3), x = -w / 2 + inset, y = -d / 2 + inset, ww = w - 2 * inset, dd = d - 2 * inset;
    s.moveTo(x + r, y); s.lineTo(x + ww - r, y); s.quadraticCurveTo(x + ww, y, x + ww, y + r); s.lineTo(x + ww, y + dd - r); s.quadraticCurveTo(x + ww, y + dd, x + ww - r, y + dd);
    s.lineTo(x + r, y + dd); s.quadraticCurveTo(x, y + dd, x, y + dd - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const b = Math.min(0.05, h * 0.3);
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 10 });
    g.rotateX(-Math.PI / 2); g.translate(0, b, 0);
    const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o;
  };
  const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const decal = (w: number, d: number, tex: THREE_NS.Texture, y: number, x = 0, z = 0) => {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); return o;
  };
  const mac = new THREE.Group();
  mac.add(slab(W, D, BASE, R, alu));
  for (const [x, z] of [[-5.9, -3.9], [5.9, -3.9], [-5.9, 3.9], [5.9, 3.9]]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), black); f.position.set(x, -0.02, z); mac.add(f); }
  const lip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.12), aluDark); lip.position.set(0, BASE - 0.02, D / 2 - 0.05); mac.add(lip);

  // ports: MagSafe 3, two Thunderbolt and the headphone jack on the left; HDMI, SDXC and Thunderbolt on the right
  const port = (x: number, z: number, len: number, h: number) => { const o = new THREE.Mesh(new RoundedBoxGeometry(0.06, h, len, 2, Math.min(h, len) / 2.2), black); o.position.set(x, BASE / 2, z); mac.add(o); };
  port(-W / 2 + 0.01, -3.4, 0.78, 0.12); port(-W / 2 + 0.01, -1.9, 0.42, 0.13); port(-W / 2 + 0.01, -1.1, 0.42, 0.13); port(-W / 2 + 0.01, 1.9, 0.17, 0.17);
  port(W / 2 - 0.01, -2.6, 0.72, 0.2); port(W / 2 - 0.01, -1.1, 0.42, 0.13); port(W / 2 - 0.01, 1.3, 1.25, 0.05);

  // keyboard: six rows of 14.5 units, the inverted-T arrows, and legends printed on a decal over the caps
  const U = 0.864, KB = 14.5 * U, top = BASE;
  const kbZ0 = -D / 2 + 0.55;
  const wellMesh = slab(KB + 0.32, 6 * U + 0.3, 0.012, 0.18, well); wellMesh.position.set(0, top - 0.004, kbZ0 + 3 * U - 0.02); mac.add(wellMesh);
  const rows: [string, number][][] = [
    [["esc", 1.5], ...Array.from({ length: 12 }, (_, i): [string, number] => [`F${i + 1}`, 1]), ["touchid", 1]],
    [["`", 1], ["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["=", 1], ["delete", 1.5]],
    [["tab", 1.5], ...[..."QWERTYUIOP[]\\"].map((k): [string, number] => [k, 1])],
    [["caps lock", 1.8], ...[..."ASDFGHJKL;'"].map((k): [string, number] => [k, 1]), ["return", 1.7]],
    [["shift", 2.3], ...[..."ZXCVBNM,./"].map((k): [string, number] => [k, 1]), ["shift ", 2.2]],
    [["fn", 1], ["control", 1], ["option", 1], ["command", 1.25], ["", 5], ["command ", 1.25], ["option ", 1], ["←", 1], ["↑↓", 1], ["→", 1]],
  ];
  type Cap = { x: number; z: number; w: number; d: number; label: string };
  const caps: Cap[] = [];
  rows.forEach((row, r) => {
    let x = -KB / 2;
    for (const [label, u] of row) {
      const cx = x + (u * U) / 2, cz = kbZ0 + (r + 0.5) * U;
      if (label === "↑↓") { caps.push({ x: cx, z: cz - U / 4, w: U - 0.1, d: U / 2 - 0.07, label: "↑" }, { x: cx, z: cz + U / 4, w: U - 0.1, d: U / 2 - 0.07, label: "↓" }); }
      else if (label === "←" || label === "→") caps.push({ x: cx, z: cz + U / 4, w: U - 0.1, d: U / 2 - 0.07, label });
      else caps.push({ x: cx, z: cz, w: u * U - 0.1, d: U - 0.1, label });
      x += u * U;
    }
  });
  const capGeo = new RoundedBoxGeometry(1, 0.07, 1, 2, 0.02);
  const keys = new THREE.InstancedMesh(capGeo, keyMat, caps.length);
  const m4 = new THREE.Matrix4();
  caps.forEach((c, i) => { m4.compose(new THREE.Vector3(c.x, top + 0.04, c.z), new THREE.Quaternion(), new THREE.Vector3(c.w, 1, c.label === "touchid" ? c.d : c.d)); keys.setMatrixAt(i, m4); });
  keys.castShadow = true; mac.add(keys);
  const kbW = KB + 0.2, kbD = 6 * U + 0.2, PX = 180;
  const legends = canvasTex(Math.round(kbW * PX), Math.round(kbD * PX), (g) => {
    const toPx = (x: number, z: number) => [(x + kbW / 2) * PX, (z - (kbZ0 - 0.1)) * PX];
    g.fillStyle = "rgba(235,237,240,.92)"; g.strokeStyle = "rgba(235,237,240,.9)"; g.textBaseline = "middle";
    const sym: Record<string, string> = { command: "⌘", option: "⌥", control: "⌃", shift: "⇧", "caps lock": "⇪", tab: "⇥", delete: "⌫", return: "↩" };
    for (const c of caps) {
      const [px, pz] = toPx(c.x, c.z), hw = (c.w * PX) / 2, hd = (c.d * PX) / 2, name = c.label.trim();
      if (name === "touchid") { g.lineWidth = 3; g.beginPath(); g.arc(px, pz, hd * 0.62, 0, TAU); g.stroke(); continue; }
      if (!name) continue;
      if (sym[name] || name === "fn" || name === "esc") {
        g.font = "500 22px -apple-system, Helvetica, Arial, sans-serif";
        g.textAlign = c.x < 0 ? "left" : "right";
        g.fillText(name, c.x < 0 ? px - hw + 12 : px + hw - 12, pz + hd - 22);
        if (sym[name]) { g.font = "500 26px -apple-system, Helvetica, Arial, sans-serif"; g.fillText(sym[name], c.x < 0 ? px + hw - 34 : px - hw + 34, pz - hd + 26); }
        continue;
      }
      g.textAlign = "center";
      g.font = name.startsWith("F") && name.length > 1 ? "500 20px -apple-system, Helvetica, Arial, sans-serif" : "500 46px -apple-system, Helvetica, Arial, sans-serif";
      g.fillText(name, px, name.startsWith("F") && name.length > 1 ? pz + hd - 22 : pz);
    }
  });
  mac.add(decal(kbW, kbD, legends, top + 0.077, 0, kbZ0 - 0.1 + kbD / 2));
  // speaker grilles: perforated fields either side of the keyboard
  const grille = canvasTex(160, 900, (g) => { g.fillStyle = "rgba(8,9,10,.85)"; for (let y = 8; y < 900; y += 15) for (let x = 8 + ((y / 15) % 2) * 7; x < 160; x += 14) { g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); } });
  for (const sx of [-1, 1]) mac.add(decal(0.78, 6 * U, grille, top + 0.003, sx * (KB / 2 + 0.68), kbZ0 + 3 * U));
  const trackpad = slab(7.0, 4.4, 0.012, 0.22, pad); trackpad.position.set(0, top - 0.003, D / 2 - 0.35 - 2.2); mac.add(trackpad);

  // display: hinged at the back; closed it lies on the base with the screen facing down, open it swings up toward you
  const lid = new THREE.Group(); lid.position.set(0, top, -D / 2 + 0.02); lid.rotation.x = -THREE.MathUtils.degToRad(104); mac.add(lid);
  const shell = slab(W, D, LID, R, alu); shell.position.set(0, 0.02, D / 2); lid.add(shell);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, W - 1.6, 24), black); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 0.02, 0.12); lid.add(hinge);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(W - 0.12, 0.01, D - 0.12, 2, 0.004), new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.08, metalness: 0.4 }));
  glass.position.set(0, 0.016, D / 2); lid.add(glass);
  const SW = W - 0.36, CHIN = 0.72, TOPB = 0.17, SH = D - CHIN - TOPB, SZ = CHIN + SH / 2;
  const screenTex = canvasTex(1512, Math.round(1512 * SH / SW), (g) => {
    const w = g.canvas.width, h = g.canvas.height;
    // drawn for the glyph renderer: a light screen and very large type, since only big shapes survive as characters
    g.fillStyle = "#f4f6f9"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#c9d3e0"; g.fillRect(0, 0, w, 64);
    g.fillStyle = "#13213a"; g.textBaseline = "alphabetic"; g.textAlign = "left";
    g.font = "800 300px Helvetica, Arial, sans-serif"; g.fillText("Aaditya", 70, h * 0.5);
    g.fillText("Shah", 70, h * 0.5 + 290);
    const m = g.measureText("Shah");
    g.fillStyle = "#ff5a36"; g.fillRect(70 + m.width + 34, h * 0.5 + 290 - 210, 120, 210);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.rotation.x = Math.PI / 2; screen.position.set(0, 0.006, SZ); lid.add(screen);
  const notch = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.3), new THREE.MeshBasicMaterial({ color: "#000000" }));
  notch.rotation.x = Math.PI / 2; notch.position.set(0, -0.006, D - TOPB - 0.13); lid.add(notch);
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshBasicMaterial({ color: "#1b2433" })); cam.rotation.x = Math.PI / 2; cam.position.set(0, -0.012, D - TOPB - 0.1); lid.add(cam);

  // the Apple logo, mirror-finished, centred on the back of the lid
  const logoTex = canvasTex(256, 256, (lg) => {
    lg.fillStyle = "#f2f2f4";
    lg.beginPath(); lg.arc(100, 150, 58, 0, TAU); lg.arc(156, 150, 58, 0, TAU); lg.fill();
    lg.fillRect(100, 100, 56, 108); lg.beginPath(); lg.arc(128, 196, 48, 0, TAU); lg.fill();
    lg.globalCompositeOperation = "destination-out"; lg.beginPath(); lg.arc(208, 118, 30, 0, TAU); lg.fill();
    lg.globalCompositeOperation = "source-over"; lg.save(); lg.translate(142, 56); lg.rotate(-0.7); lg.beginPath(); lg.ellipse(0, 0, 11, 30, 0, 0, TAU); lg.fill(); lg.restore();
  });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.9 }));
  logo.rotation.x = -Math.PI / 2; logo.position.set(0, LID + 0.03, D / 2); lid.add(logo);
  return { mac, lid, mat };
}

function deskScene(THREE: T, RoundedBoxGeometry: new (w: number, h: number, d: number, seg: number, r: number) => THREE_NS.BufferGeometry, scene: THREE_NS.Scene) {
  const { mac, lid, mat } = buildMac(THREE, RoundedBoxGeometry);
  void lid;
  const root = new THREE.Group(); scene.add(root); root.add(mac);

  // small solar system hovering beside the laptop
  const sys = new THREE.Group(); sys.position.set(12.5, 9, 1); sys.rotation.z = 0.32; root.add(sys);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 32), new THREE.MeshBasicMaterial({ color: "#ff5a36" })); sys.add(sun);
  const glow = new THREE.PointLight("#ffd9cc", 18, 26, 2); sys.add(glow);
  const defs = [{ r: 0.28, o: 2.3, s: 0.9, c: "#5b6b82" }, { r: 0.42, o: 3.5, s: 0.6, c: "#2a3a55" }, { r: 0.52, o: 4.8, s: 0.4, c: "#8a98ad", ring: true }, { r: 0.32, o: 6.1, s: 0.26, c: "#13213a" }];
  const planets = defs.map((d, i) => {
    const pts: THREE_NS.Vector3[] = []; for (let k = 0; k <= 96; k++) pts.push(new THREE.Vector3(Math.cos((k / 96) * TAU) * d.o, 0, Math.sin((k / 96) * TAU) * d.o));
    sys.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: "#cfd3d6", transparent: true, opacity: 0.22 })));
    const pl = new THREE.Mesh(new THREE.SphereGeometry(d.r, 32, 32), mat(d.c, 0.6)); pl.castShadow = true;
    if (d.ring) { const ring = new THREE.Mesh(new THREE.RingGeometry(d.r * 1.5, d.r * 2.2, 48), new THREE.MeshStandardMaterial({ color: "#d8cfb8", side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.8 })); ring.rotation.x = Math.PI / 2.4; pl.add(ring); }
    sys.add(pl); return { pl, d, a: i * 1.7 };
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  root.position.set(-2, 0, 0);

  let time = 0;
  const update = (dt: number, still: boolean) => {
    time += still ? 0 : dt;
    planets.forEach((p) => { const a = p.a + time * p.d.s; p.pl.position.set(Math.cos(a) * p.d.o, 0, Math.sin(a) * p.d.o); });
    sun.rotation.y = time * 0.2;
    root.rotation.y = Math.sin(time * 0.25) * 0.12;
    sys.position.y = 9 + Math.sin(time * 0.6) * 0.3;
  };
  update(0, false);
  return { update, target: new THREE.Vector3(3, 5.5, 0), camera: new THREE.Vector3(8, 10, 31) };
}

function macScene(THREE: T, RoundedBoxGeometry: new (w: number, h: number, d: number, seg: number, r: number) => THREE_NS.BufferGeometry, scene: THREE_NS.Scene) {
  const { mac, lid, mat } = buildMac(THREE, RoundedBoxGeometry);
  scene.add(mac);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // slow ring of small spheres to give the orbit something to parallax against
  const dots = new THREE.Group(); scene.add(dots);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU, r = 34 + (i % 3) * 5;
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.35 + (i % 4) * 0.12, 16, 16), mat(["#a5654c", "#8fa3b3", "#a8b39a", "#c9bca0"][i % 4], 0.6));
    d.position.set(Math.cos(a) * r, 2 + (i % 5) * 2.2, Math.sin(a) * r); dots.add(d);
  }
  const ease = (x: number) => x * x * (3 - 2 * x);
  const seg = (p: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));
  const update = (_dt: number, _still: boolean, p: number) => {
    lid.rotation.x = -THREE.MathUtils.degToRad(104) * seg(p, 0.22, 0.5);
    dots.rotation.y = p * 1.2;
  };
  const screenC = new THREE.Vector3(0, 5.85, -6.6);
  const frame = (camera: THREE_NS.PerspectiveCamera, p: number, aspect: number) => {
    const f = Math.max(1, 1.2 / aspect);
    // orbit phase: swing from behind-left, over the side, to the front
    const orbit = seg(p, 0, 0.55);
    const az = THREE.MathUtils.lerp(-2.4, 0, orbit);
    const el = THREE.MathUtils.lerp(0.55, 0.32, orbit);
    const rad = THREE.MathUtils.lerp(30, 26, orbit) * f;
    const orbitPos = new THREE.Vector3(Math.sin(az) * Math.cos(el) * rad, Math.sin(el) * rad + 1, Math.cos(az) * Math.cos(el) * rad);
    const orbitTarget = new THREE.Vector3(0, 2 + 3 * seg(p, 0.25, 0.5), 0);
    // dolly phase: push in until the screen fills the frame
    const dolly = seg(p, 0.6, 0.95);
    const closePos = new THREE.Vector3(0, 9.9 + 1.5 * (f - 1), 9.9 + 8 * (f - 1));
    camera.position.lerpVectors(orbitPos, closePos, dolly);
    const tgt = new THREE.Vector3().lerpVectors(orbitTarget, screenC, dolly);
    camera.lookAt(tgt);
  };
  return { update, frame, target: new THREE.Vector3(0, 2, 0), camera: new THREE.Vector3(-20, 18, -20), scripted: true };
}

// High-wing four-seat trainer in the shape of a Cessna 172, in meters with the nose toward -z. Every surface is
// lofted through cross-sections and painted with vertex colours: dark glazing and an orange cheatline, since
// shade and colour are all that survive the glyph renderer.
function buildPlane(THREE: T) {
  const BODY = "#7d8ca1", DARK = "#1c2a44", ORANGE = "#ff5a36", METAL = "#4b5a70";
  const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1 });
  const plain = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });

  // connect rings of equal length into a closed skin with capped ends; paint(ring, point) picks each vertex colour
  const loft = (rings: THREE_NS.Vector3[][], paint: (p: THREE_NS.Vector3, r: number) => string) => {
    const n = rings[0].length, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color();
    rings.forEach((ring, r) => ring.forEach((p) => { pos.push(p.x, p.y, p.z); c.set(paint(p, r)); col.push(c.r, c.g, c.b); }));
    for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + ((i + 1) % n), d = a + n, e = b + n;
      idx.push(a, d, b, b, d, e);
    }
    for (const [r, flip] of [[0, true], [rings.length - 1, false]] as const) {
      const ctr = rings[r].reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(n), ci = pos.length / 3;
      pos.push(ctr.x, ctr.y, ctr.z); c.set(paint(ctr, r)); col.push(c.r, c.g, c.b);
      for (let i = 0; i < n; i++) { const a = r * n + i, b = r * n + ((i + 1) % n); idx.push(...(flip ? [ci, b, a] : [ci, a, b])); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, skin); m.castShadow = true; return m;
  };
  const rod = (a: number[], b: number[], r: number, m: THREE_NS.Material) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 10), m);
    o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return o;
  };

  const plane = new THREE.Group();

  // fuselage: rounded-square sections from spinner to tail cone [z, half width, half height, centre height]
  const stations: [number, number, number, number][] = [
    [-3.38, 0.03, 0.03, -0.06], [-3.25, 0.2, 0.2, -0.06], [-3.0, 0.38, 0.38, -0.06], [-2.82, 0.47, 0.46, -0.05], [-2.55, 0.53, 0.52, -0.03],
    [-2.1, 0.56, 0.57, 0], [-1.75, 0.57, 0.63, 0.07], [-1.3, 0.58, 0.72, 0.16], [-0.75, 0.58, 0.78, 0.21], [0.55, 0.57, 0.77, 0.2],
    [1.15, 0.5, 0.64, 0.19], [2.0, 0.38, 0.49, 0.19], [3.0, 0.26, 0.35, 0.21], [4.0, 0.16, 0.25, 0.25], [4.72, 0.07, 0.15, 0.3],
  ];
  const SEG = 40;
  const fuseRings = stations.map(([z, w, h, cy]) => Array.from({ length: SEG }, (_, k) => {
    const a = (k / SEG) * TAU, cs = Math.cos(a), sn = Math.sin(a), e = 2 / 2.7;
    return new THREE.Vector3(w * Math.sign(cs) * Math.abs(cs) ** e, cy + h * Math.sign(sn) * Math.abs(sn) ** e, z);
  }));
  plane.add(loft(fuseRings, (p, r) => {
    const [, , h, cy] = stations[Math.min(r, stations.length - 1)], up = (p.y - cy) / h;
    if (p.z < -2.82) return METAL; // spinner
    const windshield = p.z > -1.8 && p.z < -0.75 && up > 0.35;
    const side = p.z > -0.75 && p.z < 1.25 && up > 0.3 && up < 0.88 && Math.abs(p.x) > 0.25;
    if (windshield || side) return DARK;
    if (p.z < 3.6 && up > -0.2 && up < -0.04) return ORANGE; // cheatline
    return BODY;
  }));

  // wing: NACA 2412 sections, constant chord inboard then tapering, 1.7° dihedral, on top of the cabin
  const foil = naca(0.12, 0.02, 0.4, 24);
  const wingRing = (x: number, chord: number, zLE: number, y: number, t = 1) => foil.map(([u, v]) => new THREE.Vector3(x, y + v * chord * t, zLE + u * chord));
  const wingSpan = [-5.5, -5.35, -2.6, 0, 2.6, 5.35, 5.5];
  plane.add(loft(wingSpan.map((x) => {
    const ax = Math.abs(x), chord = ax <= 2.6 ? 1.62 : 1.62 - (ax - 2.6) * 0.17, zLE = -1.05 + (1.62 - chord) * 0.25;
    return wingRing(x, ax > 5.4 ? chord * 0.8 : chord, zLE, 0.98 + ax * 0.03, ax > 5.4 ? 0.5 : 1);
  }), (p) => (Math.abs(p.x) > 5.0 ? ORANGE : BODY)));

  // tail: tapered horizontal stabiliser and a swept fin with an orange cap
  const tfoil = naca(0.09, 0, 0, 16);
  plane.add(loft([-1.75, -0.2, 0.2, 1.75].map((x) => {
    const chord = Math.abs(x) < 1 ? 0.85 : 0.55;
    return tfoil.map(([u, v]) => new THREE.Vector3(x, 0.32 + v * chord, 4.0 + (0.85 - chord) * 0.6 + u * chord));
  }), () => BODY));
  const finY = [0.3, 0.9, 1.4, 1.62, 1.75];
  plane.add(loft(finY.map((y) => {
    const k = (y - 0.3) / 1.45, chord = 1.25 - k * 0.68, zLE = 3.45 + k * 1.0;
    return tfoil.map(([u, v]) => new THREE.Vector3(v * chord, y, zLE + u * chord));
  }), (p) => (p.y > 1.5 ? ORANGE : BODY)));

  // struts, fixed tricycle gear with wheel fairings
  const metal = plain(METAL), tyre = plain(DARK);
  for (const s of [-1, 1]) {
    plane.add(rod([s * 0.5, -0.38, -0.35], [s * 2.6, 0.95, -0.55], 0.035, metal));
    plane.add(rod([s * 0.45, -0.5, 0.05], [s * 1.25, -1.15, 0.1], 0.045, metal));
    const pant = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), plain(BODY)); pant.scale.set(0.7, 0.95, 2.1); pant.position.set(s * 1.27, -1.2, 0.08); plane.add(pant);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 18), tyre); wheel.rotation.z = Math.PI / 2; wheel.position.set(s * 1.27, -1.28, 0.08); plane.add(wheel);
  }
  plane.add(rod([0, -0.45, -2.35], [0, -1.2, -2.4], 0.04, metal));
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 18), tyre); nose.rotation.z = Math.PI / 2; nose.position.set(0, -1.25, -2.4); plane.add(nose);

  // two-blade prop with a faint blur disc
  const prop = new THREE.Group(); prop.position.z = -3.05; plane.add(prop);
  for (const s of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.9, 0.03), plain(DARK)); blade.position.y = s * 0.5; blade.rotation.y = s * 0.35; prop.add(blade);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 40), new THREE.MeshBasicMaterial({ color: "#8796aa", transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  disc.position.z = -3.07; plane.add(disc);
  return { plane, prop };
}

function flightScene(THREE: T, scene: THREE_NS.Scene) {
  // no sky: the page shows through, and distant ground fades toward paper so it thins into light glyphs
  scene.fog = new THREE.Fog("#eef1f5", 140, 520);
  const { plane, prop } = buildPlane(THREE);
  plane.scale.setScalar(0.75); scene.add(plane);

  // --- real map: San Jose from OpenStreetMap + terrain tiles, drawn as a point cloud
  const U = 1 / 14; // scene units per meter
  const city = new THREE.Group(); scene.add(city);
  const START_Z = 2000; // meters south of map center where the flight begins
  let lelandMarker: THREE_NS.Object3D | null = null;
  let mapLen = 9000;
  fetch("/data/sj.meta.json").then((r) => r.json()).then(async (meta) => {
    const [pb, tb] = await Promise.all([fetch("/data/sj.pos.bin").then((r) => r.arrayBuffer()), fetch("/data/sj.type.bin").then((r) => r.arrayBuffer())]);
    const q = new Int16Array(pb), ty = new Uint8Array(tb), n = ty.length;
    mapLen = meta.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const palette = [new THREE.Color("#c4cdd8"), new THREE.Color("#aebfd0"), new THREE.Color("#dde3ea")];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = q[i * 3] * 0.25 * U; pos[i * 3 + 1] = q[i * 3 + 1] * 0.1 * U * 1.6; pos[i * 3 + 2] = q[i * 3 + 2] * 0.25 * U;
      const c = palette[ty[i]]; col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    city.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.24, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.32, depthWrite: false })));
    // marker for Leland High School
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const x = c.getContext("2d")!; x.fillStyle = "#13213a"; x.font = "700 52px Helvetica, Arial, sans-serif"; x.textAlign = "center"; x.fillText("Leland High", 256, 70);
    x.fillStyle = "#ff5a36"; x.beginPath(); x.arc(256, 104, 9, 0, TAU); x.fill();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(14, 3.5, 1); sp.position.set(meta.leland.x * U, meta.leland.y * 0.1 * U * 1.6 + 5, meta.leland.z * U); city.add(sp); lelandMarker = sp;
  }).catch(() => {});

  const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const DIST = 4400 * U; // flight distance in scene units (4.4 km north)
  const alt01 = (p: number) => 0.18 + 0.82 * sm(0.0, 0.3, p) * (1 - 0.35 * sm(0.75, 1, p));
  void lelandMarker; void mapLen;
  const update = (dt: number, _still: boolean, p: number) => {
    const a = alt01(p), ahead = alt01(Math.min(1, p + 0.01)), climbing = ahead - a;
    city.position.set(0, -4, -START_Z * U + p * DIST); // the map slides under the plane, heading north
    plane.position.y = 3 + a * 26;
    plane.rotation.x = THREE.MathUtils.clamp(climbing * 90, -0.35, 0.4) * -1;
    plane.rotation.z = Math.sin(p * 12) * 0.18 * sm(0.1, 0.25, p);
    prop.rotation.z += dt * 40;
  };
  const frame = (camera: THREE_NS.PerspectiveCamera, p: number, aspect: number) => {
    const f = Math.max(1, 1.2 / aspect);
    const y = plane.position.y;
    const az = THREE.MathUtils.lerp(0.9, -0.5, p) + Math.sin(p * 5) * 0.12;
    const rad = (13 + 3.5 * Math.sin(p * Math.PI)) * f;
    camera.position.set(Math.sin(az) * rad, y + 3.5 + 2.5 * Math.sin(p * Math.PI), Math.cos(az) * rad);
    camera.lookAt(0, y - 0.8, -1.2);
  };
  return { update, frame, target: new THREE.Vector3(0, 2, 0), camera: new THREE.Vector3(14, 5, 14) };
}

type GLTFLoaderT = { loadAsync: (url: string) => Promise<{ scene: THREE_NS.Group }> };

// Mercedes-AMG GT R on an open two-lane road. The car holds still while the road streams past; scroll swings the
// camera from a low front three-quarter, past the side profile, to a chase view. Paint is reassigned by material
// name so the body reads as mid-tone glyphs, glass and rubber as dense ones, and only calipers and tail lights orange.
function carScene(THREE: T, scene: THREE_NS.Scene, loader: GLTFLoaderT) {
  scene.fog = new THREE.Fog("#eef1f5", 28, 120);
  const car = new THREE.Group(); scene.add(car);
  const wheels: THREE_NS.Object3D[] = [];
  const paint = (name: string) => {
    if (/Red\.002|Glass - Red/.test(name)) return "#ff5a36";
    if (/Glass|Window|Tire|Rubber|Interior|Plastic|Material\.001/.test(name)) return "#1c2a44";
    if (/Car Paint - Black|Metal - Black/.test(name)) return "#33435c";
    if (/Chrome|Brake Disc|logo/.test(name)) return "#c3ccd8";
    return "#7a8aa0";
  };
  loader.loadAsync("/models/amg-gtr.glb").then(({ scene: model }) => {
    model.traverse((o) => {
      const m = o as THREE_NS.Mesh;
      if (!m.isMesh) return;
      const name = (m.material as THREE_NS.Material).name;
      m.material = new THREE.MeshStandardMaterial({ color: paint(name), roughness: /Glass/.test(name) ? 0.1 : 0.4, metalness: /Chrome|Metal/.test(name) ? 0.6 : 0.15 });
      m.castShadow = true;
    });
    model.updateMatrixWorld(true);
    // face the nose down -z, the way the road runs
    const front = model.getObjectByName("FT-L001");
    const fz = front ? new THREE.Box3().setFromObject(front).getCenter(new THREE.Vector3()).z : -1;
    if (fz > 0) { model.rotation.y = Math.PI; model.updateMatrixWorld(true); }
    car.add(model);
    // re-pivot each rotating wheel part on its own axle so it can roll
    for (const n of ["FT-L001", "FT-R001", "BK-L001", "BK-R001", "FT-D-L001", "FT-D-R001", "BK-D-L001", "BK-D-R001"]) {
      const part = model.getObjectByName(n);
      if (!part) continue;
      const pivot = new THREE.Group(); pivot.position.copy(new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3()));
      car.add(pivot); pivot.attach(part); wheels.push(pivot);
    }
  }).catch(() => {});

  // road: light surface, dark edge lines, dashed centre line and posts on the shoulder, all scrolling toward the camera
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 260), new THREE.MeshStandardMaterial({ color: "#c9d2dc", roughness: 0.95, transparent: true, opacity: 0.3 }));
  road.rotation.x = -Math.PI / 2; road.position.set(-1.8, 0, -100); road.receiveShadow = true; scene.add(road);
  const ink = new THREE.MeshStandardMaterial({ color: "#13213a", roughness: 0.8 });
  for (const x of [1.95, -5.55]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 260), ink); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.01, -100); scene.add(l); }
  const moving = new THREE.Group(); scene.add(moving);
  const DASH = 9;
  for (let z = -230; z < 30; z += DASH) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3), ink); d.rotation.x = -Math.PI / 2; d.position.set(-1.8, 0.01, z); moving.add(d);
  }
  const POST = 18, postMat = new THREE.MeshStandardMaterial({ color: "#5b6b82", roughness: 0.6 });
  for (let z = -234; z < 30; z += POST) for (const x of [3.3, -6.9]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), postMat); p.position.set(x, 0.5, z); p.castShadow = true; moving.add(p);
  }

  const ease = (x: number) => x * x * (3 - 2 * x);
  const seg = (p: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));
  let travel = 0;
  const update = (dt: number, still: boolean) => {
    const v = still ? 0 : 22; // m/s, about 50 mph
    travel += v * dt;
    moving.position.z = travel % POST; // posts every 18 m line up with dashes every 9 m
    for (const w of wheels) w.rotation.x -= (v * dt) / 0.36; // roll toward -z on a 0.36 m tyre radius
  };
  const frame = (camera: THREE_NS.PerspectiveCamera, p: number, aspect: number) => {
    const f = Math.max(1, 1.25 / aspect);
    // azimuth measured from the nose: front three-quarter, side profile, then the chase view
    const az = THREE.MathUtils.lerp(0.55, Math.PI * 0.5, seg(p, 0, 0.45)) + (Math.PI * 0.4) * seg(p, 0.5, 0.95);
    const r = THREE.MathUtils.lerp(9.6, 10.6, seg(p, 0.5, 0.95)) * f;
    const h = THREE.MathUtils.lerp(1.6, 3.2, seg(p, 0.45, 1));
    camera.position.set(Math.sin(az) * r, h, -Math.cos(az) * r);
    camera.lookAt(0, 0.55, THREE.MathUtils.lerp(0, -2.5, seg(p, 0.5, 1)));
  };
  return { update, frame, target: new THREE.Vector3(0, 0.6, 0), camera: new THREE.Vector3(4, 1, -6) };
}

export default function Viewer({ kind, label, progress }: { kind: Scene; label: string; progress?: { current: number } }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      const { ParametricGeometry } = await import("three/examples/jsm/geometries/ParametricGeometry.js");
      let gltf: GLTFLoaderT | null = null;
      if (kind === "car") {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { MeshoptDecoder } = await import("three/examples/jsm/libs/meshopt_decoder.module.js");
        gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      }
      if (disposed) return;
      let renderer: THREE_NS.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);
      const glyph = makeGlyphPass(THREE, renderer);
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.55;
      const key = new THREE.DirectionalLight("#fff4e6", 1.6);
      key.position.set(40, 70, 30); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 220 });
      key.shadow.bias = -0.0004;
      scene.add(key);

      const s: { update: (dt: number, still: boolean, p: number) => void; target: THREE_NS.Vector3; camera: THREE_NS.Vector3; frame?: Frame } =
        kind === "printer" ? printerScene(THREE, RoundedBoxGeometry as never, ParametricGeometry as never, scene, renderer)
        : kind === "desk" ? deskScene(THREE, RoundedBoxGeometry as never, scene)
        : kind === "mac" ? macScene(THREE, RoundedBoxGeometry as never, scene)
        : kind === "flight" ? flightScene(THREE, scene)
        : kind === "piano" ? pianoScene(THREE, scene)
        : kind === "car" && gltf ? carScene(THREE, scene, gltf)
        : wingScene(THREE, scene);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
      camera.position.copy(s.camera);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(s.target);
      controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
      controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.5;
      if (kind === "mac" || kind === "flight" || kind === "car") controls.enabled = false;
      controls.autoRotate = kind !== "desk"; controls.autoRotateSpeed = 0.6;
      if (kind === "desk") { controls.minAzimuthAngle = -0.7; controls.maxAzimuthAngle = 0.9; controls.minPolarAngle = 1.0; controls.maxPolarAngle = 1.55; }

      const offset = s.camera.clone().sub(s.target);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return; renderer.setSize(w, h, false); glyph.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
        const f = Math.max(1, 1.15 / camera.aspect);
        camera.position.copy(s.target).addScaledVector(offset, f);
      };
      resize();
      const ro = new ResizeObserver(resize); ro.observe(el);

      let visible = true, raf = 0, last = performance.now();
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
      io.observe(el);
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now;
        if (!visible) return;
        const p = progress?.current ?? 0;
        s.update(dt, reduce, p);
        if (s.frame) s.frame(camera, p, camera.aspect);
        else { if (reduce) controls.autoRotate = false; controls.update(); }
        glyph.render(scene, camera, now, reduce);
      };
      raf = requestAnimationFrame(loop);
      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls.dispose(); pmrem.dispose(); glyph.dispose();
        scene.traverse((o) => { const m = o as THREE_NS.Mesh; if (m.geometry) m.geometry.dispose(); });
        renderer.dispose(); renderer.domElement.remove();
      };
    })();
    return () => { disposed = true; cleanup(); };
  }, [kind, progress]);

  return <div className="viewer" ref={host} role="img" aria-label={label} />;
}
