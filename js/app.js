/*
 * AXIEL style frames harness · protocol v1.4 (§2.0, §2.5).
 * Post chain = production chain: scene → selective bloom (only materials flagged
 * userData.bloom, i.e. --atlas-gold-hot / --lantern emissives) → tone map → 2% paper-fibre grain.
 * No vignette. Mid tier = §10.1 (no bloom, no planar mirror, fewer buildings: the frame decides).
 */
import { THREE, HEX, TOKEN, BLOOM_ONLY, disposeScene, fibreCanvas, canvasTex } from './core.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
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
/* §2.5: desktop deliverable 2560×1440 (1440 CSS px wide → u = 16/9). Phone 390×844 CSS at 3× (G2-4). */
const VIEWPORTS = {
  desktop: { name: 'desktop', W: 2560, H: 1440, u: 2560 / 1440, phone: false, css: '1440×810' },
  phone: { name: 'phone', W: 1170, H: 2532, u: 3, phone: true, css: '390×844' },
};
const BUDGET = { desktop: { calls: 150, tris: 500000 }, phone: { calls: 80, tris: 150000 } }; // §7.2

const qs = new URLSearchParams(location.search);
const state = {
  cur: -1, built: null, showCopy: true,
  tier: qs.get('tier') === 'mid' ? 'mid' : 'high',
  vp: qs.get('vp') === 'phone' ? 'phone' : 'desktop',
};

const glCanvas = document.getElementById('gl');
const ov = document.getElementById('ov');
const octx = ov.getContext('2d');
const stage = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;

/* ---------- passes ---------- */
// Renders the frame's scene; an optional planar mirror renders the world flipped first (AMOS floor).
function drawScene(r, f) {
  const { scene, camera, mirror } = f;
  if (mirror) {
    const { world, floor, dim, strength } = mirror;
    floor.visible = false; world.scale.y = -1; world.updateMatrixWorld(true); dim.value = strength;
    r.render(scene, camera);
    r.clearDepth();
    floor.visible = true; world.scale.y = 1; world.updateMatrixWorld(true); dim.value = 1;
  }
  r.render(scene, camera);
}
class ScenePass extends Pass {
  constructor() { super(); this.needsSwap = false; this.f = null; }
  render(r, writeBuffer, readBuffer) {
    r.setRenderTarget(this.renderToScreen ? null : readBuffer);
    r.setClearColor(this.f.clear, 1);
    r.clear();
    drawScene(r, this.f);
  }
}
// Selective bloom source: every non-bloom material is swapped for black so bloom objects keep correct occlusion.
const DARK = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
const DARK_PTS = new THREE.PointsMaterial({ color: 0x000000, fog: false });
class BloomSourcePass extends Pass {
  constructor() { super(); this.needsSwap = false; this.f = null; }
  render(r, writeBuffer, readBuffer) {
    const { scene } = this.f;
    const saved = new Map(), bg = scene.background;
    scene.traverse(o => {
      if (!o.material) return;
      const isBloom = (m) => m && m.userData && (m.userData.bloom || m.userData.bloomPart);
      if (Array.isArray(o.material)) {
        if (o.material.some(isBloom)) { saved.set(o, o.material); o.material = o.material.map(m => isBloom(m) ? m : DARK); }
        else { saved.set(o, o.material); o.material = DARK; }
      } else if (!isBloom(o.material)) {
        saved.set(o, o.material);
        o.material = o.isPoints ? DARK_PTS : DARK;
      }
    });
    scene.background = null;
    const fogCol = scene.fog ? scene.fog.color.clone() : null;
    if (scene.fog) scene.fog.color.set(0x000000);
    BLOOM_ONLY.value = 1;
    r.setRenderTarget(readBuffer);
    r.setClearColor(0x000000, 1);
    r.clear();
    drawScene(r, this.f);
    BLOOM_ONLY.value = 0;
    saved.forEach((m, o) => { o.material = m; });
    scene.background = bg;
    if (fogCol) scene.fog.color.copy(fogCol);
  }
}
// 2% paper-fibre grain [R8a], applied in display space after tone mapping. Overlay blend.
const fibre = canvasTex(fibreCanvas(1024, 20261002, 26000), false, { repeat: [1, 1] });
const GrainShader = {
  uniforms: { tDiffuse: { value: null }, tFibre: { value: fibre }, uRepeat: { value: new THREE.Vector2(1, 1) }, uOpacity: { value: 0.02 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse, tFibre; uniform vec2 uRepeat; uniform float uOpacity; varying vec2 vUv;
    vec3 overlay(vec3 b, vec3 s){ return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b)); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 g = texture2D(tFibre, vUv * uRepeat).rgb;
      gl_FragColor = vec4(mix(c.rgb, overlay(c.rgb, g), uOpacity), 1.0); }`,
};
const MixShader = {
  uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, uOn: { value: 1 } },
  vertexShader: GrainShader.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse, tBloom; uniform float uOn; varying vec2 vUv;
    void main(){ gl_FragColor = texture2D(tDiffuse, vUv) + uOn * vec4(texture2D(tBloom, vUv).rgb, 0.0); }`,
};

