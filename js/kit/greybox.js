/*
 * G4 grey-box world as numbers (§4.4, §4.6, §4.1 rules 6 and 7): the event timeline the animatic plays,
 * every obstacle the camera must clear, and the clearance / pacing / legibility checks. No rendering here,
 * so the checks run the same in the page and in Node.
 */
import * as THREE from 'three';
import { KEYS, SCENES, cameraAt } from '../camera.js';
import { plots, LAYOUT, FB } from './city.js';
import { CLIFF, LINES } from './strata.js';
import { WALL } from './paperwall.js';
import { makeCore, CORE } from './livingcore.js';
import { beat, scrub } from '../timeline.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- timeline: event times from protocol §5.3; only the in-between shapes (linear ramps, dart curve) are PROPOSED ---------- */
export const TIMELINE = [
  ['tear', '§5.3: crack appears and grows 0.05 → 0.07 (open 0 → 0.3), paper tears 0.07 → 0.08 (0.3 → 1), fall 0.08 → 0.12'],
  ['heal', '§5.3: tear heals 0.94 → 0.96, during the return flight 0.92 → 0.95'],
  ['carto', '§5.3: walks 0.24 → 0.37 from (0, 0, −14) to (2, 0, −37); raise_lantern 0.34, unfurl_map 0.37, fold_dart 0.40, throw_dart 0.42'],
  ['dart', '§5.3: in hand from fold 0.40, flies 0.42 → 0.46 to the Core\'s cable inlet (lowest tier, +z face); flight curve PROPOSED'],
  ['seal', '§5.3: stamps at 0.98'],
];
export const VH = { desk: 1200, phone: 900 };   // §4.2 scroll length
export const SCROLL_VH_PER_S = 30;              // PROPOSED steady scroll for the animatic: desktop 40 s, phone 30 s
// G5: beat times come from the timing table (js/timeline.js), not from here
const B = (id) => beat(id);
export const T = { crack: B('crack').p0, tear: B('tear').p0, open: B('tear').p1, walk0: B('walk').p0, walk1: B('walk').p1, fold: B('fold').p0, throw: B('throw').p0, hit: B('dart').p1, heal0: B('heal').p0, heal1: B('heal').p1, seal: B('seal').p0 };

export function tearOpen(p) {
  if (p < T.crack) return 0;
  if (p < T.tear) return 0.3 * scrub('crack', p);   // §5.3 crack eases EASE_DEPART
  if (p < T.open) return 0.3 + 0.7 * (p - T.tear) / (T.open - T.tear);
  if (p < T.heal0) return 1;
  if (p < T.heal1) return 1 - (p - T.heal0) / (T.heal1 - T.heal0);
  return 0;
}
/* the tear outline, mirrored line for line from paperwall.js TEAR_GLSL (crack line, bulge and fibre jag included) */
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const crackX = (y) => 0.22 * Math.sin(1.7 * y + 1.0) + 0.11 * Math.sin(4.3 * y + 2.0) + 0.045 * Math.sin(11.0 * y + 0.5) + 0.02 * Math.sin(29.0 * y);
const tearHL = (u) => WALL.tearHL * sstep(0, 0.3, u);
const tearHW = (u) => 0.03 * sstep(0, 0.08, u) + WALL.tearHW * Math.pow(sstep(0.25, 1, u), 1.3);
function edge(y, u, sd) {   // |dx| of the outline on side sd at height y
  const hl = Math.max(tearHL(u), 1e-3), hw = tearHW(u), ty = clamp(y / hl, -1, 1);
  const bulge = 1 + 0.16 * Math.sin(2.3 * y + 1 + 2.5 * sd) + 0.09 * Math.sin(5.9 * y + 2 + 1.7 * sd);
  const fibre = (0.09 * Math.sin(9.7 * y + 3 * sd) + 0.05 * Math.sin(23.1 * y + 1 + sd) + 0.025 * Math.sin(51 * y + 2 * sd)) * Math.min(hw, 1);
  return hw * Math.pow(Math.max(1 - ty * ty, 0), 0.6) * bulge + fibre;
}
/* signed distance to the outline as the shader approximates it: < 0 is torn away (an opening) */
export function tearD(x, y, u) {
  if (u <= 0) return Infinity;
  const dx = x - crackX(y), sd = Math.sign(dx) || 1;
  return Math.max(Math.abs(dx) - edge(y, u, sd), Math.abs(y) - tearHL(u));
}
export function tearPolygon(u, n = 160) {
  if (u <= 0) return null;
  const hl = tearHL(u), R = [], L = [];
  for (let i = 0; i <= n; i++) {
    const y = -hl + 2 * hl * i / n, c = crackX(y);
    R.push([c + Math.max(edge(y, u, 1), 0.002), y]); L.push([c - Math.max(edge(y, u, -1), 0.002), y]);
  }
  return [...R, ...L.reverse()];
}

