// §3.2 AMOS rain: 8k drops on High, 2k on Mid, 12° slant toward the +z façades. Each drop's path is precomputed
// here (start at the cloud base, first surface it meets along the slant); shaders/rain.glsl moves it on the GPU.
// dropAt() mirrors the falling phase on the CPU so the freeze labels can hang on real drops.
import * as THREE from 'three';
import { rng, col, mixc } from '../../shared/js/core.js';
import { plots, FB } from '../../shared/js/kit/city.js';
import { SLANT } from '../../shared/js/frames/sf06.js';
import src from '../../shaders/rain.glsl';
import { MASK, integrityMask, maskUV } from './integrity';

export const TOP = 26;            // cloud base: above every street roof near the camera (PROPOSED)
export const POST = 0.8;          // s a drop lives after impact (bead + roll, soak, or splash)
// The drops move in −z so they meet the façades that face the camera (+z), as §3.2 has it. SF-06 drew its frozen
// streaks leaning the other way (toward the camera); the slant angle is the frame's, the direction is §3.2 (proposals.md).
export const DIR = new THREE.Vector3(0, -Math.cos(SLANT), -Math.sin(SLANT));

type Box = { x0: number; x1: number; y1: number; z0: number; z1: number };
type Hit = { t: number; kind: number; p: THREE.Vector3 };

function boxes(tier: string): Box[] {
  const out: Box[] = plots()
    .filter((p: any) => !(tier === 'mid' && p.far))
    .map((p: any) => ({ x0: p.x0, x1: p.x1, y1: p.h, z0: p.z0, z1: p.z1 }));
  out.push({ x0: FB.x0, x1: FB.x1, y1: FB.h, z0: FB.z, z1: FB.zb });
  return out;
}

// first surface along o + DIR t: a roof (top face), a façade facing +z (near face), or the ground. null = starts inside a building.
function trace(o: THREE.Vector3, B: Box[]): Hit | null {
  const d = DIR;
  let best: Hit = { t: o.y / -d.y, kind: 0, p: new THREE.Vector3() };
  for (const b of B) {
    if (o.x < b.x0 || o.x > b.x1) continue;               // the slant has no x component
    const ty0 = (b.y1 - o.y) / d.y, ty1 = (0 - o.y) / d.y;
    const tz0 = (b.z0 - o.z) / d.z, tz1 = (b.z1 - o.z) / d.z;
    const tIn = Math.max(ty0, tz0), tOut = Math.min(ty1, tz1);
    if (tIn >= tOut || tOut <= 0) continue;
    if (tIn <= 0) return null;
    if (tIn < best.t) best = { t: tIn, kind: ty0 > tz0 ? 0 : 2, p: new THREE.Vector3() };
  }
  best.p.copy(o).addScaledVector(d, best.t);
  if (best.kind === 2 && Math.abs(best.p.z - MASK.z) < 0.01 && best.p.x >= MASK.x0 && best.p.x <= MASK.x1) best.kind = 1;
  return best;
}

export type Rain = ReturnType<typeof makeRain>;

