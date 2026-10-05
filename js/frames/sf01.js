import { THREE, HEX, rng, makeCamera, setFont, textC, sceneCounter } from '../core.js';
import { makeSheet, fibres, tinted, loadImage, paperMesh } from '../paper.js';

const LOCKUP = { src: 'assets/axiel-lockup-ink.png', h: 1.0, cy: 0.55 };
const HERO_Y = -0.42; // hero line baseline (world units on the sheet)

function crackPath(rnd, x0, x1, y0, step) {
  const pts = [];
  let x = x0, y = y0;
  // angular: short straight runs with sharp turns (torn fibre), pulled back toward the line so it never wanders up into the copy
  while (x < x1) { pts.push([x, y]); x += step[0] + rnd() * step[1]; y = y0 + (y - y0) * 0.55 + (rnd() - 0.5) * 0.07; }
  pts.push([x1, y0 + (rnd() - 0.5) * 0.02]);
  return pts;
}
function strokePath(sh, ctx, pts, maxW, style, extra = 0) {
  const n = pts.length - 1;
  ctx.strokeStyle = style; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    ctx.lineWidth = extra + maxW * Math.pow(Math.sin(Math.PI * t), 0.6);
    const [ax, ay] = sh.px(...pts[i]), [bx, by] = sh.px(...pts[i + 1]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
}
// Same strokes, blurred once: drawn on a scratch canvas cropped to the path, then composited
// through the filter. Filtering each segment re-blurs a full-sheet layer per stroke, which
// takes minutes without a GPU canvas (the cloud render).
function blurredPath(sh, ctx, pts, maxW, style, blur, extra = 0) {
  const px = pts.map(p => sh.px(...p)), pad = Math.ceil(extra + maxW + blur * 3);
  const x0 = Math.floor(Math.min(...px.map(p => p[0]))) - pad, y0 = Math.floor(Math.min(...px.map(p => p[1]))) - pad;
  const x1 = Math.ceil(Math.max(...px.map(p => p[0]))) + pad, y1 = Math.ceil(Math.max(...px.map(p => p[1]))) + pad;
  const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0;
  const t = c.getContext('2d'); t.translate(-x0, -y0);
  strokePath(sh, t, pts, maxW, style, extra);
  ctx.filter = `blur(${blur}px)`; ctx.drawImage(c, x0, y0); ctx.filter = 'none';
}

export default {
  id: 'SF-01', scene: 'Surface', moment: 'Hero copy, crack beginning', p: '0.06',
  key: 'K1', cam: 'Push in to the crack',
  tone: THREE.NoToneMapping, bloom: [0.3, 0.3, 1.0], clear: HEX.paper,
  light: 'Soft warm key from top-left (white + 5% --lantern), ambient paper bounce, no fog. Paper: emboss from the raster lockup, fibre texture. The only light that blooms is the --atlas-gold-hot showing through the crack.',
  tokens: ['paper', 'bone', 'stone', 'ink', 'hot'],
  proposed: [
    'Lockup printed in --ink and embossed from the approved raster. Size and position.',
    'Light from beneath the crack in --atlas-gold-hot.',
    'Hero line 32px at 1440 wide, Montserrat 300, +0.08em, centred under the lockup.',
    'Sub-line "Strategy-first systems design." 16px Montserrat 400 in --stone, 34px under the hero line.',
    'Scroll counter "01 / 08 · SURFACE" (mono 11px, left edge, rotated) on every frame.',
  ],
  unknown: ['The lockup source is the approved reference raster (491×404 px cut). A higher-resolution master is needed for production.'],
  audit: [
    ['Embossed lockup', 'Names the studio before anything moves', 'The approved AXIEL raster, printed and pressed into paper'],
    ['Hero line', 'States the promise', 'Canon line "Beyond Immediate Reality", one unit, no full stop (G2-9)'],
    ['Sub-line', 'Says what AXIEL does in four words', 'Canon positioning line'],
    ['Crack with gold light', 'Invites the scroll down', 'The paper wall splitting onto ATLAS, the gold of the strata beneath'],
    ['Paper fibre', 'Material truth of the surface', 'The paper wall the whole film returns to'],
    ['Scroll counter', 'Where you are in eight scenes', 'Specimen-catalogue numbering'],
  ],
  async build() {
    const scene = new THREE.Scene();
    const camera = makeCamera(40, [0, 0, 6], [0, 0, 0]);
    const W = 8.4, H = 4.725;
    const sh = makeSheet(4096, 2304, W, H);
    const r = rng(11);
    fibres(sh, r, 9000);

    const img = await loadImage(LOCKUP.src);
    const lh = LOCKUP.h * sh.ppu, lw = lh * img.width / img.height;
    const [cx, cy] = sh.px(0, LOCKUP.cy);
    // print (ink, exact raster shapes)
    sh.cc.globalAlpha = 0.95;
    sh.cc.drawImage(img, cx - lw / 2, cy - lh / 2, lw, lh);
    sh.cc.globalAlpha = 1;
    // emboss: raster alpha → raised height
    const hi = tinted(img, lw, lh, '#ffffff');
    sh.hc.filter = 'blur(2.5px)';
    sh.hc.globalAlpha = 0.85;
    sh.hc.drawImage(hi, cx - lw / 2, cy - lh / 2);
    sh.hc.filter = 'none'; sh.hc.globalAlpha = 1;

    // crack beginning: in the paper below the copy, never crossing a letter (G1-P1)
    const main = crackPath(r, -0.62, 0.74, -1.02, [0.022, 0.05]);
    const br1 = crackPath(r, 0.0, 0.2, -1.0, [0.02, 0.03]).map(([x, y], i) => [x, y - i * 0.012]);
    const br2 = crackPath(r, -0.3, -0.16, -1.03, [0.02, 0.03]).map(([x, y], i) => [x, y + i * 0.01]);
    // a hairline split: the dark cut reads first, the gold only as a thin core inside it (G2 review: the wide
    // emissive halo read as a glowing smear)
    for (const [p, w] of [[main, 1], [br1, 0.45], [br2, 0.4]]) {
      blurredPath(sh, sh.hc, p, 6 * w, 'rgba(0,0,0,0.55)', 2.5);        // depression (shading lip)
      strokePath(sh, sh.cc, p, 3.0 * w, HEX.ink, 0.4);                   // the split
      blurredPath(sh, sh.ec, p, 5 * w, 'rgba(255,255,255,0.12)', 4);    // faint light on the lip
    }
    strokePath(sh, sh.ec, main, 1.3, 'rgba(255,255,255,0.85)');         // light from beneath, inside the split only

    scene.add(paperMesh(sh, { key: 0.92, amb: 0.42, bump: 1.6 }));
    return { scene, camera };
  },
  overlay(ctx, vp, project) {
    const { u } = vp;
    const p = project(new THREE.Vector3(0, HERO_Y, 0));
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = HEX.ink;
    setFont(ctx, 300, 32 * u);
    textC(ctx, 'Beyond Immediate Reality', p.x, p.y, 32 * u); // canon-locked, one unit, no full stop (G2-9)
    ctx.fillStyle = HEX.stone;
    setFont(ctx, 400, 16 * u, 'Montserrat', 0.04);
    textC(ctx, 'Strategy-first systems design.', p.x, p.y + 34 * u, 16 * u, 0.04);
    ctx.restore();
    sceneCounter(ctx, vp, 1, 'SURFACE', HEX.stone);
  },
};