export function cartoAt(p) {
  const [a, b] = LAYOUT.path, f = clamp((p - T.walk0) / (T.walk1 - T.walk0));
  return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), heading: Math.atan2(b[0] - a[0], b[1] - a[1]), walking: f > 0 && f < 1 };
}
export const INLET = new THREE.Vector3(CORE.x, CORE.y - 3, CORE.z + 5.1);
const D0 = new THREE.Vector3(2.25, 1.35, -37.1), D1 = new THREE.Vector3(5, 30, -58);
export function dartAt(p) {
  if (p < T.fold || p > T.hit) return null;
  if (p < T.throw) return D0.clone();
  const t = (p - T.throw) / (T.hit - T.throw), u = 1 - t;
  return D0.clone().multiplyScalar(u * u).add(D1.clone().multiplyScalar(2 * u * t)).add(INLET.clone().multiplyScalar(t * t));
}

/* ---------- obstacles ---------- */
export function buildings() {
  const out = plots().map(b => ({ ...b, name: b.role === 'neighbour' ? 'stained neighbour' : `${b.arch} plot (${((b.x0 + b.x1) / 2).toFixed(0)}, ${((b.z0 + b.z1) / 2).toFixed(0)}) h ${b.h.toFixed(1)}` }));
  out.push({ x0: FB.x0, x1: FB.x1, z0: FB.z, z1: FB.zb, h: FB.h, arch: 'shop', role: 'fault', name: 'fault building' });
  return out;
}
/* the Core as a solid of revolution, measured from the real makeCore() geometry: [y0, y1, r] slabs */
export function coreProfile(step = 0.25) {
  const g = makeCore({ state: 'asleep' }); g.updateMatrixWorld(true);
  const bins = new Map(), v = new THREE.Vector3();
  g.traverse(o => {
    if (!o.isMesh) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld);
      const k = Math.floor(v.y / step), r = Math.hypot(v.x - CORE.x, v.z - CORE.z);
      if (r > (bins.get(k) ?? 0)) bins.set(k, r);
    }
  });
  const keys = [...bins.keys()].sort((a, b) => a - b);
  // a slab's radius is the larger of its own and its neighbours' (vertices sit on slab edges)
  return keys.map(k => [k * step, (k + 1) * step, Math.max(bins.get(k), bins.get(k - 1) ?? 0, bins.get(k + 1) ?? 0)]);
}

