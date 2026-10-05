/* G7 assets on the runner, two passes around tools/bake.py and tools/pack.mjs.
   export: loads assets.html?mode=export, writes the raw GLBs, sidecar PNGs, bake scenes and manifest.json.
   verify: loads assets.html?mode=verify (it reads glb/), saves every kit / GLB / diff canvas as a PNG, merges
   glb/pack.json, gates on the match, the §7.2 download and texture budgets and page errors, writes assets.json + .md.
   Usage: node tools/assets.mjs export <pageUrl> <rawDir>
          node tools/assets.mjs verify <pageUrl> <outDir> [glbDir]   (serve the repo root first) */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const [MODE, URL_ = 'http://127.0.0.1:8000/assets.html', OUT = MODE === 'export' ? 'g7/raw' : 'g7check', GLB = 'glb'] = process.argv.slice(2);
if (!['export', 'verify'].includes(MODE)) { console.error('usage: node tools/assets.mjs export|verify <url> <outDir>'); process.exit(2); }
await mkdir(OUT, { recursive: true });
const MB = 1024 * 1024;

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 300)));
page.on('response', (s) => { if (s.status() >= 400 && !/\/favicon\.ico$/.test(s.url())) errs.push(`HTTP ${s.status()} ${s.url().slice(0, 160)}`); });

const t0 = Date.now();
let r;
try {
  await page.goto(`${URL_}?mode=${MODE}`, { timeout: 180000, waitUntil: 'commit' });
  await page.waitForFunction(() => window.__assets && window.__assets.done, null, { timeout: 30 * 60 * 1000, polling: 2000 });
  r = await page.evaluate(() => { const a = window.__assets; return { ok: a.ok, errors: a.errors, manifest: a.manifest, rows: a.rows, bakes: a.bakes, fail: a.fail ?? [], files: Object.keys(a.files) }; });
} catch (e) { r = { ok: false, errors: [e.message.slice(0, 300)], rows: [], files: [], fail: [] }; }
const seconds = Math.round((Date.now() - t0) / 1000);

if (MODE === 'export') {
  // one file at a time: a whole-city GLB as base64 is tens of MB
  for (const f of r.files) await writeFile(join(OUT, f), Buffer.from(await page.evaluate((k) => window.__assets.files[k], f), 'base64'));
  await browser.close();
  if (r.manifest) await writeFile(join(OUT, 'manifest.json'), JSON.stringify(r.manifest, null, 1));
  const all = [...errs, ...r.errors];
  console.log(`export: ${r.files.length} files in ${seconds} s${all.length ? '\n' + all.join('\n') : ''}`);
  for (const a of r.manifest?.assets ?? []) console.log(`  ${a.glb}  ${(a.rawBytes / 1024).toFixed(0)} KB raw, ${a.tris.toLocaleString('en')} tris, ${a.calls} calls, ${a.sidecars.length} sidecar(s)`);
  const ok = r.ok && all.length === 0 && r.manifest && r.manifest.assets.every((a) => /^[a-z]+_[a-z-]+_v\d+$/.test(a.id));
  if (!ok) console.log('EXPORT FAIL');
  process.exit(ok ? 0 : 1);
}

// verify
const shots = await page.evaluate(() => Object.entries(window.__shots).map(([k, c]) => [k, c.toDataURL('image/png')])).catch(() => []);
await browser.close();
for (const [k, d] of shots) await writeFile(join(OUT, `${k}.png`), Buffer.from(d.split(',')[1], 'base64'));
const pack = existsSync(join(GLB, 'pack.json')) ? JSON.parse(await readFile(join(GLB, 'pack.json'), 'utf8')) : { fails: ['no pack.json'], sets: {}, rows: [] };
const bake = existsSync('g7/bake/bake.json') ? JSON.parse(await readFile('g7/bake/bake.json', 'utf8')) : null;

// §7.2 texture memory per download set (device estimate from the verify page)
const TEX = { desktop: { tiers: ['all', 'high'], budget: 256 * MB }, mobile: { tiers: ['all', 'mid'], budget: 96 * MB } };
const tex = {};
for (const [k, s] of Object.entries(TEX)) {
  const b = r.rows.filter((x) => s.tiers.includes(x.tier)).reduce((t, x) => t + (x.texBytes ?? 0), 0);
  tex[k] = { bytes: b, budget: s.budget, ok: b <= s.budget };
}
const fails = [
  ...r.fail, ...pack.fails,
  ...Object.entries(tex).filter(([, t]) => !t.ok).map(([k, t]) => `${k} texture memory ${(t.bytes / MB).toFixed(1)} MB over ${t.budget / MB} MB`),
  ...[...errs, ...r.errors].map((e) => 'page: ' + e),
];
if (!r.rows.length) fails.push('verify produced no rows');
const out = { ok: r.ok && fails.length === 0, seconds, rows: r.rows, pack, bake, tex, bakes: r.bakes, fails, shots: shots.map(([k]) => `${k}.png`) };
await writeFile(join(OUT, 'assets.json'), JSON.stringify(out, null, 1));

const kb = (b) => `${(b / 1024).toFixed(0)} KB`, pct = (v) => `${(v * 100).toFixed(2)}%`;
let md = `## G7 assets (${out.ok ? 'PASS' : 'FAIL'})\n\nKit vs packed GLB, same camera and light, AO off. Gate (PROPOSED): mean ≤ 1%, pixels moved > 16 ≤ 2%.\n\n`;
md += '| File | Tier | Packed | Tris | Calls | Textures | Match (worst view) | Result |\n|---|---|---|---|---|---|---|---|\n';
for (const x of r.rows) {
  const p = pack.rows.find((y) => y.id === x.id);
  md += `| ${x.glb ?? x.id} | ${x.tier ?? ''} | ${p ? `${kb(p.bytes)} + ${kb(p.sidecarBytes)}` : 'n/a'} | ${(x.tris ?? 0).toLocaleString('en')} | ${x.calls ?? ''} | ${(x.texBytes / MB || 0).toFixed(1)} MB | ${x.worst ? `${pct(x.worst.mean)} / ${pct(x.worst.over)}` : ''} | ${x.result}${x.why ? ' (' + x.why + ')' : ''} |\n`;
}
md += '\n| Set (§7.2) | Download | Budget | Texture memory | Budget |\n|---|---|---|---|---|\n';
for (const k of ['desktop', 'mobile']) {
  const s = pack.sets[k] ?? {};
  md += `| ${k} | ${s.total ? (s.total / MB).toFixed(2) + ' MB (decoders ' + kb(s.decoders) + ')' : 'n/a'} | ${k === 'desktop' ? 12 : 6} MB | ${(tex[k].bytes / MB).toFixed(1)} MB | ${tex[k].budget / MB} MB |\n`;
}
if (bake) md += `\nBaked AO (Blender ${bake.blender}, Cycles CPU, ${bake.samples} samples): ${bake.bakes.map((b) => `${b.mesh} ${b.w}×${b.h} at ${b.dist} m, mean ${b.mean}, ${b.seconds} s`).join('; ')}.\n`;
if (pack.versions) md += `\nTools: ${Object.entries(pack.versions).map(([k, v]) => `${k} ${v}`).join(', ')}.\n`;
md += fails.length ? `\n**Fails:**\n${fails.map((f) => `- ${f}`).join('\n')}\n` : '\nNo fails.\n';
await writeFile(join(OUT, 'assets.md'), md);
console.log(md);
process.exit(out.ok ? 0 : 1);
