/*
 * The Living Core (§3.3 [R6][F1]): the ATLAS Central Core from /atlas, re-specified in specimen materials.
 * Centre (10, 24, −92). 3 tiers + 3 orbit rings, max radius 6, height ≤ 14 (PROPOSED size).
 * Held on a stepped stone plinth rising from the clearing [G2-7, PROPOSED]. No crystal, no light beam.
 * Asleep: frost rime (--bone) on the tiers. Awake (SF-05): seams lit --atlas-gold-hot, tiers turned.
 * Fix kit (SF-05, PROPOSED): the dart's map unfolded above, gold-leaf filaments tracing its findings,
 * 24 fix fragments going from glass to gold, one stamp "SPECIMEN No. 001 · VERIFIED" (G1-P4) locking in.
 */
import { THREE, col, rng, TAU, DEG, MAT, detailMat, canvas, canvasTex, setFont } from '../core.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mapCanvas } from './cartographer.js';

export const CORE = { x: 10, y: 24, z: -92 };
const C = new THREE.Vector3(CORE.x, CORE.y, CORE.z);
// tier profile (relative to the Core centre): [y0, y1, radius]
const TIERS = [[-4.4, -1.4, 5.0], [-1.2, 1.4, 3.8], [1.6, 4.0, 2.4]];
const PLINTH_TOP = CORE.y - 4.6;

/* fluted tier material: vertical flutes make the turn readable; frost rime while asleep */
function tierMat(base, o) {
  const U = { uC: { value: C.clone() }, uFrost: { value: o.frost ?? 0 }, uRime: { value: col('bone') }, uN: { value: o.flutes ?? 48 } };
  return detailMat(base, {
    physical: !!o.physical, uniforms: U,
    pars: 'uniform vec3 uC, uRime; uniform float uFrost, uN; float fF;',
    height: `(fF = smoothstep(0.55, 0.75, fbm(wp.xz * 3.1 + wp.y * 1.7)) * uFrost,
      0.5 + 0.35 * smoothstep(0.1, 0.25, abs(fract(atan(wp.z - uC.z, wp.x - uC.x) * uN / 6.2831853) - 0.5)) + 0.25 * fF)`,
    vary: 0.06, bump: o.bump ?? 0.012,
    albedo: 'diffuseColor.rgb = mix(diffuseColor.rgb, uRime, fF * 0.85);',
    rough: 'roughnessFactor = mix(roughnessFactor, 0.85, fF); metalnessFactor = mix(metalnessFactor, 0.0, fF);',
  });
}

