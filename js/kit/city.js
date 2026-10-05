/*
 * The city of websites (§3.2 [R3]): every building is a physical website.
 *   nav = a band of stone tabs · pages = floors · links = stairs · meta = the sign above the entrance
 *   share preview = the display window · business details = the nameplate by the door [G2-1]
 * Layout = /docs/city-plot-map.md (PROPOSED, G2-8). Fill buildings are instanced per archetype.
 */
import { THREE, HEX, col, rng, detailMat, canvas, canvasTex, setFont, loadImage, tinted } from '../core.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- layout (PROPOSED, G2-8) ---------- */
export const LAYOUT = {
  lip: -6,
  mainStreet: { x0: -8.5, x1: 8.5, z0: -6, z1: -39.5 },
  crossStreet: { x0: -9, x1: -1, z0: -39, z1: -49 },
  square: { x0: -8.5, x1: 16, z0: -49, z1: -64 },      // keeps the K10 → K11 climb clear (y < 18 here)
  clearing: { x: 10, z: -92, r: 28 },
  fault: { x0: -1, x1: 9, z0: -39, z1: -49, h: 22, arch: 'shop' },          // z0 = near edge, like every rect here
  neighbour: { x0: -19, x1: -9, z0: -39, z1: -49, h: 20, arch: 'shop' },
  path: [[0, -14], [2, -37]],
};
const ARCH = {
  //            ground floorH bay  winW winH top  arcade
  brochure: { g: 4.6, f: 3.4, bay: 3.2, ww: 2.0, wh: 1.7, top: 1.6, arch: 0 },
  shop: { g: 5.6, f: 3.0, bay: 2.2, ww: 1.1, wh: 1.7, top: 1.8, arch: 1 },
  app: { g: 4.4, f: 2.6, bay: 1.6, ww: 1.25, wh: 1.85, top: 1.4, arch: 0 },
};
const inRect = (x, z, r, m = 0) => x > r.x0 - m && x < r.x1 + m && z < r.z0 + m && z > r.z1 - m;
const rectHit = (p, r) => p.x0 < r.x1 && p.x1 > r.x0 && p.z1 < r.z0 && p.z0 > r.z1;

export function plots(o = {}) {
  const r = rng(4410);
  const cols = [];
  const W = [[-20, -8.5], [-33.5, -21.5], [-47, -35], [-60.5, -48.5], [-74, -62], [-87.5, -75.5]];
  for (const [a, b] of W) { cols.push([a, b]); cols.push([-b, -a]); }
  const rows = [[-7.5, -15.3], [-16.5, -23.3], [-24.5, -31.3], [-32.5, -38.5], [-39.5, -48.8], [-50, -56.6], [-57.8, -64]];
  for (let z = -70, k = 0; z > -190; k++) { rows.push([z, z - 8]); z -= (k % 3 === 2) ? 14 : 9.2; }
  const out = [];
  for (const [z0, z1] of rows) for (const [x0, x1] of cols) {
    const p = { x0, x1, z0, z1 };
    if (rectHit(p, LAYOUT.neighbour)) {      // before the cross-street test: its plot borders that street
      out.push({ ...LAYOUT.neighbour, role: 'neighbour' });
      continue;
    }
    if (rectHit(p, LAYOUT.fault) && x1 > LAYOUT.fault.x1 + 6 && !rectHit(p, LAYOUT.square)) p.x0 = LAYOUT.fault.x1 + 0.5;
    if (rectHit(p, LAYOUT.square) || rectHit(p, LAYOUT.fault) || rectHit(p, LAYOUT.crossStreet) || rectHit(p, LAYOUT.mainStreet)) continue;
    const cx = (p.x0 + p.x1) / 2, cz = (z0 + z1) / 2, C = LAYOUT.clearing;
    const corners = [[p.x0, z0], [p.x1, z0], [p.x0, z1], [p.x1, z1], [cx, cz]];
    if (corners.some(([x, z]) => Math.hypot(x - C.x, z - C.z) < C.r + 1)) continue;
    const near = Math.abs(cx) < 22 && cz > -66;
    const arch = near ? (r() < 0.55 ? 'shop' : 'brochure') : (r() < 0.6 ? 'app' : r() < 0.5 ? 'shop' : 'brochure');
    const h = arch === 'app' ? 28 + r() * 12 : arch === 'shop' ? 20 + r() * 7 : 18 + r() * 4;
    const sx = near ? 0 : r() * 0.8, sz = near ? 0 : r() * 0.8;
    out.push({ x0: p.x0 + sx, x1: p.x1 - sx * 0.5, z0: z0 - sz, z1: z1 + sz * 0.5, h, arch, role: near ? 'street' : 'fill', far: Math.abs(cx) > 36 || cz < -110 });
  }
  return out;
}

