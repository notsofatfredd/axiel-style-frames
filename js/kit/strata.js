/*
 * The Strata (§3.2 [R2]): a cut cliff of past work. Wall at z = −6 from the lip (y 0) to bedrock (y −64).
 * 12 layers, oldest at the bottom, alternating --graphite / --stone, each 3–8 thick.
 * Gold-leaf veins with an emissive mask (uVein: dark 0 → ignited 1). Carved lines cut face-on [F7][M1]:
 *   y −40 "Everything stands" · y −22 "on ATLAS." · y −6 "ATLAS"
 * 12 embedded specimens, one per ~5 units of depth. AXIEL's own work only [G2-2]; which 12 is chosen at G3,
 * so these are PROPOSED stand-ins built from real AXIEL material (the official symbol, the live site structure).
 * Budget: cliff + specimens ≤ 45k tris.
 */
import { THREE, HEX, col, rng, detailMat, canvas, canvasTex, setFont, loadImage, tinted } from '../core.js';
import { inlayMat, labelMask, glsl, SITE } from './city.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CLIFF = { z: -6, top: 0, bottom: -64, x0: -30, x1: 30 };
// layer thicknesses from the top down (sum 64), parity: even = graphite, odd = stone
const THICK = [4, 6, 5, 7, 3, 6, 5, 8, 4, 6, 4, 6];
export const BOUNDS = THICK.reduce((a, t) => (a.push(a[a.length - 1] - t), a), [0]); // 13 values, 0 → −64
export const LINES = [
  { t: 'Everything stands', y: -40, cap: 0.22, track: 0.04 },
  { t: 'on ATLAS.', y: -22, cap: 0.22, track: 0.04 },
  { t: 'ATLAS', y: -6, cap: 0.26, track: 0.3 },
];
const PANEL_W = 6.2, STRIP = 1.2, CPPU = 300;

/* specimens: [type, x, y] · numbered from the bedrock up (PROPOSED: real numbering chosen at G3) */
export const SPECIMENS = [
  ['graph', -3.6, -60], ['site', 3.4, -55], ['symbol', -3.8, -50], ['graph', 3.6, -45],
  ['site', -3.6, -35.5], ['symbol', 3.6, -30.5], ['site', -3.7, -23.2], ['symbol', 3.6, -20.8],
  ['graph', -3.5, -15.5], ['site', 3.5, -11], ['symbol', -3.6, -9.5], ['graph', 3.5, -2.5],
].map(([type, x, y], i) => ({ type, x, y, no: String(i + 2).padStart(3, '0') }));
const SPEC_HALF = { symbol: [0.8, 0.95], site: [1.0, 0.8], graph: [0.95, 0.85] };

/* ---------- CPU noise for the displaced face ---------- */
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
const vn = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbmJ = (x, y, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; a *= 0.5; } return s; };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* 0 = raw rock, 1 = dressed flat (carved panels + specimen niches) */
function dressed(x, y) {
  let d = 0;
  for (const L of LINES) d = Math.max(d, (1 - sm(0.7, 1.1, Math.abs(y - L.y))) * (1 - sm(PANEL_W / 2, PANEL_W / 2 + 0.5, Math.abs(x))));
  for (const s of SPECIMENS) { const [hx, hy] = SPEC_HALF[s.type]; d = Math.max(d, (1 - sm(hx + 0.15, hx + 0.6, Math.abs(x - s.x))) * (1 - sm(hy + 0.25, hy + 0.7, Math.abs(y - s.y)))); }
  return d;
}

function cliffGeometry(o) {
  const W = CLIFF.x1 - CLIFF.x0, H = CLIFF.top - CLIFF.bottom;
  const g = new THREE.PlaneGeometry(W, H, o.segX ?? 96, o.segY ?? 128).translate(0, (CLIFF.top + CLIFF.bottom) / 2, 0);
  const r = rng(6406);
  const prot = THICK.map(() => r.range(0.05, 0.55));
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i);
    let L = 0; while (L < 11 && y < BOUNDS[L + 1]) L++;
    const top = BOUNDS[L], bot = BOUNDS[L + 1];
    const t = (top - y) / (top - bot);                       // 0 at the layer's top, 1 at its base
    // ledges: blend to the neighbour's protrusion over 0.2 at each boundary
    let p = prot[L];
    if (L > 0) p += (prot[L - 1] - p) * (1 - sm(0, 0.2, top - y)) * 0.5;
    if (L < 11) p += (prot[L + 1] - p) * (1 - sm(0, 0.2, y - bot)) * 0.5;
    let z = p + 0.15 * (1 - t) + 0.32 * fbmJ(x * 0.35, y * 0.6) + 0.08 * fbmJ(x * 2.1, y * 3.3, 3);
    // the cliff ends at the plateau lip: the top edge is cut clean
    const d = dressed(x, y);
    z = z * (1 - d) + 0.08 * d;
    P.setZ(i, z);
  }
  g.translate(0, 0, CLIFF.z);
  g.computeVertexNormals();
  return g;
}

