"use client";

import { useEffect, useRef } from "react";
import { SCENES } from "./asciiScenes";
import { disposeFlightModel, loadCessna172 } from "./cessna172";

const TAU = Math.PI * 2;

// More light means more ink; at this scale the tonal colour and glyph density work together.
const RAMP = ".,:;i!+*#%@";
const PIANO_RAMP = " .,:;i!+*#%@";
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Repeatable movement for the faint streaks behind the portfolio.
const seeded = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Keep the painting and its ASCII version on exactly the same cover crop at every screen size.
function paintPiano(image: HTMLImageElement, W: number, H: number) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#0b0e13"; c.fillRect(0, 0, W, H);
  if (image.complete && image.naturalWidth > 0) {
    const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    c.drawImage(image, (W - width) * 0.5, (H - height) * 0.45, width, height);
  }
  return cv;
}

// Cache the tiny characters once at device resolution. Drawing atlas tiles avoids asking the browser to
// shape tens of thousands of strings every frame as the denser grid animates.
const GLYPHS = [...new Set(`${RAMP}${PIANO_RAMP}-|/\\_()`)].join("");
const SAMPLE = 2;
const FRAME_MS = 1000 / 30;

export default function AsciiPlane({ stunt, focus }: { stunt: { current: number }; focus: { current: string | null } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let disposed = false, raf = 0;
    const abort = new AbortController();
    const disposers: (() => void)[] = [];
    const cleanup = () => { while (disposers.length) disposers.pop()!(); };
    const pianoImage = new Image();
    pianoImage.decoding = "async";
    // Show the painting as soon as it arrives, without waiting for the 3D model or shader setup.
    let refreshPiano = () => {
      const width = window.innerWidth, height = window.innerHeight, ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.drawImage(paintPiano(pianoImage, width, height), 0, 0, width, height);
    };
    pianoImage.onload = () => {
      if (disposed) return;
      refreshPiano(); canvas.dataset.intro = "piano";
    };
    pianoImage.onerror = () => { if (!disposed) refreshPiano(); };
    const cleanupPiano = () => { pianoImage.onload = null; pianoImage.onerror = null; pianoImage.removeAttribute("src"); };
    pianoImage.src = "/images/piano-intro.webp";

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
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 0.95;
      const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
      disposers.push(() => rt.dispose());
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(gl), room = new RoomEnvironment();
      let environment: ReturnType<typeof pmrem.fromScene>;
      try { environment = pmrem.fromScene(room, 0.04); }
      finally { room.dispose(); pmrem.dispose(); }
      disposers.push(() => environment.dispose());
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.5;
      scene.add(new THREE.HemisphereLight("#e8f0ff", "#8e6c58", 1.0));
      const sun = new THREE.DirectionalLight("#ffe2c0", 2.6); sun.position.set(-6, 7, 5); scene.add(sun);
      const fill = new THREE.DirectionalLight("#a9c9ff", 0.8); fill.position.set(5, 2, -6); scene.add(fill);
      const rig = new THREE.Group(); rig.add(plane); scene.add(rig);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      camera.position.set(0, 7.2, 29.1); camera.lookAt(0, 0, 0);

      let W = 0, H = 0, cw = 0, ch = 0, cols = 0, rows = 0, dpr = 1, font = "";
      let tileW = 0, tileH = 0, sampleW = 0, sampleH = 0, needsDraw = true;
      let buf: Uint8Array<ArrayBuffer> = new Uint8Array(0);
      const scene2d = document.createElement("canvas"), sc2 = scene2d.getContext("2d", { willReadFrequently: true })!;
      const artCanvas = document.createElement("canvas"), artCtx = artCanvas.getContext("2d")!;
      const atlas = document.createElement("canvas"), ac = atlas.getContext("2d")!;
      let scenePx: Uint8ClampedArray<ArrayBufferLike> = new Uint8ClampedArray(0), shown = 0, sceneId = "";
      let piano = document.createElement("canvas");
      let pianoAsciiReady = false;
      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      const rnd = seeded(21);
      const streaks = Array.from({ length: 14 }, () => ({ x: rnd(), y: rnd(), len: 16 + rnd() * 35, v: 0.025 + rnd() * 0.035 }));
      // Body paint has several tones, so windows, shadows, white skin, and red livery stay distinct.
      let palette = ["#92abd2", "#e7eef8", "#ff876c", "#5d80b1", "#354154", "#7aa2f7", "#ff7a5c"];
      const PIANO_TONE = palette.length, PIANO_LEVELS = 5;
      // A small RGB cube keeps the painting's own muted colors, rather than tinting it with the
      // aircraft's blue/red palette. All of these tiny glyphs are rasterized only once per resize.
      const pianoPalette = Array.from({ length: PIANO_LEVELS ** 3 }, (_, i) => {
        const r = Math.floor(i / (PIANO_LEVELS * PIANO_LEVELS)), g = Math.floor(i / PIANO_LEVELS) % PIANO_LEVELS, b = i % PIANO_LEVELS;
        const channel = (n: number) => Math.round(n * 255 / (PIANO_LEVELS - 1));
        return `rgb(${channel(r)},${channel(g)},${channel(b)})`;
      });
      const glyphIndex = new Map([...GLYPHS].map((g, i) => [g, i]));
      const buildAtlas = () => {
        const colors = [...palette, ...pianoPalette];
        atlas.width = tileW * GLYPHS.length; atlas.height = tileH * colors.length;
        ac.setTransform(dpr, 0, 0, dpr, 0, 0); ac.font = font; ac.textBaseline = "middle";
        colors.forEach((colour, tone) => {
          ac.fillStyle = colour;
          for (let i = 0; i < GLYPHS.length; i++) ac.fillText(GLYPHS[i], i * tileW / dpr, (tone + 0.5) * tileH / dpr);
        });
      };
      const glyph = (target: CanvasRenderingContext2D, x: number, y: number, g: string, tone: number) => {
        const index = glyphIndex.get(g);
        if (index === undefined || g === " ") return;
        target.drawImage(atlas, index * tileW, tone * tileH, tileW, tileH, x, y, tileW / dpr, tileH / dpr);
      };
      const readColors = () => {
        const cs = getComputedStyle(document.documentElement);
        palette = [palette[0], palette[1], cs.getPropertyValue("--accent").trim() || palette[2], palette[3], cs.getPropertyValue("--faint").trim() || palette[4], cs.getPropertyValue("--plane").trim() || palette[5], cs.getPropertyValue("--accent").trim() || palette[6]];
        buildAtlas(); pianoAsciiReady = false; needsDraw = true;
      };
      const resize = () => {
        W = window.innerWidth; H = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        // Half the old glyph height gives about four times as many independently shaded cells.
        // Keep a bounded grid on very large displays instead of silently making ordinary screens coarse.
        const size = Math.max(W < 700 ? 3.75 : 4, W / 1900 * 4, Math.sqrt(W * H / 170000) / 0.85);
        font = `500 ${size}px ${getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace"}`;
        ctx.font = font; cw = ctx.measureText("M").width; ch = size * 1.22;
        tileW = Math.ceil(cw * dpr); tileH = Math.ceil(ch * dpr);
        cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
        sampleW = cols * SAMPLE; sampleH = rows * SAMPLE;
        rt.setSize(sampleW, sampleH); buf = new Uint8Array(sampleW * sampleH * 4);
        gl.setPixelRatio(dpr); gl.setSize(W, H, false);
        scene2d.width = cols; scene2d.height = rows;
        artCanvas.width = canvas.width; artCanvas.height = canvas.height;
        camera.aspect = W / H; camera.updateProjectionMatrix();
        piano = paintPiano(pianoImage, W, H);
        readColors();
      };
      resize();

      const paintAsciiPiano = () => {
        if (pianoAsciiReady) return;
        pianoAsciiReady = true;
        artCtx.setTransform(dpr, 0, 0, dpr, 0, 0); artCtx.clearRect(0, 0, W, H);
        sc2.setTransform(1, 0, 0, 1, 0, 0); sc2.clearRect(0, 0, cols, rows); sc2.drawImage(piano, 0, 0, cols, rows);
        const px = sc2.getImageData(0, 0, cols, rows).data;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = (r * cols + c) * 4, lum = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255;
          if (lum < 0.04) continue;
          const quantize = (v: number) => Math.round(v * (PIANO_LEVELS - 1) / 255);
          const tone = PIANO_TONE + quantize(px[i]) * PIANO_LEVELS * PIANO_LEVELS + quantize(px[i + 1]) * PIANO_LEVELS + quantize(px[i + 2]);
          const density = Math.min(1, Math.sqrt(lum) * 1.25);
          glyph(artCtx, c * cw, r * ch, PIANO_RAMP[Math.min(PIANO_RAMP.length - 1, Math.floor(density * PIANO_RAMP.length))], tone);
        }
      };
      refreshPiano = () => {
        piano = paintPiano(pianoImage, W, H); pianoAsciiReady = false; needsDraw = true;
      };

      const onMove = (e: PointerEvent) => { pointer.tx = e.clientX / W - 0.5; pointer.ty = e.clientY / H - 0.5; };
      const onMotion = () => { reduced = motion.matches; needsDraw = true; };
      const mo = new MutationObserver(readColors);
      disposers.push(() => mo.disconnect());
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      let last = performance.now(), drawnAt = -Infinity, time = 0, seen = stunt.current, stuntAt = -1e9;
      let previousScroll = -1, previousFocus: string | null = null;
      const frame = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        if (document.hidden || now - drawnAt < FRAME_MS) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        drawnAt = now - (Number.isFinite(drawnAt) ? (now - drawnAt) % FRAME_MS : 0);
        const introTop = document.getElementById("top")?.offsetTop ?? 0;
        if (window.scrollY < introTop - H) return;
        if (reduced && previousScroll === window.scrollY && previousFocus === focus.current && !needsDraw) return;
        previousScroll = window.scrollY; previousFocus = focus.current; needsDraw = false;
        time += reduced ? 0 : dt;
        const follow = 1 - Math.exp(-dt * 5);
        pointer.x += (pointer.tx - pointer.x) * follow; pointer.y += (pointer.ty - pointer.y) * follow;
        const y = Math.max(0, window.scrollY - introTop), sy = y / H;
        // The same painting dissolves into its matching ASCII crop before the aircraft joins the
        // portfolio. Keeping the full-color model out of the opening lets the artwork stay quiet.
        const d = smooth(0.03, 0.56, sy), art = 1 - smooth(0.64, 1, sy), k = smooth(0, 1, sy / 0.9);
        const max = document.documentElement.scrollHeight - H - introTop, p = max > 0 ? y / max : 0;
        const halfH = Math.tan(camera.fov * Math.PI / 360) * 30, halfW = halfH * camera.aspect, wide = W >= 900;
        const span = Math.min(halfW * 2 * (wide ? 0.7 : 0.96), halfH * 2 * 1.25);
        // Reserve the actual text column rather than a fixed 480px cutout on every desktop size.
        const textEdge = wide ? Math.min(440, W * 0.39) + 28 : 0;
        const endSpan = wide ? Math.min((W - textEdge) / W * halfW * 1.75, halfH * 1.45) : span * 0.8;
        rig.scale.setScalar((span + (endSpan - span) * k) / 11);
        rig.position.set(wide ? halfW * (textEdge / W) * k : 0, halfH * (0.18 + (wide ? -0.1 : 0.25) * k) + Math.sin(time * 0.9) * halfH * 0.015, 0);
        if (stunt.current !== seen) { seen = stunt.current; stuntAt = now; }
        const s = (now - stuntAt) / 1800, roll = !reduced && s > 0 && s < 1 ? TAU * (s * s * (3 - 2 * s)) : 0;
        plane.rotation.set(0.04 + (reduced ? 0 : pointer.y * 0.2 + Math.sin(time * 0.7) * 0.025), Math.PI / 2 + 0.68 + Math.sin(p * TAU) * 0.38 + (reduced ? 0 : pointer.x * 0.38), reduced ? 0 : Math.sin(time * 0.5) * 0.055 - pointer.x * 0.12, "YXZ");
        // Roll about the fuselage's longitudinal axis, which is local z.
        plane.rotateZ(roll); prop.rotation.z = reduced ? 0.35 : time * 45;

        const want = sy >= 0.64 && focus.current && SCENES[focus.current] ? focus.current : "";
        if (want) sceneId = want;
        shown = reduced ? (want ? 1 : 0) : shown + ((want ? 1 : 0) - shown) * Math.min(1, dt * 6);
        if (shown > 0.001 && sceneId) {
          sc2.setTransform(1, 0, 0, 1, 0, 0); sc2.fillStyle = "#000"; sc2.fillRect(0, 0, cols, rows);
          sc2.setTransform(cols / W, 0, 0, rows / H, 0, 0);
          const bx = wide ? textEdge + 24 : W * 0.08, bw = (wide ? W * 0.95 : W * 0.92) - bx;
          const by = wide ? H * 0.2 : H * 0.06, bh = Math.min(wide ? H * 0.6 : H * 0.3, bw * 0.8);
          SCENES[sceneId](sc2, bx, by, bw, bh, time);
          scenePx = sc2.getImageData(0, 0, cols, rows).data;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        gl.setClearColor(0x000000, 0);
        if (art > 0 && d < 1) {
          ctx.globalAlpha = art * (1 - d); ctx.drawImage(piano, 0, 0, W, H); ctx.globalAlpha = 1;
        }
        if (art > 0 && d > 0) {
          paintAsciiPiano();
          ctx.globalAlpha = art * d; ctx.drawImage(artCanvas, 0, 0, W, H); ctx.globalAlpha = 1;
        }
        // Let the portfolio copy enter over a quiet background while the painting remains on the right.
        if (wide && art > 0 && sy > 0.18) {
          const mask = ctx.createLinearGradient(textEdge - 40, 0, textEdge + 56, 0);
          mask.addColorStop(0, `rgba(0,0,0,${smooth(0.18, 0.56, sy)})`);
          mask.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = mask; ctx.fillRect(0, 0, textEdge + 56, H);
          ctx.globalCompositeOperation = "source-over";
        }
        // Skip GPU readback throughout the piano opening or while another scene covers the aircraft.
        const fade = (wide ? 1 : 1 - k * 0.92) * (1 - shown) * smooth(0.64, 1, sy);
        if (fade > 0.005) {
          gl.setRenderTarget(rt); gl.clear(); gl.render(scene, camera);
          gl.readRenderTargetPixels(rt, 0, 0, sampleW, sampleH, buf);
          ctx.globalAlpha = fade;
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const base = ((rows - r - 1) * SAMPLE * sampleW + c * SAMPLE) * 4;
            let R = 0, G = 0, B = 0, a = 0;
            // Four samples retain thin struts and control-surface edges which one-pixel sampling drops.
            for (let yy = 0; yy < SAMPLE; yy++) for (let xx = 0; xx < SAMPLE; xx++) {
              const o = base + (yy * sampleW + xx) * 4, alpha = buf[o + 3] / 255;
              R += buf[o] * alpha; G += buf[o + 1] * alpha; B += buf[o + 2] * alpha; a += alpha;
            }
            if (a < 0.14) continue;
            R /= a; G /= a; B /= a;
            const lum = (0.3 * R + 0.59 * G + 0.11 * B) / 255;
            const red = R > G * 1.45 && R > B * 1.5;
            const tone = red ? 2 : lum < 0.24 ? 3 : lum < 0.65 ? 0 : 1;
            const density = Math.min(1, Math.max(0.2, (red ? Math.max(0.65, lum) : lum) * Math.min(1, a * 0.55)));
            glyph(ctx, c * cw, r * ch, RAMP[Math.min(RAMP.length - 1, Math.floor(density * RAMP.length))], tone);
          }
          ctx.globalAlpha = 1;
        }
        if (art < 1) {
          ctx.globalAlpha = (1 - art) * 0.6;
          // Cloud structure is measured in screen pixels so finer characters add detail without
          // shrinking every cloud or increasing visual clutter behind the copy.
          for (let r = 0; r < rows; r += 2) for (let c = Math.ceil(textEdge * k / cw); c < cols; c += 2) {
            const x = c * cw, yy = r * ch;
            const n = noise(x * 0.009 + time * 0.14, yy * 0.012) * 0.7 + noise(x * 0.027 + time * 0.2, yy * 0.032) * 0.3;
            if (n > 0.68) glyph(ctx, x, yy, n > 0.75 ? ":" : ".", 4);
          }
          for (const st of streaks) {
            st.x += st.v * dt * (reduced ? 0 : 1);
            if (st.x > 1.1) { st.x = -0.1; st.y = rnd(); }
            for (let j = 0; j < st.len; j += cw) {
              const x = st.x * W - j;
              if (x >= textEdge * k) glyph(ctx, x, Math.floor(st.y * rows) * ch, "-", 4);
            }
          }
          ctx.globalAlpha = 1;
        }
        if (shown > 0.001) {
          ctx.globalAlpha = shown * (wide ? 1 : 0.35) * (1 - art);
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const i = (r * cols + c) * 4, R = scenePx[i], G = scenePx[i + 1], B = scenePx[i + 2], lum = Math.max(R, G, B) / 255;
            if (lum < 0.08) continue;
            const g = RAMP[Math.min(RAMP.length - 1, Math.floor(Math.max(0.2, lum) * RAMP.length))];
            glyph(ctx, c * cw, r * ch, g, R > B * 1.1 ? 6 : 5);
          }
          ctx.globalAlpha = 1;
        }
      };
      raf = requestAnimationFrame(frame);
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onMove, { passive: true });
      motion.addEventListener("change", onMotion);
      disposers.push(() => {
        window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onMove);
        motion.removeEventListener("change", onMotion);
      });
    };
    initialise().catch((error: unknown) => {
      cancelAnimationFrame(raf); cleanup();
      if (!disposed) console.error("Unable to initialise the flight illustration", error);
    });
    return () => { disposed = true; abort.abort(); cancelAnimationFrame(raf); cleanup(); cleanupPiano(); };
  }, [stunt, focus]);
  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
