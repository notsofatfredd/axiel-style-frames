'use client';
// ?hud=1 test readout: p, key, scene, timing mode, tier, fps, draw calls, triangles, freeze. Not part of the site.
import { useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { runtime } from '../../lib/runtime';
import { sceneAt } from '../camera/keyframes';

export default function Hud() {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    let raf = 0, last = performance.now(), fps = 60, acc = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      fps += (1000 / Math.max(dt, 1) - fps) * 0.08;
      acc += dt;
      if (acc > 120 && ref.current) {
        acc = 0;
        const s = useStore.getState(), a = runtime.amos?.state;
        ref.current.textContent = [
          `p      ${s.p.toFixed(4)}   ${runtime.key} · ${sceneAt(s.p).name}`,
          `camera ${runtime.camMode}   tier ${s.tier}${s.phone ? ' · phone' : ''}`,
          `fps    ${fps.toFixed(1)}   ${runtime.frameMs.toFixed(1)} ms`,
          `calls  ${runtime.calls}   tris ${(runtime.tris / 1000).toFixed(0)}k`,
          `rain   ${a ? a.intensity.toFixed(2) : '-'}  film ${a ? a.spread.toFixed(2) : '-'}  reg ${a ? a.reg.toFixed(2) : '-'}`,
          `frozen ${s.frozen ? 'yes' : 'no'}   labels ${s.labels.length}   mounted ${s.mounted.join(',') || '-'}`,
        ].join('\n');
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <pre className="hud" ref={ref} aria-hidden="true" />;
}
