/* Full-size deliverable render: every frame, both tiers, desktop and phone (G2-4 frames only).
   Usage: node tools/render.mjs [baseUrl] [outDir]   (serve the repo root first)
   Each render gets a fresh page so memory never builds up. Writes PNGs named like the
   harness Export button, plus render-log.json / render-log.md with calls, triangles and
   luminance (0–255 sRGB from a 320 px downsample: mean / p5 / p50 / p95 / p99 / max). */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8000/index.html';
const OUT = process.argv[3] ?? 'renders';
const ONLY = process.env.FRAMES ? process.env.FRAMES.split(',').map(s => s.trim().toUpperCase()) : null;
await mkdir(OUT, { recursive: true });

// full headless Chromium (channel 'chromium') with SwiftShader: software WebGL2, no GPU needed
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

// frame list from the harness itself
const probe = await ctx.newPage();
probe.on('console', m => { if (m.type() === 'error') console.log('probe console:', m.text().slice(0, 300)); });
probe.on('pageerror', e => console.log('probe pageerror:', e.message.slice(0, 300)));
const pending = new Set();
probe.on('request', q => pending.add(q.url()));
probe.on('requestfinished', q => pending.delete(q.url()));
probe.on('requestfailed', q => { pending.delete(q.url()); console.log('probe request failed:', q.url(), q.failure()?.errorText); });
await probe.goto(BASE, { timeout: 120000 });
console.log('webgl:', await probe.evaluate(() => {
  const g = document.createElement('canvas').getContext('webgl2');
  if (!g) return 'no WebGL2 context';
  const d = g.getExtension('WEBGL_debug_renderer_info');
  return [g.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : g.RENDERER), 'maxTex', g.getParameter(g.MAX_TEXTURE_SIZE), 'samples', g.getParameter(g.MAX_SAMPLES), 'EXT_color_buffer_float', !!g.getExtension('EXT_color_buffer_float')].join(' ');
}));
try {
  await probe.waitForFunction(() => window.__frames, null, { timeout: 120000 });
} catch (e) {
  console.log('probe: harness never started. Still pending:', [...pending]);
  console.log('probe: readyState', await probe.evaluate(() => document.readyState), 'page text:', await probe.evaluate(() => document.body.innerText.slice(0, 300)));
  await probe.screenshot({ path: `${OUT}/probe-timeout.png` });
  throw e;
}
const frames = await probe.evaluate(() => window.__frames);
await probe.close();

const jobs = [];
for (const f of frames) {
  if (ONLY && !ONLY.includes(f.id)) continue;
  for (const tier of ['high', 'mid']) {
    jobs.push({ ...f, tier, vp: 'desktop' });
    if (f.phone) jobs.push({ ...f, tier, vp: 'phone' });
  }
}

const date = new Date().toISOString().slice(0, 10);
const log = [];
for (const j of jobs) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200)));
  const q = new URLSearchParams({ ...(j.tier === 'mid' ? { tier: 'mid' } : {}), ...(j.vp === 'phone' ? { vp: 'phone' } : {}) });
  const t0 = Date.now();
  let r;
  try {
    await page.goto(`${BASE}?${q}#${j.id.toLowerCase()}`, { timeout: 180000 });
    await page.waitForFunction(id => window.__frame && window.__frame.id === id, j.id, { timeout: 600000 });
    r = await page.evaluate(async () => {
      const f = window.__frame;
      if (!f.ok) return f;
      const png = window.__snapshot();
      const img = new Image(); img.src = png; await img.decode();
      const c = document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * img.height / img.width);
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height).data, L = [];
      for (let i = 0; i < d.length; i += 4) L.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      L.sort((a, b) => a - b); const p = q => Math.round(L[Math.floor(q * (L.length - 1))]);
      return { ...f, png, w: img.width, h: img.height,
        lum: [Math.round(L.reduce((a, b) => a + b, 0) / L.length), p(0.05), p(0.5), p(0.95), p(0.99), Math.round(L.at(-1))].join(' / '),
        clip: +(L.filter(v => v >= 250).length / L.length).toFixed(3), black: +(L.filter(v => v <= 4).length / L.length).toFixed(3) };
    });
  } catch (e) { r = { ok: false, err: e.message.slice(0, 200) }; }
  const name = `AXIEL_${j.id}${[j.tier === 'mid' ? 'mid' : '', j.vp === 'phone' ? 'phone' : ''].filter(Boolean).map(s => '-' + s).join('')}_${j.scene}_${date}.png`;
  if (r.ok) await writeFile(`${OUT}/${name}`, Buffer.from(r.png.split(',')[1], 'base64'));
  const { png, ...row } = r;
  const entry = { id: j.id, tier: j.tier, vp: j.vp, file: r.ok ? name : null, secs: Math.round((Date.now() - t0) / 1000), ...row, errs: [...new Set(errs)].slice(0, 3) };
  log.push(entry);
  console.log(JSON.stringify(entry));
  await page.close();
}
await browser.close();

await writeFile(`${OUT}/render-log.json`, JSON.stringify(log, null, 2));
const md = ['| Frame | Tier · viewport | Size | Calls (scene / total) | Triangles | Luminance | Near-black | ≥ 250 | Errors |', '|---|---|---|---|---|---|---|---|---|',
  ...log.map(e => e.ok
    ? `| ${e.id} | ${e.tier} · ${e.vp} | ${e.w}×${e.h} | ${e.sceneCalls} / ${e.calls} | ${e.tris.toLocaleString('en-US')} | ${e.lum} | ${(e.black * 100).toFixed(1)}% | ${(e.clip * 100).toFixed(1)}% | ${e.errs.length} |`
    : `| ${e.id} | ${e.tier} · ${e.vp} | FAILED | | | ${e.err ?? ''} | | | ${e.errs.length} |`)].join('\n');
await writeFile(`${OUT}/render-log.md`, md + '\n');
const failed = log.filter(e => !e.ok).length;
console.log(`\n${log.length - failed}/${log.length} rendered`);
process.exit(failed ? 1 : 0);
