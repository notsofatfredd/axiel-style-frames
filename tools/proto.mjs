/* G6 technical prototype on the runner: loads the static export of site/ (AMOS only), drives the scroll, and checks
   the §6.2 architecture and the AMOS behaviour against the protocol: no console errors, p follows the scroll, the
   scene mounts and unmounts by range, the 400 ms idle freeze, the five D4 labels typed onto frozen drops, release on
   scroll, scrubbed values identical scrolling down and back up. Screenshots at 1440×900 High and 390×844 Mid.
   fps here is SwiftShader (CPU), a reference only: real device fps is a human check (README G6).
   Usage: node tools/proto.mjs [pageUrl] [outDir]   (serve the export under its base path first) */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const URL_ = process.argv[2] ?? 'http://127.0.0.1:8000/axiel-style-frames/proto/';
const OUT = process.argv[3] ?? 'proto';
await mkdir(OUT, { recursive: true });

// the D4 set, read from the frame source so the prototype is checked against the same strings SF-06 draws
const sf06 = await readFile(new URL('../js/frames/sf06.js', import.meta.url), 'utf8');
const D4 = [...sf06.matchAll(/\{ t: '([^']+)', at:/g)].map((m) => m[1]);

const VPS = [
  { id: 'desk', label: 'Desktop 1440×900, High', tier: 'high', viewport: { width: 1440, height: 900 }, drops: 8000, reflect: true },
  { id: 'phone', label: 'Phone 390×844, Mid', tier: 'mid', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, drops: 2000, reflect: false },
];
const SHOTS = [0.60, 0.62, 0.67, 0.70, 0.75];

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const results = [], files = [], errs = [];
const t0 = Date.now();
const near = (a, b, e) => Math.abs(a - b) <= e;

for (const vp of VPS) {
  const ctx = await browser.newContext({ viewport: vp.viewport, deviceScaleFactor: vp.deviceScaleFactor ?? 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  const page = await ctx.newPage();
  const pageErrs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) pageErrs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => pageErrs.push('PAGEERR ' + e.message.slice(0, 200)));
  page.on('response', (s) => { if (s.status() >= 400 && !/\/favicon\.ico$/.test(s.url())) pageErrs.push(`HTTP ${s.status()} ${s.url().slice(0, 160)}`); });

  const checks = [];
  const check = (name, pass, detail = '') => { checks.push({ check: name, pass: !!pass, detail: String(detail) }); console.log(`${vp.id} ${pass ? 'PASS' : 'FAIL'} ${name} ${detail}`); };
  const st = () => page.evaluate(() => window.__axiel.state());
  const amos = () => page.evaluate(() => window.__axiel.debug.amos());
  const frames = (n = 2) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const toP = async (p) => { await page.evaluate((p) => window.__axiel.toP(p), p); await frames(3); };
  const waitFor = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);
  const fps = () => page.evaluate(() => new Promise((r) => { const t = []; const f = (n) => { t.push(n); if (t.length < 31) requestAnimationFrame(f); else { const d = t.slice(1).map((v, i) => v - t[i]).sort((a, b) => a - b); r({ fps: 1000 / (d.reduce((a, b) => a + b, 0) / d.length), worstMs: d[d.length - 1] }); } }; requestAnimationFrame(f); }));
  const out = { id: vp.id, label: vp.label, checks, perf: {}, shots: [] };

  const tv = Date.now();
  try {
    await page.goto(`${URL_}?p=0.5&tier=${vp.tier}`, { timeout: 180000, waitUntil: 'load' });
    await page.waitForFunction(() => window.__axiel && window.__axiel.state, null, { timeout: 120000 });
    await waitFor(() => !!window.__axiel.state().gpu, null, 30000);   // onCreated can land after __axiel on a cold start
    await frames(5);
    const s0 = await st();
    check('Starts outside AMOS with nothing mounted', !s0.mounted.includes('amos') && near(s0.p, 0.5, 0.002), `p ${s0.p.toFixed(3)}, mounted [${s0.mounted}]`);
    check('Tier and viewport', s0.tier === vp.tier && s0.phone === !!vp.isMobile, `tier ${s0.tier}, phone ${s0.phone}, GPU ${s0.gpu}`);

    // p follows the scroll (§6.2.3): driven through Lenis, then by a real wheel / touch-free scroll of the document
    const track = [];
    for (const p of [0.52, 0.31, 0.5]) { await toP(p); track.push([p, (await st()).p]); }
    check('p tracks the scroll position (toP)', track.every(([a, b]) => near(a, b, 0.002)), track.map(([a, b]) => `${a}→${b.toFixed(4)}`).join(', '));
    const before = (await st()).p;
    await page.mouse.move(vp.viewport.width / 2, vp.viewport.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
    const after = (await st()).p;
    check('A wheel scroll moves p forward (Lenis smoothing)', after > before + 0.002, `${before.toFixed(4)} → ${after.toFixed(4)}`);

    // mount by range (§6.2.5)
    await toP(0.6);
    const ready = await waitFor(() => window.__axiel.state().ready.includes('amos'), null, 240000);
    const a0 = await amos();
    check('AMOS mounts and builds inside its range', ready, `ready at p 0.60, ${((Date.now() - tv) / 1000).toFixed(0)} s after this viewport loaded`);
    check('Tier settings applied (§10.1)', a0 && a0.drops === vp.drops && a0.reflect === vp.reflect, a0 ? `${a0.drops} drops, planar reflection ${a0.reflect ? 'on' : 'off'}, kinds ${JSON.stringify(a0.kinds)}` : 'no amos');
    await toP(0.86);
    const gone = await waitFor(() => !window.__axiel.state().mounted.includes('amos'), null, 10000);
    check('AMOS unmounts past its range (p 0.86)', gone, `mounted [${(await st()).mounted}]`);
    await toP(0.54);
    const gone2 = await waitFor(() => !window.__axiel.state().mounted.includes('amos'), null, 10000);
    check('AMOS stays unmounted below its range (p 0.54)', gone2, `mounted [${(await st()).mounted}]`);
    await toP(0.6);
    check('AMOS remounts on re-entry', await waitFor(() => window.__axiel.state().ready.includes('amos'), null, 240000), '');

    // scrubbed state identical scrolling down and back up (§5.2): rain intensity, registration, film spread
    const ps = Array.from({ length: 28 }, (_, i) => +(0.57 + i * 0.01).toFixed(2));
    const down = {}, up = {};
    for (const p of ps) { await toP(p); const a = await amos(); down[p] = a && [a.intensity, a.reg, a.spread]; }
    for (const p of [...ps].reverse()) { await toP(p); const a = await amos(); up[p] = a && [a.intensity, a.reg, a.spread]; }
    const worst = Math.max(...ps.map((p) => (down[p] && up[p] ? Math.max(...down[p].map((v, i) => Math.abs(v - up[p][i]))) : Infinity)));
    check('Reverse scroll: rain, registration and film identical down and up', worst === 0, `${ps.length} positions 0.57 to 0.84, worst difference ${worst}`);
    // sampled one step outside each ramp: toP lands on a whole scroll pixel, so p at a ramp's end can sit a hair inside it
    const at = (p) => down[p] ? down[p].map((v) => v.toFixed(3)).join(' / ') : 'n/a';
    const is = (p, v) => down[p] && near(down[p][0], v, 0.001);
    check('Rain ramps 0.64 to 0.68 and stops 0.80 to 0.82', is(0.63, 0) && is(0.69, 1) && is(0.79, 1) && is(0.83, 0),
      `intensity / reg / spread at 0.63 ${at(0.63)}, 0.69 ${at(0.69)}, 0.79 ${at(0.79)}, 0.83 ${at(0.83)}`);

    // screenshots while the rain moves (taken straight after the scroll, before the 400 ms freeze)
    for (const p of SHOTS) {
      await toP(p);
      const f = `proto-${vp.id}-p${p.toFixed(2).slice(2)}.png`;
      await page.screenshot({ path: `${OUT}/${f}`, timeout: 180000 });
      const s = await st();
      out.shots.push({ file: f, p, frozen: s.frozen, cap: `${vp.label} · p ${p.toFixed(2)} · ${s.key} · ${s.frozen ? 'frozen' : 'rain moving'}` });
    }

    // perf (SwiftShader, reference only) in the rain
    await toP(0.675);   // just before the labels window, so nothing is frozen when the freeze test starts
    out.perf = { ...(await fps()), calls: (await st()).calls, tris: (await st()).tris };

    // freeze (§5.2 idle-reactive, 400 ms) at K16. Every frame is sampled inside the page; idle is measured from the
    // last scroll (the final lastMove). SwiftShader frames run 0.4 to 2 s, longer than the idle window itself, so the
    // test is frame-rate independent: nothing frozen before 400 ms, and the 400 ms mark falls inside the frames just
    // before the first frozen one (a sample can lag the freeze by a frame, never lead it).
    const fz = await page.evaluate(() => new Promise((r) => {
      const ax = window.__axiel, t0 = performance.now(), smp = [];
      ax.toP(0.79);
      const f = () => {
        const s = ax.state(), now = performance.now();
        smp.push({ now, lastMove: s.lastMove, p: s.p, frozen: s.frozen });
        if ((s.frozen && Math.abs(s.p - 0.79) < 0.002) || now - t0 > 30000) r(smp); else requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    }));
    // A SwiftShader frame can be longer than 400 ms, so the first frame after the scroll may rightly freeze; an outside
    // sampler cannot see the 0 to 400 ms span. Freeze.tsx logs each decision since the last scroll (idle, in window,
    // frozen), and the rule is checked on those: never frozen under 400 ms, and frozen at the first in-window
    // decision at or past 400 ms (so the lag is at most one frame).
    const L = fz.length ? fz[fz.length - 1].lastMove : 0;
    for (const x of fz) x.idle = x.now - L;
    const early = fz.filter((x) => x.frozen && x.idle < 400);
    const fl = await page.evaluate(() => window.__axiel.debug.freeze());
    const ev = fl.move === L ? fl.evals : [];
    const ei = ev.findIndex((x) => x.frozen), efirst = ev[ei];
    const evEarly = ev.filter((x) => x.frozen && x.idle < 400);
    const missed = ev.slice(0, Math.max(0, ei)).filter((x) => x.inWindow && x.idle >= 400);
    const gap = ei > 0 ? efirst.idle - ev[ei - 1].idle : efirst?.idle ?? 0;
    check('Not frozen while idle < 400 ms', ev.length > 0 && evEarly.length === 0 && early.length === 0,
      `${ev.length} decisions since the scroll (log ${fl.move === L ? 'matches' : 'does not match'} the last scroll); frozen under 400 ms: ${evEarly.length} decided, ${early.length} sampled`);
    check('Frozen at the first frame past 400 ms idle', !!efirst && efirst.idle >= 400 && missed.length === 0,
      efirst ? `froze at ${efirst.idle.toFixed(0)} ms idle, decision ${ei + 1} since the scroll; ${ei > 0 ? `the one before at ${ev[ei - 1].idle.toFixed(0)} ms` : 'the first frame after the scroll'} (SwiftShader frame ${gap.toFixed(0)} ms); in-window frames past 400 ms left unfrozen: ${missed.length}`
        : 'never froze');
    const t1 = await amos().then((a) => a.time); await frames(3); const t2 = await amos().then((a) => a.time);
    check('Rain time stops while frozen', t1 === t2, `shader time ${t1.toFixed(3)} → ${t2.toFixed(3)} over 3 frames`);

    // D4 labels typed onto frozen drops
    const labs = (await st()).labels;
    check('Five labels attach, the D4 set', labs.length === 5 && D4.every((t) => labs.some((l) => l.text === t)), labs.map((l) => l.text).join(', '));
    check('Each label hangs on its own falling drop', new Set(labs.map((l) => l.drop)).size === labs.length && labs.every((l) => l.drop >= 0), labs.map((l) => l.drop).join(', '));
    const inView = labs.every((l) => l.x >= 0 && l.x <= vp.viewport.width && l.y >= 0 && l.y <= vp.viewport.height && l.ax >= 0 && l.ax <= vp.viewport.width);
    check('Labels and their drops are on screen', inView, labs.map((l) => `${l.text} (${l.ax.toFixed(0)},${l.ay.toFixed(0)})→(${l.x.toFixed(0)},${l.y.toFixed(0)}) ${l.side}`).join('; '));
    const typedOk = await waitFor((d4) => { const el = [...document.querySelectorAll('.drop-label')]; return el.length === 5 && d4.every((t) => el.some((e) => e.textContent === t)); }, D4, 4000);
    check('Labels type in fully (40 ms per char)', typedOk, '');
    const hits = await page.evaluate(() => {
      const r = [...document.querySelectorAll('.drop-label')].map((e) => ({ t: e.textContent, b: e.getBoundingClientRect() })), o = [];
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
        const a = r[i].b, b = r[j].b;
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) o.push(`${r[i].t} / ${r[j].t}`);
      }
      return o;
    });
    check('Label text boxes do not overlap', hits.length === 0, hits.join('; ') || 'clear');
    const aria = await page.evaluate(() => document.querySelector('.drop-labels')?.getAttribute('aria-label') ?? '');
    check('Readings exposed to assistive tech as one sentence', D4.every((t) => aria.includes(t)), aria);
    const ff = `proto-${vp.id}-p79-frozen.png`;
    await page.screenshot({ path: `${OUT}/${ff}`, timeout: 180000 });
    out.shots.push({ file: ff, p: 0.79, frozen: true, cap: `${vp.label} · p 0.79 · K16 · frozen, D4 labels on the drops` });

    // scrolling releases the freeze and the labels type back out (to 0.82, past the labels window, so it cannot re-freeze)
    // counted in frames, not ms: a SwiftShader desktop frame (about 2 s) is longer than any wall-clock cap that would mean anything
    const rel = await page.evaluate(() => new Promise((r) => {
      const ax = window.__axiel, t0 = performance.now(); let n = 0, free = -1, clear = -1, gone = -1;
      ax.toP(0.82);
      const f = () => {
        n++;
        const s = ax.state();
        if (free < 0 && !s.frozen) free = n;
        if (clear < 0 && !s.labels.length) clear = n;
        if (gone < 0 && [...document.querySelectorAll('.drop-label')].every((e) => !e.textContent)) gone = n;
        if ((free > 0 && clear > 0 && gone > 0) || performance.now() - t0 > 30000) r({ free, clear, gone, n, ms: performance.now() - t0 });
        else requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    }));
    check('Scrolling releases the freeze and clears the labels', rel.free > 0 && rel.free <= 2 && rel.clear > 0,
      `unfrozen at frame ${rel.free}, labels cleared at frame ${rel.clear} (${rel.n} frames, ${rel.ms.toFixed(0)} ms)`);
    check('Labels type back out', rel.gone > 0, `text gone at frame ${rel.gone}`);
    const t3 = await amos().then((a) => a.time); await frames(3); const t4 = await amos().then((a) => a.time);
    check('Rain moves again', t4 > t3, `shader time ${t3.toFixed(3)} → ${t4.toFixed(3)} over 3 frames`);
    // no freeze outside the labels window
    await toP(0.62);
    await page.waitForTimeout(900);
    check('No freeze outside the labels window (p 0.62)', !(await st()).frozen, '');
  } catch (e) { pageErrs.push('RUN ' + e.message.slice(0, 300)); }
  check('No console errors or failed requests', pageErrs.length === 0, pageErrs.slice(0, 5).join(' | '));
  errs.push(...pageErrs.map((e) => `${vp.id}: ${e}`));
  results.push(out);
  files.push(...out.shots.map((s) => ({ file: s.file, cap: s.cap, vp: vp.id })));
  await ctx.close();
}
await browser.close();

const fails = results.flatMap((r) => r.checks.filter((c) => !c.pass).map((c) => `${r.id}: ${c.check}`));
const ok = fails.length === 0;
await writeFile(`${OUT}/proto.json`, JSON.stringify({ ok, seconds: Math.round((Date.now() - t0) / 1000), errs, fails, d4: D4, results, files }, null, 1));

let md = `# G6 prototype checks (generated by tools/proto.mjs)\n\nAMOS only, static export, headless Chromium on SwiftShader (CPU). fps figures are a reference, not the §6 target.\n\n`;
for (const r of results) {
  md += `## ${r.label}\n\n| Check | Result | Detail |\n|---|---|---|\n`;
  for (const c of r.checks) md += `| ${c.check} | ${c.pass ? 'PASS' : '**FAIL**'} | ${c.detail.replace(/\|/g, '/')} |\n`;
  if (r.perf.fps) md += `\nSwiftShader in the rain (p 0.675, intensity 88%, just before the freeze window): ${r.perf.fps.toFixed(1)} fps, worst frame ${r.perf.worstMs.toFixed(0)} ms, ${r.perf.calls} draw calls, ${r.perf.tris?.toLocaleString('en')} triangles.\n`;
  md += '\n';
}
await writeFile(`${OUT}/proto.md`, md);
console.log(ok ? 'PROTO OK' : 'PROTO FAIL\n' + fails.join('\n'));
process.exit(ok ? 0 : 1);
