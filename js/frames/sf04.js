import { THREE, HEX, col, mixc, makeCamera, tokenEnv, sceneCopy, sceneCounter } from '../core.js';
import { makeCity, makeGround, makeFaultBuilding } from '../kit/city.js';
import { makeCartographer } from '../kit/cartographer.js';
import { bakeRig, PI } from './util.js';

/* Night street lighting shared by INDEX and Proof: night-sky hemisphere + a dim cold moon (no shadow).
   The sky colour is already dark and Neutral tone mapping squares everything under ~0.03 linear, so the strength
   sits higher than it looks: at 0.85 / 0.2 the façades land near the --night sky value instead of crushing to
   black (66% of SF-04 measured ≤ 4/255 at 0.22 / 0.05). The lantern-lit areas are unchanged. */
export function nightLights(scene, o = {}) {
  scene.add(new THREE.HemisphereLight(mixc('night', 'rain', 0.35), col('ink'), PI * (o.sky ?? 0.85)));
  const moon = new THREE.DirectionalLight(mixc('rain', 'bone', 0.3), PI * (o.moon ?? 0.2));
  moon.position.set(-30, 50, 10); moon.target.position.set(0, 0, -40);
  scene.add(moon, moon.target);
}

/* the Cartographer placed, posed and aimed, then baked for the still (spot, its target and the beam go to the scene) */
export async function placeCartographer(scene, at, face, target, o = {}) {
  const rig = await makeCartographer({ pose: o.pose ?? 'raise_lantern', spotShadow: o.spotShadow });
  rig.root.position.set(...at);
  rig.root.rotation.y = Math.atan2(face[0] - at[0], face[1] - at[2]);
  rig.pose(o.pose ?? 'raise_lantern');
  rig.aim(new THREE.Vector3(...target), { raised: true, ...(o.aim ?? {}) });
  if (o.shadowMap) rig.spot.shadow.mapSize.set(o.shadowMap, o.shadowMap);
  scene.add(bakeRig(rig.root), rig.spot, rig.spot.target, rig.beam);
  return rig;
}

export default {
  id: 'SF-04', scene: 'INDEX', moment: 'The Cartographer raises the lantern. The beam lights a row of website buildings; the fault building shows an empty display window and a blank nameplate by the door', p: '0.36',
  key: 'K8', cam: 'Beam sweep, buildings light',
  // threshold 0: the bloom source is already lantern-only (panes measured ≈ 0.63, a 0.5 cut left almost nothing)
  bloom: [0.8, 0.5, 0], clear: HEX.night,
  light: 'Lantern spot (--lantern, 21°, soft shadow) and the lantern\'s own point light are the key. Night moonlight fill (night-sky hemisphere, dim cold moon, no shadow). Dense blue fog in --night. Only the lantern panes and flame bloom.',
  tokens: ['night', 'ink', 'graphite', 'stone', 'bone', 'paper', 'lantern', 'gold', 'rain'],
  proposed: [
    'Cartographer at (1.8, 0, −34.6) facing the fault building, lantern raised, beam on the window and nameplate.',
    'Cartographer form: a pleated paper tunic to mid-thigh and the map held open low in the right hand, outboard of the body, so folds and map carry the silhouette (G2-6).',
    'Beam 18° → 42° read as the full cone angle (half-angle 9° → 21°).',
    'Buildings the beam has passed keep a low bone window light (read as "indexed"). Not bloom.',
    'Display window 6 × 5.2 and nameplate 4.2 × 1.55, sized so the email line fits at the legibility cap (G2-1 faults: empty window = no share preview, blank nameplate = no business details).',
    'City block map is provisional (G2-8, docs/city-plot-map.md).',
  ],
  unknown: [],
  audit: [
    ['The Cartographer', 'INDEX in person: the one who walks the web and finds faults', 'Folded from the same paper as the wall (G2-6)'],
    ['Lantern beam', 'Shows what INDEX is looking at', 'The --lantern token, the only warm light in the city'],
    ['Empty display window', 'Fault 1: axiel.co.za has no share preview', 'Real gap from the live site (G2-1, M9)'],
    ['Blank nameplate by the door', 'Fault 2: no business details for Google', 'Real gap from the live site (G2-1, M9)'],
    ['Website buildings', 'The web as a city: every building is a site', 'Archetypes from the block map (brochure, shop, app)'],
    ['Fascia sign', 'What the site does have: its title and description', 'Live axiel.co.za meta, verbatim (title PROPOSED per G2-9)'],
    ['INDEX line', 'Names the part', 'Copy "INDEX finds what search can\'t see."'],
  ],
  async build({ renderer, tier }) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(HEX.night, 0.018);
    scene.environment = tokenEnv(renderer, [col('night', 1.4), col('night'), col('ink')]);
    nightLights(scene);
    scene.add(makeGround({}));
    scene.add(makeCity({ tier, lit: 0.55 }));
    scene.add(await makeFaultBuilding({ state: 'empty' }));
    await placeCartographer(scene, [1.8, 0, -34.6], [4, -39], [4.4, 3.4, -39], { shadowMap: tier === 'mid' ? 1024 : 2048 });
    const camera = makeCamera(54, [-6, 2.4, -28], [6, 6, -44]);
    return { scene, camera };
  },
  overlay(ctx, vp) {
    sceneCopy(ctx, vp, { name: 'INDEX', line: 'INDEX finds what search can\'t see.', accent: HEX.lantern });
    sceneCounter(ctx, vp, 4, 'INDEX', HEX.bone);
  },
};
