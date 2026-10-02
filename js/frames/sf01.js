import { THREE, HEX, rng, makeCamera, setFont, textC } from '../core.js';
import { makeSheet, fibres, tinted, loadImage, paperMesh } from '../paper.js';

const LOCKUP = { src: 'assets/axiel-lockup-ink.png', h: 1.0, cy: 0.55 };
const HERO_Y = -0.42; // hero line baseline (world units on the sheet)

function crackPath(rnd, x0, x1, y0, step) {
  const pts = [];
  let x = x0, y = y0;
  while (x < x1) { pts.push([x, y]); x += step[0] + rnd() * step[1]; y = y0 + (y - y0) * 0.8 + (rnd() - 0.5) * 0.05; }
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

export default {
  id: 'SF-01', scene: 'Surface', moment: 'Hero copy, crack beginning', p: '0.06',
  key: 'K1', cam: '(0, 0, 6) → look (0, 0, 0) · FOV 40',
  tone: THREE.NoToneMapping, bloom: [0.55, 0.45, 1.0], clear: HEX.paper,
  light: 'Soft warm key from top-left (white + 5% --lantern), ambient paper bounce, no fog. Paper: emboss normal from the raster lockup + fibre texture.',
  tokens: ['paper', 'bone', 'stone', 'ink', 'hot'],
  proposed: [
    'Lockup printed in --ink and embossed (raised) from the approved raster. Size and position are proposed.',
    'Light leaking through the crack in --atlas-gold-hot (the layer beneath showing through).',
    'Hero line size 56px at 1440p, Montserrat 300, +0.08em, centred under the lockup.',
  ],
  unknown: ['Lockup source is the approved reference raster (491×404 px cut). A higher-resolution master is needed for production.'],
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

    // crack beginning: in the paper below the hero line, never crossing a letter (G1-P1)
    const main = crackPath(r, -0.62, 0.74, -1.02, [0.022, 0.05]);
    const br1 = crackPath(r, 0.0, 0.2, -1.0, [0.02, 0.03]).map(([x, y], i) => [x, y - i * 0.012]);
    const br2 = crackPath(r, -0.3, -0.16, -1.03, [0.02, 0.03]).map(([x, y], i) => [x, y + i * 0.01]);
    for (const [p, w] of [[main, 1], [br1, 0.45], [br2, 0.4]]) {
      // depression in height (shading lip)
      sh.hc.filter = 'blur(3px)';
      strokePath(sh, sh.hc, p, 7 * w, 'rgba(0,0,0,0.55)');
      sh.hc.filter = 'none';
      // the split itself
      strokePath(sh, sh.cc, p, 3.2 * w, HEX.ink, 0.4);
      // light from beneath
      sh.ec.filter = 'blur(10px)';
      strokePath(sh, sh.ec, p, 16 * w, 'rgba(255,255,255,0.28)');
      sh.ec.filter = 'blur(2px)';
      strokePath(sh, sh.ec, p, 3.4 * w, 'rgba(255,255,255,0.9)');
      sh.ec.filter = 'none';
    }
    strokePath(sh, sh.ec, main, 1.1, 'rgba(255,255,255,1)');

    scene.add(paperMesh(sh, { key: 0.92, amb: 0.42, bump: 1.6 }));
    return { scene, camera };
  },
  overlay(ctx, W, H, project) {
    const s = H / 1440;
    const p = project(new THREE.Vector3(0, HERO_Y, 0));
    ctx.fillStyle = HEX.ink;
    ctx.textBaseline = 'alphabetic';
    setFont(ctx, 300, 56 * s);
    textC(ctx, 'Beyond Immediate Reality', p.x, p.y, 56 * s); // canon-locked, one unit (G1-P1)
  },
};