export function makeRain(n: number, tier: string, seed = 63) {
  const r = rng(seed), B = boxes(tier);
  const start = new Float32Array(n * 3), hit = new Float32Array(n * 3), drop = new Float32Array(n * 4), kind = new Float32Array(n * 4);
  const tfall = new Float32Array(n);
  const P = new THREE.Vector3(), S = new THREE.Vector3();
  const counts = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    let h: Hit | null = null;
    for (let k = 0; k < 20 && !h; k++) {
      const m = r();
      if (m < 0.25) P.set(r.range(-19, 9), r.range(0.3, 21), MASK.z + 0.05);           // aimed at the end façades
      else if (m < 0.65) P.set(r.range(-22, 18), r.range(0, TOP), r.range(-38.9, -10));  // the street
      else P.set(r.range(-40, 44), r.range(0, TOP), r.range(-70, -6));                  // the plateau
      S.copy(P).addScaledVector(DIR, -(TOP - P.y) / -DIR.y);
      h = trace(S, B);
    }
    if (!h) { h = { t: S.y / -DIR.y, kind: 0, p: S.clone().addScaledVector(DIR, S.y / -DIR.y) }; }
    const speed = r.range(8, 11), tf = h.t / speed, cyc = tf + POST + r.range(0, 0.6);
    start.set([S.x, S.y, S.z], i * 3);
    hit.set([h.p.x, h.p.y, h.p.z], i * 3);
    drop.set([speed, r() * cyc, cyc, r.range(0.018, 0.04)], i * 4);
    const [u, v] = maskUV(h.p.x, h.p.y);
    kind.set([h.kind, u, v, r()], i * 4);
    tfall[i] = tf;
    counts[h.kind]++;
  }

  const base = new THREE.IcosahedronGeometry(1, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('normal', base.getAttribute('position').clone());   // unit sphere: smooth drop normals
  geo.setAttribute('aStart', new THREE.InstancedBufferAttribute(start, 3));
  geo.setAttribute('aHit', new THREE.InstancedBufferAttribute(hit, 3));
  geo.setAttribute('aDrop', new THREE.InstancedBufferAttribute(drop, 4));
  geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 4));
  geo.instanceCount = n;

  const mask = integrityMask();
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: { value: 0 }, uIntensity: { value: 0 }, uReg: { value: 0 }, uPost: { value: POST },
    uHi: { value: [-1, -1, -1, -1, -1] },
    uDir: { value: DIR.clone() }, uMask: { value: mask },
    uRain: { value: col('rain') }, uRed: { value: col('red') },
    uSky: { value: mixc('night', 'rain', 0.55) }, uLow: { value: col('ink') },
    uKeyV: { value: new THREE.Vector3(0, 1, 0) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: '#define VERTEX\n' + src, fragmentShader: '#define FRAGMENT\n' + src,
    transparent: true, depthWrite: false, fog: true,
  });
  const rainMesh = new THREE.Mesh(geo, mat);   // instanced through geo.instanceCount (one draw call)
  rainMesh.frustumCulled = false;
  rainMesh.renderOrder = 2;

  // key light direction (SF-06 keyLight pos → target), toward the light, for the drop highlight
  const KEY = new THREE.Vector3(-2, 44, -22).sub(new THREE.Vector3(4, 8, -39)).normalize();

  const out = new THREE.Vector3();
  /* falling position of drop i at shader time t, or null if it is not falling (or not raining) there */
  function dropAt(i: number, t: number, intensity = uniforms.uIntensity.value, v = out): THREE.Vector3 | null {
    if (kind[i * 4 + 3] > intensity) return null;
    const cyc = drop[i * 4 + 2], tt = (((t + drop[i * 4 + 1]) % cyc) + cyc) % cyc;
    if (tt >= tfall[i] - 0.05) return null;
    return v.set(start[i * 3], start[i * 3 + 1], start[i * 3 + 2]).addScaledVector(DIR, drop[i * 4] * tt);
  }

  return {
    mesh: rainMesh, uniforms, n, counts, dropAt,
    update(o: { intensity: number; reg: number; dt: number; frozen: boolean; camera: THREE.Camera }) {
      uniforms.uIntensity.value = o.intensity;
      uniforms.uReg.value = o.reg;
      if (!o.frozen) uniforms.uTime.value += o.dt;
      uniforms.uKeyV.value.copy(KEY).transformDirection(o.camera.matrixWorldInverse);
      rainMesh.visible = o.intensity > 0;
    },
    setHi(ids: number[]) { for (let k = 0; k < 5; k++) uniforms.uHi.value[k] = ids[k] ?? -1; },
    dispose() { geo.dispose(); base.dispose(); mat.dispose(); mask.dispose(); },
  };
}
