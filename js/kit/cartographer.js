/*
 * The Cartographer (§3.3, G2-6): a folded-paper figure, about 1.8 tall, that walks the city
 * with a brass lantern (left hand) and an accordion map of the city (right hand).
 * Local frame: faces +z, feet at y = 0. Built first so its silhouette can be tested (cartographer.html).
 * A pleated paper tunic (rigid, on the pelvis, no hinge) and the open map carry the fold lines into the silhouette.
 *
 * 27 hinges: waist, neck, shoulder L/R (fixed ±6° splay), elbow L/R, wrist L/R, hip L/R, knee L/R,
 * ankle L/R (all about local x) · shoulder yaw L/R (G3) · lantern bail (free swivel, keeps the lantern upright) ·
 * map attach (orients the map toward the reader) · 4 accordion folds (about local y) · dart hold + the dart's 4 folds (G3).
 * G3: ANIMS (8 animations as hinge keyframes), rig.play(name, t), the paper dart (rig.dart, rig.dartWorld()).
 * Sign: +x rotation swings a hanging limb backward (−y → −z); forward flex is negative.
 */
import { THREE, HEX, col, DEG, MAT, canvas, canvasTex, setFont } from '../core.js';
import { plots, LAYOUT } from './city.js';
import { makeDart } from './dart.js';
import { EASE } from './ease.js';

/* ---------- convex lofts (flat-shaded folded paper) ---------- */
// Triangles carry their fold lines in uv: [a, b, c, k] where corner k joins the triangle's two fold edges
// (uv 0,0) and the third edge is a quad diagonal, not a fold. The paper shader draws a crease where
// min(u, v) → 0, so only real folds get a line.
function creased(T) {
  const pos = [], uv = [];
  for (const [a, b, c, k] of T) {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const others = [[1, 0], [0, 1]];
    for (let i = 0; i < 3; i++) uv.push(...(i === k ? [0, 0] : others.shift()));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
// rings: arrays of 4 points ordered +x, +z, −x, −z; caps: apex point or null (flat cap)
function loft(rings, top = null, bot = null) {
  const P = [];
  const tri = (a, b, c, k) => P.push([a, b, c, k]);
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; tri(A[i], A[j], B[j], 1); tri(A[i], B[j], B[i], 2); }
  }
  const capR = (R, apex) => {
    if (apex) for (let i = 0; i < 4; i++) tri(R[i], R[(i + 1) % 4], apex, 0);
    else { tri(R[0], R[1], R[2], 1); tri(R[0], R[2], R[3], 2); }
  };
  capR(rings[0], bot); capR(rings[rings.length - 1], top);
  // orient every triangle outward (all shapes are convex)
  const cen = new THREE.Vector3(); let n = 0;
  for (const R of rings) for (const p of R) { cen.add(p); n++; }
  if (top) { cen.add(top); n++; } if (bot) { cen.add(bot); n++; }
  cen.divideScalar(n);
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3(), c = new THREE.Vector3();
  return creased(P.map(([a, b, d, k]) => {
    e1.subVectors(b, a); e2.subVectors(d, a); nn.crossVectors(e1, e2);
    c.copy(a).add(b).add(d).divideScalar(3).sub(cen);
    return nn.dot(c) < 0 ? [a, d, b, [0, 2, 1][k]] : [a, b, d, k];
  }));
}
/* pleated tunic hanging from the waist to mid-thigh: an accordion of folds flaring to a zig-zag hem, so the
   fold lines carry the silhouette (§3.1 silhouette rule). Open at the hem, no sleeves, no hood. PROPOSED (G2 review). */
function tunic(n = 20) {
  const T = [], H = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, s = i % 2 ? 0.84 : 1; // even = mountain fold (out, longer), odd = valley
    T.push(V(Math.cos(a) * 0.112 * (i % 2 ? 0.9 : 1), 0.035, Math.sin(a) * 0.072 * (i % 2 ? 0.9 : 1)));
    H.push(V(Math.cos(a) * 0.21 * s, i % 2 ? -0.26 : -0.31, Math.sin(a) * 0.19 * s));
  }
  const P = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; P.push([T[i], T[j], H[j], 1], [T[i], H[j], H[i], 2]); }
  return creased(P);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const glv = (c) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