/* carved lines: three strips stacked in one mask (line i occupies v ∈ [i/3, (i+1)/3]) */
function carveCanvas() {
  const c = canvas(PANEL_W * CPPU, 3 * STRIP * CPPU), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff'; x.textBaseline = 'alphabetic'; x.textAlign = 'center';
  x.filter = 'blur(2.5px)';              // a soft mask edge becomes the chisel's bevel in the height field
  LINES.forEach((L, i) => {
    const px = (L.cap / 0.7) * CPPU;
    setFont(x, 500, px, 'Montserrat', L.track);
    const cy = (2 - i) * STRIP * CPPU + STRIP * CPPU / 2;
    x.fillText(L.t, c.width / 2 + px * L.track / 2, cy + L.cap * CPPU / 2);
  });
  return c;
}

const STRATA_PARS = /* glsl */`
uniform sampler2D uCarve; uniform vec3 uLineY; uniform float uB[13];
uniform float uVein, uCarveGlow, uPanelW; uniform vec3 uGraph, uStoneC, uGoldC, uHot, uDress;
float fV, fVc, fM, fMa, fD, fPar, fBand;
// vein field: stretched along the bedding (x) and domain-warped, so its isolines run as meandering cracks, not rings
float vf(vec2 p){
  vec2 q = p * vec2(0.16, 0.42) + vec2(7.0, 1.0);
  q += 0.9 * vec2(vnoise(q * 1.7 + 4.1), vnoise(q * 1.7 + 9.3));
  return vnoise(q * 1.3) + 0.35 * vnoise(q * 4.1 + 2.);
}
float carveM(vec2 p){
  float m = 0.;
  for (int i = 0; i < 3; i++) {
    float dy = p.y - uLineY[i];
    if (abs(dy) < ${(STRIP / 2).toFixed(2)} && abs(p.x) < uPanelW * 0.5)
      m = texture2D(uCarve, vec2((p.x + uPanelW * 0.5) / uPanelW, (float(i) + (dy + ${(STRIP / 2).toFixed(2)}) / ${STRIP.toFixed(2)}) / 3.)).r;
  }
  return m;
}
float dressM(vec2 p){
  float d = 0.;
  for (int i = 0; i < 3; i++) d = max(d, (1. - smoothstep(0.7, 0.9, abs(p.y - uLineY[i]))) * (1. - smoothstep(uPanelW * 0.5, uPanelW * 0.5 + 0.3, abs(p.x))));
  return d;
}
float strataH(){
  vec2 p = vWPos.xy;
  // layer + distance to its nearest boundary
  int L = 0;
  for (int i = 0; i < 12; i++) if (p.y < uB[i + 1]) L = i + 1;
  L = min(L, 11);
  fPar = mod(float(L), 2.);
  fBand = min(abs(p.y - uB[L]), abs(p.y - uB[L + 1]));
  // veins: gold leaf laid in cracks. One main isoline and one hairline tributary of the field, at a fixed
  // world width from a finite-difference gradient (main 0.012–0.04 wide, hairline half that), antialiased.
  float n = vf(p), e = 0.08;
  vec2 g = vec2(vf(p + vec2(e, 0.)) - n, vf(p + vec2(0., e)) - n) / e;
  float gl = max(length(g), 1e-3);
  float d1 = abs(n - 0.67) / gl, d2 = abs(n - 0.46) / gl;
  float w = 0.006 + 0.014 * vnoise(p * 0.6 + 5.);
  float aa = max(fwidth(d1), 1e-4);
  // pixel coverage: once a vein is thinner than a pixel it dims with its width instead of drawing a full
  // 1 px gold line (seen whole, the cliff read as a gold maze)
  float v1 = (1. - smoothstep(w - aa, w + aa, d1)) * min(1., w / aa), v2 = (1. - smoothstep(w * 0.45 - aa, w * 0.45 + aa, d2)) * min(1., w * 0.45 / aa);
  // breaks: the leaf is laid in runs, not continuous loops; and only in the beds that carry it (the three
  // carved-line beds, the bed under line 2, and one deep bed), fading out short of the bedding planes
  float bed = (L == 1 || L == 3 || L == 4 || L == 7 || L == 10) ? smoothstep(0.05, 0.4, fBand) : 0.;
  float runs = bed * smoothstep(0.35, 0.6, vnoise(p * 0.07 + 3.)) * smoothstep(0.22, 0.42, vnoise(p * 0.8 + 11.));
  fV = max(v1, v2 * smoothstep(0.3, 0.5, vnoise(p * 0.5 + 21.))) * runs;
  fVc = (1. - smoothstep(0., w * 0.6 + aa, d1)) * min(1., w * 0.6 / aa) * runs;   // the emissive core of the main vein only
  fD = dressM(p);
  fV *= 1. - fD; fVc *= 1. - fD;
  fM = carveM(p);                        // soft (beveled) carve mask: depth from fM, gold floor from fMa
  fMa = smoothstep(0.55, 0.85, fM);
  float h = 0.5 + 0.2 * fbm(p * vec2(0.9, 3.4)) + 0.07 * vnoise(p * 11.);
  h += 0.1 * fbm(vec2(p.x * 0.6, p.y * 7.5));      // fine bedding laminations inside each layer
  h -= 0.32 * (1. - smoothstep(0.0, 0.14, fBand));
  h -= 0.25 * fV;
  h = mix(h, 0.55 + 0.03 * fbm(p * 7.), fD);
  h -= 0.7 * fM;
  return h;
}`;

