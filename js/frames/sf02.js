import { THREE, HEX, col, makeCamera, tokenEnv, keyLight, sceneCounter, DEG } from '../core.js';
import { makeStrata } from '../kit/strata.js';
import { PI } from './util.js';

/* The chasm between the paper wall (z 0) and the strata cliff (z −6), shared by SF-02 and SF-03.
   §2.3 Fall / ATLAS: key = the gold veins (when lit); fill = faint bone bounce off the paper wall's back face; ink exponential fog.
   Daylight from the tear above rakes straight down the cliff, so the carving and the specimens read in relief. */
export async function buildChasm(renderer, o = {}) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(HEX.ink, o.fog ?? 0.04);
  scene.environment = tokenEnv(renderer, [col('bone', 0.22), col('graphite', 0.5), col('ink')]);
  const strata = await makeStrata({ vein: o.vein ?? 0, carveGlow: o.carveGlow ?? 0 });
  scene.add(strata);
  // daylight falling through the tear (r 3 at the origin), raking the cliff
  keyLight(scene, { spot: true, pos: [0, 1.5, -1.2], target: [0, -30, -6], color: col('paper'), intensity: o.tear ?? 2600,
    angle: 38 * DEG, penumbra: 0.9, decay: 2, map: o.tier === 'mid' ? 1024 : 2048, far: 90, bias: -0.0005, normalBias: 0.03 });
  // bounce from the lit back face of the paper wall (behind the camera, facing −z)
  const b = new THREE.DirectionalLight(col('bone'), PI * (o.bounce ?? 0.035));
  b.position.set(0, -10, 10); b.target.position.set(0, -24, -6);
  scene.add(b, b.target);
  scene.add(new THREE.HemisphereLight(col('bone'), col('ink'), PI * 0.012));
  return { scene, strata };
}

export default {
  id: 'SF-02', scene: 'Fall', moment: 'Mid-fall past the strata, specimens passing in shadow, veins dark', p: '0.10',
  key: 'K3', cam: 'Falling past the newest layers, roll 8°',
  bloom: null, clear: HEX.ink, exposure: 1,
  light: 'Daylight from the tear above rakes straight down the cliff (paper-white spot, soft shadow). Faint bone bounce from the paper wall\'s back face. Veins dark. Ink exponential fog takes the depth.',
  tokens: ['ink', 'graphite', 'stone', 'bone', 'paper', 'gold'],
  proposed: [
    'Twelve specimen niches as stand-ins (002 to 013): the AXIEL symbol, axiel.co.za as built, and agent graphs. The real twelve are chosen at G3.',
    'Strata thicknesses and the dressed panel behind each carved line (6.2 wide).',
    'Daylight through the tear as the only key while the veins are dark.',
  ],
  unknown: [],
  audit: [
    ['Strata cliff', 'Shows depth and age: everything stands on layers', 'ATLAS as geology, from the canon "Everything stands on ATLAS"'],
    ['Specimen niches', 'Proof of past work embedded in the foundation', 'AXIEL\'s own work only (G2-2)'],
    ['Dark veins', 'Holds back the reveal for SF-03', 'The gold of ATLAS before it wakes'],
    ['Daylight from the tear', 'Says where we fell from', 'The paper wall from SF-01'],
    ['Scroll counter', 'Where you are in eight scenes', 'Specimen-catalogue numbering'],
  ],
  async build({ renderer, tier }) {
    const { scene } = await buildChasm(renderer, { tier, vein: 0, carveGlow: 0 });
    const camera = makeCamera(74, [0, -14, -3], [0, -22, -6], 8 * DEG);
    return { scene, camera };
  },
  overlay(ctx, vp) { sceneCounter(ctx, vp, 2, 'FALL', HEX.bone); },
};
