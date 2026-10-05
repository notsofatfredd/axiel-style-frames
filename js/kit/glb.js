/* G7 asset pipeline, shared by the export page (assets.html) and the site.

   The props are modelled by the code kits. A GLB carries their geometry, node layout and plain PBR
   fallback materials. The procedural detail (world-space grain, carving, façade windows, wax relief)
   lives in shader patches, so each material also carries its recipe in extras.axiel, and
   rebuildScene() turns the fallback back into the exact kit material when the GLB loads.
   Textures that sit in shader uniforms (carve masks, symbol heights) are not glTF material slots;
   they ship as KTX2 sidecars next to the GLB and are named in the recipe.

   Nothing here is edited by hand: CI rebuilds every GLB from the kits on every run. */
import { THREE, detailMat } from '../core.js';

const COLOR_PROPS = ['color', 'emissive', 'sheenColor', 'specularColor', 'attenuationColor'];
const NUM_PROPS = ['roughness', 'metalness', 'emissiveIntensity', 'envMapIntensity', 'opacity', 'alphaTest', 'clearcoat',
  'clearcoatRoughness', 'sheen', 'sheenRoughness', 'anisotropy', 'anisotropyRotation', 'ior', 'transmission', 'thickness',
  'specularIntensity', 'aoMapIntensity', 'polygonOffsetFactor', 'polygonOffsetUnits', 'side', 'blending', 'bumpScale'];
const BOOL_PROPS = ['transparent', 'depthWrite', 'depthTest', 'polygonOffset', 'toneMapped', 'flatShading', 'fog', 'vertexColors'];
// glTF material slots GLTFExporter writes; everything else that is a texture becomes a sidecar
const SLOTS = ['map', 'emissiveMap', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap'];
const SIDE_SLOTS = ['alphaMap', 'bumpMap'];
const CTORS = { MeshStandardMaterial: THREE.MeshStandardMaterial, MeshPhysicalMaterial: THREE.MeshPhysicalMaterial, MeshBasicMaterial: THREE.MeshBasicMaterial };

const sampler = (t) => ({ cs: t.colorSpace, ws: t.wrapS, wt: t.wrapT, an: t.anisotropy, rp: t.repeat.toArray(), of: t.offset.toArray(), ch: t.channel });
const applySampler = (t, s) => {
  if (!s) return t;
  t.colorSpace = s.cs; t.wrapS = s.ws; t.wrapT = s.wt; t.anisotropy = s.an; t.repeat.fromArray(s.rp); t.offset.fromArray(s.of);
  if (s.ch !== undefined) t.channel = s.ch;
  t.needsUpdate = true;
  return t;
};

/* ---------- write ---------- */
/* ctx collects sidecar textures across one asset: ctx.side = Map(texture → { name, sampler }), ctx.ids = WeakMap(uniform → id) */
export function exportContext(asset) { return { asset, side: new Map(), ids: new WeakMap(), n: 0 }; }

function sideRef(ctx, tex, hint) {
  if (!ctx.side.has(tex)) ctx.side.set(tex, { name: `${ctx.asset}.${hint}${ctx.side.size ? '-' + ctx.side.size : ''}`, sampler: sampler(tex) });
  return { t: 'tex', name: ctx.side.get(tex).name };
}
function plainValue(v) {
  if (v === null || v === undefined || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map(plainValue);
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = plainValue(x);
    return o;
  }
  throw new Error('glb: recipe holds a value that cannot be written: ' + (v?.constructor?.name ?? typeof v));
}
function uniformValue(ctx, name, u) {
  if (!ctx.ids.has(u)) ctx.ids.set(u, ++ctx.n);
  const id = ctx.ids.get(u), v = u.value;
  if (v === null || v === undefined) return { id, t: 'null' };
  if (typeof v === 'number') return { id, t: 'f', v };
  if (typeof v === 'boolean') return { id, t: 'b', v };
  if (v.isColor) return { id, t: 'c', v: [v.r, v.g, v.b] };
  if (v.isVector2 || v.isVector3 || v.isVector4) return { id, t: 'v' + v.toArray().length, v: v.toArray() };
  if (v.isMatrix3 || v.isMatrix4) return { id, t: 'm' + (v.isMatrix3 ? 3 : 4), v: v.toArray() };
  if (v.isTexture) return { id, ...sideRef(ctx, v, name) };
  if (Array.isArray(v) && v.every(x => typeof x === 'number')) return { id, t: 'a', v: [...v] };
  throw new Error(`glb: uniform ${name} has a type the recipe cannot hold`);
}

export function materialRecipe(ctx, m) {
  if (m.isShaderMaterial) throw new Error('glb: ShaderMaterial is code-native, not a GLB asset: ' + m.name);
  const ctor = m.type;
  if (!CTORS[ctor]) throw new Error('glb: material type not supported: ' + ctor);
  const props = {};
  for (const k of COLOR_PROPS) if (m[k]?.isColor) props[k] = [m[k].r, m[k].g, m[k].b];
  for (const k of NUM_PROPS) if (typeof m[k] === 'number') props[k] = m[k];
  for (const k of BOOL_PROPS) if (typeof m[k] === 'boolean') props[k] = m[k];
  if (m.normalScale) props.normalScale = m.normalScale.toArray();
  const slots = {}, side = {};
  for (const k of SLOTS) if (m[k]) slots[k] = sampler(m[k]);
  for (const k of SIDE_SLOTS) if (m[k]) side[k] = sideRef(ctx, m[k], k).name;
  const flags = { bloom: !!m.userData.bloom, bloomPart: !!m.userData.bloomPart };
  const r = { v: 1, kind: 'plain', ctor, props, slots, side, flags };
  const d = m.userData.detail;
  if (d) {
    r.kind = 'detail';
    r.keys = d.keys;
    const o = {};
    for (const [k, v] of Object.entries(d.o)) if (k !== 'uniforms') o[k] = plainValue(v);
    o.uniforms = {};
    for (const [k, u] of Object.entries(d.o.uniforms ?? {})) o.uniforms[k] = uniformValue(ctx, k, u);
    r.o = o;
  }
  return r;
}

/* Run fn(root) with every material's and node's userData swapped for the recipe only, then restore.
   (GLTFExporter writes userData as extras; the kits' own userData holds meshes and textures.) */
export async function withRecipes(ctx, root, fn) {
  const saved = new Map(), done = new Map();
  const swap = (o, data) => { if (!saved.has(o)) saved.set(o, o.userData); o.userData = data; };
  let i = 0;
  root.traverse(o => {
    if (o.isMesh && !o.name) o.name = `${ctx.asset}-${i++}`;
    const node = { renderOrder: o.renderOrder, castShadow: o.castShadow, receiveShadow: o.receiveShadow };
    swap(o, { axiel: node });
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (done.has(m)) continue;
      const r = materialRecipe(ctx, m);
      done.set(m, r);
    }
  });
  for (const [m, r] of done) swap(m, { axiel: r });
  try { return await fn(); } finally { for (const [o, u] of saved) o.userData = u; }
}

