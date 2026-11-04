import type * as THREE_NS from "three";

type Three = typeof THREE_NS;

/** Load the saved assembly mesh converted from the supplied SolidWorks Cessna 172 model. */
export async function loadCessna172(THREE: Three, signal: AbortSignal) {
  const [{ GLTFLoader }, response] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    fetch("/models/cessna-172.glb", { signal }),
  ]);
  if (!response.ok) throw new Error(`Cessna model request failed: ${response.status}`);
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/models/");
  const plane = new THREE.Group();
  plane.name = "Cessna 172 SolidWorks assembly";
  plane.add(gltf.scene);
  const prop = plane.getObjectByName("propeller");
  if (!prop) {
    disposeFlightModel(THREE, plane);
    throw new Error("The Cessna assembly is missing its propeller pivot");
  }
  return { plane, prop };
}

/** The assembly shares materials and geometry; dispose each resource exactly once. */
export function disposeFlightModel(THREE: Three, root: THREE_NS.Object3D) {
  const geometries = new Set<THREE_NS.BufferGeometry>();
  const materials = new Set<THREE_NS.Material>();
  const textures = new Set<THREE_NS.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
