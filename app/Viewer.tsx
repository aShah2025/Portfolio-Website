"use client";

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";

type Scene = "printer" | "wing" | "desk" | "mac" | "flight";
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

function wingScene(THREE: T, scene: THREE_NS.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const naca = (t: number, m: number, p: number, n: number) => {
    const up: [number, number][] = [], lo: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const x = (1 - Math.cos((i / n) * Math.PI)) / 2;
      const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
      const yc = x < p ? (m / (p * p)) * (2 * p * x - x * x) : (m / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * x - x * x);
      const dyc = x < p ? ((2 * m) / (p * p)) * (p - x) : ((2 * m) / ((1 - p) ** 2)) * (p - x);
      const th = Math.atan(dyc);
      up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]); lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
    }
    return [...up, ...lo.reverse().slice(1)];
  };
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

function buildMac(THREE: T, RoundedBoxGeometry: new (w: number, h: number, d: number, seg: number, r: number) => THREE_NS.BufferGeometry) {
  const mat = (color: string, rough = 0.5, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const silver = mat("#b4b7bb", 0.32, 1), dark = mat("#1b1c1f", 0.6), key = mat("#25272b", 0.55), pad = mat("#a3a6aa", 0.35, 1);
  const rb = (w: number, h: number, d: number, m: THREE_NS.Material, r = 0.15) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); o.castShadow = o.receiveShadow = true; return o; };
  const mac = new THREE.Group();

  const base = rb(15, 0.5, 10.4, silver, 0.2); base.position.y = 0.25; mac.add(base);
  const deck = rb(14.2, 0.06, 5.7, dark, 0.05); deck.position.set(0, 0.52, -1.9); mac.add(deck);
  const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.82, 0.14, 0.82, 2, 0.05), key, 6 * 14);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) { m4.makeTranslation(-6.2 + c * 0.95, 0.6, -4.2 + r * 0.95); keys.setMatrixAt(n++, m4); }
  keys.castShadow = true; mac.add(keys);
  const trackpad = rb(5.4, 0.05, 3.4, pad, 0.1); trackpad.position.set(0, 0.52, 3.4); mac.add(trackpad);

  const lid = new THREE.Group(); lid.position.set(0, 0.5, -5.2); lid.rotation.x = -THREE.MathUtils.degToRad(104); mac.add(lid);
  const shell = rb(15, 0.35, 10.4, silver, 0.15); shell.position.set(0, 0.17, 5.2); lid.add(shell);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 9.8), new THREE.MeshBasicMaterial({ color: "#0b0c0e" })); bezel.rotation.x = Math.PI / 2; bezel.position.set(0, -0.03, 5.2); lid.add(bezel);

  const c = document.createElement("canvas"); c.width = 1280; c.height = 800;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f2832"; g.fillRect(0, 0, 1280, 800);
  g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(0, 0, 1280, 56);
  ["#a5654c", "#c9bca0", "#a8b39a"].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(40 + i * 30, 28, 8, 0, TAU); g.fill(); });
  g.fillStyle = "#ece8df"; g.font = "700 130px Helvetica, Arial, sans-serif"; g.fillText("Aaditya", 80, 300); g.fillText("Shah.", 80, 430);
  g.fillStyle = "rgba(236,232,223,.6)"; g.font = "500 30px Helvetica, Arial, sans-serif"; g.fillText("Apps, games, and whatever I want to learn next.", 84, 500);
  const cards: [string, string][] = [["#c98a6e", "Wayfinder"], ["#9aa7ad", "CultureRisk"], ["#a8b39a", "Sum"]];
  cards.forEach(([col, label], i) => { g.fillStyle = col; g.fillRect(84 + i * 360, 580, 330, 110); g.fillStyle = "#16120f"; g.font = "700 34px Helvetica, Arial, sans-serif"; g.fillText(label, 108 + i * 360, 646); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(14.1, 8.8), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); screen.rotation.x = Math.PI / 2; screen.position.set(0, -0.05, 5.2); lid.add(screen);

  return { mac, lid, mat };
}

