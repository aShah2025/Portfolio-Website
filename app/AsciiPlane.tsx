"use client";

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { SCENES } from "./asciiScenes";

type T = typeof THREE_NS;
const TAU = Math.PI * 2;

// Dense to sparse: darker (shadowed) surfaces get heavier glyphs, lit ones lighter.
const RAMP = "@%#*+=-:.";
const SCRAMBLE = "/?<>%*#@+=:;";
// Lighter ramp for the sky, so the ASCII painting reads as texture rather than a wall of characters.
const SKY = "%*+=-:;,. ";
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
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


// High-wing four-seat trainer modelled on the Cessna 172S, in meters with the nose toward -z. Every surface is
// lofted through cross-sections and painted with vertex colours in the 172's factory scheme: gloss white with a
// red swoosh that sweeps up the tail, a thin maroon pinstripe, tinted glazing, and control-surface seams.
function buildPlane(THREE: T) {
  const BODY = "#eef0f3", DARK = "#1c2a44", RED = "#c8322f", MAROON = "#6e1f2b", SEAM = "#aeb5bf", METAL = "#4b5a70";
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15 });
  const plain = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });

  // connect rings of equal length into a closed skin with capped ends. Normals are smoothed across the skin, but
  // each face takes one colour from paint(centre) so windows, stripes and tips get crisp edges instead of smearing
  const loft = (rings: THREE_NS.Vector3[][], paint: (p: THREE_NS.Vector3) => string) => {
    const n = rings[0].length, pos: number[] = [], idx: number[] = [], c = new THREE.Color();
    rings.forEach((ring) => ring.forEach((p) => pos.push(p.x, p.y, p.z)));
    for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + ((i + 1) % n), d = a + n, e = b + n;
      idx.push(a, d, b, b, d, e);
    }
    for (const [r, flip] of [[0, true], [rings.length - 1, false]] as const) {
      const ctr = rings[r].reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(n), ci = pos.length / 3;
      pos.push(ctr.x, ctr.y, ctr.z);
      for (let i = 0; i < n; i++) { const a = r * n + i, b = r * n + ((i + 1) % n); idx.push(...(flip ? [ci, b, a] : [ci, a, b])); }
    }
    const smooth = new THREE.BufferGeometry();
    smooth.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); smooth.setIndex(idx); smooth.computeVertexNormals();
    const g = smooth.toNonIndexed(), gp = g.attributes.position, col = new Float32Array(gp.count * 3), m3 = new THREE.Vector3();
    for (let i = 0; i < gp.count; i += 3) {
      m3.set(0, 0, 0); for (let k = 0; k < 3; k++) m3.add(new THREE.Vector3().fromBufferAttribute(gp, i + k));
      c.set(paint(m3.divideScalar(3)));
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, skin); m.castShadow = true; return m;
  };
  const rod = (a: number[], b: number[], r: number, m: THREE_NS.Material) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 20), m);
    o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return o;
  };

  const plane = new THREE.Group();

  // fuselage: rounded-square sections from spinner to tail cone [z, half width, half height, centre height]
  const stations: [number, number, number, number][] = [
    [-3.38, 0.03, 0.03, -0.06], [-3.25, 0.2, 0.2, -0.06], [-3.0, 0.38, 0.38, -0.06], [-2.82, 0.47, 0.46, -0.05], [-2.55, 0.53, 0.52, -0.03],
    [-2.1, 0.56, 0.57, 0], [-1.75, 0.57, 0.63, 0.07], [-1.3, 0.58, 0.72, 0.16], [-0.75, 0.58, 0.78, 0.21], [0.55, 0.57, 0.77, 0.2],
    [1.15, 0.5, 0.64, 0.19], [2.0, 0.38, 0.49, 0.19], [3.0, 0.26, 0.35, 0.21], [4.0, 0.16, 0.25, 0.25], [4.72, 0.07, 0.15, 0.3],
  ];
  const SEG = 128;
  const lerpStation = (z: number) => {
    let i = 0; while (i < stations.length - 2 && stations[i + 1][0] < z) i++;
    const [z0, ...a] = stations[i], [z1, ...b] = stations[i + 1], t = Math.min(1, Math.max(0, (z - z0) / (z1 - z0))), e = t * t * (3 - 2 * t);
    return [z, ...a.map((v, k) => v + (b[k] - v) * (k < 2 ? e : t))] as [number, number, number, number];
  };
  const fine = Array.from({ length: 600 }, (_, i) => lerpStation(stations[0][0] + (i / 599) * (stations[stations.length - 1][0] - stations[0][0])));
  const fuseRings = fine.map(([z, w, h, cy]) => Array.from({ length: SEG }, (_, k) => {
    const a = (k / SEG) * TAU, cs = Math.cos(a), sn = Math.sin(a), e = 2 / 2.7;
    return new THREE.Vector3(w * Math.sign(cs) * Math.abs(cs) ** e, cy + h * Math.sign(sn) * Math.abs(sn) ** e, z);
  }));
  // the swoosh: low along the cowling, rising under the windows and up the tail cone toward the fin
  const swoosh = (z: number) => -0.2 + 0.55 * smooth(-1.5, 4.4, z);
  plane.add(loft(fuseRings, (p) => {
    const [, w, h, cy] = lerpStation(p.z), up = (p.y - cy) / h, side = Math.abs(p.x) > w * 0.55;
    if (p.z < -2.82) return "#d9dde3"; // spinner
    if (p.z < -2.68 && side && up > -0.4 && up < -0.05) return DARK; // cowling air intakes
    const windshield = p.z > -1.8 && p.z < -0.75 && up > 0.35;
    const door = p.z > -0.72 && p.z < 0.32 && up > 0.3 && up < 0.88 && side;
    const rearSide = p.z > 0.42 && p.z < 1.25 && up > 0.32 && up - (p.z - 0.42) * 0.25 < 0.86 && side;
    const rearWindow = p.z > 1.3 && p.z < 2.0 && up > 0.5;
    if (windshield || door || rearSide || rearWindow) return DARK;
    if (p.z > -0.74 && p.z < -0.7 && up < 0.3 && side) return SEAM; // door seams
    if (p.z > 0.34 && p.z < 0.38 && up < 0.3 && side) return SEAM;
    const sw = swoosh(p.z);
    if (up > sw && up < sw + 0.13) return RED;
    if (up > sw - 0.08 && up < sw - 0.04) return MAROON;
    return BODY;
  }));

  // wing: NACA 2412 sections, constant chord inboard then tapering, 1.7° dihedral, on top of the cabin
  const foil = naca(0.12, 0.02, 0.4, 64);
  const wingRing = (x: number, chord: number, zLE: number, y: number, t = 1) => foil.map(([u, v]) => new THREE.Vector3(x, y + v * chord * t, zLE + u * chord));
  const wingSpan = [-5.5, -5.35, ...Array.from({ length: 43 }, (_, i) => -5.25 + i * 0.25), 5.35, 5.5];
  plane.add(loft(wingSpan.map((x) => {
    const ax = Math.abs(x), chord = ax <= 2.6 ? 1.62 : 1.62 - (ax - 2.6) * 0.17, zLE = -1.05 + (1.62 - chord) * 0.25;
    return wingRing(x, ax > 5.4 ? chord * 0.8 : chord, zLE, 0.98 + ax * 0.03, ax > 5.4 ? 0.5 : 1);
  }), (p) => {
    // ailerons outboard and flaps inboard both hinge at about three quarters of the chord
    const ax = Math.abs(p.x), chord = ax <= 2.6 ? 1.62 : 1.62 - (ax - 2.6) * 0.17, u = (p.z - (-1.05 + (1.62 - chord) * 0.25)) / chord;
    if (ax > 0.6 && ax < 5.2 && u > 0.72 && u < 0.745) return SEAM;
    if (ax > 3.05 && ax < 3.1 && u > 0.72) return SEAM; // flap / aileron split
    return BODY;
  }));
  // wingtip navigation lights: red on the left, green on the right
  for (const [x, col] of [[-5.52, "#ff2a2a"], [5.52, "#2aff6a"]] as const) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshBasicMaterial({ color: col })); l.position.set(x, 1.15, -0.85); plane.add(l);
  }

  // tail: tapered horizontal stabiliser with an elevator seam, a swept fin carrying the swoosh, and the dorsal
  // fillet that runs forward from the fin along the top of the tail cone
  const tfoil = naca(0.09, 0, 0, 90);
  plane.add(loft([-1.75, -0.2, 0.2, 1.75].map((x) => {
    const chord = Math.abs(x) < 1 ? 0.85 : 0.55;
    return tfoil.map(([u, v]) => new THREE.Vector3(x, 0.32 + v * chord, 4.0 + (0.85 - chord) * 0.6 + u * chord));
  }), (p) => (p.z > 4.42 && p.z < 4.46 && Math.abs(p.x) > 0.2 ? SEAM : BODY)));
  // many thin slices so the slanted swoosh and pinstripe come out as clean lines
  const finY = Array.from({ length: 60 }, (_, i) => 0.3 + (i / 59) * 1.45);
  plane.add(loft(finY.map((y) => {
    const k = (y - 0.3) / 1.45, chord = 1.25 - k * 0.68, zLE = 3.45 + k * 1.0;
    return tfoil.map(([u, v]) => new THREE.Vector3(v * chord, y, zLE + u * chord));
  }), (p) => {
    const band = 0.62 + (p.z - 3.6) * 0.3;
    if (p.y > band && p.y < band + 0.16) return RED;
    if (p.y > band - 0.1 && p.y < band - 0.06) return MAROON;
    return BODY;
  }));
  const fillet = Array.from({ length: 14 }, (_, i) => {
    const z = 2.3 + (i / 13) * 1.3, [, , h, cy] = lerpStation(z), top = cy + h - 0.02, rise = 0.55 * smooth(2.3, 3.6, z) + 0.01;
    return Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * TAU, sn = Math.sin(a); return new THREE.Vector3(0.05 * Math.cos(a), top + (sn > 0 ? sn * rise : sn * 0.03), z); });
  });
  plane.add(loft(fillet, () => BODY));

  // registration on both sides of the tail cone, angled to follow its taper
  const reg = document.createElement("canvas"); reg.width = 512; reg.height = 96;
  const rc = reg.getContext("2d")!; rc.fillStyle = DARK; rc.font = "italic 700 78px Arial, sans-serif"; rc.textBaseline = "middle"; rc.fillText("N172AS", 8, 50);
  const regTex = new THREE.CanvasTexture(reg); regTex.colorSpace = THREE.SRGBColorSpace;
  for (const s of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.18), new THREE.MeshBasicMaterial({ map: regTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -4 }));
    decal.position.set(s * 0.335, 0.16, 2.5); decal.rotation.y = s * (Math.PI / 2 - 0.12); plane.add(decal);
  }

  // struts, fixed tricycle gear with wheel fairings
  const metal = plain(METAL), tyre = plain(DARK);
  for (const s of [-1, 1]) {
    plane.add(rod([s * 0.5, -0.38, -0.35], [s * 2.6, 0.95, -0.55], 0.035, metal));
    plane.add(rod([s * 0.45, -0.5, 0.05], [s * 1.25, -1.15, 0.1], 0.045, metal));
    const pant = new THREE.Mesh(new THREE.SphereGeometry(0.22, 40, 28), plain(BODY)); pant.scale.set(0.7, 0.95, 2.1); pant.position.set(s * 1.27, -1.2, 0.08); plane.add(pant);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 40), tyre); wheel.rotation.z = Math.PI / 2; wheel.position.set(s * 1.27, -1.28, 0.08); plane.add(wheel);
  }
  plane.add(rod([0, -0.45, -2.35], [0, -1.2, -2.4], 0.04, metal));
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 40), tyre); nose.rotation.z = Math.PI / 2; nose.position.set(0, -1.25, -2.4); plane.add(nose);

  // two-blade prop with painted tips, plus the faint disc a spinning prop leaves in a photo
  const prop = new THREE.Group(); prop.position.z = -3.05; plane.add(prop);
  for (const s of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.86, 0.03), plain(DARK)); blade.position.y = s * 0.5; blade.rotation.y = s * 0.35; prop.add(blade);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.031), plain("#e8e2d0")); tip.position.y = s * 0.95; tip.rotation.y = s * 0.35; prop.add(tip);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 48), new THREE.MeshBasicMaterial({ color: "#3a4150", transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  disc.position.z = -3.06; plane.add(disc);
  return { plane, prop };
}

// A seeded random generator so the painting comes out the same on every visit.
const seeded = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// The backdrop for the painted intro: a sunset sky with a low sun, banks of soft cloud lit from below, and
// thousands of faint brush strokes for texture.
function paintSky(W: number, H: number) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!, rnd = seeded(7), u = Math.max(W, H) / 1400;
  const g = c.createLinearGradient(0, 0, 0, H);
  [[0, "#2c4a78"], [0.35, "#6f95c4"], [0.62, "#e7c39f"], [0.8, "#ef9f6e"], [1, "#a85a55"]].forEach(([o, col]) => g.addColorStop(o as number, col as string));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const sun = c.createRadialGradient(W * 0.2, H * 0.74, 0, W * 0.2, H * 0.74, W * 0.55);
  sun.addColorStop(0, "rgba(255,226,170,.85)"); sun.addColorStop(0.15, "rgba(255,200,140,.45)"); sun.addColorStop(1, "rgba(255,180,120,0)");
  c.fillStyle = sun; c.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, col: string, a: number) => {
    const b = c.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, `rgba(${col},${a})`); b.addColorStop(1, `rgba(${col},0)`);
    c.save(); c.translate(x, y); c.scale(1.8, 0.7); c.translate(-x, -y); c.fillStyle = b; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  };
  for (let i = 0; i < 260; i++) {
    const band = rnd() < 0.5 ? 0.3 : 0.62, x = rnd() * W, y = H * (band + (rnd() - 0.5) * 0.22), r = (40 + rnd() * 130) * u;
    blob(x, y + r * 0.25, r, "120,70,100", 0.12 + rnd() * 0.1);
    blob(x, y, r * 0.85, y > H * 0.5 ? "255,214,180" : "240,236,240", 0.18 + rnd() * 0.22);
  }
  c.lineCap = "round";
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * W, y = rnd() * H, len = (6 + rnd() * 22) * u, a = (rnd() - 0.5) * 0.5;
    c.strokeStyle = rnd() < 0.5 ? `rgba(255,245,230,${0.03 + rnd() * 0.05})` : `rgba(40,30,60,${0.02 + rnd() * 0.04})`;
    c.lineWidth = (1 + rnd() * 3) * u;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
  }
  return cv;
}

