/* G3 hero objects on the runner: loads objects.html, saves every turnaround canvas as a PNG, and gates on
   the §3.2 / §3.3 budgets (a row over budget fails unless it carries a documented ceiling) and page errors.
   Usage: node tools/objects.mjs [pageUrl] [outDir]   (serve the repo root first) */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const URL_ = process.argv[2] ?? 'http://127.0.0.1:8000/objects.html';
const OUT = process.argv[3] ?? 'objects';
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
  await page.waitForFunction(() => window.__objects && window.__objects.done, null, { timeout: 15 * 60 * 1000, polling: 2000 });
  r = await page.evaluate(() => ({
    ...window.__objects,
    shots: [...document.querySelectorAll('figure')].map(f => ({ cap: f.querySelector('figcaption')?.textContent ?? '', png: f.querySelector('canvas').toDataURL('image/png') })),
  }));
} catch (e) { r = { ok: false, errors: [e.message.slice(0, 200)], rows: [], shots: [] }; }
await browser.close();

// named by order + the caption, e.g. obj-07-fault-building-empty-front.png
const files = r.shots.map((s, i) => ({ file: `obj-${String(i + 1).padStart(2, '0')}-${s.cap.toLowerCase().replace(/¾/g, 'three-quarter').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}.png`, cap: s.cap }));
await Promise.all(r.shots.map((s, i) => writeFile(`${OUT}/${files[i].file}`, Buffer.from(s.png.split(',')[1], 'base64'))));
const { shots, ...stats } = r;
const gate = [];
if (!r.ok) gate.push('page did not finish: ' + (r.errors?.[0] ?? 'unknown'));
for (const row of r.rows ?? []) if (row.result === 'FAIL') gate.push(`${row.name} ${row.value} ${row.unit} > ${row.budget}`);
if (errs.length) gate.push(`${errs.length} page error(s): ${errs[0]}`);
const log = { ...stats, errs: [...new Set(errs)].slice(0, 3), files, gate: gate.join('; ') || null };
await writeFile(`${OUT}/objects.json`, JSON.stringify(log, null, 2));
console.log(JSON.stringify({ rows: (r.rows ?? []).map(x => `${x.name}: ${x.value} / ${x.budget} ${x.result}`), gate: log.gate, files: files.length }, null, 1));
if (gate.length) { console.log(`::error::Objects gate: ${log.gate}`); process.exit(1); }
