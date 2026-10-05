/*
 * Seal (SF-08, Phase 9).
 *   makeSeal   : the official AXIEL symbol pressed into red wax [G2-3]. The raster drives the
 *                impression's height (never vectorised, never redrawn). Plain rim, no ring text.
 *   makeTag    : the waitlist specimen tag [R8f], --bone paper with the fields on its lines.
 *   makeString : the tie, run from the tag's eyelet to under the wax, so the seal is what
 *                holds the tag shut while intake is closed (PROPOSED).
 * Geometry lies in the xy plane, facing +z (the paper wall's front at z = 0).
 */
import { THREE, HEX, MAT, mixc, rng, TAU, canvas, canvasTex, loadImage, tinted, setFont } from '../core.js';

export const SYMBOL_SRC = 'assets/axiel-symbol-ink.png';

/* ---------- wax seal ---------- */
const RINGS_FACE = 18, RINGS_RIM = 26, SEGS = 160;   // 13 920 tris for the face and rim + 160 for the flat back = 14 080 (budget 15k)
const FACE_T = 0.70;                                  // stamped face ends at 0.70 of the edge radius

function edgeFn(seed) {
  const r = rng(seed);
  const h = [3, 5, 7, 11, 17].map((k, i) => ({ k, a: [0.03, 0.022, 0.016, 0.01, 0.006][i] * (0.7 + 0.6 * r()), p: r() * TAU }));
  return (a) => 0.96 + h.reduce((s, { k, a: amp, p }) => s + amp * Math.sin(k * a + p), 0);
}
function lipFn(seed) {
  const r = rng(seed + 7);
  const h = [2, 5, 9].map(k => ({ k, p: r() * TAU }));
  return (a) => 1 + 0.16 * Math.sin(h[0].k * a + h[0].p) + 0.08 * Math.sin(h[1].k * a + h[1].p) + 0.05 * Math.sin(h[2].k * a + h[2].p);
}
/* section through the wax, t = r / edge(a), heights in units of R */
function profile(t, lip) {
  const face = 0.07;
  const rise = THREE.MathUtils.smoothstep(t, FACE_T - 0.012, FACE_T + 0.085) * 0.048 * lip;
  const fall = t > 0.80 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.80) / 0.20, 2))) : 1;
  return (face + rise) * (0.06 + 0.94 * fall);
}

function sealGeometry(R, seed) {
  const edge = edgeFn(seed), lip = lipFn(seed);
  const ts = [];
  for (let i = 0; i <= RINGS_FACE; i++) ts.push(FACE_T * 0.97 * Math.pow(i / RINGS_FACE, 0.8));
  for (let i = 1; i <= RINGS_RIM; i++) { const u = i / RINGS_RIM; ts.push(FACE_T * 0.97 + (1 - FACE_T * 0.97) * (1 - Math.pow(1 - u, 1.35))); }
  const faceR = FACE_T * 0.94 * R;          // the symbol field (uv 0..1 spans its diameter)
  const pos = [], uv = [], idx = [];
  for (let i = 0; i < ts.length; i++) {
    for (let j = 0; j <= SEGS; j++) {
      const a = j / SEGS * TAU, e = edge(a), t = ts[i];
      const r = t * e * R, x = Math.cos(a) * r, y = Math.sin(a) * r;
      pos.push(x, y, profile(t, lip(a)) * R);
      uv.push(x / (2 * faceR) + 0.5, y / (2 * faceR) + 0.5);
    }
  }
  const row = SEGS + 1;
  for (let i = 0; i < ts.length - 1; i++) for (let j = 0; j < SEGS; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    if (i > 0) idx.push(a, c, b);           // ring 0 is the centre point: one triangle per segment
    idx.push(b, c, d);
  }
  // flat back (the side pressed onto the paper): a fan on its own copy of the rim, facing −z, its uv
  // outside the symbol field so the impression stays on the front (+SEGS tris)
  const c0 = pos.length / 3, rim = (ts.length - 1) * row;
  pos.push(0, 0, 0); uv.push(2, 2);
  for (let j = 0; j <= SEGS; j++) { pos.push(pos[(rim + j) * 3], pos[(rim + j) * 3 + 1], pos[(rim + j) * 3 + 2]); uv.push(2, 2); }
  for (let j = 0; j < SEGS; j++) idx.push(c0, c0 + 2 + j, c0 + 1 + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, faceR };
}

