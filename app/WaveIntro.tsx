"use client";

import { useEffect, useRef } from "react";
import { prepareFoamWash, sampleFoamWash } from "./foamWash";

const IMAGE = "/images/great-wave.webp";
const PAPER = "#f5f6f2";
const DURATION = 6100;
const HOLD = 350;
const CHARACTERS = " .,:;!|/\\iltfrcLJTU+*oazCYXZmwkbdpq0OQ#%&@$";
const INKS = ["#a8bac4", "#8fa7b5", "#7392a6", "#557d96", "#3d6b88", "#2c5b7b", "#204c6b", "#173f5d"];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export default function WaveIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current, original = originalRef.current;
    if (!canvas || !original) return;
    const intro = canvas.closest<HTMLElement>(".intro");
    const context = canvas.getContext("2d");
    const foam = document.createElement("canvas"), foamContext = foam.getContext("2d");
    const atlas = document.createElement("canvas"), ink = atlas.getContext("2d", { willReadFrequently: true });
    const phase = (value: string) => {
      canvas.dataset.wavePhase = value;
      if (intro) intro.dataset.wavePhase = value;
    };
    const fail = () => {
      original.style.visibility = "hidden";
      if (context) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height); }
      intro?.style.setProperty("--name-reveal", "1");
      phase("error");
    };
    if (!context || !foamContext || !ink) { fail(); return; }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches, disposed = false, ready = false, finished = false;
    let raf = 0, startedAt = 0, elapsed = 0, drawnAt = -Infinity;
    let width = 1, height = 1, ratio = 1, columns = 1, rows = 1;
    let cellWidth = 4, cellHeight = 7, tileWidth = 1, tileHeight = 1, fontSize = 7;
    let portrait = false;
    let foamPixels: ImageData;
    let strengths = new Float32Array(1);
    const glyphLookup = new Uint8Array(256);
    const foamSample = { cover: 0, ink: 0 };

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

    const crop = (progress: number) => {
      const push = ease(progress / 0.55);
      const scale = Math.max(width / original.naturalWidth, height / original.naturalHeight) * mix(1, 1.06, push);
      const w = original.naturalWidth * scale, h = original.naturalHeight * scale;
      return { x: width * .5 - w * mix(.5, portrait ? .51 : .52, push),
        y: height * .5 - h * .5, width: w, height: h };
    };

    const paint = (at: number) => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.globalAlpha = 1; context.fillStyle = PAPER; context.fillRect(0, 0, width, height);
      if (reduced || at >= DURATION) {
        canvas.style.opacity = "1"; original.style.visibility = "hidden";
        intro?.style.setProperty("--name-reveal", "1"); phase("ready"); return;
      }
      if (!ready || !original.naturalWidth) { canvas.style.opacity = "0"; return; }
      canvas.style.opacity = "1"; original.style.visibility = "hidden";
      const progress = clamp((at - HOLD) / (DURATION - HOLD));
      const image = crop(progress);
      // The print stays intact. Once the incoming wash covers it, it is retired:
      // the downward drain uncovers paper and the name, never the painting again.
      if (progress < .65) context.drawImage(original, image.x, image.y, image.width, image.height);
      const field = prepareFoamWash(width, height, progress,
        { x: image.x + image.width * .54, y: image.y + image.height * .30 });
      const ascii = ease((progress - .16) / .26);
      const normalFoam = 1 - ascii;
      const pixels = foamPixels.data;
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        const water = sampleFoamWash(field, (column + .5) * width / columns, (row + .5) * height / rows, foamSample);
        const shade = water.ink * normalFoam * .72;
        const offset = index * 4;
        pixels[offset] = 245 - 105 * shade;
        pixels[offset + 1] = 246 - 70 * shade;
        pixels[offset + 2] = 242 - 45 * shade;
        pixels[offset + 3] = Math.round(water.cover * 255);
        strengths[index] = water.ink;
      }
      foamContext.putImageData(foamPixels, 0, 0);
      context.imageSmoothingEnabled = true;
      context.drawImage(foam, 0, 0, width, height);
      // The same foam becomes ASCII as it surges upward; only its density moves.
      // The character grid remains upright through the full-screen wash and drain.
      if (ascii > 0) {
        context.globalAlpha = ascii;
        for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
          const strength = strengths[row * columns + column];
          if (strength < .085) continue;
          const glyph = glyphLookup[Math.round(clamp(strength) * 255)];
          if (glyph === 0) continue;
          const tone = Math.min(INKS.length - 1, Math.floor(strength * INKS.length));
          context.drawImage(atlas, glyph * tileWidth, tone * tileHeight, tileWidth, tileHeight,
            column * width / columns, row * height / rows, tileWidth / ratio, tileHeight / ratio);
        }
        context.globalAlpha = 1;
      }
      const center = sampleFoamWash(field, width * .5, height * .48, foamSample);
      const name = progress > .75 ? ease(1 - center.cover) : 0;
      intro?.style.setProperty("--name-reveal", String(name));
      phase(name > .01 ? "revealing" : progress >= .75 ? "draining" : progress >= .65 ? "covered" : progress >= .20 ? "washing" : progress > 0 ? "foaming" : "painting");
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
      foam.width = columns; foam.height = rows;
      foamPixels = foamContext.createImageData(columns, rows);
      strengths = new Float32Array(columns * rows);
      buildAtlas(); paint(finished || reduced ? DURATION : elapsed);
    };
    const frame = (now: number) => {
      raf = 0;
      if (disposed || !ready || finished || document.hidden) return;
      if (!startedAt) startedAt = now - elapsed;
      if (now - drawnAt >= 1000 / 30) {
        elapsed = Math.min(DURATION, now - startedAt); drawnAt = now; paint(elapsed);
      }
      if (elapsed >= DURATION) { finished = true; return; }
      raf = requestAnimationFrame(frame);
    };
    const resume = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; startedAt = 0; }
      else if (ready && !finished && !raf) raf = requestAnimationFrame(frame);
    };
    const onMotion = () => {
      reduced = motion.matches;
      if (reduced) { cancelAnimationFrame(raf); raf = 0; finished = true; elapsed = DURATION; paint(DURATION); }
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
    }).catch(() => { if (!disposed) fail(); });
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", onMotion);
      if (!imageResolved) { original.onload = null; original.onerror = null; }
    };
  }, []);

  return <>
    {/* eslint-disable-next-line @next/next/no-img-element -- The local poster is also the canvas source, sharing one image request. */}
    <img ref={originalRef} className="wave-original" src={IMAGE} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
    <canvas ref={canvasRef} className="wave-art" aria-hidden="true" />
  </>;
}
