import { THREE, HEX, col, v3, makeCamera, groundMat, buildingMat, cityMesh, streetCity, glowMat, glowSprite, setFont, textC } from '../core.js';

/* PROPOSED triangle (locked at G4). The protocol's system positions are nearly collinear,
 * so the circuit is laid out as an upright triangle centred on K17's look-at (0, 0, −40).
 * INDEX (find) bottom-left → DEVOS (build) apex → AMOS (verify) bottom-right → back to INDEX. */
const CEN = { x: 0, z: -40 }, R = 36, LIFT = 32;
const V = [210, 90, 330].map(d => d * Math.PI / 180).map(a => ({ x: CEN.x + R * Math.cos(a), z: CEN.z - R * Math.sin(a) }));
const VCOL = ['lantern', 'hot', 'rain']; // INDEX, DEVOS, AMOS

function build() {
  const scene = new THREE.Scene();
  const fogD = 0.0042, fogC = col('ink');
  const tri = V.map(p => new THREE.Vector2(p.x, p.z));
  const triCol = VCOL.map(k => col(k, 0.9));
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), groundMat({
    base: col('ink'), line: col('gold'), node: col('hot'), iMinor: 0.04, iMajor: 0.3, iNode: 0.5, pulse: 1.6, time: 9.2, minorFade: 70,
    fogCol: fogC, fogD, tri, triCol, triProg: 3,
  })));
  scene.add(cityMesh(streetCity(), buildingMat({
    albedo: col('stone', 0.55), ambient: col('night', 5), top: col('night', 4), rim: col('night', 0.3),
    winWarm: col('lantern', 1.9), winCold: col('bone', 0.08), winGold: col('hot', 2), litBase: 0.42, litNear: 0,
    fogCol: fogC, fogD, tri, triCol,
  })));

  // the circuit: lifted above the roofs so it reads whole from the air
  const P = V.map(p => v3(p.x, LIFT, p.z));
  for (let i = 0; i < 3; i++) {
    const a = P[i], b = P[(i + 1) % 3], ca = col(VCOL[i]), cb = col(VCOL[(i + 1) % 3]);
    const curve = new THREE.LineCurve3(a, b);
    for (const [rad, k] of [[0.18, 3.2], [0.9, 0.22]]) {
      const geo = new THREE.TubeGeometry(curve, 64, rad, 10);
      const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), cc = new THREE.Color();
      const ab = b.clone().sub(a), L2 = ab.lengthSq();
      for (let j = 0; j < pos.count; j++) {
        const t = THREE.MathUtils.clamp(v3(pos.getX(j), pos.getY(j), pos.getZ(j)).sub(a).dot(ab) / L2, 0, 1);
        cc.copy(ca).lerp(cb, t).multiplyScalar(k);
        cols.set([cc.r, cc.g, cc.b], j * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      scene.add(new THREE.Mesh(geo, glowMat(new THREE.Color(1, 1, 1), { vertexColors: true, fogD })));
    }
  }
  // system pillars + beacons
  V.forEach((p, i) => {
    const c = col(VCOL[i]);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 10, 1, true), glowMat(c.clone().multiplyScalar(1.6), { head: 1, fogD }));
    pil.scale.y = LIFT;
    pil.position.set(p.x, LIFT / 2, p.z);
    scene.add(pil);
    const top = glowSprite(c.clone().multiplyScalar(2.2), 9); top.position.set(p.x, LIFT, p.z); scene.add(top);
    const core = glowSprite(c.clone().multiplyScalar(3), 2.4); core.position.set(p.x, LIFT, p.z); scene.add(core);
    const base = glowSprite(c.clone().multiplyScalar(1.2), 12); base.position.set(p.x, 0.5, p.z); scene.add(base);
  });
  // closure flare: the last edge (AMOS → INDEX) has just landed
  const fl = glowSprite(col('hot', 1.4), 22); fl.position.copy(P[0]); scene.add(fl);
  return scene;
}

function overlay(ctx, W, H) {
  const s = H / 1440;
  ctx.save();
  ctx.shadowColor = 'rgba(11,11,12,0.7)'; ctx.shadowBlur = 24 * s;
  ctx.fillStyle = HEX.bone; ctx.textBaseline = 'alphabetic';
  setFont(ctx, 300, 64 * s);
  textC(ctx, 'Find. Build. Verify.', W / 2, H * 0.86, 64 * s);
  // D5 / G1-P2: ATLAS credit in the pull-back, links to /atlas
  setFont(ctx, 400, 20 * s, 'Montserrat', 0.08);
  ctx.textAlign = 'right';
  const t = 'Everything stands on ATLAS.', x = W - W * 0.04, y = H - H * 0.05;
  ctx.fillStyle = HEX.gold;
  ctx.fillText(t, x, y);
  const w = ctx.measureText(t).width;
  ctx.shadowBlur = 0;
  ctx.fillRect(x - w, y + 10 * s, w - 20 * s * 0.08, Math.max(1, 1 * s));
  ctx.restore();
}

const common = {
  scene: 'Loop', bloom: [0.9, 0.6, 0.25], clear: HEX.ink,
  light: 'All three light colours present (--lantern INDEX, --atlas-gold-hot DEVOS, --rain AMOS). Fog thinning. City lights brightened (0.80).',
  tokens: ['ink', 'night', 'stone', 'gold', 'hot', 'lantern', 'rain', 'bone'],
  unknown: [],
  overlay,
};

export default {
  ...common,
  id: 'SF-07', moment: 'Aerial view, light circuit forming the AXIEL triangle', p: '0.85–0.90',
  key: 'K17', cam: '(0, 80, 20) → look (0, 0, −40) · FOV 74',
  proposed: [
    'Triangle layout: upright, circumradius 36, centred on (0, −40). INDEX bottom-left, DEVOS apex, AMOS bottom-right. The protocol positions are nearly collinear, so this is locked at G4.',
    'Circuit lifted to y = 32 (above the tallest roof) so it reads whole from the air. Its light also lands on the ground and the buildings beneath.',
    'Shown at the moment the circuit closes (0.90) from the K17 camera, so the "Find. Build. Verify." line and the triangle can be approved together.',
    'ATLAS credit bottom-right as a gold underlined link (D5 / G1-P2).',
  ],
  build() { return { scene: build(), camera: makeCamera(74, [0, 80, 20], [0, 0, -40]) }; },
};

export const alt = {
  ...common,
  id: 'SF-07b', moment: 'Alt: triangle complete from above (K18)', p: '0.90',
  key: 'K18', cam: '(0, 160, 0) → look (0, 0, −0.01) · FOV 74',
  proposed: ['Alternative framing for the §11.2 OG image (SF-07 aerial triangle). Same scene as SF-07.'],
  build() { return { scene: build(), camera: makeCamera(74, [0, 160, 0], [0, 0, -0.01]) }; },
};
