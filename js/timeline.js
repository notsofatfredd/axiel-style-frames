/*
 * G5 timing table (§5.3) as data: the one place beat times live. The grey box, the animatic and (at G6) the
 * production timelines read these rows; nothing else hard-codes a beat time.
 *
 * type  scrubbed   a pure function of p (so scrolling up plays it backwards exactly, §5.2 rule)
 *       triggered  plays forward once when p crosses p0 going down the page, reverses when it crosses back
 *       line       copy: triggered in at p0, triggered out at p1 (each `dur` s)
 *       camera     carried by the camera path (js/camera.js), listed so the table reads whole
 *       ambient    clock time, always running
 *       idle       after 400 ms without scroll
 * ease  a §5.1 name, or null where the protocol gives none ("—") and nothing is eased
 * src   '§5.3' where the protocol sets the row; 'PROPOSED' where G5 fills what the protocol leaves open
 */
import { EASE } from './kit/ease.js';
import { KEYS, SCENES, cameraAt } from './camera.js';

const R = (id, p0, p1, type, ease, dur, beat, src = '§5.3', note = '') => ({ id, p0, p1, type, ease, dur, beat, src, note });
export const BEATS = [
  R('hero_in', 0.02, 0.04, 'scrubbed', 'ARRIVE', null, 'Hero copy fades in, the whole line as one unit'),
  R('crack', 0.05, 0.07, 'scrubbed', 'DEPART', null, 'Crack appears and grows below the hero line, never crossing a letter', '§5.3', 'CD: EASE_DEPART leaves the crack about 3% grown at K1 (0.06) where SF-01 draws a long hairline; keep the §5.3 curve or open the crack faster (animatic review)'),
  R('hero_out', 0.06, 0.068, 'scrubbed', 'DEPART', null, 'Hero line fades out as one unit, before the tear', 'PROPOSED', 'window set at G5: SF-01 shows the line whole at K1 (0.06); gone by 0.068, before the tear at 0.07'),
  R('tear', 0.07, 0.08, 'scrubbed', null, null, 'Paper tears open'),
  R('fall', 0.08, 0.12, 'camera', null, null, 'Fall through the strata, veins dark; specimens pass in shadow; roll at K3 only'),
  R('veins', 0.12, 0.14, 'scrubbed', 'ARRIVE', null, 'Veins ignite from bedrock upward'),
  R('climb', 0.12, 0.21, 'camera', null, null, 'Climb the face square-on; the 12 specimens read in vein light'),
  R('carved1', 0.15, 0.15, 'triggered', 'ARRIVE', 0.6, 'Carved line 1 traced by the veins ("Everything stands")', '§5.3', 'ease PROPOSED (protocol: 600 ms, no curve)'),
  R('carved2', 0.17, 0.17, 'triggered', 'ARRIVE', 0.6, 'Carved line 2 ("on ATLAS.")', '§5.3', 'ease PROPOSED'),
  R('carved3', 0.19, 0.19, 'triggered', 'ARRIVE', 0.6, 'Carved line 3 ("ATLAS")', '§5.3', 'ease PROPOSED'),
  R('atlas_clear', 0.21, 0.22, 'scrubbed', null, null, 'ATLAS copy clears; veins dim'),
  R('courses', 0.21, 0.24, 'scrubbed', 'ARRIVE', null, 'City courses stack up from the plateau'),
  R('walk', 0.24, 0.37, 'scrubbed', null, null, 'The Cartographer walks the path (position scrubbed, walk cycle ambient); arrival by 0.37'),
  R('index_line', 0.25, 0.40, 'line', 'ARRIVE', 0.6, 'INDEX line in / out: "INDEX finds what search can\'t see."', 'PROPOSED', 'in once the city has stacked, out as the fold begins; SF-04 shows it at K8 (0.36)'),
  R('lantern', 0.34, 0.34, 'triggered', null, 1.0, 'raise_lantern: beam widens'),
  R('sweep', 0.35, 0.38, 'scrubbed', null, null, 'Beam sweep; floors light in sequence'),
  R('unfurl', 0.37, 0.37, 'triggered', null, 1.2, 'unfurl_map'),
  R('flicker', 0.39, 0.39, 'ambient', null, null, 'Fault building flickers'),
  R('fold', 0.40, 0.40, 'triggered', 'ARRIVE', 1.4, 'fold_dart (camera holds K9 → K9h to 0.42)'),
  R('throw', 0.42, 0.42, 'triggered', null, 1.0, 'throw_dart'),
  R('dart', 0.42, 0.46, 'scrubbed', null, null, 'The dart flies to the Core\'s inlet and turns gold-hot', '§5.3', 'flight curve PROPOSED (js/kit/greybox.js)'),
  R('heartbeat', 0.46, 0.46, 'triggered', null, 0.6, 'The dart enters; first heartbeat (lub-dub, micro-shake 0.5%); frost cracks off'),
  R('devos_line', 0.47, 0.58, 'line', 'ARRIVE', 0.6, 'DEVOS line in / out: "DEVOS builds the fix, and proves each part."', 'PROPOSED', 'in after the first heartbeat, out before the fix glides; SF-05 shows it at K12 (0.54)'),
  R('unfold', 0.49, 0.51, 'scrubbed', null, null, 'The dart\'s paper unfolds above the Core as the map the filaments trace'),
  R('assemble', 0.52, 0.58, 'scrubbed', null, null, 'The fix (window + nameplate, 24 fragments) assembles beneath the Core, staggered'),
  R('verify', 0.53, 0.58, 'triggered', 'STAMP', 0.5, 'Fragments verify: glass → gold + stamp (per fragment)'),
  R('glide', 0.59, 0.62, 'scrubbed', 'ARRIVE', null, 'The finished fix glides to the fault building and seats itself'),
  R('rain', 0.64, 0.68, 'scrubbed', 'LINEAR', null, 'Rain begins, 12° slant, 0 → 100%', '§5.3', 'ease from §5.1 (EASE_LINEAR: rain, shader time)'),
  R('film', 0.64, 0.68, 'scrubbed', null, null, 'Water film spreads; the mirror reflection fades in'),
  R('amos_line', 0.66, 0.80, 'line', 'ARRIVE', 0.6, 'AMOS line in / out: "AMOS checks the result. Independently."', 'PROPOSED', 'in once the rain is falling, out as it stops; SF-06 shows it at K16 (0.79)'),
  R('beads', 0.68, 0.78, 'scrubbed', null, null, 'Beads and stains register per element'),
  R('labels', 0.68, 0.80, 'idle', 'LINEAR', null, 'On freeze: metric labels attach to frozen drops, typed 40 ms per char', '§5.3', 'window PROPOSED (protocol: on freeze, i.e. 400 ms without scroll while the rain falls)'),
  R('rain_stop', 0.80, 0.82, 'scrubbed', null, null, 'Rain stops; city lights brighten'),
  R('nod', 0.83, 0.83, 'triggered', null, 0.8, 'The Cartographer nods and walks toward the stained neighbour (0.8 s + walk)'),
  R('window', 0.84, 0.88, 'scrubbed', null, null, 'The repaired window lights; the share card description highlights gold-hot'),
  R('turn', 0.88, 0.90, 'camera', null, null, 'The camera turns back toward the paper wall'),
  R('closing', 0.90, 0.95, 'line', 'ARRIVE', 0.8, 'Closing line fades in (DOM)', '§5.3', 'out at 0.95 PROPOSED (protocol gives the fade-in only), as the camera clears the tear'),
  R('result', 0.90, 0.94, 'camera', null, null, 'The ranked result is read on the back of the paper wall, around the tear'),
  R('return', 0.92, 0.95, 'camera', null, null, 'Return flight through the tear'),
  R('heal', 0.94, 0.96, 'scrubbed', null, null, 'The tear heals behind the camera'),
  R('seal', 0.98, 0.98, 'triggered', 'STAMP', 0.6, 'Seal stamps down'),
  R('tag', 0.99, 0.99, 'triggered', null, 0.5, 'Waitlist tag appears'),
];
export const beat = (id) => BEATS.find(b => b.id === id) ?? (() => { throw new Error('no beat ' + id); })();
const ease = (b) => (b.ease ? EASE[b.ease] : EASE.LINEAR);
const clamp = (v) => Math.min(1, Math.max(0, v));