export function makeCore(o = {}) {
  const awake = o.state !== 'asleep';
  const frost = awake ? 0 : 1;
  const g = new THREE.Group();
  const stone = (k, s) => detailMat({ color: col(k, s), roughness: 0.88 }, { scale: 1.3, vary: 0.2, bump: 0.03 });
  // plinth: stepped strata column, alternating graphite / stone, ledges every few units
  const r = rng(9201);
  const geo = { graphite: [], stone: [] };
  let y = 0, k = 0;
  const steps = [[9, 0.8], [7.4, 0.8], [6.2, 0.9]];
  for (const [rad, h] of steps) { geo[k % 2 ? 'stone' : 'graphite'].push(new THREE.CylinderGeometry(rad, rad + 0.15, h, 12, 1).translate(CORE.x, y + h / 2, CORE.z)); y += h; k++; }
  while (y < PLINTH_TOP - 1.2) {
    const h = Math.min(r.range(1.8, 3.6), PLINTH_TOP - 1.2 - y), rad = r.range(3.3, 4.0);
    geo[k % 2 ? 'stone' : 'graphite'].push(new THREE.CylinderGeometry(rad, rad + 0.12, h, 12, 1).rotateY(r() * TAU).translate(CORE.x, y + h / 2, CORE.z));
    y += h; k++;
  }
  geo[k % 2 ? 'stone' : 'graphite'].push(new THREE.CylinderGeometry(4.7, 4.1, PLINTH_TOP - y, 12, 1).translate(CORE.x, (y + PLINTH_TOP) / 2, CORE.z)); // capital
  g.add(new THREE.Mesh(mergeGeometries(geo.graphite), stone('graphite', 1)), new THREE.Mesh(mergeGeometries(geo.stone), stone('stone', 0.85)));
  // the Strata vein that feeds the cable inlet runs up the plinth's +z face (toward the INDEX street)
  const vein = new THREE.Mesh(new THREE.BoxGeometry(0.16, PLINTH_TOP, 0.06).translate(CORE.x, PLINTH_TOP / 2, CORE.z + 4.05), MAT.goldLeaf());
  g.add(vein);

  // tiers
  const brassMat = tierMat({ color: col('gold'), roughness: 0.34, metalness: 1 }, { frost, flutes: 64, bump: 0.006 });
  const drumMat = tierMat({ color: col('graphite', 1.2), roughness: 0.75, metalness: 0 }, { frost, flutes: 40, bump: 0.02 });
  const leafMat = tierMat({ color: col('gold').lerp(col('hot'), 0.35), roughness: 0.22, metalness: 1 }, { frost, flutes: 28, bump: 0.01 });
  const tiers = new THREE.Group(); tiers.position.copy(C);
  const T = [drumMat, brassMat, leafMat].map((m, i) => {
    const [y0, y1, rad] = TIERS[i];
    const geoT = i === 2 ? new THREE.CylinderGeometry(rad * 0.5, rad, y1 - y0, 48, 1) : new THREE.CylinderGeometry(rad, rad, y1 - y0, 64, 1);
    const mesh = new THREE.Mesh(geoT.translate(0, (y0 + y1) / 2, 0), m);
    const pivot = new THREE.Group(); pivot.add(mesh); tiers.add(pivot);
    return pivot;
  });
  // brass bands on the drum
  const bandMat = MAT.brass();
  tiers.add(new THREE.Mesh(mergeGeometries([
    new THREE.CylinderGeometry(5.06, 5.06, 0.22, 64, 1, true).translate(0, -3.9, 0),
    new THREE.CylinderGeometry(5.06, 5.06, 0.22, 64, 1, true).translate(0, -1.9, 0),
  ]), bandMat));
  // seams between tiers: --atlas-gold-hot when awake (bloom), plain brass asleep
  const seam = awake ? MAT.glowHot(o.seam ?? 2.2) : bandMat;
  tiers.add(new THREE.Mesh(mergeGeometries([
    new THREE.TorusGeometry(3.9, 0.05, 6, 96).rotateX(Math.PI / 2).translate(0, -1.3, 0),
    new THREE.TorusGeometry(2.5, 0.045, 6, 80).rotateX(Math.PI / 2).translate(0, 1.5, 0),
  ]), seam));
  // cable inlet on the lowest tier, facing +z (the INDEX street)
  const inlet = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 24).translate(0, -3.0, 5.02), bandMat);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24).translate(0, -3.0, 5.03), awake ? MAT.glowHot(1.4) : MAT.matte('ink'));
  tiers.add(inlet, mouth);
  if (awake) { T[0].rotation.y = 0; T[1].rotation.y = (o.turn ?? 18) * DEG; T[2].rotation.y = -(o.turn ?? 18) * 1.6 * DEG; }
  g.add(tiers);
  // orbit rings (brass), radius ≤ 5.8
  const rings = new THREE.Group(); rings.position.copy(C);
  [[5.8, 0.07, 14, 0], [5.3, 0.06, -22, 60], [4.7, 0.055, 32, 130]].forEach(([R, t, tilt, yaw]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, t, 8, 160), bandMat);
    m.rotation.set(Math.PI / 2 + tilt * DEG, 0, 0); const p = new THREE.Group(); p.rotation.y = yaw * DEG; p.add(m); rings.add(p);
  });
  g.add(rings);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData = { tiers: T, rings, awake };
  return g;
}

