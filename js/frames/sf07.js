import { THREE, HEX, col, rng, makeCamera, tokenEnv, setFont, wrap, sceneCopy, sceneCounter, TAU } from '../core.js';
import { makeSheet, fibres, paperMesh } from '../paper.js';
import { makeCity, makeGround, makeFaultBuilding, SITE, FB } from '../kit/city.js';
import { nightLights, placeCartographer } from './sf04.js';
import { PI } from './util.js';

const CLOSING = 'Found by INDEX. Built by DEVOS. Checked by AMOS. All of it on ATLAS.';

/* ---------- SF-07 · K17 · the repaired window read up close ---------- */
export default {
  id: 'SF-07', scene: 'Proof', moment: 'The repaired building lit in the beam, with the share card in its window read up close, the description highlighted', p: '0.85',
  key: 'K17', cam: 'Repaired window read up close',
  phone: true,
  // threshold 0: the source is already hot/lantern-only; the highlight (≈ 0.37) never cleared a 0.55 cut
  bloom: [0.6, 0.45, 0], clear: HEX.night,
  light: 'The lantern beam is the key, on the repaired window (the Cartographer stands out of frame to the left). Night moonlight fill. Fog thinning. The highlighted description and the lantern bloom.',
  tokens: ['night', 'ink', 'graphite', 'stone', 'bone', 'paper', 'gold', 'hot', 'lantern'],
  proposed: [
    'K17 itself (protocol marks it PROPOSED).',
    'Share card in the window: the real title and description, with the AXIEL symbol standing in for the og:image (cap 0.25).',
    'Description highlighted in --atlas-gold-hot.',
    'The façade still wet from the AMOS rain (continuity from SF-06).',
    'Cartographer at (−3.5, 0, −32.5), out of frame left, beam on the window (at (−1.5, 0, −33) the lantern showed in the bottom-left corner once K17 looked lower).',
    'Phone key: K17 backed off along its axis to distance 14.5, camera (6.37, 4.81, −24.75).',
    'Desktop key: K17 looks at (4, 5.2, −39), not (4, 6, −39), so the 4.2 × 1.55 nameplate sits whole above the frame edge (bottom ≈ 756 of 810; at y 6 the email line was cut).',
  ],
  unknown: [
    'Card legibility: cap 0.25 reads ≈ 16px at 1440×810 and ≈ 18px at 1440×900 (the §7 test size); phone ≈ 14.3px. Both meet the minimum only at their test sizes.',
    'The real og:image is not made yet (G2-1 says the fix supplies it).',
    'Nameplate business details: AXIEL, axiel.co.za and info@axiel.co.za (the protocol\'s form address) are shown; the address and anything else the structured data will carry are UNKNOWN until the INDEX run (M5).',
  ],
  audit: [
    ['Share card in the window', 'The proof: the missing preview now exists', 'Real title + description of axiel.co.za (G2-1)'],
    ['Highlighted description', 'Points at what was fixed', '--atlas-gold-hot, the DEVOS gold'],
    ['Gilded frame + gold-leaf nameplate', 'Both faults repaired', 'The fix kit\'s gold leaf (SF-05)'],
    ['Lantern beam', 'INDEX comes back to look', 'The Cartographer\'s lantern'],
    ['Wet stone', 'It has been through the AMOS check', 'Rain from SF-06'],
  ],
  async build({ renderer, tier, vp }) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(HEX.night, 0.012);
    scene.environment = tokenEnv(renderer, [col('night', 1.4), col('night'), col('ink')]);
    nightLights(scene, { sky: 0.8 });
    scene.add(makeGround({ wet: true }));
    scene.add(makeCity({ tier, lit: 0.55, wet: 1 }));
    scene.add(await makeFaultBuilding({ state: 'repaired', wet: true, cardGlow: 0.26, hiGlow: 1.0 }));
    const win = [(FB.win.x0 + FB.win.x1) / 2, (FB.win.y0 + FB.win.y1) / 2, FB.z];
    await placeCartographer(scene, [-3.5, 0, -32.5], [win[0], win[2]], win, { shadowMap: tier === 'mid' ? 1024 : 2048, aim: { intensity: 340 } });
    const camera = vp.phone
      ? makeCamera(54, [6.37, 4.81, -24.75], [4, 6, -39])
      : makeCamera(54, [6, 5, -27], [4, 5.2, -39]); // look lowered from y 6: the larger nameplate's bottom edge fell at y ≈ 810 of 810
    return { scene, camera, camNote: vp.phone ? 'Phone: K17 backed off along its axis to distance 14.5 (PROPOSED).' : 'K17 look lowered to y 5.2 so the nameplate stays whole (PROPOSED).' };
  },
  overlay(ctx, vp) { sceneCounter(ctx, vp, 7, 'PROOF', HEX.bone); },
};

