/*
 * The Cartographer (§3.3, G2-6): a folded-paper figure, about 1.8 tall, that walks the city
 * with a brass lantern (left hand) and an accordion map of the city (right hand).
 * Local frame: faces +z, feet at y = 0. Built first so its silhouette can be tested (cartographer.html).
 *
 * 20 hinges: waist, neck, shoulder L/R (fixed ±6° splay), elbow L/R, wrist L/R, hip L/R, knee L/R,
 * ankle L/R (all about local x) · lantern bail (free swivel, keeps the lantern upright) ·
 * map attach (orients the map toward the reader) · 4 accordion folds (about local y).
 * Sign: +x rotation swings a hanging limb backward (−y → −z); forward flex is negative.
 */
import { THREE, HEX, col, DEG, MAT, canvas, canvasTex, setFont } from '../core.js';
import { plots, LAYOUT } from './city.js';

/* ---------- convex lofts (flat-shaded folded paper) ---------- */
// rings: arrays of 4 points ordered +x, +z, −x, −z; caps: apex point or null (flat cap)
function loft(rings, top = null, bot = null) {
  const P = [];
  const tri = (a, b, c) => P.push(a, b, c);
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; tri(A[i], A[j], B[j]); tri(A[i], B[j], B[i]); }
  }
  const capR = (R, apex) => {
    if (apex) for (let i = 0; i < 4; i++) tri(R[i], R[(i + 1) % 4], apex);
    else { tri(R[0], R[1], R[2]); tri(R[0], R[2], R[3]); }
  };
  capR(rings[0], bot); capR(rings[rings.length - 1], top);
  // orient every triangle outward (all shapes are convex)
  const cen = new THREE.Vector3(); let n = 0;
  for (const R of rings) for (const p of R) { cen.add(p); n++; }
  if (top) { cen.add(top); n++; } if (bot) { cen.add(bot); n++; }
  cen.divideScalar(n);
  const pos = [];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < P.length; i += 3) {
    let [a, b, d] = [P[i], P[i + 1], P[i + 2]];
    e1.subVectors(b, a); e2.subVectors(d, a); nn.crossVectors(e1, e2);
    c.copy(a).add(b).add(d).divideScalar(3).sub(cen);
    if (nn.dot(c) < 0) [b, d] = [d, b];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ring = (y, w, f, b, ox = 0, oz = 0) => [V(ox + w / 2, y, oz), V(ox, y, oz + f), V(ox - w / 2, y, oz), V(ox, y, oz - b)];
// a limb segment hanging down from its joint (diamond section = a strip folded along its front and back creases)
const limb = (len, top, bot) => loft([ring(-len, ...bot), ring(0, ...top)]);

/* ---------- poses (degrees) ---------- */
export const POSES = {
  raise_lantern: { shL: -150, elL: -10, shR: -60, elR: -40, hipL: -12, knL: 8, anL: 4, hipR: 10, knR: 4, anR: -14, waist: 4, neck: -8, fold: 28, mapTilt: -22, raised: true },
  walk: { hipL: -25, knL: 15, anL: 6, hipR: 20, knR: 35, anR: -10, shL: -20, elL: -20, shR: -45, elR: -55, waist: 3, neck: 6, fold: 150, mapTilt: -35 },
  idle: { shL: -5, elL: -15, shR: -30, elR: -60, fold: 172, mapTilt: -10 },
};
const HINGES = ['waist', 'neck', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR'];

/* ---------- the map (city plan in stone ink, two red findings: PROPOSED M2) ---------- */
const PW = 0.14, PH = 0.46, PANELS = 5;
export function mapCanvas(o = {}) {
  const S = o.ppu ?? 1400;
  const c = canvas(Math.round(PW * PANELS * S), Math.round(PH * S)), x = c.getContext('2d');
  x.fillStyle = HEX.paper; x.fillRect(0, 0, c.width, c.height);
  // world → map: north (−z) up; window x −60..60, z −4..−120
  const X0 = -60, X1 = 60, Z0 = -4, Z1 = -120;
  const m = 0.03 * S, sc = Math.min((c.width - 2 * m) / (X1 - X0), (c.height - 2 * m) / (Z0 - Z1));
  const ox = (c.width - (X1 - X0) * sc) / 2, oy = (c.height - (Z0 - Z1) * sc) / 2;
  const mx = (wx) => ox + (wx - X0) * sc, my = (wz) => oy + (wz - Z1) * sc; // z −120 at top
  const R = (x0, x1, z0, z1) => [mx(x0), my(z1), (x1 - x0) * sc, (z0 - z1) * sc];
  x.save();
  x.beginPath(); x.rect(m * 0.6, m * 0.6, c.width - 1.2 * m, c.height - 1.2 * m); x.clip();
  x.lineWidth = Math.max(1, 0.0012 * S);
  for (const p of plots()) {
    x.fillStyle = 'rgba(106,103,95,0.16)'; x.strokeStyle = HEX.stone;
    x.fillRect(...R(p.x0, p.x1, p.z0, p.z1)); x.strokeRect(...R(p.x0, p.x1, p.z0, p.z1));
  }
  const F = LAYOUT.fault;
  x.fillStyle = 'rgba(106,103,95,0.32)'; x.fillRect(...R(F.x0, F.x1, F.z0, F.z1)); x.strokeRect(...R(F.x0, F.x1, F.z0, F.z1));
  // the clearing (the Core's ground, unmarked: the Cartographer has not been there)
  const C = LAYOUT.clearing;
  x.setLineDash([0.006 * S, 0.006 * S]); x.beginPath(); x.arc(mx(C.x), my(C.z), C.r * sc, 0, Math.PI * 2); x.stroke();
  // the route walked so far
  x.strokeStyle = HEX.ink; x.lineWidth = 0.002 * S; x.setLineDash([0.004 * S, 0.005 * S]);
  x.beginPath(); x.moveTo(mx(LAYOUT.path[0][0]), my(LAYOUT.path[0][1])); x.lineTo(mx(LAYOUT.path[1][0]), my(LAYOUT.path[1][1])); x.stroke();
  x.setLineDash([]);
  // the two findings at the fault building, in signal-red (PROPOSED copy, M2)
  x.strokeStyle = HEX.red; x.fillStyle = HEX.red; x.lineWidth = 0.003 * S;
  x.beginPath(); x.ellipse(mx(4), my(-44), 9 * sc, 7.5 * sc, -0.1, 0, Math.PI * 2); x.stroke();
  setFont(x, 500, 0.03 * S, 'Montserrat', 0.02); x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  const tx = mx(14), ty = my(-30);
  x.beginPath(); x.moveTo(mx(11.5), my(-38)); x.lineTo(tx - 0.004 * S, ty - 0.034 * S); x.stroke();
  x.fillText('No share preview', tx, ty - 0.02 * S);
  x.fillText('No business details', tx, ty + 0.018 * S);
  x.restore();
  return c;
}

/* ---------- lantern (brass cage, bone panes lit lantern, flame) ---------- */
function makeLantern(o) {
  const brass = MAT.brass();
  const g = new THREE.Group();
  const bw = 0.1, bh = 0.14, top = -0.07; // bail apex at 0, body hangs below
  const parts = [];
  const bx = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const cy = top - 0.03 - bh / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(bx(0.012, bh, 0.012, sx * bw / 2, cy, sz * bw / 2));
  parts.push(new THREE.CylinderGeometry(0.018, 0.075, 0.035, 4, 1).rotateY(Math.PI / 4).translate(0, top - 0.012, 0)); // cap
  parts.push(new THREE.CylinderGeometry(0.075, 0.07, 0.02, 4, 1).rotateY(Math.PI / 4).translate(0, cy - bh / 2 - 0.01, 0)); // base
  parts.push(new THREE.TorusGeometry(0.035, 0.005, 6, 14, Math.PI).translate(0, -0.035, 0).scale(1, 1, 1)); // bail loop
  parts.push(bx(0.004, 0.04, 0.004, 0, top + 0.012, 0));
  const { mergeGeometries } = o;
  const cage = new THREE.Mesh(mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)), brass);
  cage.castShadow = true;
  g.add(cage);
  const panes = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.01, bh - 0.008, bw - 0.01).translate(0, cy, 0), MAT.glowLantern(o.pane ?? 1.4));
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.018).scale(0.7, 1.6, 0.7).translate(0, cy - 0.01, 0), MAT.glowLantern(o.flame ?? 6));
  g.add(panes, flame);
  g.userData.centre = V(0, cy, 0);
  return { g, panes, flame, brass };
}

