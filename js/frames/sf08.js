import { THREE, HEX, col, mixc, rng, makeCamera, NOISE, setFont, textC } from '../core.js';
import { makeSheet, fibres, paperMesh, KEY_DIR, KEY_COL } from '../paper.js';

const SEAL = { x: 0, y: 1.05, R: 1.3 };
const TR = 0.62 * 0.93 * SEAL.R; // radius of the stamped field the text texture covers

function sealText() {
  const N = 1024, c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N);
  x.fillStyle = '#fff'; x.strokeStyle = '#fff';
  x.filter = 'blur(1.6px)';
  x.textBaseline = 'alphabetic';
  let px = 200;
  setFont(x, 600, px, 'Montserrat', 0.14);
  const fit = 0.76 * N;
  const w = Math.max(x.measureText('INTAKE').width, x.measureText('CLOSED').width);
  px *= fit / w;
  setFont(x, 600, px, 'Montserrat', 0.14);
  textC(x, 'INTAKE', N / 2, N / 2 - px * 0.16, px, 0.14);
  textC(x, 'CLOSED', N / 2, N / 2 + px * 0.86, px, 0.14);
  x.lineWidth = px * 0.035;
  x.beginPath(); x.moveTo(N * 0.3, N / 2 + px * 0.05); x.lineTo(N * 0.7, N / 2 + px * 0.05); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function waxMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTxt: { value: sealText() }, uR: { value: SEAL.R }, uTR: { value: TR },
      uAlb: { value: col('red') }, uSheen: { value: mixc('red', 'paper', 0.45) },
      uKeyDir: { value: KEY_DIR }, uKeyCol: { value: KEY_COL.clone().multiplyScalar(0.92) }, uAmb: { value: new THREE.Color(0.42, 0.42, 0.42) },
    },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uTxt; uniform float uR, uTR; uniform vec3 uAlb, uSheen, uKeyDir, uKeyCol, uAmb;
      varying vec2 vP;
      ${NOISE}
      float edgeR(vec2 p){
        float a = atan(p.y, p.x); vec2 d = normalize(p + 1e-5);
        return uR * (0.93 + 0.03 * sin(3.0 * a + 0.4) + 0.02 * sin(7.0 * a + 1.3) + 0.012 * sin(13.0 * a + 2.1) + 0.05 * (vnoise(d * 2.6 + 5.0) - 0.5));
      }
      float Hf(vec2 p){
        float t = length(p) / edgeR(p);
        float dome = 0.14 * sqrt(max(1.0 - t * t, 0.0));
        float press = -0.05 * smoothstep(0.74, 0.68, t);
        float lip = 0.035 * exp(-pow((t - 0.74) / 0.045, 2.0));
        float ring = 0.012 * (1.0 - smoothstep(0.004, 0.012, abs(t - 0.62)));
        float txt = texture2D(uTxt, p / (2.0 * uTR) + 0.5).r * 0.022 * step(t, 0.6);
        float pool = 0.004 * vnoise(p * 9.0);
        return dome + press + lip + ring + txt + pool;
      }
      void main(){
        float r = length(vP), R = edgeR(vP), aa = fwidth(r) * 1.2;
        float mask = 1.0 - smoothstep(R - aa, R + aa, r);
        if (mask <= 0.001) discard;
        float e = 0.004, h0 = Hf(vP);
        vec3 n = normalize(vec3(-(Hf(vP + vec2(e, 0.)) - Hf(vP - vec2(e, 0.))) / (2. * e), -(Hf(vP + vec2(0., e)) - Hf(vP - vec2(0., e))) / (2. * e), 1.0));
        vec3 V = vec3(0.0, 0.0, 1.0), Hv = normalize(uKeyDir + V);
        float wrap = max((dot(n, uKeyDir) + 0.35) / 1.35, 0.0);          // wax lets light in: wrapped diffuse
        float spec = pow(max(dot(n, Hv), 0.0), 70.0) * 0.5 + pow(max(dot(n, Hv), 0.0), 12.0) * 0.05;
        float fres = pow(1.0 - max(n.z, 0.0), 2.5);
        float cav = smoothstep(-0.03, 0.06, h0);
        vec3 c = uAlb * (uAmb * 0.9 + uKeyCol * wrap) * mix(0.72, 1.0, cav) + uSheen * fres * 0.55 + uKeyCol * spec;
        gl_FragColor = vec4(c, mask);
      }`,
    transparent: true, depthWrite: false,
  });
}

const FIELDS = [
  { label: 'Name', w: 290 },
  { label: 'Email', w: 380 },
  { label: 'Company', w: 290 },
  { label: 'What do you need?', w: 380, select: true },
];

export default {
  id: 'SF-08', scene: 'Seal', moment: 'Wax seal "INTAKE CLOSED" + waitlist field', p: '0.97–1.00',
  key: 'K20', cam: '(0, 0, 10) → look (0, 0, 0) · FOV 40',
  tone: THREE.NoToneMapping, bloom: null, clear: HEX.paper,
  light: 'Same as Surface: soft warm key from top-left, paper bounce, no fog. Red wax with a subsurface sheen (wrapped diffuse + fresnel sheen).',
  tokens: ['paper', 'bone', 'stone', 'ink', 'graphite', 'red'],
  proposed: [
    'Seal impression: "INTAKE" / "CLOSED" on two lines in Montserrat 600 (raised in the wax), with a ring border and a pressed field.',
    'Waitlist shown as a single editorial row: underline fields, labels in --stone, the select with a chevron.',
    'Copy line "Intake is closed. Join the list for the next window." centred between the seal and the form.',
  ],
  unknown: ['Submit button label: not in the approved copy, so an arrow glyph stands in. Needs a label at G9 (or keep the arrow).'],
  build() {
    const scene = new THREE.Scene();
    const camera = makeCamera(40, [0, 0, 10], [0, 0, 0]);
    const W = 14, H = 7.875;
    const sh = makeSheet(4096, 2304, W, H);
    fibres(sh, rng(19), 14000);
    // wax seal contact shadow (key from top-left)
    const [sx, sy] = sh.px(SEAL.x + 0.07, SEAL.y - 0.11);
    const g = sh.cc.createRadialGradient(sx, sy, SEAL.R * 0.6 * sh.ppu, sx, sy, SEAL.R * 1.12 * sh.ppu);
    g.addColorStop(0, 'rgba(11,11,12,0.26)'); g.addColorStop(1, 'rgba(11,11,12,0)');
    sh.cc.fillStyle = g; sh.cc.fillRect(0, 0, sh.texW, sh.texH);
    scene.add(paperMesh(sh, { key: 0.92, amb: 0.42, bump: 1.4 }));

    const seal = new THREE.Mesh(new THREE.PlaneGeometry(SEAL.R * 2.3, SEAL.R * 2.3), waxMat());
    seal.position.set(SEAL.x, SEAL.y, 0.02);
    scene.add(seal);
    return { scene, camera };
  },
  overlay(ctx, W, H, project) {
    const s = H / 1440;
    const line = project(new THREE.Vector3(0, -0.72, 0));
    ctx.save();
    ctx.fillStyle = HEX.ink; ctx.textBaseline = 'alphabetic';
    setFont(ctx, 300, 40 * s);
    textC(ctx, 'Intake is closed. Join the list for the next window.', W / 2, line.y, 40 * s);

    const row = project(new THREE.Vector3(0, -1.5, 0));
    const gap = 30 * s, btn = 64 * s;
    const total = FIELDS.reduce((a, f) => a + f.w * s, 0) + gap * FIELDS.length + btn;
    let x = W / 2 - total / 2;
    const yLine = row.y + 30 * s;
    for (const f of FIELDS) {
      const w = f.w * s;
      setFont(ctx, 400, 17 * s, 'Montserrat', 0.06);
      ctx.textAlign = 'left'; ctx.fillStyle = HEX.stone;
      ctx.fillText(f.label, x, row.y - 22 * s);
      ctx.fillStyle = HEX.ink;
      ctx.fillRect(x, yLine, w, Math.max(1, 1.5 * s));
      if (f.select) {
        ctx.strokeStyle = HEX.ink; ctx.lineWidth = Math.max(1, 1.5 * s);
        const cx = x + w - 14 * s, cy = yLine - 18 * s;
        ctx.beginPath(); ctx.moveTo(cx - 7 * s, cy - 4 * s); ctx.lineTo(cx, cy + 3 * s); ctx.lineTo(cx + 7 * s, cy - 4 * s); ctx.stroke();
      }
      x += w + gap;
    }
    ctx.fillStyle = HEX.ink;
    ctx.fillRect(x, yLine - btn + 8 * s, btn, btn);
    ctx.strokeStyle = HEX.paper; ctx.lineWidth = Math.max(1, 2 * s);
    const ax = x + btn / 2, ay = yLine - btn / 2 + 8 * s;
    ctx.beginPath(); ctx.moveTo(ax - 13 * s, ay); ctx.lineTo(ax + 12 * s, ay); ctx.moveTo(ax + 4 * s, ay - 8 * s); ctx.lineTo(ax + 12 * s, ay); ctx.lineTo(ax + 4 * s, ay + 8 * s); ctx.stroke();
    ctx.restore();
  },
};
