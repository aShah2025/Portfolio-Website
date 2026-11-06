"use client";

import { useEffect, useRef } from "react";
import { createWaveSpray, sampleWaveSpray, SPRAY_DURATION, type WaveSpray } from "./waveSpray";

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
    const context = canvas.getContext("2d");
    const sampleCanvas = document.createElement("canvas"), sample = sampleCanvas.getContext("2d", { willReadFrequently: true });
    const atlas = document.createElement("canvas"), ink = atlas.getContext("2d", { willReadFrequently: true });
    const waveLayer = document.createElement("canvas"), waveContext = waveLayer.getContext("2d");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches, disposed = false, ready = false, finished = false;
    let raf = 0, startedAt = 0, elapsed = 0, resourcesReady = false;
    let width = 1, height = 1, ratio = 1, columns = 1, rows = 1;
    let cellWidth = 4, cellHeight = 7, tileWidth = 1, tileHeight = 1, fontSize = 7;
    let portrait = false;
    let source: SourceGlyph[] = [], spray: WaveSpray | null = null;
    let particleX = new Float32Array(0), particleY = new Float32Array(0);
    let spriteX = new Uint16Array(0), spriteY = new Uint16Array(0), next = new Int32Array(0);
    const heads = new Int32Array(16);
    const opacity = Array.from({ length: heads.length }, (_, i) => (i + .5) / heads.length);
    const glyphLookup = new Uint8Array(256);
    const water = { x: 0, y: 0, alpha: 0 };
    const renderTimes: number[] = [], frameIntervals: number[] = [];
    let lastPaint = 0;
    const phase = (value: string) => {
      if (canvas.dataset.wavePhase === value) return;
      canvas.dataset.wavePhase = value;
      if (intro) intro.dataset.wavePhase = value;
    };
    const complete = () => {
      if (disposed) return;
      finished = true; cancelAnimationFrame(raf); raf = 0;
      original.style.visibility = "hidden";
      if (context) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.globalAlpha = 1; context.fillStyle = PAPER; context.fillRect(0, 0, width, height);
        canvas.style.opacity = "1";
      }
      intro?.style.setProperty("--name-reveal", "1"); phase("ready");
      if (renderTimes.length) {
        const percentile = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length * .95)] || 0;
        canvas.dataset.wavePerf = JSON.stringify({ frames: renderTimes.length, particles: spray?.sourceIndex.length || 0,
          renderP95: +percentile(renderTimes).toFixed(2), intervalP95: +percentile(frameIntervals).toFixed(2),
          fps: +(1000 * frameIntervals.length / frameIntervals.reduce((sum, value) => sum + value, 0)).toFixed(1) });
      }
    };
    const fail = () => {
      if (disposed) return;
      complete(); original.style.visibility = "visible"; original.style.opacity = ".12";
      canvas.style.opacity = "0"; phase("error");
    };
    if (!context || !sample || !ink || !waveContext) { fail(); return; }

    const imageFrame = () => {
      const scale = portrait ? width * 1.4 / original.naturalWidth
        : Math.max(width / original.naturalWidth, height / original.naturalHeight);
      const w = original.naturalWidth * scale, h = original.naturalHeight * scale;
      return { x: (width - w) * .5, y: (height - h) * .5, width: w, height: h };
    };
    const buildAtlas = () => {
      tileWidth = Math.ceil(cellWidth * ratio); tileHeight = Math.ceil(cellHeight * ratio);
      atlas.width = tileWidth * CHARACTERS.length; atlas.height = tileHeight * INKS.length;
      ink.setTransform(ratio, 0, 0, ratio, 0, 0);
      ink.font = `400 ${fontSize}px ${getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace"}`;
      ink.textAlign = "center"; ink.textBaseline = "middle";
      INKS.forEach((color, row) => {
        ink.fillStyle = color;
        for (let column = 0; column < CHARACTERS.length; column++) {
          ink.fillText(CHARACTERS[column], (column + .5) * tileWidth / ratio, (row + .5) * tileHeight / ratio);
        }
      });
      const glyphs = Array.from(CHARACTERS, (_, column) => {
        const pixels = ink.getImageData(column * tileWidth, 0, tileWidth, tileHeight).data;
        let alpha = 0;
        for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i] / 255;
        return { column, density: alpha / (tileWidth * tileHeight) };
      }).sort((a, b) => a.density - b.density);
      const maximum = glyphs[glyphs.length - 1]?.density || 1;
      for (const glyph of glyphs) glyph.density /= maximum;
      for (let i = 0; i < 256; i++) {
        glyphLookup[i] = glyphs.reduce((nearest, glyph) => Math.abs(glyph.density - i / 255) < Math.abs(nearest.density - i / 255) ? glyph : nearest).column;
      }
    };
    const buildWave = () => {
      const image = imageFrame();
      sample.fillStyle = PAPER; sample.fillRect(0, 0, columns, rows);
      sample.drawImage(original, image.x * columns / width, image.y * rows / height,
        image.width * columns / width, image.height * rows / height);
      const pixels = sample.getImageData(0, 0, columns, rows).data;
      source = [];
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
      spray = createWaveSpray(source, width, height,
        { x: image.x + image.width * .54, y: image.y + image.height * .30 });
      waveLayer.width = canvas.width; waveLayer.height = canvas.height;
      waveContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      for (const glyph of source) {
        waveContext.drawImage(atlas, glyph.column * tileWidth, glyph.tone * tileHeight, tileWidth, tileHeight,
          glyph.x - cellWidth * .5, glyph.y - cellHeight * .5, tileWidth / ratio, tileHeight / ratio);
      }
      const count = spray.sourceIndex.length;
      particleX = new Float32Array(count); particleY = new Float32Array(count);
      spriteX = new Uint16Array(count); spriteY = new Uint16Array(count); next = new Int32Array(count);
      for (let i = 0; i < count; i++) {
        const glyph = source[spray.sourceIndex[i]];
        spriteX[i] = glyphLookup[Math.round(glyph.strength * .9 * 255)] * tileWidth;
        spriteY[i] = glyph.tone * tileHeight;
      }
    };

    const paint = () => {
      if (finished) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.globalAlpha = 1; context.fillStyle = PAPER; context.fillRect(0, 0, width, height);
      if (!ready || !spray) { canvas.style.opacity = "0"; return; }
      canvas.style.opacity = "1"; original.style.visibility = "hidden";
      const ascii = ease((elapsed - 80) / 700);
      const time = Math.max(0, (elapsed - MOTION_START) / 1000);
      if (time >= SPRAY_DURATION) { complete(); return; }
      if (ascii < 1) {
        const image = imageFrame(); context.globalAlpha = 1 - ascii;
        context.drawImage(original, image.x, image.y, image.width, image.height);
      }
      // Preserve the fine detail in one cached layer. Only the light crest spray
      // needs individual updates as the wave breaks to the right and disappears.
      const body = 1 - ease((time - .18) / .72);
      if (body > 0) {
        context.globalAlpha = ascii * body;
        context.drawImage(waveLayer, width * .10 * ease(time / .65), 0, width, height);
      }
      heads.fill(-1);
      for (let i = 0; i < spray.sourceIndex.length; i++) {
        sampleWaveSpray(spray, i, time, water);
        if (water.alpha < .04 || water.x < -cellWidth || water.x > width + cellWidth || water.y < -cellHeight || water.y > height + cellHeight) continue;
        const bucket = Math.min(heads.length - 1, Math.floor(water.alpha * heads.length));
        particleX[i] = water.x; particleY[i] = water.y;
        next[i] = heads[bucket]; heads[bucket] = i;
      }
      for (let bucket = 0; bucket < heads.length; bucket++) {
        context.globalAlpha = opacity[bucket] * ascii;
        for (let i = heads[bucket]; i !== -1; i = next[i]) {
          context.drawImage(atlas, spriteX[i], spriteY[i], tileWidth, tileHeight,
            particleX[i] - cellWidth * .5, particleY[i] - cellHeight * .5, tileWidth / ratio, tileHeight / ratio);
        }
      }
      context.globalAlpha = 1;
      const name = ease((time - (SPRAY_DURATION - .65)) / .65);
      intro?.style.setProperty("--name-reveal", String(name));
      phase(name > .01 ? "revealing" : time >= 1.65 ? "falling" : time >= .6 ? "spraying" : time > 0 ? "breaking" : ascii > 0 ? "converting" : "painting");
    };
    const resize = () => {
      const bounds = intro?.getBoundingClientRect();
      const w = Math.max(1, Math.round(bounds?.width || window.innerWidth));
      const h = Math.max(1, Math.round(bounds?.height || window.innerHeight));
      const dpr = Math.min(1.25, window.devicePixelRatio || 1, Math.sqrt(2_000_000 / (w * h)));
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
      const before = performance.now(); paint(); renderTimes.push(performance.now() - before);
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
    const imageReady = original.complete ? (original.naturalWidth ? Promise.resolve() : Promise.reject(new Error("Artwork unavailable")))
      : new Promise<void>((resolve, reject) => {
        original.onload = () => resolve(); original.onerror = () => reject(new Error("Artwork unavailable"));
      });
    Promise.all([imageReady, document.fonts.ready]).then(() => {
      if (disposed || finished) return;
      ready = true; resize(); if (!document.hidden) raf = requestAnimationFrame(frame);
    }).catch(fail);
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); visibility.disconnect();
      original.onload = null; original.onerror = null;
      window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", resume); motion.removeEventListener("change", onMotion);
    };
  }, []);

  return <>
    {/* eslint-disable-next-line @next/next/no-img-element -- The local poster is also the canvas source, sharing one image request. */}
    <img ref={originalRef} className="wave-original" src={IMAGE} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
    <canvas ref={canvasRef} className="wave-art" aria-hidden="true" />
  </>;
}
