"use client";

import { useEffect, useRef } from "react";
import { SCENES } from "./asciiScenes";
import { disposeFlightModel, loadCessna172 } from "./cessna172";

const TAU = Math.PI * 2;
const AIRCRAFT_YAW = Math.PI / 2 + 0.68;
const FRAME_MS = 1000 / 30;
const RAMP = ".,:;i!+*#%@";
const GLYPHS = [...new Set(RAMP)].join("");
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// A broad, quiet wash of sky. Its transparent edges meet the page without a rectangular backdrop.
function paintSky(W: number, H: number, left: number, centerY: number, mobile: boolean) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!, rnd = seeded(38), width = W - left;
  const wash = (x: number, y: number, rx: number, ry: number, color: string, alpha: number) => {
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(0.55, `rgba(${color},${alpha * 0.66})`); g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
  };
  const x = left + width * 0.52, height = mobile ? Math.min(H * 0.29, width * 0.67) : Math.min(H * 0.63, width * 0.85);
  wash(x, centerY - height * 0.15, width * 0.8, height * 0.86, "152,184,195", 0.7);
  wash(x + width * 0.2, centerY + height * 0.2, width * 0.7, height * 0.6, "229,208,175", 0.58);
  wash(x - width * 0.22, centerY + height * 0.36, width * 0.5, height * 0.28, "218,229,225", 0.6);
  for (let i = 0; i < 65; i++) {
    const cx = left + width * (rnd() * 1.15 - 0.08);
    const cy = centerY + (rnd() - 0.46) * height * 1.1;
    const radius = width * (0.05 + rnd() * 0.17);
    wash(cx, cy, radius * 1.6, radius * (0.18 + rnd() * 0.12), "249,246,235", 0.1 + rnd() * 0.27);
  }
  // Keep the text side completely clear while allowing a soft edge on narrow screens.
  c.globalCompositeOperation = "destination-in";
  const mask = c.createLinearGradient(left - (mobile ? 50 : 40), 0, W, 0);
  mask.addColorStop(0, "rgba(0,0,0,0)"); mask.addColorStop(mobile ? 0.12 : 0.08, "#000"); mask.addColorStop(0.94, "#000"); mask.addColorStop(1, "rgba(0,0,0,.75)");
  c.fillStyle = mask; c.fillRect(0, 0, W, H);
  return cv;
}

type Props = {
  stunt: { current: number };
  focus: { current: string | null };
};

