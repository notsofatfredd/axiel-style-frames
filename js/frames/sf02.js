import { THREE, HEX, col, rng, makeCamera, glowMat, groundMat, glowTexture, GOLDEN_ANGLE } from '../core.js';

export default {
  id: 'SF-02', scene: 'Fall', moment: 'Mid-fall, particles streaking past', p: '0.12',
  key: 'K3', cam: '(0, −40, −4) → look (0, −80, −6) · FOV 74 · roll +8°',
  bloom: [1.05, 0.7, 0.12], clear: HEX.ink,
  light: 'No key light. Emissive gold particles only, exponential --ink fog.',
  tokens: ['ink', 'gold', 'hot'],
  proposed: [
    'Particles already leaning into a loose golden-angle spiral (the 0.12→0.16 collapse is just starting).',
    'A faint hint of the ATLAS grid far below, almost lost in fog.',
    'Roll direction (+8° chosen; protocol allows ±8°).',
  ],
  unknown: [],
  build() {
    const scene = new THREE.Scene();
    const camera = makeCamera(74, [0, -40, -4], [0, -80, -6], 8 * Math.PI / 180);
    const fogD = 0.021;
    const r = rng(23);

    // streaks: unit cylinder, bright head on top (we fall, they rush up past us)
    const N = 2800;
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    const mesh = new THREE.InstancedMesh(geo, glowMat(new THREE.Color(1, 1, 1), { fogD, head: 1 }), N);
    const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const y = r.range(-92, -38);
      const rad = 1.5 + 30 * Math.sqrt(r());
      const a = i * GOLDEN_ANGLE + (y + 40) * 0.06 + r.range(-0.25, 0.25);
      o.position.set(Math.cos(a) * rad, y, -6 + Math.sin(a) * rad);
      const tan = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      o.quaternion.setFromUnitVectors(up, up.clone().addScaledVector(tan, 0.22).normalize());
      const len = r.range(1.2, 6.5), th = r.range(0.01, 0.034);
      o.scale.set(th, len, th);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      const k = r();
      c.copy(k < 0.72 ? col('gold') : col('hot')).multiplyScalar(r.range(1.4, 4.2));
      mesh.setColorAt(i, c);
    }
    mesh.frustumCulled = false;
    scene.add(mesh);

    // fine motes
    const M = 1600, pos = new Float32Array(M * 3), cols = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) {
      const rad = 30 * Math.sqrt(r()), a = r() * Math.PI * 2;
      pos.set([Math.cos(a) * rad, r.range(-90, -41), -6 + Math.sin(a) * rad], i * 3);
      c.copy(r() < 0.6 ? col('gold') : col('hot')).multiplyScalar(r.range(0.6, 2.2));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
      size: 0.16, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    })));

    // near-lens bokeh for depth
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, rad = r.range(1.4, 2.6);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col(r() < 0.5 ? 'gold' : 'hot', r.range(0.08, 0.18)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sp.position.set(Math.cos(a) * rad, -40 - r.range(2.5, 4.5), -4 + Math.sin(a) * rad);
      sp.scale.setScalar(r.range(0.6, 1.3));
      scene.add(sp);
    }

    // the grid below, barely there
    const g = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), groundMat({
      fogD, fogCol: col('ink'), iMinor: 0.0, iMajor: 0.22, iNode: 0.35, minorFade: 1, pulse: 0,
    }));
    g.position.y = -96;
    scene.add(g);
    return { scene, camera };
  },
  overlay() {},
};