const boxDist = (P, b) => {
  const dx = Math.max(b.x0 - P.x, 0, P.x - b.x1), dy = Math.max(0 - P.y, 0, P.y - b.h), dz = Math.max(b.z1 - P.z, 0, P.z - b.z0);
  if (dx === 0 && dy === 0 && dz === 0) return -Math.min(P.x - b.x0, b.x1 - P.x, P.y, b.h - P.y, P.z - b.z1, b.z0 - P.z);
  return Math.hypot(dx, dy, dz);
};
function terrainDist(P) {
  // solid ground: y ≤ 0 behind the cliff face (z ≤ −6); the chasm runs to y −64 in front of it
  if (P.y <= 0 && P.z <= CLIFF.z) return { d: -Math.min(-P.y, CLIFF.z - P.z), name: 'inside the plateau' };
  if (P.y > 0 && P.z <= CLIFF.z) return { d: P.y, name: 'ground', ground: true };
  if (P.y > 0) return { d: Math.hypot(P.y, P.z - CLIFF.z), name: 'cliff lip' };
  const face = P.z - CLIFF.z, floor = P.y - CLIFF.bottom;
  return face < floor ? { d: face, name: 'cliff face' } : { d: floor, name: 'chasm floor' };
}
function wallDist(P, o) {
  const R = { x0: -WALL.w / 2, x1: WALL.w / 2, y0: WALL.cy - WALL.h / 2, y1: WALL.cy + WALL.h / 2 };
  let dxy;
  const outside = Math.hypot(Math.max(R.x0 - P.x, 0, P.x - R.x1), Math.max(R.y0 - P.y, 0, P.y - R.y1));
  if (outside > 0) dxy = outside;
  else { const d = tearD(P.x, P.y, o); dxy = d < 0 ? -d : 0; }   // inside the opening: distance to its torn edge
  return Math.hypot(P.z, dxy);
}
const coreDist = (P, prof) => {
  const rho = Math.hypot(P.x - CORE.x, P.z - CORE.z);
  let m = Infinity, inside = false;
  for (const [y0, y1, r] of prof) {
    const dr = Math.max(rho - r, 0), dy = Math.max(y0 - P.y, 0, P.y - y1);
    if (dr === 0 && dy === 0) inside = true;
    m = Math.min(m, Math.hypot(dr, dy));
  }
  return inside ? -0.01 : m;
};
const cartoDist = (P, p) => {
  const c = cartoAt(p), y = clamp(P.y, 0.3, 1.5);
  return Math.hypot(P.x - c.x, P.y - y, P.z - c.z) - 0.35;   // 1.8-unit block as a capsule, radius 0.35
};

/* nearest obstacle at camera position P, progress p */
export function nearest(P, p, W) {
  const all = [];
  const t = terrainDist(P); all.push({ d: t.d, cls: t.ground ? 'ground' : 'cliff', name: t.name });
  all.push({ d: wallDist(P, tearOpen(p)), cls: 'wall', name: 'paper wall' });
  let bd = Infinity, bn = '';
  for (const b of W.buildings) { const d = boxDist(P, b); if (d < bd) { bd = d; bn = b.name; } }
  all.push({ d: bd, cls: 'building', name: bn });
  all.push({ d: coreDist(P, W.core), cls: 'core', name: 'Living Core' });
  all.push({ d: cartoDist(P, p), cls: 'cartographer', name: 'Cartographer block' });
  return all;
}

export function world() { return { buildings: buildings(), core: coreProfile() }; }

const keyAt = (p) => { let i = 0; while (i < KEYS.length - 2 && p >= KEYS[i + 1].p) i++; return `${KEYS[i].key}→${KEYS[i + 1].key}`; };
export const CORRIDOR = { r: 1.5, p0: KEYS.find(k => k.key === 'K5').p, p1: KEYS.find(k => k.key === 'K19').p };