/* ---------- façade shader (masonry, cornices, nav band, windows, arcade) ---------- */
const FACADE_PARS = /* glsl */`
uniform float uGround, uFloorH, uBay, uWinW, uWinH, uTop, uArch, uLit, uWet, uNoWin, uNoNav;
uniform vec3 uGlass, uLitCol;
float fWin, fJoint, fBand, fCorn, fLitW, fRoof;
float facadeH(){
  fWin = 0.; fJoint = 0.; fBand = 0.; fCorn = 0.; fLitW = 0.; fRoof = 0.;
  vec3 n = vON;
  float base = 0.55 + 0.14 * vnoise(vec2(vLoc.x + vLoc.z, vLoc.y) * 2.3 + vSeed * 40.) + 0.06 * vnoise(vec2(vLoc.x + vLoc.z, vLoc.y) * 11.);
  if (n.y > 0.5) { fRoof = 1.; return base; }
  if (n.y < -0.5) return base;
  bool sx = abs(n.x) > 0.5;
  float u = sx ? vLoc.z : vLoc.x;
  float W = sx ? vSize.z : vSize.x;
  float y = vLoc.y, H = vSize.y;
  float row = floor(y / 0.5);
  float dy = abs(fract(y / 0.5 + 0.5) - 0.5) * 0.5;
  float dx = abs(fract(u / 1.1 + 0.5 * mod(row, 2.) + 0.5) - 0.5) * 1.1;
  fJoint = 1. - smoothstep(0.008, 0.024, min(dy, dx));
  float hgt = base - 0.24 * fJoint;
  if (y > H - 0.32) { fCorn = 1.; return base + 0.3; }
  float navTop = H - uTop, navBot = navTop - 1.0;
  if (uNoNav < 0.5 && y > navBot && y < navTop) {
    fBand = 1.;
    float tabs = max(2., floor((W - 1.0) / 1.9));
    float tw = (W - 1.0) / tabs;
    float lu = u + W * 0.5 - 0.5;
    float g = abs(fract(lu / tw + 0.5) - 0.5) * tw;
    float edge = min(y - navBot, navTop - y);
    float groove = (lu < 0. || lu > W - 1.0) ? 1. : 1. - smoothstep(0.03, 0.07, g);
    groove = max(groove, 1. - smoothstep(0.05, 0.1, edge));
    return base + 0.35 - 0.3 * groove;
  }
  if (y >= uGround - 0.15 && y < navBot) {
    float dc = abs(fract((y - uGround) / uFloorH + 0.5) - 0.5) * uFloorH;
    if (dc < 0.1) { fCorn = 1.; return base + 0.3; }
  }
  if (uNoWin > 0.5) return hgt;
  float lu = u + W * 0.5 - 0.6;
  if (lu <= 0. || lu >= W - 1.2) return hgt;
  if (y >= uGround && y < navBot - 0.2) {
    float fy = mod(y - uGround, uFloorH);
    float bays = max(1., floor((W - 1.2) / uBay));
    float bw = (W - 1.2) / bays;
    float fu = mod(lu, bw) - bw * 0.5;
    float d = max(abs(fu) - uWinW * 0.5, abs(fy - uFloorH * 0.5) - uWinH * 0.5);
    fWin = 1. - smoothstep(-0.02, 0.02, d);
    float wid = floor(lu / bw) + 37. * floor((y - uGround) / uFloorH) + (sx ? 101. : 0.) + sign(sx ? n.x : n.z) * 7.;
    fLitW = step(hash12(vec2(wid, vSeed * 97.)), 0.1) * fWin;
    return mix(hgt, 0.05, fWin);
  }
  if (y < uGround - 0.25) {
    float bays = max(1., floor((W - 1.2) / 3.0));
    float bw = (W - 1.2) / bays;
    float fu = mod(lu, bw) - bw * 0.5;
    float ow = bw * 0.34, oh = uGround - 1.3;
    float d;
    if (uArch > 0.5) { float spring = oh - ow; d = y < spring ? abs(fu) - ow : length(vec2(fu, y - spring)) - ow; }
    else d = max(abs(fu) - ow, abs(y - oh * 0.5) - oh * 0.5);
    fWin = 1. - smoothstep(-0.02, 0.02, d);
    return mix(hgt, 0.05, fWin);
  }
  return hgt;
}`;
const FACADE_VARY = 'varying vec3 vLoc; varying vec3 vSize; varying vec3 vON; varying float vSeed; uniform vec3 uSizeO; uniform vec3 uOrigin;';
const FACADE_VERT = /* glsl */`
  vec3 dsc = vec3(length(mm[0].xyz), length(mm[1].xyz), length(mm[2].xyz));
  vSize = dsc; vLoc = position * dsc; vON = objectNormal;
  if (uSizeO.x > 0.) { vSize = uSizeO; vLoc = (mm * vec4(position, 1.0)).xyz - uOrigin; }
  vSeed = fract(sin(dot(mm[3].xz, vec2(12.9898, 78.233))) * 43758.5453);`;

