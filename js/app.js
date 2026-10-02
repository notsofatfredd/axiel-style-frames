import { THREE, HEX, TOKEN, disposeScene } from './core.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import sf01 from './frames/sf01.js';
import sf02 from './frames/sf02.js';
import sf03 from './frames/sf03.js';
import sf04 from './frames/sf04.js';
import sf05 from './frames/sf05.js';
import sf06 from './frames/sf06.js';
import sf07, { alt as sf07b } from './frames/sf07.js';
import sf08 from './frames/sf08.js';

const FRAMES = [sf01, sf02, sf03, sf04, sf05, sf06, sf07, sf07b, sf08];
const W = 2560, H = 1440; // §2.5 deliverable size; preview is the same pixels, scaled down

const glCanvas = document.getElementById('gl');
const ov = document.getElementById('ov');
const octx = ov.getContext('2d');
ov.width = W; ov.height = H;

const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.autoClear = false;

/* Scene pass with optional planar mirror (AMOS floor): mirrored world first, then the real one */
class ScenePass extends Pass {
  constructor() { super(); this.needsSwap = false; this.f = null; }
  render(r, writeBuffer, readBuffer) {
    const { scene, camera, mirror, clear } = this.f;
    r.setRenderTarget(this.renderToScreen ? null : readBuffer);
    r.setClearColor(clear, 1);
    r.clear();
    if (mirror) {
      const { world, floor, dim, strength } = mirror;
      floor.visible = false; world.scale.y = -1; dim.value = strength;
      r.render(scene, camera);
      r.clearDepth();
      floor.visible = true; world.scale.y = 1; dim.value = 1;
    }
    r.render(scene, camera);
  }
}
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
const scenePass = new ScenePass();
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1, 0.5, 0.2);
composer.addPass(scenePass);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- UI ---------- */
const $ = (s) => document.querySelector(s);
const tabs = $('#tabs'), notes = $('#notes'), busy = $('#busy');
FRAMES.forEach((f, i) => {
  const b = document.createElement('button');
  b.textContent = f.id;
  b.title = `${f.scene}: ${f.moment}`;
  b.onclick = () => go(i);
  tabs.appendChild(b);
});
let cur = -1, built = null, showCopy = true;

function project(camera) {
  return (v) => { const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, z: p.z }; };
}
function drawOverlay(f) {
  octx.clearRect(0, 0, W, H);
  if (showCopy && built) f.overlay(octx, W, H, project(built.camera));
}
const li = (arr) => arr.length ? `<ul>${arr.map(t => `<li>${t}</li>`).join('')}</ul>` : '<p class="none">None</p>';
function renderNotes(f, ms) {
  notes.innerHTML = `
    <h2>${f.id} <span>${f.scene}</span></h2>
    <p class="moment">${f.moment}</p>
    <dl>
      <dt>Camera</dt><dd><b>${f.key}</b> · p ${f.p}<br>${f.cam}</dd>
      <dt>Light &amp; material (§2.3)</dt><dd>${f.light}</dd>
      <dt>Palette tokens used</dt><dd class="sw">${f.tokens.map(k => `<span><i style="background:${HEX[k]}"></i>${TOKEN[k]}</span>`).join('')}</dd>
      <dt>Proposed (needs your OK)</dt><dd>${li(f.proposed)}</dd>
      <dt>Unknown / open</dt><dd>${li(f.unknown)}</dd>
      <dt>Render</dt><dd class="mono">${W}×${H} · ${f.tone === THREE.NoToneMapping ? 'no tone map' : 'neutral tone map'} · bloom ${f.bloom ? f.bloom.join(' / ') : 'off'} · ${ms} ms</dd>
    </dl>`;
}

async function go(i) {
  i = (i + FRAMES.length) % FRAMES.length;
  const f = FRAMES[i];
  busy.hidden = false;
  [...tabs.children].forEach((b, j) => b.classList.toggle('on', j === i));
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const t0 = performance.now();
  if (built) { disposeScene(built.scene); if (built.scene.environment) built.scene.environment.dispose(); }
  try {
    built = await f.build({ renderer });
  } catch (e) {
    busy.hidden = true;
    notes.innerHTML = `<h2>${f.id}</h2><p class="err">Build failed: ${e.message}</p>`;
    throw e;
  }
  cur = i;
  scenePass.f = { ...built, clear: new THREE.Color(f.clear ?? HEX.ink) };
  renderer.toneMapping = f.tone ?? THREE.NeutralToneMapping;
  renderer.toneMappingExposure = f.exposure ?? 1;
  bloom.enabled = !!f.bloom;
  if (f.bloom) [bloom.strength, bloom.radius, bloom.threshold] = f.bloom;
  composer.render();
  drawOverlay(f);
  renderNotes(f, Math.round(performance.now() - t0));
  busy.hidden = true;
  history.replaceState(null, '', '#' + f.id.toLowerCase());
  document.title = `${f.id} ${f.scene} · AXIEL Style Frames`;
  window.__frame = { id: f.id, ok: true };
}

const stamp = () => new Date().toISOString().slice(0, 10);
function exportPNG() {
  const f = FRAMES[cur];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.drawImage(glCanvas, 0, 0);
  if (showCopy) x.drawImage(ov, 0, 0);
  return new Promise(res => c.toBlob(b => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `AXIEL_${f.id}_${f.scene}_${stamp()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    res();
  }, 'image/png'));
}
async function exportAll() {
  const back = cur;
  for (let i = 0; i < FRAMES.length; i++) { await go(i); await exportPNG(); await new Promise(r => setTimeout(r, 400)); }
  go(back);
}

$('#prev').onclick = () => go(cur - 1);
$('#next').onclick = () => go(cur + 1);
$('#export').onclick = exportPNG;
$('#exportAll').onclick = exportAll;
$('#copy').onclick = () => { showCopy = !showCopy; $('#copy').classList.toggle('on', showCopy); drawOverlay(FRAMES[cur]); };
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') go(cur + 1);
  else if (e.key === 'ArrowLeft') go(cur - 1);
  else if (e.key.toLowerCase() === 'c') $('#copy').click();
  else if (e.key.toLowerCase() === 'e') exportPNG();
});

await Promise.all([
  '300 40px Montserrat', '400 40px Montserrat', '500 40px Montserrat', '600 40px Montserrat',
  '400 40px "JetBrains Mono"', '500 40px "JetBrains Mono"',
].map(f => document.fonts.load(f)));
const fromHash = FRAMES.findIndex(f => '#' + f.id.toLowerCase() === location.hash);
go(fromHash >= 0 ? fromHash : 0);