export async function makeStrata(o = {}) {
  const g = new THREE.Group();
  try { await document.fonts.load('500 60px Montserrat'); await document.fonts.load('400 30px "JetBrains Mono"'); } catch (e) { /* fallback fonts */ }
  const carveT = canvasTex(carveCanvas(), false);
  carveT.anisotropy = 16;
  const U = {
    uCarve: { value: carveT }, uLineY: { value: new THREE.Vector3(...LINES.map(l => l.y)) }, uB: { value: BOUNDS },
    uVein: { value: o.vein ?? 0 }, uCarveGlow: { value: o.carveGlow ?? 0 }, uPanelW: { value: PANEL_W },
    uGraph: { value: col('graphite') }, uStoneC: { value: col('stone', 0.82) }, uGoldC: { value: col('gold') }, uHot: { value: col('hot') },
    uDress: { value: col('stone', 0.95) },
  };
  const mat = detailMat({ color: 0xffffff, roughness: 0.9, metalness: 0, envMapIntensity: 0.5 }, {
    uniforms: U, pars: STRATA_PARS, height: 'strataH()', vary: 0.18, bump: o.bump ?? 0.03, bloomPart: true,
    albedo: `
      vec3 base = mix(uGraph, uStoneC, fPar);
      base *= 0.82 + 0.36 * fbm(wp.xy * vec2(0.5, 2.2) + fPar * 9.);
      base *= 0.86 + 0.28 * fbm(vec2(wp.x * 0.4, wp.y * 9.) + fPar * 5.);   // laminations
      base *= 1.0 - 0.35 * (1. - smoothstep(0.0, 0.14, fBand));
      base = mix(base, uDress * (0.9 + 0.1 * h), fD * 0.85);
      base *= 1. - 0.45 * fM * (1. - fMa);                                   // the cut's walls in shadow
      base = mix(base, uGoldC, max(fV, fMa));
      diffuseColor.rgb = base;`,
    rough: `roughnessFactor = mix(roughnessFactor, 0.72, fD); roughnessFactor = mix(roughnessFactor, 0.3, max(fV, fMa)); metalnessFactor = max(fV, fMa);`,
    emis: `{ vec3 e = uHot * (fVc * uVein * 1.3 + fMa * uCarveGlow * 0.55); totalEmissiveRadiance += e; bloomE += e; }`,
  });
  const cliff = new THREE.Mesh(cliffGeometry(o), mat);
  cliff.receiveShadow = true; cliff.castShadow = false;
  g.add(cliff);
  // bedrock floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 20).rotateX(-Math.PI / 2).translate(0, CLIFF.bottom, CLIFF.z + 4),
    detailMat({ color: col('graphite', 0.8), roughness: 0.95 }, { scale: 0.8, vary: 0.2, bump: 0.03 }));
  floor.receiveShadow = true;
  g.add(floor);
  // specimens
  const sym = await loadImage('assets/axiel-symbol-ink.png');
  const specs = await makeSpecimens(o.specimens ?? SPECIMENS, sym);
  g.add(specs);
  const tris = (() => { let t = 0; g.traverse(m => { if (m.isMesh) t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return t; })();
  g.userData = { mat, uniforms: U, cliff, specs, tris };
  return g;
}

/* ---------- specimens (PROPOSED stand-ins, G3 chooses the real 12) ----------
   Built merged across all 12, one mesh per material, so the whole set costs 7 draw calls
   (niches, stone sides, label atlas, symbol faces, site faces, brass graphs, graph backs). */
// 1.66 wide: holds "SPECIMEN No. 0xx" at cap 0.09 inside the narrowest niche (symbol, 1.8)
const LABEL = { w: 1.66, h: 0.22, d: 0.05, ppu: 600 };
const TAB = { symbol: [1.3, 1.3, 0.16], site: [1.8, 1.2, 0.1] };

/* a 1-segment box without its +z face (that face is drawn by a separate, textured plane) */
function sides(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const idx = Array.from(g.index.array);
  idx.splice(24, 6);                         // face order px nx py ny pz nz: drop pz
  g.setIndex(idx); g.clearGroups();
  return g;
}
/* a front plane whose uvs map into one row of an atlas (rows counted from the top) */
function front(w, h, row = 0, rows = 1) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / rows);
  return g;
}

