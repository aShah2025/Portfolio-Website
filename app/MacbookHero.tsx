"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// A scroll-driven opening shot: a space-black 14" laptop modelled at real scale (centimetres) in a dark studio.
// Scrolling opens the lid, wakes the lock screen, glides down to the keyboard while the keys type a password,
// unlocks to a desktop, and pulls back to the desktop before handing off to the rest of the site.

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const band = (a: number, b: number, c: number, d: number, x: number) => smooth(a, b, x) * (1 - smooth(c, d, x));

// real MacBook Pro 14" proportions
const W = 31.26, D = 22.12, BASE_T = 0.95, LID_T = 0.5, U = 1.82;
const LID_H = 21.3, SCREEN_W = 30.1, SCREEN_H = 19.55, SCREEN_Y = LID_H - 0.55 - 19.55;
const KB_TOP = -10.45, KB_W = 15 * U;
const NAME = "aaditya";
const PROJECTS = ["wayfinder", "culturerisk", "kura", "canary", "formula-racer", "refill"];

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// A rounded slab spanning z 0..t in its own XY plane, with softly bevelled edges like machined aluminium.
function slab(w: number, h: number, t: number, r: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, r), {
    depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: 28,
  });
  g.translate(0, 0, bevel);
  return g;
}

type Key = { label: string; w: number; row: number; x: number; half?: "top" | "bottom"; id?: string };

// 15 units per row, laid out like the US Mac keyboard
function layout(): Key[] {
  const rows: [string, number][][] = [
    [["esc", 1.5], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, 1] as [string, number]), ["touchid", 1.5]],
    [["~\n`", 1], ["!\n1", 1], ["@\n2", 1], ["#\n3", 1], ["$\n4", 1], ["%\n5", 1], ["^\n6", 1], ["&\n7", 1], ["*\n8", 1], ["(\n9", 1], [")\n0", 1], ["_\n-", 1], ["+\n=", 1], ["delete", 2]],
    [["tab", 1.5], ..."QWERTYUIOP".split("").map((c) => [c, 1] as [string, number]), ["{\n[", 1], ["}\n]", 1], ["|\n\\", 1.5]],
    [["caps lock", 1.75], ..."ASDFGHJKL".split("").map((c) => [c, 1] as [string, number]), [":\n;", 1], ["\"\n'", 1], ["return", 2.25]],
    [["shift", 2.25], ..."ZXCVBNM".split("").map((c) => [c, 1] as [string, number]), ["<\n,", 1], [">\n.", 1], ["?\n/", 1], ["shift ", 2.75]],
    [["fn", 1], ["control", 1], ["option", 1], ["command", 1.25], ["", 5.5], ["command ", 1.25], ["option ", 1], ["◀", 1], ["▲", 1], ["▶", 1]],
  ];
  const keys: Key[] = [];
  rows.forEach((row, r) => {
    let x = 0;
    row.forEach(([label, w]) => {
      if (label === "▲") {
        keys.push({ label: "▲", w, row: r, x, half: "top" }, { label: "▼", w, row: r, x, half: "bottom" });
      } else keys.push({ label, w, row: r, x, half: label === "◀" || label === "▶" ? "bottom" : undefined });
      x += w;
    });
  });
  return keys;
}

const rowZ = (row: number) => KB_TOP + row * U + U / 2;

