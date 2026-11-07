export type WaveRendererOptions = {
  columns: number;
  rows: number;
  tileSize: number;
  width: number;
  height: number;
};

export type WaveRenderer = {
  configure(atlas: HTMLCanvasElement, glyphs: Float32Array, options: WaveRendererOptions): void;
  draw(motion: Float32Array, opacity: number): void;
  clear(): void;
  dispose(): void;
};

const VERTEX = `
  attribute vec2 a_glyph;
  attribute vec4 a_motion;
  uniform vec2 u_viewport;
  uniform float u_pointSize;
  varying mediump vec2 v_glyph;
  varying mediump float v_alpha;
  varying mediump float v_foam;

  void main() {
    vec2 position = a_motion.xy / u_viewport;
    gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0);
    gl_PointSize = u_pointSize;
    v_glyph = a_glyph;
    v_alpha = a_motion.z;
    v_foam = a_motion.w;
  }
`;

const FRAGMENT = `
  precision mediump float;
  uniform sampler2D u_atlas;
  uniform vec2 u_grid;
  uniform float u_opacity;
  varying mediump vec2 v_glyph;
  varying mediump float v_alpha;
  varying mediump float v_foam;

  void main() {
    vec2 uv = (v_glyph + gl_PointCoord) / u_grid;
    vec4 glyph = texture2D(u_atlas, uv);
    float alpha = glyph.a * v_alpha * u_opacity;
    if (alpha < 0.003) discard;
    vec3 ink = mix(glyph.rgb, vec3(0.66, 0.74, 0.78), clamp(v_foam, 0.0, 1.0) * 0.82);
    gl_FragColor = vec4(ink, alpha);
  }
`;

/** A single point-sprite batch keeps a detailed wave independent of Canvas draw-call cost. */
export function createWaveRenderer(canvas: HTMLCanvasElement): WaveRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
  });
  if (!gl) return null;

  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let glyphBuffer: WebGLBuffer | null = null;
  let motionBuffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  const release = () => {
    if (glyphBuffer) gl.deleteBuffer(glyphBuffer);
    if (motionBuffer) gl.deleteBuffer(motionBuffer);
    if (texture) gl.deleteTexture(texture);
    if (program) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
  };
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to create wave shader");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Unable to compile wave shader");
    return shader;
  };

  try {
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram();
    if (!program) throw new Error("Unable to create wave program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Unable to link wave program");
    glyphBuffer = gl.createBuffer();
    motionBuffer = gl.createBuffer();
    texture = gl.createTexture();
    if (!glyphBuffer || !motionBuffer || !texture) throw new Error("Unable to create wave buffers");
  } catch {
    release();
    return null;
  }

  const glyphLocation = gl.getAttribLocation(program, "a_glyph");
  const motionLocation = gl.getAttribLocation(program, "a_motion");
  const viewportLocation = gl.getUniformLocation(program, "u_viewport");
  const pointSizeLocation = gl.getUniformLocation(program, "u_pointSize");
  const gridLocation = gl.getUniformLocation(program, "u_grid");
  const opacityLocation = gl.getUniformLocation(program, "u_opacity");
  const atlasLocation = gl.getUniformLocation(program, "u_atlas");
  let count = 0, capacity = 0, disposed = false;

  gl.useProgram(program);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  // The framebuffer is premultiplied for browser compositing; atlas RGB is straight.
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.uniform1i(atlasLocation, 0);

  const clear = () => {
    if (!disposed) gl.clear(gl.COLOR_BUFFER_BIT);
  };

  return {
    configure(atlas, glyphs, options) {
      if (disposed) return;
      count = Math.floor(glyphs.length / 2);
      capacity = count * 4;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform2f(viewportLocation, Math.max(1, options.width), Math.max(1, options.height));
      gl.uniform2f(gridLocation, options.columns, options.rows);
      gl.uniform1f(pointSizeLocation, options.tileSize);

      gl.bindBuffer(gl.ARRAY_BUFFER, glyphBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, glyphs, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(glyphLocation);
      gl.vertexAttribPointer(glyphLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, motionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, capacity * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(motionLocation);
      gl.vertexAttribPointer(motionLocation, 4, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Point coordinates already increase downward, matching the canvas atlas rows.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      clear();
    },
    draw(motion, opacity) {
      if (disposed) return;
      clear();
      if (!count || motion.length < capacity || opacity <= 0) return;
      gl.useProgram(program);
      gl.uniform1f(opacityLocation, Math.max(0, Math.min(1, opacity)));
      gl.bindBuffer(gl.ARRAY_BUFFER, motionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, motion.length === capacity ? motion : motion.subarray(0, capacity));
      gl.drawArrays(gl.POINTS, 0, count);
    },
    clear,
    dispose() {
      if (disposed) return;
      clear();
      disposed = true;
      release();
    },
  };
}
