import { THREE, HEX, rng, makeCamera, setFont, textC, sceneCopy, sceneCounter, DEG } from '../core.js';
import { makeSheet, fibres, paperMesh, KEY_DIR, KEY_COL } from '../paper.js';
import { makeSeal, makeTag, makeString } from '../kit/seal.js';
import { PI } from './util.js';

const SEAL = { x: -2.2, y: 0.55, R: 1.2 };
const TAG = { x: 2.9, y: -0.2, rot: -6 * DEG };

export default {
  id: 'SF-08', scene: 'Seal', moment: 'The official AXIEL symbol pressed into red wax, "INTAKE CLOSED", and the waitlist specimen tag', p: '0.98',
  key: 'K20', cam: 'Locked on the seal. Hold 0.98 → 1.00',
  tone: THREE.NoToneMapping, bloom: null, clear: HEX.paper,
  light: 'Back on the paper: the SF-01 light (soft warm key from top-left, ambient paper bounce, no fog). The seal, tag and string take the same key as real lights at the paper calibration (key 0.92, ambient 0.42), with soft contact shadows on the paper.',
  tokens: ['paper', 'bone', 'stone', 'ink', 'red'],
  proposed: [
    'Seal R 1.2 at (−2.2, 0.55): the official symbol raised in --signal-red wax with a plain rim (G2-3).',
    '"INTAKE CLOSED" printed in --signal-red on the paper under the seal (Montserrat 500, +0.2em).',
    'Tag 4.2 × 3.0 at (2.9, −0.2), turned −6°, with "SPECIMEN No." header; the number is stamped on submit (§9.3).',
    'The string runs from the tag\'s eyelet to under the wax.',
  ],
  unknown: ['The submit control on the tag: label and position not set.', 'The "What do you need?" options (§9.3).'],
  audit: [
    ['Wax seal', 'Closes the film: intake is shut', 'Official AXIEL symbol, generated in code from the raster (G2-3)'],
    ['INTAKE CLOSED', 'States the status plainly', 'Copy, --signal-red'],
    ['Specimen tag', 'The waitlist form, as an object you fill in', 'Specimen-catalogue tag (R8f), fields from §9.3'],
    ['String', 'Ties the tag to the seal: you join the next window', 'Plain bone string, no ornament'],
    ['Paper', 'Back where the film began', 'The SF-01 paper wall, healed'],
    ['Seal line', 'Says what to do next', 'Copy "Intake is closed. Join the list for the next window."'],
  ],
  async build() {
    const scene = new THREE.Scene();
    const camera = makeCamera(40, [0, 0, 10], [0, 0, 0]);
    const W = 14, H = 7.875;
    const sh = makeSheet(4096, 2304, W, H);
    const r = rng(808);
    fibres(sh, r, 9000);
    // "INTAKE CLOSED" printed under the seal (red ink, slight press into the paper)
    const cap = 0.2, px = cap * sh.ppu / 0.7;
    const [tx, ty] = sh.px(SEAL.x, SEAL.y - SEAL.R - 0.55);
    for (const [c, a] of [[sh.cc, 1], [sh.hc, 0.5]]) {
      c.save(); c.textBaseline = 'alphabetic'; c.globalAlpha = a;
      c.fillStyle = c === sh.cc ? HEX.red : '#000';
      setFont(c, 500, px, 'Montserrat', 0.2);
      textC(c, 'INTAKE CLOSED', tx, ty, px, 0.2);
      c.restore();
    }
    // the wax sheds a little oil into the paper around its foot
    sh.cc.save(); sh.cc.globalAlpha = 0.05; sh.cc.fillStyle = HEX.stone;
    const [sx, sy] = sh.px(SEAL.x, SEAL.y); sh.cc.filter = 'blur(18px)';
    sh.cc.beginPath(); sh.cc.arc(sx, sy, SEAL.R * 1.12 * sh.ppu, 0, Math.PI * 2); sh.cc.fill(); sh.cc.restore();
    scene.add(paperMesh(sh, { key: 0.92, amb: 0.42, bump: 1.4 }));

    // real lights at the paper calibration, for the objects lying on it
    const key = new THREE.DirectionalLight(KEY_COL, PI * 0.92);
    key.position.copy(KEY_DIR).multiplyScalar(12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
    Object.assign(key.shadow.camera, { left: -7.5, right: 7.5, top: 4.5, bottom: -4.5, near: 1, far: 30 });
    scene.add(key, key.target);
    scene.add(new THREE.AmbientLight(0xffffff, PI * 0.42));
    // contact shadows on the paper (the paper shader takes no scene lights)
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShadowMaterial({ opacity: 0.22 }));
    catcher.position.z = 0.002; catcher.receiveShadow = true;
    scene.add(catcher);

    const seal = await makeSeal({ R: SEAL.R });
    seal.position.set(SEAL.x, SEAL.y, 0.004);
    scene.add(seal);
    const tag = makeTag({});
    tag.position.set(TAG.x, TAG.y, 0);
    tag.rotation.z = TAG.rot;
    scene.add(tag);
    tag.updateMatrixWorld(true);
    const eye = tag.localToWorld(new THREE.Vector3(tag.userData.eyelet[0], tag.userData.eyelet[1], 0));
    scene.add(makeString([eye.x, eye.y], [SEAL.x + 0.5, SEAL.y - 0.35], { sag: 0.3 }));
    return { scene, camera };
  },
  overlay(ctx, vp) {
    sceneCopy(ctx, vp, { name: 'SEAL', line: 'Intake is closed. Join the list for the next window.', color: HEX.ink, accent: HEX.stone, shadow: false });
    sceneCounter(ctx, vp, 8, 'SEAL', HEX.stone);
  },
};
