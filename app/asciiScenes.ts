// Little animated drawings, one per project or activity, shown on the right when its row is open. Each draws in
// screen pixels inside the box it's given, bright on black: AsciiPlane samples the result once per character
// cell, so brightness picks the glyph and warm or cool picks the colour. Strokes need to be about a cell wide or
// thicker to survive that sampling.
type Draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) => void;

const COOL = "#6b9cff", WARM = "#ff7a4a", DIM = "rgba(107,156,255,.35)";

const line = (c: CanvasRenderingContext2D, pts: [number, number][], width: number, color: string) => {
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
};
const dot = (c: CanvasRenderingContext2D, px: number, py: number, r: number, color: string) => { c.fillStyle = color; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill(); };
const ring = (c: CanvasRenderingContext2D, px: number, py: number, r: number, width: number, color: string, from = 0, to = Math.PI * 2) => {
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round"; c.beginPath(); c.arc(px, py, r, from, to); c.stroke();
};
const ease = (k: number) => k * k * (3 - 2 * k);
const loop = (t: number, period: number) => (t % period) / period;

export const SCENES: Record<string, Draw> = {
  // three macro bars filling up beside a calorie ring
  kura: (c, x, y, w, h, t) => {
    const k = ease(Math.min(1, loop(t, 6) * 1.6)), base = y + h * 0.85, bw = w * 0.13;
    [0.7, 0.45, 0.58].forEach((v, i) => {
      const bx = x + w * (0.08 + i * 0.18), bh = h * 0.6 * v * k;
      c.strokeStyle = DIM; c.lineWidth = 6; c.strokeRect(bx, base - h * 0.6 * v, bw, h * 0.6 * v);
      c.fillStyle = i === 1 ? WARM : COOL; c.fillRect(bx, base - bh, bw, bh);
    });
    const cx = x + w * 0.78, cy = y + h * 0.45, r = Math.min(w, h) * 0.18;
    ring(c, cx, cy, r, 22, DIM);
    ring(c, cx, cy, r, 22, WARM, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.72 * k);
  },
  // a face read: eyes that blink over a drifting sleep and mood trace
  canary: (c, x, y, w, h, t) => {
    const cx = x + w * 0.5, cy = y + h * 0.32, r = Math.min(w, h) * 0.2, blink = loop(t, 3.2) > 0.93 ? 0.15 : 1;
    ring(c, cx, cy, r, 10, COOL);
    for (const s of [-1, 1]) { c.fillStyle = COOL; c.beginPath(); c.ellipse(cx + s * r * 0.38, cy - r * 0.1, r * 0.13, r * 0.13 * blink, 0, 0, Math.PI * 2); c.fill(); }
    line(c, [[cx - r * 0.35, cy + r * 0.4], [cx, cy + r * 0.5], [cx + r * 0.35, cy + r * 0.4]], 8, COOL);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 60; i++) { const u = i / 60, drift = u > 0.7 ? (u - 0.7) * 1.6 : 0; pts.push([x + u * w, y + h * (0.78 + Math.sin(u * 14 - t * 2) * 0.04 + drift * 0.12)]); }
    line(c, pts, 9, WARM);
    dot(c, pts[pts.length - 1][0] - 8, pts[pts.length - 1][1], 14, WARM);
  },
  // an agent hopping between taste-graph nodes, then a risk gauge
  culturerisk: (c, x, y, w, h, t) => {
    const nodes: [number, number][] = [[0.5, 0.4], [0.18, 0.18], [0.82, 0.15], [0.15, 0.68], [0.85, 0.66]].map(([u, v]) => [x + u * w, y + v * h * 0.85]);
    nodes.slice(1).forEach(([nx, ny]) => line(c, [nodes[0], [nx, ny]], 5, DIM));
    const hop = Math.floor(t / 0.9) % 4 + 1, k = ease((t % 0.9) / 0.9);
    const [hx, hy] = nodes[hop];
    dot(c, nodes[0][0] + (hx - nodes[0][0]) * k, nodes[0][1] + (hy - nodes[0][1]) * k, 12, WARM);
    nodes.forEach(([nx, ny], i) => dot(c, nx, ny, i ? 22 : 36, i === hop ? WARM : COOL));
    const gx = x + w * 0.5, gy = y + h * 0.98, gr = w * 0.22;
    ring(c, gx, gy, gr, 18, DIM, Math.PI, Math.PI * 2);
    ring(c, gx, gy, gr, 18, WARM, Math.PI, Math.PI + Math.PI * (0.35 + Math.sin(t * 0.8) * 0.15));
  },
  // a lap of a circuit, leader and chaser
  "formula-racer": (c, x, y, w, h, t) => {
    const cx = x + w / 2, cy = y + h / 2, rx = w * 0.42, ry = h * 0.32;
    const at = (a: number): [number, number] => [cx + Math.cos(a) * rx * (1 + 0.15 * Math.sin(a * 2)), cy + Math.sin(a) * ry * (1 - 0.2 * Math.cos(a * 3))];
    line(c, Array.from({ length: 121 }, (_, i) => at((i / 120) * Math.PI * 2)), 30, DIM);
    const a = t * 1.4, [px, py] = at(a), [qx, qy] = at(a - 0.5);
    dot(c, qx, qy, 16, COOL); dot(c, px, py, 18, WARM);
    const [sx, sy] = at(0); line(c, [[sx - 26, sy], [sx + 26, sy]], 8, COOL);
  },
  // supplies flowing from a hub out to classrooms
  refill: (c, x, y, w, h, t) => {
    const cx = x + w / 2, cy = y + h / 2, spots: [number, number][] = [[0.15, 0.2], [0.85, 0.22], [0.18, 0.8], [0.82, 0.78]].map(([u, v]) => [x + u * w, y + v * h]);
    spots.forEach(([sx, sy], i) => {
      line(c, [[cx, cy], [sx, sy]], 5, DIM);
      const k = loop(t + i * 0.4, 1.6);
      dot(c, cx + (sx - cx) * k, cy + (sy - cy) * k, 9, WARM);
      dot(c, sx, sy, 24, COOL);
    });
    const pulse = loop(t, 1.6);
    c.globalAlpha = 1 - pulse; ring(c, cx, cy, 40 + pulse * 90, 8, WARM); c.globalAlpha = 1;
    dot(c, cx, cy, 40, WARM);
  },
  // a street grid with the chosen route drawing itself to the pin
  wayfinder: (c, x, y, w, h, t) => {
    for (let i = 0; i <= 6; i++) { line(c, [[x + (i / 6) * w, y], [x + (i / 6) * w, y + h]], 3, DIM); line(c, [[x, y + (i / 6) * h], [x + w, y + (i / 6) * h]], 3, DIM); }
    const route: [number, number][] = [[0.05, 0.9], [0.33, 0.9], [0.33, 0.67], [0.5, 0.67], [0.5, 0.33], [0.83, 0.33], [0.83, 0.12]].map(([u, v]) => [x + u * w, y + v * h]);
    const k = ease(Math.min(1, loop(t, 5) * 1.4)), segs = route.length - 1, upto = k * segs, pts = route.slice(0, Math.floor(upto) + 1);
    if (upto < segs) { const i = Math.floor(upto), f = upto - i; pts.push([route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f]); }
    line(c, pts, 16, WARM);
    const [ex, ey] = route[segs]; dot(c, ex, ey - 26, 24, COOL); line(c, [[ex, ey - 26], [ex, ey]], 8, COOL);
  },
  // savings stacking toward a goal
  sum: (c, x, y, w, h, t) => {
    const k = loop(t, 5), base = y + h * 0.9;
    for (let i = 0; i < 5; i++) {
      const n = Math.max(0, Math.min(i + 2, Math.floor(k * 10) - i)), cx = x + w * (0.12 + i * 0.19);
      for (let j = 0; j < n; j++) { c.fillStyle = j % 2 ? COOL : WARM; c.beginPath(); c.ellipse(cx, base - j * 22, w * 0.07, 10, 0, 0, Math.PI * 2); c.fill(); }
    }
    line(c, [[x, y + h * 0.18], [x + w, y + h * 0.18]], 5, DIM);
    c.fillStyle = WARM; c.font = `bold ${Math.round(h * 0.08)}px monospace`; c.fillText("GOAL", x + w * 0.78, y + h * 0.13);
  },
  // a timetable grid filling itself with no clashes
  coursefit: (c, x, y, w, h, t) => {
    const k = loop(t, 6) * 1.4;
    for (let col = 0; col < 5; col++) for (let row = 0; row < 6; row++) {
      const cx = x + (col / 5) * w + 6, cy = y + (row / 6) * h + 6, cw = w / 5 - 12, chh = h / 6 - 12, i = col * 6 + row;
      c.strokeStyle = DIM; c.lineWidth = 4; c.strokeRect(cx, cy, cw, chh);
      if (i / 30 < k && (col * 3 + row * 2) % 5 !== 0) { c.fillStyle = (col + row) % 3 ? COOL : WARM; c.fillRect(cx, cy, cw, chh); }
    }
  },
  // three lanes of traffic and the player weaving through
  "turbo-lane": (c, x, y, w, h, t) => {
    for (const u of [1 / 3, 2 / 3]) for (let i = -1; i < 8; i++) { const yy = y + ((i * 0.15 + t * 0.6) % 1.05) * h; line(c, [[x + u * w, yy], [x + u * w, yy + h * 0.07]], 7, DIM); }
    line(c, [[x, y], [x, y + h]], 10, COOL); line(c, [[x + w, y], [x + w, y + h]], 10, COOL);
    [[0, 0.1], [2, 0.45], [1, 0.8]].forEach(([lane, off]) => { const cy = y + ((off + t * 0.35) % 1.1) * h - h * 0.1; c.fillStyle = COOL; c.fillRect(x + (lane / 3 + 1 / 6) * w - w * 0.08, cy, w * 0.16, h * 0.14); });
    const lane = 1 + Math.sin(t * 1.3) * 0.9; c.fillStyle = WARM; c.fillRect(x + (lane / 3 + 1 / 6) * w - w * 0.08, y + h * 0.78, w * 0.16, h * 0.15);
  },
  // streamlines bending over a cambered wing, lift arrow pulsing
  winglab: (c, x, y, w, h, t) => {
    const cx = x + w / 2, cy = y + h * 0.55;
    for (let i = 0; i < 7; i++) {
      const base = y + h * (0.15 + i * 0.12), above = base < cy, pts: [number, number][] = [];
      for (let j = 0; j <= 40; j++) { const u = j / 40, bump = Math.exp(-(((u - 0.5) * 4) ** 2)); pts.push([x + u * w, base + (above ? -1 : 1) * bump * h * 0.06 * (1 - Math.abs(base - cy) / h)]); }
      c.setLineDash([24, 18]); c.lineDashOffset = -t * 90; line(c, pts, 6, DIM); c.setLineDash([]);
    }
    c.fillStyle = COOL; c.beginPath(); c.moveTo(cx - w * 0.28, cy);
    c.bezierCurveTo(cx - w * 0.2, cy - h * 0.16, cx + w * 0.15, cy - h * 0.1, cx + w * 0.3, cy + h * 0.02);
    c.bezierCurveTo(cx + w * 0.1, cy + h * 0.03, cx - w * 0.2, cy + h * 0.06, cx - w * 0.28, cy); c.fill();
    const lift = h * (0.2 + 0.04 * Math.sin(t * 3));
    line(c, [[cx, cy - h * 0.1], [cx, cy - h * 0.1 - lift]], 12, WARM);
    line(c, [[cx - 22, cy - h * 0.1 - lift + 26], [cx, cy - h * 0.1 - lift], [cx + 22, cy - h * 0.1 - lift + 26]], 12, WARM);
  },
  // two speakers trading the floor
  debate: (c, x, y, w, h, t) => {
    const turn = Math.floor(t / 2.2) % 2;
    [[0.05, 0.12, 0], [0.4, 0.5, 1]].forEach(([u, v, side]) => {
      const bx = x + u * w, by = y + v * h, bw = w * 0.55, bh = h * 0.3, on = side === turn, col = on ? (side ? WARM : COOL) : DIM;
      c.strokeStyle = col; c.lineWidth = 10; c.beginPath(); c.roundRect(bx, by, bw, bh, 26); c.stroke();
      if (on) for (let i = 0; i < 3; i++) dot(c, bx + bw * (0.3 + i * 0.2), by + bh / 2, 12 * (0.6 + 0.4 * Math.abs(Math.sin(t * 4 + i))), col);
    });
  },
  // a red-black belt tied off, with the black belt still ahead
  kungfu: (c, x, y, w, h, t) => {
    const cy = y + h * 0.4, bh = h * 0.12;
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? "rgba(255,122,74,.55)" : WARM; c.fillRect(x + (i / 10) * w, cy - bh / 2, w / 10, bh); }
    c.fillStyle = COOL; c.fillRect(x + w * 0.44, cy - bh * 0.9, w * 0.12, bh * 1.8);
    line(c, [[x + w * 0.47, cy + bh], [x + w * 0.38, cy + h * 0.36]], 26, WARM);
    line(c, [[x + w * 0.53, cy + bh], [x + w * 0.64, cy + h * 0.34]], 26, WARM);
    const k = 0.9 + 0.1 * ease(loop(t, 4)); c.strokeStyle = DIM; c.lineWidth = 6; c.strokeRect(x, y + h * 0.88, w, h * 0.06);
    c.fillStyle = COOL; c.fillRect(x, y + h * 0.88, w * k * 0.9, h * 0.06);
  },
  // an octave of keys, a few going down at a time
  piano: (c, x, y, w, h, t) => {
    const n = 14, kw = w / n, top = y + h * 0.25, kh = h * 0.6;
    for (let i = 0; i < n; i++) {
      const down = Math.sin(t * 3 + i * 1.7) > 0.75;
      c.fillStyle = down ? WARM : COOL; c.globalAlpha = down ? 1 : 0.55; c.fillRect(x + i * kw + 3, top + (down ? 8 : 0), kw - 6, kh);
    }
    c.globalAlpha = 1; c.fillStyle = "#000";
    for (let i = 0; i < n - 1; i++) if (i % 7 !== 2 && i % 7 !== 6) c.fillRect(x + (i + 1) * kw - kw * 0.3, top, kw * 0.6, kh * 0.6);
  },
};
