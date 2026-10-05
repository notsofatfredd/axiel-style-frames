// §3.2 AMOS rain: GPU drops on an instanced, stretched icosahedron. One file, two stages (#define VERTEX / FRAGMENT).
// Every drop's path is precomputed on the CPU (components/scenes/rain.ts): start, first surface hit, kind, speed,
// phase. The vertex stage places the drop at uTime; after impact it reads the integrity mask:
//   working element (mask R >= 0.5): the drop beads, holds, then rolls down the glass (--rain)
//   fault           (mask R <  0.5): the drop flattens and soaks in, turning --signal-red
//   roof or ground, or an element not yet registered (uReg < mask G): a short splash
// rain.ts mirrors the falling phase on the CPU (dropAt) so the freeze labels can find the same drops.

#ifdef VERTEX
attribute vec3 aStart;
attribute vec3 aHit;
attribute vec4 aDrop;    // x speed (u/s), y phase (s), z cycle (s), w radius
attribute vec4 aKind;    // x kind (0 roof/ground, 1 main façade z −39, 2 other façade), yz mask uv, w hash (rain intensity gate)
uniform float uTime, uIntensity, uReg, uPost;
uniform float uHi[5];
uniform vec3 uDir;
uniform sampler2D uMask;
varying vec3 vN;
varying vec3 vV;
varying float vA;
varying float vRed;
varying float vHi;
#include <fog_pars_vertex>

void main() {
  float speed = aDrop.x, cyc = aDrop.z, rad = aDrop.w;
  float tf = length(aHit - aStart) / speed;
  float t = mod(uTime + aDrop.y, cyc);
  float hi = 0.;
  for (int k = 0; k < 5; k++) hi = max(hi, 1. - step(0.5, abs(uHi[k] - float(gl_InstanceID))));

  vec3 X = vec3(1., 0., 0.), U = -uDir, Z = cross(X, U);
  vec3 s = vec3(rad, rad * 2.8, rad);
  vec3 c;
  float a = 1.;
  vRed = 0.;
  if (t < tf) {
    c = aStart + uDir * speed * t;
    a = smoothstep(0., 0.2, t);
  } else {
    float tt = t - tf;
    vec3 n = aKind.x < 0.5 ? vec3(0., 1., 0.) : vec3(0., 0., 1.);
    vec4 m = texture2D(uMask, aKind.yz);
    float integ = aKind.x > 1.5 ? 1. : m.r;
    float order = aKind.x > 1.5 ? 0.95 : m.g;
    float reg = aKind.x < 0.5 ? 0. : step(order, uReg);
    if (aKind.x < 0.5) { X = vec3(1., 0., 0.); U = vec3(0., 0., 1.); Z = n; }
    else { X = vec3(1., 0., 0.); U = vec3(0., 1., 0.); Z = n; }
    if (reg < 0.5) {                       // splash: spreads flat on the surface, gone in 0.15 s
      float k = clamp(tt / 0.15, 0., 1.);
      c = aHit + n * 0.05;
      s = vec3(rad * (1. + 2. * k), rad * (1. + 2. * k), rad * 0.25);
      a = 1. - k;
    } else if (integ >= 0.5) {             // bead: sits 0.3 s, then rolls down, stretching
      float r = max(tt - 0.3, 0.);
      c = aHit + n * rad * 0.6 - vec3(0., 1.5 * r * r, 0.);
      s = vec3(rad * 1.3, rad * (1.5 + 5. * r), rad * 0.7);
      a = 1. - smoothstep(uPost - 0.2, uPost, tt);
    } else {                               // soak: flattens into the surface and stains
      float k = clamp(tt / 0.35, 0., 1.);
      c = aHit + n * 0.015;
      s = vec3(rad * (1. + 3. * k), rad * (1. + 3. * k), rad * 0.15);
      vRed = k;
      a = 1. - smoothstep(0.35, uPost, tt);
    }
    if (tt > uPost) s = vec3(0.);
  }
  s *= step(aKind.w, uIntensity) * mix(1., 2.4, hi);
  vA = max(a, hi);
  vHi = hi;

  vec3 w = c + X * position.x * s.x + U * position.y * s.y + Z * position.z * s.z;
  vec3 nw = normalize(X * normal.x / max(s.x, 1e-5) + U * normal.y / max(s.y, 1e-5) + Z * normal.z / max(s.z, 1e-5));
  vec4 mvPosition = viewMatrix * vec4(w, 1.);
  vN = normalize(mat3(viewMatrix) * nw);
  vV = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
#endif

#ifdef FRAGMENT
uniform vec3 uRain, uRed, uSky, uLow, uKeyV;
varying vec3 vN;
varying vec3 vV;
varying float vA;
varying float vRed;
varying float vHi;
#include <fog_pars_fragment>

void main() {
  vec3 N = normalize(vN), V = normalize(vV);
  if (!gl_FrontFacing) N = -N;
  float fr = pow(1. - max(dot(N, V), 0.), 3.);
  vec3 R = reflect(-V, N);
  vec3 up = normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz);
  vec3 env = mix(uLow, uSky, dot(R, up) * 0.5 + 0.5);
  float spec = pow(max(dot(R, uKeyV), 0.), 60.);
  vec3 col = mix(uRain * 0.16, env, 0.35 + 0.65 * fr) + spec * uRain * 1.4;
  float alpha = clamp((0.2 + 0.65 * fr + spec) * vA, 0., 1.);
  col = mix(col, uRed * 0.75, vRed);
  alpha = mix(alpha, 0.8 * vA, vRed);
  alpha = mix(alpha, min(1., alpha + 0.25), vHi);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
#endif