type Cell = [number, number, string];

// The plane is rendered by three.js into a tiny offscreen target, one pixel per character cell, then read back
// and redrawn as glyphs: shading picks the glyph, paint picks the colour. Clouds and wind streaks fill the sky.
// The intro opens as a full-colour painting of the plane at sunset that breaks apart into ASCII as you scroll;
// after the intro the plane sits to the right of the content, and opening a row swaps it for that row's scene.
export default function AsciiPlane({ stunt, focus }: { stunt: { current: number }; focus: { current: string | null } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false, raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      await document.fonts?.ready;
      if (disposed) return;

      const gl = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: document.createElement("canvas") });
      const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
      const scene = new THREE.Scene();
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      scene.environment = new THREE.PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.45;
      scene.add(new THREE.HemisphereLight("#fff4e6", "#b89a8c", 0.9));
      const sun = new THREE.DirectionalLight("#ffe2c0", 2.6); sun.position.set(-6, 7, 5); scene.add(sun);
      const { plane, prop } = buildPlane(THREE);
      const rig = new THREE.Group(); rig.add(plane); scene.add(rig);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      camera.position.set(0, 9, 28.6); camera.lookAt(0, 0, 0);

      let W = 0, H = 0, cw = 7, ch = 13, cols = 0, rows = 0, dpr = 1, font = "";
      let buf = new Uint8Array(0), born: Float32Array = new Float32Array(0);
      const scene2d = document.createElement("canvas"), sc2 = scene2d.getContext("2d", { willReadFrequently: true })!;
      let scenePx = new Uint8ClampedArray(0), shown = 0, sceneId = "";
      let sky = document.createElement("canvas"), skyLum = new Float32Array(0), skyWarm = new Uint8Array(0);
      let colors = { ink: "#1b2433", plane: "#2f5d9b", accent: "#ff5a36", muted: "#9aa3b1" };
      const readColors = () => {
        const cs = getComputedStyle(document.documentElement);
        const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
        colors = { ink: v("--ink", colors.ink), plane: v("--plane", colors.plane), accent: v("--accent", colors.accent), muted: v("--faint", colors.muted) };
      };
      const resize = () => {
        W = window.innerWidth; H = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = W * dpr; canvas.height = H * dpr;
        const size = W < 700 ? 7 : 8;
        font = `${size}px ${getComputedStyle(document.body).getPropertyValue("--font-geist-mono") || "monospace"}`;
        ctx.font = font; cw = ctx.measureText("M").width; ch = Math.round(size * 1.18);
        cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
        rt.setSize(cols, rows); buf = new Uint8Array(cols * rows * 4);
        gl.setPixelRatio(dpr); gl.setSize(W, H, false);
        scene2d.width = cols; scene2d.height = rows;
        camera.aspect = (cols * cw) / (rows * ch); camera.updateProjectionMatrix();
        born = new Float32Array(cols * rows).map((_, i) => hash(i % cols, (i / cols) | 0));
        // the painting, and its brightness and warmth sampled once per character cell for the ASCII version
        sky = paintSky(W, H);
        const small = document.createElement("canvas"); small.width = cols; small.height = rows;
        const sc = small.getContext("2d", { willReadFrequently: true })!; sc.drawImage(sky, 0, 0, cols, rows);
        const px = sc.getImageData(0, 0, cols, rows).data;
        skyLum = new Float32Array(cols * rows); skyWarm = new Uint8Array(cols * rows);
        for (let i = 0; i < cols * rows; i++) { const R = px[i * 4], G = px[i * 4 + 1], B = px[i * 4 + 2]; skyLum[i] = (0.3 * R + 0.59 * G + 0.11 * B) / 255; skyWarm[i] = R > B + 20 ? 1 : 0; }
        readColors();
      };
      resize();

      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (e: PointerEvent) => { pointer.tx = e.clientX / W - 0.5; pointer.ty = e.clientY / H - 0.5; };
      const streaks = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), len: 3 + Math.random() * 9, v: 0.03 + Math.random() * 0.05 }));
      const mo = new MutationObserver(readColors);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", readColors);

      let last = performance.now(), time = 0, seen = stunt.current, stuntAt = -1e9;
      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        time += reduced ? 0 : dt;
        pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;

        // scroll drives three things: the painting breaking into ASCII (d), the ASCII painting fading to the
        // plain sky (art), and the plane moving from the centre to beside the content (k)
        // everything is measured from the intro section, which sits under the laptop hero; skip work while the
        // hero still covers the screen
        const introTop = document.getElementById("top")?.offsetTop ?? 0;
        if (window.scrollY < introTop - H) { raf = requestAnimationFrame(frame); return; }
        const y = Math.max(0, window.scrollY - introTop), sy = y / H;
        const d = smooth(0.02, 0.5, sy), art = 1 - smooth(0.55, 1, sy), k = smooth(0, 1, sy / 0.9);
        const max = document.documentElement.scrollHeight - H - introTop;
        const p = max > 0 ? y / max : 0;
        const halfH = Math.tan((camera.fov * Math.PI) / 360) * 30, halfW = halfH * camera.aspect;
        const wide = W >= 900;
        const span = Math.min(halfW * 2 * (wide ? 0.62 : 0.95), halfH * 2 * 1.25);
        const endSpan = wide ? Math.min(halfW * 0.85, halfH * 1.3) : span * 0.8;
        rig.scale.setScalar((span + (endSpan - span) * k) / 11);
        rig.position.set(wide ? halfW * 0.42 * k : 0, halfH * (0.18 + (wide ? -0.1 : 0.25) * k) + Math.sin(time * 0.9) * halfH * 0.02, 0);

        // heading swings slowly as you scroll; the pointer tips it a little; each stunt request is one barrel roll
        if (stunt.current !== seen) { seen = stunt.current; stuntAt = now; }
        const s = (now - stuntAt) / 1600, roll = s > 0 && s < 1 ? TAU * (s * s * (3 - 2 * s)) : 0;
        plane.rotation.set(0.05 + pointer.y * 0.3 + Math.sin(time * 0.7) * 0.03, -Math.PI / 2 - 0.85 + Math.sin(p * TAU) * 0.45 + pointer.x * 0.5, Math.sin(time * 0.5) * 0.08 - pointer.x * 0.2, "YXZ");
        plane.rotateZ(roll);
        prop.rotation.z += dt * 40;

        // the open row's scene fades in where the plane was; the plane fades out while it shows
        const want = focus.current && SCENES[focus.current] ? focus.current : "";
        if (want) sceneId = want;
        shown += ((want ? 1 : 0) - shown) * Math.min(1, dt * 5);
        if (shown > 0.01 && sceneId) {
          sc2.setTransform(1, 0, 0, 1, 0, 0); sc2.fillStyle = "#000"; sc2.fillRect(0, 0, cols, rows);
          sc2.setTransform(cols / W, 0, 0, rows / H, 0, 0);
          const bx = wide ? Math.max(500, W * 0.45) : W * 0.08, bw = (wide ? W * 0.94 : W * 0.92) - bx;
          const by = wide ? H * 0.2 : H * 0.06, bh = Math.min(wide ? H * 0.6 : H * 0.3, bw * 0.8);
          SCENES[sceneId](sc2, bx, by, bw, bh, time);
          scenePx = sc2.getImageData(0, 0, cols, rows).data;
        }

        gl.setClearColor(0x000000, 0);
        gl.setRenderTarget(rt); gl.clear(); gl.render(scene, camera);
        gl.readRenderTargetPixels(rt, 0, 0, cols, rows, buf);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        if (d < 1) {
          gl.setRenderTarget(null); gl.clear(); gl.render(scene, camera);
          ctx.globalAlpha = 1 - d;
          ctx.drawImage(sky, 0, 0, W, H);
          ctx.drawImage(gl.domElement, 0, 0, W, H);
          ctx.globalAlpha = 1;
        }

        const inkCells: Cell[] = [], planeCells: Cell[] = [], accentCells: Cell[] = [], skyCells: Cell[] = [];
        const coolArt: Cell[] = [], warmArt: Cell[] = [], coolScene: Cell[] = [], warmScene: Cell[] = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = r * cols + c, o = ((rows - 1 - r) * cols + c) * 4;
          const x = c * cw, y = r * ch;
          // while the painting is fading out, cells flicker through random glyphs before settling
          const settling = d < 1 && born[i] > d;
          if (shown > 0.01) {
            const R = scenePx[i * 4], G = scenePx[i * 4 + 1], B = scenePx[i * 4 + 2], lum = Math.max(R, G, B) / 255;
            if (lum > 0.12) (R > B ? warmScene : coolScene).push([x, y, RAMP[Math.floor((1 - lum) * (RAMP.length - 1))]]);
          }
          if (buf[o + 3] > 40) {
            const R = buf[o], G = buf[o + 1], B = buf[o + 2], lum = (0.3 * R + 0.59 * G + 0.11 * B) / 255;
            const g = settling ? SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0] : RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.floor((1 - Math.min(1, lum * 1.15)) * RAMP.length)))];
            if (R > G * 1.6 && R > B * 1.8) accentCells.push([x, y, g]);
            else if (lum < 0.1) inkCells.push([x, y, "@"]);
            else planeCells.push([x, y, g]);
            continue;
          }
          if (wide && x < 480 * k) continue; // keep the sky out from behind the text column
          if (art > 0) {
            const t = Math.min(1, Math.max(0, (skyLum[i] - 0.25) / 0.55));
            const g = settling ? (Math.random() < 0.5 ? SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0] : "") : SKY[Math.floor((1 - t) * (SKY.length - 1))];
            if (g) (skyWarm[i] ? warmArt : coolArt).push([x, y, g]);
          }
          if (art < 1) {
            const n = noise(c * 0.045 + time * 0.25, r * 0.11) * 0.65 + noise(c * 0.11 + time * 0.4, r * 0.27) * 0.35;
            if (n > 0.66) skyCells.push([x, y, n > 0.72 ? ":" : "."]);
          }
        }
        if (art < 1) for (const st of streaks) {
          st.x += st.v * dt * (reduced ? 0 : 1);
          if (st.x > 1.1) { st.x = -0.1; st.y = Math.random(); }
          const c0 = Math.floor(st.x * cols), r0 = Math.floor(st.y * rows);
          for (let j = 0; j < st.len; j++) if (!(wide && (c0 - j) * cw < 480 * k)) skyCells.push([(c0 - j) * cw, r0 * ch, j === 0 ? "-" : "–"]);
        }

        ctx.font = font; ctx.textBaseline = "top";
        const draw = (cells: Cell[], color: string, alpha: number) => { if (alpha <= 0) return; ctx.globalAlpha = alpha; ctx.fillStyle = color; for (const [x, y, g] of cells) ctx.fillText(g, x, y); };
        const fade = (wide ? 1 : 1 - k * 0.92) * (1 - shown);
        draw(coolArt, colors.plane, art * d * 0.7);
        draw(warmArt, colors.accent, art * d * 0.7);
        draw(skyCells, colors.muted, 0.55 * (1 - art));
        draw(planeCells, colors.plane, fade * d);
        draw(inkCells, colors.ink, fade * d);
        draw(accentCells, colors.accent, fade * d);
        draw(coolScene, colors.plane, shown * (wide ? 1 : 0.35));
        draw(warmScene, colors.accent, shown * (wide ? 1 : 0.35));
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanup = () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        mo.disconnect(); mq.removeEventListener("change", readColors);
        rt.dispose(); gl.dispose();
      };
    })();

    return () => { disposed = true; cancelAnimationFrame(raf); cleanup(); };
  }, [stunt, focus]);
  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
