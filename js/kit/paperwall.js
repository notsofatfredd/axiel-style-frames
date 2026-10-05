/*
 * Paper wall (§3.2, Surface → Seal): 120 × 320 at z = 0, centred (0, 150, 0), front face +z.
 * The tear is shader displacement + an alpha mask driven by uOpen 0..1, so one mesh plays the whole
 * film: closed (0), the crack running along one jagged line (to 0.3), then the paper tearing open along
 * it into a lens about 5 wide and 8.4 tall (1), lip curling into the world. The back face is the
 * horizon from inside the world; SF-07b prints the ranked result on it.
 * Geometry is polar around the tear: dense rings out to r 7.5 for the lip, then rings stretched to the
 * sheet edge, so the triangles sit where the displacement is (§3.2 budget 20k).
 */
import { THREE, MAT } from '../core.js';

export const WALL = { w: 120, h: 320, cy: 150, tearHL: 4.2, tearHW: 2.4 };   // tear half-length (along the crack) and half-width when fully open
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

// the tear: a crack that runs first, then paper torn open along it (each side jagged on its own)
const TEAR_GLSL = /* glsl */`
  uniform float uOpen; varying vec2 vLoc;
  // centre line of the crack: x offset at height y, one jagged line
  float crackX(float y) { return 0.22 * sin(1.7 * y + 1.0) + 0.11 * sin(4.3 * y + 2.0) + 0.045 * sin(11.0 * y + 0.5) + 0.02 * sin(29.0 * y); }
  // approximate signed distance to the tear outline (< 0 is torn away)
  float tearD(vec2 p, float u) {
    float hl = ${WALL.tearHL.toFixed(2)} * smoothstep(0.0, 0.3, u);                                   // the crack runs
    float hw = 0.03 * smoothstep(0.0, 0.08, u) + ${WALL.tearHW.toFixed(2)} * pow(smoothstep(0.25, 1.0, u), 1.3);  // then tears open
    float dx = p.x - crackX(p.y), sd = sign(dx);
    float ty = clamp(p.y / max(hl, 1e-3), -1.0, 1.0);
    // each side its own broad, uneven bulge (scales with the opening), plus a fibre jag of fixed size
    // (scaling the jag with the width read as a regular sawtooth once fully open)
    float bulge = 1.0 + 0.16 * sin(2.3 * p.y + 1.0 + 2.5 * sd) + 0.09 * sin(5.9 * p.y + 2.0 + 1.7 * sd);
    float fibre = (0.09 * sin(9.7 * p.y + 3.0 * sd) + 0.05 * sin(23.1 * p.y + 1.0 + sd) + 0.025 * sin(51.0 * p.y + 2.0 * sd)) * min(hw, 1.0);
    return max(abs(dx) - (hw * pow(max(1.0 - ty * ty, 0.0), 0.6) * bulge + fibre), abs(p.y) - hl);
  }`;

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
        { float w = 1.0 - smoothstep(0.0, 2.2, max(tearD(position.xy, uOpen), 0.0)); w *= w * smoothstep(0.2, 1.0, uOpen);
          vec2 away = normalize(vec2(position.x - crackX(position.y), 0.25 * position.y) + vec2(1e-4, 0.0));
          transformed.z -= 1.4 * w;                                       // the lip curls into the world (−z) once it tears open
          transformed.xy += away * 0.35 * w;                              // and peels back from the crack
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${TEAR_GLSL}`)
      .replace('#include <clipping_planes_fragment>', `float tD = tearD(vLoc, uOpen); if (tD < 0.0) discard;\n#include <clipping_planes_fragment>`)
      // torn fibres: a thin, uneven paler rim along the edge
      .replace('#include <roughnessmap_fragment>', `if (uOpen > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), 0.35 * (1.0 - smoothstep(0.0, 0.035 + 0.03 * sin(61.0 * vLoc.y + 13.0 * vLoc.x), tD)));\n#include <roughnessmap_fragment>`);
  };
  const mesh = new THREE.Mesh(wallGeometry(), mat);
  mesh.receiveShadow = true;
  mesh.userData = { uniforms: U, tris: mesh.geometry.index.count / 3 };
  return mesh;
}
