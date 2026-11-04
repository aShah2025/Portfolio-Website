import type * as THREE_NS from "three";

type Three = typeof THREE_NS;
type Point = [number, number, number];
type Station = [number, number, number, number];
const TAU = Math.PI * 2;
const ease = (t: number) => t * t * (3 - 2 * t);

// Cosine spacing keeps the small leading-edge radius smooth without filling the flat skin with polygons.
function airfoil(thickness: number, camber = 0, camberPosition = 0.4, count = 28) {
  const upper: [number, number][] = [], lower: [number, number][] = [];
  for (let i = 0; i <= count; i++) {
    const x = (1 - Math.cos(i * Math.PI / count)) / 2;
    const yt = 5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const p = camberPosition;
    const yc = x < p ? camber / p ** 2 * (2 * p * x - x ** 2) : camber / (1 - p) ** 2 * (1 - 2 * p + 2 * p * x - x ** 2);
    const slope = x < p ? 2 * camber / p ** 2 * (p - x) : 2 * camber / (1 - p) ** 2 * (p - x);
    const theta = Math.atan(slope);
    upper.push([x - yt * Math.sin(theta), yc + yt * Math.cos(theta)]);
    lower.push([x + yt * Math.sin(theta), yc - yt * Math.cos(theta)]);
  }
  // Both edges are shared, rather than leaving zero-area faces at the leading/trailing edges.
  return [...upper, ...lower.reverse().slice(1, -1)];
}

