"use client";

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";

type Scene = "printer" | "wing";
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

export default function Viewer({ kind, label }: { kind: Scene; label: string }) {
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

      const s = kind === "printer" ? printerScene(THREE, RoundedBoxGeometry as never, ParametricGeometry as never, scene, renderer) : wingScene(THREE, scene);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
      camera.position.copy(s.camera);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(s.target);
      controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
      controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.5;
      controls.autoRotate = true; controls.autoRotateSpeed = 0.6;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
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
        s.update(dt, reduce);
        if (reduce) controls.autoRotate = false;
        controls.update();
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
  }, [kind]);

  return <div className="viewer" ref={host} role="img" aria-label={label} />;
}