export function facadeMat(arch, o = {}) {
  const A = ARCH[arch];
  const U = {
    uGround: { value: o.ground ?? A.g }, uFloorH: { value: o.floorH ?? A.f }, uBay: { value: A.bay }, uWinW: { value: A.ww },
    uWinH: { value: A.wh }, uTop: { value: A.top }, uArch: { value: A.arch }, uLit: { value: o.lit ?? 0 }, uWet: { value: o.wet ?? 0 },
    uNoWin: { value: o.noWin ? 1 : 0 }, uNoNav: { value: o.noNav ? 1 : 0 },
    uGlass: { value: col('graphite', 0.3) }, uLitCol: { value: col('bone', 0.35) },
    // non-unit meshes (the fault building's front slab) pass their real size + base-centre origin
    uSizeO: { value: o.size ? new THREE.Vector3(...o.size) : new THREE.Vector3() }, uOrigin: { value: new THREE.Vector3(...(o.origin ?? [0, 0, 0])) },
  };
  return detailMat({ color: col(o.k ?? 'stone'), roughness: 0.88, metalness: 0, envMapIntensity: 0.6 }, {
    uniforms: U, varyings: FACADE_VARY, vertex: FACADE_VERT, pars: FACADE_PARS,
    height: 'facadeH()', vary: 0.12, bump: 0.018,
    albedo: `diffuseColor.rgb *= mix(0.78, 1.08, vSeed);
      diffuseColor.rgb *= 1.0 - 0.38 * fJoint;
      diffuseColor.rgb *= 1.0 + 0.1 * (fCorn + fBand * 0.6);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55, fRoof);
      diffuseColor.rgb *= mix(1.0, 0.62, uWet);
      diffuseColor.rgb = mix(diffuseColor.rgb, uGlass, fWin);`,
    rough: `roughnessFactor = mix(roughnessFactor, 0.32, uWet * (1. - fWin)); roughnessFactor = mix(roughnessFactor, 0.1, fWin);`,
    emis: `totalEmissiveRadiance += fLitW * uLit * uLitCol;`,
  });
}

const unitBox = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/* ---------- ground: setts on the plateau, wet film option (AMOS) ---------- */
export function groundMat(o = {}) {
  return detailMat({ color: col('graphite').lerp(col('stone'), 0.35), roughness: o.wet ? 0.18 : 0.9, metalness: 0, envMapIntensity: o.wet ? 1 : 0.4 }, {
    pars: `float sett(vec2 p){ vec2 c = vec2(p.x / 0.9 + 0.5 * mod(floor(p.y / 0.45), 2.), p.y / 0.45); vec2 f = abs(fract(c) - 0.5) * vec2(0.9, 0.45);
      return 1. - smoothstep(0.012, 0.03, min(0.45 - f.x, 0.225 - f.y)); }`,
    height: `0.5 + 0.12 * fbm(wp.xz * 1.7) - 0.3 * sett(wp.xz)`,
    vary: 0.3, bump: 0.02,
    albedo: o.wet ? `diffuseColor.rgb *= 0.55;` : '',
  });
}
export function makeGround(o = {}) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(420, 300).rotateX(-Math.PI / 2).translate(0, 0, -6 - 150), o.mat ?? groundMat(o));
  g.receiveShadow = true;
  return g;
}

/* ---------- fill + street buildings (instanced per archetype) ---------- */
export function makeCity(o = {}) {
  const g = new THREE.Group();
  const list = plots().filter(p => !(o.tier === 'mid' && p.far)).filter(p => !(o.skip && o.skip(p)));
  const by = { brochure: [], shop: [], app: [] };
  for (const p of list) by[p.arch].push(p);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  let count = 0;
  for (const arch of Object.keys(by)) {
    const L = by[arch];
    if (!L.length) continue;
    const im = new THREE.InstancedMesh(unitBox(), facadeMat(arch, o), L.length);
    L.forEach((p, i) => {
      m4.compose(new THREE.Vector3((p.x0 + p.x1) / 2, 0, (p.z0 + p.z1) / 2), q, new THREE.Vector3(p.x1 - p.x0, p.h, p.z0 - p.z1));
      im.setMatrixAt(i, m4);
    });
    im.castShadow = true; im.receiveShadow = true;
    im.userData.arch = arch;
    g.add(im);
    count += L.length;
  }
  g.userData.instances = count;
  g.userData.plots = list;
  return g;
}