function drawLegend(c: CanvasRenderingContext2D, k: Key, w: number, h: number) {
  const L = k.label.trim();
  c.fillStyle = "#fff"; c.textBaseline = "middle";
  const font = (px: number, weight = 400) => { c.font = `${weight} ${px}px -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`; };
  if (L === "touchid") { c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 2; c.beginPath(); c.roundRect(h * 0.08, h * 0.08, w - h * 0.16, h * 0.84, h * 0.12); c.stroke(); return; }
  if (!L) return;
  if (L.includes("\n")) {
    const [a, b] = L.split("\n"); c.textAlign = "center"; font(h * 0.26);
    c.fillText(a, w / 2, h * 0.3); c.fillText(b, w / 2, h * 0.68); return;
  }
  if (L.length === 1) { c.textAlign = "center"; font(L.match(/[◀▲▼▶]/) ? h * 0.4 : h * 0.34); c.fillText(L, w / 2, h * 0.5); return; }
  if (L === "esc") { c.textAlign = "left"; font(h * 0.2); c.fillText("esc", h * 0.12, h * 0.8); return; }
  if (/^F\d+$/.test(L)) {
    fnIcon(c, Number(L.slice(1)), w / 2, h * 0.4, h * 0.62);
    c.fillStyle = "#fff"; c.textAlign = "center"; font(h * 0.15); c.fillText(L, w / 2, h * 0.84); return;
  }
  const sym: Record<string, string> = { command: "⌘", option: "⌥", control: "⌃", shift: "⇧", fn: "", tab: "⇥", "caps lock": "⇪", delete: "⌫", return: "⏎" };
  const right = k.label.endsWith(" ") || L === "delete" || L === "return";
  font(h * 0.17); c.textAlign = right ? "right" : "left";
  c.fillText(L, right ? w - h * 0.12 : h * 0.12, h * 0.8);
  if (sym[L]) { font(h * 0.24); c.fillText(sym[L], right ? w - h * 0.12 : h * 0.12, h * 0.26); }
  if (L === "fn") { font(h * 0.22); c.fillText("fn", h * 0.12, h * 0.26); c.beginPath(); c.arc(w - h * 0.22, h * 0.78, h * 0.1, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = "#fff"; c.stroke(); }
}

function buildLaptop() {
  const root = new THREE.Group();
  const alu = new THREE.MeshPhysicalMaterial({ color: "#2e2f31", metalness: 0.72, roughness: 0.55, clearcoat: 0.1, clearcoatRoughness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: "#060607", roughness: 0.7 });
  const well = new THREE.MeshStandardMaterial({ color: "#0b0b0c", roughness: 0.8 });

  // base, sitting on four rubber feet
  const base = new THREE.Mesh(slab(W, D, BASE_T, 1.05, 0.14), alu);
  base.geometry.rotateX(-Math.PI / 2); base.position.y = 0.08; base.castShadow = base.receiveShadow = true; root.add(base);
  for (const [x, z] of [[-12.8, -9.2], [12.8, -9.2], [-12.8, 9.4], [12.8, 9.4]]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.09, 24), black); f.position.set(x, 0.045, z); root.add(f);
  }
  const top = 0.08 + BASE_T;

  // the dark keyboard well, the lid-opening scoop on the front lip, ports down both sides
  const wellMesh = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(KB_W + 0.45, 6 * U + 0.4, 0.45), 12), well);
  wellMesh.rotation.x = -Math.PI / 2; wellMesh.position.set(0, top + 0.002, KB_TOP + 3 * U); wellMesh.receiveShadow = true; root.add(wellMesh);
  const port = (side: number, z: number, w: number, h: number) => {
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.1, h, w, 3, Math.min(h, w) * 0.45), black);
    p.position.set(side * (W / 2 - 0.02), 0.08 + BASE_T * 0.45, z); root.add(p);
  };
  port(-1, -7, 1.3, 0.3); port(-1, -4.6, 0.9, 0.32); port(-1, -3.2, 0.9, 0.32); port(-1, -0.6, 0.38, 0.38);
  port(1, -6.5, 2.4, 0.14); port(1, -3.8, 0.9, 0.32); port(1, -1.6, 1.45, 0.42);

  // speaker grilles: a field of tiny drilled holes either side of the keyboard
  const grille = document.createElement("canvas"); grille.width = 128; grille.height = 1024;
  const gc = grille.getContext("2d")!;
  for (let y = 6; y < 1024; y += 11) for (let x = 8 + ((y / 11) % 2) * 5; x < 124; x += 11) { gc.fillStyle = "#000"; gc.beginPath(); gc.arc(x, y, 2.6, 0, Math.PI * 2); gc.fill(); }
  const grilleTex = new THREE.CanvasTexture(grille); grilleTex.anisotropy = 8;
  for (const s of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 6 * U), new THREE.MeshBasicMaterial({ map: grilleTex, transparent: true, opacity: 0.85 }));
    g.rotation.x = -Math.PI / 2; g.position.set(s * (KB_W / 2 + 1.0), top + 0.003, KB_TOP + 3 * U); root.add(g);
  }

  // keys: rounded caps with their own legends; legends glow with the backlight and a soft halo leaks around each key
  const keys = layout(), cellW = 640, cellH = 110, cols = 3;
  const atlas = document.createElement("canvas"); atlas.width = cellW * cols; atlas.height = cellH * Math.ceil(keys.length / cols);
  const ac = atlas.getContext("2d")!;
  const legendTex = new THREE.CanvasTexture(atlas); legendTex.anisotropy = 8; legendTex.colorSpace = THREE.SRGBColorSpace;
  const legendMat = new THREE.MeshBasicMaterial({ map: legendTex, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const capMat = new THREE.MeshStandardMaterial({ color: "#080809", roughness: 0.72, metalness: 0.05 });
  const touchMat = new THREE.MeshPhysicalMaterial({ color: "#0b0b0d", roughness: 0.15, metalness: 0.4, clearcoat: 1 });
  const halo = document.createElement("canvas"); halo.width = halo.height = 64;
  const hc = halo.getContext("2d")!, hg = hc.createRadialGradient(32, 32, 10, 32, 32, 32);
  hg.addColorStop(0, "rgba(255,255,255,1)"); hg.addColorStop(1, "rgba(255,255,255,0)"); hc.fillStyle = hg; hc.fillRect(0, 0, 64, 64);
  const haloMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(halo), color: "#ffffff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const byLabel = new Map<string, THREE.Object3D>();
  let touchId: THREE.Object3D | null = null;

  keys.forEach((k, i) => {
    const kw = k.w * U - 0.2;
    let kd = 1.6, z = rowZ(k.row);
    if (k.half) { kd = 0.76; z += k.half === "top" ? -0.43 : 0.43; }
    const kh = 0.13, gk = `${kw.toFixed(2)}:${kd}`;
    if (!geoCache.has(gk)) geoCache.set(gk, new RoundedBoxGeometry(kw, kh, kd, 3, 0.09));
    const key = new THREE.Group();
    key.position.set(-KB_W / 2 + k.x * U + (k.w * U) / 2, top + kh / 2 + 0.01, z);
    const cap = new THREE.Mesh(geoCache.get(gk)!, k.label === "touchid" ? touchMat : capMat); cap.castShadow = true; key.add(cap);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(kw + 0.5, kd + 0.5), haloMat); glow.rotation.x = -Math.PI / 2; glow.position.y = -kh / 2 - 0.004; key.add(glow);

    // legend: draw into this key's atlas cell at the key's aspect ratio, then point a plane's UVs at it
    const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH, pw = Math.min(cellW, cellH * (kw / kd));
    ac.save(); ac.translate(cx, cy); ac.beginPath(); ac.rect(0, 0, pw, cellH); ac.clip(); drawLegend(ac, k, pw, cellH); ac.restore();
    const lg = new THREE.PlaneGeometry(kw * 0.94, kd * 0.94), uv = lg.attributes.uv as THREE.BufferAttribute;
    const u0 = cx / atlas.width, u1 = (cx + pw) / atlas.width, v1 = 1 - cy / atlas.height, v0 = 1 - (cy + cellH) / atlas.height;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) ? u1 : u0, uv.getY(j) ? v1 : v0);
    const legend = new THREE.Mesh(lg, legendMat); legend.rotation.x = -Math.PI / 2; legend.position.y = kh / 2 + 0.002; key.add(legend);

    key.userData.rest = key.position.y;
    root.add(key);
    if (k.label.length === 1) byLabel.set(k.label, key);
    if (k.label === "touchid") touchId = key;
  });
  legendTex.needsUpdate = true;

  // glass trackpad, flush with the deck
  const padMat = new THREE.MeshPhysicalMaterial({ color: "#2c2d2f", metalness: 0.6, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const pad = new THREE.Mesh(slab(13.5, 8.4, 0.03, 0.55, 0.012), padMat);
  pad.geometry.rotateX(-Math.PI / 2); pad.position.set(0, top - 0.012, 5.75); pad.receiveShadow = true; root.add(pad);

  // hinge barrel and lid
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 25.5, 32), new THREE.MeshStandardMaterial({ color: "#151517", roughness: 0.45, metalness: 0.6 }));
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, top - 0.25, -D / 2 + 0.35); root.add(hinge);
  const lid = new THREE.Group(); lid.position.set(0, top + 0.03, -D / 2 + 0.35); root.add(lid);
  const shell = new THREE.Mesh(slab(W, LID_H, LID_T, 1.05, 0.14), alu);
  shell.geometry.translate(0, LID_H / 2, -LID_T); shell.castShadow = shell.receiveShadow = true; lid.add(shell);
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - 0.32, LID_H - 0.3, 0.9), 16), new THREE.MeshPhysicalMaterial({ color: "#040405", roughness: 0.1, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }));
  bezel.position.set(0, LID_H / 2, 0.003); lid.add(bezel);

  const screenCanvas = document.createElement("canvas"); screenCanvas.width = 2048; screenCanvas.height = Math.round(2048 * (SCREEN_H / SCREEN_W));
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = 8;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, color: "#000", toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat);
  screen.position.set(0, SCREEN_Y + SCREEN_H / 2, 0.006); lid.add(screen);

  return { root, lid, screenCanvas, screenTex, screenMat, legendMat, haloMat, byLabel, touchId: touchId as THREE.Object3D | null, top };
}