const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); BLACK.needsUpdate = true;
const rtOpts = { type: THREE.HalfFloatType };
const bloomComposer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(16, 16, rtOpts));
bloomComposer.renderToScreen = false;
const bloomSource = new BloomSourcePass();
const bloom = new UnrealBloomPass(new THREE.Vector2(16, 16), 1, 0.5, 0);
bloomComposer.addPass(bloomSource);
bloomComposer.addPass(bloom);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(16, 16, { ...rtOpts, samples: 4 }));
const scenePass = new ScenePass();
const mixPass = new ShaderPass(MixShader);
const grainPass = new ShaderPass(GrainShader);
composer.addPass(scenePass);
composer.addPass(mixPass);
composer.addPass(new OutputPass());
composer.addPass(grainPass);

function sizeTo(vp) {
  renderer.setSize(vp.W, vp.H, false);
  for (const c of [composer, bloomComposer]) { c.setPixelRatio(1); c.setSize(vp.W, vp.H); }
  ov.width = vp.W; ov.height = vp.H;
  grainPass.uniforms.uRepeat.value.set(vp.W / (1024 * vp.u / (2560 / 1440)), vp.H / (1024 * vp.u / (2560 / 1440)));
  stage.style.aspectRatio = `${vp.W} / ${vp.H}`;
  stage.classList.toggle('phone', vp.phone);
}

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

const vpNow = () => VIEWPORTS[state.vp];
function project(camera) {
  const { W, H } = vpNow();
  return (v) => { const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, z: p.z }; };
}
function drawOverlay(f) {
  const vp = vpNow();
  octx.clearRect(0, 0, vp.W, vp.H);
  if (state.showCopy && state.built && f.overlay) f.overlay(octx, vp, project(state.built.camera), state.built);
}
const li = (arr) => arr && arr.length ? `<ul>${arr.map(t => `<li>${t}</li>`).join('')}</ul>` : '<p class="none">None</p>';
const fmt = (n) => n.toLocaleString('en-ZA').replace(/ /g, ' ');
function auditTable(f) {
  const rows = f.audit ?? [];
  const pass = rows.length > 0 && rows.every(r => r[1] && r[2]);
  return `<table class="audit"><tr><th>Element</th><th>Job</th><th>Ownership</th></tr>
    ${rows.map(([e, j, o]) => `<tr><td>${e}</td><td>${j}</td><td>${o}</td></tr>`).join('')}</table>
    <p class="${pass ? 'pass' : 'err'}">${pass ? 'Generic audit passed: no banned items, every element passes the Job and Ownership tests.' : 'Generic audit incomplete.'}</p>`;
}
function renderNotes(f, st) {
  const vp = vpNow(), b = BUDGET[vp.phone ? 'phone' : 'desktop'];
  const k = state.built.camera.userData.key;
  const over = (v, lim) => v > lim ? ' class="err"' : '';
  notes.innerHTML = `
    <h2>${f.id} <span>${f.scene}</span></h2>
    <p class="moment">${f.moment}</p>
    <dl>
      <dt>Camera</dt><dd><b>${f.key}</b> · p ${f.p}<br>${f.cam}
        <br><span class="mono">pos (${k.pos.join(', ')}) → look (${k.look.join(', ')}) · FOV ${k.fov}${k.roll ? ` · roll ${(k.roll * 180 / Math.PI).toFixed(0)}°` : ''}</span>
        ${state.built.camNote ? `<br><span class="prop">${state.built.camNote}</span>` : ''}</dd>
      <dt>Light &amp; material (§2.3)</dt><dd>${f.light}</dd>
      <dt>Palette tokens used</dt><dd class="sw">${f.tokens.map(t => `<span><i style="background:${HEX[t]}"></i>${TOKEN[t]}</span>`).join('')}</dd>
      <dt>Proposed (needs your OK)</dt><dd>${li(f.proposed)}</dd>
      <dt>Unknown / open</dt><dd>${li(f.unknown)}</dd>
      <dt>Generic audit (§0 rule 7)</dt><dd>${auditTable(f)}</dd>
      <dt>Render · ${state.tier === 'high' ? 'High' : 'Mid'} tier · ${vp.name} ${vp.css}</dt><dd class="mono">
        ${vp.W}×${vp.H} · ${f.tone === THREE.NoToneMapping ? 'no tone map' : 'neutral tone map'} · bloom ${st.bloom}<br>
        scene draw calls <b${over(st.sceneCalls, b.calls)}>${st.sceneCalls}</b> / ${b.calls} · with post ${st.calls}<br>
        triangles <b${over(st.tris, b.tris)}>${fmt(st.tris)}</b> / ${fmt(b.tris)}<br>
        build ${st.buildMs} ms · render ${st.renderMs} ms</dd>
    </dl>`;
}