/* ---------- SF-07b · K18 · the ranked result printed on the back of the paper wall ---------- */
const SHEET = { w: 46, h: 26, cy: 2 };      // 46 × 26: at both K18 keys every sheet edge stays out of frame (checked by projection)
const BLOCK = { x: 0, y: 6, w: 8, h: 6 };   // PROPOSED: 8 × 6 (protocol: 16 × 6); 6.6 wide on phone so it keeps a 24 px margin
// K18 looks along +z at the back face, so screen-right is world −x: the desktop key sits at +6 to push the tear right of the copy column
const K18 = { desk: [[6, 5, -16], [6, 4, 0]], phone: [[0, 2.6, -18.5], [0, 1.6, 0]] };
const TEAR_R = 3;

function tearOutline(r) {
  const pts = [], n = 180;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = TEAR_R * (1 + 0.06 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 7 + 2)) + (r() - 0.5) * 0.09;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return pts;
}

export const alt = {
  id: 'SF-07b', scene: 'Proof', moment: 'The ranked result printed on the back of the paper wall around the tear', p: '0.90',
  key: 'K18', cam: 'Face the back of the paper wall',
  phone: true,
  tone: THREE.NoToneMapping, bloom: null, clear: HEX.night,
  light: 'The paper wall\'s back face lit bone (same calibrated paper light as SF-01, from the top-left). Daylight through the tear in --paper, brightest at the torn lip. Moonlight fill. No bloom.',
  tokens: ['bone', 'paper', 'ink', 'stone', 'graphite', 'night', 'rain'],
  proposed: [
    'K18 itself (protocol marks it PROPOSED).',
    'Printed result block 8 × 6 centred at (0, 6), above the tear (protocol says 16 × 6; 8 wide fits a phone).',
    'Result layout: rank and query, URL in mono, title (cap 0.34), description (cap 0.29). Printed in --ink on the bone back face.',
    'Desktop key: K18 at (6, 5, −16) looking at (6, 4, 0), so on screen the tear and the result sit right of the copy column (tear from x ≈ 852 of 1440, copy ends ≈ 808) and the closing line never crosses the tear.',
    'Phone key: K18 at (0, 2.6, −18.5) looking at (0, 1.6, 0), so the tear ends above the closing line and the result clears the counter; result block 6.6 wide so it keeps the 24 px margin.',
    'Back face sheet 46 × 26 so no edge shows at either key.',
    'No street lip in the foreground (G2 review: at K18 it covered the closing line).',
    'The result sits above the tear, not wrapped around it as the protocol says: wrapping the copy round the tear is left for the CD to decide.',
    'Closing line set as the scene copy.',
  ],
  unknown: ['Rank number and query (M5): shown as "No. [rank]" and "[query]" until supplied.'],
  audit: [
    ['Printed result', 'The proof in search: AXIEL ranked, with its real title and description', 'axiel.co.za meta, verbatim (title PROPOSED per G2-9)'],
    ['Back of the paper wall', 'We are underneath the surface, looking at the result from the inside', 'The SF-01 paper wall from behind'],
    ['The tear', 'The way back out', 'The SF-01 crack, now open'],
    ['Closing line', 'Names all four parts in order', 'Copy "Found by INDEX. Built by DEVOS. Checked by AMOS. All of it on ATLAS."'],
    ['Scroll counter', 'Where you are in eight scenes', 'Specimen-catalogue numbering'],
  ],
  async build({ renderer, vp }) {
    const scene = new THREE.Scene();
    nightLights(scene, { sky: 0.3, moon: 0.08 });
    const B = { ...BLOCK, w: vp.phone ? 6.6 : BLOCK.w };
    // the back face: a bone sheet (worldW 34 × 20) seen from −z
    const sh = makeSheet(4096, Math.round(4096 * SHEET.h / SHEET.w), SHEET.w, SHEET.h);
    sh.cc.fillStyle = HEX.bone; sh.cc.fillRect(0, 0, sh.texW, sh.texH);
    const r = rng(907);
    fibres(sh, r, 12000);
    const P = (x, y) => sh.px(x, y - SHEET.cy);
    // the tear: open to the daylight outside (colour black, emission paper), torn fibrous lip
    const tear = tearOutline(r);
    const path = (ctx, scale = 1) => { ctx.beginPath(); tear.forEach(([x, y], i) => { const [a, b] = P(x * scale, y * scale); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); };
    sh.hc.filter = 'blur(6px)'; sh.hc.fillStyle = 'rgba(255,255,255,0.35)'; path(sh.hc, 1.05); sh.hc.fill(); sh.hc.filter = 'none';   // the lip curls toward us
    sh.cc.fillStyle = HEX.paper; path(sh.cc, 1.03); sh.cc.fill();                                                                  // thin torn edge catches light
    sh.cc.fillStyle = '#000'; path(sh.cc); sh.cc.fill();
    sh.ec.filter = 'blur(8px)'; sh.ec.fillStyle = 'rgba(255,255,255,0.1)'; path(sh.ec, 1.06); sh.ec.fill(); sh.ec.filter = 'none'; // light through thin paper at the lip
    // daylight in the opening: brightest at the torn lip, falling off toward the middle, so it reads as an opening, not a flat disc
    const [ox, oy] = P(0, 0), gr = sh.ec.createRadialGradient(ox, oy, 0, ox, oy, TEAR_R * sh.ppu * 1.05);
    gr.addColorStop(0, '#c8c8c8'); gr.addColorStop(0.75, '#e4e4e4'); gr.addColorStop(1, '#fff');
    sh.ec.fillStyle = gr; path(sh.ec); sh.ec.fill();
    // printed result
    const ppu = sh.ppu, cx = sh.cc;
    const x0 = B.x - B.w / 2;
    const at = (x, y) => P(x, y);
    const line = (txt, y, cap, o = {}) => {
      setFont(cx, o.w ?? 400, cap * ppu / (o.mono ? 0.73 : 0.7), o.mono ? 'mono' : 'Montserrat', o.track ?? 0.02);
      cx.fillStyle = o.color ?? HEX.ink; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
      const [a, b] = at(x0, y); cx.fillText(txt, a, b);
    };
    let y = B.y + B.h / 2 - 0.42;
    line('No. [rank]   ·   [query]', y, 0.24, { mono: true, color: HEX.stone, track: 0.06 }); y -= 0.62;
    line(SITE.domain, y, 0.29, { mono: true, color: HEX.stone }); y -= 0.78;
    setFont(cx, 500, 0.34 * ppu / 0.7, 'Montserrat', 0.01);
    for (const l of wrap(cx, SITE.title, B.w * ppu)) { line(l, y, 0.34, { w: 500, track: 0.01 }); y -= 0.6; }
    y -= 0.12;
    setFont(cx, 400, 0.29 * ppu / 0.7, 'Montserrat', 0.02);
    for (const l of wrap(cx, SITE.description, B.w * ppu)) { line(l, y, 0.29); y -= 0.52; }
    const sheet = paperMesh(sh, { key: 0.92, amb: 0.42, bump: 1.4, emisCol: col('paper', 1.05) });
    sheet.position.set(0, SHEET.cy, 0);
    sheet.rotation.y = Math.PI; // faces −z; seen from K18 the texture's +u runs to the viewer's right, so print reads normally
    scene.add(sheet);
    const k = vp.phone ? K18.phone : K18.desk;
    const camera = makeCamera(54, k[0], k[1]);
    return { scene, camera, camNote: vp.phone ? 'Phone: K18 at (0, 2.6, −18.5) → (0, 1.6, 0), block 6.6 wide (PROPOSED).' : 'K18 at (6, 5, −16) → (6, 4, 0) so the closing line clears the tear (PROPOSED).', blockBottom: y };
  },
  overlay(ctx, vp) {
    sceneCopy(ctx, vp, { name: 'PROOF', line: CLOSING, color: HEX.ink, accent: HEX.stone, shadow: false });
    sceneCounter(ctx, vp, 7, 'PROOF', HEX.stone);
  },
};
