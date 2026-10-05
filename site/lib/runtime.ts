// Per-frame values that change every frame and must not re-render React: read by the HUD, the bench and the tests.
import type { AmosWorld } from '../components/scenes/amosWorld';
import type { Scroll } from './scroll';

export const runtime = {
  key: '',                 // last camera key passed
  camMode: 'linear',       // G5 camera timing (?cam=linear|smooth)
  calls: 0,                // draw calls in the last frame (main + reflection pass)
  tris: 0,
  frameMs: 0,
  amos: null as AmosWorld | null,
  scroll: null as Scroll | null,
  gpu: '',
};