/* scrubbed: progress 0..1 at p (pure) */
export function scrub(id, p) { const b = beat(id); return b.p1 > b.p0 ? ease(b)(clamp((p - b.p0) / (b.p1 - b.p0))) : +(p >= b.p0); }

/* triggered / line under a steady forward scroll (the animatic): s = seconds per unit of p */
export function steady(id, p, s) {
  const b = beat(id), d = (b.dur ?? 0) / s, E = ease(b);
  const up = d > 0 ? clamp((p - b.p0) / d) : +(p >= b.p0);
  if (b.type !== 'line') return E(up);
  const down = d > 0 ? clamp((p - b.p1) / d) : +(p >= b.p1);
  return E(up) * (1 - EASE.DEPART(down));
}

/* triggered / line in real use: state follows the target (p past p0, and before p1 for a line) at 1/dur per second,
 * so crossing back reverses it from wherever it is (§5.2: plays once forward / reverses back) */
export class Triggers {
  constructor() { this.t = Object.fromEntries(BEATS.filter(b => b.type === 'triggered' || b.type === 'line').map(b => [b.id, 0])); }
  update(p, dt) {
    for (const id in this.t) {
      const b = beat(id), on = p >= b.p0 && (b.type !== 'line' || p < b.p1), rate = dt / (b.dur || 1e-9);
      this.t[id] = on ? Math.min(1, this.t[id] + rate) : Math.max(0, this.t[id] - rate);
    }
    return this;
  }
  value(id) { const b = beat(id); return ease(b)(this.t[id]); }
}

