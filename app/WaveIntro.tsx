"use client";

import { useEffect, useRef } from "react";
import { createWaveRenderer } from "./waveRenderer";

const IMAGE = "/images/great-wave.webp";
const VIDEO = "/video/wave-motion.mp4";
const MOTION_START = 780;
const WASH_END = 2.7;
const DRAIN_DURATION = 1.4;
const CHARACTERS = " .,:;!|/\\iltfrcLJTU+*oazCYXZmwkbdpq0OQ#%&@$";
const INKS = ["#a8bac4", "#8fa7b5", "#7392a6", "#557d96", "#3d6b88", "#2c5b7b", "#204c6b", "#173f5d"];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

export default function WaveIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current, original = originalRef.current, video = videoRef.current;
    if (!canvas || !original || !video) return;
    const intro = canvas.closest<HTMLElement>(".intro");
    const renderer = createWaveRenderer(canvas);
    const atlas = document.createElement("canvas"), ink = atlas.getContext("2d", { willReadFrequently: true });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches, disposed = false, ready = false, finished = false;
    let raf = 0, startedAt = 0, elapsed = 0, resourcesReady = false;
    let width = 1, height = 1, ratio = 1, cellWidth = 3, cellHeight = 5, tileSize = 1, fontSize = 5;
    let portrait = false, playbackStarted = false, drainingAt: number | null = null;
    let videoDirty = true, videoFrameRequest = 0, decodedFrames = -1, videoUploads = 0, loadTimer = 0;
    const hasVideoFrames = typeof video.requestVideoFrameCallback === "function";
    const glyphLookup = new Uint8Array(256);
    const updateTimes: number[] = [], frameIntervals: number[] = [];
    let lastPaint = 0;
    const phase = (value: string) => {
      if (canvas.dataset.wavePhase === value) return;
      canvas.dataset.wavePhase = value;
      if (intro) intro.dataset.wavePhase = value;
    };
    const stopVideo = () => {
      video.pause();
      if (videoFrameRequest && hasVideoFrames) video.cancelVideoFrameCallback(videoFrameRequest);
      videoFrameRequest = 0;
      video.removeAttribute("src"); video.load();
    };
    const complete = () => {
      if (disposed || finished) return;
      finished = true; cancelAnimationFrame(raf); raf = 0;
      window.clearTimeout(loadTimer);
      original.style.visibility = "hidden"; renderer?.clear();
      intro?.style.setProperty("--name-reveal", "1"); phase("ready");
      if (updateTimes.length) {
        const percentile = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length * .95)] || 0;
        canvas.dataset.wavePerf = JSON.stringify({ renderer: "video-ascii", frames: updateTimes.length,
          glyphs: renderer?.glyphCount || 0, drawCalls: 1, videoUploads,
          updateP95: +percentile(updateTimes).toFixed(2), intervalP95: +percentile(frameIntervals).toFixed(2),
          fps: +(1000 * frameIntervals.length / frameIntervals.reduce((sum, value) => sum + value, 0)).toFixed(1) });
      }
      stopVideo(); renderer?.dispose();
    };
    const fail = () => {
      if (disposed || finished) return;
      complete(); original.style.visibility = "visible"; original.style.opacity = ".12";
      canvas.style.opacity = "0"; phase("error");
    };
    if (!renderer || !ink) { fail(); renderer?.dispose(); return; }

    const imageFrame = () => {
      const scale = portrait ? width * 1.4 / original.naturalWidth
        : Math.max(width / original.naturalWidth, height / original.naturalHeight);
      const w = original.naturalWidth * scale, h = original.naturalHeight * scale;
      return { x: (width - w) * .5, y: (height - h) * .5, width: w, height: h };
    };
    const videoFrame = (seconds: number) => {
      const art = imageFrame();
      const fillHeight = Math.max(height, width * 9 / 16);
      const h = art.height + (fillHeight - art.height) * ease(seconds / 1.0);
      const w = h * 16 / 9;
      return { x: (width - w) * .5, y: (height - h) * .5, width: w, height: h };
    };
    const buildAtlas = () => {
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
    const play = () => {
      void video.play().catch(() => { if (!document.hidden) fail(); });
    };
    const onVideoFrame = () => {
      videoFrameRequest = 0;
      if (disposed || finished) return;
      videoDirty = true;
      videoFrameRequest = video.requestVideoFrameCallback(onVideoFrame);
    };
    const uploadFrame = () => {
      if (!hasVideoFrames) {
        const quality = video.getVideoPlaybackQuality?.();
        const frames = quality && quality.totalVideoFrames > 0 ? quality.totalVideoFrames : Math.floor(video.currentTime * 60);
        if (frames !== decodedFrames) { videoDirty = true; decodedFrames = frames; }
      }
      if (videoDirty && video.readyState >= 2) {
        renderer.uploadVideo(video); videoDirty = false; videoUploads++;
      }
    };
    const paint = () => {
      if (finished || !ready) return;
      canvas.style.opacity = "1";
      const ascii = ease((elapsed - 80) / 700);
      original.style.opacity = String(1 - ascii);
      original.style.visibility = ascii >= 1 ? "hidden" : "visible";
      if (elapsed >= MOTION_START && !playbackStarted) { playbackStarted = true; play(); }
      uploadFrame();
      const seconds = Math.min(WASH_END, video.currentTime);
      if (playbackStarted && drainingAt === null && (video.currentTime >= WASH_END || video.ended)) {
        uploadFrame(); video.pause(); drainingAt = elapsed;
      }
      const drain = drainingAt === null ? 0 : (elapsed - drainingAt) / 1000;
      if (drain >= DRAIN_DURATION) { complete(); return; }
      renderer.draw({ ascii, flow: ease(seconds / .34), drain, videoFrame: videoFrame(seconds) });
      const name = ease((drain - .72) / (DRAIN_DURATION - .72));
      intro?.style.setProperty("--name-reveal", String(name));
      phase(name > .01 ? "revealing" : drain > 0 ? "falling" : seconds >= 1.8 ? "washing" : seconds >= .8 ? "crashing" : playbackStarted ? "breaking" : ascii > 0 ? "converting" : "painting");
      if (elapsed > 12000) fail();
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
      fontSize = 5 * scale; cellWidth = 3 * scale; cellHeight = 5 * scale;
      if (finished || reduced) { complete(); return; }
      if (ready) {
        buildAtlas();
        renderer.configure(atlas, glyphLookup, original, video, { width, height, ratio, cellWidth, cellHeight,
          tileSize, atlasColumns: CHARACTERS.length, atlasRows: INKS.length, imageFrame: imageFrame() });
        videoDirty = true; resourcesReady = true;
      }
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
      if (document.hidden) {
        cancelAnimationFrame(raf); raf = 0; startedAt = 0; lastPaint = 0; video.pause();
      } else if (ready && !finished && !raf) {
        if (playbackStarted && drainingAt === null) play();
        raf = requestAnimationFrame(frame);
      }
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
    const onVideoError = () => fail();
    video.addEventListener("error", onVideoError);
    if (!finished) {
      const imageReady = original.complete ? (original.naturalWidth ? Promise.resolve() : Promise.reject(new Error("Artwork unavailable")))
        : new Promise<void>((resolve, reject) => {
          original.onload = () => resolve(); original.onerror = () => reject(new Error("Artwork unavailable"));
        });
      video.muted = true; video.playsInline = true; video.preload = "auto";
      video.src = VIDEO; video.load();
      loadTimer = window.setTimeout(fail, 8000);
      const videoReady = video.readyState >= 2 ? Promise.resolve() : new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error("Wave unavailable"));
      });
      Promise.all([imageReady, document.fonts.ready, videoReady]).then(() => {
        if (disposed || finished) return;
        window.clearTimeout(loadTimer);
        ready = true; resize();
        if (hasVideoFrames) videoFrameRequest = video.requestVideoFrameCallback(onVideoFrame);
        if (!document.hidden) raf = requestAnimationFrame(frame);
      }).catch(fail);
    }
    return () => {
      disposed = true; cancelAnimationFrame(raf); window.clearTimeout(loadTimer); observer.disconnect(); visibility.disconnect(); stopVideo(); renderer.dispose();
      original.onload = null; original.onerror = null; video.onloadeddata = null; video.onerror = null;
      video.removeEventListener("error", onVideoError);
      window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", resume); motion.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", fail);
    };
  }, []);

  return <>
    {/* eslint-disable-next-line @next/next/no-img-element -- The local poster is also the GPU texture source, sharing one image request. */}
    <img ref={originalRef} className="wave-original" src={IMAGE} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
    <video ref={videoRef} muted playsInline aria-hidden="true" tabIndex={-1}
      style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
    <canvas ref={canvasRef} className="wave-art" aria-hidden="true" />
  </>;
}