let buildToken = 0;
async function go(i) {
  i = (i + FRAMES.length) % FRAMES.length;
  let f = FRAMES[i];
  if (state.vp === 'phone' && !f.phone) state.vp = 'desktop';
  const vp = vpNow();
  const token = ++buildToken;
  busy.hidden = false;
  [...tabs.children].forEach((b, j) => b.classList.toggle('on', j === i));
  $('#vpPhone').disabled = !f.phone;
  $('#vpPhone').classList.toggle('on', state.vp === 'phone');
  $('#vpDesk').classList.toggle('on', state.vp === 'desktop');
  $('#tierHigh').classList.toggle('on', state.tier === 'high');
  $('#tierMid').classList.toggle('on', state.tier === 'mid');
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const t0 = performance.now();
  if (state.built) { disposeScene(state.built.scene); state.built = null; }
  sizeTo(vp);
  let built;
  try {
    built = await f.build({ renderer, tier: state.tier, vp });
  } catch (e) {
    busy.hidden = true;
    notes.innerHTML = `<h2>${f.id}</h2><p class="err">Build failed: ${e.message}</p>`;
    window.__frame = { id: f.id, ok: false, err: e.message };
    throw e;
  }
  if (token !== buildToken) { disposeScene(built.scene); return; }
  built.camera.aspect = vp.W / vp.H;
  built.camera.updateProjectionMatrix();
  state.built = built; state.cur = i;
  const buildMs = Math.round(performance.now() - t0);

  const fr = { ...built, mirror: state.tier === 'mid' ? null : built.mirror, clear: new THREE.Color(f.clear ?? HEX.ink) };
  scenePass.f = fr; bloomSource.f = fr;
  renderer.toneMapping = f.tone ?? THREE.NeutralToneMapping;
  renderer.toneMappingExposure = f.exposure ?? 1;
  const bloomOn = state.tier === 'high' && !!f.bloom;
  if (bloomOn) [bloom.strength, bloom.radius, bloom.threshold] = f.bloom;

  const t1 = performance.now();
  // scene-only stats (what §7.2 budgets): one plain scene render, counted
  renderer.info.reset();
  renderer.setRenderTarget(composer.readBuffer);
  renderer.setClearColor(fr.clear, 1); renderer.clear();
  drawScene(renderer, fr);
  const sceneCalls = renderer.info.render.calls, tris = renderer.info.render.triangles;
  renderer.info.reset();
  if (bloomOn) { bloomComposer.render(); mixPass.uniforms.tBloom.value = bloomComposer.readBuffer.texture; }
  mixPass.uniforms.uOn.value = bloomOn ? 1 : 0;
  if (!bloomOn) mixPass.uniforms.tBloom.value = BLACK;
  composer.render();
  const calls = renderer.info.render.calls;
  const renderMs = Math.round(performance.now() - t1);

  drawOverlay(f);
  const st = { sceneCalls, calls, tris, buildMs, renderMs, bloom: bloomOn ? f.bloom.join(' / ') : 'off' };
  renderNotes(f, st);
  busy.hidden = true;
  const qp = new URLSearchParams({ ...(state.tier === 'mid' ? { tier: 'mid' } : {}), ...(state.vp === 'phone' ? { vp: 'phone' } : {}) }).toString();
  history.replaceState(null, '', (qp ? '?' + qp : location.pathname) + '#' + f.id.toLowerCase());
  document.title = `${f.id} ${f.scene} · AXIEL Style Frames`;
  window.__frame = { id: f.id, ok: true, tier: state.tier, vp: state.vp, ...st, key: built.camera.userData.key };
}