/* copy each line row carries, as approved (SF-01 hero + sub-line; §1.2 system lines; D5 closing line) */
export const COPY = {
  hero_out: ['Beyond Immediate Reality', 'Strategy-first systems design.'],
  index_line: ["INDEX finds what search can't see."],
  devos_line: ['DEVOS builds the fix, and proves each part.'],
  amos_line: ['AMOS checks the result. Independently.'],
  closing: ['Found by INDEX. Built by DEVOS. Checked by AMOS. All of it on ATLAS.'],
};
/* opacity of each copy row at p under a steady scroll of s seconds per unit of p (what the animatic shows) */
export function copyAt(p, s) {
  const out = [];
  const hero = scrub('hero_in', p) * (1 - scrub('hero_out', p));
  if (hero > 0.004) out.push({ id: 'hero_out', a: hero, lines: COPY.hero_out });
  for (const id of ['index_line', 'devos_line', 'amos_line', 'closing']) { const a = steady(id, p, s); if (a > 0.004) out.push({ id, a, lines: COPY[id] }); }
  return out;
}
/* beats running at p (scrubbed / camera rows inside their window; triggered rows still playing at a steady scroll) */
export function active(p, s) {
  return BEATS.filter(b => {
    if (b.type === 'triggered') { const d = (b.dur ?? 0) / s; return p >= b.p0 && p <= b.p1 + Math.max(d, 0.002); }
    if (b.type === 'line') return steady(b.id, p, s) > 0.004;
    if (b.type === 'ambient') return Math.abs(p - b.p0) < 0.005;
    return p >= b.p0 && p <= b.p1 + (b.p1 === b.p0 ? 0.002 : 0);
  }).map(b => b.id);
}

/* camera timing: how p is spent along the §4.3 path between keys. Every mode lands on each key at its p and is a
 * pure function of p, so every mode reverses exactly (§5.2).
 *   linear  EASE_LINEAR in arc length per segment (G4, the default: in the §5.1 list). Even speed inside a
 *           segment, but the speed changes in one frame at a key (up to ×4.6) and the camera stops dead at a hold.
 *   smooth  PROPOSED, not a §5.1 curve: cumulative path length through the keys as a monotone cubic
 *           (Fritsch-Butland), so speed is continuous everywhere and eases to rest into and out of each hold.
 *   shots   EASE_CAMERA over each shot, a run of keys between two holds (PROPOSED reading of "default for camera
 *           segments"): far faster in the middle of long shots.
 * G5 measured peak speed / turn on desktop: linear 55 u/s / 163 °/s, smooth 69 / 177, shots 157 / 327; speed jumps
 * over 1.5× in a frame: linear 17, smooth 0. CD and the motion test choose (see the animatic). */
