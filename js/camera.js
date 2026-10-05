/*
 * The one camera (§4.1): position and look-at on separate CatmullRom splines (tension 0.5, open),
 * both driven by scroll progress p. Keys are §4.3; where a G2 style frame moved a key, the frame's key is
 * used and marked `g2` (PROPOSED, listed in the README). Each segment between two keys is sampled by arc
 * length, so the camera moves at an even speed inside it. FOV is interpolated linearly per segment (easing
 * is G5). Roll is zero everywhere except the Fall (§4.1 rule 4).
 */
import * as THREE from 'three';

const DEG = Math.PI / 180;

// [key, p, position, look-at, fov, note, phone override [position, look-at] or null, g2 amendment or null]
export const KEYS = [
  ['K0', 0.00, [0, 0, 10], [0, 0, 0], 40, 'Facing the paper wall'],
  ['K1', 0.06, [0, 0, 6], [0, 0, 0], 40, 'Push in to the crack'],
  ['K2', 0.08, [0, 0, 1], [0, -3, -6], 60, 'Through the tear, facing the cliff'],
  ['K3', 0.10, [0, -14, -3], [0, -22, -6], 74, 'Falling past the newest layers, roll ±8°'],
  ['K3b', 0.12, [0, -58, -3], [0, -60, -6], 74, 'Bedrock. Roll 0. Veins ignite'],
  ['K4a', 0.15, [0, -40, -2.5], [0, -40, -6], 74, 'Face-on: carved line 1', [[0, -40, -1.0], [0, -40, -6]]],
  ['K4', 0.17, [0, -22, -2.5], [0, -22, -6], 74, 'Face-on: carved line 2', [[0, -22, -1.0], [0, -22, -6]]],
  ['K4c', 0.19, [0, -6, -2.5], [0, -6, -6], 74, 'Face-on: carved line 3', [[0, -6, -1.0], [0, -6, -6]]],
  ['K4b', 0.20, [0, 3, -3.5], [0, 2, -14], 74, 'Above lip height, still in the chasm'],
  ['K5', 0.21, [0, 1.6, -9], [0, 1.2, -40], 74, 'Crest the lip, skim the plateau'],
  ['K6', 0.23, [2, 1.6, -8], [0, 1.2, -14], 54, 'City accretes; behind the Cartographer'],
  ['K7', 0.30, [1, 1.6, -20], [0, 1.2, -27], 54, 'Following the walk'],
  ['K8', 0.36, [-6, 2.4, -28], [6, 6, -44], 54, 'Beam sweep, buildings light'],
  ['K9', 0.40, [0.8, 1.5, -35.4], [2.1, 1.0, -37.2], 54, 'Fold the dart'],
  ['K10', 0.43, [-6, 8, -40], [8, 20, -70], 54, 'Follow the dart up'],
  ['K11', 0.48, [24, 26, -82], [10, 24, -92], 54, 'Orbit start; the Core wakes'],
  ['K12', 0.54, [10, 25, -107], [10, 26.2, -92], 54, 'Orbit 120°, closer; the tiers turn', null, 'SF-05: backed off to distance 15, aimed at y 26.2 (protocol (10, 26, −104) → (10, 24, −92))'],
  ['K13', 0.59, [-4, 28, -90], [10, 23, -92], 54, 'Orbit 240°; the fix is released'],
  ['K14', 0.62, [4, 60, -44], [4, 0, -44.01], 40, 'Overhead; the fix seats'],
  ['K15', 0.70, [4, 34, -20], [4, 12, -42], 40, 'Arc back and down'],
  ['K16', 0.79, [-2, 8, -9], [-2, 11, -39], 40, 'Face-on to the façade; drops freeze', null, 'SF-06: slid 6 left, face-on kept (protocol x 4)'],
  ['K17', 0.85, [6, 5, -27], [4, 5.2, -39], 54, 'Repaired window read up close', [[6.37, 4.81, -24.75], [4, 6, -39]], 'SF-07: look lowered to y 5.2 (protocol 6); phone backed off'],
  ['K17b', 0.88, [10, 6, -24], [-6, 5, -18], 54, 'Turn back; the look-at sweeps sideways'],
  ['K18', 0.90, [6, 5, -16], [6, 4, 0], 54, 'The ranked result on the back of the paper wall', [[0, 2.6, -18.5], [0, 1.6, 0]], 'SF-07b: desktop slid to x 6 (protocol x 0); phone backed off'],
  ['K18b', 0.92, [0, 1.5, -7], [0, 0.5, 0], 60, 'Approach the tear from the lip'],
  ['K19', 0.94, [0, 0.4, 2.5], [0, 0.4, 12], 60, 'Through the tear; the tear heals behind'],
  ['K19b', 0.96, [0, 0, 8], [4, 0, 8], 50, 'Mid turn-around'],
  ['K20', 0.98, [0, 0, 10], [0, 0, 0], 40, 'Locked on the seal. Hold to 1.00'],
].map(([key, p, pos, look, fov, note, phone = null, g2 = null]) => ({ key, p, pos, look, fov, note, phone, g2 }));