const stamp = () => new Date().toISOString().slice(0, 10);
function fileName(f) {
  const v = [state.tier === 'mid' ? 'mid' : '', state.vp === 'phone' ? 'phone' : ''].filter(Boolean).join('-');
  return `AXIEL_${f.id}${v ? '-' + v : ''}_${f.scene}_${stamp()}.png`;
}
function snapshot() {
  const vp = vpNow(), c = document.createElement('canvas');
  c.width = vp.W; c.height = vp.H;
  const x = c.getContext('2d');
  x.drawImage(glCanvas, 0, 0);
  if (state.showCopy) x.drawImage(ov, 0, 0);
  return c;
}
window.__snapshot = () => snapshot().toDataURL('image/png');
window.__go = async (id, o = {}) => {
  if (o.tier) state.tier = o.tier;
  if (o.vp) state.vp = o.vp;
  await go(FRAMES.findIndex(f => f.id === id));
  return window.__frame;
};
window.__frames = FRAMES.map(f => ({ id: f.id, scene: f.scene, phone: !!f.phone }));
function exportPNG() {
  const f = FRAMES[state.cur];
  return new Promise(res => snapshot().toBlob(b => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = fileName(f);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    res();
  }, 'image/png'));
}
async function exportAll() {
  const back = state.cur;
  for (let i = 0; i < FRAMES.length; i++) { await go(i); await exportPNG(); await new Promise(r => setTimeout(r, 400)); }
  go(back);
}

$('#prev').onclick = () => go(state.cur - 1);
$('#next').onclick = () => go(state.cur + 1);
$('#export').onclick = exportPNG;
$('#exportAll').onclick = exportAll;
$('#copy').onclick = () => { state.showCopy = !state.showCopy; $('#copy').classList.toggle('on', state.showCopy); drawOverlay(FRAMES[state.cur]); };
$('#tierHigh').onclick = () => { state.tier = 'high'; go(state.cur); };
$('#tierMid').onclick = () => { state.tier = 'mid'; go(state.cur); };
$('#vpDesk').onclick = () => { state.vp = 'desktop'; go(state.cur); };
$('#vpPhone').onclick = () => { state.vp = 'phone'; go(state.cur); };
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (e.key === 'ArrowRight') go(state.cur + 1);
  else if (e.key === 'ArrowLeft') go(state.cur - 1);
  else if (e.key.toLowerCase() === 'c') $('#copy').click();
  else if (e.key.toLowerCase() === 'e') exportPNG();
});

await Promise.all([
  '300 40px Montserrat', '400 40px Montserrat', '500 40px Montserrat', '600 40px Montserrat',
  '400 40px "JetBrains Mono"', '500 40px "JetBrains Mono"',
].map(f => document.fonts.load(f)));
const fromHash = FRAMES.findIndex(f => '#' + f.id.toLowerCase() === location.hash);
go(fromHash >= 0 ? fromHash : 0);
