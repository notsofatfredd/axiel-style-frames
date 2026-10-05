import { THREE, HEX, col, mixc, makeCamera, tokenEnv, keyLight, MAT, sceneCopy, sceneCounter } from '../core.js';
import { makeCity, makeGround, makeFaultBuilding } from '../kit/city.js';
import { makeCore, makeFixKit } from '../kit/livingcore.js';
import { PI } from './util.js';

export default {
  id: 'SF-05', scene: 'DEVOS', moment: 'PROPOSED: the Core awake, the dart\'s map unfolded above it, the fix fragments forming, one stamp locking in', p: '0.54',
  key: 'K12', cam: 'Orbit 120°, closer; the tiers turn',
  bloom: [0.4, 0.35, 0.55], clear: HEX.graphite,
  light: 'PROPOSED: a low, warm raking key from the right (--atlas-gold-hot mixed half to --paper, so the city keeps its stone and only the Core reads gold), hard shadow across the tiers. Bounce: bone sky, graphite ground. Light haze in graphite. The paper wall\'s back face closes the horizon. Bloom only on the hot seams, the two lit filaments and the stamp.',
  tokens: ['graphite', 'ink', 'stone', 'bone', 'paper', 'gold', 'hot'],
  proposed: [
    'The whole SF-05 hero moment (protocol marks it PROPOSED).',
    'DEVOS key light: low warm gold-hot raking key.',
    'Core: max radius 6, three tiers + three brass rings on a stepped stone plinth (G2-7).',
    'Fix kit: the map unfolded 5.3 above the crown, five gold-leaf filaments to the two findings and the route, 24 fragments (glass while forming, gold leaf once set).',
    'Stamp "SPECIMEN No. 001 · VERIFIED" locking onto the crown front.',
    'The paper wall\'s back face as the horizon behind the city.',
  ],
  unknown: [],
  audit: [
    ['The Living Core', 'DEVOS as a machine you can watch work', 'Brass, graphite and gold leaf of the ATLAS palette, on strata stone (G2-7)'],
    ['Unfolded map', 'The INDEX findings handed to DEVOS', 'The Cartographer\'s own map, folded into the dart'],
    ['Gold filaments', 'Each fix traced back to a finding', 'ATLAS gold'],
    ['Fix fragments', 'The fix being built part by part', 'Glass and gold leaf, no particles'],
    ['Stamp', 'Each part is proven', 'Copy "SPECIMEN No. 001 · VERIFIED" (G1-P4)'],
    ['Paper wall horizon', 'Keeps the world inside the page', 'The SF-01 paper, seen from behind'],
    ['DEVOS line', 'Names the part', 'Copy "DEVOS builds the fix, and proves each part."'],
  ],
  async build({ renderer, tier }) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(HEX.graphite, 0.008);
    scene.environment = tokenEnv(renderer, [col('bone', 0.5), col('graphite', 0.35), col('graphite', 0.4)], { keyDir: new THREE.Vector3(1, 0.3, -0.2), keyCol: col('hot', 2) });
    // low warm raking key from the right: gold-hot half mixed to paper, so stone stays stone and the Core is the only gold
    keyLight(scene, { pos: [52, 34, -104], target: [10, 22, -92], color: mixc('hot', 'paper', 0.5), intensity: PI * 1.25, extent: 18, far: 140, map: tier === 'mid' ? 1024 : 2048, bias: -0.0003, normalBias: 0.04 });
    scene.add(new THREE.HemisphereLight(col('bone'), col('graphite'), PI * 0.1));
    // the paper wall's back face (z 0, facing −z): the horizon of the whole world
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(420, 320).translate(0, 150, 0), MAT.paper({ k: 'bone', side: THREE.FrontSide }));
    wall.rotation.y = Math.PI;
    scene.add(wall);
    scene.add(makeGround({}));
    scene.add(makeCity({ tier }));
    scene.add(await makeFaultBuilding({ state: 'empty' }));
    scene.add(makeCore({ state: 'awake', turn: 18 }));
    scene.add(await makeFixKit({}));
    // K12 backed off to 15 and aimed up 2.2 so the unfolded map (the INDEX findings) sits whole inside the frame
    const camera = makeCamera(54, [10, 25, -107], [10, 26.2, -92]);
    return { scene, camera, camNote: 'K12 pulled back to distance 15, aimed at y 26.2, so the map above the crown is in frame (PROPOSED).' };
  },
  overlay(ctx, vp) {
    sceneCopy(ctx, vp, { name: 'DEVOS', line: 'DEVOS builds the fix, and proves each part.', accent: HEX.hot });
    sceneCounter(ctx, vp, 5, 'DEVOS', HEX.bone);
  },
};
