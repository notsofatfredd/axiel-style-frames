/* G7 pack: raw kit GLBs (assets.html?mode=export) + baked lightmaps (tools/bake.py) → the shipped files (§7.1).
   Per asset: attach each baked AO map as the occlusionTexture on TEXCOORD_1, Draco (edgebreaker), KTX2 (ETC1S for
   colour, UASTC for normal / occlusion / roughness), then the Khronos validator. Uniform textures (carve masks, symbol
   heights) become KTX2 sidecars with ktx create. Sizes are summed per download set against §7.2 and the decoders
   are counted in, since a visitor downloads them too.
   Usage: node tools/pack.mjs <rawDir> <bakeDir> <outDir>
   Needs on PATH or in node_modules: @gltf-transform/cli 4.5.1, draco3dgltf, gltf-validator, pngjs, three 0.169, ktx 4.4 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import validator from 'gltf-validator';
import { PNG } from 'pngjs';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const [RAW = 'g7/raw', BAKE = 'g7/bake', OUT = 'glb'] = process.argv.slice(2);
const TMP = join(RAW, '..', 'tmp');   // outside OUT, which is published as is
await mkdir(TMP, { recursive: true });

const MB = 1024 * 1024;
// §7.2: 3D assets lazy-loaded. Desktop ships the High city fill, mobile the Mid (§10.1).
const SETS = { desktop: { tiers: ['all', 'high'], budget: 12 * MB }, mobile: { tiers: ['all', 'mid'], budget: 6 * MB } };
const BIN = (n) => join('node_modules', '.bin', process.platform === 'win32' ? n + '.cmd' : n);
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * MB }).toString();
const size = async (f) => (await stat(f)).size;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
});

// PNG → plain RGBA8 PNG (no colour chunks), so ktx create and the basis encoders see one known layout
const rgba = async (file) => {
  const src = PNG.sync.read(await readFile(file));
  const out = new PNG({ width: src.width, height: src.height, colorType: 6 });
  src.data.copy(out.data);
  return { buf: PNG.sync.write(out), w: src.width, h: src.height };
};

// ktx 4.4 says --assign-tf, 4.3 said --assign-oetf
let ktxHelp;
try { ktxHelp = run('ktx', ['create', '--help']); } catch (e) { ktxHelp = `${e.stdout ?? ''}${e.stderr ?? ''}`; }   // some builds exit 1 on --help
const TF = ktxHelp.includes('--assign-tf') ? '--assign-tf' : '--assign-oetf';
const versions = {
  ktx: run('ktx', ['--version']).trim(),
  gltfTransform: JSON.parse(await readFile('node_modules/@gltf-transform/cli/package.json', 'utf8')).version,
  validator: validator.version(),
};

const man = JSON.parse(await readFile(join(RAW, 'manifest.json'), 'utf8'));
const fails = [], rows = [];

for (const a of man.assets) {
  const row = { id: a.id, tier: a.tier, rawBytes: a.rawBytes, lightmaps: [], textures: {}, validator: null };
  // 1. lightmaps: occlusionTexture on TEXCOORD_1, one material per lightmapped mesh
  const doc = await io.read(join(RAW, a.glb));
  const root = doc.getRoot();
  for (const lm of a.lightmaps) {
    const png = join(BAKE, `${lm.mesh}.png`);
    if (!existsSync(png)) { fails.push(`${a.id}: lightmap ${lm.mesh}.png was not baked`); continue; }
    const node = root.listNodes().find((n) => n.getName() === lm.mesh && n.getMesh());
    if (!node) { fails.push(`${a.id}: no node named ${lm.mesh}`); continue; }
    const img = await rgba(png);
    const tex = doc.createTexture(`${lm.mesh}-ao`).setImage(img.buf).setMimeType('image/png').setURI(`${lm.mesh}-ao.png`);
    const prims = node.getMesh().listPrimitives();
    for (const prim of prims) {
      if (!prim.getAttribute('TEXCOORD_1')) { fails.push(`${a.id}: ${lm.mesh} has no TEXCOORD_1`); continue; }
      let mat = prim.getMaterial();
      const shared = mat.listParents().filter((p) => p.propertyType === 'Primitive' && !prims.includes(p)).length > 0;
      if (shared) { mat = mat.clone().setName(`${mat.getName()}-${lm.mesh}`); prim.setMaterial(mat); }
      mat.setOcclusionTexture(tex).setOcclusionStrength(1);
      mat.getOcclusionTextureInfo().setTexCoord(1);
    }
    row.lightmaps.push({ mesh: lm.mesh, w: img.w, h: img.h, aoDistance: lm.dist });
  }
  const t1 = join(TMP, `${a.id}.1.glb`), t2 = join(TMP, `${a.id}.2.glb`), t3 = join(TMP, `${a.id}.3.glb`), dst = join(OUT, a.glb);
  await io.write(t1, doc);
  // 2. Draco, then 3. KTX2 by slot (the CLI keeps extras, so the material recipes ride through)
  run(BIN('gltf-transform'), ['draco', t1, t2, '--method', 'edgebreaker', '--quantize-position', '14', '--quantize-normal', '10', '--quantize-texcoord', '12']);
  run(BIN('gltf-transform'), ['etc1s', t2, t3, '--slots', '{baseColorTexture,emissiveTexture}']);
  run(BIN('gltf-transform'), ['uastc', t3, dst, '--slots', '{normalTexture,occlusionTexture,metallicRoughnessTexture}', '--level', '2', '--zstd', '18']);
  // 4. what shipped
  const bytes = await readFile(dst);
  const out = await io.readBinary(new Uint8Array(bytes));
  for (const t of out.getRoot().listTextures()) row.textures[t.getMimeType()] = (row.textures[t.getMimeType()] ?? 0) + 1;
  const extras = out.getRoot().listMaterials().filter((m) => m.getExtras()?.axiel).length;
  if (extras !== out.getRoot().listMaterials().length) fails.push(`${a.id}: ${out.getRoot().listMaterials().length - extras} material(s) lost their recipe`);
  const loose = Object.entries(row.textures).filter(([k]) => k !== 'image/ktx2');
  if (loose.length) fails.push(`${a.id}: textures left uncompressed (${loose.map(([k, n]) => `${n} ${k}`).join(', ')})`);
  const rep = await validator.validateBytes(new Uint8Array(bytes), { maxIssues: 50, uri: a.glb });
  row.validator = { errors: rep.issues.numErrors, warnings: rep.issues.numWarnings, infos: rep.issues.numInfos,
    messages: rep.issues.messages.filter((m) => m.severity <= 1).slice(0, 12).map((m) => `${m.code} ${m.pointer ?? ''} ${m.message}`) };
  await writeFile(join(OUT, `${a.id}.validator.json`), JSON.stringify(rep, null, 1));
  if (rep.issues.numErrors) fails.push(`${a.id}: glTF validator ${rep.issues.numErrors} error(s): ${row.validator.messages[0] ?? ''}`);
  row.bytes = bytes.length;
  // 5. sidecars (uniform textures): sRGB colour → ETC1S (basis-lz), data → UASTC + zstd; mips for both
  row.sidecarBytes = 0;
  for (const s of a.sidecars) {
    const src = join(TMP, s.png);
    await writeFile(src, (await rgba(join(RAW, s.png))).buf);
    s.ktx2 = `${s.name}.ktx2`;
    const args = s.srgb
      ? ['--format', 'R8G8B8A8_SRGB', TF, 'srgb', '--encode', 'basis-lz']
      : ['--format', 'R8G8B8A8_UNORM', TF, 'linear', '--encode', 'uastc', '--zstd', '18'];
    run('ktx', ['create', ...args, '--generate-mipmap', src, join(OUT, s.ktx2)]);
    s.bytes = await size(join(OUT, s.ktx2));
    row.sidecarBytes += s.bytes;
  }
  a.bytes = row.bytes; a.sidecarBytes = row.sidecarBytes;
  rows.push(row);
  console.log(`${a.id}: raw ${(a.rawBytes / 1024).toFixed(0)} KB → ${(row.bytes / 1024).toFixed(0)} KB + sidecars ${(row.sidecarBytes / 1024).toFixed(0)} KB, validator ${row.validator.errors} errors / ${row.validator.warnings} warnings`);
}

// decoders the page loads once (three 0.169 examples/jsm/libs)
const LIBS = 'node_modules/three/examples/jsm/libs';
const decoders = {};
for (const f of ['draco/gltf/draco_decoder.wasm', 'draco/gltf/draco_wasm_wrapper.js', 'basis/basis_transcoder.wasm', 'basis/basis_transcoder.js'])
  decoders[f] = await size(join(LIBS, f));
const decBytes = Object.values(decoders).reduce((s, b) => s + b, 0);
const sets = {};
for (const [k, s] of Object.entries(SETS)) {
  const list = man.assets.filter((a) => s.tiers.includes(a.tier));
  const assets = list.reduce((t, a) => t + a.bytes + a.sidecarBytes, 0);
  sets[k] = { assets: list.map((a) => a.id), bytes: assets, decoders: decBytes, total: assets + decBytes, budget: s.budget, ok: assets + decBytes <= s.budget };
  if (!sets[k].ok) fails.push(`${k} set ${(sets[k].total / MB).toFixed(2)} MB over the ${s.budget / MB} MB budget (§7.2)`);
}

await writeFile(join(OUT, 'manifest.json'), JSON.stringify(man, null, 1));
const pack = { built: new Date().toISOString(), versions, rows, decoders, sets, fails, ok: fails.length === 0 };
await writeFile(join(OUT, 'pack.json'), JSON.stringify(pack, null, 1));
console.log(`desktop ${(sets.desktop.total / MB).toFixed(2)} MB / 12, mobile ${(sets.mobile.total / MB).toFixed(2)} MB / 6, decoders ${(decBytes / 1024).toFixed(0)} KB`);
console.log(pack.ok ? 'PACK PASS' : 'PACK FAIL\n' + fails.join('\n'));
process.exit(pack.ok ? 0 : 1);
