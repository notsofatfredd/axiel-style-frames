/*
 * Paper wall (§3.2, Surface → Seal): 120 × 320 at z = 0, centred (0, 150, 0), front face +z.
 * The tear (radius 3 at the origin) is shader displacement + an alpha mask driven by uOpen 0..1,
 * so one mesh plays the SF-01 crack (0), the opening and the SF-07b hole (1). The back face is the
 * horizon from inside the world; SF-07b prints the ranked result on it.
 * Geometry is polar around the tear: dense rings out to r 7.5 for the lip, then rings stretched to the
 * sheet edge, so the triangles sit where the displacement is (§3.2 budget 20k).
 */
import { THREE, MAT } from '../core.js';

export const WALL = { w: 120, h: 320, cy: 150, tearR: 3 };
const SEG = 128, RINGS = 72, NEAR = 7.5, NEAR_T = 0.6;

// distance from the origin to the sheet edge along angle a
function edge(a) {
  const dx = Math.cos(a), dy = Math.sin(a), x1 = WALL.w / 2, y0 = WALL.cy - WALL.h / 2, y1 = WALL.cy + WALL.h / 2;
  const tx = Math.abs(dx) > 1e-9 ? x1 / Math.abs(dx) : Infinity;
  const ty = dy > 1e-9 ? y1 / dy : dy < -1e-9 ? y0 / dy : Infinity;
  return Math.min(tx, ty);
}

export function wallGeometry() {
  const pos = [0, 0, 0], uv = [0.5, -(WALL.cy - WALL.h / 2) / WALL.h], idx = [];
  for (let j = 1; j <= RINGS; j++) {
    const t = j / RINGS;
    for (let i = 0; i < SEG; i++) {
      const a = i / SEG * Math.PI * 2, L = edge(a);
      // uniform ring spacing out to NEAR on every ray, then a quadratic stretch to the edge (exactly L at t = 1)
      const d = t <= NEAR_T ? NEAR * t / NEAR_T : NEAR + (L - NEAR) * ((t - NEAR_T) / (1 - NEAR_T)) ** 2;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      pos.push(x, y, 0); uv.push(x / WALL.w + 0.5, (y - WALL.cy) / WALL.h + 0.5);
    }
  }
  const v = (j, i) => (j === 0 ? 0 : 1 + (j - 1) * SEG + (i % SEG));
  for (let i = 0; i < SEG; i++) idx.push(0, v(1, i), v(1, i + 1));
  for (let j = 1; j < RINGS; j++) for (let i = 0; i < SEG; i++) {
    const a = v(j, i), b = v(j, i + 1), c = v(j + 1, i), d = v(j + 1, i + 1);
    idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, k) => (k % 3 === 2 ? 1 : 0)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// the tear outline: the SF-07b shape (3-lobe + 7-lobe wobble) plus a fibre jag
const TEAR_GLSL = /* glsl */`
  uniform float uOpen; varying vec2 vLoc;
  float tearR(float a) { return ${WALL.tearR.toFixed(1)} * (1.0 + 0.06 * sin(a * 3.0 + 1.0) + 0.04 * sin(a * 7.0 + 2.0) + 0.012 * sin(a * 41.0)); }`;

export function makePaperWall(o = {}) {
  const U = { uOpen: { value: o.open ?? 0 } };
  const mat = MAT.paper({ k: o.k ?? 'paper' });
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh) => {
    base(sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${TEAR_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLoc = position.xy;
        { float r = length(position.xy), R = tearR(atan(position.y, position.x)) * uOpen;
          float w = 1.0 - smoothstep(0.0, 2.2, r - R); w *= w * uOpen;
          transformed.z -= 1.4 * w;                                       // the lip curls into the world (−z)
          transformed.xy += position.xy / max(r, 1e-3) * 0.35 * w;        // and peels back from the hole
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${TEAR_GLSL}`)
      .replace('#include <clipping_planes_fragment>', `if (length(vLoc) < tearR(atan(vLoc.y, vLoc.x)) * uOpen) discard;\n#include <clipping_planes_fragment>`);
  };
  const mesh = new THREE.Mesh(wallGeometry(), mat);
  mesh.receiveShadow = true;
  mesh.userData = { uniforms: U, tris: mesh.geometry.index.count / 3 };
  return mesh;
}