function symbolCanvas(sym) {
  // the official AXIEL symbol (raster, never redrawn) raised in gold leaf on a lacquered graphite tablet
  const c = canvas(1024, 1024), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 1024);
  x.drawImage(tinted(sym, 760, 760 * sym.height / sym.width, '#fff'), 132, 512 - 380 * sym.height / sym.width);
  return c;
}
function siteCanvas() {
  // axiel.co.za as built: nav band (live nav), hero, the six /systems pages: engraved in gold on lacquer
  const [W, H] = TAB.site, P = 500;
  const c = canvas(W * P, H * P), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 0.012 * P;
  const R = (a, b, w, h) => x.strokeRect(a * P, b * P, w * P, h * P);
  R(0.06, 0.06, W - 0.12, H - 0.12);
  R(0.12, 0.12, W - 0.24, 0.12);
  setFont(x, 500, 0.05 * P, 'Montserrat', 0.12); x.textBaseline = 'middle';
  x.fillText('AXIEL', 0.18 * P, 0.18 * P);
  x.textAlign = 'right';
  x.fillText(SITE.nav.join('   '), (W - 0.18) * P, 0.18 * P);
  x.textAlign = 'left';
  R(0.12, 0.3, W - 0.24, 0.36);
  setFont(x, 500, 0.075 * P, 'Montserrat', 0.04);
  x.fillText('Beyond Immediate Reality', 0.2 * P, 0.48 * P);
  const cw = (W - 0.24 - 0.1) / 3;
  SITE.systems.forEach((n, i) => {
    const cx = 0.12 + (i % 3) * (cw + 0.05), cy = 0.72 + Math.floor(i / 3) * 0.2;
    R(cx, cy, cw, 0.16);
    setFont(x, 400, 0.04 * P, 'mono', 0.08); x.fillText(n, (cx + 0.04) * P, (cy + 0.08) * P);
  });
  return c;
}
/* every "SPECIMEN No. 0xx" label in one atlas, one row each (mono, bone inlay, cap 0.1) */
function labelAtlas(list) {
  const rows = list.map(s => labelMask(LABEL.w, LABEL.h, [{ t: `SPECIMEN No. ${s.no}`, cap: 0.09, y: LABEL.h / 2 + 0.045, mono: true, w: 400, track: 0.08 }], { ppu: LABEL.ppu }));
  const c = canvas(rows[0].width, rows[0].height * rows.length), x = c.getContext('2d');
  rows.forEach((r, i) => x.drawImage(r, 0, i * r.height));
  return c;
}
/* an agent workflow as a brass node graph (stand-in: real graph chosen at G3), non-indexed parts */
function graphParts(no) {
  const r = rng(parseInt(no, 10) * 31);
  const nodes = [];
  for (let i = 0; i < 6; i++) nodes.push(new THREE.Vector3(-0.7 + (i % 3) * 0.7 + r.range(-0.12, 0.12), 0.5 - Math.floor(i / 3) * 0.6 + r.range(-0.1, 0.1) + 0.1, 0.12));
  const parts = nodes.map(p => new THREE.IcosahedronGeometry(0.075, 1).translate(p.x, p.y, p.z));
  for (const [a, b] of [[0, 1], [1, 2], [0, 4], [1, 4], [2, 5], [4, 5], [3, 4]]) {
    const A = nodes[a], B = nodes[b], d = B.clone().sub(A), L = d.length();
    const cyl = new THREE.CylinderGeometry(0.012, 0.012, L, 6, 1).toNonIndexed();
    cyl.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    cyl.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    parts.push(cyl);
  }
  return parts.map(p => (p.index ? p.toNonIndexed() : p));
}

