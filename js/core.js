/*
 * AXIEL style frames · shared core (protocol v1.4).
 * Palette = §2.1 tokens only. Look = §2.0 curated specimen photography:
 * one raking key light, deep falloff, real material response.
 * Nothing here draws grids, glows, particles or HUDs (§0.1).
 */
import * as THREE from 'three';
export { THREE };

/* ---------- tokens (§2.1) ---------- */
export const HEX = {
  ink: '#0B0B0C', graphite: '#1D1D1F', stone: '#6A675F', bone: '#D6D2C8', paper: '#F2EFE9',
  gold: '#C9A35B', hot: '#F0C878', lantern: '#E8A54B', night: '#0E1520', rain: '#8FA6B8',
  red: '#C2412D', pass: '#9FC2A0',
};
export const TOKEN = {
  ink: '--ink', graphite: '--graphite', stone: '--stone', bone: '--bone', paper: '--paper',
  gold: '--atlas-gold', hot: '--atlas-gold-hot', lantern: '--lantern', night: '--night', rain: '--rain',
  red: '--signal-red', pass: '--signal-pass',
};
export const col = (k, s = 1) => new THREE.Color(HEX[k]).multiplyScalar(s);
export const mixc = (a, b, t, s = 1) => col(a).lerp(col(b), t).multiplyScalar(s);

/* ---------- seeded random ---------- */
export function rng(seed) {
  let s = seed | 0;
  const r = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  return r;
}
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* Camera from a §4.3 key. Aspect is set by the app per viewport (desktop / phone). */
export function makeCamera(fov, pos, look, roll = 0) {
  const c = new THREE.PerspectiveCamera(fov, 16 / 9, 0.05, 1500);
  c.position.set(...pos);
  c.lookAt(...look);
  if (roll) c.rotateZ(roll);
  c.userData.key = { fov, pos, look, roll };
  return c;
}

/* ---------- GLSL chunks ---------- */
export const NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float fbm3(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float tri3(vec3 p, vec3 n, float sc){ vec3 w = pow(abs(n), vec3(4.)); w /= (w.x + w.y + w.z);
  return fbm(p.yz * sc) * w.x + fbm(p.xz * sc + 3.1) * w.y + fbm(p.xy * sc + 7.7) * w.z; }
vec3 perturbH(vec3 sp, vec3 sn, float h, float s){
  vec3 dx = dFdx(sp), dy = dFdy(sp); vec3 r1 = cross(dy, sn), r2 = cross(sn, dx);
  float det = dot(dx, r1); vec3 g = sign(det) * (dFdx(h) * s * r1 + dFdy(h) * s * r2);
  return normalize(abs(det) * sn - g); }
`;

/*
 * Physical material with world-space procedural detail.
 *   o.scale  : noise frequency (per world unit)
 *   o.vary   : albedo variation amplitude
 *   o.bump   : height → normal strength
 *   o.height : GLSL expression for h (default triplanar fbm); may call functions from o.pars
 *   o.albedo : GLSL that may edit `diffuseColor.rgb` (has wp, wn, h, and the varyings)
 *   o.rough  : GLSL that may edit `roughnessFactor` / `metalnessFactor`
 *   o.emis   : GLSL that may add to `totalEmissiveRadiance`; anything that should bloom
 *              (gold-hot / lantern only, §2.0) is ALSO added to `bloomE`
 *   o.bloomPart : true when o.emis writes bloomE
 *   o.varyings / o.vertex : extra varyings and vertex GLSL (has `position`, `objectNormal`, `mm` = model × instance matrix)
 *   o.pars   : extra GLSL (uniform decls, functions, globals)
 *   o.uniforms : extra uniforms
 *   o.thin   : thin-sheet translucency (0..1): a sheet lit from behind glows through on the side you see.
 *              Unshadowed (the sheet would shadow itself), so keep it to small held paper: the map, the dart.
 */
const thinSheet = (k) => {
  const one = (kind, arr) => `
    #if NUM_${kind}_LIGHTS > 0
      for (int i = 0; i < NUM_${kind}_LIGHTS; i++) { IncidentLight tl;
        get${kind === 'DIR' ? 'Directional' : kind === 'SPOT' ? 'Spot' : 'Point'}LightInfo(${arr}[i], ${kind === 'DIR' ? '' : 'geometryPosition, '}tl);
        reflectedLight.directDiffuse += ${k.toFixed(3)} * saturate(-dot(geometryNormal, tl.direction)) * tl.color * BRDF_Lambert(material.diffuseColor); }
    #endif`;
  return one('SPOT', 'spotLights') + one('POINT', 'pointLights') + one('DIR', 'directionalLights');
};
/* Shared switch for the selective-bloom source pass: materials flagged userData.bloomPart
   output only their bloom emissive (bloomE) while it is 1. */
