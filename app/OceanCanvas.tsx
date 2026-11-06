"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { SCENES } from "./asciiScenes";

const RAMP = ".,:;i!+*#%@";
const INKS = ["#315f7c", "#527c95", "#7896a7", "#946044"];
const FRAME_MS = 1000 / 24;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type Area = { x: number; y: number; w: number; h: number; opacity: number };
type Props = {
  focus: MutableRefObject<string | null>;
  stunt: MutableRefObject<number>;
};

function paintCurrent(c: CanvasRenderingContext2D, area: Area, time: number, swell: number) {
  const { x, y, w, h } = area;
  const drift = Math.sin(time * 0.22) * h * 0.014;
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.strokeStyle = "#a9c5d5";
  c.lineWidth = 2;
  c.lineCap = "round";

  // Closely spaced contours fold into one quiet, slowly breathing current.
  for (let i = 0; i < 15; i++) {
    const depth = i / 14;
    const base = y + h * (0.68 + depth * 0.15) + drift;
    const lift = 1 - depth * 0.36 + swell * 0.08;
    const phase = Math.sin(time * 0.16 + depth * 1.8) * 0.012;
    c.globalAlpha = 0.48 + (1 - depth) * 0.38;
    c.beginPath();
    c.moveTo(x - w * 0.08, base + h * 0.08);
    c.bezierCurveTo(x + w * 0.12, base - h * 0.02, x + w * 0.28, base + h * 0.07, x + w * 0.4, base - h * 0.09);
    c.bezierCurveTo(x + w * (0.53 + phase), base - h * 0.22 * lift, x + w * 0.47, base - h * 0.46 * lift, x + w * 0.68, base - h * 0.47 * lift);
    c.bezierCurveTo(x + w * 0.88, base - h * 0.49 * lift, x + w * 0.93, base - h * 0.22 * lift, x + w * 0.76, base - h * 0.22 * lift);
    c.bezierCurveTo(x + w * 0.65, base - h * 0.21 * lift, x + w * 0.66, base - h * 0.36 * lift, x + w * 0.76, base - h * 0.32 * lift);
    c.stroke();
  }

  c.strokeStyle = "#7c9eb3";
  for (let i = 0; i < 9; i++) {
    c.globalAlpha = 0.26 + i * 0.025;
    c.beginPath();
    for (let j = 0; j <= 100; j++) {
      const u = j / 100;
      const xx = x + w * u;
      const yy = y + h * (0.77 + i * 0.024 + Math.sin(u * 6.2 - time * 0.15 + i * 0.31) * 0.025);
      if (j === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
    }
    c.stroke();
  }
  c.restore();
}

export default function OceanCanvas({ focus, stunt }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;
    const sample = document.createElement("canvas");
    const sc = sample.getContext("2d", { willReadFrequently: true });
    const atlas = document.createElement("canvas");
    const ac = atlas.getContext("2d");
    if (!sc || !ac) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    let disposed = false, raf = 0;
    let W = 0, H = 0, dpr = 1, cw = 0, ch = 0, cols = 0, rows = 0, tileW = 0, tileH = 0;
    let last = 0, drawnAt = -Infinity, time = 0, shown = 0, sceneId: string | null = null;
    let seenStunt = stunt.current, swellAt = -100;

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const size = Math.max(5.5, Math.sqrt(W * H / 95000));
      const face = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace";
      const font = `500 ${size}px ${face}`;
      ctx.font = font;
      cw = ctx.measureText("M").width; ch = size * 1.2;
      cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
      sample.width = cols; sample.height = rows;
      tileW = Math.ceil(cw * dpr); tileH = Math.ceil(ch * dpr);
      atlas.width = tileW * RAMP.length; atlas.height = tileH * INKS.length;
      ac.setTransform(dpr, 0, 0, dpr, 0, 0);
      ac.font = font; ac.textBaseline = "top";
      INKS.forEach((ink, tone) => {
        ac.fillStyle = ink;
        for (let i = 0; i < RAMP.length; i++) ac.fillText(RAMP[i], i * tileW / dpr, tone * tileH / dpr);
      });
    };

    const visibleArea = (): Area | null => {
      const index = document.getElementById("index");
      if (!index) return null;
      const box = index.getBoundingClientRect();
      if (box.top >= H || box.bottom <= 0) return null;
      const enter = smooth(H, H * 0.18, box.top);
      if (W >= 900) {
        const x = Math.max(box.right + 30, W * 0.4);
        return { x, y: H * 0.1, w: Math.max(0, W - x - 30), h: H * 0.76, opacity: enter };
      }
      // Small screens reserve a short opening above the reading column.
      const title = index.querySelector(".who");
      const titleTop = title?.getBoundingClientRect().top ?? box.top;
      const bottom = Math.min(H * 0.34, titleTop - 32);
      const top = Math.max(0, box.top);
      if (bottom - top < 110) return null;
      return { x: W * 0.06, y: top, w: W * 0.88, h: bottom - top, opacity: enter * 0.55 };
    };

    const drawAscii = (area: Area, opacity: number, isScene: boolean) => {
      if (opacity < 0.002) return;
      const pixels = sc.getImageData(0, 0, cols, rows).data;
      const c0 = Math.max(0, Math.floor(area.x / cw));
      const c1 = Math.min(cols, Math.ceil((area.x + area.w) / cw));
      const r0 = Math.max(0, Math.floor(area.y / ch));
      const r1 = Math.min(rows, Math.ceil((area.y + area.h) / ch));
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
        const i = (r * cols + c) * 4;
        const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2];
        const lum = Math.max(red, green, blue) / 255;
        if (lum < 0.035) continue;
        const u = (c * cw - area.x) / area.w, v = (r * ch - area.y) / area.h;
        const edge = smooth(0, 0.1, u) * smooth(1, 0.9, u) * smooth(0, 0.08, v) * smooth(1, 0.9, v);
        const density = Math.min(RAMP.length - 1, Math.floor(Math.sqrt(lum) * RAMP.length));
        const tone = isScene ? (red > blue * 1.1 ? 3 : lum > 0.55 ? 0 : 1) : lum > 0.5 ? 0 : 1;
        ctx.globalAlpha = opacity * edge * (isScene ? 0.5 + lum * 0.5 : 0.4 + lum * 0.6);
        ctx.drawImage(atlas, density * tileW, tone * tileH, tileW, tileH, c * cw, r * ch, tileW / dpr, tileH / dpr);
      }
      ctx.globalAlpha = 1;
    };

    const prepare = () => {
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.fillStyle = "#000"; sc.fillRect(0, 0, cols, rows);
      sc.setTransform(cols / W, 0, 0, rows / H, 0, 0);
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || document.hidden) return;
      const area = visibleArea();
      if (!area || area.w < 100) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
        last = 0;
        return;
      }
      if (!reduced && now - drawnAt < FRAME_MS) { raf = requestAnimationFrame(frame); return; }
      const dt = last ? Math.min(0.08, (now - last) / 1000) : 1 / 24;
      last = now; drawnAt = now;
      if (!reduced) time += dt;
      if (seenStunt !== stunt.current) { seenStunt = stunt.current; swellAt = time; }

      const wanted = focus.current && SCENES[focus.current] ? focus.current : null;
      if (reduced) { sceneId = wanted; shown = wanted ? 1 : 0; }
      else {
        const target = wanted && (!sceneId || sceneId === wanted) ? 1 : 0;
        shown += (target - shown) * (1 - Math.exp(-dt * 7));
        if (shown < 0.015) { sceneId = wanted; shown = 0; }
        if (!sceneId && wanted) sceneId = wanted;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      prepare();
      const swell = Math.max(0, 1 - (time - swellAt) / 2.8);
      paintCurrent(sc, area, time, Math.sin(swell * Math.PI) * swell);
      drawAscii(area, area.opacity * (0.68 - shown * 0.58), false);

      if (sceneId && shown > 0.01) {
        prepare();
        const margin = W >= 900 ? Math.min(40, area.w * 0.06) : 0;
        const sceneArea = { ...area, x: area.x + margin, w: area.w - margin * 2 };
        const height = Math.min(area.h * 0.82, sceneArea.w * 0.8);
        sceneArea.y = area.y + (area.h - height) * 0.45; sceneArea.h = height;
        SCENES[sceneId](sc, sceneArea.x, sceneArea.y, sceneArea.w, sceneArea.h, time);
        drawAscii(sceneArea, area.opacity * shown * 0.86, true);
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!disposed && !document.hidden && !raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => { resize(); wake(); };
    const onMotion = () => { reduced = motion.matches; last = 0; wake(); };
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; last = 0; }
      else wake();
    };
    const observer = new ResizeObserver(wake);
    const index = document.getElementById("index");
    if (index) observer.observe(index);
    resize(); wake();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", wake, { passive: true });
    document.addEventListener("click", wake);
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotion);
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", wake);
      document.removeEventListener("click", wake);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
    };
  }, [focus, stunt]);

  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
