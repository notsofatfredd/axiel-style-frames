'use client';
// §5.2 idle-reactive: 400 ms without scroll. In AMOS (labels row, 0.68–0.80, window PROPOSED) the rain freezes and the
// labels attach; scrolling again releases it.
import { useFrame } from '@react-three/fiber';
import { beat } from '../lib/easings';
import { runtime } from '../lib/runtime';
import { useStore } from '../lib/store';

export const IDLE_MS = 400;

export default function Freeze() {
  useFrame(() => {
    const s = useStore.getState(), b = beat('labels');
    const idle = performance.now() - s.lastMove;
    const inWindow = s.p >= b.p0 && s.p <= b.p1 && s.ready.includes('amos');
    const f = idle >= IDLE_MS && inWindow;
    // every decision since the last scroll, for tools/proto.mjs: frame-rate independent proof of the 400 ms rule
    const log = runtime.freeze;
    if (log.move !== s.lastMove) { log.move = s.lastMove; log.evals = []; }
    if (log.evals.length < 64) log.evals.push({ idle, inWindow, frozen: f });
    if (f !== s.frozen) useStore.setState({ frozen: f });
  }, -2);
  return null;
}
