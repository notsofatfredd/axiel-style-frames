import { THREE, HEX, col, mixc, v3, makeCamera, groundMat, buildingMat, cityMesh, streetCity, sky, glowMat, crystalMat, glowSprite, sceneCopy, setFont, textC, FAULT } from '../core.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const C = v3(10, 12, -80);  // scaffold centre: K11–K13 orbit target
const HW = 2.5, HH = 2.75;  // cage half-sizes: the repaired building is 5 × 5.5 × 5
const UP = new THREE.Vector3(0, 1, 0);

function bar(a, b, t, mat) {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, d.length() + t * 0.6, t), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
function streak(from, to, color, r) {
  const d = to.clone().sub(from);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 6, 1, true), glowMat(color, { head: 1 }));
  m.scale.y = d.length();
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
function stampTexture() {
  const W = 1600, H = 400, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.strokeStyle = HEX.hot; x.fillStyle = HEX.hot;
  x.lineWidth = 6; x.strokeRect(40, 70, W - 80, H - 140);
  x.lineWidth = 2; x.strokeRect(58, 88, W - 116, H - 176);
  x.lineWidth = 7; // lock-in brackets
  for (const [bx, by, sx, sy] of [[8, 38, 1, 1], [W - 8, 38, -1, 1], [8, H - 38, 1, -1], [W - 8, H - 38, -1, -1]]) {
    x.beginPath(); x.moveTo(bx, by + sy * 70); x.lineTo(bx, by); x.lineTo(bx + sx * 70, by); x.stroke();
  }
  setFont(x, 500, 92, 'mono', 0.06);
  x.textBaseline = 'middle';
  textC(x, 'SPECIMEN No. 001 · VERIFIED', W / 2, H / 2 + 4, 92, 0.06);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function blueprint(color) {
  return new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uC: { value: color } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uC; varying vec2 vUv;
      float ln(float q, float w){ return 1.0 - min(abs(fract(q - 0.5) - 0.5) / (fwidth(q) * w), 1.0); }
      float box(vec2 p, float h, float w){ vec2 d = abs(p) - vec2(h); return 1.0 - smoothstep(0.0, w, abs(max(d.x, d.y))); }
      void main(){
        vec2 p = (vUv - 0.5) * 10.0;
        float fade = smoothstep(5.0, 2.8, max(abs(p.x), abs(p.y)));
        float g = max(ln(p.x / 0.5, 1.0), ln(p.y / 0.5, 1.0)) * 0.22 + max(ln(p.x / 2.5, 1.6), ln(p.y / 2.5, 1.6)) * 0.45;
        vec3 c = uC * (g * fade + box(p, 2.5, 0.045) * 2.2 + box(p, 4.8, 0.03) * 0.7);
        gl_FragColor = vec4(c, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
}

export default {
  id: 'SF-05', scene: 'DEVOS', moment: 'Scaffold half-built, a stamp locking in', p: '0.54',
  key: 'K12', cam: '(10, 16, −96) → look (10, 12, −80) · FOV 54',
  bloom: [0.75, 0.55, 0.42], clear: HEX.ink,
  light: 'Gold point lights inside the scaffold, warm bounce, light haze. Verified pieces brushed gold metal; unverified pieces translucent glass.',
  tokens: ['ink', 'gold', 'hot', 'bone', 'lantern', 'night', 'stone'],
  proposed: [
    'The 24 pieces = 8 posts + 12 beams + 4 braces around the repaired building’s 5 × 5.5 × 5 volume. Shown: 13 gold, 1 stamping, 6 glass, 4 arriving.',
    'Stamp plate on the front middle beam, frozen at the EASE_STAMP overshoot (scale 1.035), with lock-in brackets.',
    'Specialist units, D3: Copy = plane (left), Design = prism (right), Code = cube lattice (top). Each links to the glass piece it is working on. No on-screen labels.',
    'Blueprint unfolded under the scaffold. The INDEX thread arrives from the fault building in the city below.',
    'Brushed (anisotropic) finish comes at asset production (G7). Here it is gold metal at roughness 0.34.',
  ],
  unknown: [],
  build({ renderer }) {
    const scene = new THREE.Scene();
    const camera = makeCamera(54, [10, 16, -96], [10, 12, -80]);
    const haze = mixc('ink', 'gold', 0.05);
    const fogD = 0.011;
    scene.fog = new THREE.FogExp2(haze, fogD);
    scene.add(sky(col('ink'), haze, col('ink')));
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    pm.dispose();

    // city far below, still running
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), groundMat({
      base: col('ink'), line: col('gold'), node: col('hot'), iMinor: 0.05, iMajor: 0.32, iNode: 0.5, pulse: 1.2, time: 6.1, fogCol: haze, fogD,
    })));
    scene.add(cityMesh(streetCity(), buildingMat({
      albedo: col('stone', 0.5), ambient: col('night', 4), top: col('night', 2.5), rim: col('night', 0.4),
      winWarm: col('lantern', 1.7), winCold: col('bone', 0.05), winFault: col('bone', 1.0), litBase: 0.2, litNear: 0, fogCol: haze, fogD, time: 7.7,
    })));

    // thread of light from the fault building up to the blueprint
    const curve = new THREE.CatmullRomCurve3([v3(FAULT.x, FAULT.h + 0.2, FAULT.z), v3(5, 8.5, -48), v3(8.2, 10.4, -66), v3(C.x, C.y - HH - 0.08, C.z)]);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.035, 8), glowMat(col('hot', 2.4), { fogD })));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.16, 8), glowMat(col('gold', 0.22), { fogD })));

    const rig = new THREE.Group();
    rig.position.copy(C);
    scene.add(rig);
    const bp = blueprint(col('gold', 1.3));
    bp.position.y = -HH - 0.06;
    rig.add(bp);
    const tip = glowSprite(col('hot', 2.2), 1.2);
    tip.position.set(0, -HH - 0.08, 0);
    rig.add(tip);

    // gold area lights within the scaffold + warm bounce
    for (const y of [-1.2, 1.4]) { const l = new THREE.PointLight(col('hot'), 55, 14, 2); l.position.set(0, y, 0.4); rig.add(l); }
    scene.add(new THREE.HemisphereLight(col('gold'), col('ink'), 0.35));

    const gold = new THREE.MeshPhysicalMaterial({ color: col('gold'), metalness: 1, roughness: 0.34 });
    const stampGold = new THREE.MeshPhysicalMaterial({ color: col('gold'), metalness: 1, roughness: 0.3, emissive: col('hot'), emissiveIntensity: 0.55 });
    const glass = crystalMat(col('bone', 0.9), col('hot'), { i: 0.85, fogD });
    const glassEdge = new THREE.LineBasicMaterial({ color: col('hot', 0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

    const P = (x, y, z) => v3(x * HW, y * HH, z * HW);
    const K = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; // z = −1 is the face toward camera
    const pieces = [];
    K.forEach(([x, z]) => pieces.push([P(x, -1, z), P(x, 0, z), 'gold']));
    K.forEach(([x, z], i) => { const [x2, z2] = K[(i + 1) % 4]; pieces.push([P(x, -1, z), P(x2, -1, z2), 'gold']); });
    ['gold', 'gold', 'glass', 'glass'].forEach((s, i) => { const [x, z] = K[i], [x2, z2] = K[(i + 1) % 4]; pieces.push([P(x, -1, z), P(x2, 0, z2), s]); });
    ['stamp', 'gold', 'gold', 'gold'].forEach((s, i) => { const [x, z] = K[i], [x2, z2] = K[(i + 1) % 4]; pieces.push([P(x, 0, z), P(x2, 0, z2), s]); });
    ['glass', 'arriving', 'glass', 'arriving'].forEach((s, i) => { const [x, z] = K[i]; pieces.push([P(x, 0, z), P(x, 1, z), s]); });
    ['glass', 'arriving', 'glass', 'arriving'].forEach((s, i) => { const [x, z] = K[i], [x2, z2] = K[(i + 1) % 4]; pieces.push([P(x, 1, z), P(x2, 1, z2), s]); });
    console.assert(pieces.length === 24, 'scaffold must be 24 pieces');

    const T = 0.17;
    const glassMids = [];
    for (const [a, b, s] of pieces) {
      if (s === 'gold' || s === 'stamp') { rig.add(bar(a, b, T, s === 'stamp' ? stampGold : gold)); continue; }
      let A = a, B = b;
      if (s === 'arriving') {
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const off = mid.clone().setY(mid.y * 0.4).normalize().multiplyScalar(1.7).add(v3(0, 0.7, 0));
        A = a.clone().add(off); B = b.clone().add(off);
        const m2 = A.clone().add(B).multiplyScalar(0.5);
        rig.add(streak(m2.clone().add(off.clone().multiplyScalar(1.8)), m2, col('hot', 0.9), 0.05));
      }
      const m = bar(A, B, T, glass);
      rig.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), glassEdge);
      e.position.copy(m.position); e.quaternion.copy(m.quaternion);
      rig.add(e);
      if (s === 'glass') glassMids.push(A.clone().add(B).multiplyScalar(0.5));
    }

    // the building taking shape inside
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(HW * 1.72, HH * 1.9, HW * 1.72), crystalMat(col('hot', 0.32), col('gold'), { i: 0.5, fogD }));
    rig.add(ghost);

    // stamp locking in on the front middle beam
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.475), new THREE.MeshBasicMaterial({
      map: stampTexture(), color: new THREE.Color(2.2, 2.2, 2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    plate.position.set(0, 0, -HW - 0.16);
    rig.add(plate);
    rig.updateMatrixWorld(true);
    plate.lookAt(camera.position);
    plate.scale.setScalar(1.035);
    const flash = glowSprite(col('hot', 0.9), 3.4);
    flash.position.set(0, 0, -HW - 0.1);
    rig.add(flash);

    // specialist units (D3)
    const edgeMat = new THREE.LineBasicMaterial({ color: col('hot', 2.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const unit = (geo, pos, rot) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, crystalMat(col('hot', 0.9), col('gold'), { i: 1, fogD })));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      g.add(glowSprite(col('hot', 0.5), 1.6));
      g.position.copy(pos); g.rotation.set(...rot);
      rig.add(g);
      return g;
    };
    const copyU = unit(new THREE.PlaneGeometry(1.2, 0.85), v3(-4.4, 1.0, -0.9), [0.1, 0.55, -0.08]);
    for (let i = 0; i < 4; i++) { // lines of copy on the plane
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(i === 3 ? 0.5 : 0.86, 0.035), new THREE.MeshBasicMaterial({ color: col('hot', 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ln.position.set(i === 3 ? -0.18 : 0, 0.22 - i * 0.14, 0.002);
      copyU.add(ln);
    }
    unit(new THREE.CylinderGeometry(0.52, 0.52, 0.95, 3, 1), v3(4.5, 0.2, -0.5), [0.2, 0.4, 0.12]);
    const lat = [], n = 3, s = 1.05 / n;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const a = -0.525 + i * s, b = -0.525 + j * s;
      lat.push(-0.525, a, b, 0.525, a, b, a, -0.525, b, a, 0.525, b, a, b, -0.525, a, b, 0.525);
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lat, 3));
    const code = new THREE.Group();
    code.add(new THREE.LineSegments(lg, edgeMat));
    code.add(glowSprite(col('hot', 0.5), 1.8));
    code.position.set(1.4, 4.5, 0.2); code.rotation.set(0.5, 0.7, 0.2);
    rig.add(code);
    // each unit works on a glass piece
    // glassMids: [back brace, left brace, front-left post, back-right post, front top beam, back top beam]
    [[copyU.position, glassMids[1]], [v3(4.5, 0.2, -0.5), glassMids[3]], [code.position, glassMids[4]]].forEach(([u, g]) => {
      if (g) rig.add(streak(u.clone(), g.clone(), col('gold', 0.9), 0.012));
    });
    return { scene, camera };
  },
  overlay(ctx, W, H) {
    sceneCopy(ctx, W, H, { name: 'DEVOS', line: 'DEVOS builds the fix, and proves each part.', accent: HEX.gold });
  },
};
