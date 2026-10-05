// §3.2 water film → black mirror floor. High: planar reflection (three/addons Reflector) at half resolution.
// Mid (§10.1): no planar reflection, the same shader compiled with NO_REFLECT reads a baked environment colour.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { col, mixc } from '../../shared/js/core.js';
import src from '../../shaders/waterFilm.glsl';

export const FILM = { center: [4, -39] as [number, number], radius: 70, y: 0.02 };

export type Film = ReturnType<typeof makeFilm>;

export function makeFilm(reflect: boolean, w: number, h: number) {
  const geo = new THREE.PlaneGeometry(130, 110);
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    tDiffuse: { value: null as THREE.Texture | null }, color: { value: new THREE.Color(0x7f7f7f) }, textureMatrix: { value: new THREE.Matrix4() },
    uSpread: { value: 0 }, uTime: { value: 0 }, uRipple: { value: 0 },
    uCenter: { value: new THREE.Vector2(...FILM.center) },
    uInk: { value: col('ink') }, uTint: { value: mixc('bone', 'rain', 0.5, 0.9) }, uEnv: { value: mixc('night', 'rain', 0.3, 0.6) },
  };
  const shader = { name: 'WaterFilm', uniforms, vertexShader: '#define VERTEX\n' + src, fragmentShader: '#define FRAGMENT\n' + src };
  let mesh: THREE.Mesh, reflector: Reflector | null = null;
  if (reflect) {
    reflector = new Reflector(geo, { textureWidth: Math.max(2, w >> 1), textureHeight: Math.max(2, h >> 1), clipBias: 0.003, shader, multisample: 0 });
    mesh = reflector;
  } else {
    mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ ...shader, uniforms, defines: { NO_REFLECT: '' } }));
  }
  const mat = mesh.material as THREE.ShaderMaterial;
  mat.fog = true;
  mat.transparent = true;
  mat.depthWrite = false;
  mesh.rotation.x = -Math.PI / 2;      // the Reflector mirrors about the mesh's local +z
  mesh.position.set(0, FILM.y, -50);
  mesh.renderOrder = 1;
  const u = mat.uniforms;

  return {
    mesh, reflector,
    update(spread: number, ripple: number, dt: number, frozen: boolean) {
      u.uSpread.value = spread * FILM.radius;
      u.uRipple.value = ripple;
      if (!frozen) u.uTime.value += dt;
      mesh.visible = spread > 0;      // no reflection pass at all until the film starts to spread
    },
    setSize(w: number, h: number) { reflector?.getRenderTarget().setSize(Math.max(2, w >> 1), Math.max(2, h >> 1)); },
    dispose() { geo.dispose(); if (reflector) reflector.dispose(); else mat.dispose(); },
  };
}
