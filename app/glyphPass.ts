import type * as THREE_NS from "three";

type T = typeof THREE_NS;

// Light-to-dense ramp: on the paper background a denser glyph reads as a darker shade.
const RAMP = " .,:;-=+*#%@";

// Renders a scene as a grid of text glyphs. Pass one averages each character cell of the scene into a tiny
// texture (one texel per cell); pass two draws, for every screen pixel, the glyph its cell's shade picks.
export function makeGlyphPass(THREE: T, renderer: THREE_NS.WebGLRenderer, { cell = 7, ink = "#13213a", accent = "#ff5a36" } = {}) {
  const fam = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "ui-monospace, Menlo, monospace";
  const G = 64, atlas = document.createElement("canvas");
  atlas.width = G * RAMP.length; atlas.height = G;
  const a = atlas.getContext("2d")!;
  a.fillStyle = "#fff"; a.textAlign = "center"; a.textBaseline = "middle"; a.font = `700 ${G * 0.86}px ${fam}`;
  [...RAMP].forEach((ch, i) => a.fillText(ch, i * G + G / 2, G / 2 + G * 0.04));
  const glyphs = new THREE.CanvasTexture(atlas);
  glyphs.minFilter = THREE.LinearFilter; glyphs.generateMipmaps = false;

  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  const cellRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const rgb = (hex: string) => { const c = new THREE.Color(); c.setStyle(hex, THREE.NoColorSpace); return new THREE.Vector3(c.r, c.g, c.b); };
  const vert = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";

  // pass one: 4x4 samples per cell -> shade, coverage and how orange the cell is
  const reduce = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: sceneRT.texture }, uCell: { value: cell }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tScene; uniform float uCell; uniform vec2 uRes;
      void main() {
        vec2 c0 = floor(gl_FragCoord.xy) * uCell;
        vec3 col = vec3(0.); float cov = 0.;
        for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) {
          vec4 s = texture2D(tScene, (c0 + (vec2(i, j) + .5) / 4. * uCell) / uRes);
          col += s.rgb; cov += s.a;
        }
        cov /= 16.;
        col = pow(clamp(col / max(cov * 16., 1e-3), 0., 1.), vec3(1. / 2.2));
        float lum = dot(col, vec3(.299, .587, .114));
        float warm = smoothstep(.3, .5, col.r - max(col.g, col.b) * .9);
        gl_FragColor = vec4(lum, cov, warm, 1.);
      }`,
  });

  // pass two: pick a glyph from the ramp for the cell, with a decode-in and a faint shimmer
  const draw = new THREE.ShaderMaterial({
    uniforms: {
      tCells: { value: cellRT.texture }, tGlyphs: { value: glyphs }, uCellPx: { value: cell }, uGrid: { value: new THREE.Vector2(1, 1) },
      uCount: { value: RAMP.length }, uInk: { value: rgb(ink) }, uAccent: { value: rgb(accent) }, uTime: { value: 0 }, uIntro: { value: 0 },
    },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tCells, tGlyphs; uniform float uCellPx, uCount, uTime, uIntro; uniform vec2 uGrid; uniform vec3 uInk, uAccent;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 cell = floor(gl_FragCoord.xy / uCellPx), local = fract(gl_FragCoord.xy / uCellPx);
        vec4 s = texture2D(tCells, (cell + .5) / uGrid);
        if (s.g < .04) discard;
        float dens = mix(.24, 1., smoothstep(.12, .78, 1. - s.r)) * mix(.45, 1., s.g);
        float idx = clamp(floor(dens * (uCount - 1.) + .5), 1., uCount - 1.);
        float h = hash(cell + floor(uTime * 7.));
        if (h < .035) idx = clamp(idx + (h < .0175 ? 1. : -1.) * 2., 1., uCount - 1.);
        if (hash(cell) > uIntro) idx = 1. + floor(hash(cell + floor(uTime * 18.)) * (uCount - 1.));
        float m = texture2D(tGlyphs, vec2((idx + local.x) / uCount, local.y)).r;
        vec3 col = mix(uInk, uAccent, s.b);
        gl_FragColor = vec4(col * m, m);
      }`,
    blending: THREE.NoBlending, depthTest: false, depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), reduce);
  quad.frustumCulled = false;
  const post = new THREE.Scene(); post.add(quad);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let start = -1;

  const setSize = (w: number, h: number) => {
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    sceneRT.setSize(w, h); cellRT.setSize(cols, rows);
    reduce.uniforms.uRes.value.set(w, h);
    draw.uniforms.uGrid.value.set(cols, rows);
    draw.uniforms.uCellPx.value = cell * renderer.getPixelRatio();
  };

  const render = (scene: THREE_NS.Scene, camera: THREE_NS.Camera, now: number, still: boolean) => {
    if (start < 0) start = now;
    const t = (now - start) / 1000;
    draw.uniforms.uTime.value = still ? 0 : t;
    draw.uniforms.uIntro.value = still ? 1.01 : Math.min(1.01, t / 1.4);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(sceneRT); renderer.clear(); renderer.render(scene, camera);
    quad.material = reduce; renderer.setRenderTarget(cellRT); renderer.clear(); renderer.render(post, ortho);
    quad.material = draw; renderer.setRenderTarget(null); renderer.clear(); renderer.render(post, ortho);
  };

  const dispose = () => { sceneRT.dispose(); cellRT.dispose(); glyphs.dispose(); reduce.dispose(); draw.dispose(); quad.geometry.dispose(); };
  return { setSize, render, dispose };
}
