/* Cartographer silhouette test (G2-6) on the runner: loads cartographer.html, saves every canvas as a PNG,
   and gates on the §3.1 budget (≤ 10k triangles, ≤ 30 hinges), the 8 animations (G3) and page errors.
   Usage: node tools/carto.mjs [pageUrl] [outDir]   (serve the repo root first) */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const URL_ = process.argv[2] ?? 'http://127.0.0.1:8000/cartographer.html';
const OUT = process.argv[3] ?? 'carto';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200)));
page.on('response', s => { if (s.status() >= 400 && !/\/favicon\.ico$/.test(s.url())) errs.push(`HTTP ${s.status()} ${s.url().slice(0, 160)}`); });

let r;
try {
  await page.goto(URL_, { timeout: 180000, waitUntil: 'commit' });
  await page.waitForFunction(() => window.__carto && (window.__carto.ok || window.__carto.errors.length), null, { timeout: 10 * 60 * 1000, polling: 2000 });
  r = await page.evaluate(() => ({
    ...window.__carto,
    shots: [...document.querySelectorAll('figure')].map(f => ({ cap: f.querySelector('figcaption')?.textContent ?? '', png: f.querySelector('canvas').toDataURL('image/png') })),
  }));
} catch (e) { r = { ok: false, errors: [e.message.slice(0, 200)], shots: [] }; }
await browser.close();

// named by order + the caption's first three parts, e.g. carto-01-k7-walk.png, carto-06-walk-34.png,
// carto-31-anim-walk-t-0-24s.png ("¾" becomes "34" so the three-quarter views keep their name)
const slug = (cap) => cap.split('·').slice(0, 3).join(' ').replace(/¾/g, '34').trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48).replace(/-$/, '');
const pad = String(r.shots.length).length < 2 ? 2 : String(r.shots.length).length;
const files = r.shots.map((s, i) => ({ file: `carto-${String(i + 1).padStart(pad, '0')}-${slug(s.cap)}.png`, cap: s.cap }));
await Promise.all(r.shots.map((s, i) => writeFile(`${OUT}/${files[i].file}`, Buffer.from(s.png.split(',')[1], 'base64'))));
const { shots, ...stats } = r;
const gate = [];
if (!r.ok) gate.push('page did not finish: ' + (r.errors?.[0] ?? 'unknown'));
if (r.tris > 10000) gate.push(`${r.tris} triangles > 10000`);
if (r.hinges > 30) gate.push(`${r.hinges} hinges > 30`);
if (!(r.anims?.length >= 8)) gate.push(`${r.anims?.length ?? 0} animations reported < 8`);
if (r.dartTris > 600) gate.push(`dart ${r.dartTris} triangles > 600`);
if (errs.length) gate.push(`${errs.length} page error(s): ${errs[0]}`);
const log = { ...stats, errs: [...new Set(errs)].slice(0, 3), files, gate: gate.join('; ') || null };
await writeFile(`${OUT}/carto.json`, JSON.stringify(log, null, 2));
console.log(JSON.stringify({ ...log, files: files.length }));
if (gate.length) { console.log(`::error::Cartographer gate: ${log.gate}`); process.exit(1); }
