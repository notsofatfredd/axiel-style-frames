// §3.2 integrity mask for the AMOS rain, in façade space on the z −39 plane (the fault building and its neighbour).
//   R  integrity: 1 = working element (drops bead and roll off), 0 = fault (drops soak in and stain --signal-red)
//   G  registration order: an element starts to bead or stain once scrub('beads') reaches it (beads row 0.68–0.78,
//      "beads and stains register per element"). Order PROPOSED: window, nameplate, fascia, door, the stain, the rest.
import * as THREE from 'three';
import { FB } from '../../shared/js/kit/city.js';

export const MASK = { x0: -24, x1: 24, y0: 0, y1: 24, z: -39 };
export const ORDER = { window: 0.15, plate: 0.35, fascia: 0.5, door: 0.6, stain: 0.8, other: 0.95 };
export const STAIN = { x: -12, y: 8, r: 2.1 }; // the one fault AMOS finds: the neighbour's fascia (SF-06 decal at (−12, 8), 4.2 wide)

const W = 512, H = 256;
export const maskUV = (x: number, y: number): [number, number] => [(x - MASK.x0) / (MASK.x1 - MASK.x0), (y - MASK.y0) / (MASK.y1 - MASK.y0)];

export function integrityMask(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const sx = (v: number) => ((v - MASK.x0) / (MASK.x1 - MASK.x0)) * W;
  const sy = (v: number) => (1 - (v - MASK.y0) / (MASK.y1 - MASK.y0)) * H;
  const fill = (integ: number, order: number) => `rgb(${Math.round(integ * 255)}, ${Math.round(order * 255)}, 0)`;
  const rect = (r: { x0: number; x1: number; y0?: number; y1: number }, order: number) => {
    x.fillStyle = fill(1, order);
    x.fillRect(sx(r.x0), sy(r.y1), sx(r.x1) - sx(r.x0), sy(r.y0 ?? 0) - sy(r.y1));
  };
  x.fillStyle = fill(1, ORDER.other);
  x.fillRect(0, 0, W, H);
  rect(FB.fascia, ORDER.fascia);
  rect(FB.win, ORDER.window);
  rect(FB.plate, ORDER.plate);
  rect(FB.door, ORDER.door);
  x.fillStyle = fill(0, ORDER.stain);
  x.beginPath();
  x.arc(sx(STAIN.x), sy(STAIN.y), (STAIN.r / (MASK.x1 - MASK.x0)) * W, 0, Math.PI * 2);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}