/* ---------- copy for the fault building (real axiel.co.za data, 2026-10-02 curl) ---------- */
export const SITE = {
  domain: 'axiel.co.za',
  title: 'AXIEL · Beyond Immediate Reality',                // PROPOSED: live <title> has an em-dash + full stop (G2-9)
  description: 'AXIEL is a connected system of identity, web, campaign, automation, research and operating intelligence.', // live meta, verbatim
  nav: ['SYSTEMS', 'R&D', 'INTRODUCTION'],                  // live nav
  pages: ['HOME', 'SYSTEMS', 'R&D', 'INTRODUCTION', 'LEGAL', 'PRIVACY'], // top-level sitemap pages = floors (PROPOSED order)
  systems: ['IDENTITY', 'WEB', 'CORE', 'INDEX', 'CAMPAIGN', 'AUTOMATION'], // /systems/* = the 6 bays
  business: ['AXIEL', 'axiel.co.za', 'info@axiel.co.za'],   // address UNKNOWN
};
/* fault building geometry constants (world) */
export const FB = {
  x0: -1, x1: 9, z: -39, zb: -49, h: 22,
  ground: 8.2, floorH: 2.4, navY: [20.2, 21.2],
  win: { x0: 1, x1: 7, y0: 1.8, y1: 7.0 },                 // display window 6 × 5.2 (PROPOSED, was 6 × 4)
  door: { x0: 7.5, x1: 8.7, y1: 3.0 },
  plate: { x0: 2.8, x1: 7.0, y0: 0.1, y1: 1.65 },          // nameplate 4.2 × 1.55 (PROPOSED, was 3.6 × 1.4): the email line at the legibility cap needs ≈ 3.6
  fascia: { x0: -0.6, x1: 8.6, y0: 7.2, y1: 8.05 },
};
const PPU = 400; // texture px per world unit for legible panels

/* Share card (og:image + title + description) as it will read in the repaired window. */
export async function shareCardCanvas() {
  const w = FB.win.x1 - FB.win.x0 - 0.4, h = FB.win.y1 - FB.win.y0 - 0.4; // inside the gilded frame
  const c = canvas(Math.round(w * PPU), Math.round(h * PPU)), x = c.getContext('2d');
  const hi = canvas(c.width, c.height), hx = hi.getContext('2d');
  const U = PPU, m = 0.26 * U, cap = 0.25 * U;  // §4.1 rule 7: cap ≥ 0.25 u at K17 (desktop 18 px / phone 14 px)
  x.fillStyle = HEX.paper; x.fillRect(0, 0, c.width, c.height);
  hx.fillStyle = '#000'; hx.fillRect(0, 0, c.width, c.height);
  const mont = (wt) => setFont(x, wt, cap / 0.7, 'Montserrat', 0.01);
  // measure text block first, image takes what is left (og:image itself UNKNOWN: PROPOSED symbol on paper)
  mont(500);
  const wrapW = c.width - 2 * m;
  const wrapL = (s) => { const words = s.split(' '), L = []; let l = ''; for (const wd of words) { const t = l ? l + ' ' + wd : wd; if (x.measureText(t).width > wrapW && l) { L.push(l); l = wd; } else l = t; } if (l) L.push(l); return L; };
  const titleL = wrapL(SITE.title);
  mont(400);
  const descL = wrapL(SITE.description);
  const pitch = 0.42 * U;
  const textH = cap + 0.2 * U + titleL.length * pitch + 0.14 * U + descL.length * pitch;
  const imgH = c.height - 2 * m - textH - 0.22 * U;
  // image
  x.fillStyle = HEX.bone; x.fillRect(m, m, wrapW, imgH);
  const sym = await loadImage('assets/axiel-symbol-ink.png');
  const sh = imgH * 0.72, sw = sh * sym.width / sym.height;
  x.drawImage(tinted(sym, sw, sh, HEX.ink), m + (wrapW - sw) / 2, m + (imgH - sh) / 2);
  let y = m + imgH + 0.22 * U + cap;
  // domain (mono)
  x.fillStyle = HEX.stone; setFont(x, 400, cap / 0.73, 'mono', 0.02); x.textBaseline = 'alphabetic';
  x.fillText(SITE.domain.toUpperCase(), m, y);
  y += 0.2 * U + pitch - (pitch - cap);
  x.fillStyle = HEX.ink; mont(500);
  for (const l of titleL) { x.fillText(l, m, y); y += pitch; }
  y += 0.14 * U;
  mont(400);
  for (const l of descL) {
    const lw = x.measureText(l).width;
    hx.fillStyle = '#fff'; hx.fillRect(m - 0.05 * U, y - cap - 0.07 * U, lw + 0.1 * U, cap + 0.16 * U);
    // knock the glyphs (and a thin halo) out of the glow mask: the ink stays dark on the lit band
    setFont(hx, 400, cap / 0.7, 'Montserrat', 0.01); hx.textBaseline = 'alphabetic';
    hx.fillStyle = '#000'; hx.strokeStyle = '#000'; hx.lineWidth = 0.025 * U; hx.lineJoin = 'round';
    hx.strokeText(l, m, y); hx.fillText(l, m, y);
    x.fillStyle = HEX.hot; x.fillRect(m - 0.05 * U, y - cap - 0.07 * U, lw + 0.1 * U, cap + 0.16 * U);
    x.fillStyle = HEX.ink; x.fillText(l, m, y);
    y += pitch;
  }
  return { color: c, hi, w, h, lines: { title: titleL, desc: descL }, cap: 0.25 };
}

