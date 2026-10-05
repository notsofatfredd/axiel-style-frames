// AMOS (§3.2, p 0.60–0.80) as a plain three.js world, built from the same kit and the same SF-06 set the style frame
// renders (light, fog, environment, wet city, repaired fault building, the neighbour's stain, beads), plus the live parts:
// GPU rain, the water film / mirror floor, per-element registration, and the drops the freeze labels hang on.
import * as THREE from 'three';
import { HEX, col, mixc, tokenEnv, keyLight, disposeScene } from '../../shared/js/core.js';
import { makeCity, makeGround, makeFaultBuilding, stainDecal } from '../../shared/js/kit/city.js';
import { beads, LABELS } from '../../shared/js/frames/sf06.js';
import { applyCamera } from '../../shared/js/camera.js';
import { scrub } from '../../shared/js/timeline.js';
import { TIER, type Tier } from '../../lib/tiers';
import type { Label } from '../../lib/store';
import { makeRain } from './rain';
import { makeFilm } from './waterFilm';
import { ORDER } from './integrity';

export const AMOS_RANGE: [number, number] = [0.55, 0.85];   // SCENES 0.60–0.80, mounted ±0.05 (§6.2.5)
export const FONTS = ['300 40px Montserrat', '400 40px Montserrat', '500 40px Montserrat', '600 40px Montserrat', '400 40px "JetBrains Mono"', '500 40px "JetBrains Mono"'];
const LABEL_PX = 25;               // SF-06 leaderLabel: 25 px mono, tracking 0.06 em (cap ≈ 18 px)
const K16_P = 0.79;
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export type AmosWorld = Awaited<ReturnType<typeof buildAmos>>;

