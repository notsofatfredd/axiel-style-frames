import { THREE, HEX, col, mixc, v3, rng, makeCamera, groundMat, buildingMat, cityMesh, streetCity, glowMat, glowSprite, sceneCopy, setFont, FAULT } from '../core.js';

// Readouts are D4 placeholders until the real AMOS run on axiel.co.za (G1-P5)
const READOUTS = [
  { t: 'LCP 1.2s', x: -1.6, z: -28.6 },
  { t: 'CLS 0.02', x: -2.2, z: -34.6 },
  { t: 'A11Y 98', x: 7.9, z: -28.1 },
  { t: 'NAV PASS', x: 7.9, z: -35.9 },
  { t: 'ERRORS 0', x: 4.0, z: -36.2, typing: true },
];
const RADII = [0.35, 0.75, 1.15];

export default {
  id: 'SF-06', scene: 'AMOS', moment: 'Overhead mirror with frozen rain and readouts in ripples', p: '0.79',
  key: 'K16', cam: '(4, 18, −32) → look (4, 0, −32.01) · FOV 40',
  bloom: [0.8, 0.5, 0.22], clear: HEX.ink,
  light: 'Cold soft overhead light (--rain), black mirror floor (planar reflection), rain mist. The repaired building in gold at the centre.',
  tokens: ['ink', 'rain', 'stone', 'bone', 'lantern', 'gold', 'hot', 'pass'],
  proposed: [
    'Readouts sit beside the ripple they came from, in JetBrains Mono, --signal-pass. The last one is still typing (40 ms per character).',
    'Repaired building marked by a gold roof edge and gold windows (the "repaired" state of the fault building).',
    'Rain frozen mid-fall: short --rain streaks, bright at the leading end.',
    'Ripples sit in the plaza around the repaired building and in the street.',
  ],
  unknown: ['Readout values are the D4 placeholders (LCP 1.2s, CLS 0.02, A11Y 98, NAV PASS, ERRORS 0). They are replaced by a real AMOS run before Phase 8 (G1-P5).'],
  build() {
    const scene = new THREE.Scene();
    const camera = makeCamera(40, [4, 18, -32], [4, 0, -32.01]);
    const dim = { value: 1 };
    const mist = col('rain', 0.05), fogD = 0.02;
    const world = new THREE.Group();
    scene.add(world);

    const list = streetCity().map(b => (b.isFault ? { ...b, fault: false, gold: true } : b));
    world.add(cityMesh(list, buildingMat({
      albedo: col('stone', 0.6), ambient: col('rain', 0.05), top: col('rain', 0.55), rim: col('rain', 0.14),
      winWarm: col('lantern', 1.4), winCold: col('bone', 0.1), winGold: col('hot', 2.0), litBase: 0.3, litNear: 0,
      fogCol: mist, fogD, dim,
    })));
    // repaired building: gold roof edge
    const y = FAULT.h + 0.03, hw = FAULT.w / 2 - 0.02, hd = FAULT.d / 2 - 0.02;
    const roofPts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]].map(([a, b]) => v3(FAULT.x + a, y, FAULT.z + b));
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(roofPts), new THREE.LineBasicMaterial({ color: col('hot', 3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(FAULT.w - 0.3, FAULT.d - 0.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col('gold', 0.18) }));
    roof.position.set(FAULT.x, y - 0.01, FAULT.z);
    world.add(roof);

    // frozen rain
    const r = rng(61), N = 5200;
    const rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), glowMat(col('rain', 1.5), { head: -1, dim, fogD }), N);
    const o = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      o.position.set(r.range(-9, 17), r.range(0.3, 16.5), r.range(-45, -19));
      const th = r.range(0.006, 0.013);
      o.scale.set(th, r.range(0.35, 1.0), th);
      o.updateMatrix();
      rain.setMatrixAt(i, o.matrix);
      rain.setColorAt(i, c.setScalar(r.range(0.5, 1.4)));
    }
    rain.frustumCulled = false;
    world.add(rain);

    // black mirror floor (ATLAS ground still faintly underneath)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), groundMat({
      alpha: 0.58, base: mixc('ink', 'rain', 0.04), line: col('gold'), node: col('hot'),
      iMinor: 0.0, iMajor: 0.07, iNode: 0.12, pulse: 0, fogCol: mist, fogD,
    }));
    scene.add(floor);

    // ripples: big ones carry readouts, small ones are rain landing
    const ring = (x, z, rad, k) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(rad - 0.012, rad + 0.012, 160).rotateX(-Math.PI / 2), glowMat(col('rain', k)));
      m.position.set(x, 0.03, z);
      scene.add(m);
    };
    for (const R of READOUTS) {
      RADII.forEach((rad, i) => ring(R.x, R.z, rad, [1.6, 0.9, 0.45][i]));
      const s = glowSprite(col('pass', 0.9), 0.5); s.position.set(R.x, 0.05, R.z); scene.add(s);
    }
    for (let i = 0; i < 46; i++) {
      const x = r() < 0.6 ? r.range(-4.3, 1.3) : r.range(-1, 9), z = r.range(-40, -24);
      if (x > 1.3 && x < 6.7 && z > -34.7 && z < -29.3) continue;
      ring(x, z, r.range(0.06, 0.28), r.range(0.3, 0.8));
    }
    return { scene, camera, mirror: { world, floor, dim, strength: 0.7 } };
  },
  overlay(ctx, W, H, project) {
    const s = H / 1440;
    ctx.save();
    setFont(ctx, 500, 26 * s, 'mono', 0.04);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (const R of READOUTS) {
      const p = project(v3(R.x, 0, R.z)), e = project(v3(R.x + RADII[2], 0, R.z));
      const x = e.x + 18 * s;
      ctx.strokeStyle = HEX.pass; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1, 1.2 * s);
      ctx.beginPath(); ctx.moveTo(p.x + (e.x - p.x) * 0.36, p.y); ctx.lineTo(x - 6 * s, p.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowColor = 'rgba(11,11,12,0.8)'; ctx.shadowBlur = 10 * s;
      ctx.fillStyle = HEX.pass;
      ctx.fillText(R.t, x, p.y);
      if (R.typing) {
        const w = ctx.measureText(R.t).width;
        ctx.fillRect(x + w + 6 * s, p.y - 13 * s, 14 * s, 26 * s);
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    sceneCopy(ctx, W, H, { name: 'AMOS', line: 'AMOS checks the result. Independently.', accent: HEX.rain });
  },
};