/* Nameplate: business details in gold leaf on stone (repaired) or blank (fault). */
export function nameplateCanvas(filled) {   // exported for the G4 animatic
  const w = FB.plate.x1 - FB.plate.x0, h = FB.plate.y1 - FB.plate.y0;
  const c = canvas(Math.round(w * PPU), Math.round(h * PPU)), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  if (filled) {
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    const cap = 0.26 * PPU, pitch = 0.4 * PPU;
    const [a, b, d] = SITE.business;
    setFont(x, 500, 0.3 * PPU / 0.7, 'Montserrat', 0.12);
    x.textAlign = 'center';
    let y = (c.height - (0.3 * PPU + 2 * pitch)) / 2 + 0.3 * PPU;   // block centred: first cap top to last baseline
    x.fillText(a, c.width / 2 + 0.018 * PPU, y);
    setFont(x, 400, cap / 0.7, 'Montserrat', 0.02);
    y += pitch; x.fillText(b, c.width / 2, y);
    y += pitch; x.fillText(d, c.width / 2, y);
    // every line must sit inside the bevelled border at the legibility cap (§4.1 rule 7), or the render gate fails
    const room = c.width - 0.36 * PPU;
    for (const t of [b, d]) if (x.measureText(t).width > room) console.error(`nameplate: "${t}" is ${(x.measureText(t).width / PPU).toFixed(2)} wide, room ${(room / PPU).toFixed(2)}`);
  }
  // bevelled border inlay
  x.strokeStyle = '#fff'; x.lineWidth = 0.025 * PPU; x.strokeRect(0.06 * PPU, 0.06 * PPU, c.width - 0.12 * PPU, c.height - 0.12 * PPU);
  return c;
}

/* Carved label strip: canvas mask (white = carved / inlaid) */
export function labelMask(wU, hU, lines, o = {}) {
  const c = canvas(Math.round(wU * (o.ppu ?? 200)), Math.round(hU * (o.ppu ?? 200))), x = c.getContext('2d');
  const P = o.ppu ?? 200;
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff'; x.textBaseline = 'alphabetic'; x.textAlign = 'center';
  for (const L of lines) {
    // fit guard: never clip; shrink the line to the plate width less a margin of one cap height a side
    let px = (L.cap / 0.7) * P;
    const tr = L.track ?? 0.12, fam = L.mono ? 'mono' : 'Montserrat', room = c.width - 2 * L.cap * P;
    setFont(x, L.w ?? 500, px, fam, tr);
    const tw = x.measureText(L.t).width - px * tr;
    if (tw > room) { px *= room / tw; setFont(x, L.w ?? 500, px, fam, tr); }
    x.fillText(L.t, c.width / 2 + px * tr / 2, L.y * P);
  }
  return c;
}
/* A plaque material: stone (or graphite) with a mask that is carved (recessed) and optionally gilded or bone-inlaid. */
export function inlayMat(mask, o = {}) {
  const t = canvasTex(mask, false);
  const U = { uMask: { value: t } };
  const inlay = o.inlay ?? 'gold';
  const m = detailMat({ color: col(o.k ?? 'stone'), roughness: 0.8, metalness: 0, map: null, envMapIntensity: 1 }, {
    uniforms: U, varyings: 'varying vec2 vUv2;', vertex: 'vUv2 = uv;',
    pars: 'uniform sampler2D uMask; float fM;',
    height: `(fM = texture2D(uMask, vUv2).r, 0.5 + 0.08 * fbm(wp.xy * 6.) - ${o.carve ?? 0.25} * fM)`,
    vary: 0.14, bump: 0.006,
    albedo: inlay === 'gold' ? `diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(col('gold'))}, fM);`
      : inlay === 'bone' ? `diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(col('bone'))}, fM * 0.9);` : `diffuseColor.rgb *= 1.0 - 0.45 * fM;`,
    rough: inlay === 'gold' ? 'roughnessFactor = mix(roughnessFactor, 0.28, fM); metalnessFactor = mix(metalnessFactor, 1.0, fM);' : '',
  });
  return m;
}
export const glsl = (c) => `vec3(${c.r.toFixed(5)}, ${c.g.toFixed(5)}, ${c.b.toFixed(5)})`;

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function plane(w, h, x, y, z) { return new THREE.PlaneGeometry(w, h).translate(x, y, z); }
/* a box without its +z face (sides join the shared trim mesh; the face is its own textured plane) */
function sidesBox(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  const idx = Array.from(g.index.array); idx.splice(24, 6);
  g.setIndex(idx); g.clearGroups();
  return g.translate(x, y, z);
}

