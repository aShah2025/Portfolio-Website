type Frame = { x: number; y: number; width: number; height: number };
export type WaveRendererOptions = {
  width: number;
  height: number;
  ratio: number;
  cellWidth: number;
  cellHeight: number;
  tileSize: number;
  atlasColumns: number;
  atlasRows: number;
  imageFrame: Frame;
};
export type WaveDraw = { ascii: number; flow: number; drain: number; videoFrame: Frame };
export type WaveRenderer = {
  readonly glyphCount: number;
  configure(atlas: HTMLCanvasElement, lookup: Uint8Array, image: HTMLImageElement,
    video: HTMLVideoElement, options: WaveRendererOptions): void;
  uploadVideo(video: HTMLVideoElement): void;
  draw(params: WaveDraw): void;
  clear(): void;
  dispose(): void;
};

const VERTEX = `
  precision highp float;
  attribute vec2 a_cell;
  uniform vec2 u_viewport;
  uniform vec4 u_imageFrame;
  uniform vec4 u_videoFrame;
  uniform vec2 u_videoTexel;
  uniform float u_pointSize;
  uniform float u_rows;
  uniform float u_flow;
  uniform float u_reach;
  uniform float u_drain;
  uniform sampler2D u_image;
  uniform sampler2D u_video;
  uniform sampler2D u_lookup;
  varying mediump vec2 v_glyph;
  varying mediump float v_alpha;

  float luma(vec3 color) { return dot(color, vec3(0.30, 0.59, 0.11)); }
  float inside(vec2 uv) {
    return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  }
  void main() {
    vec2 imageUV = (a_cell - u_imageFrame.xy) / u_imageFrame.zw;
    vec3 printColor = texture2D(u_image, imageUV).rgb;
    float blue = clamp((printColor.b - printColor.r + 0.0470588) / 0.2156863, 0.0, 1.0);
    float printInk = pow(clamp((0.86 - luma(printColor)) / 0.7, 0.0, 1.0) * blue, 1.05);
    printInk *= inside(imageUV);
    float printTone = min(u_rows - 1.0, floor(printInk * u_rows));
    float strength = printInk;
    float tone = printTone;
    float inkAlpha = step(0.09, printInk);

    // A short front starting at the painted lip brings in real breaking-water detail.
    // Coordinates remain on the same fine grid throughout; the print is never bent.
    float distanceToLip = length((imageUV - vec2(0.52, 0.30)) * vec2(1.0, 0.75));
    float localFlow = smoothstep(0.0, 0.20, u_flow * (u_reach + 0.20) - distanceToLip);
    if (u_flow <= 0.0) localFlow = 0.0;
    if (u_flow >= 1.0) localFlow = 1.0;
    if (localFlow > 0.0) {
      vec2 videoUV = (a_cell - u_videoFrame.xy) / u_videoFrame.zw;
      float water = luma(texture2D(u_video, videoUV).rgb);
      vec2 horizontal = vec2(u_videoTexel.x * 2.0, 0.0);
      vec2 vertical = vec2(0.0, u_videoTexel.y * 2.0);
      float left = luma(texture2D(u_video, videoUV - horizontal).rgb);
      float right = luma(texture2D(u_video, videoUV + horizontal).rgb);
      float up = luma(texture2D(u_video, videoUV - vertical).rgb);
      float down = luma(texture2D(u_video, videoUV + vertical).rgb);
      float edge = (abs(left - right) + abs(up - down)) * 0.5;
      // Deep water is ink; aerated foam opens into paper with delicate edge marks.
      float waterInk = clamp(pow(clamp((0.64 - water) / 0.50, 0.0, 1.0), 1.5) * 0.9 + edge * 1.4, 0.0, 1.0);
      waterInk *= inside(videoUV);
      float waterTone = clamp(floor(waterInk * u_rows), 0.0, u_rows - 1.0);
      strength = mix(printInk, waterInk, localFlow);
      tone = floor(mix(printTone, waterTone, localFlow) + 0.5);
      inkAlpha = mix(inkAlpha, smoothstep(0.07, 0.30, waterInk), localFlow);
    }

    float column = floor(texture2D(u_lookup, vec2((floor(strength * 255.0) + 0.5) / 256.0, 0.5)).r * 255.0 + 0.5);
    vec2 position = a_cell;
    // Freeze the sampled letters, then let neighbouring parcels fall as water strands.
    float packet = 0.5 + 0.5 * sin(a_cell.x * 0.061 + sin(a_cell.y * 0.043));
    float release = 0.14 * (0.5 + 0.5 * sin(a_cell.x * 0.027 + sin(a_cell.x * 0.006)))
      + 0.12 * (1.0 - a_cell.y / u_viewport.y) + 0.06 * packet;
    float age = max(0.0, u_drain - release);
    position.y += u_viewport.y * ((1.3 + 0.6 * packet) * age * age + 0.15 * age);
    position.x += (sin(a_cell.x * 0.04 + a_cell.y * 0.03) + 0.4 * sin(a_cell.y * 0.025))
      * u_viewport.x * 0.035 * age;
    gl_Position = vec4(position.x / u_viewport.x * 2.0 - 1.0,
      1.0 - position.y / u_viewport.y * 2.0, 0.0, 1.0);
    gl_PointSize = u_pointSize;
    v_glyph = vec2(column, tone);
    v_alpha = inkAlpha * step(0.5, column);
  }
`;