/* §4.1 rule 6: clearance along the whole path, the 1.5 corridor K5 → K19, both tear crossings, the look-at gap */
export function clearance(phone, W, step = 0.0005) {
  const N = Math.round(1 / step), min = {}, inter = [], corr = [], crossings = [];
  let lookGap = { d: Infinity, p: 0 }, prev = null, openI = null, openC = null;
  for (let i = 0; i <= N; i++) {
    const p = i / N, s = cameraAt(p, phone), P = s.pos;
    const all = nearest(P, p, W);
    for (const o of all) if (!min[o.cls] || o.d < min[o.cls].d) min[o.cls] = { d: o.d, p, at: keyAt(p), name: o.name };
    const solid = all.filter(o => o.cls !== 'ground'), worst = solid.reduce((a, b) => (b.d < a.d ? b : a));
    const hit = all.reduce((a, b) => (b.d < a.d ? b : a));
    // intersections: anything at or below zero (the ground counts here)
    if (hit.d <= 0) { if (!openI) inter.push(openI = { p0: p, p1: p, d: hit.d, name: hit.name }); openI.p1 = p; openI.d = Math.min(openI.d, hit.d); } else openI = null;
    // corridor: solid obstacles (not the ground: the walk is at eye level by design) closer than r between K5 and K19
    if (p >= CORRIDOR.p0 && p <= CORRIDOR.p1 && worst.d < CORRIDOR.r) {
      if (!openC) corr.push(openC = { p0: p, p1: p, d: worst.d, name: worst.name, at: keyAt(p) });
      openC.p1 = p; if (worst.d < openC.d) { openC.d = worst.d; openC.name = worst.name; openC.at = keyAt(p); }
    } else openC = null;
    const g = s.look.distanceTo(P);
    if (g < lookGap.d) lookGap = { d: g, p, at: keyAt(p) };
    if (prev && Math.sign(prev.P.z) !== Math.sign(P.z) && P.z !== 0) {
      const f = prev.P.z / (prev.P.z - P.z), x = lerp(prev.P.x, P.x, f), y = lerp(prev.P.y, P.y, f), pc = lerp(prev.p, p, f), o = tearOpen(pc), d = tearD(x, y, o);
      crossings.push({ p: pc, at: keyAt(pc), x, y, open: o, inside: d < 0, margin: -d });
    }
    prev = { P: P.clone(), p };
  }
  const corridorOk = corr.length === 0, interOk = inter.length === 0, crossOk = crossings.every(c => c.inside && c.open >= 1);
  return { step, min, intersections: inter, corridor: corr, crossings, lookGap, pass: corridorOk && interOk && crossOk && lookGap.d > 1 };
}

/* pacing at the PROPOSED steady scroll: per segment length, time, average and peak speed, peak turn rate and FOV
 * rate. remap: a camera timing mode from timeline.js (G5); the speed change at each key is measured frame to frame */
export function pacing(phone, sub = 200, remap = (p) => p) {
  const vh = phone ? VH.phone : VH.desk, rows = [];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const A = KEYS[i], B = KEYS[i + 1], dur = (B.p - A.p) * vh / SCROLL_VH_PER_S, dt = dur / sub;
    let len = 0, turn = 0, peak = 0, v0 = 0, v1 = 0, prev = null;
    for (let k = 0; k <= sub; k++) {
      const p = A.p + (B.p - A.p) * k / sub, s = cameraAt(remap(Math.min(p, B.p - 1e-9 * (k === sub)), phone), phone);
      const dir = s.look.clone().sub(s.pos).normalize();
      if (prev) { const d = s.pos.distanceTo(prev.pos), v = d / dt; len += d; peak = Math.max(peak, v); if (k === 1) v0 = v; v1 = v; turn = Math.max(turn, prev.dir.angleTo(dir) * 180 / Math.PI / dt); }
      prev = { pos: s.pos, dir };
    }
    rows.push({ seg: `${A.key}→${B.key}`, p0: A.p, p1: B.p, dur, len, speed: dur > 0 ? len / dur : 0, peak, v0, v1, turn, fovRate: dur > 0 ? Math.abs(B.fov - A.fov) / dur : 0 });
  }
  rows.forEach((r, i) => {
    const pr = rows[i - 1], a = pr ? pr.v1 : 0, b = r.v0;
    r.jump = pr && a > 0.5 && b > 0.5 ? Math.max(a / b, b / a) : 1;
    r.dead = pr && ((a > 2 && b < 0.05) || (a < 0.05 && b > 2)) ? (b < 0.05 ? 'stops dead at the key' : 'starts dead at the key') : '';
    r.flag = [r.turn > 120 ? 'fast turn' : '', r.jump > 3 ? `speed ×${r.jump.toFixed(1)} at the key` : '', r.dead, r.peak > 25 ? 'fast move' : ''].filter(Boolean).join(', ');
  });
  return rows;
}