/* §3.1 material: --paper with --bone fold shadows. Each facet sits at its own angle to the light, so it takes its
   own tone between paper and bone (bone where it turns under), and every fold carries a hairline crease in --stone. */
const FOLDS = {
  varyings: 'varying vec2 vFold;',
  vertex: 'vFold = uv;',
  albedo: `
    float fh = fract(sin(dot(floor(wn * 9.0 + 0.5), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    diffuseColor.rgb = mix(diffuseColor.rgb, ${glv(col('bone'))}, clamp(0.12 + 0.45 * fh + 0.45 * smoothstep(0.3, -0.7, wn.y), 0.0, 1.0));
    float ce = min(vFold.x, vFold.y), aa = max(fwidth(ce), 1e-4);
    diffuseColor.rgb = mix(diffuseColor.rgb, ${glv(col('stone'))}, 0.6 * (1.0 - smoothstep(0.6 * aa, 1.6 * aa, ce)));`,
};
const ring = (y, w, f, b, ox = 0, oz = 0) => [V(ox + w / 2, y, oz), V(ox, y, oz + f), V(ox - w / 2, y, oz), V(ox, y, oz - b)];
// a limb segment hanging down from its joint (diamond section = a strip folded along its front and back creases)
const limb = (len, top, bot) => loft([ring(-len, ...bot), ring(0, ...top)]);