/** A C172S-sized Skyhawk, in metres: 11 m span, 8.28 m length, nose along -Z. */
export function buildCessna172(THREE: Three) {
  const plane = new THREE.Group();
  plane.name = "Cessna 172 Skyhawk";
  const white = "#edf0f1", red = "#bb302b", navy = "#172b45", seam = "#8794a2";
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.06, clearcoat: 0.75 });
  const body = new THREE.MeshStandardMaterial({ color: white, roughness: 0.35, metalness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: navy, roughness: 0.52, metalness: 0.12 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#141a21", roughness: 0.94 });
  const metal = new THREE.MeshStandardMaterial({ color: "#7e8a93", roughness: 0.3, metalness: 0.75 });
  const panel = new THREE.MeshStandardMaterial({ color: seam, roughness: 0.65, metalness: 0.15 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#142d49", roughness: 0.13, metalness: 0.24, clearcoat: 1 });
  const scarlet = new THREE.MeshStandardMaterial({ color: red, roughness: 0.4, metalness: 0.1 });
  const cream = new THREE.MeshStandardMaterial({ color: "#e9e3ce", roughness: 0.45 });
  const v = (p: Point) => new THREE.Vector3(...p);
  const mesh = (geometry: THREE_NS.BufferGeometry, material: THREE_NS.Material, name: string, parent: THREE_NS.Group = plane) => {
    const object = new THREE.Mesh(geometry, material); object.name = name; object.castShadow = true; parent.add(object); return object;
  };

  // The same loft serves X-, Y- and Z-oriented parts. Side winding is determined against each section's
  // radial direction; end caps have separate vertices so their normals cannot round off the silhouette.
  const loft = (rings: THREE_NS.Vector3[][], paint: (p: THREE_NS.Vector3) => string, name: string, parent = plane) => {
    const n = rings[0].length, positions: number[] = [], indices: number[] = [];
    const centres = rings.map((ring) => ring.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(n));
    rings.forEach((ring) => ring.forEach((p) => positions.push(p.x, p.y, p.z)));
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), radial = new THREE.Vector3(), normal = new THREE.Vector3();
    const triangle = (a: number, b: number, c: number, centre: THREE_NS.Vector3) => {
      const A = new THREE.Vector3().fromArray(positions, a * 3), B = new THREE.Vector3().fromArray(positions, b * 3), C = new THREE.Vector3().fromArray(positions, c * 3);
      normal.crossVectors(ab.subVectors(B, A), ac.subVectors(C, A));
      radial.copy(A).add(B).add(C).divideScalar(3).sub(centre);
      indices.push(...(normal.dot(radial) >= 0 ? [a, b, c] : [a, c, b]));
    };
    for (let r = 0; r < rings.length - 1; r++) {
      const centre = centres[r].clone().add(centres[r + 1]).multiplyScalar(0.5);
      for (let i = 0; i < n; i++) {
        const a = r * n + i, b = r * n + (i + 1) % n, c = a + n, d = b + n;
        triangle(a, c, b, centre); triangle(b, c, d, centre);
      }
    }
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); indexed.setIndex(indices); indexed.computeVertexNormals();
    const geometry = indexed.toNonIndexed(); indexed.dispose();
    const p = Array.from(geometry.attributes.position.array), normals = Array.from(geometry.attributes.normal.array);
    for (const r of [0, rings.length - 1]) {
      const outward = centres[r].clone().sub(centres[r === 0 ? 1 : r - 1]).normalize();
      for (let i = 0; i < n; i++) {
        const points = [centres[r], rings[r][i], rings[r][(i + 1) % n]];
        normal.crossVectors(ab.subVectors(points[1], points[0]), ac.subVectors(points[2], points[0]));
        if (normal.dot(outward) < 0) [points[1], points[2]] = [points[2], points[1]];
        points.forEach((point) => { p.push(point.x, point.y, point.z); normals.push(outward.x, outward.y, outward.z); });
      }
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    const colours: number[] = [], colour = new THREE.Color(), centre = new THREE.Vector3();
    for (let i = 0; i < p.length; i += 9) {
      centre.set((p[i] + p[i + 3] + p[i + 6]) / 3, (p[i + 1] + p[i + 4] + p[i + 7]) / 3, (p[i + 2] + p[i + 5] + p[i + 8]) / 3);
      colour.set(paint(centre)); for (let j = 0; j < 3; j++) colours.push(colour.r, colour.g, colour.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
    geometry.computeBoundingSphere();
    return mesh(geometry, skin, name, parent);
  };
  const tube = (points: Point[], radius: number, material: THREE_NS.Material, name: string, parent = plane) => {
    const curve = new THREE.CatmullRomCurve3(points.map(v));
    return mesh(new THREE.TubeGeometry(curve, Math.max(4, points.length * 3), radius, 5, false), material, name, parent);
  };
  const rod = (a: Point, b: Point, radius: number, material: THREE_NS.Material, name: string, parent = plane) => {
    const A = v(a), B = v(b), object = mesh(new THREE.CylinderGeometry(radius, radius, A.distanceTo(B), 10), material, name, parent);
    object.position.copy(A).add(B).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); return object;
  };

  // Rounded-square cabin, short cowling and long tapering tailcone; the spinner is a separate part.
  const stations: Station[] = [
    [-3.08, 0.32, 0.28, -0.07], [-2.94, 0.40, 0.34, -0.06], [-2.55, 0.45, 0.37, -0.035],
    [-2.05, 0.48, 0.39, -0.005], [-1.80, 0.49, 0.43, 0.025], [-1.20, 0.52, 0.56, 0.09],
    [-0.80, 0.52, 0.58, 0.09], [0.52, 0.51, 0.57, 0.10], [1.10, 0.46, 0.49, 0.10],
    [1.65, 0.39, 0.36, 0.11], [2.40, 0.29, 0.26, 0.13], [3.30, 0.19, 0.18, 0.16],
    [4.28, 0.10, 0.12, 0.18], [4.72, 0.055, 0.075, 0.19], [4.90, 0.009, 0.018, 0.19],
  ];
  const stationAt = (z: number): Station => {
    let i = 0; while (i < stations.length - 2 && stations[i + 1][0] < z) i++;
    const a = stations[i], b = stations[i + 1], t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
    return [z, a[1] + (b[1] - a[1]) * ease(t), a[2] + (b[2] - a[2]) * ease(t), a[3] + (b[3] - a[3]) * t];
  };
  const surface = (z: number, angle: number, offset = 0) => {
    const [, w, h, cy] = stationAt(z), c = Math.cos(angle), s = Math.sin(angle), exponent = 2 / 2.7;
    return new THREE.Vector3((w + offset) * Math.sign(c) * Math.abs(c) ** exponent, cy + (h + offset) * Math.sign(s) * Math.abs(s) ** exponent, z);
  };
  const sidePoint = (s: number, z: number, y: number, offset = 0.008): Point => {
    const [, w, h, cy] = stationAt(z), relativeY = Math.min(0.995, Math.abs((y - cy) / h));
    return [s * (w * (1 - relativeY ** 2.7) ** (1 / 2.7) + offset), y, z];
  };
  const fuselageZ = [...new Set(stations.flatMap((a, i) => i === stations.length - 1 ? [a[0]] : Array.from({ length: 6 }, (_, k) => a[0] + (stations[i + 1][0] - a[0]) * k / 6)))];
  loft(fuselageZ.map((z) => Array.from({ length: 48 }, (_, i) => surface(z, i * TAU / 48))), () => white, "Fuselage and engine cowling");
  // Conforming ribbons give the livery a continuous edge at full resolution as well as in ASCII.
  for (const s of [-1, 1]) for (const [low, high, material, name] of [[0, 0.13, scarlet, "Swept red fuselage stripe"], [-0.075, -0.035, dark, "Navy fuselage pinstripe"]] as const) {
    const positions: number[] = [], indices: number[] = [], segments = 144;
    for (let i = 0; i <= segments; i++) {
      const z = -3.045 + 7.65 * i / segments, [, , h, cy] = stationAt(z);
      const stripe = -0.32 + 0.52 * ease(Math.max(0, Math.min(1, (z + 1.4) / 5.7)));
      for (const y of [stripe + low, stripe + high]) positions.push(...sidePoint(s, z, cy + h * y, 0.004));
    }
    for (let i = 0; i < segments; i++) { const a = i * 2; indices.push(...(s > 0 ? [a, a + 1, a + 2, a + 1, a + 3, a + 2] : [a, a + 2, a + 1, a + 1, a + 2, a + 3])); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); mesh(geometry, material, name);
  }

  // Conforming glass patches retain distinct panes even when the aircraft is only a few hundred glyphs wide.
  const sideWindow = (s: number, z0: number, z1: number, lower: (t: number) => number, upper: (t: number) => number, name: string) => {
    const positions: number[] = [], indices: number[] = [], nz = 12, ny = 7;
    for (let iz = 0; iz <= nz; iz++) for (let iy = 0; iy <= ny; iy++) {
      const t = iz / nz, z = z0 + (z1 - z0) * t, y = lower(t) + (upper(t) - lower(t)) * iy / ny;
      positions.push(...sidePoint(s, z, y));
    }
    for (let iz = 0; iz < nz; iz++) for (let iy = 0; iy < ny; iy++) {
      const a = iz * (ny + 1) + iy, b = a + 1, c = a + ny + 1, d = c + 1;
      indices.push(...(s > 0 ? [a, b, c, b, d, c] : [a, c, b, b, c, d]));
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    mesh(geometry, glass, name);
    const outline: Point[] = [];
    for (let i = 0; i <= nz; i++) { const t = i / nz; outline.push(sidePoint(s, z0 + (z1 - z0) * t, upper(t), 0.018)); }
    for (let i = nz; i >= 0; i--) { const t = i / nz; outline.push(sidePoint(s, z0 + (z1 - z0) * t, lower(t), 0.018)); }
    outline.push(outline[0]); tube(outline, 0.012, body, `${name} frame`);
  };
  const roofWindow = (z0: number, z1: number, a0: number, a1: number, name: string) => {
    const p: number[] = [], index: number[] = [], nz = 14, na = 18;
    for (let iz = 0; iz <= nz; iz++) for (let ia = 0; ia <= na; ia++) {
      const point = surface(z0 + (z1 - z0) * iz / nz, a0 + (a1 - a0) * ia / na, 0.009); p.push(point.x, point.y, point.z);
    }
    for (let iz = 0; iz < nz; iz++) for (let ia = 0; ia < na; ia++) {
      const a = iz * (na + 1) + ia, b = a + 1, c = a + na + 1, d = c + 1; index.push(a, b, c, b, d, c);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); geometry.setIndex(index); geometry.computeVertexNormals(); mesh(geometry, glass, name);
    const border: Point[] = [];
    for (let i = 0; i <= na; i++) border.push(surface(z0, a0 + (a1 - a0) * i / na, 0.021).toArray() as Point);
    for (let i = 1; i <= nz; i++) border.push(surface(z0 + (z1 - z0) * i / nz, a1, 0.021).toArray() as Point);
    for (let i = na - 1; i >= 0; i--) border.push(surface(z1, a0 + (a1 - a0) * i / na, 0.021).toArray() as Point);
    for (let i = nz - 1; i >= 0; i--) border.push(surface(z0 + (z1 - z0) * i / nz, a0, 0.021).toArray() as Point);
    tube(border, 0.014, body, `${name} surround`);
  };
  roofWindow(-1.91, -1.14, 0.39, Math.PI - 0.39, "Wraparound windshield");
  tube(Array.from({ length: 12 }, (_, i) => surface(-1.90 + 0.75 * i / 11, Math.PI / 2, 0.025).toArray() as Point), 0.013, body, "Windshield centre mullion");
  roofWindow(1.11, 1.68, 0.61, Math.PI - 0.61, "Rear Omni-Vision glazing");
  for (const s of [-1, 1]) {
    sideWindow(s, -1.05, 0.25, (t) => 0.13 + 0.015 * t, (t) => Math.min(0.57, 0.36 + t * 1.05), "Pilot door window");
    sideWindow(s, 0.38, 1.27, (t) => 0.17 + 0.045 * t, (t) => 0.57 - 0.17 * t, "Rear quarter window");
    const door: Point[] = [[-1.12, 0.13], [-1.12, -0.25], [-0.91, -0.40], [0.27, -0.39], [0.32, 0.13]].map(([z, y]) => sidePoint(s, z, y, 0.012));
    tube(door, 0.007, panel, "Door perimeter");
    rod(sidePoint(s, 0.06, 0.025, 0.025), sidePoint(s, 0.21, 0.025, 0.025), 0.013, metal, "Door handle");
    for (const y of [0.06, -0.25]) {
      const hinge = mesh(new THREE.BoxGeometry(0.025, 0.065, 0.045), metal, "Door hinge"); hinge.position.copy(v(sidePoint(s, -1.10, y, 0.018)));
    }
  }

  const mainFoil = airfoil(0.12, 0.02), tailFoil = airfoil(0.085);
  const wingAt = (x: number, u: number, offset = 0): Point => {
    const ax = Math.abs(x), taper = Math.max(0, (ax - 3.3) / 2.2), chord = 1.61 - 0.37 * taper;
    const leading = -1.28 + 0.12 * taper, thickness = 5 * 0.12 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    const camber = u < 0.4 ? 0.02 / 0.16 * (0.8 * u - u ** 2) : 0.02 / 0.36 * (0.2 + 0.8 * u - u ** 2);
    return [x, 0.70 + ax * 0.027 + (camber + thickness) * chord + offset, leading + u * chord];
  };
  const wingX = [-5.5, -5.46, -5.35, ...Array.from({ length: 35 }, (_, i) => -5.1 + i * 0.3), 5.35, 5.46, 5.5];
  loft(wingX.map((x) => {
    const ax = Math.abs(x), taper = Math.max(0, (ax - 3.3) / 2.2), tip = ax > 5.35 ? Math.max(0.14, 1 - (ax - 5.35) / 0.175) : 1;
    const chord = (1.61 - 0.37 * taper) * (ax > 5.46 ? 0.94 : 1), leading = -1.28 + 0.12 * taper;
    return mainFoil.map(([u, h]) => new THREE.Vector3(x, 0.70 + ax * 0.027 + h * chord * tip, leading + u * chord));
  }), (p) => Math.abs(p.x) > 5.32 && p.z > -0.4 ? red : white, "Cambered high wing and shaped wingtips");

  // Geometry seams and corrugated trailing-edge panels remain legible independently of colour sampling.
  const rivets: Point[] = [];
  for (const s of [-1, 1]) {
    const hinge = Array.from({ length: 40 }, (_, i) => wingAt(s * (0.58 + 4.68 * i / 39), 0.74, 0.008));
    tube(hinge, 0.008, panel, "Flap and aileron hinge line");
    for (const x of [0.62, 2.92, 3.0, 5.20]) tube(Array.from({ length: 8 }, (_, i) => wingAt(s * x, 0.74 + 0.25 * i / 7, 0.008)), 0.006, panel, "Control surface end gap");
    for (let x = 0.72; x < 5.15; x += 0.19) tube([wingAt(s * x, 0.79, 0.007), wingAt(s * x, 0.96, 0.007)], 0.0035, panel, "Control surface rib");
    for (const x of [0.75, 1.76, 2.9, 4.13]) {
      tube(Array.from({ length: 15 }, (_, i) => wingAt(s * x, 0.05 + 0.65 * i / 14, 0.006)), 0.004, panel, "Wing skin joint");
      for (let u = 0.09; u < 0.7; u += 0.06) rivets.push(wingAt(s * x + 0.025, u, 0.009));
    }
    const cap = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16), metal, "Fuel filler cap"); cap.position.copy(v(wingAt(s * 1.25, 0.37, 0.015)));
    const light = mesh(new THREE.SphereGeometry(0.043, 12, 8), new THREE.MeshBasicMaterial({ color: s < 0 ? "#f24135" : "#34d385" }), "Wingtip navigation light"); light.position.set(s * 5.49, 0.87, -0.94); light.scale.set(0.6, 0.75, 1.4);
    const strobe = mesh(new THREE.SphereGeometry(0.024, 10, 6), cream, "Wingtip strobe"); strobe.position.set(s * 5.47, 0.87, -0.42);
  }
  // Two landing lamps sit in the port leading edge rather than floating beside the fuselage.
  for (const x of [-1.75, -2.04]) {
    const surround = mesh(new THREE.SphereGeometry(0.076, 14, 8), dark, "Landing lamp recess"); surround.position.set(x, 0.77, -1.272); surround.scale.set(1, 0.62, 0.25);
    const lamp = mesh(new THREE.SphereGeometry(0.056, 14, 8), cream, "Landing lamp lens"); lamp.position.set(x, 0.77, -1.292); lamp.scale.set(1, 0.62, 0.18);
  }
  tube([[-2.2, 0.70, -1.05], [-2.2, 0.50, -1.10], [-2.2, 0.50, -1.47]], 0.012, metal, "Pitot tube");

  // Streamlined lift struts have an airfoil cross-section, not a cylindrical scaffold.
  const strutFoil = airfoil(0.22, 0, 0.4, 12);
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * 0.47, -0.23, -0.48), b = new THREE.Vector3(s * 2.72, 0.76, -0.57), direction = b.clone().sub(a).normalize();
    const transverse = new THREE.Vector3(0, 0, 1).cross(direction).normalize();
    loft([0, 0.04, 0.96, 1].map((t) => strutFoil.map(([u, h]) => a.clone().lerp(b, t).addScaledVector(new THREE.Vector3(0, 0, 1), (u - 0.45) * 0.18).addScaledVector(transverse, h * 0.18))), () => white, "Streamlined wing lift strut");
    for (const p of [a, b]) { const cuff = mesh(new THREE.SphereGeometry(0.073, 12, 8), body, "Strut attachment fairing"); cuff.position.copy(p); cuff.scale.set(0.7, 0.75, 1.55); }
  }

  const stabilizerX = [-1.72, -1.67, -1.48, -0.6, 0, 0.6, 1.48, 1.67, 1.72];
  loft(stabilizerX.map((x) => {
    const t = Math.abs(x) / 1.72, chord = 1.0 - t * 0.41, leading = 3.72 + t * 0.31;
    return tailFoil.map(([u, h]) => new THREE.Vector3(x, 0.22 + h * chord * (t > 0.97 ? 0.4 : 1), leading + u * chord));
  }), () => white, "Horizontal stabilizer and elevator");
  for (const s of [-1, 1]) {
    tube(Array.from({ length: 18 }, (_, i) => { const x = s * (0.16 + 1.48 * i / 17), t = Math.abs(x) / 1.72, chord = 1 - t * 0.41; return [x, 0.242, 3.72 + t * 0.31 + chord * 0.67] as Point; }), 0.007, panel, "Elevator hinge gap");
    for (let x = 0.3; x < 1.65; x += 0.19) {
      const t = x / 1.72, leading = 3.72 + t * 0.31, chord = 1 - t * 0.41;
      tube([[s * x, 0.238, leading + chord * 0.73], [s * x, 0.231, leading + chord * 0.98]], 0.0035, panel, "Elevator rib");
    }
  }
  loft(Array.from({ length: 22 }, (_, i) => {
    const y = 0.21 + 1.30 * i / 21, t = i / 21, chord = 1.48 - t * 0.84, leading = 3.26 + t * 0.83;
    return tailFoil.map(([u, h]) => new THREE.Vector3(h * chord, y, leading + u * chord));
  }), () => white, "Swept vertical stabilizer and rudder");
  for (const s of [-1, 1]) for (const [low, width, material, name] of [[0, 0.14, scarlet, "Swept red fin stripe"], [-0.09, 0.045, dark, "Navy fin pinstripe"]] as const) {
    const a = -0.415 + low, slope = 0.27, leadingSlope = 0.83 / 1.30, trailingSlope = -0.01 / 1.30;
    const intersectLeading = (intercept: number) => (3.26 + leadingSlope * (intercept - 0.21)) / (1 - leadingSlope * slope);
    const intersectTrailing = (intercept: number) => (4.74 + trailingSlope * (intercept - 0.21)) / (1 - trailingSlope * slope);
    const start = intersectLeading(a), end = intersectTrailing(a);
    const samples = [...Array.from({ length: 100 }, (_, i) => start + (end - start) * i / 99), intersectLeading(a + width), intersectTrailing(a + width)].sort((x, y) => x - y);
    const positions: number[] = [], indices: number[] = [];
    for (const z of samples) {
      const bottom = a + slope * z;
      const top = Math.max(bottom, Math.min(bottom + width, 0.21 + (z - 3.26) / leadingSlope, 0.21 + (z - 4.74) / trailingSlope));
      for (const y of [bottom, top]) {
        const t = (y - 0.21) / 1.30, chord = 1.48 - t * 0.84, u = Math.max(0, Math.min(1, (z - 3.26 - t * 0.83) / chord));
        const thickness = 5 * 0.085 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4) * chord;
        positions.push(s * (thickness + 0.004), y, z);
      }
    }
    for (let i = 0; i < samples.length - 1; i++) { const a = i * 2; indices.push(...(s > 0 ? [a, a + 1, a + 2, a + 1, a + 3, a + 2] : [a, a + 2, a + 1, a + 1, a + 2, a + 3])); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); mesh(geometry, material, name);
  }
  for (const s of [-1, 1]) {
    tube(Array.from({ length: 20 }, (_, i) => { const t = i / 19; return [s * (0.035 - t * 0.022), 0.27 + 1.20 * t, 3.26 + 0.83 * t + (1.48 - 0.84 * t) * 0.72] as Point; }), 0.0065, panel, "Rudder hinge gap");
  }
  loft(Array.from({ length: 12 }, (_, i) => {
    const z = 2.28 + 1.28 * i / 11, [, , h, cy] = stationAt(z), top = cy + h - 0.015, rise = 0.39 * ease(i / 11) + 0.018;
    return Array.from({ length: 16 }, (_, k) => { const a = k * TAU / 16; return new THREE.Vector3(0.047 * Math.cos(a), top + Math.sin(a) * (Math.sin(a) > 0 ? rise : 0.025), z); });
  }), () => white, "Dorsal fin fillet");
  const beacon = mesh(new THREE.SphereGeometry(0.035, 12, 8), scarlet, "Tail beacon"); beacon.position.set(0, 1.53, 4.39);
  tube([[-0.02, 1.42, 4.38], [-0.42, 1.43, 4.54]], 0.009, metal, "Left VOR antenna");
  tube([[0.02, 1.42, 4.38], [0.42, 1.43, 4.54]], 0.009, metal, "Right VOR antenna");

  // Spring main gear sweeps out from the belly. Fairings leave a visible tyre contact patch underneath.
  const wheel = (x: number, y: number, z: number, radius: number, name: string) => {
    const tyre = mesh(new THREE.CylinderGeometry(radius, radius, 0.13, 24), rubber, name); tyre.rotation.z = Math.PI / 2; tyre.position.set(x, y, z);
    for (const s of [-1, 1]) { const hub = mesh(new THREE.CylinderGeometry(radius * 0.40, radius * 0.40, 0.008, 16), metal, "Wheel hub"); hub.rotation.z = Math.PI / 2; hub.position.set(x + s * 0.068, y, z); }
  };
  const wheelPant = (x: number, y: number, z: number, scale: number, name: string) => {
    const pantStations: Station[] = [[-0.37, 0.015, 0.045, 0], [-0.25, 0.10, 0.12, 0.015], [-0.05, 0.13, 0.17, 0.03], [0.18, 0.105, 0.13, 0.035], [0.44, 0.01, 0.025, 0.04]];
    loft(pantStations.map(([dz, w, h, cy]) => Array.from({ length: 20 }, (_, k) => { const a = k * TAU / 20; return new THREE.Vector3(x + w * Math.cos(a) * scale, y + (cy + h * Math.sin(a)) * scale, z + dz * scale); })), (p) => p.y < y + 0.01 && p.y > y - 0.025 ? red : white, name);
    tube(pantStations.slice(1, -1).map(([dz, w]) => [x + w * scale + 0.002, y + 0.03 * scale, z + dz * scale]), 0.004, panel, "Wheel fairing panel seam");
  };
  for (const s of [-1, 1]) {
    loft([[s * 0.38, -0.38, 0.14], [s * 0.75, -0.63, 0.23], [s * 1.18, -0.98, 0.32]].map(([x, y, z]) => strutFoil.map(([u, h]) => new THREE.Vector3(x + h * 0.20, y, z + (u - 0.5) * 0.25))), () => white, "Main spring landing gear leg");
    wheel(s * 1.19, -1.02, 0.31, 0.19, "Main landing tyre"); wheelPant(s * 1.19, -0.98, 0.31, 1, "Main wheel streamlined fairing");
    tube([[s * 0.43, -0.39, 0.18], [s * 0.80, -0.69, 0.26], [s * 1.11, -0.99, 0.35]], 0.008, dark, "Main brake line");
    rod([s * 0.53, -0.36, -0.1], [s * 0.79, -0.43, -0.1], 0.017, metal, "Cabin boarding step");
  }
  rod([0, -0.33, -2.28], [0, -0.85, -2.31], 0.036, metal, "Nose gear oleo");
  rod([0, -0.37, -2.27], [0, -0.63, -2.29], 0.051, body, "Nose gear upper fairing");
  for (const s of [-1, 1]) tube([[s * 0.045, -0.74, -2.31], [s * 0.096, -0.88, -2.27], [s * 0.096, -1.00, -2.29]], 0.018, metal, "Nose wheel fork");
  wheel(0, -1.02, -2.29, 0.17, "Nose landing tyre"); wheelPant(0, -1.0, -2.29, 0.85, "Nose wheel fairing");

  // Cowling cooling inlets, lower induction opening, panel fasteners and the underslung exhaust.
  for (const s of [-1, 1]) {
    const inlet = mesh(new THREE.SphereGeometry(1, 20, 12), dark, "Engine cooling inlet"); inlet.position.set(s * 0.23, -0.005, -3.062); inlet.scale.set(0.105, 0.082, 0.025);
    const rim = mesh(new THREE.TorusGeometry(0.09, 0.007, 5, 18), body, "Cooling inlet lip"); rim.position.set(s * 0.23, -0.005, -3.08); rim.scale.y = 0.75;
    tube(Array.from({ length: 18 }, (_, i) => { const z = -2.92 + i * 0.92 / 17; return sidePoint(s, z, 0.13, 0.008); }), 0.005, panel, "Cowling split seam");
    for (let z = -2.82; z < -2.05; z += 0.19) rivets.push(sidePoint(s, z, 0.125, 0.014));
    for (const z of [-2.94, -2.02]) tube(Array.from({ length: 28 }, (_, i) => surface(z, 0.12 + (Math.PI - 0.24) * i / 27, 0.005).toArray() as Point), 0.005, panel, "Cowling access panel");
  }
  const induction = mesh(new THREE.SphereGeometry(1, 16, 8), dark, "Lower cowling induction inlet"); induction.position.set(0, -0.245, -3.031); induction.scale.set(0.105, 0.043, 0.024);
  tube([[0.18, -0.36, -2.42], [0.19, -0.50, -2.40], [0.22, -0.56, -2.30]], 0.034, metal, "Exhaust pipe");

  const prop = new THREE.Group(); prop.name = "Two-blade fixed-pitch propeller"; prop.position.set(0, -0.06, -3.085); plane.add(prop);
  for (const s of [-1, 1]) {
    const sections = [[0.12, 0.065, 0.018], [0.24, 0.13, 0.014], [0.49, 0.145, 0.012], [0.74, 0.115, 0.010], [0.92, 0.074, 0.008], [0.965, 0.012, 0.004]];
    loft(sections.map(([radius, width, thick]) => Array.from({ length: 12 }, (_, k) => {
      const a = k * TAU / 12, pitch = 0.55 - radius * 0.30, chord = Math.cos(a) * width / 2, depth = Math.sin(a) * thick;
      return new THREE.Vector3(s * (chord * Math.cos(pitch) - depth * Math.sin(pitch) + radius * radius * 0.035), s * radius, chord * Math.sin(pitch) + depth * Math.cos(pitch));
    })), (p) => Math.abs(p.y) > 0.865 ? "#e9e3ce" : "#1a2638", "Tapered propeller blade", prop);
  }
  loft([[-3.38, 0.006], [-3.35, 0.062], [-3.28, 0.13], [-3.18, 0.18], [-3.085, 0.195]].map(([z, radius]) => Array.from({ length: 32 }, (_, k) => new THREE.Vector3(Math.cos(k * TAU / 32) * radius, -0.06 + Math.sin(k * TAU / 32) * radius, z))), () => "#d6dce1", "Polished spinner");

  // Small aerials and static ports give the fine ASCII samples real edges to catch.
  tube([[0, 0.67, 0.42], [0, 0.99, 0.50], [0, 1.04, 0.60]], 0.015, body, "Cabin VHF aerial");
  const aerialBase = mesh(new THREE.SphereGeometry(0.05, 12, 8), body, "VHF aerial mounting base"); aerialBase.position.set(0, 0.66, 0.42); aerialBase.scale.set(0.65, 0.3, 1.8);
  tube([[0.01, -0.38, 1.25], [0.01, -0.68, 1.48]], 0.008, metal, "Belly transponder aerial");
  for (const z of [-1.95, 1.75, 2.63, 3.42]) {
    for (const s of [-1, 1]) {
      const [, , h, cy] = stationAt(z);
      tube(Array.from({ length: 16 }, (_, i) => sidePoint(s, z, cy - h * 0.75 + h * 1.50 * i / 15, 0.005)), 0.004, panel, "Fuselage skin joint");
      for (let i = 0; i < 9; i++) rivets.push(sidePoint(s, z + 0.025, cy - h * 0.67 + h * 1.34 * i / 8, 0.008));
    }
  }
  const rivetGeometry = new THREE.IcosahedronGeometry(0.007, 0), rivetMaterial = new THREE.MeshStandardMaterial({ color: "#9aa5b0", roughness: 0.7, metalness: 0.2 });
  const rivetMesh = new THREE.InstancedMesh(rivetGeometry, rivetMaterial, rivets.length), transform = new THREE.Matrix4();
  rivets.forEach((point, i) => { transform.makeTranslation(...point); rivetMesh.setMatrixAt(i, transform); });
  rivetMesh.name = "Flush skin fasteners"; plane.add(rivetMesh);

  const registration = document.createElement("canvas"); registration.width = 512; registration.height = 96;
  const context = registration.getContext("2d");
  if (context) {
    context.fillStyle = navy; context.font = "italic 700 76px Arial, sans-serif"; context.textBaseline = "middle"; context.fillText("N172AS", 6, 51);
    const texture = new THREE.CanvasTexture(registration); texture.colorSpace = THREE.SRGBColorSpace;
    const lettering = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const s of [-1, 1]) {
      const decal = mesh(new THREE.PlaneGeometry(0.96, 0.18), lettering, "Tailcone registration"); decal.position.copy(v(sidePoint(s, 2.38, 0.13, 0.015))); decal.rotation.y = s * (Math.PI / 2 - 0.12);
    }
  }
  return { plane, prop };
}