export const BLOOM_ONLY = { value: 0 };
let _detailId = 0;
export function detailMat(params, o = {}) {
  const Ctor = o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const m = new Ctor(params);
  const id = ++_detailId;
  const uniforms = o.uniforms ?? {};
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.uniforms.uBloomOnly = BLOOM_ONLY;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNrm; ${o.varyings ?? ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        mat4 mm = modelMatrix;
        #ifdef USE_INSTANCING
          mm = modelMatrix * instanceMatrix;
        #endif
        vec4 dwp = mm * vec4(transformed, 1.0); vWPos = dwp.xyz; vWNrm = normalize(mat3(mm) * objectNormal);
        ${o.vertex ?? ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNrm; ${o.varyings ?? ''}
        ${NOISE}
        uniform float uBloomOnly;
        float dH; vec3 bloomE;
        ${o.pars ?? ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        bloomE = vec3(0.0);
        { vec3 wp = vWPos; vec3 wn = normalize(vWNrm);
          dH = ${o.height ?? `tri3(wp, wn, ${(o.scale ?? 1).toFixed(3)})`};
          float h = dH;
          diffuseColor.rgb *= 1.0 + ${(o.vary ?? 0.12).toFixed(3)} * (h - 0.5) * 2.0;
          ${o.albedo ?? ''}
        }`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        { vec3 wp = vWPos; vec3 wn = normalize(vWNrm); float h = dH; ${o.rough ?? ''} }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = perturbH(-vViewPosition, normal, dH, ${(o.bump ?? 0.02).toFixed(4)});`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 wp = vWPos; vec3 wn = normalize(vWNrm); float h = dH; ${o.emis ?? ''} }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        ${o.thin ? thinSheet(o.thin) : ''}`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        if (uBloomOnly > 0.5) gl_FragColor = vec4(bloomE, 1.0);`);
  };
  m.customProgramCacheKey = () => 'detail' + id;
  if (o.bloomPart) m.userData.bloomPart = true;
  return m;
}

/* ---------- materials (§2.3) ---------- */
export const MAT = {
  stone: (k = 'stone', o = {}) => detailMat({ color: col(k), roughness: o.rough ?? 0.86, metalness: 0 },
    { scale: o.scale ?? 1.6, vary: o.vary ?? 0.16, bump: o.bump ?? 0.035, ...o }),
  paper: (o = {}) => detailMat({ color: col(o.k ?? 'paper'), roughness: 0.93, metalness: 0, side: o.side ?? THREE.DoubleSide },
    { scale: 9, vary: 0.025, bump: o.bump ?? 0.004, ...o }),
  brass: (o = {}) => detailMat({ color: col('gold'), roughness: o.rough ?? 0.34, metalness: 1, anisotropy: 0.7 },
    { physical: true, scale: o.scale ?? 6, vary: 0.08, bump: 0.002, height: 'fbm(vec2(wp.y * 140.0, (wp.x + wp.z) * 3.0))', ...o }),
  goldLeaf: (o = {}) => detailMat({ color: col(o.k ?? 'gold').lerp(col('hot'), 0.35), roughness: 0.22, metalness: 1 },
    { scale: 14, vary: 0.18, bump: 0.012, ...o }),
  wax: (o = {}) => detailMat({ color: col('red'), roughness: 0.32, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.4,
    sheen: 0.4, sheenColor: col('red'), sheenRoughness: 0.5 }, { physical: true, scale: 30, vary: 0.05, bump: 0.003, ...o }),
  // no transmission (it costs a full extra scene pass); thin glass = low opacity + true specular
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: col(o.k ?? 'bone'), roughness: o.rough ?? 0.05, metalness: 0,
    transparent: true, opacity: o.opacity ?? 0.16, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false }),
  matte: (k, rough = 0.9) => new THREE.MeshStandardMaterial({ color: col(k), roughness: rough, metalness: 0 }),
  /* emissive that blooms (§2.0: selective bloom on --atlas-gold-hot and --lantern only) */
  glowHot: (s = 3) => { const m = new THREE.MeshBasicMaterial({ color: col('hot', s) }); m.userData.bloom = true; return m; },
  glowLantern: (s = 3) => { const m = new THREE.MeshBasicMaterial({ color: col('lantern', s) }); m.userData.bloom = true; return m; },
};

