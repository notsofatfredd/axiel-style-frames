/*
 * The paper dart (§3.2, R6): the Cartographer folds it from the map and throws it to the Core.
 * Three states: map (the flat sheet, printed with the city map, the fault inked in --signal-red)
 *            -> dart (folded) -> gold (--atlas-gold-hot; the red ink stays red).
 *
 * Code-native origami, like the figure: 4 rigid panels, 4 hinges. The sheet is a long isosceles triangle;
 * it folds in half along the spine (keel L/R hinges, about local z), then each wing folds back out along
 * its keel fold (wing L/R hinges, about the slanted fold lines). Local frame: nose +z, wings up (+y),
 * origin at the middle of the spine (where the hand pinches the keel). 4 triangles (budget 600).
 * Size 0.46 long, 0.26 wide flat, about 0.19 span folded: PROPOSED.
 *
 * makeDart({ state }) -> THREE.Group
 *   state: 'map' | 'dart' | 'gold', or a number 0..2 (0 map, 1 dart, 2 gold; in between = folding / gilding)
 *   group.userData.setState(s)  re-folds / re-gilds in place
 *   group.userData.tris         triangle count, group.userData.hinges = 4
 */
import { THREE, HEX, col, DEG, MAT, canvas, canvasTex } from '../core.js';
import { mapCanvas } from './cartographer.js';
import { EASE_CAMERA } from './ease.js';

// 0.46 long so it reads at figure scale in the hand (G3 review: at 0.34 it read as a stick). PROPOSED.
export const DART = { len: 0.46, half: 0.13, keel: 0.045, keelUp: 80, wingDown: 75 }; // folded: keel 80°, wings 5° dihedral (PROPOSED)
const STATES = { map: 0, dart: 1, gold: 2 };
const glv = (c) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/* the sheet's print: the stretch of the map around the fault building, cut from the same canvas the figure carries,
   the fault ring re-inked heavier so it holds at dart size, and the fold lines pressed in --stone */
let _tex = null;
function dartCanvas(src) {
  const map = src ?? mapCanvas();
  const W = 512, H = Math.round(W * DART.len / (2 * DART.half));
  const c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = HEX.paper; x.fillRect(0, 0, W, H);
  const [fx, fy] = map.px(4, -44), ring = 2 * 9 * map.sc;          // the fault ring on the map, in map pixels
  const cw = ring * 6.25, ch = cw * H / W;                          // ring about 0.16 of the sheet's width
  const sx = fx - 0.76 * cw, sy = fy - 0.78 * ch;                    // ring in the middle of the right wing (u 0.76, x < 0), near the tail
  x.drawImage(map, sx, sy, cw, ch, 0, 0, W, H);
  const k = W / cw;
  x.strokeStyle = HEX.red; x.lineWidth = 0.018 * W;
  x.beginPath(); x.ellipse((fx - sx) * k, (fy - sy) * k, 9 * map.sc * k, 7.5 * map.sc * k, -0.1, 0, Math.PI * 2); x.stroke();
  // fold lines: spine (u 0.5) and the two keel folds, nose at the top
  x.strokeStyle = HEX.stone; x.globalAlpha = 0.55; x.lineWidth = 0.006 * W;
  const ku = DART.keel / (2 * DART.half);
  for (const [u0, u1] of [[0.5, 0.5], [0.5, 0.5 + ku], [0.5, 0.5 - ku]]) { x.beginPath(); x.moveTo(u0 * W, 0); x.lineTo(u1 * W, H); x.stroke(); }
  x.globalAlpha = 1;
  return c;
}
function dartTexture(src) {
  if (!_tex) _tex = canvasTex(dartCanvas(src), true);
  return _tex;
}

