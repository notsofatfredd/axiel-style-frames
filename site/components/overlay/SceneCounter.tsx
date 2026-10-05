'use client';
// §6.2.8 the scroll cue: a mono scene counter, "06 / 08 · AMOS" (no scroll arrow). Re-renders only when the scene changes.
import { sceneAt } from '../camera/keyframes';
import { useStore } from '../../lib/store';

export default function SceneCounter() {
  const label = useStore((s) => { const { n, name } = sceneAt(s.p); return `${String(n).padStart(2, '0')} / 08 · ${name}`; });
  return <div className="scene-counter" aria-hidden="true">{label}</div>;
}