export async function makeSpecimens(list, sym) {   // exported for the G3 objects page (one specimen at a time)
  const B = { niche: [], sides: [], label: [], symbol: [], site: [], brass: [], back: [] };
  list.forEach((s, i) => {
    const at = (geo, x = 0, y = 0, z = 0) => geo.translate(s.x + x, s.y + y, CLIFF.z + 0.08 + z);
    const [hx, hy] = SPEC_HALF[s.type];
    // niche: a dark recess cut into the dressed stone
    B.niche.push(at(new THREE.BoxGeometry(2 * hx + 0.2, 2 * hy + 0.2, 0.3), 0, 0, -0.14));
    if (s.type === 'graph') {
      B.brass.push(...graphParts(s.no).map(p => at(p)));
      B.back.push(at(new THREE.BoxGeometry(1.7, 1.2, 0.06), 0, 0.12, 0.02));
    } else {
      const [w, h, d] = TAB[s.type];
      B.sides.push(at(sides(w, h, d), 0, 0.12, d / 2));
      B[s.type].push(at(front(w, h), 0, 0.12, d));
    }
    // label plate under the specimen
    const ly = -hy + 0.02, lz = 0.06;
    B.sides.push(at(sides(LABEL.w, LABEL.h, LABEL.d), 0, ly, lz));
    B.label.push(at(front(LABEL.w, LABEL.h, i, list.length), 0, ly, lz + LABEL.d / 2));
  });

  const trim = detailMat({ color: col('graphite', 0.7), roughness: 0.85 }, { scale: 4, vary: 0.15, bump: 0.01 });
  const symM = inlayMat(symbolCanvas(sym), { k: 'graphite', inlay: 'gold', carve: -0.35 }); symM.roughness = 0.45;
  const siteM = inlayMat(siteCanvas(), { k: 'graphite', inlay: 'gold', carve: 0.22 }); siteM.roughness = 0.4;
  const mats = {
    niche: detailMat({ color: col('ink').lerp(col('graphite'), 0.6), roughness: 0.95 }, { scale: 3, vary: 0.2, bump: 0.01 }),
    sides: trim,
    label: inlayMat(labelAtlas(list), { k: 'graphite', inlay: 'bone', carve: 0.15 }),
    symbol: symM, site: siteM,
    brass: detailMat({ color: col('gold'), roughness: 0.32, metalness: 1 }, { scale: 6, vary: 0.08, bump: 0.002 }),
    back: detailMat({ color: col('graphite', 0.9), roughness: 0.5 }, { scale: 5, vary: 0.1, bump: 0.004 }),
  };
  const g = new THREE.Group();
  for (const [k, geos] of Object.entries(B)) {
    if (!geos.length) continue;
    const m = new THREE.Mesh(mergeGeometries(geos), mats[k]);
    m.name = 'specimens-' + k; m.castShadow = k !== 'niche'; m.receiveShadow = true;
    g.add(m);
  }
  g.userData.list = list;
  return g;
}