/*
 * The fault building (§3.2): shop archetype, 10 × 10 × 22, front face z = −39.
 * state: 'empty' (INDEX: empty display window + blank nameplate) or 'repaired' (share card + gilded frame + gold-leaf nameplate)
 */
export async function makeFaultBuilding(o = {}) {
  const state = o.state ?? 'empty';
  const g = new THREE.Group();
  const refs = {};
  const wet = o.wet ? 1 : 0;
  const mason = facadeMat('shop', { ground: FB.ground, floorH: FB.floorH, wet, noNav: true });
  // body (sides + back use the procedural façade; front is a real slab)
  const body = new THREE.Mesh(unitBox(), mason);
  body.scale.set(FB.x1 - FB.x0, FB.h, 10 - 0.4); body.position.set((FB.x0 + FB.x1) / 2, 0, FB.zb + (10 - 0.4) / 2);
  g.add(body);

  // front slab with real openings
  const sh = new THREE.Shape();
  const X = (x) => x - (FB.x0 + FB.x1) / 2;
  sh.moveTo(X(FB.x0), 0); sh.lineTo(X(FB.x1), 0); sh.lineTo(X(FB.x1), FB.h); sh.lineTo(X(FB.x0), FB.h); sh.closePath();
  const hole = (x0, y0, x1, y1) => { const p = new THREE.Path(); p.moveTo(X(x0), y0); p.lineTo(X(x0), y1); p.lineTo(X(x1), y1); p.lineTo(X(x1), y0); p.closePath(); sh.holes.push(p); };
  const W = FB.win, D = FB.door;
  hole(W.x0, W.y0, W.x1, W.y1);
  hole(D.x0, 0.06, D.x1, D.y1);
  const upper = [];
  for (let f = 0; f < 5; f++) {
    const y0 = FB.ground + f * FB.floorH + 0.6, y1 = y0 + 1.3;
    const xs = f === 0 ? [0, 1, 2, 3, 4, 5].map(i => FB.x0 + 0.833 + i * 1.667) : [1.2, 4, 6.8];
    const ww = f === 0 ? 0.92 : 1.7;
    for (const cx of xs) { hole(cx - ww / 2, y0, cx + ww / 2, y1); upper.push([cx, (y0 + y1) / 2, ww, 1.3]); }
  }
  const slabGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false });
  slabGeo.translate((FB.x0 + FB.x1) / 2, 0, FB.z - 0.4);
  const slabMat = facadeMat('shop', { ground: FB.ground, floorH: FB.floorH, wet, noWin: true, noNav: true,
    size: [FB.x1 - FB.x0, FB.h, 0.4], origin: [(FB.x0 + FB.x1) / 2 + (o.at?.[0] ?? 0), o.at?.[1] ?? 0, FB.z - 0.2 + (o.at?.[2] ?? 0)] });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  g.add(slab);

  // cornices (floor lines), parapet coping, stall riser, sill
  const trim = detailMat({ color: col('stone', 1.1), roughness: wet ? 0.35 : 0.8 }, { scale: 3, vary: 0.1, bump: 0.01, albedo: wet ? 'diffuseColor.rgb *= 0.65;' : '' });
  const tg = [];
  for (let f = 0; f <= 5; f++) tg.push(box(FB.x1 - FB.x0 + 0.3, 0.18, 0.22, (FB.x0 + FB.x1) / 2, FB.ground + f * FB.floorH, FB.z + 0.1));
  tg.push(box(FB.x1 - FB.x0 + 0.4, 0.3, 0.3, (FB.x0 + FB.x1) / 2, FB.h - 0.15, FB.z + 0.12));
  tg.push(box(W.x1 - W.x0 + 0.3, 0.14, 0.3, (W.x0 + W.x1) / 2, W.y0 - 0.07, FB.z + 0.12)); // sill
  for (const [cx, cy, ww] of upper) tg.push(box(ww + 0.16, 0.08, 0.14, cx, cy - 0.69, FB.z + 0.05));
  // (tg stays open: the tab, fascia and nameplate sides join it; the trim mesh is added at the end)

  // nav band: three real tabs, carved with the live nav (SYSTEMS · R&D · INTRODUCTION)
  const navH = FB.navY[1] - FB.navY[0];
  const tabW = [2.5, 1.5, 3.4], gap = 0.25;
  let tx = FB.x0 + 0.5;
  refs.nav = [];
  for (let i = 0; i < 3; i++) {
    const m = inlayMat(labelMask(tabW[i], navH, [{ t: SITE.nav[i], cap: 0.3, y: navH / 2 + 0.15 }]), { inlay: 'bone', carve: 0.3 });
    const cx = tx + tabW[i] / 2, cy = (FB.navY[0] + FB.navY[1]) / 2;
    tg.push(sidesBox(tabW[i], navH, 0.28, cx, cy, FB.z + 0.14));
    const tab = new THREE.Mesh(plane(tabW[i], navH, cx, cy, FB.z + 0.28), m);
    g.add(tab); refs.nav.push(tab);
    tx += tabW[i] + gap;
  }
  // blank band continuation (stone) to the right of the tabs
  tg.push(box(FB.x1 - 0.3 - tx, navH, 0.16, (tx + FB.x1 - 0.3) / 2, (FB.navY[0] + FB.navY[1]) / 2, FB.z + 0.08));

  // fascia sign above the entrance: the meta title + description (present, not a fault)
  const F = FB.fascia, fw = F.x1 - F.x0, fh = F.y1 - F.y0;
  const signMask = labelMask(fw, fh, [
    { t: SITE.title, cap: 0.26, y: 0.42, w: 500, track: 0.06 },
    { t: SITE.description, cap: 0.1, y: 0.7, w: 400, track: 0.02 },
  ], { ppu: 260 });
  const fasciaMat = inlayMat(signMask, { k: 'graphite', inlay: 'bone', carve: 0.2 });
  tg.push(sidesBox(fw, fh, 0.18, (F.x0 + F.x1) / 2, (F.y0 + F.y1) / 2, FB.z + 0.09));
  const fascia = new THREE.Mesh(plane(fw, fh, (F.x0 + F.x1) / 2, (F.y0 + F.y1) / 2, FB.z + 0.18), fasciaMat);
  g.add(fascia);

  // glass in every upper opening (dark, reflective)
  const glassDark = new THREE.MeshStandardMaterial({ color: col('graphite', 0.35), roughness: 0.08, metalness: 0, envMapIntensity: 1.2 });
  g.add(new THREE.Mesh(mergeGeometries(upper.map(([cx, cy, ww, hh]) => plane(ww, hh, cx, cy, FB.z - 0.28))), glassDark));
  // recess backs so the openings never show the body face
  // door: recessed graphite panel + brass pull
  g.add(new THREE.Mesh(box(D.x1 - D.x0, D.y1, 0.06, (D.x0 + D.x1) / 2, D.y1 / 2, FB.z - 0.32), new THREE.MeshStandardMaterial({ color: col('graphite'), roughness: 0.55 })));
  const brass = detailMat({ color: col('gold'), roughness: 0.32, metalness: 1 }, { scale: 6, vary: 0.08, bump: 0.002 });
  g.add(new THREE.Mesh(box(0.05, 0.5, 0.06, D.x0 + 0.18, 1.3, FB.z - 0.26), brass));
  // threshold step
  tg.push(box(D.x1 - D.x0 + 0.4, 0.12, 0.6, (D.x0 + D.x1) / 2, 0.06, FB.z + 0.2));

  // display window: recess back, display ledge, glass, frame
  const wcx = (W.x0 + W.x1) / 2, wcy = (W.y0 + W.y1) / 2, ww = W.x1 - W.x0, wh = W.y1 - W.y0;
  const plaster = detailMat({ color: col('bone', state === 'empty' ? 0.55 : 0.8), roughness: 0.95 }, { scale: 5, vary: 0.12, bump: 0.004 });
  g.add(new THREE.Mesh(plane(ww, wh, wcx, wcy, FB.z - 0.39), plaster));
  tg.push(box(ww, 0.08, 0.36, wcx, W.y0 + 0.04, FB.z - 0.2)); // display ledge
  if (state === 'repaired') {
    const card = await shareCardCanvas();
    const ct = canvasTex(card.color, true), ht = canvasTex(card.hi, false);
    const cardMat = detailMat({ color: 0xffffff, map: ct, roughness: 0.85, emissive: col('paper'), emissiveMap: ct, emissiveIntensity: o.cardGlow ?? 0.22 }, {
      uniforms: { uHi: { value: ht }, uHot: { value: col('hot') }, uHiS: { value: o.hiGlow ?? 0.9 } },
      pars: 'uniform sampler2D uHi; uniform vec3 uHot; uniform float uHiS;', scale: 40, vary: 0.02, bump: 0.001, bloomPart: true,
      emis: `{ float hm = texture2D(uHi, vMapUv).r; vec3 e = hm * uHot * uHiS; totalEmissiveRadiance += e; bloomE += e * 0.25; }`,
    });
    const cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(card.w, card.h).translate(wcx, wcy, FB.z - 0.3), cardMat);
    g.add(cardMesh);
    refs.card = { mesh: cardMesh, ...card };
    // gilded frame (gold leaf)
    const gl = detailMat({ color: col('gold').lerp(col('hot'), 0.3), roughness: 0.24, metalness: 1 }, { scale: 14, vary: 0.2, bump: 0.01 });
    const fr = 0.2;
    g.add(new THREE.Mesh(mergeGeometries([
      box(ww + 2 * fr, fr, 0.14, wcx, W.y1 + fr / 2, FB.z + 0.07), box(ww + 2 * fr, fr, 0.14, wcx, W.y0 - fr / 2 + 0.0001, FB.z + 0.07),
      box(fr, wh, 0.14, W.x0 - fr / 2, wcy, FB.z + 0.07), box(fr, wh, 0.14, W.x1 + fr / 2, wcy, FB.z + 0.07),
    ]), gl));
    refs.gild = gl;
  } else {
    // empty: plain stone reveal moulding only
    tg.push(box(ww + 0.24, 0.12, 0.1, wcx, W.y1 + 0.06, FB.z + 0.05),
      box(0.12, wh, 0.1, W.x0 - 0.06, wcy, FB.z + 0.05), box(0.12, wh, 0.1, W.x1 + 0.06, wcy, FB.z + 0.05));
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: col('bone'), roughness: state === 'empty' ? 0.3 : 0.04, transparent: true, opacity: state === 'empty' ? 0.22 : 0.1, clearcoat: 1, clearcoatRoughness: state === 'empty' ? 0.4 : 0.03, depthWrite: false, envMapIntensity: 1.2 });
  const pane = new THREE.Mesh(plane(ww, wh, wcx, wcy, FB.z - 0.06), glass);
  pane.renderOrder = 2;
  g.add(pane);
  refs.pane = pane;

  // nameplate by the door
  const P = FB.plate, pw = P.x1 - P.x0, ph = P.y1 - P.y0;
  const pm = state === 'repaired' ? inlayMat(nameplateCanvas(true), { k: 'graphite', inlay: 'gold', carve: 0.18 })
    : inlayMat(nameplateCanvas(false), { k: 'stone', inlay: 'none', carve: 0.1 });
  if (state !== 'repaired') pm.color.copy(col('bone', 0.62));
  tg.push(sidesBox(pw, ph, 0.08, (P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, FB.z + 0.04));
  const plate = new THREE.Mesh(plane(pw, ph, (P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, FB.z + 0.08), pm);
  g.add(plate);
  refs.plate = plate;

  // exterior stair on the cross-street side (links between pages): ground → SYSTEMS floor, scissor flights
  const steps = [];
  const rise = FB.ground / 2 / 14;
  for (let i = 0; i < 14; i++) {
    steps.push(box(1.2, rise, 0.44, FB.x0 - 0.6, rise * (i + 0.5), FB.z - 0.8 - i * 0.42 - 0.22));
    steps.push(box(1.2, rise, 0.44, FB.x0 - 1.8, FB.ground / 2 + rise * (i + 0.5), FB.zb + 3.2 + i * 0.42 + 0.22));
  }
  steps.push(box(2.4, 0.2, 1.6, FB.x0 - 1.2, FB.ground / 2 - 0.1, FB.z - 0.8 - 14 * 0.42 - 0.8));   // landing
  steps.push(box(2.4, 0.2, 1.4, FB.x0 - 1.2, FB.ground - 0.1, FB.zb + 3.2 + 14 * 0.42 + 0.7));      // top landing
  // stringer walls under the flights
  steps.push(box(0.16, FB.ground / 2, 6.2, FB.x0 - 2.4, FB.ground / 4, FB.z - 3.9));
  // every stone trim piece (cornices, sills, tab / fascia / plate sides, stair) in one mesh
  g.add(new THREE.Mesh(mergeGeometries([...tg, ...steps].map(x => (x.index ? x.toNonIndexed() : x))), trim));

  g.traverse(m => { if (m.isMesh) { m.castShadow = !m.material.transparent; m.receiveShadow = true; } });
  g.userData.refs = refs;
  g.userData.state = state;
  return g;
}

/* Stained neighbour (§3.2): one stain stays after AMOS (signal-red soaked into its sign) */
export function stainDecal(o = {}) {
  const c = canvas(512, 512), x = c.getContext('2d'), r = rng(o.seed ?? 77);
  x.clearRect(0, 0, 512, 512);
  const blot = (cx, cy, rad, a) => {
    const gr = x.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    gr.addColorStop(0, `rgba(194,65,45,${a})`); gr.addColorStop(0.7, `rgba(194,65,45,${a * 0.55})`); gr.addColorStop(1, 'rgba(194,65,45,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  };
  for (let i = 0; i < 26; i++) blot(256 + (r() - 0.5) * 180, 200 + (r() - 0.5) * 120, 30 + r() * 70, 0.35 + r() * 0.3);
  // runs: the soak bleeds down
  for (let i = 0; i < 9; i++) { const sx = 256 + (r() - 0.5) * 220, len = 80 + r() * 200; for (let k = 0; k < len; k += 6) blot(sx + Math.sin(k * 0.05) * 3, 240 + k, 10 - k / len * 7, 0.22); }
  const t = canvasTex(c, true);
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 4, o.h ?? 4), m);
  return mesh;
}