// The display: a lock screen that types the password and unlocks to a desktop with a terminal.
function paintScreen(cv: HTMLCanvasElement, typed: number, unlocked: boolean, now: Date) {
  const c = cv.getContext("2d")!, w = cv.width, h = cv.height, sys = `-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0d1024"); g.addColorStop(0.5, "#211a4a"); g.addColorStop(1, "#0b0b12");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const blob = (x: number, y: number, r: number, col: string) => { const b = c.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, col); b.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = b; c.fillRect(0, 0, w, h); };
  blob(w * 0.18, h * 0.9, w * 0.55, "rgba(255,122,74,.45)"); blob(w * 0.85, h * 0.15, w * 0.5, "rgba(107,156,255,.45)"); blob(w * 0.55, h * 0.55, w * 0.4, "rgba(139,124,255,.35)");
  // faceted ribbons, like a system wallpaper
  c.globalAlpha = 0.1; c.fillStyle = "#fff";
  for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(w * (0.1 + i * 0.14), h); c.lineTo(w * (0.35 + i * 0.14), 0); c.lineTo(w * (0.42 + i * 0.14), 0); c.lineTo(w * (0.2 + i * 0.14), h); c.fill(); c.globalAlpha *= 0.85; }
  c.globalAlpha = 1;

  if (!unlocked) {
    c.fillStyle = "rgba(255,255,255,.85)"; c.textAlign = "center"; c.textBaseline = "alphabetic";
    c.font = `500 46px ${sys}`; c.fillText(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }), w / 2, h * 0.17);
    c.font = `600 230px ${sys}`; c.fillText(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/, ""), w / 2, h * 0.36);
    const ay = h * 0.74, ag = c.createLinearGradient(w / 2 - 70, ay - 70, w / 2 + 70, ay + 70);
    ag.addColorStop(0, "#ff7a4a"); ag.addColorStop(1, "#8b7cff");
    c.fillStyle = ag; c.beginPath(); c.arc(w / 2, ay, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff"; c.font = `600 58px ${sys}`; c.textBaseline = "middle"; c.fillText("AS", w / 2, ay + 2);
    c.font = `600 38px ${sys}`; c.fillText("aaditya shah", w / 2, ay + 120);
    c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.roundRect(w / 2 - 170, ay + 165, 340, 60, 30); c.fill();
    c.fillStyle = "rgba(255,255,255,.9)";
    if (typed === 0) { c.font = `400 28px ${sys}`; c.fillStyle = "rgba(255,255,255,.55)"; c.fillText("Enter Password", w / 2, ay + 196); }
    for (let i = 0; i < typed; i++) { c.beginPath(); c.arc(w / 2 - 130 + i * 30, ay + 195, 8, 0, Math.PI * 2); c.fill(); }
    c.font = `400 26px ${sys}`; c.fillStyle = "rgba(255,255,255,.5)"; c.fillText("Touch ID or Enter Password", w / 2, ay + 270);
  } else {
    // menu bar, dock and a terminal window
    c.fillStyle = "rgba(20,20,30,.35)"; c.fillRect(0, 0, w, 66);
    c.fillStyle = "#fff"; c.font = `600 28px ${sys}`; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText("Terminal", 240, 34); c.font = `400 28px ${sys}`; ["File", "Edit", "View", "Window"].forEach((m, i) => c.fillText(m, 400 + i * 110, 34));
    c.textAlign = "right"; c.fillText(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), w - 40, 34);
    const is = 92, step = 112, dw = DOCK.length * step + 24, dx = w / 2 - dw / 2;
    c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.roundRect(dx, h - 152, dw, 124, 36); c.fill();
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 2; c.stroke();
    DOCK.forEach((app, i) => {
      const ix = dx + 22 + i * step, iy = h - 142;
      c.save(); c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 14; c.shadowOffsetY = 4; squircle(c, ix, iy, is, "rgba(0,0,0,.01)"); c.restore();
      c.save(); APPS[app](c, ix, iy, is); c.restore();
      if (app === "terminal") { c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(ix + is / 2, h - 38, 4, 0, Math.PI * 2); c.fill(); }
    });

    const x = w * 0.2, y = h * 0.16, tw = w * 0.6, th = h * 0.6;
    c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 80; c.shadowOffsetY = 30;
    c.fillStyle = "rgba(18,18,24,.94)"; c.beginPath(); c.roundRect(x, y, tw, th, 26); c.fill();
    c.shadowColor = "transparent";
    ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(x + 44 + i * 40, y + 40, 12, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = "rgba(255,255,255,.5)"; c.font = `500 26px ${sys}`; c.textAlign = "center"; c.fillText("portfolio — claude", x + tw / 2, y + 41);

    // a Claude Code session: welcome box, a prompt, and the agent working through it
    const mono = `ui-monospace, "SF Mono", Menlo, monospace`, CLAUDE = "#d97757", lx = x + 50;
    c.textAlign = "left"; c.strokeStyle = CLAUDE; c.lineWidth = 2;
    c.beginPath(); c.roundRect(lx, y + 82, tw - 100, 118, 14); c.stroke();
    c.font = `400 34px ${mono}`; c.fillStyle = CLAUDE; c.fillText("✻", lx + 28, y + 122);
    c.fillStyle = "#e9e9ee"; c.fillText("Welcome to Claude Code!", lx + 72, y + 122);
    c.font = `400 26px ${mono}`; c.fillStyle = "rgba(233,233,238,.5)"; c.fillText("cwd: ~/Developer/portfolio", lx + 72, y + 168);
    const lines: [string, string, number?][] = [
      ["rgba(233,233,238,.55)", "> make my website more like the video"],
      ["", ""],
      ["#e9e9ee", "⏺ I'll build a 3D MacBook for the opening shot."],
      ["#e9e9ee", "⏺ Write(app/MacbookHero.tsx)"],
      ["rgba(233,233,238,.5)", "  ⎿  Wrote 412 lines", 26],
      ["#e9e9ee", `⏺ Done. ${PROJECTS.length} projects are waiting below.`],
      ["", ""],
      [CLAUDE, "✻ scroll to begin ↓"],
    ];
    lines.forEach(([col, t, size], i) => { c.font = `400 ${size ?? 30}px ${mono}`; c.fillStyle = col; c.fillText(t, lx, y + 262 + i * 50); });
    c.strokeStyle = "rgba(233,233,238,.25)"; c.lineWidth = 2; c.beginPath(); c.roundRect(lx, y + th - 92, tw - 100, 60, 10); c.stroke();
    c.font = `400 28px ${mono}`; c.fillStyle = "rgba(233,233,238,.7)"; c.fillText(">", lx + 20, y + th - 60);
    c.fillStyle = "#e9e9ee"; c.fillRect(lx + 52, y + th - 76, 16, 32);
  }

  // the notch, with its camera
  c.fillStyle = "#000"; c.beginPath(); c.roundRect(w / 2 - 102, -24, 204, 90, 20); c.fill();
  c.fillStyle = "#0e1220"; c.beginPath(); c.arc(w / 2, 28, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#1c2440"; c.beginPath(); c.arc(w / 2 - 2, 26, 3, 0, Math.PI * 2); c.fill();
}

// Simplified dock icons for the apps on the desktop, each drawn in a size x size box at (x, y).
const squircle = (c: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string | CanvasGradient) => { c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, s, s, s * 0.23); c.fill(); };
const APPS: Record<string, (c: CanvasRenderingContext2D, x: number, y: number, s: number) => void> = {
  discord: (c, x, y, s) => {
    squircle(c, x, y, s, "#5865f2");
    const cx = x + s / 2, cy = y + s * 0.52;
    c.fillStyle = "#fff"; c.beginPath();
    c.moveTo(cx - s * 0.3, cy + s * 0.14); c.quadraticCurveTo(cx - s * 0.33, cy - s * 0.12, cx - s * 0.2, cy - s * 0.24);
    c.quadraticCurveTo(cx, cy - s * 0.3, cx + s * 0.2, cy - s * 0.24); c.quadraticCurveTo(cx + s * 0.33, cy - s * 0.12, cx + s * 0.3, cy + s * 0.14);
    c.quadraticCurveTo(cx + s * 0.2, cy + s * 0.24, cx + s * 0.12, cy + s * 0.2); c.lineTo(cx + s * 0.08, cy + s * 0.13);
    c.quadraticCurveTo(cx, cy + s * 0.16, cx - s * 0.08, cy + s * 0.13); c.lineTo(cx - s * 0.12, cy + s * 0.2);
    c.quadraticCurveTo(cx - s * 0.2, cy + s * 0.24, cx - s * 0.3, cy + s * 0.14); c.fill();
    c.fillStyle = "#5865f2";
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(cx + d * s * 0.1, cy - s * 0.01, s * 0.045, s * 0.055, 0, 0, Math.PI * 2); c.fill(); }
  },
  chrome: (c, x, y, s) => {
    squircle(c, x, y, s, "#f4f4f6");
    const cx = x + s / 2, cy = y + s / 2, r = s * 0.36;
    ["#ea4335", "#fbbc05", "#34a853"].forEach((col, i) => {
      const a0 = -Math.PI * 5 / 6 + i * (Math.PI * 2 / 3);
      c.fillStyle = col; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, a0, a0 + Math.PI * 2 / 3); c.closePath(); c.fill();
    });
    c.fillStyle = "#fff"; c.beginPath(); c.arc(cx, cy, r * 0.48, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#4285f4"; c.beginPath(); c.arc(cx, cy, r * 0.38, 0, Math.PI * 2); c.fill();
  },
  claude: (c, x, y, s) => {
    squircle(c, x, y, s, "#d97757");
    const cx = x + s / 2, cy = y + s / 2; c.strokeStyle = "#fff"; c.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2, len = s * (i % 3 === 0 ? 0.3 : i % 2 ? 0.24 : 0.27);
      c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(cx + Math.cos(a) * s * 0.04, cy + Math.sin(a) * s * 0.04); c.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); c.stroke();
    }
  },
  terminal: (c, x, y, s) => {
    const g = c.createLinearGradient(x, y, x, y + s); g.addColorStop(0, "#3a3a3e"); g.addColorStop(1, "#1a1a1c"); squircle(c, x, y, s, g);
    c.fillStyle = "#0e0e10"; c.beginPath(); c.roundRect(x + s * 0.12, y + s * 0.16, s * 0.76, s * 0.68, s * 0.08); c.fill();
    c.fillStyle = "#e9e9ee"; c.font = `700 ${s * 0.3}px ui-monospace, Menlo, monospace`; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(">_", x + s * 0.2, y + s * 0.42);
  },
  safari: (c, x, y, s) => {
    squircle(c, x, y, s, "#f4f4f6");
    const cx = x + s / 2, cy = y + s / 2, r = s * 0.37, g = c.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, "#1ec8ff"); g.addColorStop(1, "#1a6dff"); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); c.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); c.stroke(); }
    const a = -Math.PI / 4, dx = Math.cos(a), dy = Math.sin(a), nx = -dy * r * 0.12, ny = dx * r * 0.12;
    c.fillStyle = "#ff3b30"; c.beginPath(); c.moveTo(cx + dx * r * 0.75, cy + dy * r * 0.75); c.lineTo(cx + nx, cy + ny); c.lineTo(cx - nx, cy - ny); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(cx - dx * r * 0.75, cy - dy * r * 0.75); c.lineTo(cx + nx, cy + ny); c.lineTo(cx - nx, cy - ny); c.fill();
  },
  settings: (c, x, y, s) => {
    const g = c.createLinearGradient(x, y, x, y + s); g.addColorStop(0, "#c9c9ce"); g.addColorStop(1, "#7d7d84"); squircle(c, x, y, s, g);
    const cx = x + s / 2, cy = y + s / 2;
    c.fillStyle = "#3d3d42"; c.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? s * 0.3 : s * 0.36; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    c.fill(); c.fillStyle = "#a8a8ae"; c.beginPath(); c.arc(cx, cy, s * 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3d3d42"; c.beginPath(); c.arc(cx, cy, s * 0.08, 0, Math.PI * 2); c.fill();
  },
  xcode: (c, x, y, s) => {
    const g = c.createLinearGradient(x, y, x, y + s); g.addColorStop(0, "#2f9bff"); g.addColorStop(1, "#1458d8"); squircle(c, x, y, s, g);
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x + (s * i) / 6, y + s * 0.1); c.lineTo(x + (s * i) / 6, y + s * 0.9); c.stroke(); c.beginPath(); c.moveTo(x + s * 0.1, y + (s * i) / 6); c.lineTo(x + s * 0.9, y + (s * i) / 6); c.stroke(); }
    c.save(); c.translate(x + s / 2, y + s / 2); c.rotate(-Math.PI / 4);
    c.fillStyle = "#e8e8ec"; c.fillRect(-s * 0.05, -s * 0.12, s * 0.1, s * 0.46);
    c.fillStyle = "#a9adb7"; c.beginPath(); c.roundRect(-s * 0.24, -s * 0.28, s * 0.48, s * 0.16, s * 0.03); c.fill();
    c.restore();
  },
  vscode: (c, x, y, s) => {
    squircle(c, x, y, s, "#f4f4f6");
    const ox = x + s * 0.16, oy = y + s * 0.14, u = s * 0.68;
    c.fillStyle = "#0065a9"; c.beginPath(); c.moveTo(ox + u * 0.72, oy); c.lineTo(ox + u, oy + u * 0.12); c.lineTo(ox + u, oy + u * 0.88); c.lineTo(ox + u * 0.72, oy + u); c.closePath(); c.fill();
    c.fillStyle = "#007acc"; c.beginPath(); c.moveTo(ox + u * 0.72, oy); c.lineTo(ox + u * 0.72, oy + u * 0.26); c.lineTo(ox + u * 0.28, oy + u * 0.6); c.lineTo(ox + u * 0.1, oy + u * 0.46); c.closePath(); c.fill();
    c.fillStyle = "#1f9cf0"; c.beginPath(); c.moveTo(ox + u * 0.72, oy + u); c.lineTo(ox + u * 0.72, oy + u * 0.74); c.lineTo(ox + u * 0.28, oy + u * 0.4); c.lineTo(ox + u * 0.1, oy + u * 0.54); c.closePath(); c.fill();
  },
};
const DOCK = ["discord", "chrome", "claude", "terminal", "safari", "xcode", "vscode", "settings"];

// Media and system icons on the function row, in a box of size s centred at (cx, cy).
function fnIcon(c: CanvasRenderingContext2D, n: number, cx: number, cy: number, s: number) {
  c.strokeStyle = c.fillStyle = "#fff"; c.lineWidth = s * 0.07; c.lineCap = "round"; c.lineJoin = "round";
  const tri = (x: number, dir: number, hh: number) => { c.beginPath(); c.moveTo(x, cy - hh); c.lineTo(x + dir * hh * 1.2, cy); c.lineTo(x, cy + hh); c.closePath(); c.fill(); };
  const speaker = () => { const x = cx - s * 0.32; c.beginPath(); c.moveTo(x, cy - s * 0.1); c.lineTo(x + s * 0.12, cy - s * 0.1); c.lineTo(x + s * 0.28, cy - s * 0.25); c.lineTo(x + s * 0.28, cy + s * 0.25); c.lineTo(x + s * 0.12, cy + s * 0.1); c.lineTo(x, cy + s * 0.1); c.closePath(); c.fill(); };
  const waves = (k: number) => { for (let i = 1; i <= k; i++) { c.beginPath(); c.arc(cx - s * 0.04, cy, s * (0.08 + i * 0.1), -0.8, 0.8); c.stroke(); } };
  switch (n) {
    case 1: case 2: {
      const r = s * (n === 1 ? 0.1 : 0.13), ray = n === 1 ? s * 0.07 : s * 0.13;
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * (r + s * 0.07), cy + Math.sin(a) * (r + s * 0.07)); c.lineTo(cx + Math.cos(a) * (r + s * 0.07 + ray), cy + Math.sin(a) * (r + s * 0.07 + ray)); c.stroke(); }
      break;
    }
    case 3: // mission control: a wide window under three small ones
      c.lineWidth = s * 0.05;
      c.strokeRect(cx - s * 0.32, cy - s * 0.02, s * 0.64, s * 0.26);
      for (let i = -1; i <= 1; i++) c.strokeRect(cx + i * s * 0.22 - s * 0.085, cy - s * 0.26, s * 0.17, s * 0.15);
      break;
    case 4: // spotlight
      c.beginPath(); c.arc(cx - s * 0.06, cy - s * 0.06, s * 0.17, 0, Math.PI * 2); c.stroke();
      c.lineWidth = s * 0.09; c.beginPath(); c.moveTo(cx + s * 0.07, cy + s * 0.07); c.lineTo(cx + s * 0.24, cy + s * 0.24); c.stroke();
      break;
    case 5: // dictation microphone
      c.beginPath(); c.roundRect(cx - s * 0.08, cy - s * 0.3, s * 0.16, s * 0.34, s * 0.08); c.fill();
      c.beginPath(); c.arc(cx, cy - s * 0.04, s * 0.17, 0.15, Math.PI - 0.15); c.stroke();
      c.beginPath(); c.moveTo(cx, cy + s * 0.13); c.lineTo(cx, cy + s * 0.25); c.stroke();
      break;
    case 6: // do not disturb moon
      c.beginPath(); c.arc(cx, cy, s * 0.24, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(cx + s * 0.13, cy - s * 0.1, s * 0.21, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = "source-over";
      break;
    case 7: tri(cx, -1, s * 0.15); tri(cx + s * 0.2, -1, s * 0.15); break;
    case 8: tri(cx - s * 0.26, 1, s * 0.15); c.fillRect(cx + s * 0.06, cy - s * 0.15, s * 0.07, s * 0.3); c.fillRect(cx + s * 0.18, cy - s * 0.15, s * 0.07, s * 0.3); break;
    case 9: tri(cx - s * 0.2, 1, s * 0.15); tri(cx, 1, s * 0.15); break;
    case 10: speaker(); break;
    case 11: speaker(); waves(1); break;
    case 12: speaker(); waves(3); break;
  }
}

export default function MacbookHero() {
  const section = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = section.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const caps = Array.from(el.querySelectorAll<HTMLElement>(".cap"));
    const tags = Array.from(el.querySelectorAll<HTMLElement>(".mac-tag"));
    const hint = el.querySelector<HTMLElement>(".mac-hint");

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const bg = new THREE.Color("#0c0d0f");
    scene.background = bg; scene.fog = new THREE.Fog(bg, 70, 150);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env; scene.environmentIntensity = 0.32;

    const key = new THREE.SpotLight("#ffffff", 2.7, 0, 0.42, 1, 0);
    key.position.set(-22, 60, 32); key.target.position.set(0, 0, 0); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 6; key.shadow.camera.near = 20; key.shadow.camera.far = 120;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight("#ffffff", 1.1); rim.position.set(18, 22, -40); scene.add(rim);
    const fill = new THREE.HemisphereLight("#ffffff", "#000000", 0.18); scene.add(fill);
    const screenGlow = new THREE.PointLight("#d9dcff", 0, 30, 1.4); scene.add(screenGlow);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#0c0d0f", roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    const mac = buildLaptop();
    scene.add(mac.root);
    screenGlow.position.set(0, 10, -6);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
    // camera path through the shot, positions and look-at targets
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const pos = new THREE.CatmullRomCurve3([P(-34, 36, 54), P(0, 24, 44), P(0, 19, 34), P(11, 12.5, 11), P(-14, 20, 34), P(-24, 26, 48)], false, "centripetal");
    const tgt = new THREE.CatmullRomCurve3([P(0, 3, 0), P(0, 8, -3), P(0, 7.5, -5), P(-1, 0.6, -5), P(0, 7, -4), P(0, 7, -3)], false, "centripetal");

    let w = 0, h = 0, fit = 1;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      fit = Math.min(2.4, Math.max(1, 1.45 / camera.aspect));
    };
    resize();
    window.addEventListener("resize", resize);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => { pointer.tx = e.clientX / window.innerWidth - 0.5; pointer.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove, { passive: true });

    let shownTyped = -1, shownUnlocked = false, shownMinute = -1;
    const cp = new THREE.Vector3(), ct = new THREE.Vector3(), v = new THREE.Vector3();
    let raf = 0, progress = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const target = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      progress += (target - progress) * 0.12;
      const p = progress;
      pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;

      // lid opens, screen wakes, keyboard backlight rises, a password gets typed, the desktop unlocks
      const open = 0.12 + 0.88 * smooth(0.0, 0.17, p);
      mac.lid.rotation.x = Math.PI / 2 - open * (Math.PI / 2 + 0.34);
      const on = smooth(0.08, 0.2, p);
      mac.screenMat.color.setScalar(on);
      screenGlow.intensity = on * 1.2;
      const back = smooth(0.36, 0.48, p);
      mac.legendMat.color.setScalar(0.75 + back * 0.45);
      mac.haloMat.opacity = back * 0.06;

      const tp = smooth(0.44, 0.62, p) * NAME.length, idx = Math.floor(tp), frac = tp - idx;
      mac.byLabel.forEach((k) => { k.position.y = k.userData.rest; });
      if (idx < NAME.length && tp > 0) {
        const k = mac.byLabel.get(NAME[idx].toUpperCase());
        if (k) k.position.y = k.userData.rest - 0.07 * Math.sin(Math.min(1, frac * 1.6) * Math.PI);
      }
      const typed = Math.min(NAME.length, Math.floor(tp + 0.35)), unlocked = p > 0.645;
      const minute = new Date().getMinutes();
      if (typed !== shownTyped || unlocked !== shownUnlocked || minute !== shownMinute) {
        shownTyped = typed; shownUnlocked = unlocked; shownMinute = minute;
        paintScreen(mac.screenCanvas, typed, unlocked, new Date()); mac.screenTex.needsUpdate = true;
      }
      if (mac.touchId) mac.touchId.position.y = mac.touchId.userData.rest - (p > 0.625 && p < 0.645 ? 0.06 : 0);


      // camera glides along the path, with a little drift from the pointer
      const e = p * p * (3 - 2 * p) * 0.35 + p * 0.65;
      pos.getPoint(e, cp); tgt.getPoint(e, ct);
      cp.sub(ct).multiplyScalar(fit).add(ct);
      cp.x += pointer.x * 3; cp.y -= pointer.y * 2;
      camera.position.copy(cp); camera.lookAt(ct);

      // captions, and labels pinned to parts of the model
      const ranges = [[-1, 0, 0.1, 0.16], [0.22, 0.27, 0.36, 0.41], [0.45, 0.5, 0.6, 0.64], [0.68, 0.73, 0.95, 1.01]];
      caps.forEach((c, i) => { const [a, b, cc, d] = ranges[i]; const o = band(a, b, cc, d, p); c.style.opacity = String(o); c.style.transform = `translateY(${(1 - o) * 14}px)`; });
      if (hint) hint.style.opacity = String(1 - smooth(0.01, 0.06, p));
      const anchors: [THREE.Object3D | null, number][] = [[mac.touchId, band(0.47, 0.52, 0.6, 0.64, p)]];
      tags.forEach((tag, i) => {
        const [obj, o] = anchors[i];
        if (!obj || o <= 0.01) { tag.style.opacity = "0"; return; }
        obj.getWorldPosition(v); v.y += 0.2; v.project(camera);
        tag.style.opacity = String(o);
        tag.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
      });

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        mats.forEach((mat) => { Object.values(mat).forEach((val) => { if (val instanceof THREE.Texture) val.dispose(); }); mat.dispose(); });
      });
      env.dispose(); pmrem.dispose(); renderer.dispose();
    };
  }, []);

  return (
    <section className="mac" ref={section} aria-label="Intro">
      <div className="mac-stage">
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="mac-caps">
          <p className="cap"><small>aaditya shah</small><b>i build <em>apps</em>.</b></p>
          <p className="cap"><small>student / builder</small><b>leland high, san jose</b></p>
          <p className="cap"><small>typed by hand</small><b>games, websites, <em>tools</em>.</b></p>
          <p className="cap"><small>all of it</small><b>click to <em>open</em> ↓</b></p>
        </div>
        <span className="mac-tag" aria-hidden="true">touch id</span>
        <span className="mac-hint" aria-hidden="true">scroll ↓</span>
      </div>
    </section>
  );
}