/* ---------- poses (degrees) ---------- */
export const POSES = {
  // the map stays open low in the right hand, outboard of the body (mapX = share of its width inboard of the hand),
  // so it reads in the silhouette from behind as well as in front (G2 review: folded to 28° it vanished at K8)
  raise_lantern: { shL: -150, elL: -10, shR: -30, elR: -50, hipL: -12, knL: 8, anL: 4, hipR: 10, knR: 4, anR: -14, waist: 4, neck: -8, fold: 120, mapTilt: -30, mapX: 0.15, raised: true },
  walk: { hipL: -25, knL: 15, anL: 6, hipR: 20, knR: 35, anR: -10, shL: -20, elL: -20, shR: -45, elR: -55, waist: 3, neck: 6, fold: 150, mapTilt: -35, mapX: 0.25 },
  idle: { shL: -5, elL: -15, shR: -30, elR: -60, fold: 172, mapTilt: -10 },
};
const HINGES = ['waist', 'neck', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR'];
// shoulder yaw (about the vertical, inward positive): lets a raised hand cross toward the midline (reading, the
// throw's follow-through). 0 = the G2 rig exactly. PROPOSED (G3).
const YAW = ['ywL', 'ywR'];

/* ---------- animations (§3.1): hinge-angle keyframes in code ----------
 * ANIMS[name] = { dur (s), loop?, keys: [[u 0..1, pose, ease], ...] }
 *   One-shots: each segment eases from the previous key with the named §5.1 curve (default EASE_CAMERA), so the
 *   motion rests on held keys and runs through DEPART -> ARRIVE pairs (the throw's release, the dart's last crease).
 *   Loops (idle, walk, walk_away): a periodic Catmull-Rom spline through the keys at EASE_LINEAR time (ambient, §5.2).
 * Pose fields beyond the hinges: fold (map interior angle, 180 = flat), mapTilt, mapX, raise (0..1 beam widen),
 * dart (0 none · 0..0.15 the sheet appears · 0.15..1 folding · 1..2 gilding), dartPitch / dartYaw / dartRoll
 * (degrees, relative to the figure), map (1 shown, 0 gone) and thrown (1 = released) are steps, not blends.
 */
const DEF = { fold: 170, mapTilt: -20, mapX: 0.5, raise: 0, dart: 0, dartPitch: 0, dartYaw: 0, dartRoll: 0, map: 1, thrown: 0 };
const FIELDS = [...HINGES, ...YAW, ...Object.keys(DEF)];
const STEP = new Set(['map', 'thrown']);
const full = (p) => {
  const o = {};
  for (const f of FIELDS) o[f] = p[f] ?? DEF[f] ?? 0;
  if (p.raise === undefined && p.raised !== undefined) o.raise = p.raised ? 1 : 0;
  return o;
};
const STAND = POSES.idle;
const RL = POSES.raise_lantern;
const L_RL = { hipL: RL.hipL, knL: RL.knL, anL: RL.anL, hipR: RL.hipR, knR: RL.knR, anR: RL.anR };
const READ_LEGS = { hipL: -8, knL: 6, anL: 2, hipR: 6, knR: 4, anR: -8 };
// reading the opened map: held flat in front of the chest, top tilted to the folds of the head, lantern up beside it
const READ = { ...READ_LEGS, waist: 5, neck: 20, shL: -90, elL: -45, shR: -58, elR: -50, ywR: 16, fold: 176, mapTilt: -34, mapX: 0.5, raise: 0.4 };
// holding the folded dart up at head height, nose forward, weight over the back foot (throw stance, left foot leads)
const READY = { hipL: -14, knL: 8, anL: 6, hipR: 10, knR: 6, anR: -16, waist: 2, neck: 2, shL: -30, elL: -25, shR: -70, elR: -100, ywR: 8, dart: 1, dartPitch: 8 };
const EMPTY = { shL: -5, elL: -15, shR: -6, elR: -14, map: 0 }; // after the throw the right hand is empty

/* walk (1.2 s): 8 keys, the second half mirrors the first. Lead leg: contact, loading, passing, up.
   Lantern arm swings against the legs; the map arm barely swings (it is reading). PROPOSED key angles. */
function walkKeys(over = {}) {
  const lead = [{ hip: -24, kn: 4, an: -8 }, { hip: -16, kn: 16, an: 2 }, { hip: -4, kn: 8, an: 0 }, { hip: 8, kn: 4, an: 8 }];
  const trail = [{ hip: 16, kn: 12, an: 14 }, { hip: 18, kn: 36, an: 22 }, { hip: -8, kn: 58, an: 4 }, { hip: -26, kn: 28, an: -6 }];
  const shL = [-8, -12, -17, -22, -26, -22, -17, -12], elL = [-20, -21, -22, -23, -24, -23, -22, -21];
  const shR = [-49, -47, -45, -43, -41, -43, -45, -47];
  const waist = [3, 4.5, 3, 2.5], fold = [150, 153, 156, 153];
  const keys = [];
  for (let i = 0; i < 8; i++) {
    const h = i % 4, [A, B] = i < 4 ? ['L', 'R'] : ['R', 'L'];
    const p = {
      ['hip' + A]: lead[h].hip, ['kn' + A]: lead[h].kn, ['an' + A]: lead[h].an,
      ['hip' + B]: trail[h].hip, ['kn' + B]: trail[h].kn, ['an' + B]: trail[h].an,
      shL: shL[i], elL: elL[i], shR: shR[i], elR: -55, waist: waist[h], neck: 6 - (waist[h] - 3),
      fold: fold[h], mapTilt: -35, mapX: 0.25,
    };
    keys.push([i / 8, { ...p, ...(typeof over === 'function' ? over(i, p) : over) }]);
  }
  return keys;
}
const RAW = {
  // breathing: the paper settles and lifts (4 s loop: PROPOSED, §3.1 gives no idle length)
  idle: { dur: 4.0, loop: true, keys: [
    [0, STAND],
    [0.5, { ...STAND, waist: 1.5, neck: -2, shL: -7, elL: -17, shR: -31, elR: -61, hipL: -1, knL: 2, anL: -1, hipR: -1, knR: 2, anR: -1, fold: 166, mapTilt: -12 }],
  ] },
  walk: { dur: 1.2, loop: true, keys: walkKeys() },
  // anticipation (lantern drawn in, knees dip) -> overshoot high -> settle on the SF-04 pose; the beam widens on the way up
  raise_lantern: { dur: 1.0, keys: [
    [0, STAND],
    [0.28, { hipL: -6, knL: 10, anL: -4, hipR: -6, knR: 10, anR: -4, waist: 8, neck: 5, shL: -38, elL: -72, shR: -30, elR: -56, fold: 146, mapTilt: -22, mapX: 0.32, raise: 0 }],
    [0.72, { ...L_RL, waist: 2, neck: -11, shL: -160, elL: -4, shR: -30, elR: -50, fold: 118, mapTilt: -30, mapX: 0.15, raise: 1 }],
    [1, RL],
  ] },
  // gather the map (folds close a little), then flick it open flat and lift it to read; the lantern comes down beside it
  unfurl_map: { dur: 1.2, keys: [
    [0, RL],
    [0.25, { ...L_RL, waist: 4, neck: 4, shL: -118, elL: -12, shR: -40, elR: -72, fold: 92, mapTilt: -18, mapX: 0.3, raise: 0.8 }],
    [0.6, { ...READ_LEGS, waist: 6, neck: 16, shL: -92, elL: -40, shR: -62, elR: -48, ywR: 18, fold: 180, mapTilt: -38, mapX: 0.5, raise: 0.5 }],
    [1, READ],
  ] },
  // the map closes into a stack (the last fold snaps shut), becomes the sheet, the sheet folds into the dart
  // (in half, then the wings), and the dart is lifted to head height (last segment EASE_ARRIVE, §5.3; PROPOSED reading
  // of the table's 1.4 s EASE_ARRIVE: the arrival is the dart reaching the hand-up hold)
  fold_dart: { dur: 1.4, keys: [
    [0, READ],
    [0.28, { ...READ_LEGS, waist: 6, neck: 22, shL: -100, elL: -45, shR: -52, elR: -74, ywR: 22, fold: 24, mapTilt: -8, mapX: 0.5, raise: 0.3, dartPitch: 60 }],
    [0.36, { ...READ_LEGS, waist: 6, neck: 22, shL: -100, elL: -45, shR: -52, elR: -74, ywR: 22, fold: 0, mapTilt: -8, mapX: 0.5, raise: 0.3, dartPitch: 60 }, 'LINEAR'],
    [0.42, { ...READ_LEGS, waist: 6, neck: 22, shL: -100, elL: -45, shR: -52, elR: -74, ywR: 22, fold: 0, mapTilt: -8, mapX: 0.5, raise: 0.3, dart: 0.15, dartPitch: 60 }, 'LINEAR'],
    [0.8, { ...READ_LEGS, waist: 5, neck: 20, shL: -80, elL: -40, shR: -62, elR: -84, ywR: 18, fold: 0, raise: 0.2, dart: 1, dartPitch: 18 }],
    [1, READY, 'ARRIVE'],
  ] },
  // cock behind the head with the weight back (anticipation) -> whip forward, release at full speed (DEPART) ->
  // follow through across the body onto the front foot (ARRIVE) -> settle
  throw_dart: { dur: 1.0, release: 0.46, keys: [
    [0, READY],
    [0.32, { hipL: -22, knL: 4, anL: 18, hipR: -4, knR: 16, anR: -12, waist: -8, neck: -6, shL: -70, elL: -15, ywL: 8, shR: -150, elR: -112, ywR: -6, dart: 1, dartPitch: 18 }],
    [0.46, { hipL: -18, knL: 14, anL: 4, hipR: 12, knR: 4, anR: -16, waist: 8, neck: 0, shL: -25, elL: -20, ywL: 4, shR: -105, elR: -30, ywR: 8, dart: 1, dartPitch: 4, thrown: 1 }, 'DEPART'],
    [0.72, { hipL: -12, knL: 20, anL: -8, hipR: 22, knR: 10, anR: 14, waist: 16, neck: 8, shL: 10, elL: -18, shR: -40, elR: -14, ywR: 30, dart: 1, thrown: 1 }, 'ARRIVE'],
    [1, { hipL: -10, knL: 8, anL: 2, hipR: 12, knR: 4, anR: -6, waist: 5, neck: 2, shL: -6, elL: -15, shR: -22, elR: -22, ywR: 10, dart: 1, thrown: 1 }],
  ] },
  // one clear dip of the diamond head with a small rebound (the right hand is empty after the throw)
  nod: { dur: 0.8, keys: [
    [0, EMPTY],
    [0.35, { ...EMPTY, neck: 26, waist: 5, hipL: -2, knL: 4, anL: -2, hipR: -2, knR: 4, anR: -2 }],
    [0.65, { ...EMPTY, neck: -3 }],
    [1, EMPTY],
  ] },
  // reuses the walk legs; map gone, so the right arm swings free against the right leg. PROPOSED.
  walk_away: { dur: 1.2, loop: true, keys: walkKeys((i) => ({ map: 0, shR: [-26, -22, -17, -12, -8, -12, -17, -22][i], elR: [-24, -23, -22, -21, -20, -21, -22, -23][i] })) },
};
export const ANIMS = {};
for (const [name, a] of Object.entries(RAW)) ANIMS[name] = { ...a, keys: a.keys.map(([u, p, e]) => [u, full(p), e ?? (a.loop ? 'LINEAR' : 'CAMERA')]) };

/* evaluate an animation at t seconds -> a full pose object (pass it to rig.pose, or blend two of them) */
export function evalAnim(name, t) {
  const A = ANIMS[name];
  if (!A) throw new Error('unknown animation ' + name);
  const K = A.keys, n = K.length;
  let u = t / A.dur;
  u = A.loop ? u - Math.floor(u) : Math.min(1, Math.max(0, u));
  const out = {};
  if (A.loop) {
    // periodic Catmull-Rom (keys evenly spaced over the cycle)
    let i = 0;
    while (i < n - 1 && u >= K[i + 1][0]) i++;
    const t0 = K[i][0], t1 = i + 1 < n ? K[i + 1][0] : 1;
    const s = (u - t0) / (t1 - t0);
    const P0 = K[(i - 1 + n) % n][1], P1 = K[i][1], P2 = K[(i + 1) % n][1], P3 = K[(i + 2) % n][1];
    for (const f of FIELDS) {
      if (STEP.has(f)) { out[f] = P1[f]; continue; }
      const a = P0[f], b = P1[f], c = P2[f], d = P3[f];
      out[f] = 0.5 * (2 * b + (c - a) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (3 * b - a - 3 * c + d) * s * s * s);
    }
  } else {
    let i = 0;
    while (i < n - 2 && u > K[i + 1][0]) i++;
    const [t0, P] = K[i], [t1, Q, e] = K[i + 1];
    const s = t1 > t0 ? (u - t0) / (t1 - t0) : 1;
    const k = EASE[e](s);
    for (const f of FIELDS) out[f] = STEP.has(f) ? (u >= t1 ? Q[f] : P[f]) : P[f] + (Q[f] - P[f]) * k;
  }
  out.fold = Math.min(180, Math.max(0, out.fold));
  out.dart = Math.max(0, out.dart);
  out.raise = Math.min(1, Math.max(0, out.raise));
  out.raised = out.raise > 0.5;
  return out;
}

/* ---------- the map (city plan in stone ink, two red findings: PROPOSED M2) ---------- */
const PW = 0.16, PH = 0.5, PANELS = 5; // 0.8 × 0.5 open: big enough to share the silhouette with the body (§3.1)
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
  // world -> map pixel and the scale, so the dart (dart.js) can cut its sheet from the same print
  c.px = (wx, wz) => [mx(wx), my(wz)];
  c.sc = sc;
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
 *   rig.play(name, t)   applies ANIMS[name] at t seconds (G3)
 *   rig.dart            the paper dart (dart.js) in the right hand; rig.dartWorld() its world transform,
 *                       rig.dartRelease() the transform + velocity at the throw's release (G3)
 */
export async function makeCartographer(o = {}) {
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  try { await document.fonts.load('500 40px Montserrat'); } catch (e) { /* font optional for the map */ }
  const paper = MAT.paper({ k: o.k ?? 'paper', bump: 0.006, ...FOLDS });
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
  add(pelvis, tunic());
  // torso: kite bipyramid (waist ring → chest ring → neck point)
  const waist = joint(pelvis, 'waist', [0, 0, 0]);
  add(waist, loft([ring(0.0, 0.15, 0.045, 0.045), ring(0.34, 0.38, 0.1, 0.075)], V(0, 0.5, -0.01), null));
  // head: diamond (octahedron) above a neck gap
  const neck = joint(waist, 'neck', [0, 0.5, -0.005]);
  add(neck, loft([ring(0.15, 0.13, 0.075, 0.06)], V(0, 0.28, -0.005), V(0, 0.04, 0.005)));
  // arms (shoulders at world y ≈ 1.44, ±6° fixed splay)
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint(waist, 'sh' + k, [s * 0.175, 0.42, -0.005], s * 6 * DEG);
    J['yw' + k] = sh.parent; // the splay group carries the shoulder yaw (rotation.y; 0 = the G2 rig)
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
  const spot = new THREE.SpotLight(col('lantern'), 125, 0, 9 * DEG, 0.55, 2);
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
  const folds = [], mapMeshes = [];
  let parent = mapOff;
  for (let i = 0; i < PANELS; i++) {
    const f = joint(parent, i ? 'fold' + i : null, [i ? PW : 0, 0, 0]);
    if (i) folds.push(f);
    const pg = new THREE.PlaneGeometry(PW, PH).translate(PW / 2, -PH * 0.62, 0);
    const uv = pg.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / PANELS);
    mapMeshes.push(add(f, pg, front));
    mapMeshes.push(add(f, pg.clone().rotateY(Math.PI).translate(PW, 0, 0), back));
    parent = f;
  }

  // the paper dart (dart.js) pinched in the right hand: dartHold keeps it in the figure's frame (pitch / yaw / roll
  // from the pose), the hand pinches the keel a little ahead of mid-length. Hidden until fold_dart makes it.
  const dartHold = joint(J.handR, 'dartHold', [0, 0, 0]);
  const dart = makeDart({ map: mapC, state: 'map' });
  dart.position.set(0, -0.012, -0.02);
  dartHold.add(dart);
  for (const m of dart.userData.meshes) m.visible = false;

  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler();
  const box = new THREE.Box3();
  let cur = null, curOpt = {};
  // pose(name | obj, { precise }) : precise grounds on the feet's vertices (used by play); the default keeps the
  // G2 bounding-box grounding so SF-04 renders exactly as before
  function pose(p, opt = {}) {
    const P = typeof p === 'string' ? POSES[p] : p;
    cur = P; curOpt = opt;
    for (const h of HINGES) J[h].rotation.x = (P[h] ?? 0) * DEG;
    J.ywL.rotation.y = -(P.ywL ?? 0) * DEG;
    J.ywR.rotation.y = (P.ywR ?? 0) * DEG;
    body.position.y = 0;
    // map folds: accordion, alternate valley / mountain; P.fold = interior angle between panels (180 = flat)
    const a = (180 - (P.fold ?? 170)) * DEG;
    folds.forEach((f, i) => { f.rotation.y = (i % 2 ? -a : a); });
    mapOff.rotation.y = -a / 2; // panels sit at ±a/2, a symmetric zig-zag about the attach direction
    mapOff.position.x = -PW * PANELS * Math.cos(a / 2) * (P.mapX ?? 0.5);
    // map -> sheet -> dart: the map shows until the dart exists; the dart until it is thrown
    const dv = Math.max(0, P.dart ?? 0), thrown = (P.thrown ?? 0) > 0.5;
    const showMap = (P.map ?? 1) > 0.5 && dv <= 0, showDart = dv > 0 && !thrown;
    for (const m of mapMeshes) m.visible = showMap;
    for (const m of dart.userData.meshes) m.visible = showDart;
    dart.scale.setScalar(dv < 0.15 ? 0.5 + 0.5 * dv / 0.15 : 1); // the closed map stack opens out to the sheet
    dart.userData.setState(dv <= 0.15 ? 0 : dv <= 1 ? (dv - 0.15) / 0.85 : Math.min(2, dv));
    root.updateMatrixWorld(true);
    // ground the lowest foot
    let minY = Infinity;
    for (const k of ['L', 'R']) { box.setFromObject(J['foot' + k], !!opt.precise); minY = Math.min(minY, box.min.y); }
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
    // dart: nose along the figure's facing, pitched up by dartPitch (printed face toward the figure), yawed, rolled
    dartHold.parent.getWorldQuaternion(q2);
    const wd = q.clone().multiply(new THREE.Quaternion().setFromEuler(e.set(-(P.dartPitch ?? 0) * DEG, (P.dartYaw ?? 0) * DEG, (P.dartRoll ?? 0) * DEG, 'YXZ')));
    dartHold.quaternion.copy(q2.invert().multiply(wd));
    root.updateMatrixWorld(true);
    return rig;
  }
  // play(name, tSeconds): evaluate an animation (ANIMS) and apply it. Loops wrap; one-shots clamp to their ends.
  function play(name, t) { return pose(evalAnim(name, t), { precise: true }); }
  const _w = new THREE.Vector3();
  function lanternWorld(v = new THREE.Vector3()) { return lan.g.localToWorld(v.copy(lan.g.userData.centre)); }
  // the dart's world transform (where a scene takes it over at release): position, quaternion, nose direction, matrix
  function dartWorld() {
    root.updateMatrixWorld(true);
    const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
    const matrix = dart.matrixWorld.clone();
    matrix.decompose(position, quaternion, scale);
    return { position, quaternion, dir: V(0, 0, 1).applyQuaternion(quaternion), matrix };
  }
  // the release: dartWorld() at ANIMS.throw_dart.release plus the hand's velocity there (m/s, central difference);
  // the current pose is restored afterwards
  function dartRelease() {
    const prev = cur, prevOpt = curOpt, A = ANIMS.throw_dart, tr = A.release * A.dur, h = 0.01;
    play('throw_dart', tr - h); const p0 = dartWorld().position;
    play('throw_dart', tr + h); const p1 = dartWorld().position;
    play('throw_dart', tr); const w = dartWorld();
    w.velocity = p1.sub(p0).divideScalar(2 * h);
    w.t = tr;
    if (prev) pose(prev, prevOpt);
    return w;
  }
  // aim the spot + beam (spot and beam live in world space so the frame can add them to its scene)
  function aim(target, a = {}) {
    root.updateMatrixWorld(true);
    const p = lanternWorld(_w);
    // raise 0..1 blends the two G2 states (o.raised forces one); the ends are exact so SF-04 is unchanged
    const k = a.raised !== undefined ? (a.raised ? 1 : 0) : (cur?.raise ?? (cur?.raised ? 1 : 0));
    const lerp = (x0, x1) => (k <= 0 ? x0 : k >= 1 ? x1 : x0 + (x1 - x0) * k);
    spot.position.copy(p);
    spot.target.position.copy(target);
    // §3.1: raise_lantern widens the beam 18° → 42° at ×2.2 intensity (read as the full cone; spot.angle is the half-angle)
    spot.intensity = a.intensity ?? lerp(125, 275);
    spot.angle = lerp(9, 21) * DEG;
    const d = target.clone().sub(p), L = d.length() * (a.reach ?? 1.05), t = Math.tan(spot.angle);
    beam.position.copy(p);
    beam.scale.set(t * L, L, t * L);
    beam.quaternion.setFromUnitVectors(V(0, -1, 0), d.normalize());
    beam.material.uniforms.uS.value = a.beam ?? lerp(0.035, 0.06);
    light.intensity = a.lanternI ?? lerp(4, 6);
    return rig;
  }
  function tris() { let t = 0; root.traverse(m => { if (m.isMesh) t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return t; }

  // hinges: 14 body + 2 shoulder yaw + bail + map attach + 4 map folds + dart hold + 4 dart folds = 27 (§3.1: ≤ 30)
  const rig = {
    root, J, pose, play, aim, spot, light, beam, lantern: lan, lanternWorld, paper, mapCanvas: mapC, tris,
    dart, dartWorld, dartRelease, anims: Object.keys(ANIMS),
    hinges: HINGES.length + YAW.length + 1 + 1 + folds.length + 1 + dart.userData.hinges,
  };
  pose(o.pose ?? 'idle');
  return rig;
}
