/*
 * AXIEL style frames · shared core.
 * Palette = protocol §2.1 tokens only. Easing/camera values come from §4–§5.
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
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ATLAS OS §3
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function makeCamera(fov, pos, look, roll = 0) {
  const c = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 1500);
  c.position.set(...pos);
  c.lookAt(...look);
  if (roll) c.rotateZ(roll);
  return c;
}

/* ---------- GLSL chunks ---------- */
export const NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float segD(vec2 p, vec2 a, vec2 b, out float t){ vec2 pa = p - a, ba = b - a; t = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * t); }
`;

const INST_V = /* glsl */`
  vec4 p = vec4(position, 1.0);
  vec3 nn = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    nn = mat3(instanceMatrix) * nn;
  #endif
`;

/* ---------- additive glow (instancing + vertex/instance colour aware) ---------- */
export function glowMat(color, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: color }, uFogD: { value: o.fogD ?? 0 }, uDim: o.dim ?? { value: 1 }, uHead: { value: o.head ?? 0 } },
    vertexShader: /* glsl */`
      varying float vD; varying vec3 vC; varying float vY;
      void main() {
        ${INST_V}
        vC = vec3(1.0);
        #ifdef USE_COLOR
          vC *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC *= instanceColor;
        #endif
        vY = position.y + 0.5;
        vec4 w = modelMatrix * p;
        vD = length(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uC; uniform float uFogD; uniform float uDim; uniform float uHead;
      varying float vD; varying vec3 vC; varying float vY;
      void main() {
        float g = 1.0, y = clamp(vY, 0.0, 1.0);        // clamp: pow() of a negative is NaN, and bloom spreads NaN
        if (uHead > 0.5) g = pow(y, 2.2);             // streak, bright at top
        else if (uHead < -0.5) g = pow(1.0 - y, 2.2); // streak, bright at bottom
        float fog = exp(-uFogD * uFogD * vD * vD);
        gl_FragColor = vec4(uC * vC * g * fog * uDim, 1.0);
      }`,
    vertexColors: !!o.vertexColors,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: o.side ?? THREE.FrontSide,
  });
}

/* ---------- fresnel crystal / glass ---------- */
export function crystalMat(rim, core, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uRim: { value: rim }, uCore: { value: core }, uI: { value: o.i ?? 1 }, uFogD: { value: o.fogD ?? 0 }, uDim: o.dim ?? { value: 1 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main() {
        ${INST_V}
        vec4 w = modelMatrix * p;
        vN = normalize(mat3(modelMatrix) * nn);
        vec3 tc = cameraPosition - w.xyz; vD = length(tc); vV = tc / vD;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uRim; uniform vec3 uCore; uniform float uI; uniform float uFogD; uniform float uDim;
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), vV)), 2.4);
        vec3 c = uCore * 0.06 + uRim * f;
        gl_FragColor = vec4(c * uI * uDim * exp(-uFogD * uFogD * vD * vD), 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

/* ---------- sky dome ---------- */
export function sky(top, horizon, below, band = 0.08) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uT: { value: top }, uH: { value: horizon }, uB: { value: below }, uBand: { value: band } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uT; uniform vec3 uH; uniform vec3 uB; uniform float uBand; varying vec3 vD;
      void main(){
        float y = vD.y;
        vec3 c = y > 0.0 ? mix(uH, uT, smoothstep(0.0, uBand * 4.0, y)) : mix(uH, uB, smoothstep(0.0, uBand, -y));
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  }));
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

/* ---------- ATLAS ground: grid, lantern pool, light circuit ---------- */
export function groundMat(o) {
  const z3 = () => [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
  return new THREE.ShaderMaterial({
    uniforms: {
      uAlb: { value: o.albedo ?? new THREE.Color(0, 0, 0) }, uAmb: { value: o.ambient ?? new THREE.Color(0, 0, 0) },
      uBase: { value: o.base ?? col('ink') }, uLine: { value: o.line ?? col('gold') }, uNode: { value: o.node ?? col('hot') },
      uMinor: { value: o.minor ?? 1 }, uMajor: { value: o.major ?? 5 },
      uIMi: { value: o.iMinor ?? 0.1 }, uIMa: { value: o.iMajor ?? 0.4 }, uINode: { value: o.iNode ?? 0.6 }, uPulse: { value: o.pulse ?? 0 },
      uMiFade: { value: o.minorFade ?? 60 },
      uFogC: { value: o.fogCol ?? col('ink') }, uFogD: { value: o.fogD ?? 0.01 }, uTime: { value: o.time ?? 0 },
      uLPos: { value: o.lanternPos ?? new THREE.Vector3(0, -999, 0) }, uLCol: { value: o.lanternCol ?? new THREE.Color(0, 0, 0) }, uLRange: { value: o.lanternRange ?? 14 },
      uTri: { value: o.tri ?? z3() }, uTriC: { value: o.triCol ?? [new THREE.Color(), new THREE.Color(), new THREE.Color()] },
      uTriOn: { value: o.tri ? 1 : 0 }, uTriProg: { value: o.triProg ?? 3 },
      uA: { value: o.alpha ?? 1 }, uDim: o.dim ?? { value: 1 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uAlb, uAmb, uBase, uLine, uNode, uFogC, uLPos, uLCol;
      uniform float uMinor, uMajor, uIMi, uIMa, uINode, uPulse, uMiFade, uFogD, uTime, uLRange, uTriOn, uTriProg, uA, uDim;
      uniform vec2 uTri[3]; uniform vec3 uTriC[3];
      varying vec3 vW;
      ${NOISE}
      float gl1(float q, float w){ return 1.0 - min(abs(fract(q - 0.5) - 0.5) / w, 1.0); }
      void main(){
        float dist = length(cameraPosition - vW);
        vec2 q1 = vW.xz / uMinor; vec2 w1 = fwidth(q1);
        float mi = max(gl1(q1.x, w1.x), gl1(q1.y, w1.y)) * (1.0 - smoothstep(uMiFade * 0.35, uMiFade, dist));
        vec2 q2 = vW.xz / uMajor; vec2 w2 = fwidth(q2) * 1.3;
        float lx = gl1(q2.x, w2.x), lz = gl1(q2.y, w2.y);
        float ma = max(lx, lz);
        vec2 fq = (fract(q2 - 0.5) - 0.5) * uMajor;
        float node = exp(-dot(fq, fq) * 5.0);
        float kx = floor(q2.x + 0.5), kz = floor(q2.y + 0.5);
        float hx = hash11(kx * 1.37 + 0.1), hz = hash11(kz * 2.11 + 0.7);
        float px = pow(fract(vW.z / 57.0 + hx * 7.0 - uTime * (0.05 + 0.05 * hx)), 26.0) * step(0.55, hx) * lx;
        float pz = pow(fract(vW.x / 63.0 + hz * 5.0 + uTime * (0.04 + 0.05 * hz)), 26.0) * step(0.7, hz) * lz;
        vec3 c = uBase + uAlb * uAmb + uLine * (mi * uIMi + ma * uIMa) + uNode * (node * uINode * ma + (px + pz) * uPulse);
        vec3 L = uLPos - vW; float d = length(L);
        float att = pow(clamp(1.0 - pow(d / uLRange, 4.0), 0.0, 1.0), 2.0) / max(d * d, 0.25);
        c += uAlb * uLCol * att * max(L.y / max(d, 1e-3), 0.0);
        c += uLine * uLCol * att * ma * 0.25;
        if (uTriOn > 0.5) {
          for (int i = 0; i < 3; i++) {
            float t; float dd = segD(vW.xz, uTri[i], uTri[(i + 1) % 3], t);
            float along = float(i) + t;
            float shown = step(along, uTriProg);
            float head = exp(-abs(uTriProg - along) * 18.0) * shown;
            vec3 cc = mix(uTriC[i], uTriC[(i + 1) % 3], t);
            c += cc * shown * (smoothstep(0.7, 0.18, dd) * 2.6 + exp(-dd * 0.45) * 0.28) + cc * head * exp(-dd * 0.6) * 2.5;
          }
        }
        float fog = exp(-uFogD * uFogD * dist * dist);
        c = mix(uFogC, c, fog) * uDim;
        gl_FragColor = vec4(c * uA, uA);
      }`,
    transparent: (o.alpha ?? 1) < 1, depthWrite: (o.alpha ?? 1) >= 1,
    blending: (o.alpha ?? 1) < 1 ? THREE.CustomBlending : THREE.NormalBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

/* ---------- buildings: concrete, windows, lantern light, fault flicker, repaired gold, circuit glow ---------- */
export function buildingMat(o) {
  const z3 = () => [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
  const black = () => new THREE.Color(0, 0, 0);
  return new THREE.ShaderMaterial({
    uniforms: {
      uAlb: { value: o.albedo }, uAmb: { value: o.ambient ?? black() }, uTop: { value: o.top ?? black() }, uRim: { value: o.rim ?? black() },
      uLPos: { value: o.lanternPos ?? new THREE.Vector3(0, -999, 0) }, uLCol: { value: o.lanternCol ?? black() }, uLRange: { value: o.lanternRange ?? 14 },
      uBDir: { value: o.beamDir ?? new THREE.Vector3(0, 1, 0) }, uBCos: { value: o.beamCos ?? 2 }, uBGain: { value: o.beamGain ?? 0 },
      uWarm: { value: o.winWarm ?? col('lantern', 2) }, uCold: { value: o.winCold ?? col('bone', 0.2) },
      uFaultC: { value: o.winFault ?? col('bone', 0.9) }, uGoldC: { value: o.winGold ?? col('hot', 1.8) },
      uLitBase: { value: o.litBase ?? 0.08 }, uLitNear: { value: o.litNear ?? 0.7 }, uLitGain: { value: o.litGain ?? 3 },
      uFogC: { value: o.fogCol ?? col('ink') }, uFogD: { value: o.fogD ?? 0.01 }, uTime: { value: o.time ?? 0 }, uDim: o.dim ?? { value: 1 },
      uTri: { value: o.tri ?? z3() }, uTriC: { value: o.triCol ?? [black(), black(), black()] }, uTriOn: { value: o.tri ? 1 : 0 },
    },
    vertexShader: /* glsl */`
      attribute float aSeed; attribute float aFault; attribute float aGold;
      varying vec3 vW; varying vec3 vN; varying float vH; varying float vSeed; varying float vFault; varying float vGold;
      void main(){
        ${INST_V}
        vH = p.y;
        vec4 w = modelMatrix * p;
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * nn);
        vSeed = aSeed; vFault = aFault; vGold = aGold;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uAlb, uAmb, uTop, uRim, uLPos, uLCol, uBDir, uWarm, uCold, uFaultC, uGoldC, uFogC;
      uniform float uLRange, uBCos, uBGain, uLitBase, uLitNear, uLitGain, uFogD, uTime, uDim, uTriOn;
      uniform vec2 uTri[3]; uniform vec3 uTriC[3];
      varying vec3 vW; varying vec3 vN; varying float vH; varying float vSeed; varying float vFault; varying float vGold;
      ${NOISE}
      void main(){
        vec3 n = normalize(vN);
        float wall = 1.0 - step(0.5, abs(n.y));
        vec3 P = vec3(vW.x, vH, vW.z);
        vec3 alb = uAlb * (0.72 + 0.56 * fbm(P.xz * 0.6 + P.y * 0.35 + vSeed * 17.0));
        vec3 L = uLPos - vW; float d = length(L); vec3 l = L / max(d, 1e-3);
        float att = pow(clamp(1.0 - pow(d / uLRange, 4.0), 0.0, 1.0), 2.0) / max(d * d, 0.25);
        float cone = smoothstep(uBCos, uBCos + 0.05, dot(-l, uBDir));
        float lan = att * (1.0 + cone * uBGain);
        vec3 c = alb * (uAmb + uLCol * lan * max(dot(n, l), 0.0) + uTop * max(n.y, 0.0));
        vec3 V = normalize(cameraPosition - vW);
        c += uRim * pow(1.0 - max(dot(n, V), 0.0), 3.0) * wall;
        vec2 fc = abs(n.x) > 0.5 ? vec2(P.z, P.y) : vec2(P.x, P.y);
        vec2 q = fc / vec2(1.25, 1.7);
        vec2 id = floor(q); vec2 f = fract(q);
        float win = wall * step(0.2, f.x) * step(f.x, 0.8) * step(0.22, f.y) * step(f.y, 0.72) * step(1.0, P.y);
        float face = abs(n.x) > 0.5 ? (n.x > 0.0 ? 1.0 : 2.0) : (n.z > 0.0 ? 3.0 : 4.0);
        float h = hash12(id * 1.37 + vec2(vSeed * 91.7, face * 13.1));
        float near = clamp(lan * uLitGain, 0.0, 1.0);
        float on = step(h, uLitBase + uLitNear * near);
        vec3 wc = mix(uCold, uWarm, near) * (0.55 + 0.9 * hash12(id + vec2(4.1, vSeed * 7.0)));
        if (vFault > 0.5) {
          float tq = floor(uTime * 9.0);
          float band = step(0.42, hash12(vec2(id.y * 0.7 + tq, vSeed + face)));
          on = step(h, 0.72) * band;
          wc = uFaultC * (0.18 + 1.2 * step(0.5, hash12(id + vec2(tq * 1.3, 2.0))));
        }
        if (vGold > 0.5) { on = step(h, 0.8); wc = uGoldC * (0.7 + 0.5 * hash12(id + 9.0)); }
        vec3 glass = alb * 0.22 + uRim * 0.5;
        c = mix(c, on > 0.5 ? wc : glass, win);
        if (uTriOn > 0.5) {
          for (int i = 0; i < 3; i++) {
            float t; float dd = segD(P.xz, uTri[i], uTri[(i + 1) % 3], t);
            c += mix(uTriC[i], uTriC[(i + 1) % 3], t) * exp(-dd * 0.32) * exp(-max(P.y, 0.0) * 0.22) * 0.55;
          }
        }
        float fog = exp(-uFogD * uFogD * dot(cameraPosition - vW, cameraPosition - vW));
        c = mix(uFogC, c, fog) * uDim;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

/* ---------- instanced city from a list of {x,z,w,d,h,ry,fault,gold} ---------- */
export function cityMesh(list, mat) {
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const n = list.length;
  const seed = new Float32Array(n), fault = new Float32Array(n), gold = new Float32Array(n);
  const m = new THREE.InstancedMesh(geo, mat, n);
  const o = new THREE.Object3D();
  list.forEach((b, i) => {
    o.position.set(b.x, b.y ?? 0, b.z);
    o.rotation.set(0, b.ry ?? 0, 0);
    o.scale.set(b.w, b.h, b.d);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    seed[i] = b.seed ?? ((i * 0.6180339) % 1);
    fault[i] = b.fault ? 1 : 0;
    gold[i] = b.gold ? 1 : 0;
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  geo.setAttribute('aFault', new THREE.InstancedBufferAttribute(fault, 1));
  geo.setAttribute('aGold', new THREE.InstancedBufferAttribute(gold, 1));
  m.frustumCulled = false;
  return m;
}

/* ---------- the INDEX street (shared by SF-04 and SF-06 so the city is the same city) ----------
 * Street runs along -z at x = -1.5, 6 wide. Fault / repaired building at (4, -32), per K9 and K14.
 */
export const FAULT = { x: 4, z: -32, w: 5, d: 5, h: 5.5 };
export function streetCity(seed = 41) {
  const r = rng(seed);
  const out = [];
  const crosses = [-10, -46, -72, -98];
  const inCross = (z0, z1) => crosses.some(c => z0 > c - 2.6 && z1 < c + 2.6);
  const nearFault = (x, z) => Math.hypot(x - FAULT.x, z - FAULT.z) < 16;
  for (const sign of [1, -1]) {
    let xEdge = sign > 0 ? 1.5 : -4.5;
    for (let row = 0; row < 3; row++) {
      const depth = row === 0 ? r.range(4, 6.5) : r.range(5, 9);
      let z = 8;
      while (z > -140) {
        const dz = r.range(3, 6.5);
        const z0 = z, z1 = z - dz;
        if (!inCross(z0, z1)) {
          const x = sign > 0 ? xEdge + depth / 2 : xEdge - depth / 2;
          const zc = (z0 + z1) / 2;
          let h = row === 0 ? r.range(5, 15) : row === 1 ? r.range(9, 24) : r.range(12, 30);
          if (nearFault(x, zc)) h = Math.min(h, row === 0 ? r.range(3.5, 8) : r.range(5, 9));
          out.push({ x, z: zc, w: depth * r.range(0.85, 1), d: dz, h, seed: r() });
        }
        z = z1 - r.range(0.35, 1.1);
      }
      xEdge += sign * (depth + r.range(0.6, 1.4));
    }
  }
  // clear a small plaza around the fault plot (PROPOSED: gives AMOS floor space for ripples), then place it exactly
  const M = 2.6;
  const fx0 = FAULT.x - FAULT.w / 2 - M, fx1 = FAULT.x + FAULT.w / 2 + M;
  const fz0 = FAULT.z - FAULT.d / 2 - M, fz1 = FAULT.z + FAULT.d / 2 + M;
  const kept = out.filter(b => b.x + b.w / 2 < fx0 || b.x - b.w / 2 > fx1 || b.z + b.d / 2 < fz0 || b.z - b.d / 2 > fz1);
  kept.push({ ...FAULT, seed: 0.37, fault: true, isFault: true });
  return kept;
}

/* ---------- radial glow sprite ---------- */
let _glowTex;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}
export function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size);
  return s;
}

/* ---------- the Lantern guide light (§3.1): 3-sided prism, < 200 tris ---------- */
export function lantern(o = {}) {
  const g = new THREE.Group();
  const h = 0.35, r = h * 0.62;
  const geo = new THREE.CylinderGeometry(r, r, h, 3, 1);
  g.add(new THREE.Mesh(geo, crystalMat(col('bone', 1.1), col('lantern', 1), { i: 1.2 })));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: col('hot', 3.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: col('lantern', 6) }));
  g.add(core);
  g.add(glowSprite(col('lantern', o.halo ?? 1.6), o.haloSize ?? 1.6));
  g.add(glowSprite(col('hot', 1.2), 0.35));
  return g;
}

/* ---------- open light cone (beam) ---------- */
export function beam(colr, len, halfAngleDeg, o = {}) {
  const rad = Math.tan(halfAngleDeg * Math.PI / 180) * len;
  const geo = new THREE.ConeGeometry(rad, len, 64, 1, true).translate(0, -len / 2, 0); // apex at origin, opens toward -y
  const mat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: colr }, uLen: { value: len }, uFogD: { value: o.fogD ?? 0 } },
    vertexShader: /* glsl */`
      varying float vT; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        vT = -position.y;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vec3 tc = cameraPosition - w.xyz; vD = length(tc); vV = tc / vD;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uC; uniform float uLen; uniform float uFogD;
      varying float vT; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        float t = clamp(vT / uLen, 0.0, 1.0);
        float face = pow(abs(dot(normalize(vN), vV)), 1.6);
        float a = face * pow(1.0 - t, 1.6) * smoothstep(0.0, 0.08, t);
        gl_FragColor = vec4(uC * a * exp(-uFogD * uFogD * vD * vD), 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}
export function pointAlong(mesh, from, to) {
  mesh.position.copy(from);
  const dir = to.clone().sub(from).normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
}

/* ---------- 2D overlay helpers (production renders these as DOM text, §10.2) ---------- */
export function setFont(ctx, weight, px, family = 'Montserrat', trackingEm = 0.08) {
  ctx.font = `${weight} ${px}px ${family === 'mono' ? '"JetBrains Mono", monospace' : 'Montserrat, sans-serif'}`;
  ctx.letterSpacing = `${(px * trackingEm).toFixed(2)}px`;
}
// letterSpacing adds trailing space after the last glyph; compensate when centring
export function textC(ctx, str, x, y, px, trackingEm = 0.08) {
  ctx.textAlign = 'center';
  ctx.fillText(str, x + (px * trackingEm) / 2, y);
}
/* Scene copy block: system name (uppercase, §2.2) + the approved one-line copy (§1.2) */
export function sceneCopy(ctx, W, H, { name, line, accent, color = HEX.bone }) {
  const s = H / 1440, x = Math.round(W * 0.06), y = Math.round(H * 0.835);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(11,11,12,0.55)';
  ctx.shadowBlur = 18 * s;
  ctx.fillStyle = accent;
  ctx.fillRect(x, y - 52 * s, 40 * s, Math.max(1, 1.5 * s));
  setFont(ctx, 300, 21 * s);
  ctx.fillText(name, x + 56 * s, y - 45 * s);
  ctx.fillStyle = color;
  setFont(ctx, 300, 46 * s);
  ctx.fillText(line, x, y + 20 * s);
  ctx.restore();
}

export function disposeScene(scene) {
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(m => {
        for (const k in m) { const v = m[k]; if (v && v.isTexture && v !== _glowTex) v.dispose(); }
        if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture && v !== _glowTex) v.dispose(); }
        m.dispose();
      });
    }
  });
}
