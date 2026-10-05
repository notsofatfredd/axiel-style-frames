'use client';
// §6.2.6 copy is DOM, faded by p. Line rows (§5.3 G5 timing table) trigger in at p0 and out at p1 over their dur, and
// reverse from wherever they are when the reader scrolls back (Triggers). Layout and type match core.js sceneCopy.
// G6 builds AMOS only, so only its line is here; the other rows join with their scenes.
import { useEffect, useRef } from 'react';
import { COPY, Triggers } from '../../lib/easings';
import { useStore } from '../../lib/store';

const ROWS = [{ id: 'amos_line', name: 'AMOS', accent: 'var(--signal-pass)' }] as const;

export default function SceneCopy() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const tr = new Triggers();
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tr.update(useStore.getState().p, dt);
      ROWS.forEach((r, i) => {
        const el = refs.current[i];
        if (!el) return;
        const a = tr.value(r.id);
        el.style.opacity = a.toFixed(3);
        el.style.visibility = a > 0.004 ? 'visible' : 'hidden';
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      {ROWS.map((r, i) => (
        <div key={r.id} className="scene-copy" data-row={r.id} ref={(el) => { refs.current[i] = el; }} style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="scene-copy__name" style={{ color: r.accent }}>{r.name}</div>
          {(COPY as Record<string, string[]>)[r.id].map((l) => <p key={l} className="scene-copy__line">{l}</p>)}
        </div>
      ))}
    </>
  );
}
