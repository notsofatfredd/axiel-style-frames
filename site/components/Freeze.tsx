'use client';
// §5.2 idle-reactive: 400 ms without scroll. In AMOS (labels row, 0.68–0.80, window PROPOSED) the rain freezes and the
// labels attach; scrolling again releases it.
import { useFrame } from '@react-three/fiber';
import { beat } from '../lib/easings';
import { useStore } from '../lib/store';

export const IDLE_MS = 400;

export default function Freeze() {
  useFrame(() => {
    const s = useStore.getState(), b = beat('labels');
    const f = performance.now() - s.lastMove >= IDLE_MS && s.p >= b.p0 && s.p <= b.p1 && s.ready.includes('amos');
    if (f !== s.frozen) useStore.setState({ frozen: f });
  }, -2);
  return null;
}