/* ---------- read ---------- */
function makeUniform(u, reg, tex) {
  if (reg.has(u.id)) return reg.get(u.id);
  let v;
  switch (u.t) {
    case 'null': v = null; break;
    case 'f': case 'b': v = u.v; break;
    case 'c': v = new THREE.Color(...u.v); break;
    case 'v2': v = new THREE.Vector2(...u.v); break;
    case 'v3': v = new THREE.Vector3(...u.v); break;
    case 'v4': v = new THREE.Vector4(...u.v); break;
    case 'm3': v = new THREE.Matrix3().fromArray(u.v); break;
    case 'm4': v = new THREE.Matrix4().fromArray(u.v); break;
    case 'a': v = [...u.v]; break;
    case 'tex': v = tex(u.name); break;
    default: throw new Error('glb: unknown uniform type ' + u.t);
  }
  const x = { value: v };
  reg.set(u.id, x);
  return x;
}

/* fallback: the material GLTFLoader made (its texture slots are the compressed KTX2 textures).
   tex(name): the loaded sidecar texture with its sampler applied. reg: uniforms shared within the asset. */
export function rebuildMaterial(fallback, r, tex, reg) {
  const Ctor = CTORS[r.ctor];
  const params = {};
  for (const [k, v] of Object.entries(r.props)) {
    if (COLOR_PROPS.includes(k)) params[k] = new THREE.Color(...v);
    else if (k === 'normalScale') params[k] = new THREE.Vector2(...v);
    else params[k] = v;
  }
  for (const [k, s] of Object.entries(r.slots)) {
    const t = fallback[k];
    if (!t) throw new Error(`glb: ${fallback.name}: slot ${k} missing from the GLB`);
    params[k] = applySampler(t, { ...s, ch: k === 'aoMap' ? t.channel : s.ch });
  }
  // a lightmap baked after export lands in the fallback's aoMap (occlusionTexture, TEXCOORD_1)
  if (!r.slots.aoMap && fallback.aoMap) { params.aoMap = fallback.aoMap; params.aoMapIntensity = fallback.aoMapIntensity ?? 1; }
  for (const [k, name] of Object.entries(r.side)) params[k] = tex(name);
  let m;
  if (r.kind === 'detail') {
    const o = { ...r.o, uniforms: {} };
    for (const [k, u] of Object.entries(r.o.uniforms)) o.uniforms[k] = makeUniform(u, reg, tex);
    // params are the live values at export, so props a kit changed after making the material (symM.roughness = 0.45) hold
    m = detailMat(params, o);
  } else {
    m = new Ctor(params);
  }
  m.name = fallback.name;
  if (r.flags.bloom) m.userData.bloom = true;
  if (r.flags.bloomPart) m.userData.bloomPart = true;
  return m;
}

/* Rebuild every recipe material in a loaded glTF scene in place. sidecars: name → loaded texture.
   Returns { materials: [rebuilt], uniforms: Map(id → uniform) }. */
export function rebuildScene(root, sidecars, samplers = {}) {
  const reg = new Map(), map = new Map();
  const tex = (name) => {
    const t = sidecars[name];
    if (!t) throw new Error('glb: sidecar texture missing: ' + name);
    return applySampler(t, samplers[name]);
  };
  root.traverse(o => {
    const node = o.userData?.axiel;
    if (node) { o.renderOrder = node.renderOrder; o.castShadow = node.castShadow; o.receiveShadow = node.receiveShadow; }
    if (!o.isMesh) return;
    const mats = [].concat(o.material).map(f => {
      const r = f.userData?.axiel;
      if (!r) return f;
      if (!map.has(f)) map.set(f, rebuildMaterial(f, r, tex, reg));
      return map.get(f);
    });
    o.material = Array.isArray(o.material) ? mats : mats[0];
  });
  for (const f of map.keys()) f.dispose();
  return { materials: [...map.values()], uniforms: reg };
}