export const CAMERA_SHOTS = ['K0', 'K2', 'K3b', 'K4a', 'K4', 'K4c', 'K9', 'K9h', 'K14', 'K16', 'K17', 'K18', 'K20'];
const HOLDS = [...new Set([0, ...CAMERA_SHOTS.map(k => KEYS.find(x => x.key === k).p), 1])].sort((a, b) => a - b);
const segOf = (P, p) => { let i = 0; while (i < P.length - 2 && p >= P[i + 1]) i++; return i; };
const smoothCache = {};
function smoothRemap(phone) {
  return smoothCache[phone ? 'phone' : 'desk'] ??= (() => {
    const P = KEYS.map(k => k.p), n = P.length;
    const L = P.slice(0, -1).map((a, i) => { const b = P[i + 1]; let len = 0, prev = null;   // position path length per segment
      for (let k = 0; k <= 400; k++) { const c = cameraAt(a + (b - a) * Math.min(k / 400, 1 - 1e-7), phone).pos; if (prev) len += c.distanceTo(prev); prev = c; } return len; });
    const S = [0]; L.forEach(l => S.push(S[S.length - 1] + l));
    const d = L.map((l, i) => l / (P[i + 1] - P[i]));
    const m = P.map((_, k) => {
      if (k === 0 || k === n - 1 || d[k - 1] <= 1e-9 || d[k] <= 1e-9) return 0;   // the ends and both sides of a hold: at rest
      const h0 = P[k] - P[k - 1], h1 = P[k + 1] - P[k], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      return (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    });
    return (p) => {
      const i = segOf(P, p), h = P[i + 1] - P[i], t = clamp((p - P[i]) / h), t2 = t * t, t3 = t2 * t;
      const sv = (2 * t3 - 3 * t2 + 1) * S[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * S[i + 1] + (t3 - t2) * h * m[i + 1];
      return L[i] > 1e-9 ? P[i] + h * clamp((sv - S[i]) / L[i]) : p;
    };
  })();
}
export const CAMERA_MODES = {
  linear: (p) => p,
  smooth: (p, phone = false) => smoothRemap(phone)(p),
  shots: (p) => { const i = segOf(HOLDS, p), a = HOLDS[i], b = HOLDS[i + 1]; return b > a ? a + (b - a) * EASE.CAMERA(clamp((p - a) / (b - a))) : p; },
};

/* §5.4: every scene change has a physical carrier */
export const CARRIERS = [
  ['Surface → Fall', 'tear', 'The paper tears'],
  ['Fall → ATLAS', 'veins', 'Veins ignite in the stone'],
  ['ATLAS → INDEX', 'courses', 'City courses stack up from the plateau'],
  ['INDEX → DEVOS', 'dart', 'The paper dart wakes the Core'],
  ['DEVOS → AMOS', 'glide', 'The finished fix seats into the building; rain begins'],
  ['AMOS → Proof', 'rain_stop', 'Rain stops; the repaired window lights'],
  ['Proof → Seal', 'turn', 'The turn back to the paper wall, the result read, then the return flight through the tear, which heals'],
];
/* copy rows and the style frame that shows each one. A frame is the state a reader settles into when they stop
 * scrolling at its key: the hero line not yet fading, or a system line triggered in and not yet triggered out */
export const COPY_FRAMES = [['hero_out', 'K1', 'SF-01'], ['index_line', 'K8', 'SF-04'], ['devos_line', 'K12', 'SF-05'], ['amos_line', 'K16', 'SF-06'], ['closing', 'K18', 'SF-07b']];

export function check(secPerP = { desk: 40, phone: 30 }) {
  const out = [], add = (check, pass, detail) => out.push({ check, pass: !!pass, detail });
  const bad = BEATS.filter(b => b.ease && !EASE[b.ease]);
  add('Easing: every row uses a §5.1 constant', !bad.length, bad.length ? bad.map(b => b.id).join(', ') : `${BEATS.filter(b => b.ease).length} eased rows, ${Object.keys(EASE).join(' / ')} only`);
  const order = BEATS.filter(b => b.p1 < b.p0);
  add('Every row ends at or after it starts', !order.length, order.map(b => b.id).join(', ') || 'yes');
  const ho = beat('hero_out'), hi = beat('hero_in');
  add('Hero line fade-out window before 0.07', ho.p1 < beat('tear').p0 && ho.p0 >= hi.p1, `${ho.p0} → ${ho.p1} (tear at ${beat('tear').p0}; fade-in ends ${hi.p1})`);
  const L = ['index_line', 'devos_line', 'amos_line'].map(beat);
  add('System lines in loop order INDEX → DEVOS → AMOS, never overlapping', L.every((b, i) => !i || b.p0 >= L[i - 1].p1), L.map(b => `${b.id.split('_')[0].toUpperCase()} ${b.p0}–${b.p1}`).join(', ') + '; ATLAS is the three carved lines 0.15 / 0.17 / 0.19');
  for (const [id, key, sf] of COPY_FRAMES) {
    const b = beat(id), k = KEYS.find(x => x.key === key).p;
    const shown = b.type === 'line' ? k >= b.p0 && k < b.p1 : k <= b.p0, lag = b.type === 'line' ? k - (b.p0 + b.dur / secPerP.desk) : 0;
    add(`${sf} (${key}, p ${k}) shows ${id === 'hero_out' ? 'the hero line whole' : 'its line, settled in'}`, shown, `${id} ${b.p0}–${b.p1}` + (lag < 0 ? `; at a steady scroll it is still fading in at ${key} (in ${b.dur} s)` : ''));
  }
  for (const [edge, id, what] of CARRIERS) {
    const [from, to] = edge.split(' → '), i = SCENES.findIndex(s => s[1] === to), at = SCENES[i]?.[0], b = beat(id);
    add(`Carrier ${edge} at p ${at}`, at !== undefined && SCENES[i - 1]?.[1] === from && at >= b.p0 - 0.01 && at <= b.p1 + 0.02, `${id} ${b.p0}–${b.p1}: ${what}`);
  }
  for (const vp of ['desk', 'phone']) {
    const s = secPerP[vp], long = BEATS.filter(b => (b.type === 'triggered' || b.type === 'line') && b.dur).map(b => ({ b, dp: b.dur / s })).filter(({ b, dp }) => b.type === 'line' && b.p0 + dp > b.p1);
    add(`Copy fully in before it is due out (${vp}, steady scroll)`, !long.length, long.map(({ b }) => b.id).join(', ') || 'yes');
  }
  return { rows: out, pass: out.every(r => r.pass) };
}

/* §5.2 rule / G5 "full reverse scroll tested": scroll 0 → 1 then 1 → 0 at the steady rate in 1/60 s steps; at every
 * sampled p the scrubbed values and the camera must match exactly, and once settled the triggered states must too */
export function reverseTest(cameraAt, secPerP = 40, fps = 60) {
  const N = Math.round(secPerP * fps), scrubbed = BEATS.filter(b => b.type === 'scrubbed').map(b => b.id);
  const snap = (p) => { const c = cameraAt(p); return [...scrubbed.map(id => scrub(id, p)), ...c.pos.toArray(), ...c.look.toArray(), c.fov, c.roll]; };
  const fwd = [], issues = [];
  for (let i = 0; i <= N; i++) fwd.push(snap(i / N));
  let worst = 0;
  for (let i = N; i >= 0; i--) { const b = snap(i / N); b.forEach((v, j) => { worst = Math.max(worst, Math.abs(v - fwd[i][j])); }); }
  if (worst > 0) issues.push(`scrubbed / camera differ by ${worst} on the way back`);
  // triggered: settle at sample points reached going down, then the same points reached coming back up
  const T = new Triggers(), settle = (p) => { for (let k = 0; k < fps * 3; k++) T.update(p, 1 / fps); return { ...T.t }; };
  const pts = [0.03, 0.155, 0.3, 0.405, 0.45, 0.55, 0.7, 0.85, 0.93, 0.985, 1];
  const down = {}, upTo = (a, b) => { const n = Math.abs(b - a) * N; for (let k = 1; k <= n; k++) T.update(a + (b - a) * k / n, 1 / fps); };
  let at = 0;
  for (const p of pts) { upTo(at, p); down[p] = settle(p); at = p; }
  for (const p of [...pts].reverse()) { upTo(at, p); const s = settle(p); at = p; for (const id in s) if (Math.abs(s[id] - down[p][id]) > 1e-9) issues.push(`${id} at p ${p}: ${down[p][id]} down, ${s[id]} back`); }
  upTo(at, 0); const end = settle(0), left = Object.entries(end).filter(([, v]) => v > 0);
  if (left.length) issues.push(`still on at p 0: ${left.map(([k]) => k).join(', ')}`);
  return { pass: !issues.length, frames: (N + 1) * 2, worst, issues };
}
