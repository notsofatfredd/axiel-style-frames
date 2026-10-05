'use client';
// §6.2.5 scenes mount only inside their range ±0.05. G6 builds AMOS only.
import { useEffect } from 'react';
import { useStore, toggleIn } from '../../lib/store';
import { AMOS_RANGE } from './amosWorld';
import Amos from './Amos';

export default function SceneGate() {
  const amos = useStore((s) => s.p >= AMOS_RANGE[0] && s.p <= AMOS_RANGE[1]);
  useEffect(() => {
    useStore.setState((s) => ({ mounted: toggleIn(s.mounted, 'amos', amos) }));
  }, [amos]);
  return amos ? <Amos /> : null;
}
