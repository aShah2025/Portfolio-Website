type Point = { x: number; y: number };
type Frame = { x: number; y: number; width: number; height: number };

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const point = (x: number, y: number): Point => ({ x, y });
const blend = (a: Point[], b: Point[], t: number) => a.map((p, i) => point(mix(p.x, b[i].x, t), mix(p.y, b[i].y, t)));

// Seven joined cubic curves trace the back, foaming lip, hollow, face and lower sea.
// The control points change shape; no image plane or glyph layer is rotated.
const raised = [
  point(-.12, .38),
  point(.095, .425), point(.195, .075), point(.37, .10),
  point(.445, .095), point(.50, .23), point(.54, .27),
  point(.585, .29), point(.60, .35), point(.58, .405),
  point(.565, .365), point(.535, .33), point(.49, .34),
  point(.42, .335), point(.38, .42), point(.40, .51),
  point(.408, .60), point(.44, .66), point(.49, .70),
  point(.69, .85), point(.94, .70), point(1.12, .41),
];

const leaning = [
  point(-.12, .40),
  point(.105, .43), point(.22, .09), point(.40, .12),
  point(.49, .12), point(.58, .25), point(.605, .31),
  point(.65, .35), point(.67, .42), point(.65, .47),
  point(.64, .425), point(.60, .385), point(.555, .39),
  point(.48, .385), point(.425, .45), point(.44, .53),
  point(.445, .625), point(.48, .68), point(.52, .72),
  point(.72, .85), point(.97, .73), point(1.12, .45),
];

const falling = [
  point(-.12, .52),
  point(.115, .54), point(.23, .22), point(.40, .28),
  point(.53, .28), point(.61, .43), point(.65, .51),
  point(.70, .59), point(.735, .68), point(.72, .745),
  point(.70, .71), point(.67, .67), point(.64, .68),
  point(.585, .66), point(.53, .655), point(.53, .70),
  point(.53, .745), point(.55, .775), point(.59, .79),
  point(.78, .87), point(1.01, .79), point(1.12, .64),
];

function trace(points: Point[], segments = 7) {
  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i <= segments * 3; i += 3) {
    path.bezierCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, points[i + 2].x, points[i + 2].y);
  }
  return path;
}

function cubic(a: Point, b: Point, c: Point, d: Point, t: number) {
  const u = 1 - t;
  return point(u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y);
}