/* Environment light from tokens only (gives brass and wet stone something true to reflect) */
export function tokenEnv(renderer, stops, o = {}) {
  const s = new THREE.Scene();
  const [top, mid, bot] = stops.map(k => (typeof k === 'string' ? col(k) : k));
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uT: { value: top }, uM: { value: mid }, uB: { value: bot }, uDir: { value: (o.keyDir ?? v3(0, 1, 0)).clone().normalize() }, uK: { value: o.keyCol ?? new THREE.Color(0, 0, 0) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uT, uM, uB, uDir, uK; varying vec3 vD;
      void main(){ float y = vD.y; vec3 c = y > 0. ? mix(uM, uT, smoothstep(0., .6, y)) : mix(uM, uB, smoothstep(0., .4, -y));
        c += uK * pow(max(dot(vD, uDir), 0.), 24.); gl_FragColor = vec4(c, 1.); }`,
    side: THREE.BackSide,
  })));
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return tex;
}

/* ---------- canvas helpers ---------- */
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function canvasTex(c, srgb = true, o = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
  return t;
}
export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('missing asset ' + src)); i.src = src; });
}
/* tint an image's alpha with a flat colour (keeps the raster's exact shapes; never vectorised) */
export function tinted(img, w, h, color) {
  const c = canvas(Math.ceil(w), Math.ceil(h));
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, w, h);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, w, h);
  return c;
}
/* paper fibres (shared by paper surfaces and the 2% grain overlay) */
export function fibreCanvas(size, seed, n, o = {}) {
  const c = canvas(size, size), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = o.bg ?? '#808080'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    const px = r() * size, py = r() * size, a = r() * TAU, len = (6 + r() * 40) * size / 1024, bend = (r() - 0.5) * 0.6;
    const x2 = px + Math.cos(a) * len, y2 = py + Math.sin(a) * len;
    const mx = (px + x2) / 2 + Math.cos(a + Math.PI / 2) * len * bend, my = (py + y2) / 2 + Math.sin(a + Math.PI / 2) * len * bend;
    x.globalAlpha = 0.08 + r() * 0.18;
    x.strokeStyle = r() < 0.55 ? '#ffffff' : '#000000';
    x.lineWidth = (0.6 + r() * 1.2) * size / 1024;
    // draw wrapped so the texture tiles
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      if (px + ox < -60 || px + ox > size + 60 || py + oy < -60 || py + oy > size + 60) continue;
      x.beginPath(); x.moveTo(px + ox, py + oy); x.quadraticCurveTo(mx + ox, my + oy, x2 + ox, y2 + oy); x.stroke();
    }
  }
  x.globalAlpha = 1;
  return c;
}

/* ---------- 2D overlay (production renders this as DOM text, §10.2) ---------- */
export function setFont(ctx, weight, px, family = 'Montserrat', trackingEm = 0.08) {
  ctx.font = `${weight} ${px}px ${family === 'mono' ? '"JetBrains Mono", monospace' : 'Montserrat, sans-serif'}`;
  ctx.letterSpacing = `${(px * trackingEm).toFixed(2)}px`;
}
// letterSpacing adds trailing space after the last glyph; compensate when centring
export function textC(ctx, str, x, y, px, trackingEm = 0.08) {
  ctx.textAlign = 'center';
  ctx.fillText(str, x + (px * trackingEm) / 2, y);
}
// "Beyond Immediate Reality" moves only as one unit (brand canon), so wrap never breaks inside it
export const UNIT = 'Beyond Immediate Reality';
export function wrap(ctx, str, maxW) {
  const NB = '\u00a0';   // the unit's spaces are bound while splitting, then restored
  const words = str.split(UNIT).join(UNIT.replaceAll(' ', NB)).split(' ').map(w => w.replaceAll(NB, ' ')), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
/*
 * vp = { W, H, u, phone } ; u = device px per CSS px (desktop 2560/1440, phone 2).
 * Scene copy: system name (uppercase mono-free Montserrat, §2.2) + the G1 line.
 */
export function sceneCopy(ctx, vp, { name, line, color = HEX.bone, accent = HEX.bone, shadow = true }) {
  const { W, H, u, phone } = vp;
  const x = phone ? 24 * u : 86 * u, maxW = phone ? W - 48 * u : 760 * u;
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (shadow) { ctx.shadowColor = 'rgba(11,11,12,0.6)'; ctx.shadowBlur = 14 * u; }
  setFont(ctx, 300, (phone ? 22 : 30) * u);
  const lines = wrap(ctx, line, maxW), lh = (phone ? 30 : 40) * u;
  let y = H - (phone ? 72 : 96) * u - (lines.length - 1) * lh;
  ctx.fillStyle = accent;
  setFont(ctx, 400, 12 * u);
  ctx.fillText(name, x, y - (phone ? 34 : 44) * u);
  ctx.fillStyle = color;
  setFont(ctx, 300, (phone ? 22 : 30) * u);
  for (const l of lines) { ctx.fillText(l, x, y); y += lh; }
  ctx.restore();
}
/* §6.2 scroll cue: mono scene counter at the left edge, "04 / 08 · INDEX" */
export function sceneCounter(ctx, vp, n, name, color = HEX.bone) {
  const { H, u, phone } = vp;
  ctx.save();
  ctx.fillStyle = color; ctx.globalAlpha = 0.78;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  setFont(ctx, 400, 11 * u, 'mono', 0.12);
  const s = `${String(n).padStart(2, '0')} / 08 · ${name}`;
  if (phone) ctx.fillText(s, 24 * u, 40 * u);
  else { ctx.translate(34 * u, H / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(s, 0, 0); }
  ctx.restore();
}

export function disposeScene(scene) {
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(m => {
        for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
        if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture) v.dispose(); }
        m.dispose();
      });
    }
    if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose();
    if (o.dispose && o.isReflector) o.dispose();
  });
  if (scene.environment) scene.environment.dispose();
}

/* Key light helper: one raking key with soft shadows (§2.0) */
export function keyLight(scene, o) {
  const L = o.spot
    ? new THREE.SpotLight(o.color ?? col('bone'), o.intensity ?? 50, o.distance ?? 0, o.angle ?? 0.5, o.penumbra ?? 0.8, o.decay ?? 2)
    : new THREE.DirectionalLight(o.color ?? col('bone'), o.intensity ?? 2);
  L.position.set(...o.pos);
  L.target.position.set(...(o.target ?? [0, 0, 0]));
  scene.add(L, L.target);
  if (o.shadow !== false) {
    L.castShadow = true;
    L.shadow.mapSize.set(o.map ?? 2048, o.map ?? 2048);
    L.shadow.bias = o.bias ?? -0.0004;
    L.shadow.normalBias = o.normalBias ?? 0.02;
    L.shadow.radius = o.radius ?? 4;
    if (!o.spot) {
      const c = L.shadow.camera, e = o.extent ?? 20;
      c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = 0.5; c.far = o.far ?? 200;
    } else { L.shadow.camera.near = 0.5; L.shadow.camera.far = o.far ?? 200; }
  }
  return L;
}
export function shadowAll(root, cast = true, receive = true) {
  root.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return root;
}
