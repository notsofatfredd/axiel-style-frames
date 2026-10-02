/*
 * Paper sheet for Surface (SF-01) and Seal (SF-08).
 * §2.3: soft warm key from top-left, ambient paper bounce, no fog, emboss + fibre texture.
 * Lighting is calibrated so flat paper at frame centre renders at the --paper token.
 */
import { THREE, HEX, col, NOISE, BLOOM_ONLY } from './core.js';

export function makeSheet(texW, texH, worldW, worldH) {
  const mk = () => { const c = document.createElement('canvas'); c.width = texW; c.height = texH; return c; };
  const color = mk(), height = mk(), emis = mk();
  const cc = color.getContext('2d'), hc = height.getContext('2d'), ec = emis.getContext('2d');
  cc.fillStyle = HEX.paper; cc.fillRect(0, 0, texW, texH);
  hc.fillStyle = '#808080'; hc.fillRect(0, 0, texW, texH);
  ec.fillStyle = '#000000'; ec.fillRect(0, 0, texW, texH);
  const ppu = texW / worldW; // texture pixels per world unit
  const px = (x, y) => [(x / worldW + 0.5) * texW, (0.5 - y / worldH) * texH];
  return { color, height, emis, cc, hc, ec, texW, texH, worldW, worldH, ppu, px };
}

/* paper fibres: faint stone strokes in colour, faint ridges in height */
export function fibres(sh, rnd, n) {
  const { cc, hc, texW, texH } = sh;
  for (let i = 0; i < n; i++) {
    const x = rnd() * texW, y = rnd() * texH, a = rnd() * Math.PI * 2;
    const len = 8 + rnd() * 46, bend = (rnd() - 0.5) * 0.6;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const mx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * len * bend, my = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * len * bend;
    cc.globalAlpha = 0.025 + rnd() * 0.05;
    cc.strokeStyle = rnd() < 0.7 ? HEX.stone : HEX.bone;
    cc.lineWidth = 0.6 + rnd() * 1.1;
    cc.beginPath(); cc.moveTo(x, y); cc.quadraticCurveTo(mx, my, x2, y2); cc.stroke();
    hc.globalAlpha = 0.12 + rnd() * 0.12;
    hc.strokeStyle = '#ffffff';
    hc.lineWidth = 1.2 + rnd() * 1.4;
    hc.beginPath(); hc.moveTo(x, y); hc.quadraticCurveTo(mx, my, x2, y2); hc.stroke();
  }
  cc.globalAlpha = 1; hc.globalAlpha = 1;
}

/* tint an image's alpha with a flat colour (keeps the raster's exact shapes) */
export function tinted(img, w, h, color) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, w, h);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, w, h);
  return c;
}

export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('missing asset ' + src)); i.src = src; });
}

export const KEY_DIR = new THREE.Vector3(-0.45, 0.55, 0.70).normalize();
export const KEY_COL = new THREE.Color(1, 1, 1).lerp(col('lantern'), 0.05); // warm key: 5% --lantern

export function paperMesh(sh, o = {}) {
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCol: { value: tex(sh.color, true) }, uHgt: { value: tex(sh.height, false) }, uEmi: { value: tex(sh.emis, false) },
      uTexel: { value: new THREE.Vector2(1.5 / sh.texW, 1.5 / sh.texH) },
      uKeyDir: { value: KEY_DIR }, uKeyCol: { value: KEY_COL.clone().multiplyScalar(o.key ?? 0.92) },
      uAmb: { value: new THREE.Color(1, 1, 1).multiplyScalar(o.amb ?? 0.42) },
      uEmiC: { value: o.emisCol ?? col('hot', 3) }, uBump: { value: o.bump ?? 1.6 },
      uAspect: { value: sh.worldW / sh.worldH }, uBloomOnly: BLOOM_ONLY,
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uCol, uHgt, uEmi; uniform vec2 uTexel; uniform vec3 uKeyDir, uKeyCol, uAmb, uEmiC; uniform float uBump, uAspect, uBloomOnly;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        float hx = texture2D(uHgt, vUv + vec2(uTexel.x, 0.)).r - texture2D(uHgt, vUv - vec2(uTexel.x, 0.)).r;
        float hy = texture2D(uHgt, vUv + vec2(0., uTexel.y)).r - texture2D(uHgt, vUv - vec2(0., uTexel.y)).r;
        vec2 gp = vUv * vec2(uAspect, 1.0);
        float grain = vnoise(gp * 1300.0) * 0.6 + vnoise(gp * 420.0 + 7.0) * 0.4;
        vec3 n = normalize(vec3(-hx * uBump - dFdx(grain) * 0.35, -hy * uBump - dFdy(grain) * 0.35, 1.0));
        vec3 alb = texture2D(uCol, vUv).rgb * (0.988 + 0.024 * fbm(gp * 9.0));
        float ndl = max(dot(n, uKeyDir), 0.0);
        float fall = 1.0 - 0.18 * length((vUv - vec2(0.15, 0.95)) * vec2(uAspect * 0.6, 1.0));
        vec3 c = alb * (uAmb + uKeyCol * ndl * fall);
        vec3 e = texture2D(uEmi, vUv).rgb * uEmiC;
        c += e;
        gl_FragColor = vec4(uBloomOnly > 0.5 ? e : c, 1.0);
      }`,
  });
  mat.userData.bloomPart = true; // only the crack / beneath-light emissive blooms (--atlas-gold-hot)
  return new THREE.Mesh(new THREE.PlaneGeometry(sh.worldW, sh.worldH, o.segX ?? 1, o.segY ?? 1), mat);
}
