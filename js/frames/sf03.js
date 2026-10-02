import { THREE, HEX, col, mixc, rng, makeCamera, groundMat, sky, glowTexture, sceneCopy } from '../core.js';

export default {
  id: 'SF-03', scene: 'ATLAS', moment: 'Grid stretching to horizon, low angle', p: '0.21',
  key: 'K5', cam: '(0, 0.6, 5) → look (0, 0.5, −60) · FOV 74',
  bloom: [0.95, 0.55, 0.1], clear: HEX.ink,
  light: 'Grid is the light (emissive). Low gold ambient at the horizon. Exponential --ink fog fades the grid out.',
  tokens: ['ink', 'gold', 'hot', 'bone'],
  proposed: [
    'Grid pitch: 1-unit minor lines, 5-unit major lines, glowing nodes at major crossings.',
    'Light pulses travelling along a few major lines (the system is running).',
    'Gold dust motes hanging over the grid for depth.',
    'Copy placement bottom-left: system name small, line large. System-line timing is still open (G5).',
  ],
  unknown: [],
  build() {
    const scene = new THREE.Scene();
    const camera = makeCamera(74, [0, 0.6, 5], [0, 0.5, -60]);
    const horizon = mixc('ink', 'gold', 0.07);
    scene.add(sky(col('ink'), horizon, col('ink'), 0.05));
    const g = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), groundMat({
      fogD: 0.019, fogCol: horizon, base: col('ink'), line: col('gold'), node: col('hot'),
      iMinor: 0.16, iMajor: 0.62, iNode: 1.1, pulse: 2.4, time: 3.7, minorFade: 46,
    }));
    scene.add(g);

    const r = rng(5), M = 1100;
    const pos = new Float32Array(M * 3), cols = new Float32Array(M * 3), c = new THREE.Color();
    for (let i = 0; i < M; i++) {
      pos.set([r.range(-26, 26), 0.08 + Math.pow(r(), 2.2) * 5, r.range(3, -70)], i * 3);
      c.copy(col(r() < 0.75 ? 'gold' : 'hot')).multiplyScalar(r.range(0.4, 1.6));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
      size: 0.07, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })));
    return { scene, camera };
  },
  overlay(ctx, W, H) {
    sceneCopy(ctx, W, H, { name: 'ATLAS', line: 'Everything stands on ATLAS.', accent: HEX.gold });
  },
};
