// Activity diagrams are drawn in screen pixels, then sampled into the same fine ASCII grid as the aircraft.
// Keep silhouettes stronger than the interior strokes, so the drawings still read in the compact mobile box.
type Draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) => void;
type Point = [number, number];

const COOL = "#6b9cff", LIGHT = "#b5d0ff", WARM = "#ff7a4a", DIM = "rgba(107,156,255,.4)", SHADE = "rgba(107,156,255,.18)";

const line = (c: CanvasRenderingContext2D, pts: Point[], width: number, color: string) => {
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
};
const polygon = (c: CanvasRenderingContext2D, pts: Point[], fill: string, stroke = COOL, width = 3) => {
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = "round"; c.stroke();
};
const box = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = DIM, width = 3, radius = 0) => {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.roundRect(x, y, w, h, radius); c.stroke();
};
const dot = (c: CanvasRenderingContext2D, px: number, py: number, r: number, color: string) => { c.fillStyle = color; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill(); };
const ring = (c: CanvasRenderingContext2D, px: number, py: number, r: number, width: number, color: string, from = 0, to = Math.PI * 2) => {
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round"; c.beginPath(); c.arc(px, py, r, from, to); c.stroke();
};
const ellipse = (c: CanvasRenderingContext2D, px: number, py: number, rx: number, ry: number, color: string, width = 3) => {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.stroke();
};
const arrow = (c: CanvasRenderingContext2D, from: Point, to: Point, color: string, width = 4, head = 10) => {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  line(c, [from, to], width, color);
  line(c, [[to[0] - Math.cos(a - 0.55) * head, to[1] - Math.sin(a - 0.55) * head], to, [to[0] - Math.cos(a + 0.55) * head, to[1] - Math.sin(a + 0.55) * head]], width, color);
};
const ease = (k: number) => k * k * (3 - 2 * k);
const loop = (t: number, period: number) => (t % period) / period;

// Top-down cars face along their local negative y axis. Body, glass, axles, lights and tyres remain separate.
const car = (c: CanvasRenderingContext2D, px: number, py: number, length: number, heading: number, color: string, formula = false) => {
  c.save(); c.translate(px, py); c.rotate(heading); c.scale(length, length);
  const stroke = 0.045;
  if (formula) {
    for (const side of [-1, 1]) {
      line(c, [[side * 0.16, -0.22], [side * 0.3, -0.26]], stroke, LIGHT);
      line(c, [[side * 0.13, 0.26], [side * 0.3, 0.3]], stroke, LIGHT);
      c.fillStyle = DIM; c.fillRect(side * 0.28 - 0.055, -0.38, 0.11, 0.2); c.fillRect(side * 0.29 - 0.06, 0.19, 0.12, 0.23);
      box(c, side * 0.28 - 0.055, -0.38, 0.11, 0.2, LIGHT, stroke); box(c, side * 0.29 - 0.06, 0.19, 0.12, 0.23, LIGHT, stroke);
    }
    polygon(c, [[-0.045, -0.49], [0.045, -0.49], [0.1, -0.12], [0.18, 0.09], [0.14, 0.38], [-0.14, 0.38], [-0.18, 0.09], [-0.1, -0.12]], SHADE, color, stroke);
    line(c, [[-0.29, -0.43], [0.29, -0.43]], stroke * 1.5, color);
    line(c, [[-0.25, 0.42], [0.25, 0.42]], stroke * 1.5, color);
    ellipse(c, 0, 0.02, 0.075, 0.11, LIGHT, stroke); dot(c, 0, 0.02, 0.045, color);
    line(c, [[0, 0.15], [0, 0.34]], stroke, color);
  } else {
    for (const side of [-1, 1]) for (const yy of [-0.29, 0.27]) line(c, [[side * 0.25, yy - 0.08], [side * 0.25, yy + 0.08]], stroke * 1.8, LIGHT);
    polygon(c, [[-0.16, -0.48], [0.16, -0.48], [0.22, -0.32], [0.22, 0.36], [0.16, 0.48], [-0.16, 0.48], [-0.22, 0.36], [-0.22, -0.32]], SHADE, color, stroke);
    polygon(c, [[-0.15, -0.16], [0.15, -0.16], [0.12, -0.01], [-0.12, -0.01]], DIM, LIGHT, stroke * 0.7);
    polygon(c, [[-0.12, 0.24], [0.12, 0.24], [0.15, 0.34], [-0.15, 0.34]], DIM, LIGHT, stroke * 0.7);
    line(c, [[-0.14, -0.34], [0.14, -0.34]], stroke * 0.8, color);
    line(c, [[-0.16, 0.06], [-0.16, 0.19]], stroke * 0.7, LIGHT); line(c, [[0.16, 0.06], [0.16, 0.19]], stroke * 0.7, LIGHT);
    for (const side of [-1, 1]) { line(c, [[side * 0.1, -0.43], [side * 0.17, -0.43]], stroke, LIGHT); line(c, [[side * 0.1, 0.42], [side * 0.17, 0.42]], stroke, WARM); }
  }
  c.restore();
};