export default function AsciiPlane({ stunt, focus }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    delete canvas.dataset.ready; delete canvas.dataset.artState;
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
      // A single MSAA-resolved sample per character keeps the true 2px grid inexpensive.
      const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
      rt.texture.colorSpace = THREE.SRGBColorSpace; rt.scissorTest = true;
      disposers.push(() => rt.dispose());
      const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(gl), room = new RoomEnvironment();
      let environment: ReturnType<typeof pmrem.fromScene>;
      try { environment = pmrem.fromScene(room, 0.04); }
      finally { room.dispose(); pmrem.dispose(); }
      disposers.push(() => environment.dispose());
      scene.environment = environment.texture; scene.environmentIntensity = 0.55;
      scene.add(new THREE.HemisphereLight("#edf2ef", "#9f8e75", 1.25));
      const sun = new THREE.DirectionalLight("#fff0d8", 2.4); sun.position.set(-6, 9, 5); scene.add(sun);
      const fill = new THREE.DirectionalLight("#bfd6df", 0.85); fill.position.set(5, 2, -6); scene.add(fill);
      const rig = new THREE.Group(); rig.add(plane); scene.add(rig);
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      camera.position.set(0, 6.4, 29.3); camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const localBounds = new THREE.Box3().setFromObject(plane);
      const corners = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(i & 1 ? localBounds.max.x : localBounds.min.x, i & 2 ? localBounds.max.y : localBounds.min.y, i & 4 ? localBounds.max.z : localBounds.min.z));
      const projected = new THREE.Vector3();
      let W = 0, H = 0, cw = 0, ch = 0, cols = 0, rows = 0, dpr = 1, font = "", tileW = 0, tileH = 0, needsDraw = true;
      let contentEdge = 0, gutter = 0, centerX = 0, centerY = 0, aircraftScale = 1, poseOffsetX = 0, poseOffsetY = 0;
      let mobile = false;
      const halfH = 8.5;
      let halfW = 1;
      let buf: Uint8Array<ArrayBuffer> = new Uint8Array(0);
      const scene2d = document.createElement("canvas"), sc2 = scene2d.getContext("2d", { willReadFrequently: true })!;
      const clouds = document.createElement("canvas"), cloudCtx = clouds.getContext("2d")!;
      const atlas = document.createElement("canvas"), ac = atlas.getContext("2d")!;
      let shown = 0, sceneId = "", sky = document.createElement("canvas");
      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      // White CAD surfaces become blue-grey ink; glazing remains dark and the supplied red livery survives.
      let palette = ["#254652", "#294954", "#94352c", "#173744", "#a9bec2", "#294e65", "#94352c", "#0f2835"];
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
        // Tiny letters lose most of their ink to antialiasing; strengthen coverage without
        // enlarging the glyphs, changing their grid, or expanding their existing edges.
        const ink = ac.getImageData(0, 0, atlas.width, atlas.height);
        for (let i = 3; i < ink.data.length; i += 4) ink.data[i] = Math.min(255, Math.round(ink.data[i] * 2.2));
        ac.putImageData(ink, 0, 0);
      };
      const paintClouds = () => {
        clouds.width = canvas.width; clouds.height = canvas.height;
        cloudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const start = Math.max(0, contentEdge - 30), rnd = seeded(17), verticalSpan = H * (mobile ? 0.2 : 0.42);
        // Cache only sparse 2px marks. The atmosphere stays quieter than the aircraft itself.
        for (let y = Math.max(0, centerY - verticalSpan); y < Math.min(H, centerY + verticalSpan); y += 7) {
          for (let x = start; x < W - gutter * 0.3; x += 6) {
            const nx = (x - centerX) / Math.max(1, (W - contentEdge) * 0.5);
            const ny = (y - centerY) / verticalSpan;
            const envelope = Math.max(0, 1 - nx * nx - ny * ny);
            if (rnd() < envelope * 0.26) glyph(cloudCtx, x, y, rnd() > 0.86 ? ":" : ".", 4);
          }
        }
      };
      const readColors = () => {
        const cs = getComputedStyle(document.documentElement);
        palette = [palette[0], palette[1], palette[2], palette[3], palette[4], cs.getPropertyValue("--plane").trim() || palette[5], palette[6], palette[7]];
        buildAtlas(); paintClouds(); needsDraw = true;
      };
      const fitAircraft = () => {
        rig.position.set(0, 0, 0); rig.scale.setScalar(1);
        plane.rotation.set(0.035, AIRCRAFT_YAW, -0.035, "YXZ"); prop.rotation.z = 0.35; rig.updateMatrixWorld(true);
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        // Fit the actual assembly once on resize. Rotating its axis-aligned box substantially
        // overestimates the wings and fuselage together and makes the visible aircraft too small.
        plane.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const positions = object.geometry.getAttribute("position");
          if (!positions) return;
          for (let i = 0; i < positions.count; i++) {
            projected.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
            const x = (projected.x * 0.5 + 0.5) * W, y = (-projected.y * 0.5 + 0.5) * H;
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        });
        const width = mobile ? W * 0.92 : (W - contentEdge - gutter * 0.4) * 0.91;
        const height = mobile ? Math.min(H * 0.23, W * 0.5) : H * 0.56;
        aircraftScale = Math.min(width / (right - left), height / (bottom - top));
        poseOffsetX = ((left + right) / W - 1) * halfW * aircraftScale;
        poseOffsetY = (1 - (top + bottom) / H) * halfH * aircraftScale;
      };
      const resize = () => {
        W = window.innerWidth; H = window.innerHeight; mobile = W < 760;
        const content = document.querySelector(".index")?.getBoundingClientRect();
        gutter = mobile ? 20 : content?.left || Math.max(24, Math.min(80, W * 0.05));
        contentEdge = mobile ? 0 : Math.min(W * 0.65, (content?.right || gutter + Math.min(W * 0.42, 560)) + 32);
        centerX = mobile ? W * 0.5 : (contentEdge + W - gutter * 0.4) * 0.5;
        centerY = H * (mobile ? 0.28 : 0.48);
        dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(8_000_000 / (W * H)));
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        // Ordinary desktop and mobile displays use actual 2px letters; cap cells on very large displays.
        const size = Math.max(2, W / 2400 * 2, H / 1800 * 2);
        font = `700 ${size}px ${getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace"}`;
        ctx.font = font; cw = ctx.measureText("M").width; ch = size * 1.22;
        tileW = Math.ceil(cw * dpr); tileH = Math.ceil(ch * dpr);
        cols = Math.ceil(W / cw); rows = Math.ceil(H / ch); rt.setSize(cols, rows);
        gl.setPixelRatio(dpr); gl.setSize(W, H, false);
        halfW = halfH * W / H;
        camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH; camera.updateProjectionMatrix();
        fitAircraft(); sky = paintSky(W, H, contentEdge, centerY, mobile); readColors();
      };
      resize();

      const onMove = (e: PointerEvent) => { pointer.tx = e.clientX / W - 0.5; pointer.ty = e.clientY / H - 0.5; };
      const onMotion = () => { reduced = motion.matches; needsDraw = true; };
      const observer = new MutationObserver(readColors); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      disposers.push(() => observer.disconnect());
      let last = performance.now(), drawnAt = -Infinity, time = 0, propAngle = 0.35, seen = stunt.current, stuntAt = -1e9;
      let previousFocus: string | null = null, firstRenderedAt = -1, artState = "";
      const frame = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        if (document.hidden || now - drawnAt < FRAME_MS - 0.1) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        drawnAt = now - (Number.isFinite(drawnAt) ? (now - drawnAt) % FRAME_MS : 0);
        const changed = focus.current !== previousFocus;
        if (!changed && !needsDraw && reduced) return;
        previousFocus = focus.current; needsDraw = false;
        time += reduced ? 0 : dt;
        const follow = 1 - Math.exp(-dt * 5);
        pointer.x += (pointer.tx - pointer.x) * follow; pointer.y += (pointer.ty - pointer.y) * follow;
        // Start the one-time dissolve only after a complete color frame has reached the canvas.
        const d = reduced ? 1 : smooth(500, 1400, firstRenderedAt < 0 ? 0 : now - firstRenderedAt);
        if (stunt.current !== seen) { seen = stunt.current; stuntAt = now; }
        const stuntProgress = (now - stuntAt) / 1800;
        const roll = !reduced && stuntProgress > 0 && stuntProgress < 1 ? TAU * smooth(0, 1, stuntProgress) : 0;
        plane.rotation.set(0.035 + (reduced ? 0 : pointer.y * 0.07 + Math.sin(time * 0.45) * 0.008), AIRCRAFT_YAW + (reduced ? 0 : pointer.x * 0.12), -0.035 + (reduced ? 0 : Math.sin(time * 0.35) * 0.012 - pointer.x * 0.025), "YXZ");
        plane.rotateZ(roll);
        rig.scale.setScalar(aircraftScale);
        rig.position.copy(cameraRight).multiplyScalar((centerX / W * 2 - 1) * halfW - poseOffsetX);
        rig.position.addScaledVector(cameraUp, (1 - centerY / H * 2) * halfH - poseOffsetY + (reduced ? 0 : Math.sin(time * 0.65) * 0.045));
        if (!reduced) propAngle += dt * 35;
        prop.rotation.z = propAngle;
        const want = d > 0.8 && focus.current && SCENES[focus.current] ? focus.current : "";
        if (want) sceneId = want;
        shown = reduced ? (want ? 1 : 0) : shown + ((want ? 1 : 0) - shown) * Math.min(1, dt * 6);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        gl.setClearColor(0x000000, 0);
        if (d < 1) {
          ctx.globalAlpha = 1 - d; ctx.drawImage(sky, 0, 0, W, H);
          if (shown < 0.999) {
            gl.setRenderTarget(null); gl.clear(); gl.render(scene, camera);
            ctx.globalAlpha = (1 - d) * (1 - shown); ctx.drawImage(gl.domElement, 0, 0, W, H);
          }
          ctx.globalAlpha = 1;
        }
        if (d > 0) {
          ctx.globalAlpha = d * 0.6; ctx.drawImage(clouds, 0, 0, W, H); ctx.globalAlpha = 1;
        }

        const fade = d * (1 - shown);
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
            gl.setRenderTarget(rt); gl.clear(); gl.render(scene, camera);
            gl.readRenderTargetPixels(rt, left, rows - bottom, width, height, buf);
            ctx.globalAlpha = fade;
            for (let r = 0; r < height; r++) for (let col = 0; col < width; col++) {
              const offset = ((height - 1 - r) * width + col) * 4, alpha = buf[offset + 3] / 255;
              if (alpha < 0.08) continue;
              const R = Math.min(255, buf[offset] / alpha), G = Math.min(255, buf[offset + 1] / alpha), B = Math.min(255, buf[offset + 2] / alpha);
              const lum = (0.3 * R + 0.59 * G + 0.11 * B) / 255, red = R > G * 1.4 && R > B * 1.4;
              const tone = red ? 2 : lum < 0.24 ? 7 : lum < 0.48 ? 3 : lum < 0.75 ? 0 : 1;
              const density = Math.max(0.2, (red ? 0.9 : 1 - lum * 0.28) * Math.sqrt(alpha));
              glyph(ctx, (left + col) * cw, (top + r) * ch, RAMP[Math.min(RAMP.length - 1, Math.floor(density * RAMP.length))], tone);
            }
            ctx.globalAlpha = 1;
          }
        }
        if (shown > 0.001 && sceneId) {
          const bw = mobile ? W * 0.9 : W - contentEdge - gutter * 0.65;
          const bh = Math.min(H * (mobile ? 0.23 : 0.58), bw * (mobile ? 0.5 : 0.8));
          const bx = mobile ? W * 0.05 : contentEdge, by = centerY - bh * 0.5;
          const width = Math.ceil(bw / cw), height = Math.ceil(bh / ch);
          if (scene2d.width !== width || scene2d.height !== height) { scene2d.width = width; scene2d.height = height; }
          sc2.setTransform(1, 0, 0, 1, 0, 0); sc2.fillStyle = "#000"; sc2.fillRect(0, 0, width, height);
          sc2.setTransform(1 / cw, 0, 0, 1 / ch, 0, 0); SCENES[sceneId](sc2, 0, 0, bw, bh, time);
          const px = sc2.getImageData(0, 0, width, height).data;
          ctx.globalAlpha = shown;
          for (let r = 0; r < height; r++) for (let col = 0; col < width; col++) {
            const i = (r * width + col) * 4, R = px[i], B = px[i + 2], lum = Math.max(R, px[i + 1], B) / 255;
            if (lum < 0.08) continue;
            glyph(ctx, bx + col * cw, by + r * ch, RAMP[Math.min(RAMP.length - 1, Math.floor(Math.max(0.25, lum) * RAMP.length))], R > B * 1.1 ? 6 : 5);
          }
          ctx.globalAlpha = 1;
        }
        const nextState = d === 1 ? "ascii" : d > 0 ? "transition" : "color";
        if (nextState !== artState) { artState = nextState; canvas.dataset.artState = artState; }
        if (firstRenderedAt < 0) { firstRenderedAt = now; canvas.dataset.ready = "true"; }
      };
      raf = requestAnimationFrame(frame);
      window.addEventListener("resize", resize); window.addEventListener("pointermove", onMove, { passive: true }); motion.addEventListener("change", onMotion);
      disposers.push(() => { window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onMove); motion.removeEventListener("change", onMotion); });
    };
    initialise().catch((error: unknown) => {
      cancelAnimationFrame(raf); cleanup();
      if (!disposed) console.error("Unable to initialise the aircraft illustration", error);
    });
    return () => { disposed = true; abort.abort(); cancelAnimationFrame(raf); cleanup(); };
  }, [stunt, focus]);
  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
