"use client";

import { useEffect, useRef } from "react";
import { createWaveCrash, writeWaveCrash, SPRAY_DURATION, type WaveCrash } from "./waveSpray";
import { createWaveRenderer } from "./waveRenderer";

const IMAGE = "/images/great-wave.webp";
const PAPER = "#f5f6f2";
const MOTION_START = 780;
const CHARACTERS = " .,:;!|/\\iltfrcLJTU+*oazCYXZmwkbdpq0OQ#%&@$";
const INKS = ["#a8bac4", "#8fa7b5", "#7392a6", "#557d96", "#3d6b88", "#2c5b7b", "#204c6b", "#173f5d"];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
type SourceGlyph = { x: number; y: number; strength: number; column: number; tone: number };

export default function WaveIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current, original = originalRef.current;
    if (!canvas || !original) return;
    const intro = canvas.closest<HTMLElement>(".intro");
    const renderer = createWaveRenderer(canvas);
    const sampleCanvas = document.createElement("canvas"), sample = sampleCanvas.getContext("2d", { willReadFrequently: true });
    const atlas = document.createElement("canvas"), ink = atlas.getContext("2d", { willReadFrequently: true });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches, disposed = false, ready = false, finished = false;
    let raf = 0, startedAt = 0, elapsed = 0, resourcesReady = false;
    let width = 1, height = 1, ratio = 1, columns = 1, rows = 1;
    let cellWidth = 4, cellHeight = 7, tileSize = 1, fontSize = 7;
    let portrait = false, crash: WaveCrash | null = null;
    let positions = new Float32Array(0);
    const glyphLookup = new Uint8Array(256);
    const updateTimes: number[] = [], frameIntervals: number[] = [];
    let lastPaint = 0;
    const phase = (value: string) => {
      if (canvas.dataset.wavePhase === value) return;
      canvas.dataset.wavePhase = value;
      if (intro) intro.dataset.wavePhase = value;
    };
    const complete = () => {
      if (disposed || finished) return;
      finished = true; cancelAnimationFrame(raf); raf = 0;
      original.style.visibility = "hidden"; renderer?.clear();
      intro?.style.setProperty("--name-reveal", "1"); phase("ready");
      if (updateTimes.length) {
        const percentile = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length * .95)] || 0;
        // GL update time is CPU submission time; RAF intervals include the visible frame cadence.
        canvas.dataset.wavePerf = JSON.stringify({ renderer: "webgl", frames: updateTimes.length, glyphs: crash?.count || 0, drawCalls: 1,
          updateP95: +percentile(updateTimes).toFixed(2), intervalP95: +percentile(frameIntervals).toFixed(2),
          fps: +(1000 * frameIntervals.length / frameIntervals.reduce((sum, value) => sum + value, 0)).toFixed(1) });
      }
      renderer?.dispose(); crash = null; positions = new Float32Array(0);
    };
    const fail = () => {
      if (disposed) return;
      complete(); original.style.visibility = "visible"; original.style.opacity = ".12";
      canvas.style.opacity = "0"; phase("error");
    };
    if (!renderer || !sample || !ink) { fail(); renderer?.dispose(); return; }

    const imageFrame = () => {
      const scale = portrait ? width * 1.4 / original.naturalWidth
        : Math.max(width / original.naturalWidth, height / original.naturalHeight);
      const w = original.naturalWidth * scale, h = original.naturalHeight * scale;
      return { x: (width - w) * .5, y: (height - h) * .5, width: w, height: h };
    };
    const buildAtlas = () => {
      // Square sprite tiles include a transparent gutter to avoid neighbouring letters bleeding in.
      tileSize = Math.ceil(cellHeight * ratio) + 2;
      atlas.width = tileSize * CHARACTERS.length; atlas.height = tileSize * INKS.length;
      ink.setTransform(ratio, 0, 0, ratio, 0, 0);
      ink.font = `400 ${fontSize}px ${getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace"}`;
      ink.textAlign = "center"; ink.textBaseline = "middle";
      INKS.forEach((color, row) => {
        ink.fillStyle = color;
        for (let column = 0; column < CHARACTERS.length; column++) {
          ink.fillText(CHARACTERS[column], (column + .5) * tileSize / ratio, (row + .5) * tileSize / ratio);
        }
      });
      const glyphs = Array.from(CHARACTERS, (_, column) => {
        const pixels = ink.getImageData(column * tileSize, 0, tileSize, tileSize).data;
        let alpha = 0;
        for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i] / 255;
        return { column, density: alpha / (tileSize * tileSize) };
      }).sort((a, b) => a.density - b.density);
      const maximum = glyphs[glyphs.length - 1]?.density || 1;
      for (const glyph of glyphs) glyph.density /= maximum;
      for (let i = 0; i < 256; i++) {
        glyphLookup[i] = glyphs.reduce((nearest, glyph) => Math.abs(glyph.density - i / 255) < Math.abs(nearest.density - i / 255) ? glyph : nearest).column;
      }
    };
    const buildWave = () => {
      const frame = imageFrame();
      sample.fillStyle = PAPER; sample.fillRect(0, 0, columns, rows);
      sample.drawImage(original, frame.x * columns / width, frame.y * rows / height,
        frame.width * columns / width, frame.height * rows / height);
      const pixels = sample.getImageData(0, 0, columns, rows).data;
      const source: SourceGlyph[] = [];
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const i = (row * columns + column) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const luminance = (r * .3 + g * .59 + b * .11) / 255;
        const blueInk = clamp((b - r + 12) / 55);
        const strength = Math.pow(clamp((.86 - luminance) / .7) * blueInk, 1.05);
        if (strength < .09) continue;
        const glyph = glyphLookup[Math.round(strength * 255)];
        if (!glyph) continue;
        source.push({ x: (column + .5) * width / columns, y: (row + .5) * height / rows, strength,
          column: glyph, tone: Math.min(INKS.length - 1, Math.floor(strength * INKS.length)) });
      }
      crash = createWaveCrash(source, width, height, frame);
      positions = new Float32Array(source.length * 4);
      const glyphs = new Float32Array(source.length * 2);
      source.forEach((glyph, i) => { glyphs[i * 2] = glyph.column; glyphs[i * 2 + 1] = glyph.tone; });
      renderer.configure(atlas, glyphs, { columns: CHARACTERS.length, rows: INKS.length,
        tileSize, glyphSize: tileSize / ratio, width, height, ratio });
    };

    const paint = () => {
      if (finished || !ready || !crash) return;
      canvas.style.opacity = "1";
      const ascii = ease((elapsed - 80) / 700);
      original.style.opacity = String(1 - ascii);
      original.style.visibility = ascii >= 1 ? "hidden" : "visible";
      const time = Math.max(0, (elapsed - MOTION_START) / 1000);
      if (time >= SPRAY_DURATION) { complete(); return; }
      writeWaveCrash(crash, time, positions);
      renderer.draw(positions, ascii);
      const name = ease((time - (SPRAY_DURATION - .65)) / .65);
      intro?.style.setProperty("--name-reveal", String(name));
      phase(name > .01 ? "revealing" : time >= 2.1 ? "falling" : time >= 1.12 ? "spraying" : time >= .72 ? "curling" : time > 0 ? "breaking" : ascii > 0 ? "converting" : "painting");
    };
    const resize = () => {
      const bounds = intro?.getBoundingClientRect();
      const w = Math.max(1, Math.round(bounds?.width || window.innerWidth));
      const h = Math.max(1, Math.round(bounds?.height || window.innerHeight));
      const dpr = Math.min(1.5, window.devicePixelRatio || 1, Math.sqrt(2_000_000 / (w * h)));
      if (w === width && h === height && dpr === ratio && resourcesReady) return;
      width = w; height = h; ratio = dpr;
      portrait = height > width * 1.15;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      const scale = Math.max(1, Math.sqrt(width * height / 1_200_000));
      fontSize = 7 * scale; cellWidth = 4 * scale; cellHeight = 7 * scale;
      columns = Math.ceil(width / cellWidth); rows = Math.ceil(height / cellHeight);
      sampleCanvas.width = columns; sampleCanvas.height = rows;
      if (finished || reduced) { complete(); return; }
      if (ready) { buildAtlas(); buildWave(); resourcesReady = true; }
      paint();
    };
    const frame = (now: number) => {
      raf = 0;
      if (disposed || !ready || finished || document.hidden) return;
      if (!startedAt) startedAt = now - elapsed;
      elapsed = now - startedAt;
      if (lastPaint) frameIntervals.push(now - lastPaint);
      lastPaint = now;
      const before = performance.now(); paint(); updateTimes.push(performance.now() - before);
      if (!finished) raf = requestAnimationFrame(frame);
    };
    const resume = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; startedAt = 0; lastPaint = 0; }
      else if (ready && !finished && !raf) raf = requestAnimationFrame(frame);
    };
    const onMotion = () => { reduced = motion.matches; if (reduced) complete(); };
    resize();
    const observer = new ResizeObserver(resize); if (intro) observer.observe(intro);
    const visibility = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) complete();
    });
    if (intro) visibility.observe(intro);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", onMotion);
    canvas.addEventListener("webglcontextlost", fail);
    const imageReady = original.complete ? (original.naturalWidth ? Promise.resolve() : Promise.reject(new Error("Artwork unavailable")))
      : new Promise<void>((resolve, reject) => {
        original.onload = () => resolve(); original.onerror = () => reject(new Error("Artwork unavailable"));
      });
    Promise.all([imageReady, document.fonts.ready]).then(() => {
      if (disposed || finished) return;
      ready = true; resize(); if (!document.hidden) raf = requestAnimationFrame(frame);
    }).catch(fail);
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); visibility.disconnect(); renderer.dispose();
      original.onload = null; original.onerror = null;
      window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", resume); motion.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", fail);
    };
  }, []);

  return <>
    {/* eslint-disable-next-line @next/next/no-img-element -- The local poster is also the canvas source, sharing one image request. */}
    <img ref={originalRef} className="wave-original" src={IMAGE} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
    <canvas ref={canvasRef} className="wave-art" aria-hidden="true" />
  </>;
}
