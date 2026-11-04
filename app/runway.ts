import type * as THREE_NS from "three";

type Three = typeof THREE_NS;
type Point2 = [number, number];

const GROUND_Y = -1.25;
const ROAD_CENTRE_Z = -260;
const ROAD_LENGTH = 720;
const MARK_MIN_Z = -610;
const MARK_PERIOD = 704;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const random = (x: number, y: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

/** An airfield in the Cessna's metre scale, with its takeoff direction along -Z. */
export function createRunway(THREE: Three) {
  const group = new THREE.Group();
  group.name = "Sunset airfield";
  const geometries = new Set<THREE_NS.BufferGeometry>();
  const textures = new Set<THREE_NS.Texture>();
  const fades = new Map<THREE_NS.Material, number>();
  const instances: THREE_NS.InstancedMesh[] = [];
  let disposed = false;

  const ownGeometry = <G extends THREE_NS.BufferGeometry>(geometry: G) => { geometries.add(geometry); return geometry; };
  const ownTexture = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    return texture;
  };
  const ownMaterial = <M extends THREE_NS.Material>(material: M, opacity = 1) => {
    // These surfaces draw in a deliberate ground-to-paint order and never cover the opaque aircraft.
    material.transparent = true;
    material.depthWrite = false;
    material.opacity = opacity;
    fades.set(material, opacity);
    return material;
  };
  const addMesh = (geometry: THREE_NS.BufferGeometry, material: THREE_NS.Material, name: string, order: number) => {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.renderOrder = order;
    group.add(object);
    return object;
  };
  const canvas = (size: number) => { const value = document.createElement("canvas"); value.width = value.height = size; return value; };

  // Small generated textures add natural grain while keeping this scene completely self-contained.
  const asphaltCanvas = canvas(128), asphaltContext = asphaltCanvas.getContext("2d")!;
  const asphaltPixels = asphaltContext.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const at = (y * 128 + x) * 4;
    const grain = Math.round(110 + random(x, y) * 24 + (random(x + 91, y + 37) > 0.985 ? 21 : 0));
    asphaltPixels.data.set([grain, grain + 2, grain + 3, 255], at);
  }
  asphaltContext.putImageData(asphaltPixels, 0, 0);
  const asphaltTexture = ownTexture(asphaltCanvas);
  asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(2, 80);
  asphaltTexture.anisotropy = 8;

  const grassCanvas = canvas(512), grassContext = grassCanvas.getContext("2d")!;
  const grassPixels = grassContext.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const at = (y * 512 + x) * 4;
    const grain = random(x, y) * 7 + Math.sin(x * 0.055 + Math.sin(y * 0.032)) * 4;
    grassPixels.data.set([84 + grain, 103 + grain, 80 + grain * 0.8, 255], at);
  }
  grassContext.putImageData(grassPixels, 0, 0);
  // The remote field softens into the existing sunset rather than ending in a visible square.
  grassContext.globalCompositeOperation = "destination-in";
  const fieldFade = grassContext.createRadialGradient(256, 256, 95, 256, 256, 256);
  fieldFade.addColorStop(0, "#fff"); fieldFade.addColorStop(0.74, "rgba(255,255,255,.95)"); fieldFade.addColorStop(1, "rgba(255,255,255,0)");
  grassContext.fillStyle = fieldFade; grassContext.fillRect(0, 0, 512, 512);
  const grassTexture = ownTexture(grassCanvas);
  const grassMaterial = ownMaterial(new THREE.MeshStandardMaterial({ map: grassTexture, color: "#d0cbb0", roughness: 1, side: THREE.DoubleSide }));
  const ground = addMesh(ownGeometry(new THREE.PlaneGeometry(1100, 1100)), grassMaterial, "Low open grass airfield", -5);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, GROUND_Y - 0.035, -60);

  const shoulderMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#656758", roughness: 1, side: THREE.DoubleSide }));
  const shoulder = addMesh(ownGeometry(new THREE.PlaneGeometry(21.4, ROAD_LENGTH)), shoulderMaterial, "Weathered runway shoulders", -4);
  shoulder.rotation.x = -Math.PI / 2; shoulder.position.set(0, GROUND_Y - 0.012, ROAD_CENTRE_Z);
  const asphaltMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#6b7278", map: asphaltTexture, roughness: 0.98, metalness: 0, side: THREE.DoubleSide }));
  const road = addMesh(ownGeometry(new THREE.PlaneGeometry(18, ROAD_LENGTH)), asphaltMaterial, "Continuous asphalt runway", -3);
  road.rotation.x = -Math.PI / 2; road.position.set(0, GROUND_Y, ROAD_CENTRE_Z);
  const paintMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#e6e0cd", roughness: 0.92, side: THREE.DoubleSide }));

  const transform = new THREE.Matrix4(), quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const position = new THREE.Vector3(), scale = new THREE.Vector3(1, 1, 1);
  const placeFlat = (mesh: THREE_NS.InstancedMesh, index: number, x: number, z: number, y = GROUND_Y + 0.007) => {
    position.set(x, y, z); transform.compose(position, quaternion, scale); mesh.setMatrixAt(index, transform);
  };
  const edgePaint = new THREE.InstancedMesh(ownGeometry(new THREE.PlaneGeometry(0.105, ROAD_LENGTH)), paintMaterial, 2);
  edgePaint.name = "Runway edge paint"; edgePaint.renderOrder = -2;
  placeFlat(edgePaint, 0, -8.58, ROAD_CENTRE_Z); placeFlat(edgePaint, 1, 8.58, ROAD_CENTRE_Z); edgePaint.instanceMatrix.needsUpdate = true; group.add(edgePaint); instances.push(edgePaint);

  const dashCount = 22;
  const centreline = new THREE.InstancedMesh(ownGeometry(new THREE.PlaneGeometry(0.30, 12)), paintMaterial, dashCount);
  centreline.name = "Repeating runway centreline"; centreline.renderOrder = -1;
  centreline.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(centreline); instances.push(centreline);
  const threshold = new THREE.InstancedMesh(ownGeometry(new THREE.PlaneGeometry(0.64, 8)), paintMaterial, 12);
  threshold.name = "Threshold piano keys"; threshold.renderOrder = -1;
  threshold.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(threshold); instances.push(threshold);

  // Geometric stencil numerals stay sharp at any pixel ratio and need no font or image download.
  const numeralPositions: number[] = [], numeralIndices: number[] = [];
  const stencil = (points: Point2[], offsetX: number) => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const geometry = new THREE.ShapeGeometry(shape), attribute = geometry.attributes.position;
    const offset = numeralPositions.length / 3;
    for (let i = 0; i < attribute.count; i++) numeralPositions.push(attribute.getX(i) + offsetX, GROUND_Y + 0.008, -attribute.getY(i));
    if (geometry.index) for (const index of geometry.index.array) numeralIndices.push(index + offset);
    geometry.dispose();
  };
  stencil([[-0.92, 1.83], [-0.20, 3], [0.67, 3], [0.67, -3], [-0.28, -3], [-0.28, 1.70], [-0.92, 1.13]], -1.8);
  stencil([[-1.24, 3], [1.30, 3], [1.30, 2.12], [-0.46, -3], [-1.48, -3], [0.25, 2.10], [-1.24, 2.10]], 1.75);
  const numeralsGeometry = ownGeometry(new THREE.BufferGeometry());
  numeralsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(numeralPositions, 3)); numeralsGeometry.setIndex(numeralIndices); numeralsGeometry.computeVertexNormals();
  const numerals = addMesh(numeralsGeometry, paintMaterial, "Runway 17 designation", -1);

  const lightCount = dashCount * 2;
  const fixtureMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#60645e", roughness: 0.8, metalness: 0.15 }));
  const lampMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#ffe7b5", emissive: "#ffd391", emissiveIntensity: 0.65, roughness: 0.3 }));
  const thresholdLightMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#95e0bb", emissive: "#5caf88", emissiveIntensity: 0.45, roughness: 0.35 }));
  const fixtureGeometry = ownGeometry(new THREE.CylinderGeometry(0.055, 0.075, 0.085, 8));
  const bulbGeometry = ownGeometry(new THREE.SphereGeometry(0.046, 8, 6));
  const fixtures = new THREE.InstancedMesh(fixtureGeometry, fixtureMaterial, lightCount + 2);
  const lamps = new THREE.InstancedMesh(bulbGeometry, lampMaterial, lightCount);
  const thresholdLamps = new THREE.InstancedMesh(bulbGeometry, thresholdLightMaterial, 2);
  fixtures.name = "Low runway light fixtures"; lamps.name = "Warm runway edge lights"; thresholdLamps.name = "Threshold lights";
  for (const object of [fixtures, lamps, thresholdLamps]) { object.instanceMatrix.setUsage(THREE.DynamicDrawUsage); object.renderOrder = 0; group.add(object); instances.push(object); }
  const placeLight = (mesh: THREE_NS.InstancedMesh, index: number, x: number, z: number, y: number) => { transform.makeTranslation(x, y, z); mesh.setMatrixAt(index, transform); };

  // A soft texture plus smaller tyre patches anchors the parked aircraft without shadow-map overhead.
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = 512; shadowCanvas.height = 256;
  const shadowContext = shadowCanvas.getContext("2d")!;
  const shadowWidth = 15, shadowLength = 10;
  const shadowBlob = (x: number, z: number, width: number, length: number, opacity: number) => {
    shadowContext.save();
    shadowContext.translate((x / shadowWidth + 0.5) * 512, (z / shadowLength + 0.5) * 256);
    shadowContext.scale(width / shadowWidth * 512, length / shadowLength * 256);
    const gradient = shadowContext.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(16,20,26,${opacity})`); gradient.addColorStop(0.42, `rgba(16,20,26,${opacity * 0.65})`); gradient.addColorStop(1, "rgba(16,20,26,0)");
    shadowContext.fillStyle = gradient; shadowContext.fillRect(-1, -1, 2, 2); shadowContext.restore();
  };
  shadowBlob(0.18, 0.15, 1.0, 3.75, 0.23);
  shadowBlob(0.20, -0.05, 5.6, 1.05, 0.18);
  shadowBlob(0.20, 3.85, 1.8, 0.65, 0.15);
  shadowBlob(-1.25, -0.65, 0.31, 0.33, 0.38); shadowBlob(1.25, -0.65, 0.31, 0.33, 0.38); shadowBlob(0, -2.31, 0.24, 0.29, 0.36);
  const shadowMaterial = ownMaterial(new THREE.MeshBasicMaterial({ map: ownTexture(shadowCanvas), color: "#161b21", side: THREE.DoubleSide }), 0.9);
  const shadow = addMesh(ownGeometry(new THREE.PlaneGeometry(shadowWidth, shadowLength)), shadowMaterial, "Soft aircraft contact shadow", 1);
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, GROUND_Y + 0.012, 0);

  const wrap = (z: number) => MARK_MIN_Z + ((z - MARK_MIN_Z) % MARK_PERIOD + MARK_PERIOD) % MARK_PERIOD;
  const update = (distance: number) => {
    if (disposed) return;
    const travel = Number.isFinite(distance) ? Math.max(0, distance) : 0;
    for (let i = 0; i < dashCount; i++) {
      const z = wrap(-34 - i * 32 + travel);
      placeFlat(centreline, i, 0, z);
      for (let side = 0; side < 2; side++) {
        const index = i * 2 + side, x = side === 0 ? -9.28 : 9.28;
        placeLight(fixtures, index, x, z, GROUND_Y + 0.035);
        placeLight(lamps, index, x, z, GROUND_Y + 0.102);
      }
    }
    const thresholdZ = wrap(14 + travel);
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      for (let i = 0; i < 6; i++) placeFlat(threshold, side * 6 + i, sign * (1.55 + i * 1.1), thresholdZ);
      placeLight(fixtures, lightCount + side, sign * 9.28, thresholdZ, GROUND_Y + 0.035);
      placeLight(thresholdLamps, side, sign * 9.28, thresholdZ, GROUND_Y + 0.102);
    }
    numerals.position.z = wrap(-18 + travel);
    for (const object of [centreline, threshold, fixtures, lamps, thresholdLamps]) {
      object.instanceMatrix.needsUpdate = true;
      // Repeated objects cross the loop boundary, so their old bounding sphere must not cull new positions.
      object.computeBoundingSphere();
    }
  };
  const setOpacity = (opacity: number) => {
    if (disposed) return;
    const value = Number.isFinite(opacity) ? clamp(opacity) : 0;
    fades.forEach((base, material) => { material.opacity = base * value; });
    group.visible = value > 0.001;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    instances.forEach((object) => object.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    fades.forEach((_, material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    group.clear();
  };
  update(0);
  return { group, update, setOpacity, dispose };
}
