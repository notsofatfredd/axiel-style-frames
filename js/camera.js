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
  ['K4a', 0.15, [0, -40, -2.5], [0, -40, -6], 74, 'Face-on: carved line 1', [[0, -40, -0.95], [0, -40, -6]], 'G4: phone backed off 0.05 so line 1 keeps the 24 px margin'],
  ['K4', 0.17, [0, -22, -2.5], [0, -22, -6], 74, 'Face-on: carved line 2', [[0, -22, -1.0], [0, -22, -6]]],
  ['K4c', 0.19, [0, -6, -2.5], [0, -6, -6], 74, 'Face-on: carved line 3', [[0, -6, -1.0], [0, -6, -6]]],
  ['K4b', 0.20, [0, 3, -3.5], [0, 2, -14], 74, 'Above lip height, still in the chasm'],
  ['K5', 0.21, [0, 1.6, -9], [0, 1.2, -40], 74, 'Crest the lip, skim the plateau'],
  ['K6', 0.23, [2, 1.6, -8], [-4.3, 0.34, -26.9], 54, 'City accretes; behind the Cartographer', null, 'G5: look target pushed out along the same ray to 20 (protocol (0, 1.2, −14), 6.3 away); same view, the turn on phone 141 → under 120°/s'],
  ['K7', 0.30, [1, 1.6, -20], [-1.82, 0.47, -39.8], 54, 'Following the walk', null, 'G5: look target pushed out along the same ray to 20 (protocol (0, 1.2, −27)); same view'],
  ['K8', 0.36, [-6, 2.4, -28], [6, 6, -44], 54, 'Beam sweep, buildings light'],
  ['K9', 0.40, [0.8, 1.5, -35.4], [7.3, -1.0, -44.4], 54, 'Fold the dart', null, 'G5: look target pushed out along the same ray (2.3 → 11.5 away); same view, the climb to K10 no longer whips the view'],
  ['K9h', 0.42, [0.8, 1.5, -35.4], [7.3, -1.0, -44.4], 54, 'Hold on the fold until the throw', null, 'G5: new hold key; the camera watches fold_dart (0.40) through to throw_dart (0.42)'],
  ['K10', 0.44, [1, 24, -33], [5.56, 20.59, -60], 54, 'Follow the dart up', [[2, 24, -33], [6.6, 22.5, -66]], 'G4: climbs over the fault roof (protocol (−6, 8, −40) → (8, 20, −70) cut the fault building). G5: p 0.43 → 0.44 after the K9 hold, looks at the dart where it is at 0.44'],
  ['K11', 0.48, [24, 26, -82], [10, 24, -92], 54, 'Orbit start; the Core wakes'],
  ['K12', 0.54, [10, 25, -107], [10, 26.2, -92], 54, 'Orbit 120°, closer; the tiers turn', null, 'SF-05: backed off to distance 15, aimed at y 26.2 (protocol (10, 26, −104) → (10, 24, −92))'],
  ['K13', 0.59, [-4, 28, -90], [10, 23, -92], 54, 'Orbit 240°; the fix is released'],
  ['K14', 0.62, [4, 60, -44], [4, 0, -44.01], 40, 'Overhead; the fix seats'],
  ['K15', 0.70, [4, 34, -20], [4, 12, -42], 40, 'Arc back and down'],
  ['K16', 0.79, [-2, 8, -9], [-2, 11, -39], 40, 'Face-on to the façade; drops freeze', null, 'SF-06: slid 6 left, face-on kept (protocol x 4)'],
  ['K17', 0.85, [6, 5, -27.4], [4, 5.2, -39], 54, 'Repaired window read up close', [[6.37, 4.81, -24.75], [4.3, 6, -39]], 'SF-07: look lowered to y 5.2 (protocol 6); phone backed off. G4: desktop 0.4 closer so the card reads 18 px; phone look 0.3 right so the nameplate keeps its margin'],
  ['K17b', 0.88, [6, 6, -23.5], [-6, 5, -18], 54, 'Turn back; the look-at sweeps sideways', [[5, 6, -23], [-6, 5, -18]], 'G4: pulled back onto the street (protocol x 10 sat in the alley and the arc cut the shop and brochure plots)'],
  ['K18', 0.90, [6, 5, -14], [6, 4, 0], 54, 'The ranked result on the back of the paper wall', [[0, 2.6, -17.2], [0, 1.6, 0]], 'SF-07b: desktop slid to x 6 (protocol x 0); phone backed off. G4: both 2 / 1.3 closer so the description reads 18 / 14 px'],
  ['K18b', 0.92, [0, 2, -7], [0, 0.5, 0], 60, 'Approach the tear from the lip', null, 'G4: raised 0.5 so the descent clears the cliff lip by 1.5'],
  ['K19', 0.94, [0, -1.1, 2.5], [0, -1.1, 12], 60, 'Through the tear; the tear heals behind', null, 'G8: lowered 1.5 (protocol y 0.4) with the tear, which moved under the copy (js/kit/paperwall.js TEAR); the return crossing clears the torn edge by 1.59 desktop, 1.98 phone'],
  ['K19b', 0.96, [0, 0, 8], [10, 0, 8], 50, 'Mid turn-around', null, 'G5: look target 4 → 10 away (same ray), level with K19 and K20; the turn-around peak 215 → 135°/s desktop'],
  ['K20', 0.98, [0, 0, 10], [0, 0, 0], 40, 'Locked on the seal. Hold to 1.00'],
].map(([key, p, pos, look, fov, note, phone = null, g2 = null]) => ({ key, p, pos, look, fov, note, phone, g2 }));