const FRAGMENT = `
  precision mediump float;
  uniform sampler2D u_atlas;
  uniform vec2 u_grid;
  uniform float u_opacity;
  varying mediump vec2 v_glyph;
  varying mediump float v_alpha;
  void main() {
    vec4 glyph = texture2D(u_atlas, (v_glyph + gl_PointCoord) / u_grid);
    float alpha = glyph.a * v_alpha * u_opacity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(glyph.rgb, alpha);
  }
`;

/** Sample the real painting and water on the GPU, with one draw for the entire ASCII field. */
export function createWaveRenderer(canvas: HTMLCanvasElement): WaveRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true,
  });
  if (!gl || gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 3
    || gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) < 4) return null;

  const shaders: WebGLShader[] = [], textures: WebGLTexture[] = [];
  let program: WebGLProgram | null = null, cells: WebGLBuffer | null = null;
  const release = () => {
    if (cells) gl.deleteBuffer(cells);
    for (const texture of textures) gl.deleteTexture(texture);
    if (program) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
  };
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to create wave shader");
    shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Unable to compile wave shader");
    return shader;
  };
  try {
    const vertex = compile(gl.VERTEX_SHADER, VERTEX), fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram();
    if (!program) throw new Error("Unable to create wave program");
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Unable to link wave program");
    cells = gl.createBuffer();
    if (!cells) throw new Error("Unable to create wave cells");
    for (let i = 0; i < 4; i++) {
      const texture = gl.createTexture();
      if (!texture) throw new Error("Unable to create wave texture");
      textures.push(texture);
    }
  } catch { release(); return null; }

  const cellLocation = gl.getAttribLocation(program, "a_cell");
  const uniforms = Object.fromEntries(["viewport", "imageFrame", "videoFrame", "videoTexel", "pointSize", "rows",
    "flow", "reach", "drain", "image", "video", "lookup", "atlas", "grid", "opacity"]
    .map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
  let count = 0, disposed = false, videoWidth = 0, videoHeight = 0, lastVideoFrame = -1;
  gl.useProgram(program); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const bind = (unit: number, nearest = false) => {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  ["atlas", "lookup", "image", "video"].forEach((name, unit) => {
    gl.uniform1i(uniforms[name], unit); bind(unit, unit === 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  });
  const clear = () => { if (!disposed) gl.clear(gl.COLOR_BUFFER_BIT); };
  const uploadVideo = (video: HTMLVideoElement) => {
    if (disposed || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    const decoded = video.getVideoPlaybackQuality?.().totalVideoFrames;
    const frameNumber = decoded && decoded > 0 ? decoded : Math.floor(video.currentTime * 60);
    const sameSize = videoWidth === video.videoWidth && videoHeight === video.videoHeight;
    if (sameSize && frameNumber === lastVideoFrame) return;
    gl.useProgram(program); bind(3);
    if (sameSize) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    videoWidth = video.videoWidth; videoHeight = video.videoHeight; lastVideoFrame = frameNumber;
    gl.uniform2f(uniforms.videoTexel, 1 / videoWidth, 1 / videoHeight);
  };
  return {
    get glyphCount() { return count; },
    configure(atlas, lookup, image, video, options) {
      if (disposed) return;
      const cols = Math.ceil(options.width / options.cellWidth), rows = Math.ceil(options.height / options.cellHeight);
      count = cols * rows;
      const grid = new Float32Array(count * 2);
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const i = (row * cols + col) * 2;
        grid[i] = (col + .5) * options.cellWidth; grid[i + 1] = (row + .5) * options.cellHeight;
      }
      gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, cells); gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(cellLocation); gl.vertexAttribPointer(cellLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.viewport, Math.max(1, options.width), Math.max(1, options.height));
      gl.uniform2f(uniforms.grid, options.atlasColumns, options.atlasRows);
      gl.uniform1f(uniforms.rows, options.atlasRows); gl.uniform1f(uniforms.pointSize, options.tileSize);
      const frame = options.imageFrame;
      gl.uniform4f(uniforms.imageFrame, frame.x, frame.y, Math.max(1, frame.width), Math.max(1, frame.height));
      const distances = [[0, 0], [options.width, 0], [0, options.height], [options.width, options.height]]
        .map(([x, y]) => Math.hypot((x - frame.x) / frame.width - .52, ((y - frame.y) / frame.height - .30) * .75));
      gl.uniform1f(uniforms.reach, Math.max(...distances));
      bind(0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      bind(1, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lookup);
      bind(2); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      videoWidth = 0; videoHeight = 0; lastVideoFrame = -1;
      uploadVideo(video); clear();
    },
    uploadVideo,
    draw({ ascii, flow, drain, videoFrame }) {
      if (disposed) return;
      clear();
      if (!count || ascii <= 0) return;
      gl.useProgram(program);
      gl.uniform1f(uniforms.opacity, Math.max(0, Math.min(1, ascii)));
      gl.uniform1f(uniforms.flow, Math.max(0, Math.min(1, flow)));
      gl.uniform1f(uniforms.drain, Math.max(0, drain));
      gl.uniform4f(uniforms.videoFrame, videoFrame.x, videoFrame.y, Math.max(1, videoFrame.width), Math.max(1, videoFrame.height));
      gl.drawArrays(gl.POINTS, 0, count);
    },
    clear,
    dispose() { if (disposed) return; clear(); disposed = true; release(); },
  };
}
