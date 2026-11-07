"use client";

import { useEffect, useRef } from "react";
import { createWaveRenderer } from "./waveRenderer";
import {
  createPaintedWaveMotion,
  PAINTED_WAVE_DURATION,
  PAINTED_WAVE_REVEAL,
  writePaintedWaveMotion,
  type PaintedWaveMotion,
  type WavePoint,
} from "./paintedWaveMotion";

const IMAGE = "/images/great-wave.webp";
const CONVERSION_START = 60;
const MOTION_START = 720;
const CHARACTERS = " .,:;!|/\\iltfrcLJTU+*oazCYXZmwkbdpq0OQ#%&@$";
const INKS = ["#a8bac4", "#8fa7b5", "#7392a6", "#557d96", "#3d6b88", "#2c5b7b", "#204c6b", "#173f5d"];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

export default function WaveIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const original = originalRef.current;
    if (!canvas || !original) return;
    const intro = canvas.closest<HTMLElement>(".intro");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const renderer = reducedMotion.matches ? null : createWaveRenderer(canvas);
    const atlas = document.createElement("canvas");
    const ink = atlas.getContext("2d", { willReadFrequently: true });
    const sampleCanvas = document.createElement("canvas");
    const sample = sampleCanvas.getContext("2d", { willReadFrequently: true });
    let disposed = false;
    let finished = false;
    let raf = 0;
    let loadTimer = 0;
    let startedAt: number | null = null;
    let elapsed = 0;
    let width = 0;
    let height = 0;
    let ratio = 0;
    let motion: PaintedWaveMotion | null = null;
    let positions = new Float32Array(0);
    const frameIntervals: number[] = [];
    let lastPaint: number | null = null;

    const setPhase = (phase: string) => {
      if (canvas.dataset.wavePhase === phase) return;
      canvas.dataset.wavePhase = phase;
      if (intro) intro.dataset.wavePhase = phase;
    };

    const finish = (fallback = false) => {
      if (finished || disposed) return;
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(loadTimer);
      renderer?.dispose();
      if (motion && frameIntervals.length) {
        const total = frameIntervals.reduce((sum, interval) => sum + interval, 0);
        canvas.dataset.wavePerf = JSON.stringify({
          renderer: "painted-wave",
          glyphs: motion.count,
          fps: +(1000 * frameIntervals.length / total).toFixed(1),
        });
      }
      motion = null;
      positions = new Float32Array(0);
      original.style.visibility = fallback ? "visible" : "hidden";
      original.style.opacity = fallback ? ".12" : "0";
      intro?.style.setProperty("--name-reveal", "1");
      setPhase(fallback ? "error" : "ready");
    };

    if (!renderer || !ink || !sample) {
      finish(true);
      return;
    }

    const buildAtlas = (fontSize: number, tileSize: number) => {
      atlas.width = tileSize * CHARACTERS.length;
      atlas.height = tileSize * INKS.length;
      ink.setTransform(ratio, 0, 0, ratio, 0, 0);
      const mono = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace";
      ink.font = `400 ${fontSize}px ${mono}`;
      ink.textAlign = "center";
      ink.textBaseline = "middle";
      INKS.forEach((color, row) => {
        ink.fillStyle = color;
        for (let column = 0; column < CHARACTERS.length; column++) {
          ink.fillText(CHARACTERS[column], (column + .5) * tileSize / ratio, (row + .5) * tileSize / ratio);
        }
      });
      const densities = Array.from(CHARACTERS, (_, column) => {
        const pixels = ink.getImageData(column * tileSize, 0, tileSize, tileSize).data;
        let alpha = 0;
        for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i];
        return { column, alpha };
      });
      const maximum = Math.max(1, ...densities.map(glyph => glyph.alpha));
      return Uint8Array.from({ length: 256 }, (_, value) => {
        const target = value * maximum / 255;
        return densities.reduce((closest, glyph) =>
          Math.abs(glyph.alpha - target) < Math.abs(closest.alpha - target) ? glyph : closest
        ).column;
      });
    };

    const paint = () => {
      if (finished || !motion) return;
      const ascii = ease((elapsed - CONVERSION_START) / (MOTION_START - CONVERSION_START));
      original.style.opacity = String(1 - ascii);
      original.style.visibility = ascii >= 1 ? "hidden" : "visible";
      const seconds = Math.max(0, (elapsed - MOTION_START) / 1000);
      if (seconds >= PAINTED_WAVE_DURATION) {
        finish();
        return;
      }
      writePaintedWaveMotion(motion, seconds, positions);
      renderer.draw(positions, ascii);
      const name = ease((seconds - PAINTED_WAVE_REVEAL) / (PAINTED_WAVE_DURATION - PAINTED_WAVE_REVEAL));
      intro?.style.setProperty("--name-reveal", String(name));
      if (name > .01) setPhase("revealing");
      else if (seconds >= 2.05) setPhase("falling");
      else if (seconds >= 1.12) setPhase("washing");
      else if (seconds >= .56) setPhase("crashing");
      else if (seconds > 0) setPhase("breaking");
      else setPhase(ascii > 0 ? "converting" : "painting");
    };

    const resize = () => {
      if (finished || !original.naturalWidth) return;
      const bounds = intro?.getBoundingClientRect();
      const w = Math.max(1, Math.round(bounds?.width || window.innerWidth));
      const h = Math.max(1, Math.round(bounds?.height || window.innerHeight));
      const dpr = Math.min(1.5, window.devicePixelRatio || 1, Math.sqrt(2_000_000 / (w * h)));
      if (motion && width === w && height === h && ratio === dpr) return;
      width = w;
      height = h;
      ratio = dpr;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);

      const artScale = height > width * 1.15
        ? width * 1.4 / original.naturalWidth
        : Math.max(width / original.naturalWidth, height / original.naturalHeight);
      const artWidth = original.naturalWidth * artScale;
      const artHeight = original.naturalHeight * artScale;
      const art = { x: (width - artWidth) / 2, y: (height - artHeight) / 2, width: artWidth, height: artHeight };
      const cellScale = Math.max(1, Math.sqrt(artWidth * artHeight / 1_200_000));
      const fontSize = 5 * cellScale;
      const columns = Math.ceil(artWidth / (3 * cellScale));
      const rows = Math.ceil(artHeight / fontSize);
      const tileSize = Math.ceil(fontSize * ratio) + 2;
      const lookup = buildAtlas(fontSize, tileSize);
      sampleCanvas.width = columns;
      sampleCanvas.height = rows;
      sample.drawImage(original, 0, 0, columns, rows);
      const pixels = sample.getImageData(0, 0, columns, rows).data;
      const points: WavePoint[] = [];
      const glyphs: number[] = [];
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const u = (column + .5) / columns;
          const v = (row + .5) / rows;
          const pixel = (row * columns + column) * 4;
          const red = pixels[pixel];
          const green = pixels[pixel + 1];
          const blue = pixels[pixel + 2];
          const luminance = (.30 * red + .59 * green + .11 * blue) / 255;
          const blueInk = clamp((blue - red + 12) / 55);
          // Bring out the pale engraved claws that lead the break.
          const claw = ease((u - .38) / .09) * (1 - ease((u - .565) / .06))
            * ease((v - .14) / .11) * (1 - ease((v - .40) / .11));
          const strength = clamp(Math.pow(clamp((.86 - luminance) / .7) * blueInk, 1.05) * (1 + .42 * claw));
          const glyph = lookup[Math.round(strength * 255)];
          if (strength < .09 || !glyph) continue;
          points.push({ u, v, strength });
          glyphs.push(glyph, Math.min(INKS.length - 1, Math.floor(strength * INKS.length)));
        }
      }
      motion = createPaintedWaveMotion(points, art, width, height);
      positions = new Float32Array(motion.count * 4);
      renderer.configure(atlas, Float32Array.from(glyphs), {
        columns: CHARACTERS.length,
        rows: INKS.length,
        tileSize,
        width,
        height,
      });
      paint();
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || finished || document.hidden || !motion) return;
      startedAt ??= now - elapsed;
      elapsed = now - startedAt;
      if (lastPaint !== null) frameIntervals.push(now - lastPaint);
      lastPaint = now;
      paint();
      if (!finished) raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        startedAt = null;
        lastPaint = null;
      } else if (!finished && motion && !raf) {
        raf = requestAnimationFrame(frame);
      }
    };
    const onMotion = () => { if (reducedMotion.matches) finish(true); };
    const onContextLost = () => finish(true);
    const sizeObserver = new ResizeObserver(() => { if (motion) resize(); });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) finish();
    });
    if (intro) {
      sizeObserver.observe(intro);
      visibilityObserver.observe(intro);
    }
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotion);
    canvas.addEventListener("webglcontextlost", onContextLost);

    loadTimer = window.setTimeout(() => finish(true), 8000);
    const imageReady = original.decode();
    Promise.all([imageReady, document.fonts.ready]).then(() => {
      if (disposed || finished) return;
      window.clearTimeout(loadTimer);
      resize();
      if (!document.hidden) raf = requestAnimationFrame(frame);
    }).catch(() => finish(true));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(loadTimer);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.dispose();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      original.style.removeProperty("opacity");
      original.style.removeProperty("visibility");
      intro?.style.removeProperty("--name-reveal");
    };
  }, []);

  return <>
    {/* eslint-disable-next-line @next/next/no-img-element -- The poster also supplies the ASCII colors. */}
    <img ref={originalRef} className="wave-original" src={IMAGE} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
    <canvas ref={canvasRef} className="wave-art" aria-hidden="true" />
  </>;
}
