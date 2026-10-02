/*
 * Shared frame helpers (G2 style frames only; not part of the world kit).
 */
import { THREE, HEX, setFont } from '../core.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* Bake a posed rig: one merged mesh per material in world space (the pose is frozen for a still).
   Lights inside the rig keep their world position. Cuts the Cartographer from ~45 calls to ~7. */
export function bakeRig(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), lights = [];
  root.traverse(o => {
    if (o.isLight) { lights.push(o); return; }
    if (!o.isMesh || !o.visible) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const e = byMat.get(o.material) ?? { geos: [], cast: o.castShadow, order: o.renderOrder };
    e.geos.push(g.index ? g.toNonIndexed() : g);
    byMat.set(o.material, e);
  });
  const out = new THREE.Group(); out.name = root.name + '-baked';
  for (const [mat, e] of byMat) {
    const m = new THREE.Mesh(mergeGeometries(e.geos), mat);
    m.castShadow = e.cast; m.receiveShadow = true; m.renderOrder = e.order;
    out.add(m);
  }
  for (const L of lights) {
    const p = L.getWorldPosition(new THREE.Vector3());
    L.removeFromParent(); L.position.copy(p); out.add(L);
  }
  return out;
}

/* §2.3 physical units: an ambient / hemisphere at π·k lifts albedo by k; a directional at π·k gives albedo·k·n·l */
export const PI = Math.PI;

/* mono label with a thin leader (AMOS freeze labels). pt / at are canvas px. */
export function leaderLabel(ctx, vp, text, at, pt, color = HEX.pass) {
  const { u } = vp;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.2 * u; ctx.globalAlpha = 0.92;
  ctx.beginPath(); ctx.moveTo(at.x, at.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(at.x, at.y, 2.6 * u, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'rgba(11,11,12,0.7)'; ctx.shadowBlur = 8 * u;
  setFont(ctx, 500, 25 * u, 'mono', 0.06);              // 25px mono → cap ≈ 18px CSS (JetBrains Mono cap ≈ 0.73 em)
  ctx.textBaseline = 'middle';
  ctx.textAlign = pt.x >= at.x ? 'left' : 'right';
  ctx.fillText(text, pt.x + (pt.x >= at.x ? 6 : -6) * u, pt.y);
  ctx.restore();
}
