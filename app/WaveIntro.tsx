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
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches, disposed = false, ready = false, finished = false;
    let raf = 0, startedAt = 0, elapsed = 0, drawnAt = -Infinity;
    let width = 1, height = 1, ratio = 1, columns = 1, rows = 1;
    let cellWidth = 4, cellHeight = 7, tileWidth = 1, tileHeight = 1, fontSize = 7;
    let portrait = false;
    let source: SourceGlyph[] = [], spray: WaveSpray | null = null;
    const glyphLookup = new Uint8Array(256);
    const water = { x: 0, y: 0, alpha: 0 };
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
    };
    const fail = () => {
      if (disposed) return;
      complete(); original.style.visibility = "visible"; original.style.opacity = ".12";
      canvas.style.opacity = "0"; phase("error");
    };
    if (!context || !sample || !ink) { fail(); return; }

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
      // Every letter begins on the real print. The crest carries those letters
      // sideways into spray; the same letters then fall under gravity.
      for (let i = 0; i < spray.sourceIndex.length; i++) {
        sampleWaveSpray(spray, i, time, water);
        const alpha = water.alpha * ascii;
        if (alpha < .01 || water.x < -cellWidth || water.x > width + cellWidth || water.y < -cellHeight || water.y > height + cellHeight) continue;
        const glyph = source[spray.sourceIndex[i]];
        const foam = spray.foam[i] === 1;
        const column = foam ? glyphLookup[Math.round(glyph.strength * .68 * 255)] : glyph.column;
        const tone = foam ? Math.max(0, glyph.tone - 1) : glyph.tone;
        context.globalAlpha = alpha;
        context.drawImage(atlas, column * tileWidth, tone * tileHeight, tileWidth, tileHeight,
          water.x - cellWidth * .5, water.y - cellHeight * .5, tileWidth / ratio, tileHeight / ratio);
      }
      context.globalAlpha = 1;
      const name = ease((time - (SPRAY_DURATION - .8)) / .8);
      intro?.style.setProperty("--name-reveal", String(name));
      phase(name > .01 ? "revealing" : time >= 2.8 ? "falling" : time >= .85 ? "spraying" : time > 0 ? "breaking" : ascii > 0 ? "converting" : "painting");
    };
    const resize = () => {
      const bounds = intro?.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds?.width || window.innerWidth));
      height = Math.max(1, Math.round(bounds?.height || window.innerHeight));
      portrait = height > width * 1.15;
      ratio = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(5_000_000 / (width * height)));
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      const scale = Math.max(1, Math.sqrt(width * height / 1_200_000));
      fontSize = 7 * scale; cellWidth = 4 * scale; cellHeight = 7 * scale;
      columns = Math.ceil(width / cellWidth); rows = Math.ceil(height / cellHeight);
      sampleCanvas.width = columns; sampleCanvas.height = rows;
      buildAtlas();
      if (finished || reduced) { complete(); return; }
      if (ready) buildWave();
      paint();
    };
    const frame = (now: number) => {
      raf = 0;
      if (disposed || !ready || finished || document.hidden) return;
      if (!startedAt) startedAt = now - elapsed;
      if (now - drawnAt >= 1000 / 30) { elapsed = now - startedAt; drawnAt = now; paint(); }
      if (!finished) raf = requestAnimationFrame(frame);
    };
    const resume = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; startedAt = 0; }
      else if (ready && !finished && !raf) raf = requestAnimationFrame(frame);
    };
    const onMotion = () => { reduced = motion.matches; if (reduced) complete(); };
    resize();
    const observer = new ResizeObserver(resize); if (intro) observer.observe(intro);
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
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
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
