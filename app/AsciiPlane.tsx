"use client";

import { useEffect, useRef } from "react";
import { SCENES } from "./asciiScenes";
import { disposeFlightModel, loadCessna172 } from "./cessna172";
import { TAKEOFF_MS, type FlightState } from "./flight";
import { createRunway } from "./runway";

const TAU = Math.PI * 2;
const PARKING_YAW = Math.PI / 2 + 0.68;
const FRAME_MS = 1000 / 30;
const RAMP = ".,:;i!+*#%@";
const GLYPHS = [...new Set(`${RAMP}-`)].join("");
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Painted only when the viewport changes. The runway is rendered in front of this evening sky.
function paintSky(W: number, H: number) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!, rnd = seeded(7), unit = Math.max(W, H) / 1400;
  const gradient = c.createLinearGradient(0, 0, 0, H);
  [[0, "#283f60"], [0.4, "#7f9bb8"], [0.7, "#edc19a"], [1, "#b57564"]].forEach(([at, color]) => gradient.addColorStop(at as number, color as string));
  c.fillStyle = gradient; c.fillRect(0, 0, W, H);
  const sun = c.createRadialGradient(W * 0.18, H * 0.66, 0, W * 0.18, H * 0.66, W * 0.5);
  sun.addColorStop(0, "rgba(255,223,168,.65)"); sun.addColorStop(0.2, "rgba(255,206,155,.25)"); sun.addColorStop(1, "rgba(255,180,120,0)");
  c.fillStyle = sun; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 180; i++) {
    const x = rnd() * W, y = H * ((rnd() < 0.5 ? 0.24 : 0.48) + (rnd() - 0.5) * 0.18), r = (35 + rnd() * 110) * unit;
    const cloud = c.createRadialGradient(x, y, 0, x, y, r);
    cloud.addColorStop(0, `rgba(245,226,211,${0.1 + rnd() * 0.13})`); cloud.addColorStop(1, "rgba(245,226,211,0)");
    c.save(); c.translate(x, y); c.scale(2, 0.5); c.translate(-x, -y); c.fillStyle = cloud; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  return cv;
}

type Props = {
  stunt: { current: number };
  focus: { current: string | null };
  flight: { current: FlightState };
  onReady: () => void;
  onFlightComplete: () => void;
};