/* soft beam cone (no bloom, §2.0): additive, falls off along its length and at its edge */
function beamMesh() {
  const geo = new THREE.ConeGeometry(1, 1, 32, 1, true).translate(0, -0.5, 0); // apex at 0, opens toward −y
  const m = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col('lantern') }, uS: { value: 0.05 } },
    vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){ vT = -position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uS; varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float a = uS * e * smoothstep(0.0, 0.08, vT) * pow(1.0 - vT, 1.4);
        gl_FragColor = vec4(uCol * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = 3;
  mesh.userData.beam = true;
  return mesh;
}

/*
 * makeCartographer({ pose, mergeGeometries }) → rig
 *   rig.root            Group to place in the world (position on the ground, rotation.y = heading)
 *   rig.pose(name|obj)  applies a pose, grounds the feet, re-hangs the lantern and re-orients the map
 *   rig.aim(v3, o)      points the lantern spot + beam at a world point (call after the rig is placed)
 *   rig.spot / rig.light / rig.beam
 */
export async function makeCartographer(o = {}) {
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  try { await document.fonts.load('500 40px Montserrat'); } catch (e) { /* font optional for the map */ }
  const paper = MAT.paper({ k: o.k ?? 'paper', bump: 0.006 });
  const root = new THREE.Group(); root.name = 'cartographer';
  const body = new THREE.Group(); root.add(body);
  const J = {};
  const meshes = [];
  const add = (parent, geo, mat = paper) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); meshes.push(m); return m; };
  const joint = (parent, name, pos, splay = 0) => {
    let p = parent;
    if (splay) { const s = new THREE.Group(); s.position.set(...pos); s.rotation.z = splay; parent.add(s); p = s; pos = [0, 0, 0]; }
    const j = new THREE.Group(); j.name = name; j.position.set(...pos); p.add(j); if (name) J[name] = j; return j;
  };

  // pelvis (inverted pyramid) hangs below the waist joint at y 1.02
  const pelvis = joint(body, null, [0, 1.02, 0]);
  add(pelvis, loft([ring(0, 0.2, 0.06, 0.06)], null, V(0, -0.12, 0.005)));
  // torso: kite bipyramid (waist ring → chest ring → neck point)
  const waist = joint(pelvis, 'waist', [0, 0, 0]);
  add(waist, loft([ring(0.0, 0.15, 0.045, 0.045), ring(0.34, 0.38, 0.1, 0.075)], V(0, 0.5, -0.01), null));
  // head: diamond (octahedron) above a neck gap
  const neck = joint(waist, 'neck', [0, 0.5, -0.005]);
  add(neck, loft([ring(0.15, 0.13, 0.075, 0.06)], V(0, 0.28, -0.005), V(0, 0.04, 0.005)));
  // arms (shoulders at world y ≈ 1.44, ±6° fixed splay)
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint(waist, 'sh' + k, [s * 0.175, 0.42, -0.005], s * 6 * DEG);
    add(sh, limb(0.3, [0.085, 0.05, 0.05], [0.06, 0.04, 0.04]));
    const el = joint(sh, 'el' + k, [0, -0.3, 0]);
    add(el, limb(0.28, [0.06, 0.04, 0.04], [0.045, 0.03, 0.03]));
    const wr = joint(el, 'wr' + k, [0, -0.28, 0]);
    add(wr, loft([ring(-0.04, 0.06, 0.016, 0.016), ring(0, 0.045, 0.028, 0.028)], null, V(0, -0.09, 0.004)));
    J['hand' + k] = joint(wr, null, [0, -0.085, 0.005]);
  }
  // legs: thigh 0.44, shin 0.45, ankle at y 0.07, wedge foot
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    const hip = joint(pelvis, 'hip' + k, [s * 0.075, -0.06, 0]);
    add(hip, limb(0.44, [0.13, 0.07, 0.06], [0.085, 0.05, 0.045]));
    const kn = joint(hip, 'kn' + k, [0, -0.44, 0]);
    add(kn, limb(0.45, [0.085, 0.05, 0.05], [0.05, 0.035, 0.035]));
    const an = joint(kn, 'an' + k, [0, -0.45, 0]);
    const foot = add(an, loft([ring(-0.07, 0.09, 0.17, 0.05, 0, 0.02), ring(0, 0.05, 0.035, 0.035)]));
    J['foot' + k] = foot;
  }

  // lantern on a free-swivel bail in the left hand
  const bail = joint(J.handL, 'bail', [0, 0, 0]);
  const lan = makeLantern({ mergeGeometries, pane: o.pane, flame: o.flame });
  bail.add(lan.g);
  const light = new THREE.PointLight(col('lantern'), o.lanternI ?? 4, 14, 2);
  light.position.copy(lan.g.userData.centre);
  if (o.lanternShadow) { light.castShadow = true; light.shadow.mapSize.set(512, 512); light.shadow.bias = -0.002; light.shadow.camera.near = 0.15; }
  lan.g.add(light);
  const spot = new THREE.SpotLight(col('lantern'), 125, 0, 21 * DEG, 0.55, 2);
  spot.castShadow = o.spotShadow !== false;
  spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0006; spot.shadow.normalBias = 0.03; spot.shadow.radius = 5;
  spot.shadow.camera.near = 0.3; spot.shadow.camera.far = 40;
  const beam = beamMesh();

  // accordion map in the right hand: attach (oriented toward the reader) + 4 folds about local y
  const mapC = mapCanvas();
  const mapT = canvasTex(mapC, true);
  const front = MAT.paper({ k: 'paper', bump: 0.002, side: THREE.FrontSide });
  front.map = mapT;
  const back = MAT.paper({ k: 'bone', bump: 0.002, side: THREE.FrontSide });
  const attach = joint(J.handR, 'mapAttach', [0, 0, 0]);
  const mapOff = new THREE.Group(); attach.add(mapOff);
  const folds = [];
  let parent = mapOff;
  for (let i = 0; i < PANELS; i++) {
    const f = joint(parent, i ? 'fold' + i : null, [i ? PW : 0, 0, 0]);
    if (i) folds.push(f);
    const pg = new THREE.PlaneGeometry(PW, PH).translate(PW / 2, -PH * 0.62, 0);
    const uv = pg.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / PANELS);
    add(f, pg, front);
    add(f, pg.clone().rotateY(Math.PI).translate(PW, 0, 0), back);
    parent = f;
  }

  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler();
  const box = new THREE.Box3();
  let cur = null;
  function pose(p) {
    const P = typeof p === 'string' ? POSES[p] : p;
    cur = P;
    for (const h of HINGES) J[h].rotation.x = (P[h] ?? 0) * DEG;
    body.position.y = 0;
    // map folds: accordion, alternate valley / mountain; P.fold = interior angle between panels (180 = flat)
    const a = (180 - (P.fold ?? 170)) * DEG;
    folds.forEach((f, i) => { f.rotation.y = (i % 2 ? -a : a); });
    mapOff.position.x = -PW * PANELS * Math.cos(a / 2) * 0.5;
    root.updateMatrixWorld(true);
    // ground the lowest foot
    let minY = Infinity;
    for (const k of ['L', 'R']) { box.setFromObject(J['foot' + k]); minY = Math.min(minY, box.min.y); }
    body.position.y = root.position.y - minY;
    root.updateMatrixWorld(true);
    // bail swivel: the lantern hangs plumb whatever the arm does
    root.getWorldQuaternion(q);
    bail.parent.getWorldQuaternion(q2);
    bail.quaternion.copy(q2.invert().multiply(q));
    // map attach: printed face turned back toward the reader, top tilted toward the face
    attach.parent.getWorldQuaternion(q2);
    const want = q.clone().multiply(new THREE.Quaternion().setFromEuler(e.set((P.mapTilt ?? -20) * DEG, Math.PI, 0, 'YXZ')));
    attach.quaternion.copy(q2.invert().multiply(want));
    root.updateMatrixWorld(true);
    return rig;
  }
  const _w = new THREE.Vector3();
  function lanternWorld(v = new THREE.Vector3()) { return lan.g.localToWorld(v.copy(lan.g.userData.centre)); }
  // aim the spot + beam (spot and beam live in world space so the frame can add them to its scene)
  function aim(target, a = {}) {
    root.updateMatrixWorld(true);
    const p = lanternWorld(_w);
    const raised = a.raised ?? cur?.raised;
    spot.position.copy(p);
    spot.target.position.copy(target);
    spot.intensity = a.intensity ?? (raised ? 275 : 125);
    const d = target.clone().sub(p), L = d.length() * (a.reach ?? 1.05);
    beam.position.copy(p);
    beam.scale.set(Math.tan(21 * DEG) * L, L, Math.tan(21 * DEG) * L);
    beam.quaternion.setFromUnitVectors(V(0, -1, 0), d.normalize());
    beam.material.uniforms.uS.value = a.beam ?? (raised ? 0.06 : 0.035);
    light.intensity = a.lanternI ?? (raised ? 6 : 4);
    return rig;
  }
  function tris() { let t = 0; root.traverse(m => { if (m.isMesh) t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return t; }

  const rig = { root, J, pose, aim, spot, light, beam, lantern: lan, lanternWorld, paper, mapCanvas: mapC, tris, hinges: HINGES.length + 1 + 1 + folds.length };
  pose(o.pose ?? 'idle');
  return rig;
}