function deskScene(THREE: T, RoundedBoxGeometry: new (w: number, h: number, d: number, seg: number, r: number) => THREE_NS.BufferGeometry, scene: THREE_NS.Scene) {
  const { mac, lid, mat } = buildMac(THREE, RoundedBoxGeometry);
  void lid;
  const root = new THREE.Group(); scene.add(root); root.add(mac);

  // small solar system hovering beside the laptop
  const sys = new THREE.Group(); sys.position.set(12.5, 9, 1); sys.rotation.z = 0.32; root.add(sys);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 32), new THREE.MeshStandardMaterial({ color: "#e3d4ae", emissive: "#d9c590", emissiveIntensity: 1.1, roughness: 0.6 })); sys.add(sun);
  const glow = new THREE.PointLight("#f3e3bd", 18, 26, 2); sys.add(glow);
  const defs = [{ r: 0.28, o: 2.3, s: 0.9, c: "#a5654c" }, { r: 0.42, o: 3.5, s: 0.6, c: "#8fa3b3" }, { r: 0.52, o: 4.8, s: 0.4, c: "#a8b39a", ring: true }, { r: 0.32, o: 6.1, s: 0.26, c: "#c9bca0" }];
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
  const screenC = new THREE.Vector3(0, 5.5, -6.55);
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