export default function AsciiPlane({ stunt, focus, flight, onReady, onFlightComplete }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let disposed = false, raf = 0;
    const abort = new AbortController(), disposers: (() => void)[] = [];
    const cleanup = () => { while (disposers.length) disposers.pop()!(); };

    const initialise = async () => {
      const [THREE, { RoomEnvironment }] = await Promise.all([
        import("three"), import("three/examples/jsm/environments/RoomEnvironment.js"), document.fonts.ready,
      ]);
      if (disposed) return;
      const { plane, prop } = await loadCessna172(THREE, abort.signal);
      if (disposed) { disposeFlightModel(THREE, plane); return; }
      disposers.push(() => disposeFlightModel(THREE, plane));
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reduced = motion.matches;
      const gl = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: document.createElement("canvas") });
      disposers.push(() => gl.dispose());
      gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.95;
      // At 2px, one MSAA-resolved pixel per character already samples much finer than the old 4px grid.
      const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
      rt.texture.colorSpace = THREE.SRGBColorSpace; rt.scissorTest = true;
      disposers.push(() => rt.dispose());
      const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(gl), room = new RoomEnvironment();
      let environment: ReturnType<typeof pmrem.fromScene>;
      try { environment = pmrem.fromScene(room, 0.04); }
      finally { room.dispose(); pmrem.dispose(); }
      disposers.push(() => environment.dispose());
      scene.environment = environment.texture; scene.environmentIntensity = 0.5;
      scene.add(new THREE.HemisphereLight("#e8f0ff", "#8e6c58", 1));
      const sun = new THREE.DirectionalLight("#ffe2c0", 2.6); sun.position.set(-6, 7, 5); scene.add(sun);
      const fill = new THREE.DirectionalLight("#a9c9ff", 0.8); fill.position.set(5, 2, -6); scene.add(fill);
      const rig = new THREE.Group(); rig.add(plane); scene.add(rig);
      const runway = createRunway(THREE); scene.add(runway.group); disposers.push(runway.dispose);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
      camera.position.set(0, 7.2, 29.1); camera.lookAt(0, 0, 0);

      // A cached local box avoids traversing all the CAD meshes or reading the entire screen each frame.
      const localBounds = new THREE.Box3().setFromObject(plane);
      const corners = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(i & 1 ? localBounds.max.x : localBounds.min.x, i & 2 ? localBounds.max.y : localBounds.min.y, i & 4 ? localBounds.max.z : localBounds.min.z));
      const projected = new THREE.Vector3();
      let W = 0, H = 0, cw = 0, ch = 0, cols = 0, rows = 0, dpr = 1, font = "", tileW = 0, tileH = 0, needsDraw = true;
      let buf: Uint8Array<ArrayBuffer> = new Uint8Array(0);
      const scene2d = document.createElement("canvas"), sc2 = scene2d.getContext("2d", { willReadFrequently: true })!;
      const clouds = document.createElement("canvas"), cloudCtx = clouds.getContext("2d")!;
      const atlas = document.createElement("canvas"), ac = atlas.getContext("2d")!;
      let shown = 0, sceneId = "", sky = document.createElement("canvas");
      const pointer = { x: 0, y: 0, tx: 0, ty: 0 }, rnd = seeded(21);
      const streaks = Array.from({ length: 12 }, () => ({ x: rnd(), y: rnd(), len: 16 + rnd() * 35, v: 0.025 + rnd() * 0.035 }));
      let palette = ["#92abd2", "#e7eef8", "#ff876c", "#5d80b1", "#354154", "#7aa2f7", "#ff7a5c"];
      const glyphIndex = new Map([...GLYPHS].map((g, i) => [g, i]));
      const glyph = (target: CanvasRenderingContext2D, x: number, y: number, g: string, tone: number) => {
        const index = glyphIndex.get(g);
        if (index === undefined) return;
        target.drawImage(atlas, index * tileW, tone * tileH, tileW, tileH, x, y, tileW / dpr, tileH / dpr);
      };
      const buildAtlas = () => {
        atlas.width = tileW * GLYPHS.length; atlas.height = tileH * palette.length;
        ac.setTransform(dpr, 0, 0, dpr, 0, 0); ac.font = font; ac.textBaseline = "middle";
        palette.forEach((color, tone) => {
          ac.fillStyle = color;
          for (let i = 0; i < GLYPHS.length; i++) ac.fillText(GLYPHS[i], i * tileW / dpr, (tone + 0.5) * tileH / dpr);
        });
      };
      const paintClouds = () => {
        clouds.width = canvas.width; clouds.height = canvas.height;
        cloudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const strideX = Math.max(1, Math.round(8 / cw)), strideY = Math.max(1, Math.round(8 / ch));
        for (let r = 0; r < rows; r += strideY) for (let c = 0; c < cols; c += strideX) {
          const x = c * cw, y = r * ch;
          const n = noise(x * 0.009, y * 0.012) * 0.7 + noise(x * 0.027, y * 0.032) * 0.3;
          if (n > 0.68) glyph(cloudCtx, x, y, n > 0.75 ? ":" : ".", 4);
        }
      };
      const readColors = () => {
        const cs = getComputedStyle(document.documentElement);
        palette = [palette[0], palette[1], cs.getPropertyValue("--accent").trim() || palette[2], palette[3], cs.getPropertyValue("--faint").trim() || palette[4], cs.getPropertyValue("--plane").trim() || palette[5], cs.getPropertyValue("--accent").trim() || palette[6]];
        buildAtlas(); paintClouds(); needsDraw = true;
      };
      const resize = () => {
        W = window.innerWidth; H = window.innerHeight;
        // Bound all three backing stores on large Retina screens as well as the ASCII grid.
        dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(8_000_000 / (W * H)));
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        // Ordinary desktop and mobile screens use true 2px letters. Only ultrawide screens scale up.
        const size = W > 2200 || H > 1600 ? Math.max(2, W / 2200 * 2, Math.sqrt(W * H / 800000) / 0.85) : 2;
        font = `500 ${size}px ${getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace"}`;
        ctx.font = font; cw = ctx.measureText("M").width; ch = size * 1.22;
        tileW = Math.ceil(cw * dpr); tileH = Math.ceil(ch * dpr);
        cols = Math.ceil(W / cw); rows = Math.ceil(H / ch); rt.setSize(cols, rows);
        gl.setPixelRatio(dpr); gl.setSize(W, H, false);
        camera.aspect = W / H; camera.updateProjectionMatrix();
        sky = paintSky(W, H); readColors();
      };
      resize();

      const onMove = (e: PointerEvent) => { pointer.tx = e.clientX / W - 0.5; pointer.ty = e.clientY / H - 0.5; };
      const onMotion = () => { reduced = motion.matches; needsDraw = true; };
      const observer = new MutationObserver(readColors); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      disposers.push(() => observer.disconnect());
      let last = performance.now(), drawnAt = -Infinity, time = 0, propAngle = 0.35, seen = stunt.current, stuntAt = -1e9, completedAt = -1, ready = false;
      let previousPhase = "", previousFocus: string | null = null, previousScroll = -1;
      const frame = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        if (document.hidden || now - drawnAt < FRAME_MS - 0.1) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        drawnAt = now - (Number.isFinite(drawnAt) ? (now - drawnAt) % FRAME_MS : 0);
        const state = flight.current;
        let phase = state.phase;
        const progress = phase === "takeoff" ? (reduced ? 1 : Math.min(1, Math.max(0, (now - state.startedAt) / TAKEOFF_MS))) : phase === "portfolio" ? 1 : 0;
        if (phase === "takeoff" && progress >= 1) {
          if (completedAt !== state.startedAt) { completedAt = state.startedAt; onFlightComplete(); }
          phase = "portfolio";
        }
        const changed = phase !== previousPhase || focus.current !== previousFocus || window.scrollY !== previousScroll;
        if (!changed && !needsDraw && (phase === "runway" || reduced)) return;
        if (phase === "runway" && previousPhase !== phase) { propAngle = 0.35; pointer.x = 0; pointer.y = 0; shown = 0; }
        previousPhase = phase; previousFocus = focus.current; previousScroll = window.scrollY; needsDraw = false;
        time += reduced || phase === "runway" ? 0 : dt;
        const follow = 1 - Math.exp(-dt * 5);
        pointer.x += (pointer.tx - pointer.x) * follow; pointer.y += (pointer.ty - pointer.y) * follow;

        const k = phase === "portfolio" ? 1 : phase === "takeoff" ? smooth(0.54, 1, progress) : 0;
        const d = phase === "portfolio" ? 1 : phase === "takeoff" ? smooth(0.58, 0.98, progress) : 0;
        camera.position.set(0, mix(3.8, 7.2, k), mix(29.75, 29.1, k));
        camera.lookAt(0, 0, 0);
        const halfH = Math.tan(camera.fov * Math.PI / 360) * 30, halfW = halfH * camera.aspect, wide = W >= 900;
        const parkingSpan = Math.min(halfW * 2 * (wide ? 0.66 : 0.93), halfH * 2 * 1.18), parkingScale = parkingSpan / 11;
        const textEdge = wide ? Math.min(440, W * 0.39) + 28 : 0;
        const endSpan = wide ? Math.min((W - textEdge) / W * halfW * 1.75, halfH * 1.45) : parkingSpan * 0.8;
        const parkingY = halfH * 0.12, endY = halfH * (wide ? 0.08 : 0.43);
        const lift = phase === "takeoff" ? smooth(0.25, 0.76, progress) : 0;
        rig.scale.setScalar(mix(parkingScale, endSpan / 11, k));
        rig.position.set(wide ? halfW * textEdge / W * k : 0, mix(parkingY + lift * halfH * 0.28, endY, k) + (reduced ? 0 : Math.sin(time * 0.9) * halfH * 0.015 * k), 0);
        runway.group.rotation.y = PARKING_YAW;
        runway.group.position.set(0, parkingY, 0); runway.group.scale.setScalar(parkingScale);
        if (phase !== "portfolio") runway.update(phase === "takeoff" ? 70 * progress * progress : 0);
        runway.setOpacity(phase === "runway" ? 1 : phase === "takeoff" ? 1 - smooth(0.45, 0.87, progress) : 0);
        runway.group.visible = phase !== "portfolio" && d < 1;
        const scroll = Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - H));
        if (stunt.current !== seen) { seen = stunt.current; if (phase === "portfolio") stuntAt = now; }
        const stuntProgress = (now - stuntAt) / 1800;
        const roll = !reduced && phase === "portfolio" && stuntProgress > 0 && stuntProgress < 1 ? TAU * smooth(0, 1, stuntProgress) : 0;
        const pitch = 0.18 * smooth(0.25, 0.55, progress) * (phase === "takeoff" ? 1 - k : 0);
        plane.rotation.set(pitch + k * (0.04 + (reduced ? 0 : pointer.y * 0.2 + Math.sin(time * 0.7) * 0.025)), PARKING_YAW + k * (Math.sin(scroll * TAU) * 0.38 + (reduced ? 0 : pointer.x * 0.38)), k * (reduced ? 0 : Math.sin(time * 0.5) * 0.055 - pointer.x * 0.12), "YXZ");
        plane.rotateZ(roll);
        if (phase !== "runway" && !reduced) propAngle += dt * (phase === "takeoff" ? 8 + 70 * smooth(0, 0.5, progress) : 55);
        prop.rotation.z = propAngle;

        const want = phase === "portfolio" && focus.current && SCENES[focus.current] ? focus.current : "";
        if (want) sceneId = want;
        shown = reduced ? (want ? 1 : 0) : shown + ((want ? 1 : 0) - shown) * Math.min(1, dt * 6);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        gl.setClearColor(0x000000, 0);
        if (d < 1) {
          gl.setRenderTarget(null); gl.clear(); gl.render(scene, camera);
          ctx.globalAlpha = 1 - d; ctx.drawImage(sky, 0, 0, W, H); ctx.drawImage(gl.domElement, 0, 0, W, H); ctx.globalAlpha = 1;
        }
        if (d > 0) {
          // Clouds are cached at an 8px screen spacing; their glyphs use the same 2px atlas as the plane.
          const clip = textEdge * k;
          ctx.globalAlpha = d * 0.6;
          ctx.drawImage(clouds, clip * dpr, 0, (W - clip) * dpr, H * dpr, clip, 0, W - clip, H);
          for (const streak of streaks) {
            if (!reduced) streak.x += streak.v * dt;
            if (streak.x > 1.1) { streak.x = -0.1; streak.y = rnd(); }
            for (let j = 0; j < streak.len; j += cw * 2) {
              const px = streak.x * W - j;
              if (px >= clip) glyph(ctx, px, Math.floor(streak.y * rows) * ch, "-", 4);
            }
          }
          ctx.globalAlpha = 1;
        }

        const fade = d * (1 - shown) * (wide ? 1 : mix(1, 0.7, k));
        if (fade > 0.005) {
          rig.updateMatrixWorld(true); camera.updateMatrixWorld();
          let left = cols, right = 0, top = rows, bottom = 0;
          for (const corner of corners) {
            projected.copy(corner).applyMatrix4(plane.matrixWorld).project(camera);
            const col = (projected.x * 0.5 + 0.5) * cols, row = (-projected.y * 0.5 + 0.5) * rows;
            left = Math.min(left, col); right = Math.max(right, col); top = Math.min(top, row); bottom = Math.max(bottom, row);
          }
          left = Math.max(0, Math.floor(left) - 3); right = Math.min(cols, Math.ceil(right) + 3);
          top = Math.max(0, Math.floor(top) - 3); bottom = Math.min(rows, Math.ceil(bottom) + 3);
          const width = Math.max(0, right - left), height = Math.max(0, bottom - top);
          if (width && height) {
            const byteLength = width * height * 4;
            if (buf.length < byteLength) buf = new Uint8Array(byteLength);
            rt.scissor.set(left, rows - bottom, width, height);
            runway.group.visible = false;
            gl.setRenderTarget(rt); gl.clear(); gl.render(scene, camera);
            gl.readRenderTargetPixels(rt, left, rows - bottom, width, height, buf);
            ctx.globalAlpha = fade;
            for (let r = 0; r < height; r++) for (let col = 0; col < width; col++) {
              const offset = ((height - 1 - r) * width + col) * 4, alpha = buf[offset + 3] / 255;
              if (alpha < 0.04) continue;
              const R = Math.min(255, buf[offset] / alpha), G = Math.min(255, buf[offset + 1] / alpha), B = Math.min(255, buf[offset + 2] / alpha);
              const lum = (0.3 * R + 0.59 * G + 0.11 * B) / 255, red = R > G * 1.45 && R > B * 1.5;
              const tone = red ? 2 : lum < 0.24 ? 3 : lum < 0.65 ? 0 : 1;
              const density = Math.min(1, Math.max(0.2, (red ? Math.max(0.65, lum) : lum) * Math.sqrt(alpha)));
              glyph(ctx, (left + col) * cw, (top + r) * ch, RAMP[Math.min(RAMP.length - 1, Math.floor(density * RAMP.length))], tone);
            }
            ctx.globalAlpha = 1;
          }
        }
        if (shown > 0.001 && sceneId) {
          const bx = wide ? textEdge + 24 : W * 0.08, bw = (wide ? W * 0.95 : W * 0.92) - bx;
          const by = wide ? H * 0.2 : H * 0.06, bh = Math.min(wide ? H * 0.6 : H * 0.3, bw * 0.8);
          const width = Math.ceil(bw / cw), height = Math.ceil(bh / ch);
          if (scene2d.width !== width || scene2d.height !== height) { scene2d.width = width; scene2d.height = height; }
          sc2.setTransform(1, 0, 0, 1, 0, 0); sc2.fillStyle = "#000"; sc2.fillRect(0, 0, width, height);
          sc2.setTransform(1 / cw, 0, 0, 1 / ch, 0, 0); SCENES[sceneId](sc2, 0, 0, bw, bh, time);
          const px = sc2.getImageData(0, 0, width, height).data;
          ctx.globalAlpha = shown * (wide ? 1 : 0.7);
          for (let r = 0; r < height; r++) for (let col = 0; col < width; col++) {
            const i = (r * width + col) * 4, R = px[i], B = px[i + 2], lum = Math.max(R, px[i + 1], B) / 255;
            if (lum < 0.08) continue;
            glyph(ctx, bx + col * cw, by + r * ch, RAMP[Math.min(RAMP.length - 1, Math.floor(Math.max(0.2, lum) * RAMP.length))], R > B * 1.1 ? 6 : 5);
          }
          ctx.globalAlpha = 1;
        }
        if (!ready) { ready = true; onReady(); }
      };
      raf = requestAnimationFrame(frame);
      window.addEventListener("resize", resize); window.addEventListener("pointermove", onMove, { passive: true }); motion.addEventListener("change", onMotion);
      disposers.push(() => { window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onMove); motion.removeEventListener("change", onMotion); });
    };
    initialise().catch((error: unknown) => {
      cancelAnimationFrame(raf); cleanup();
      if (!disposed) console.error("Unable to initialise the flight illustration", error);
    });
    return () => { disposed = true; abort.abort(); cancelAnimationFrame(raf); cleanup(); };
  }, [stunt, focus, flight, onReady, onFlightComplete]);
  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