/** Draw evolving water as ink density. White means ink, black is open paper. */
export function drawWaveBreaker(c: CanvasRenderingContext2D, width: number, height: number, image: Frame, progress: number) {
  const p = clamp(progress);
  c.save();
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  c.fillStyle = "#000";
  c.fillRect(0, 0, width, height);
  if (p >= .995) { c.restore(); return; }

  const impact = ease((p - .42) / .32);
  const settle = ease((p - .60) / .20);
  const retreat = ease((p - .76) / .24);
  const shore = (height * .81 - image.y) / image.height;
  const wash = [
    point(-.12, shore + .015),
    point(.025, shore + .015), point(.13, shore - .05), point(.24, shore - .045),
    point(.31, shore - .045), point(.38, shore - .015), point(.43, shore),
    point(.49, shore + .015), point(.55, shore + .045), point(.59, shore + .05),
    point(.62, shore + .055), point(.66, shore + .06), point(.68, shore + .065),
    point(.72, shore + .07), point(.76, shore + .065), point(.80, shore + .06),
    point(.84, shore + .055), point(.89, shore + .07), point(.93, shore + .07),
    point(1.0, shore + .075), point(1.07, shore + .05), point(1.12, shore + .055),
  ];

  let shape = p < .32 ? blend(raised, leaning, ease(p / .32))
    : blend(leaning, falling, ease((p - .32) / .30));
  shape = blend(shape, wash, settle);
  c.translate(image.x, image.y + retreat * height * .67);
  c.scale(image.width, image.height);

  const body = trace(shape);
  body.lineTo(1.2, 1.45); body.lineTo(-.2, 1.45); body.closePath();
  const ink = c.createLinearGradient(.2, .12, .75, 1.0);
  ink.addColorStop(0, "#181818");
  ink.addColorStop(.24, "#444444");
  ink.addColorStop(.5, "#727272");
  ink.addColorStop(1, "#292929");
  c.fillStyle = ink; c.fill(body);

  c.save(); c.clip(body);
  // Broad variations in the water leave breathing room between the ink veins.
  const open = c.createRadialGradient(.34, .48, .02, .34, .48, .43);
  open.addColorStop(0, "rgba(0,0,0,.68)");
  open.addColorStop(.62, "rgba(0,0,0,.25)");
  open.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = open; c.fillRect(-.2, 0, 1.5, 1.45);
  // Curving ink ribbons rise through the face and follow the lip as it falls.
  // Unlike a warped bitmap, their detail is redrawn on every frame.
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    const end = cubic(shape[3], shape[4], shape[5], shape[6], .08 + t * .88);
    const lower = point(-.12 + t * .95, 1.22);
    const rise = mix(.29, .71, settle);
    c.beginPath(); c.moveTo(lower.x, lower.y);
    c.bezierCurveTo(.12 + t * .56, mix(.91, shore + .13, settle),
      end.x - .15 + t * .075, mix(end.y + .22, rise, impact * .25), end.x, end.y + .018);
    c.strokeStyle = i % 4 === 1 ? "#020202" : i % 3 === 0 ? "#b8b8b8" : "#8b8b8b";
    c.lineWidth = i % 4 === 1 ? .015 + Math.sin(i * 1.7) * .004 : i % 4 === 0 ? .006 : .0025;
    c.stroke();
  }

  // Lower-water currents join the face to the sea, retaining long flowing lines.
  for (let i = 0; i < 19; i++) {
    const depth = i / 18;
    const level = mix(.78 + depth * .025, shore + .065 + depth * .017, settle);
    const ripple = Math.sin(depth * 4.8 - p * 5.2) * .012 * (1 - settle * .5);
    c.beginPath(); c.moveTo(.28, level + .15);
    c.bezierCurveTo(.48, level - .015 + ripple, .78, level + .08, 1.2, level - .24 * (1 - settle));
    c.strokeStyle = i % 3 === 0 ? "#b7b7b7" : i % 3 === 1 ? "#272727" : "#888";
    c.lineWidth = i % 3 === 0 ? .005 : .003;
    c.stroke();
  }

  // Fine, elongated foam cells travel with the lower water, never as particles.
  for (let row = 0; row < 6; row++) for (let col = 0; col < 15; col++) {
    const x = -.1 + col * .092 + Math.sin(row * 2.1) * .026;
    const y = mix(.56 + row * .09, shore + .055 + row * .036, settle)
      + Math.sin(col * .93 + row * 1.6) * .016 * (1 - settle * .6);
    const dx = Math.sin(col * 2.8 + row * 1.7 + p * 2.5) * .008;
    c.beginPath();
    c.ellipse(x + dx, y, mix(.0035, .008, impact), .0025, -.32 * (1 - settle), 0, Math.PI * 2);
    c.fillStyle = "#090909"; c.fill();
  }
  c.restore();

  // The rim and small hooked fingers stay attached to the moving surface.
  const rim = trace(shape, 3);
  c.lineCap = "round"; c.lineJoin = "round";
  c.strokeStyle = "#080808"; c.lineWidth = .062 * (1 - impact * .46); c.stroke(rim);
  c.strokeStyle = "#929292"; c.lineWidth = .0022; c.stroke(rim);
  for (let segment = 0; segment < 3; segment++) {
    const count = segment === 0 ? 12 : 8;
    for (let i = 1; i < count; i++) {
      const t = i / count;
      const k = segment * 3;
      const a = cubic(shape[k], shape[k + 1], shape[k + 2], shape[k + 3], t);
      const b = cubic(shape[k], shape[k + 1], shape[k + 2], shape[k + 3], Math.min(1, t + .012));
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = (b.y - a.y) / len, ny = -(b.x - a.x) / len;
      const size = (.012 + .007 * (1 + Math.sin(i * 2.4 + segment))) * (1 - settle * .5);
      // Unequal paper lobes cut into the rim, producing the print's ragged foam.
      const pocket = .020 + .009 * Math.sin(i * 1.8 + segment * 2);
      c.beginPath();
      c.ellipse(a.x - nx * pocket, a.y - ny * pocket, .009 + size * .2, pocket * .65, -.3, 0, Math.PI * 2);
      c.fillStyle = "#050505"; c.fill();
      c.beginPath(); c.moveTo(a.x - nx * .043, a.y - ny * .043);
      c.bezierCurveTo(a.x + nx * size, a.y + ny * size,
        a.x + nx * size + .009, a.y + ny * size - .004,
        a.x + nx * size + .01, a.y + ny * size + .005);
      c.strokeStyle = "#b6b6b6"; c.lineWidth = .0025; c.stroke();
    }
  }
  c.restore();
}