function flightScene(THREE: T, RoundedBoxGeometry: new (w: number, h: number, d: number, seg: number, r: number) => THREE_NS.BufferGeometry, scene: THREE_NS.Scene) {
  const SKY = "#9aa5ad";
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 300);
  const mat = (color: string, rough = 0.55, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const rb = (w: number, h: number, d: number, m: THREE_NS.Material, r = 0.08) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);

  // --- airplane (high-wing single-engine trainer), nose toward -z
  const plane = new THREE.Group(); scene.add(plane);
  const body = new THREE.Group(); plane.add(body);
  const white = mat("#e8e6e0", 0.4), stripe = mat("#a5654c", 0.5), glass = new THREE.MeshStandardMaterial({ color: "#2a3a44", roughness: 0.1, metalness: 0.2 }), grey = mat("#55595f", 0.5);
  const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 3.6, 8, 24), white); fuse.rotation.x = Math.PI / 2; fuse.scale.set(1, 1, 0.9); body.add(fuse);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.12, 3.2, 20), white); tail.rotation.x = -Math.PI / 2; tail.position.z = 3.4; tail.position.y = 0.1; body.add(tail);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.22, 24, 1, true), stripe); band.rotation.x = Math.PI / 2; band.position.z = 0.4; band.scale.set(1, 1, 0.9); body.add(band);
  const cabin = rb(1.1, 0.55, 1.7, glass, 0.2); cabin.position.set(0, 0.5, -0.5); body.add(cabin);
  const wing = rb(10, 0.14, 1.7, white, 0.06); wing.position.set(0, 0.95, -0.4); body.add(wing);
  const wingTip = (x: number) => { const t = rb(0.5, 0.15, 1.7, stripe, 0.06); t.position.set(x, 0.95, -0.4); body.add(t); };
  wingTip(-5.1); wingTip(5.1);
  for (const x of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), grey); st.position.set(x * 1.9, 0.0, -0.3); st.rotation.z = x * 0.9; body.add(st); }
  const hstab = rb(3.4, 0.1, 0.8, white, 0.04); hstab.position.set(0, 0.2, 4.8); body.add(hstab);
  const fin = rb(0.1, 1.2, 0.95, white, 0.04); fin.position.set(0, 0.8, 4.75); fin.rotation.x = -0.25; body.add(fin);
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.55, 0.9, 24), grey); cowl.rotation.x = Math.PI / 2; cowl.position.z = -2.25; body.add(cowl);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 20), stripe); spinner.rotation.x = -Math.PI / 2; spinner.position.z = -2.95; body.add(spinner);
  const prop = new THREE.Group(); prop.position.z = -2.75; body.add(prop);
  const blade = rb(0.16, 2.7, 0.05, mat("#1c1d20", 0.6), 0.02); prop.add(blade);
  const gear = new THREE.Group(); body.add(gear);
  for (const [x, z] of [[-0.9, -0.6], [0.9, -0.6], [0, -2]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), grey); leg.position.set(x, -0.8, z); gear.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 20), mat("#1c1d20", 0.8)); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, -1.25, z); gear.add(wheel);
  }
  body.traverse((o) => { (o as THREE_NS.Mesh).castShadow = false; });

  // --- terrain scrolls under the plane
  const LEN = 760, WID = 340;
  const terrain = new THREE.Group(); scene.add(terrain);
  const geo = new THREE.PlaneGeometry(WID, LEN, 110, 260);
  geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -LEN / 2 + 120);
  const posAttr = geo.attributes.position as THREE_NS.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const col = new THREE.Color();
  const END = -560;
  const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), z = posAttr.getZ(i);
    let h = 7 * Math.sin(x * 0.03 + 1.3) * Math.cos(z * 0.021) + 4 * Math.sin(x * 0.07 + z * 0.045) + 2 * Math.sin(z * 0.11 - x * 0.06) + 9 * Math.max(0, Math.sin(z * 0.012 + x * 0.008));
    const flat = Math.min(sm(14, 60, Math.abs(x)) + sm(35, 120, Math.min(Math.abs(z), Math.abs(z - END))), 1);
    h = h * flat * (0.4 + 0.6 * sm(0, 40, Math.abs(x))) + (1 - flat) * 0;
    posAttr.setY(i, h);
    col.set(h > 9 ? "#8c8a80" : h > 4 ? "#a1a58b" : h > 0.6 ? "#8f9d7f" : "#7f8f78");
    col.offsetHSL(0, 0, (Math.sin(x * 0.4) * Math.cos(z * 0.4)) * 0.015);
    colors.set([col.r, col.g, col.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  terrain.add(land);
  const runway = (z: number) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 90), mat("#3a3d42", 0.9)); r.position.set(0, 0.05, z); terrain.add(r);
    for (let i = -4; i <= 4; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 5), mat("#e8e6e0", 0.8)); d.position.set(0, 0.08, z + i * 9); terrain.add(d); }
  };
  runway(-5); runway(END + 5);
  // clouds
  const cloudM = new THREE.MeshStandardMaterial({ color: "#f1efe8", roughness: 1, transparent: true, opacity: 0.9, flatShading: true });
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + Math.random() * 3, 1), cloudM); b.position.set((k - 2) * 4 + Math.random() * 2, Math.random() * 2, Math.random() * 3); b.scale.y = 0.55; g.add(b); }
    g.position.set((Math.random() - 0.5) * 220, 30 + Math.random() * 14, -Math.random() * 640 + 80); terrain.add(g);
  }

  const DIST = 540;
  const alt01 = (p: number) => sm(0.14, 0.4, p) * (1 - sm(0.72, 0.94, p));
  const update = (dt: number, _still: boolean, p: number) => {
    const a = alt01(p), ahead = alt01(Math.min(1, p + 0.01)), climbing = ahead - a;
    terrain.position.z = p * DIST;
    plane.position.y = 1.7 + a * 22;
    plane.rotation.x = THREE.MathUtils.clamp(climbing * 90, -0.35, 0.4) * -1;
    plane.rotation.z = Math.sin(p * 14) * 0.2 * sm(0.2, 0.3, p) * (1 - sm(0.7, 0.8, p));
    prop.rotation.z += dt * 40;
    gear.visible = a < 0.08 || p > 0.9;
  };
  const frame = (camera: THREE_NS.PerspectiveCamera, p: number, aspect: number) => {
    const f = Math.max(1, 1.2 / aspect);
    const y = plane.position.y;
    const az = THREE.MathUtils.lerp(0.9, -0.5, p) + Math.sin(p * 5) * 0.12;
    const rad = (16 + 5 * Math.sin(p * Math.PI)) * f;
    camera.position.set(Math.sin(az) * rad, y + 3.2 + 3 * Math.sin(p * Math.PI), Math.cos(az) * rad);
    camera.lookAt(0, y + 0.2, 0);
  };
  return { update, frame, target: new THREE.Vector3(0, 2, 0), camera: new THREE.Vector3(14, 5, 14), scripted: true, ft: (p: number) => Math.round(alt01(p) * 3500) };
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
      if (disposed) return;
      let renderer: THREE_NS.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);
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
        : kind === "flight" ? flightScene(THREE, RoundedBoxGeometry as never, scene)
        : wingScene(THREE, scene);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
      camera.position.copy(s.camera);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(s.target);
      controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
      controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.5;
      if (kind === "mac" || kind === "flight") controls.enabled = false;
      controls.autoRotate = kind !== "desk"; controls.autoRotateSpeed = 0.6;
      if (kind === "desk") { controls.minAzimuthAngle = -0.7; controls.maxAzimuthAngle = 0.9; controls.minPolarAngle = 1.0; controls.maxPolarAngle = 1.55; }

      const offset = s.camera.clone().sub(s.target);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
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
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls.dispose(); pmrem.dispose();
        scene.traverse((o) => { const m = o as THREE_NS.Mesh; if (m.geometry) m.geometry.dispose(); });
        renderer.dispose(); renderer.domElement.remove();
      };
    })();
    return () => { disposed = true; cleanup(); };
  }, [kind, progress]);

  return <div className="viewer" ref={host} role="img" aria-label={label} />;
}
