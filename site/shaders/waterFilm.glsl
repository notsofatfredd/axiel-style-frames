// §3.2 AMOS water film: spreads from the fault building (film row, p 0.64–0.68) and becomes the black mirror floor.
// High tier: three/addons Reflector at half resolution feeds tDiffuse (planar reflection).
// Mid tier (§10.1, no planar reflection): compiled with NO_REFLECT, the reflection is a baked environment colour.

#ifdef VERTEX
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vUv = textureMatrix * vec4(position, 1.);
  vec4 wp = modelMatrix * vec4(position, 1.);
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
#endif

#ifdef FRAGMENT
uniform sampler2D tDiffuse;
uniform vec3 color;
uniform float uSpread, uTime, uRipple;
uniform vec2 uCenter;
uniform vec3 uInk, uTint, uEnv;
varying vec4 vUv;
varying vec3 vW;
#include <fog_pars_fragment>

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}

void main() {
  float d = length(vW.xz - uCenter);
  float edge = uSpread + (vnoise(vW.xz * 0.35) - 0.5) * 3. + (vnoise(vW.xz * 1.7) - 0.5) * 0.8;
  float m = 1. - smoothstep(edge - 0.6, edge, d);
  if (m <= 0.002) discard;
  float rim = smoothstep(edge - 1.4, edge - 0.5, d) * m;                    // meniscus at the leading edge
  vec3 V = normalize(cameraPosition - vW);
  float fr = 0.04 + 0.96 * pow(1. - max(V.y, 0.), 5.);                      // Schlick, flat water
#ifdef NO_REFLECT
  vec3 refl = uEnv;
#else
  vec2 rip = vec2(vnoise(vW.xz * 3. + uTime * 2.1), vnoise(vW.xz * 3. - uTime * 1.7)) - 0.5;
  vec4 uv = vUv;
  uv.xy += rip * 0.012 * uRipple * uv.w;                                    // rain rings break the mirror slightly
  vec3 refl = texture2DProj(tDiffuse, uv).rgb;
#endif
  vec3 c = mix(uInk, refl * uTint, mix(0.55, 1., fr));
  c += rim * uTint * 0.08;
  gl_FragColor = vec4(c, m * 0.94);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
#endif