const DRAWINGS: Record<string, Draw> = {
  // Daily macros with measurement ticks, individual bar caps and a segmented calorie dial.
  kura: (c, x, y, w, h, t) => {
    const k = ease(Math.min(1, loop(t, 6) * 1.6)), base = y + h * 0.84, bh = h * 0.58, bw = w * 0.105;
    for (let i = 0; i <= 6; i++) line(c, [[x + w * 0.03, base - bh * i / 6], [x + w * 0.59, base - bh * i / 6]], 2.5, SHADE);
    [0.85, 0.58, 0.72].forEach((v, i) => {
      const bx = x + w * (0.08 + i * 0.18), height = bh * v * k, color = i === 1 ? WARM : COOL;
      box(c, bx, base - bh, bw, bh, DIM, 3, 4);
      c.fillStyle = i === 1 ? "rgba(255,122,74,.28)" : SHADE; c.fillRect(bx + 4, base - height, bw - 8, height);
      box(c, bx + 3, base - height, bw - 6, height, color, 4, 2);
      for (let j = 1; j < 5; j++) line(c, [[bx + bw * 0.26, base - bh * j / 5], [bx + bw * 0.74, base - bh * j / 5]], 2.5, DIM);
      line(c, [[bx + bw * 0.25, base + h * 0.045], [bx + bw * 0.75, base + h * 0.045]], 4, color);
    });
    const cx = x + w * 0.79, cy = y + h * 0.48, r = Math.min(w * 0.16, h * 0.26);
    ring(c, cx, cy, r, 8, DIM); ring(c, cx, cy, r, 8, WARM, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.72 * k);
    ring(c, cx, cy, r * 0.76, 2.5, DIM);
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; line(c, [[cx + Math.cos(a) * r * 1.17, cy + Math.sin(a) * r * 1.17], [cx + Math.cos(a) * r * 1.29, cy + Math.sin(a) * r * 1.29]], 2.5, i < 17 * k ? WARM : DIM); }
    const a = -Math.PI / 2 + Math.PI * 2 * 0.72 * k;
    line(c, [[cx, cy], [cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58]], 4, LIGHT); dot(c, cx, cy, 4, WARM);
  },
  // A face scan, blinking eyes and separate sleep / mood traces on a fine plotting grid.
  canary: (c, x, y, w, h, t) => {
    const cx = x + w * 0.5, cy = y + h * 0.29, r = Math.min(w, h) * 0.2, blink = loop(t, 3.2) > 0.93 ? 0.12 : 1;
    ellipse(c, cx, cy, r * 0.82, r, COOL, 4);
    for (const side of [-1, 1]) {
      ring(c, cx + side * r * 0.79, cy, r * 0.17, 3, DIM);
      line(c, [[cx + side * r * 0.21, cy - r * 0.31], [cx + side * r * 0.49, cy - r * 0.35]], 3, LIGHT);
      ellipse(c, cx + side * r * 0.34, cy - r * 0.12, r * 0.11, Math.max(1, r * 0.105 * blink), LIGHT, 3);
      dot(c, cx + side * r * 0.34, cy - r * 0.12, 2.5 * blink, COOL);
    }
    line(c, [[cx, cy - r * 0.08], [cx - r * 0.09, cy + r * 0.23], [cx + r * 0.07, cy + r * 0.23]], 2.5, DIM);
    line(c, [[cx - r * 0.27, cy + r * 0.46], [cx, cy + r * 0.53], [cx + r * 0.27, cy + r * 0.46]], 3.5, WARM);
    for (const side of [-1, 1]) { const bx = cx + side * r * 1.24; line(c, [[bx - side * r * 0.28, cy - r], [bx, cy - r], [bx, cy - r * 0.72]], 3, DIM); line(c, [[bx - side * r * 0.28, cy + r], [bx, cy + r], [bx, cy + r * 0.72]], 3, DIM); }
    for (let i = 0; i <= 4; i++) line(c, [[x + w * 0.06, y + h * (0.64 + i * 0.07)], [x + w * 0.94, y + h * (0.64 + i * 0.07)]], 2, SHADE);
    for (let trace = 0; trace < 2; trace++) {
      const pts: Point[] = Array.from({ length: 81 }, (_, i) => { const u = i / 80; return [x + w * (0.07 + u * 0.86), y + h * (0.74 + trace * 0.12 + Math.sin(u * (trace ? 17 : 11) - t * (trace ? 1.6 : 1)) * (trace ? 0.028 : 0.04))]; });
      line(c, pts, trace ? 3 : 4, trace ? DIM : WARM); dot(c, ...pts[pts.length - 1], trace ? 3 : 5, trace ? COOL : WARM);
    }
  },
  // A traversed taste graph over a calibrated risk dial; all of the dial stays inside the diagram.
  culturerisk: (c, x, y, w, h, t) => {
    const nodes: Point[] = [[0.5, 0.27], [0.2, 0.15], [0.8, 0.12], [0.16, 0.48], [0.84, 0.46]].map(([u, v]) => [x + u * w, y + v * h]);
    [[0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [2, 4], [1, 2], [3, 4]].forEach(([a, b]) => line(c, [nodes[a], nodes[b]], a ? 2.5 : 3.5, DIM));
    const hop = Math.floor(t / 0.9) % 4 + 1, k = ease((t % 0.9) / 0.9), nr = Math.min(w, h) * 0.038;
    const [hx, hy] = nodes[hop]; dot(c, nodes[0][0] + (hx - nodes[0][0]) * k, nodes[0][1] + (hy - nodes[0][1]) * k, 4, WARM);
    nodes.forEach(([nx, ny], i) => {
      dot(c, nx, ny, nr * (i ? 1 : 1.45), "#000"); ring(c, nx, ny, nr * (i ? 1 : 1.45), 3.5, i === hop ? WARM : COOL);
      ring(c, nx, ny, nr * (i ? 0.45 : 0.8), 2.5, i === hop ? WARM : DIM); dot(c, nx, ny, 2.5, LIGHT);
    });
    const gx = x + w * 0.5, gy = y + h * 0.91, gr = Math.min(w * 0.28, h * 0.27), level = 0.35 + Math.sin(t * 0.8) * 0.15;
    ring(c, gx, gy, gr, 5, DIM, Math.PI, Math.PI * 2); ring(c, gx, gy, gr, 5, WARM, Math.PI, Math.PI + Math.PI * level);
    for (let i = 0; i <= 12; i++) { const a = Math.PI + i * Math.PI / 12; line(c, [[gx + Math.cos(a) * gr * 0.84, gy + Math.sin(a) * gr * 0.84], [gx + Math.cos(a) * gr * 0.95, gy + Math.sin(a) * gr * 0.95]], 2.5, i < 12 * level ? WARM : COOL); }
    const a = Math.PI + Math.PI * level; line(c, [[gx, gy], [gx + Math.cos(a) * gr * 0.73, gy + Math.sin(a) * gr * 0.73]], 4, WARM); dot(c, gx, gy, 5, LIGHT);
    line(c, [[gx - gr * 0.25, gy + h * 0.05], [gx + gr * 0.25, gy + h * 0.05]], 3, DIM);
  },
  // A pair of open-wheel cars follow the racing line between two circuit edges and striped kerbs.
  "formula-racer": (c, x, y, w, h, t) => {
    const cx = x + w / 2, cy = y + h / 2, rx = w * 0.37, ry = h * 0.3, road = Math.min(w, h) * 0.09;
    const at = (a: number): Point => [cx + Math.cos(a) * rx * (1 + 0.15 * Math.sin(a * 2)), cy + Math.sin(a) * ry * (1 - 0.2 * Math.cos(a * 3))];
    const normal = (a: number): Point => { const p = at(a - 0.002), q = at(a + 0.002), len = Math.hypot(q[0] - p[0], q[1] - p[1]); return [-(q[1] - p[1]) / len, (q[0] - p[0]) / len]; };
    for (const side of [-1, 1]) {
      line(c, Array.from({ length: 181 }, (_, i) => { const a = i / 180 * Math.PI * 2, p = at(a), n = normal(a); return [p[0] + n[0] * road * side, p[1] + n[1] * road * side] as Point; }), 3.5, COOL);
      for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, p = at(a), n = normal(a); line(c, [[p[0] + n[0] * road * side, p[1] + n[1] * road * side], [p[0] + n[0] * (road + 5) * side, p[1] + n[1] * (road + 5) * side]], 4, i % 2 ? DIM : WARM); }
    }
    c.setLineDash([7, 11]); line(c, Array.from({ length: 181 }, (_, i) => at(i / 180 * Math.PI * 2)), 2, DIM); c.setLineDash([]);
    const start = at(0), sn = normal(0); for (let i = -3; i < 4; i++) { const xx = start[0] + sn[0] * i * road / 3, yy = start[1] + sn[1] * i * road / 3; line(c, [[xx - sn[1] * 3, yy + sn[0] * 3], [xx + sn[1] * 3, yy - sn[0] * 3]], 5, i % 2 ? LIGHT : DIM); }
    for (const [offset, color] of [[-0.55, COOL], [0, WARM]] as const) { const a = t * 1.4 + offset, p = at(a), q = at(a + 0.01); car(c, ...p, road * 1.4, Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2, color, true); }
    box(c, cx - w * 0.09, cy - h * 0.045, w * 0.18, h * 0.09, DIM, 2.5, 3);
    for (let i = 0; i < 4; i++) line(c, [[cx - w * 0.065 + i * w * 0.043, cy - h * 0.02], [cx - w * 0.065 + i * w * 0.043, cy + h * 0.02]], 3, i === Math.floor(t * 1.4 / (Math.PI * 2)) % 4 ? WARM : DIM);
  },
  // Packed supplies leave a central warehouse and arrive at four little classroom buildings.
  refill: (c, x, y, w, h, t) => {
    const cx = x + w / 2, cy = y + h / 2, size = Math.min(w, h), spots: Point[] = [[0.16, 0.2], [0.84, 0.22], [0.18, 0.79], [0.82, 0.78]].map(([u, v]) => [x + u * w, y + v * h]);
    spots.forEach(([sx, sy], i) => {
      c.setLineDash([5, 9]); line(c, [[cx, cy], [sx, sy]], 2.5, DIM); c.setLineDash([]);
      const k = loop(t + i * 0.4, 1.6), px = cx + (sx - cx) * k, py = cy + (sy - cy) * k, parcel = size * 0.02;
      box(c, px - parcel, py - parcel, parcel * 2, parcel * 2, WARM, 3, 1); line(c, [[px, py - parcel], [px, py + parcel]], 2.5, WARM);
      const bw = w * 0.12, bh = h * 0.12;
      polygon(c, [[sx - bw * 0.6, sy - bh * 0.4], [sx, sy - bh], [sx + bw * 0.6, sy - bh * 0.4]], "#000", COOL, 3);
      c.fillStyle = "#000"; c.fillRect(sx - bw / 2, sy - bh * 0.4, bw, bh);
      box(c, sx - bw / 2, sy - bh * 0.4, bw, bh, COOL, 3); box(c, sx - bw * 0.11, sy + bh * 0.1, bw * 0.22, bh * 0.5, LIGHT, 2.5);
      for (const side of [-1, 1]) box(c, sx + side * bw * 0.31 - bw * 0.08, sy - bh * 0.15, bw * 0.16, bh * 0.24, DIM, 2.5);
    });
    const pulse = loop(t, 1.6); c.globalAlpha = (1 - pulse) * 0.5; ring(c, cx, cy, size * (0.12 + pulse * 0.15), 3, WARM); c.globalAlpha = 1;
    const bw = w * 0.2, bh = h * 0.19; polygon(c, [[cx - bw * 0.6, cy - bh * 0.4], [cx, cy - bh * 0.85], [cx + bw * 0.6, cy - bh * 0.4]], "#000", WARM, 4);
    c.fillStyle = "#000"; c.fillRect(cx - bw / 2, cy - bh * 0.4, bw, bh); box(c, cx - bw / 2, cy - bh * 0.4, bw, bh, WARM, 4);
    box(c, cx - bw * 0.25, cy - bh * 0.06, bw * 0.5, bh * 0.66, COOL, 3); for (let i = 0; i < 4; i++) line(c, [[cx - bw * 0.25, cy + bh * (0.04 + i * 0.15)], [cx + bw * 0.25, cy + bh * (0.04 + i * 0.15)]], 2.5, DIM);
  },
  // Building footprints, a small park, route nodes and a proper hollow map pin.
  wayfinder: (c, x, y, w, h, t) => {
    for (let col = 0; col < 6; col++) for (let row = 0; row < 5; row++) {
      const bx = x + w * (0.035 + col * 0.16), by = y + h * (0.05 + row * 0.18), bw = w * 0.12, bh = h * 0.125;
      box(c, bx, by, bw, bh, SHADE, 2.5, 3);
      if ((col + row * 2) % 4 === 0) { box(c, bx + bw * 0.17, by + bh * 0.2, bw * 0.55, bh * 0.5, DIM, 2.5); }
      else if ((col * 3 + row) % 7 === 0) for (let j = 0; j < 3; j++) ring(c, bx + bw * (0.25 + j * 0.25), by + bh * (0.35 + (j % 2) * 0.3), Math.min(bw, bh) * 0.13, 2.5, DIM);
    }
    const route: Point[] = [[0.03, 0.91], [0.34, 0.91], [0.34, 0.73], [0.5, 0.73], [0.5, 0.37], [0.82, 0.37], [0.82, 0.2]].map(([u, v]) => [x + u * w, y + v * h]);
    line(c, route, 3, DIM);
    const k = ease(Math.min(1, loop(t, 5) * 1.4)), segs = route.length - 1, upto = k * segs, pts = route.slice(0, Math.floor(upto) + 1);
    if (upto < segs) { const i = Math.floor(upto), f = upto - i; pts.push([route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f]); }
    line(c, pts, 6, WARM); route.slice(1, -1).forEach(([px, py], i) => { if (i < upto) { dot(c, px, py, 5, "#000"); ring(c, px, py, 5, 2.5, WARM); } });
    ring(c, ...route[0], 7, 3, LIGHT); if (pts.length) dot(c, ...pts[pts.length - 1], 5, LIGHT);
    const [ex, ey] = route[segs], pr = Math.min(w, h) * 0.055;
    c.beginPath(); c.moveTo(ex, ey); c.bezierCurveTo(ex - pr * 0.45, ey - pr * 0.7, ex - pr, ey - pr * 1.35, ex - pr, ey - pr * 1.9); c.arc(ex, ey - pr * 1.9, pr, Math.PI, 0); c.bezierCurveTo(ex + pr, ey - pr * 1.35, ex + pr * 0.45, ey - pr * 0.7, ex, ey); c.closePath(); c.fillStyle = "#000"; c.fill(); c.strokeStyle = COOL; c.lineWidth = 4; c.stroke(); ring(c, ex, ey - pr * 1.9, pr * 0.38, 3, LIGHT);
  },
  // Individually rimmed coin stacks climb toward a marked goal.
  sum: (c, x, y, w, h, t) => {
    const k = loop(t, 5), base = y + h * 0.87, rx = w * 0.065, ry = Math.min(h * 0.022, rx * 0.3), step = h * 0.09;
    line(c, [[x + w * 0.04, base + ry * 2], [x + w * 0.97, base + ry * 2]], 3, DIM);
    for (let i = 0; i < 5; i++) {
      const n = Math.max(0, Math.min(i + 2, Math.floor(k * 13) - i)), cx = x + w * (0.12 + i * 0.19);
      for (let j = 0; j < n; j++) {
        const yy = base - j * step, color = j % 2 ? COOL : WARM;
        c.fillStyle = "#000"; c.beginPath(); c.ellipse(cx, yy, rx, ry, 0, 0, Math.PI * 2); c.fill();
        line(c, [[cx - rx, yy - step * 0.6], [cx - rx, yy], [cx, yy + ry], [cx + rx, yy], [cx + rx, yy - step * 0.6]], 3, color);
        ellipse(c, cx, yy - step * 0.6, rx, ry, color, 3); ellipse(c, cx, yy - step * 0.6, rx * 0.65, ry * 0.62, DIM, 2.5);
        for (const u of [-0.6, -0.2, 0.2, 0.6]) line(c, [[cx + rx * u, yy + ry * 0.55], [cx + rx * u, yy - step * 0.25]], 2, DIM);
      }
      line(c, [[cx - rx * 0.45, base + h * 0.075], [cx + rx * 0.45, base + h * 0.075]], 3, DIM);
    }
    c.setLineDash([5, 8]); line(c, [[x + w * 0.04, y + h * 0.27], [x + w * 0.96, y + h * 0.27]], 2.5, DIM); c.setLineDash([]);
    line(c, [[x + w * 0.91, y + h * 0.28], [x + w * 0.91, y + h * 0.1]], 3, WARM);
    polygon(c, [[x + w * 0.91, y + h * 0.1], [x + w * 0.98, y + h * 0.135], [x + w * 0.91, y + h * 0.18]], "rgba(255,122,74,.25)", WARM, 3);
  },
  // Calendar headers, time ticks and legible lesson cards replace a solid field of blocks.
  coursefit: (c, x, y, w, h, t) => {
    const k = loop(t, 6) * 1.4, left = x + w * 0.09, top = y + h * 0.17, cw = w * 0.17, rh = h * 0.12;
    box(c, x + w * 0.025, y + h * 0.035, w * 0.95, h * 0.91, DIM, 3, 8);
    for (let col = 0; col < 5; col++) { const bx = left + col * cw; line(c, [[bx + cw * 0.3, y + h * 0.1], [bx + cw * 0.7, y + h * 0.1]], 4, col === Math.floor(t / 1.2) % 5 ? WARM : COOL); line(c, [[bx, top], [bx, top + rh * 6]], 2.5, DIM); }
    for (let row = 0; row <= 6; row++) { const yy = top + row * rh; line(c, [[left, yy], [left + cw * 5, yy]], 2.5, DIM); if (row < 6) line(c, [[x + w * 0.045, yy + rh * 0.15], [x + w * 0.065, yy + rh * 0.15]], 2.5, COOL); }
    for (let col = 0; col < 5; col++) for (let row = 0; row < 6; row++) {
      const i = col * 6 + row;
      if (i / 30 < k && (col * 3 + row * 2) % 5 !== 0) {
        const bx = left + col * cw + 5, by = top + row * rh + 5, width = cw - 10, height = rh - 10, color = (col + row) % 3 ? COOL : WARM;
        c.fillStyle = color === WARM ? "rgba(255,122,74,.16)" : SHADE; c.fillRect(bx, by, width, height); box(c, bx, by, width, height, color, 2.5, 3);
        line(c, [[bx + width * 0.12, by + height * 0.34], [bx + width * 0.78, by + height * 0.34]], 2.5, color);
        if (height > 15) line(c, [[bx + width * 0.12, by + height * 0.68], [bx + width * 0.48, by + height * 0.68]], 2, DIM);
      }
    }
  },
  // Detailed cars, shoulder stripes and short lane dashes move independently down the road.
  "turbo-lane": (c, x, y, w, h, t) => {
    const roadX = x + w * 0.14, roadW = w * 0.72;
    for (const u of [1 / 3, 2 / 3]) for (let i = -2; i < 10; i++) { const yy = y + ((i * 0.13 + t * 0.6) % 1.3) * h; line(c, [[roadX + u * roadW, yy], [roadX + u * roadW, yy + h * 0.052]], 3.5, DIM); }
    for (const side of [0, 1]) {
      const xx = roadX + side * roadW; line(c, [[xx, y + h * 0.02], [xx, y + h * 0.98]], 4, COOL); line(c, [[xx + (side ? 1 : -1) * w * 0.035, y], [xx + (side ? 1 : -1) * w * 0.035, y + h]], 2.5, DIM);
      for (let i = -1; i < 13; i++) { const yy = y + ((i * 0.09 + t * 0.6) % 1.17) * h; line(c, [[xx + (side ? 1 : -1) * w * 0.02, yy], [xx + (side ? 1 : -1) * w * 0.03, yy + h * 0.034]], 3, i % 2 ? DIM : WARM); }
    }
    const size = Math.min(roadW * 0.2, h * 0.2);
    [[0, 0.1], [2, 0.45], [1, 0.8]].forEach(([lane, off]) => { const cy = y + ((off + t * 0.35) % 1.2) * h - h * 0.1; car(c, roadX + (lane + 0.5) / 3 * roadW, cy, size, 0, COOL); });
    const lane = 1 + Math.sin(t * 1.3) * 0.9, px = roadX + (lane + 0.5) / 3 * roadW, py = y + h * 0.81;
    for (const side of [-1, 1]) line(c, [[px + side * size * 0.15, py + size * 0.55], [px + side * size * 0.15, py + size * 0.8]], 2.5, DIM);
    car(c, px, py, size * 1.08, Math.cos(t * 1.3) * 0.12, WARM);
  },
  // Cambered airfoil with a sharp trailing edge, pressure taps and moving, smoothly bent flow lines.
  winglab: (c, x, y, w, h, t) => {
    const cx = x + w / 2, cy = y + h * 0.6;
    for (let i = 0; i < 11; i++) {
      const base = y + h * (0.1 + i * 0.078), above = base < cy, pts: Point[] = [];
      for (let j = 0; j <= 80; j++) { const u = j / 80, bump = Math.exp(-(((u - 0.43) * 4.8) ** 2)); pts.push([x + w * (0.035 + u * 0.93), base + (above ? -1 : 1) * bump * h * 0.055 * (1 - Math.abs(base - cy) / h)]); }
      c.setLineDash([13, 9]); c.lineDashOffset = -t * (above ? 95 : 63); line(c, pts, 2.5, DIM); c.setLineDash([]);
      if (i % 3 === 0) { const u = loop(t * (above ? 1.3 : 0.9) + i * 0.3, 3), idx = Math.floor(u * 76); arrow(c, pts[idx], pts[Math.min(idx + 4, 80)], COOL, 2.5, 5); }
    }
    c.lineDashOffset = 0;
    c.beginPath(); c.moveTo(cx - w * 0.31, cy); c.bezierCurveTo(cx - w * 0.29, cy - h * 0.17, cx + w * 0.07, cy - h * 0.14, cx + w * 0.33, cy + h * 0.015); c.bezierCurveTo(cx + w * 0.11, cy + h * 0.025, cx - w * 0.28, cy + h * 0.095, cx - w * 0.31, cy); c.closePath(); c.fillStyle = "#000"; c.fill(); c.strokeStyle = COOL; c.lineWidth = 4.5; c.stroke();
    c.setLineDash([6, 7]); line(c, [[cx - w * 0.31, cy], [cx + w * 0.33, cy + h * 0.015]], 2.5, DIM); c.setLineDash([]);
    c.beginPath(); c.moveTo(cx - w * 0.29, cy); c.bezierCurveTo(cx - w * 0.18, cy - h * 0.055, cx + w * 0.16, cy - h * 0.025, cx + w * 0.31, cy + h * 0.015); c.strokeStyle = DIM; c.lineWidth = 2.5; c.stroke();
    for (let i = 0; i < 5; i++) { const u = i / 4, px = cx + w * (-0.22 + u * 0.4), py = cy - h * (0.092 - u * 0.02); dot(c, px, py, 2.5, LIGHT); line(c, [[px, py - h * 0.02], [px, py - h * (0.045 + Math.sin(u * Math.PI) * 0.04)]], 2.5, WARM); }
    const lift = h * (0.2 + 0.025 * Math.sin(t * 3)); arrow(c, [cx + w * 0.015, cy - h * 0.14], [cx + w * 0.015, cy - h * 0.14 - lift], WARM, 4.5, 13);
    arrow(c, [x + w * 0.055, y + h * 0.94], [x + w * 0.23, y + h * 0.94], COOL, 3, 9);
  },
  // Alternating speech bubbles contain changing audio levels and a few quieter lines of argument.
  debate: (c, x, y, w, h, t) => {
    const turn = Math.floor(t / 2.2) % 2;
    [[0.06, 0.11, 0], [0.35, 0.53, 1]].forEach(([u, v, side]) => {
      const bx = x + u * w, by = y + v * h, bw = w * 0.58, bh = h * 0.28, on = side === turn, col = on ? (side ? WARM : COOL) : DIM;
      box(c, bx, by, bw, bh, col, 4, 12);
      const tail = bx + bw * (side ? 0.76 : 0.23); polygon(c, [[tail - 10, by + bh], [tail + (side ? 8 : -10), by + bh + h * 0.055], [tail + 10, by + bh]], "#000", col, 3);
      for (let i = 0; i < 11; i++) { const amp = on ? 0.15 + Math.abs(Math.sin(t * 4 + i * 0.75)) * 0.35 : 0.09; line(c, [[bx + bw * (0.16 + i * 0.067), by + bh * (0.44 - amp / 2)], [bx + bw * (0.16 + i * 0.067), by + bh * (0.44 + amp / 2)]], 3, col); }
      line(c, [[bx + bw * 0.16, by + bh * 0.79], [bx + bw * 0.65, by + bh * 0.79]], 2.5, DIM);
    });
  },
  // Woven belt edges, a folded square knot and stitched tails, followed by the next rank.
  kungfu: (c, x, y, w, h, t) => {
    const cy = y + h * 0.36, bh = h * 0.12, sway = Math.sin(t * 1.3) * w * 0.008;
    polygon(c, [[x + w * 0.035, cy - bh / 2], [x + w * 0.96, cy - bh / 2], [x + w * 0.965, cy + bh / 2], [x + w * 0.035, cy + bh / 2]], "rgba(255,122,74,.2)", WARM, 4);
    for (const side of [-1, 1]) { c.setLineDash([4, 5]); line(c, [[x + w * 0.05, cy + side * bh * 0.3], [x + w * 0.95, cy + side * bh * 0.3]], 2.5, WARM); c.setLineDash([]); }
    for (let i = 0; i < 18; i++) line(c, [[x + w * (0.06 + i * 0.05), cy - bh * 0.24], [x + w * (0.075 + i * 0.05), cy + bh * 0.24]], 2, DIM);
    const tails: Point[][] = [
      [[x + w * 0.48, cy], [x + w * 0.54, cy + bh * 0.5], [x + w * 0.41 + sway, cy + h * 0.38], [x + w * 0.34 + sway, cy + h * 0.35]],
      [[x + w * 0.48, cy + bh * 0.1], [x + w * 0.54, cy - bh * 0.1], [x + w * 0.67 - sway, cy + h * 0.33], [x + w * 0.6 - sway, cy + h * 0.36]],
    ];
    tails.forEach((pts, i) => { polygon(c, pts, "#000", WARM, 4); const end = pts[2], other = pts[3]; line(c, [[end[0] + (i ? -3 : 3), end[1] - h * 0.045], [other[0] + (i ? -3 : 3), other[1] - h * 0.045]], 4, COOL); });
    polygon(c, [[x + w * 0.44, cy - bh * 0.75], [x + w * 0.55, cy - bh * 0.55], [x + w * 0.57, cy + bh * 0.65], [x + w * 0.45, cy + bh * 0.7]], SHADE, COOL, 4);
    line(c, [[x + w * 0.455, cy - bh * 0.58], [x + w * 0.55, cy + bh * 0.52]], 3, LIGHT);
    const k = 0.9 + 0.1 * ease(loop(t, 4)); box(c, x + w * 0.05, y + h * 0.87, w * 0.9, h * 0.045, DIM, 3, 3);
    line(c, [[x + w * 0.06, y + h * 0.892], [x + w * (0.06 + k * 0.78), y + h * 0.892]], 4, COOL);
    for (let i = 0; i <= 8; i++) line(c, [[x + w * (0.06 + i * 0.1), y + h * 0.93], [x + w * (0.06 + i * 0.1), y + h * 0.95]], 2.5, DIM);
  },
  // Two octaves with beveled white keys, raised black keys and a few drifting notes.
  piano: (c, x, y, w, h, t) => {
    const n = 14, left = x + w * 0.035, keyboardW = w * 0.93, kw = keyboardW / n, top = y + h * 0.33, kh = h * 0.5;
    box(c, x + w * 0.018, top - h * 0.055, w * 0.964, kh + h * 0.1, COOL, 4, 5);
    line(c, [[left, top - h * 0.03], [left + keyboardW, top - h * 0.03]], 3, DIM);
    for (let i = 0; i < n; i++) {
      const down = Math.sin(t * 3 + i * 1.7) > 0.75, yy = top + (down ? h * 0.015 : 0), bx = left + i * kw, color = down ? WARM : COOL;
      c.fillStyle = down ? "rgba(255,122,74,.25)" : SHADE; c.fillRect(bx + 1, yy, kw - 2, kh);
      box(c, bx + 1, yy, kw - 2, kh, color, 2.5, 2);
      line(c, [[bx + kw * 0.15, yy + kh * 0.93], [bx + kw * 0.85, yy + kh * 0.93]], 2.5, down ? WARM : LIGHT);
    }
    for (let i = 0; i < n - 1; i++) if (i % 7 !== 2 && i % 7 !== 6) {
      const bx = left + (i + 1) * kw - kw * 0.3, height = kh * 0.6, down = Math.sin(t * 3 + i * 2.3 + 2) > 0.9;
      c.fillStyle = "#000"; c.fillRect(bx - 1, top, kw * 0.6 + 2, height + 2); box(c, bx, top, kw * 0.6, height, down ? WARM : LIGHT, 2.5, 1);
      line(c, [[bx + kw * 0.1, top + height * 0.85], [bx + kw * 0.5, top + height * 0.85]], 2.5, down ? WARM : DIM);
    }
    for (let i = 0; i < 4; i++) {
      const u = loop(t + i * 0.75, 3), nx = x + w * (0.18 + i * 0.21), ny = y + h * (0.25 - u * 0.17), r = Math.min(w, h) * 0.013;
      c.globalAlpha = Math.sin(u * Math.PI) * 0.8; ellipse(c, nx, ny, r * 1.4, r, i % 2 ? WARM : COOL, 3); line(c, [[nx + r * 1.3, ny], [nx + r * 1.3, ny - h * 0.06], [nx + r * 3.5, ny - h * 0.04]], 3, i % 2 ? WARM : COOL); c.globalAlpha = 1;
    }
  },
};

// Each activity owns its paint state and remains inside its allotted viewport, including moving vehicles.
export const SCENES: Record<string, Draw> = Object.fromEntries(Object.entries(DRAWINGS).map(([name, draw]) => [name, (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) => {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); draw(c, x, y, w, h, t); c.restore();
}]));
