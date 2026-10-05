/*
 * §5.1 easing library as named constants (the only curves allowed). Each is a function u(0..1) -> 0..1.
 * PROPOSED: lives in js/kit/ for now so the Cartographer and the dart can share it; it belongs in core.js once
 * that file is free to edit.
 */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dsx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-7) return sy(t);
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}
export const EASE_CAMERA = cubicBezier(0.65, 0, 0.35, 1);
export const EASE_ARRIVE = cubicBezier(0.16, 1, 0.3, 1);
export const EASE_DEPART = cubicBezier(0.7, 0, 0.84, 0);
export const EASE_LINEAR = (x) => Math.min(1, Math.max(0, x));
export const EASE_STAMP = cubicBezier(0.34, 1.56, 0.64, 1);
export const EASE = { CAMERA: EASE_CAMERA, ARRIVE: EASE_ARRIVE, DEPART: EASE_DEPART, LINEAR: EASE_LINEAR, STAMP: EASE_STAMP };
