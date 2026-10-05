import { THREE, HEX, col, mixc, rng, makeCamera, tokenEnv, keyLight, sceneCopy, sceneCounter, DEG } from '../core.js';
import { makeCity, makeGround, makeFaultBuilding, stainDecal, FB } from '../kit/city.js';
import { PI, leaderLabel } from './util.js';

/* AMOS freeze labels (§5.3 D4): each hangs on one frozen drop. Values are the protocol's D4 set.
   Anchors sit inside the K16 frustum (camera x −2): right-hand drops at x ≤ 8.5 (screen x ≈ 1170 of 1440) so the leader hangs outboard on screen. */
const LABELS = [
  { t: 'LCP 1.2s', at: [-6.5, 15.5, -32], off: [-70, -40] },
  { t: 'CLS 0.02', at: [-9.0, 8.5, -34], off: [-70, 30] },
  { t: 'A11Y 98', at: [7.0, 16.5, -31], off: [70, -40] },
  { t: 'NAV PASS', at: [8.5, 9.5, -35], off: [70, 20] },
  { t: 'ERRORS 0', at: [7.5, 3.6, -33], off: [80, 30] },
];
const SLANT = 12 * DEG; // rain leans toward the camera (+z)

function frozenRain(n, seed) {
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const mat = new THREE.MeshPhysicalMaterial({ color: col('rain'), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.55,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, depthWrite: false });
  const im = new THREE.InstancedMesh(geo, mat, n + LABELS.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-SLANT, 0, 0)), s = new THREE.Vector3(), p = new THREE.Vector3();
  let i = 0;
  for (; i < n; i++) {
    const rad = r.range(0.018, 0.04);
    p.set(r.range(-22, 18), r.range(0.2, 22), r.range(-37.6, -13));
    s.set(rad, rad * r.range(2.2, 3.4), rad);
    im.setMatrixAt(i, m4.compose(p, q, s));
  }
  for (const L of LABELS) { const rad = 0.06; im.setMatrixAt(i++, m4.compose(p.set(...L.at), q, s.set(rad, rad * 2.6, rad))); }
  im.renderOrder = 2;
  return im;
}

/* beads sitting on the repaired window glass and the gold-leaf nameplate */
function beads(seed, tier) {
  const r = rng(seed);
  const geo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2); // dome facing +z
  const mat = new THREE.MeshPhysicalMaterial({ color: col('bone'), roughness: 0.03, metalness: 0, transparent: true, opacity: 0.5,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, depthWrite: false });
  const W = FB.win, P = FB.plate;
  const nWin = tier === 'mid' ? 220 : 420, nPlate = tier === 'mid' ? 50 : 90;
  const im = new THREE.InstancedMesh(geo, mat, nWin + nPlate);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < nWin + nPlate; i++) {
    const onWin = i < nWin, B = onWin ? W : P;
    const rad = r.range(0.015, 0.05) * (r() < 0.1 ? 1.8 : 1);
    p.set(r.range(B.x0 + 0.05, B.x1 - 0.05), r.range(B.y0 + 0.05, B.y1 - 0.05), FB.z + (onWin ? -0.055 : 0.085));
    s.set(rad, rad * r.range(1, 1.5), rad * 0.6);
    im.setMatrixAt(i, m4.compose(p, q, s));
  }
  im.renderOrder = 3;
  return im;
}

export default {
  id: 'SF-06', scene: 'AMOS', moment: 'Face-on to the façade, drops frozen. The repaired window and nameplate are beaded, one stain remains on the neighbour, and labels hang on the frozen drops', p: '0.79',
  key: 'K16', cam: 'Face-on to the façade; drops freeze',
  bloom: null, clear: HEX.night,
  light: 'Cold rain light from above (--rain directional, steep, shadowed) with a rain-over-ink hemisphere. Rain mist fog. No warm light and no bloom: AMOS is the cold, independent check.',
  tokens: ['night', 'ink', 'graphite', 'stone', 'bone', 'paper', 'rain', 'gold', 'red', 'pass'],
  proposed: [
    'Static frozen drops (G2-5): about 1500 on high, 600 on mid, leaning 12° toward the camera.',
    'Beads on the repaired window glass and nameplate.',
    'The stain on the neighbour\'s fascia level at (−12, 8): --signal-red soaked into its sign.',
    'Labels in --signal-pass mono (cap ≈ 18px at 1440), each with a leader to its own frozen drop.',
    'No mirror floor in this frame: at K16 the street floor is below the frame (the frustum meets the façade at y 0.35). The mirror reads at K14 / K15.',
  ],
  unknown: ['Label values are the protocol\'s D4 set, not a real AMOS run. Real readings replace them at G3.'],
  audit: [
    ['Frozen drops', 'Time stops for the check', 'The AMOS rain (§5.3), real drops not particles'],
    ['Labels on drops', 'The results of the check, in place', 'AMOS metrics, --signal-pass'],
    ['Beaded window and nameplate', 'The fix holds up under the rain', 'The repaired share card and gold-leaf nameplate (G2-1)'],
    ['Stain on the neighbour', 'AMOS checks independently: it finds what isn\'t ours too', '--signal-red, one stain only'],
    ['Wet façade', 'Material truth after rain', 'The same building from SF-04'],
    ['AMOS line', 'Names the part', 'Copy "AMOS checks the result. Independently."'],
  ],
  async build({ renderer, tier }) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(mixc('night', 'rain', 0.22), 0.011);
    scene.environment = tokenEnv(renderer, [col('rain', 0.7), mixc('night', 'rain', 0.3), col('ink')]);
    keyLight(scene, { pos: [-2, 44, -22], target: [4, 8, -39], color: col('rain'), intensity: PI * 0.75, extent: 24, far: 90, map: tier === 'mid' ? 1024 : 2048, bias: -0.0003, normalBias: 0.04 });
    scene.add(new THREE.HemisphereLight(col('rain'), col('ink'), PI * 0.14));
    scene.add(makeGround({ wet: true }));
    scene.add(makeCity({ tier, wet: 1 }));
    scene.add(await makeFaultBuilding({ state: 'repaired', wet: true, cardGlow: 0.18, hiGlow: 0 }));
    const stain = stainDecal({ seed: 2, w: 4.2, h: 4.2 });
    stain.position.set(-12, 8, -38.98);
    scene.add(stain);
    scene.add(frozenRain(tier === 'mid' ? 600 : 1500, 61));
    scene.add(beads(62, tier));
    // K16 slid 6 left (still face-on) so the repaired window sits right of the bottom-left copy column
    const camera = makeCamera(40, [-2, 8, -9], [-2, 11, -39]);
    return { scene, camera, camNote: 'K16 slid 6 units left, face-on kept, so the copy clears the window (PROPOSED). Mirror floor not in frame at K16.' };
  },
  overlay(ctx, vp, project) {
    const { u } = vp;
    for (const L of LABELS) {
      const a = project(new THREE.Vector3(...L.at));
      leaderLabel(ctx, vp, L.t, a, { x: a.x + L.off[0] * u, y: a.y + L.off[1] * u });
    }
    sceneCopy(ctx, vp, { name: 'AMOS', line: 'AMOS checks the result. Independently.', accent: HEX.pass });
    sceneCounter(ctx, vp, 6, 'AMOS', HEX.bone);
  },
};