/* ---------- SF-05 fix kit (PROPOSED) ---------- */
export async function makeFixKit(o = {}) {
  const g = new THREE.Group();
  // the dart's paper, unfolded: the same map the Cartographer carried (5 accordion panels, creases kept)
  const mc = mapCanvas({ ppu: 2600 });
  const W = o.mapW ?? 3.8, H = W * mc.height / mc.width;
  const pg = new THREE.PlaneGeometry(W, H, 40, 8);
  const P = pg.attributes.position;
  // accordion creases left in the paper: alternate valley / mountain folds every fifth of the width
  for (let i = 0; i < P.count; i++) { const u = Math.min(4.999, (P.getX(i) / W + 0.5) * 5); const f = Math.abs((u % 1) - 0.5); P.setZ(i, (Math.floor(u) % 2 ? f : 0.5 - f) * 0.08); }
  pg.computeVertexNormals();
  const map = new THREE.Mesh(pg, MAT.paper({ k: 'paper', bump: 0.002 }));
  map.material.map = canvasTex(mc, true);
  // faces the K12 camera (the −z side of the Core), tilted back toward it
  map.position.set(CORE.x, CORE.y + (o.mapY ?? 5.3), CORE.z - 0.6);
  map.rotation.set(-(o.mapTilt ?? 18) * DEG, Math.PI, 0);
  g.add(map);
  map.updateMatrixWorld(true);
  // gold-leaf filaments from the crown to points on the map (the fault building, the route, the two findings)
  const leaf = MAT.goldLeaf();
  const lit = MAT.glowHot(1.2);
  const targets = [[0.12, -0.06], [0.2, 0.12], [-0.05, 0.02], [0.3, -0.1], [-0.25, -0.18]];
  const fil = [], filHot = [];
  targets.forEach(([u, v], i) => {
    const end = map.localToWorld(new THREE.Vector3(u * W, v * H, 0.02));
    const a = (i / targets.length) * TAU + 0.6;
    const start = new THREE.Vector3(CORE.x + Math.cos(a) * 1.6, CORE.y + 3.2, CORE.z + Math.sin(a) * 1.6);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9));
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    (i < 2 ? filHot : fil).push(new THREE.TubeGeometry(curve, 48, 0.016, 5, false));
  });
  g.add(new THREE.Mesh(mergeGeometries(fil), leaf));
  if (filHot.length) g.add(new THREE.Mesh(mergeGeometries(filHot), lit));
  // 24 fix fragments: glass while forming (outer), gold leaf once set (inner), spiralling in toward the crown
  const glassM = MAT.glass({ opacity: 0.28 }), goldM = MAT.goldLeaf();
  const fg = new THREE.BoxGeometry(0.34, 0.34, 0.035);
  const gi = new THREE.InstancedMesh(fg, glassM, 12), go = new THREE.InstancedMesh(fg, goldM, 12);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), r = rng(24);
  for (let i = 0; i < 24; i++) {
    const t = i / 23, a = t * TAU * 1.4 + 2.2, rad = 4.4 - t * 2.6, y = CORE.y + 2.0 + t * 2.4;
    q.setFromEuler(e.set(r.range(-0.6, 0.6), a + Math.PI / 2, r.range(-0.4, 0.4)));
    m4.compose(new THREE.Vector3(CORE.x + Math.cos(a) * rad, y, CORE.z + Math.sin(a) * rad), q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + t * 0.4));
    (i < 12 ? gi : go).setMatrixAt(i % 12, m4);
  }
  gi.renderOrder = 2;
  g.add(gi, go);
  // the stamp: "SPECIMEN No. 001 · VERIFIED" (G1-P4) in --atlas-gold-hot, locking onto the crown's front
  const sw = 2.4, sh = 0.4, S = 600;
  const c = canvas(sw * S, sh * S), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#fff'; x.lineWidth = 0.02 * S; x.strokeRect(0.03 * S, 0.03 * S, c.width - 0.06 * S, c.height - 0.06 * S);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  setFont(x, 500, (0.17 / 0.73) * S, 'mono', 0.08);
  x.fillText('SPECIMEN No. 001 · VERIFIED', c.width / 2 + 0.17 / 0.73 * S * 0.04, c.height / 2 + 0.01 * S);
  const st = canvasTex(c, true);
  const stamp = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: col('hot', o.stamp ?? 2.2), alphaMap: st, transparent: true, depthWrite: false }));
  stamp.material.userData.bloom = true;
  stamp.position.set(CORE.x, CORE.y + 2.6, CORE.z - 2.12);
  stamp.rotation.y = Math.PI;
  g.add(stamp);
  g.traverse(m => { if (m.isMesh && !m.material.transparent) m.castShadow = true; });
  g.userData = { map, stamp };
  return g;
}