export async function buildAmos({ renderer, tier, size }: { renderer: THREE.WebGLRenderer; tier: Tier; size: { w: number; h: number } }) {
  await Promise.all(FONTS.map((f) => document.fonts.load(f)));
  const T = TIER[tier];
  const root = new THREE.Group();
  root.name = 'AMOS';
  const fog = new THREE.FogExp2(mixc('night', 'rain', 0.22), 0.011);
  const env = tokenEnv(renderer, [col('rain', 0.7), mixc('night', 'rain', 0.3), col('ink')]);
  keyLight(root, { pos: [-2, 44, -22], target: [4, 8, -39], color: col('rain'), intensity: Math.PI * 0.75, extent: 24, far: 90, map: T.shadowMap, bias: -0.0003, normalBias: 0.04 });
  root.add(new THREE.HemisphereLight(col('rain'), col('ink'), Math.PI * 0.14));
  root.add(makeGround({ wet: true }));
  root.add(makeCity({ tier, wet: 1 }));
  root.add(await makeFaultBuilding({ state: 'repaired', wet: true, cardGlow: 0.18, hiGlow: 0 }));
  const stain = stainDecal({ seed: 2, w: 4.2, h: 4.2 });
  stain.position.set(-12, 8, -38.98);
  root.add(stain);
  const stainMat = stain.material as THREE.MeshStandardMaterial;

  // beads on the repaired window, then the nameplate, as each element registers (ORDER)
  const bead = beads(62, tier) as THREE.InstancedMesh;
  const nWin = tier === 'mid' ? 220 : 420;
  const beadU = { uReg: { value: 0 }, uNWin: { value: nWin }, uOrd: { value: new THREE.Vector2(ORDER.window, ORDER.plate) } };
  (bead.material as THREE.Material).onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, beadU);
    sh.vertexShader = 'uniform float uReg, uNWin; uniform vec2 uOrd; varying float vBead;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  float o = float(gl_InstanceID) < uNWin ? uOrd.x : uOrd.y; vBead = smoothstep(o, o + 0.1, uReg);');
    sh.fragmentShader = 'varying float vBead;\n' + sh.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a *= vBead;\n#include <alphatest_fragment>');
  };
  root.add(bead);

  const rain = makeRain(T.drops, tier);
  root.add(rain.mesh);
  const film = makeFilm(T.reflect, size.w, size.h);
  root.add(film.mesh);

  const state = { intensity: 0, reg: 0, spread: 0 };
  const k16 = new THREE.PerspectiveCamera(40, 1, 0.05, 1500);
  const v = new THREE.Vector3(), c = new THREE.Vector3();

  return {
    root, fog, env, clear: HEX.night as string, rain, film, state,
    update(p: number, dt: number, frozen: boolean, camera: THREE.Camera) {
      state.intensity = scrub('rain', p) * (1 - scrub('rain_stop', p));
      state.reg = scrub('beads', p);
      state.spread = scrub('film', p);
      rain.update({ intensity: state.intensity, reg: state.reg, dt, frozen, camera });
      film.update(state.spread, state.intensity, dt, frozen);
      beadU.uReg.value = state.reg;
      stainMat.opacity = sstep(ORDER.stain, ORDER.stain + 0.1, state.reg);
      stain.visible = stainMat.opacity > 0;
    },
    setSize(w: number, h: number) { film.setSize(w, h); },
    /* On freeze: each D4 label takes the falling drop nearest the place SF-06 hangs it (its anchor seen from K16 at
       this aspect), so the layout reads like the frame wherever in the window the reader stops. CSS px. */
    pickLabels(camera: THREE.PerspectiveCamera, W: number, H: number, phone: boolean): Label[] {
      k16.aspect = W / H;
      applyCamera(k16, K16_P, phone);
      const m = phone ? 24 : 64, t = rain.uniforms.uTime.value, out: Label[] = [], boxes: { x0: number; x1: number; ey: number }[] = [];
      const toScreen = (p: THREE.Vector3, cam: THREE.Camera) => { const q = p.clone().project(cam); return { x: (q.x * 0.5 + 0.5) * W, y: (0.5 - q.y * 0.5) * H, z: q.z }; };
      camera.getWorldPosition(c);
      for (const L of LABELS as { t: string; at: number[]; off: number[] }[]) {
        const a = toScreen(v.set(L.at[0], L.at[1], L.at[2]), k16);
        const tx = Math.min(Math.max(a.x, m + 10), W - m - 10), ty = Math.min(Math.max(a.y, m), H - m);
        const tw = L.t.length * LABEL_PX * 0.66, hh = LABEL_PX * 0.5 + 8;
        const fit = (r: boolean, x: number) => (r ? Math.min(x, W - m - tw - 6) : Math.max(x, m + tw + 6));
        const place = (ax: number, ay: number) => {
          let right = L.off[0] > 0, ex = fit(right, ax + L.off[0]);
          if (right ? ex < ax + 16 : ex > ax - 16) { right = !right; ex = fit(right, ax - L.off[0]); }   // no room outboard: hang it inboard
          const ey = Math.min(Math.max(ay + L.off[1], m * 0.6), H - m * 0.6);
          return { right, ex, ey, x0: right ? ex : ex - tw, x1: right ? ex + tw : ex };
        };
        // G6 review: on phone the anchors were apart but the text boxes stacked; a drop is only taken if its label clears the others.
        const clear = (b: { x0: number; x1: number; ey: number }) =>
          !boxes.some((o) => b.x0 < o.x1 + 10 && b.x1 > o.x0 - 10 && Math.abs(b.ey - o.ey) < 2 * hh);
        let best = -1, bd = phone ? 420 : 220, bx = 0, by = 0, bp: ReturnType<typeof place> | null = null;
        for (let i = 0; i < rain.n; i++) {
          const d = rain.dropAt(i, t, state.intensity, v);
          if (!d) continue;
          const dist = d.distanceTo(c);
          if (dist < 5 || dist > 40 || d.z < -38.5) continue;
          const s = toScreen(d, camera);
          if (s.z > 1 || s.x < m || s.x > W - m || s.y < m * 0.6 || s.y > H - m * 0.6) continue;
          if (out.some((o) => Math.hypot(o.ax - s.x, o.ay - s.y) < 48)) continue;
          const e = Math.hypot(s.x - tx, s.y - ty);
          if (e >= bd) continue;
          const pl = place(s.x, s.y);
          if (!clear(pl)) continue;
          bd = e; best = i; bx = s.x; by = s.y; bp = pl;
        }
        if (best < 0 || !bp) continue;
        const { right, ex, ey } = bp;
        boxes.push(bp);
        out.push({ text: L.t, ax: bx, ay: by, x: ex, y: ey, side: right ? 'r' : 'l', drop: best });
      }
      return out;
    },
    dispose() {
      rain.dispose();
      film.dispose();
      root.remove(rain.mesh, film.mesh);
      disposeScene(root);
      env.dispose();
    },
  };
}
