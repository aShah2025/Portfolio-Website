"use client";

import { useEffect, useRef } from "react";

const IMAGE = "/images/great-wave.webp";
const PAPER = "#f5f6f2";
const DURATION = 5200;
const HOLD = 350;
const ZOOM_END = 2500;
const CRASH_START = 2750;
const CHARACTERS = " .,:;!|/\\iltfrcLJTU+*oazCYXZmwkbdpq0OQ#%&@$";
const INKS = ["#a8bac4", "#8fa7b5", "#7392a6", "#557d96", "#3d6b88", "#2c5b7b", "#204c6b", "#173f5d"];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

type Glyph = { column: number; density: number };
type WaveGlyph = { x: number; y: number; column: number; tone: number };

/** The finite opening runs independently of the portfolio's idle current. */
export default function WaveIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current, original = originalRef.current;
    if (!canvas || !original) return;
    const intro = canvas.closest<HTMLElement>(".intro");
    const context = canvas.getContext("2d");
    if (!context) { original.style.visibility = "hidden"; if (intro) intro.dataset.wavePhase = "error"; return; }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches, disposed = false, ready = false, finished = false;
    let raf = 0, startedAt = 0, elapsed = 0, drawnAt = -Infinity;
    let width = 1, height = 1, ratio = 1, columns = 1, rows = 1;
    let cellWidth = 4.5, cellHeight = 8, tileWidth = 1, tileHeight = 1, fontSize = 8;
    let portrait = false, glyphs: Glyph[] = [], glyphLookup: Glyph[] = [];
    let crashGlyphs: WaveGlyph[] | null = null;
    const sampling = document.createElement("canvas");
    const sample = sampling.getContext("2d", { willReadFrequently: true });
    const atlas = document.createElement("canvas"), ink = atlas.getContext("2d", { willReadFrequently: true });
    if (!sample || !ink) { original.style.visibility = "hidden"; if (intro) intro.dataset.wavePhase = "error"; return; }

    const phase = (value: string) => {
      if (canvas.dataset.wavePhase !== value) {
        canvas.dataset.wavePhase = value;
        if (intro) intro.dataset.wavePhase = value;
      }
    };
    phase("loading");

    const buildAtlas = () => {
      tileWidth = Math.ceil(cellWidth * ratio); tileHeight = Math.ceil(cellHeight * ratio);
      atlas.width = tileWidth * CHARACTERS.length; atlas.height = tileHeight * INKS.length;
      ink.setTransform(ratio, 0, 0, ratio, 0, 0);
      ink.font = `400 ${fontSize}px ${getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace"}`;
      ink.textAlign = "center"; ink.textBaseline = "middle";
      INKS.forEach((color, row) => {
        ink.fillStyle = color;
        for (let column = 0; column < CHARACTERS.length; column++) {
          ink.fillText(CHARACTERS[column], (column + 0.5) * tileWidth / ratio, (row + 0.5) * tileHeight / ratio);
        }
      });
      // Actual font coverage defines the ramp, so punctuation, outlines and dark wave shapes
      // receive the appropriate amount of ink across different device pixel ratios.
      glyphs = Array.from(CHARACTERS, (_, column) => {
        const pixels = ink.getImageData(column * tileWidth, 0, tileWidth, tileHeight).data;
        let alpha = 0;
        for (let offset = 3; offset < pixels.length; offset += 4) alpha += pixels[offset] / 255;
        return { column, density: alpha / (tileWidth * tileHeight) };
      }).sort((a, b) => a.density - b.density);
      const maximum = glyphs[glyphs.length - 1]?.density || 1;
      glyphs.forEach((glyph) => { glyph.density /= maximum; });
      glyphLookup = Array.from({ length: 256 }, (_, index) => glyphs.reduce((nearest, glyph) => Math.abs(glyph.density - index / 255) < Math.abs(nearest.density - index / 255) ? glyph : nearest));
    };

    const crop = (amount: number) => {
      const cover = Math.max(width / original.naturalWidth, height / original.naturalHeight);
      const scale = cover * mix(1, portrait ? 1.15 : 1.65, amount);
      const sourceX = mix(portrait ? 0.42 : 0.5, portrait ? 0.43 : 0.65, amount);
      const sourceY = mix(0.5, portrait ? 0.4 : 0.36, amount);
      const screenX = mix(0.5, portrait ? 0.5 : 0.68, amount);
      const screenY = mix(0.5, portrait ? 0.42 : 0.4, amount);
      return {
        x: width * screenX - original.naturalWidth * sourceX * scale,
        y: height * screenY - original.naturalHeight * sourceY * scale,
        width: original.naturalWidth * scale,
        height: original.naturalHeight * scale,
      };
    };

    const sampleWave = (amount: number): WaveGlyph[] => {
      const image = crop(amount);
      sample.setTransform(1, 0, 0, 1, 0, 0);
      sample.fillStyle = PAPER; sample.fillRect(0, 0, columns, rows);
      sample.drawImage(original, image.x / cellWidth, image.y / cellHeight, image.width / cellWidth, image.height / cellHeight);
      const pixels = sample.getImageData(0, 0, columns, rows).data;
      const characters: WaveGlyph[] = [];
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const offset = (row * columns + column) * 4;
        const red = pixels[offset], green = pixels[offset + 1], blue = pixels[offset + 2];
        const luminance = (red * 0.3 + green * 0.59 + blue * 0.11) / 255;
        // Aged paper and its brown mottling become open space; Hokusai's blue ink remains.
        const blueInk = clamp((blue - red + 12) / 55);
        const strength = Math.pow(clamp((0.86 - luminance) / 0.7) * blueInk, 1.05);
        if (strength < 0.1) continue;
        const glyph = glyphLookup[Math.round(strength * 255)];
        if (CHARACTERS[glyph.column] === " ") continue;
        const x = column * cellWidth, y = row * cellHeight;
        characters.push({ x, y, column: glyph.column, tone: Math.min(INKS.length - 1, Math.floor(strength * INKS.length)) });
      }
      return characters;
    };

    const drawGlyph = (glyph: WaveGlyph, x = glyph.x, y = glyph.y) => {
      if (x < -cellWidth || x > width || y < -cellHeight || y > height) return;
      context.drawImage(atlas, glyph.column * tileWidth, glyph.tone * tileHeight, tileWidth, tileHeight, x, y, tileWidth / ratio, tileHeight / ratio);
    };

    const crash = (progress: number) => {
      if (!crashGlyphs) crashGlyphs = sampleWave(1);
      const image = crop(1);
      // Work in the print's coordinates, so the same crest turns over in every crop.
      const hingeX = image.x + image.width * 0.34;
      const hingeY = image.y + image.height * 0.66;
      const curl = ease(progress / 0.5);
      const breaking = ease((progress - 0.3) / 0.44);
      const wash = ease((progress - 0.66) / 0.34);
      const angle = 1.18 * curl, cosine = Math.cos(angle), sine = Math.sin(angle);
      const shoreline = height * 0.83;

      // One smooth flow carries adjacent characters together. The lower water anchors
      // the overturning crest, then the whole body flattens into a shoreward wash.
      for (const glyph of crashGlyphs) {
        const sourceX = (glyph.x - image.x) / image.width;
        const sourceY = (glyph.y - image.y) / image.height;
        const upper = ease((0.69 - sourceY) / 0.45);
        const crest = Math.exp(-(((sourceX - 0.39) / 0.3) ** 2)) * upper;
        const dx = glyph.x - hingeX, dy = glyph.y - hingeY;
        const foldedX = glyph.x + (dx * cosine - dy * sine - dx) * crest;
        const foldedY = glyph.y + (dx * sine + dy * cosine - dy) * crest;
        const washX = glyph.x * 1.4 - width * 0.12;
        const washY = shoreline + (glyph.y - shoreline) * 0.15
          + height * 0.018 * Math.sin(glyph.x / width * Math.PI * 2);
        const x = mix(foldedX, washX, breaking) + width * 0.24 * wash;
        const y = mix(foldedY, washY, breaking) + height * 1.1 * wash * wash;
        drawGlyph(glyph, x, y);
      }
    };

    const paint = (at: number) => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.globalAlpha = 1; context.fillStyle = PAPER; context.fillRect(0, 0, width, height);
      if (reduced || at >= DURATION) {
        canvas.style.opacity = "1";
        original.style.visibility = "hidden";
        phase("ready");
        return;
      }
      if (!ready || !original.naturalWidth) { canvas.style.opacity = "0"; return; }
      canvas.style.opacity = "1";
      if (at >= CRASH_START) {
        crash(clamp((at - CRASH_START) / (DURATION - CRASH_START)));
        original.style.visibility = "hidden";
        const progress = (at - CRASH_START) / (DURATION - CRASH_START);
        phase(progress < 0.3 ? "curling" : progress < 0.66 ? "breaking" : "receding");
        return;
      }
      const zoom = ease((at - HOLD) / (ZOOM_END - HOLD));
      const dissolve = ease((at - HOLD) / 1000);
      const frame = crop(zoom);
      if (dissolve < 1) {
        context.globalAlpha = 1 - dissolve;
        context.drawImage(original, frame.x, frame.y, frame.width, frame.height);
      }
      if (dissolve > 0) {
        context.globalAlpha = dissolve;
        for (const glyph of sampleWave(zoom)) drawGlyph(glyph);
      }
      context.globalAlpha = 1;
      original.style.visibility = "hidden";
      phase(at >= HOLD + 1000 ? "ascii" : at >= HOLD ? "transition" : "painting");
    };

    const resize = () => {
      const bounds = intro?.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds?.width || window.innerWidth));
      height = Math.max(1, Math.round(bounds?.height || window.innerHeight));
      portrait = height > width * 1.15;
      ratio = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(5_000_000 / (width * height)));
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      // Keep the type readable while bounding work on very large screens.
      const scale = Math.max(1, Math.sqrt(width * height / 1_800_000));
      fontSize = 8 * scale; cellWidth = 4.5 * scale; cellHeight = 8 * scale;
      columns = Math.ceil(width / cellWidth); rows = Math.ceil(height / cellHeight);
      sampling.width = columns; sampling.height = rows;
      crashGlyphs = null;
      buildAtlas();
      paint(finished || reduced ? DURATION : elapsed);
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || !ready || finished) return;
      if (document.hidden) return;
      if (!startedAt) startedAt = now - elapsed;
      if (now - drawnAt >= 1000 / 30) {
        elapsed = Math.min(DURATION, now - startedAt); drawnAt = now;
        paint(reduced ? DURATION : elapsed);
      }
      if (reduced || elapsed >= DURATION) { finished = true; return; }
      raf = requestAnimationFrame(frame);
    };
    const resume = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; startedAt = 0; }
      else if (ready && !finished && !raf) raf = requestAnimationFrame(frame);
    };
    const onMotion = () => {
      reduced = motion.matches;
      if (reduced) {
        cancelAnimationFrame(raf); raf = 0; finished = true; elapsed = DURATION; paint(DURATION);
      }
    };
    const fail = () => {
      if (disposed) return;
      original.style.visibility = "hidden";
      canvas.style.opacity = "1";
      phase("error");
    };
    let imageResolved = false;
    const imageReady = new Promise<void>((resolve, reject) => {
      if (original.complete && original.naturalWidth) { imageResolved = true; resolve(); return; }
      if (original.complete) { imageResolved = true; reject(new Error("Opening artwork unavailable")); return; }
      original.onload = () => { imageResolved = true; resolve(); };
      original.onerror = () => { imageResolved = true; reject(new Error("Opening artwork unavailable")); };
    });
    resize();
    const observer = new ResizeObserver(resize); if (intro) observer.observe(intro);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", onMotion);
    Promise.all([imageReady, document.fonts.ready]).then(() => {
      if (disposed) return;
      ready = true; resize();
      if (reduced) { finished = true; elapsed = DURATION; paint(DURATION); }
      else raf = requestAnimationFrame(frame);
    }).catch(fail);

    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", onMotion);
      if (!imageResolved) { original.onload = null; original.onerror = null; }
    };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- This optimized local poster is also the canvas source, avoiding a second image request. */}
      <img ref={originalRef} className="wave-original" src={IMAGE} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
      <canvas ref={canvasRef} className="wave-art" aria-hidden="true" />
    </>
  );
}