/* §4.1 rule 7: geometry text read at its key. measure(text, cap, weight, track, family) → width in world units */
export const VIEWPORTS = { desk: { W: 1440, H: 900, min: 18, margin: 64 }, phone: { W: 390, H: 844, min: 14, margin: 24 } };
export function textItems(measure, result) {
  const card = { x: (FB.win.x0 + FB.win.x1) / 2, y: (FB.win.y0 + FB.win.y1) / 2, z: FB.z - 0.3, w: FB.win.x1 - FB.win.x0 - 0.4 };
  const plate = { x: (FB.plate.x0 + FB.plate.x1) / 2, y: (FB.plate.y0 + FB.plate.y1) / 2, z: FB.z + 0.02, w: FB.plate.x1 - FB.plate.x0 };
  const items = LINES.map((L, i) => ({ item: `Carved line ${i + 1} "${L.t}"`, key: ['K4a', 'K4', 'K4c'][i], cap: L.cap, c: [0, L.y, CLIFF.z], w: measure(L.t, L.cap, 500, L.track, 'Montserrat') }));
  items.push({ item: 'Share card (title, description)', key: 'K17', cap: 0.25, c: [card.x, card.y, card.z], w: card.w });
  items.push({ item: 'Nameplate (domain, email)', key: 'K17', cap: 0.26, c: [plate.x, plate.y, plate.z], w: plate.w });
  if (result) for (const [k, name, cap] of [['title', 'Printed result title', 0.34], ['desc', 'Printed result description', 0.29]]) {
    const d = result.desk[k], ph = result.phone[k];
    items.push({ item: name, key: 'K18', cap, c: [d.cx, d.y, -0.01], w: d.w, phone: { c: [ph.cx, ph.y, -0.01], w: ph.w } });
  }
  return items;
}
/* the printed result's lines exactly as frames/sf07.js lays them out (block 8 wide, 6.6 on phone, centred at x 0, top y 9).
   The sheet faces −z, so the block's left edge (texture x −w/2) sits at world x +w/2 and lines run toward −x. */
export function resultLayout(ctx, setFont, wrap, title, description, phone) {
  const w = phone ? 6.6 : 8, PPU = 100, x0 = w / 2;
  let y = 6 + 3 - 0.42 - 0.62 - 0.78;
  const block = (txt, cap, weight, track, pitch) => {
    setFont(ctx, weight, cap * PPU / 0.7, 'Montserrat', track);
    const lines = wrap(ctx, txt, w * PPU), wid = Math.max(...lines.map(l => ctx.measureText(l).width)) / PPU;
    const first = y; y -= pitch * lines.length;
    return { y: first + cap / 2, cx: x0 - wid / 2, w: wid, lines };
  };
  const t = block(title, 0.34, 500, 0.01, 0.6); y -= 0.12;
  const d = block(description, 0.29, 400, 0.02, 0.52);
  return { title: t, desc: d, bottom: y };
}
export function legibility(items) {
  const cam = new THREE.PerspectiveCamera(), v = new THREE.Vector3();
  const proj = (x, y, z, V) => { v.set(x, y, z).project(cam); return { x: (v.x + 1) / 2 * V.W, y: (1 - v.y) / 2 * V.H, front: v.z < 1 }; };
  return items.map(it => {
    const row = { item: it.item, key: it.key, cap: it.cap };
    for (const [vp, V] of Object.entries(VIEWPORTS)) {
      const K = KEYS.find(k => k.key === it.key), s = cameraAt(K.p, vp === 'phone');
      cam.fov = s.fov; cam.aspect = V.W / V.H; cam.near = 0.05; cam.far = 1000; cam.position.copy(s.pos); cam.up.set(0, 1, 0); cam.lookAt(s.look);
      if (s.roll) cam.rotateZ(s.roll);
      cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
      const o = vp === 'phone' && it.phone ? it.phone : it, [x, y, z] = o.c, w = o.w;
      const top = proj(x, y + it.cap / 2, z, V), bot = proj(x, y - it.cap / 2, z, V), l = proj(x - w / 2, y, z, V), r = proj(x + w / 2, y, z, V);
      const px = Math.abs(bot.y - top.y), L = Math.min(l.x, r.x), R = Math.max(l.x, r.x);
      row[vp] = { px, min: V.min, pass: px >= V.min && top.front, left: L, right: R, fits: L >= V.margin && R <= V.W - V.margin, cy: (top.y + bot.y) / 2 };
    }
    return row;
  });
}
export { KEYS, SCENES };