/* height map from the raster: a sharp layer (the cut walls) over a soft one (wax shoulder) */
async function symbolHeight(size = 1024, fill = 0.80) {
  const img = await loadImage(SYMBOL_SRC);
  const c = canvas(size, size), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, size, size);
  const w = size * fill, off = (size - w) / 2;
  const white = tinted(img, w, w, '#ffffff');
  x.globalCompositeOperation = 'lighter';
  x.filter = `blur(${(size / 360).toFixed(2)}px)`; x.globalAlpha = 0.72; x.drawImage(white, off, off);
  x.filter = `blur(${(size / 70).toFixed(2)}px)`; x.globalAlpha = 0.28; x.drawImage(white, off, off);
  x.filter = 'none'; x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  return { c, img };
}

/* state: 'closed' (intact) | 'soon' (hairline cracks, Phase 9.1). Only 'closed' is built at G2. */
export async function makeSeal(o = {}) {
  const R = o.R ?? 1.2, seed = o.seed ?? 31;
  const { g, faceR } = sealGeometry(R, seed);
  const { c } = await symbolHeight();
  const relief = 0.028 * R;                 // height of the raised symbol (world units)
  const mat = MAT.wax({
    uniforms: { uSym: { value: canvasTex(c, false) } },
    varyings: 'varying vec2 vUv2;',
    vertex: 'vUv2 = uv;',
    pars: 'uniform sampler2D uSym;',
    // raised symbol inside the pressed field + faint pooling in the wax
    height: `(texture2D(uSym, clamp(vUv2, 0.0, 1.0)).r * (1.0 - smoothstep(0.47, 0.5, length(vUv2 - 0.5))) + 0.05 * fbm(vUv2 * 26.0))`,
    bump: relief,
    // the stamp polishes the high points; recesses keep a duller, deeper red
    albedo: 'diffuseColor.rgb *= mix(0.86, 1.04, smoothstep(0.0, 0.8, h));',
    rough: 'roughnessFactor = mix(0.42, 0.24, smoothstep(0.1, 0.8, h));',
    ...(o.mat ?? {}),
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData = { R, faceR, tris: g.index.count / 3 };
  return mesh;
}

/* ---------- waitlist specimen tag [R8f] ---------- */
export const TAG_FIELDS = [               // §9.3, unchanged
  { label: 'Name' }, { label: 'Email' }, { label: 'Company' },
  { label: 'What do you need?', select: true },
];

/* the tag: a bone card with a clipped corner pair, an eyelet, and the fields on ruled lines.
   ppu = texture pixels per world unit. cap = label cap height (world units). */
export function tagCanvas(w, h, o = {}) {
  const ppu = o.ppu ?? 512, cap = o.cap ?? 0.15;
  const W = Math.round(w * ppu), H = Math.round(h * ppu);
  const c = canvas(W, H), x = c.getContext('2d');
  const r = rng(o.seed ?? 5);
  const U = (v) => v * ppu;
  const clip = U(h * 0.2);
  const outline = () => {
    x.beginPath(); x.moveTo(clip, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(clip, H); x.lineTo(0, H - clip); x.lineTo(0, clip); x.closePath();
  };
  outline(); x.fillStyle = HEX.bone; x.fill();
  // fibres (texture only, no colour outside the tokens)
  x.save(); outline(); x.clip();
  for (let i = 0; i < 2600; i++) {
    const px = r() * W, py = r() * H, a = r() * TAU, len = U(0.02 + r() * 0.07);
    x.globalAlpha = 0.04 + r() * 0.06; x.strokeStyle = r() < 0.7 ? HEX.stone : HEX.paper; x.lineWidth = 1 + r() * 1.5;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
  }
  x.globalAlpha = 1; x.restore();
  // eyelet: a reinforced ring (bone darker) with a hole
  const ex = U(0.32), ey = H / 2;
  x.fillStyle = mixc('bone', 'stone', 0.35).getStyle(); x.beginPath(); x.arc(ex, ey, U(0.12), 0, TAU); x.fill();
  x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(ex, ey, U(0.055), 0, TAU); x.fill();
  x.globalCompositeOperation = 'source-over';
  const left = U(0.72), right = W - U(0.3);
  x.textBaseline = 'alphabetic';
  // field lines: label in --stone above an --ink rule
  const top = U(0.62), step = (H - top - U(0.32)) / TAG_FIELDS.length;
  const lines = [];
  TAG_FIELDS.forEach((f, i) => {
    const yRule = top + step * (i + 1) - U(0.04);
    setFont(x, 400, U(cap) / 0.72, 'Montserrat', 0.04);
    x.fillStyle = HEX.stone; x.textAlign = 'left';
    x.fillText(f.label, left, yRule - U(cap * 1.55));
    x.fillStyle = HEX.ink; x.fillRect(left, yRule, right - left, Math.max(2, U(0.012)));
    if (f.select) {
      x.strokeStyle = HEX.ink; x.lineWidth = Math.max(2, U(0.014));
      const cx = right - U(0.12), cy = yRule - U(0.12);
      x.beginPath(); x.moveTo(cx - U(0.07), cy - U(0.04)); x.lineTo(cx, cy + U(0.03)); x.lineTo(cx + U(0.07), cy - U(0.04)); x.stroke();
    }
    lines.push({ label: f.label, y: yRule / ppu });
  });
  // header: the tag's own name on top (mono, --stone). The number is stamped on submit (§9.3).
  setFont(x, 500, U(cap * 0.8) / 0.72, 'mono', 0.14);
  x.fillStyle = HEX.stone; x.textAlign = 'left';
  x.fillText('SPECIMEN No.', left, U(0.36));
  x.fillStyle = HEX.ink; x.fillRect(left + x.measureText('SPECIMEN No.').width + U(0.06), U(0.36), U(0.9), Math.max(2, U(0.01)));
  return { c, W, H, ppu, lines, eyelet: [ex / ppu, ey / ppu] };
}

export function makeTag(o = {}) {
  const w = o.w ?? 4.2, h = o.h ?? 3.0;
  const t = tagCanvas(w, h, o);
  const map = canvasTex(t.c, true);
  const mat = MAT.paper({ k: 'paper', bump: 0.0025 });
  mat.color.set(0xffffff); mat.map = map; mat.transparent = true; mat.alphaTest = 0.5;
  // a card with a slight lift and curl (it is lying loose on the wall, held only by the string)
  const g = new THREE.PlaneGeometry(w, h, 24, 16);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i) / w + 0.5, v = P.getY(i) / h + 0.5;
    P.setZ(i, 0.012 + 0.05 * Math.pow(u, 3) + 0.02 * Math.pow(Math.abs(v - 0.5) * 2, 2) * u);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData = { w, h, lines: t.lines, eyelet: [t.eyelet[0] - w / 2, h / 2 - t.eyelet[1]], ppu: t.ppu, tris: g.index.count / 3 };
  return mesh;
}

/* the tie: two strands from the eyelet (a) to under the seal (b), lying on the paper */
export function makeString(a, b, o = {}) {
  const r = rng(o.seed ?? 3), group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: mixc('bone', 'stone', 0.3), roughness: 0.95, metalness: 0 });
  for (const s of [-1, 1]) {
    const pts = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = THREE.MathUtils.lerp(a[0], b[0], t), y = THREE.MathUtils.lerp(a[1], b[1], t);
      const sag = Math.sin(Math.PI * t) * (o.sag ?? 0.35) * (s > 0 ? 1 : 0.7);
      const jit = i > 0 && i < n ? (r() - 0.5) * 0.06 : 0;
      pts.push(new THREE.Vector3(x + s * 0.025 * (1 - t), y - sag + jit, 0.014 + (t > 0.85 ? 0.02 : 0)));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, o.radius ?? 0.014, 6), mat);
    tube.castShadow = true; tube.receiveShadow = true;
    group.add(tube);
  }
  group.userData.tris = group.children.reduce((s, m) => s + m.geometry.index.count / 3, 0);
  return group;
}