// scenes and counters (§4.2)
export const SCENES = [
  [0.00, 'Surface'], [0.07, 'Fall'], [0.13, 'ATLAS'], [0.22, 'INDEX'], [0.42, 'DEVOS'], [0.60, 'AMOS'], [0.80, 'Proof'], [0.90, 'Seal'],
];
export const sceneAt = (p) => { let i = 0; for (let k = 0; k < SCENES.length; k++) if (p >= SCENES[k][0]) i = k; return { n: i + 1, name: SCENES[i][1] }; };

// a spline whose key points sit at known arc-length fractions, so each segment can be walked at even speed.
// A key where the path doubles back (chords in and out more than 150° apart, e.g. the bottom of the Fall at K3b)
// is a cusp: the point is doubled so the curve stops there instead of overshooting past it (G4: the overshoot
// at K3b nodded the view 11° in 0.0006 of p). A key in STOPS is treated the same way: a held beat the camera
// arrives at and leaves from without carrying momentum through it.
export const STOPS = new Set(['K9', 'K9h']);   // the fold (§5.3 fold_dart 0.40, throw_dart 0.42), held K9 → K9h (G5); without the stop the climb to K10 dragged the camera to 0.1 above the ground (G4)
class KeyedSpline {
  constructor(pts, stops = new Set()) {
    const DIV = 240, V = pts.map(v => new THREE.Vector3(...v)), R = [];
    this.in = []; this.out = []; this.cusps = [];
    V.forEach((v, i) => {
      const cusp = i > 0 && i < V.length - 1 && (stops.has(i) || v.clone().sub(V[i - 1]).angleTo(V[i + 1].clone().sub(v)) > 150 * DEG);
      this.in.push(R.length); if (cusp) { R.push(v); this.cusps.push(i); }
      this.out.push(R.length); R.push(v);
    });
    this.c = new THREE.CatmullRomCurve3(R, false, 'catmullrom', 0.5);
    this.c.arcLengthDivisions = DIV * (R.length - 1);
    const L = this.c.getLengths(), total = L[L.length - 1];
    this.u = R.map((_, j) => L[j * DIV] / total);
  }
  at(i, f, out = new THREE.Vector3()) { const a = this.u[this.out[i]], b = this.u[this.in[i + 1]]; return this.c.getPointAt(Math.min(1, a + (b - a) * f), out); }
}

const cache = {};
function splines(phone) {
  const k = phone ? 'phone' : 'desk', stops = new Set(KEYS.flatMap((K, i) => (STOPS.has(K.key) ? [i] : [])));
  return cache[k] ??= {
    pos: new KeyedSpline(KEYS.map(K => (phone && K.phone ? K.phone[0] : K.pos)), stops),
    look: new KeyedSpline(KEYS.map(K => (phone && K.phone ? K.phone[1] : K.look)), stops),
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
