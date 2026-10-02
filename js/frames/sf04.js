import { THREE, HEX, col, v3, makeCamera, groundMat, buildingMat, cityMesh, streetCity, sky, lantern, beam, pointAlong, sceneCopy, setFont, FAULT } from '../core.js';

const LANTERN = v3(-0.8, 1.04, -22.5);   // §3.1: drifts at 1.0, bob ±0.08 (frozen near top of bob)
const AIM = v3(4.2, 3.2, -31);

export default {
  id: 'SF-04', scene: 'INDEX', moment: 'Lantern guide light lighting a row of buildings, one flickering', p: '0.36–0.39',
  key: 'K8', cam: '(−3, 2.0, −18) → look (6, 4, −30) · FOV 54',
  bloom: [0.85, 0.6, 0.22], clear: HEX.night,
  light: 'Lantern point light (--lantern, range 14, decay 2) + beam cone at the 42° raised width. Faint --night moonlight. Dense blue (--night) fog. Matte dark concrete, glowing windows.',
  tokens: ['night', 'ink', 'stone', 'lantern', 'hot', 'bone', 'gold', 'red'],
  proposed: [
    'Windows warm up with the Lantern\'s light (beam sweep 0.35→0.38 shown complete).',
    'Fault building at (4, −32) flickers cold --bone, standing in a small plaza (also used by AMOS).',
    'Fault tags in JetBrains Mono, --signal-red, pinned to the fault building. Their timing is not set (G5).',
    'Faint ATLAS grid still visible under the street.',
  ],
  unknown: [],
  build() {
    const scene = new THREE.Scene();
    const camera = makeCamera(54, [-3, 2.0, -18], [6, 4, -30]);
    const fogC = col('night', 1.6), fogD = 0.036;
    const lanCol = col('lantern', 30);
    const bDir = AIM.clone().sub(LANTERN).normalize();
    scene.add(sky(col('night'), col('night', 1.7), col('ink')));

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), groundMat({
      albedo: col('stone', 0.45), ambient: col('night', 4), base: col('ink'),
      line: col('gold'), node: col('hot'), iMinor: 0.0, iMajor: 0.05, iNode: 0.08, pulse: 0,
      lanternPos: LANTERN, lanternCol: lanCol, lanternRange: 14, fogCol: fogC, fogD,
    })));

    scene.add(cityMesh(streetCity(), buildingMat({
      albedo: col('stone', 0.6), ambient: col('night', 5), top: col('night', 3), rim: col('night', 0.6),
      lanternPos: LANTERN, lanternCol: lanCol, lanternRange: 14, beamDir: bDir, beamCos: Math.cos(21 * Math.PI / 180), beamGain: 3,
      winWarm: col('lantern', 2.6), winCold: col('bone', 0.06), winFault: col('bone', 1.1),
      litBase: 0.05, litNear: 0.78, litGain: 40, fogCol: fogC, fogD, time: 4.13,
    })));

    const L = lantern({ halo: 1.8, haloSize: 1.8 });
    L.position.copy(LANTERN);
    L.rotation.y = 0.5;
    scene.add(L);
    const b = beam(col('lantern', 0.32), 12, 21, { fogD });
    pointAlong(b, LANTERN, AIM);
    scene.add(b);
    return { scene, camera };
  },
  overlay(ctx, W, H, project) {
    const s = H / 1440;
    const a = project(v3(FAULT.x + FAULT.w / 2, FAULT.h + 0.2, FAULT.z - FAULT.d / 2));
    const x0 = a.x + 26 * s, y0 = a.y - 70 * s;
    ctx.save();
    ctx.strokeStyle = HEX.red; ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x0, y0 + 26 * s); ctx.lineTo(x0 + 18 * s, y0 + 26 * s); ctx.stroke();
    ctx.fillStyle = HEX.red; ctx.beginPath(); ctx.arc(a.x, a.y, 4 * s, 0, Math.PI * 2); ctx.fill();
    setFont(ctx, 400, 22 * s, 'mono', 0.02);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ['Missing meta description', 'Page not indexed'].forEach((t, i) => {
      const y = y0 + 26 * s + i * 46 * s, x = x0 + 26 * s;
      const w = ctx.measureText(t).width + 28 * s;
      ctx.globalAlpha = 0.78; ctx.fillStyle = HEX.graphite; ctx.fillRect(x, y - 18 * s, w, 36 * s);
      ctx.globalAlpha = 1; ctx.fillStyle = HEX.red; ctx.fillRect(x, y - 18 * s, 3 * s, 36 * s);
      ctx.fillText(t, x + 16 * s, y + 1 * s);
    });
    ctx.restore();
    sceneCopy(ctx, W, H, { name: 'INDEX', line: "INDEX finds what search can't see.", accent: HEX.lantern });
  },
};