// scenes and counters (§4.2)
export const SCENES = [
  [0.00, 'Surface'], [0.07, 'Fall'], [0.13, 'ATLAS'], [0.22, 'INDEX'], [0.42, 'DEVOS'], [0.60, 'AMOS'], [0.80, 'Proof'], [0.90, 'Seal'],
];
export const sceneAt = (p) => { let i = 0; for (let k = 0; k < SCENES.length; k++) if (p >= SCENES[k][0]) i = k; return { n: i + 1, name: SCENES[i][1] }; };

// a spline whose key points sit at known arc-length fractions, so each segment can be walked at even speed
class KeyedSpline {
  constructor(pts) {
    const DIV = 240;
    this.c = new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v)), false, 'catmullrom', 0.5);
    this.c.arcLengthDivisions = DIV * (pts.length - 1);
    const L = this.c.getLengths(), total = L[L.length - 1];
    this.u = pts.map((_, i) => L[i * DIV] / total);
  }
  at(i, f, out = new THREE.Vector3()) { return this.c.getPointAt(Math.min(1, this.u[i] + (this.u[i + 1] - this.u[i]) * f), out); }
}

const cache = {};
function splines(phone) {
  const k = phone ? 'phone' : 'desk';
  return cache[k] ??= {
    pos: new KeyedSpline(KEYS.map(K => (phone && K.phone ? K.phone[0] : K.pos))),
    look: new KeyedSpline(KEYS.map(K => (phone && K.phone ? K.phone[1] : K.look))),
  };
}

// roll: one swing out to 8° at K3 and back to 0 at K3b, only between K2 and K3b (PROPOSED reading of "±8°")
function rollAt(p) {
  const a = 0.08, b = 0.12;
  if (p <= a || p >= b) return 0;
  return 8 * DEG * Math.sin(Math.PI * (p - a) / (b - a));   // peaks at K3 (p 0.10, the midpoint)
}

/* camera state at progress p: { pos, look, fov, roll, key (last key passed), seg, f } */
export function cameraAt(p, phone = false) {
  p = Math.min(1, Math.max(0, p));
  const S = splines(phone);
  let i = 0;
  while (i < KEYS.length - 2 && p >= KEYS[i + 1].p) i++;
  const A = KEYS[i], B = KEYS[i + 1];
  const f = Math.min(1, Math.max(0, (p - A.p) / (B.p - A.p)));
  return { pos: S.pos.at(i, f), look: S.look.at(i, f), fov: A.fov + (B.fov - A.fov) * f, roll: rollAt(p), key: f >= 1 ? B.key : A.key, seg: i, f };
}

export function applyCamera(cam, p, phone = false) {
  const s = cameraAt(p, phone);
  cam.position.copy(s.pos); cam.fov = s.fov; cam.up.set(0, 1, 0); cam.lookAt(s.look);
  if (s.roll) cam.rotateZ(s.roll);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  return s;
}