/* one flat triangle, front face (+y in the flat sheet) printed, uv from its flat position */
function panel(a, b, c, origin) {
  const { half, len } = DART, zT = -len / 2;
  let P = [a, b, c];
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  if (n.y < 0) P = [a, c, b];
  const pos = [], uv = [];
  for (const p of P) { pos.push(p.x - origin.x, p.y - origin.y, p.z - origin.z); uv.push((half - p.x) / (2 * half), (p.z - zT) / len); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export function makeDart(o = {}) {
  const { len, half, keel } = DART, zN = len / 2, zT = -len / 2;
  const uGold = { value: 0 };
  // §3.1 / §3.2 material: --paper with --bone where a facet turns under; gilding lerps the paper to --atlas-gold-hot
  // and keeps the --signal-red ink. The back of the sheet is the map's blank --bone back.
  const mat = MAT.paper({
    k: 'paper', bump: 0.002, thin: 0.45,   // held paper glows through when the lantern is behind it (PROPOSED 0.45)
    uniforms: { uGold },
    pars: 'uniform float uGold; float dInk;',
    bloomPart: true,
    albedo: `
      vec3 base = diffuseColor.rgb;
      float ink = smoothstep(0.10, 0.28, base.r - base.g);
      if (!gl_FrontFacing) { base = ${glv(col('bone'))}; ink = 0.0; }
      dInk = ink;
      base = mix(base, ${glv(col('bone'))}, 0.08 + 0.4 * smoothstep(0.3, -0.7, wn.y));
      float lum = dot(base, vec3(0.3333));
      vec3 gold = ${glv(col('hot'))} * (0.5 + 0.55 * lum);
      diffuseColor.rgb = mix(base, mix(gold, ${glv(col('red'))}, ink), uGold);`,
    // gold-hot glows a little (and feeds the selective bloom where a frame has one, §2.0); the red ink does not.
    // 0.35 PROPOSED: reads hot without bloom in the preview
    emis: `vec3 ge = ${glv(col('hot'))} * 0.35 * uGold * (1.0 - dInk); totalEmissiveRadiance += ge; bloomE += ge;`,
  });
  mat.map = dartTexture(o.map);

  const g = new THREE.Group(); g.name = 'dart';
  const body = new THREE.Group(); g.add(body);
  const meshes = [];
  const add = (parent, geo) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); meshes.push(m); return m; };
  const N = new THREE.Vector3(0, 0, zN), T = new THREE.Vector3(0, 0, zT), O = new THREE.Vector3();
  const H = {};
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    const K = new THREE.Vector3(s * keel, 0, zT), Wt = new THREE.Vector3(s * half, 0, zT);
    const kg = new THREE.Group(); kg.name = 'keel' + k; body.add(kg);             // hinge: the spine (local z)
    add(kg, panel(N, T, K, O));
    const wg = new THREE.Group(); wg.name = 'wing' + k; wg.position.copy(N); kg.add(wg); // hinge: the keel fold N -> K
    add(wg, panel(N, K, Wt, N));
    H['keel' + k] = kg; H['wing' + k] = { g: wg, axis: K.clone().sub(N).normalize(), s };
  }

  let state = 0;
  function setState(v) {
    const s = typeof v === 'string' ? (STATES[v] ?? 0) : +v || 0;
    state = Math.min(2, Math.max(0, s));
    const f = Math.min(1, state), gold = clamp01(state - 1);
    // fold in half first, then the wings fold back out (the paper-dart sequence)
    const tk = DART.keelUp * EASE_CAMERA(clamp01(f / 0.55)) * DEG;
    const tw = DART.wingDown * EASE_CAMERA(clamp01((f - 0.45) / 0.55)) * DEG;
    for (const [s2, k] of [[1, 'L'], [-1, 'R']]) {
      H['keel' + k].rotation.z = s2 * tk;
      const w = H['wing' + k];
      w.g.quaternion.setFromAxisAngle(w.axis, w.s * tw);
    }
    uGold.value = gold;
    mat.metalness = 0.3 * gold;
    mat.roughness = 0.93 - 0.48 * gold;
    g.userData.state = state;
    return g;
  }
  let tris = 0;
  for (const m of meshes) tris += m.geometry.attributes.position.count / 3;
  Object.assign(g.userData, { setState, tris, hinges: 4, meshes, material: mat });
  setState(o.state ?? 'map');
  return g;
}
