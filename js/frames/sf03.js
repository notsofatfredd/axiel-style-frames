import { HEX, makeCamera, sceneCounter } from '../core.js';
import { buildChasm } from './sf02.js';

export default {
  id: 'SF-03', scene: 'ATLAS', moment: 'The face-on climb: veins lit, a carved line read face-on, specimens embedded beside it', p: '0.17',
  key: 'K4', cam: 'Face-on: carved line 2',
  phone: true,
  bloom: [0.6, 0.5, 0.6], clear: HEX.ink,
  light: 'The gold veins are the key: --atlas-gold-hot emissive in the veins and the carved line (the only bloom). Tear daylight and the paper-wall bounce stay as fill. Ink exponential fog.',
  tokens: ['ink', 'graphite', 'stone', 'bone', 'gold', 'hot'],
  proposed: [
    'Carved line cap height 0.22 (line 2 "on ATLAS.").',
    'Phone key: K4 backed off to (0, −22, −1.0), distance 5. The chasm is only 6 deep (paper wall at z 0), so it cannot back off further.',
    'Specimens at (−3.7, −23.2) and (3.6, −20.8) flank the line on desktop.',
  ],
  unknown: [
    'Phone finding: at 390 wide no specimen fits beside the line inside the chasm. Proposal for G4: on phone, place a specimen above or below each carved line so one passes during the K4a → K4c climb.',
  ],
  audit: [
    ['Carved line', 'States the brand truth face-on', 'Canon "Everything stands on ATLAS." split over three lines (F7)'],
    ['Lit gold veins', 'The foundation waking: the scene\'s key light', 'ATLAS gold (--atlas-gold-hot)'],
    ['Specimens beside the line', 'Proof under the claim', 'AXIEL\'s own work only (G2-2)'],
    ['Dressed stone panel', 'Gives the line a readable ground', 'Masonry of the strata, not a UI card'],
    ['Scroll counter', 'Where you are in eight scenes', 'Specimen-catalogue numbering'],
  ],
  async build({ renderer, tier, vp }) {
    const { scene } = await buildChasm(renderer, { tier, vein: 1, carveGlow: 0.6, tear: 1400 });
    const camera = vp.phone
      ? makeCamera(74, [0, -22, -1.0], [0, -22, -6])
      : makeCamera(74, [0, -22, -2.5], [0, -22, -6]);
    return { scene, camera, camNote: vp.phone ? 'Phone: K4 backed off along its axis to distance 5 (PROPOSED).' : null };
  },
  overlay(ctx, vp) { sceneCounter(ctx, vp, 3, 'ATLAS', HEX.bone); },
};
