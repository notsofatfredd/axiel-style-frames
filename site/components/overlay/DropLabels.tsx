'use client';
// §5.3 D4 freeze labels: each hangs on one frozen drop, --signal-pass mono, typed in at 40 ms per char (§5.3).
// When scrolling resumes they type back out at 15 ms per char (PROPOSED) and the leaders go with them.
// The typed text is decoration (aria-hidden); the full readings are one sentence for assistive tech.
import { useEffect, useRef, useState } from 'react';
import { useStore, type Label } from '../../lib/store';

export const TYPE_MS = 40, UNTYPE_MS = 15;

export default function DropLabels() {
  const labels = useStore((s) => s.labels);
  const [items, setItems] = useState<Label[]>([]);
  const phase = useRef<{ mode: 'in' | 'out'; t0: number; from: number[] }>({ mode: 'in', t0: 0, from: [] });
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lineRefs = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    if (labels.length) {
      phase.current = { mode: 'in', t0: performance.now(), from: [] };
      setItems(labels);
    } else if (items.length) {
      const now = performance.now(), typed = items.map((l) => Math.min(l.text.length, Math.floor((now - phase.current.t0) / TYPE_MS)));
      phase.current = { mode: 'out', t0: now, from: phase.current.mode === 'in' ? typed : phase.current.from };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels]);

  useEffect(() => {
    if (!items.length) return;
    let raf = 0;
    const loop = (now: number) => {
      const ph = phase.current, el = now - ph.t0;
      let any = false;
      items.forEach((l, i) => {
        const n = ph.mode === 'in' ? Math.min(l.text.length, Math.floor(el / TYPE_MS)) : Math.max(0, (ph.from[i] ?? 0) - Math.floor(el / UNTYPE_MS));
        const t = textRefs.current[i], g = lineRefs.current[i];
        if (t) t.textContent = l.text.slice(0, n);
        if (g) g.style.opacity = ph.mode === 'in' || n > 0 ? '0.92' : '0';
        if (ph.mode === 'in' || n > 0) any = true;
      });
      if (!any) { setItems([]); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [items]);

  if (!items.length) return null;
  return (
    <div className="drop-labels" role="note" aria-label={`AMOS readings: ${items.map((l) => l.text).join(', ')}`}>
      <svg className="drop-labels__lines" aria-hidden="true">
        {items.map((l, i) => (
          <g key={l.text} ref={(el) => { lineRefs.current[i] = el; }}>
            <line x1={l.ax} y1={l.ay} x2={l.x} y2={l.y} />
            <circle cx={l.ax} cy={l.ay} r={2.6} />
          </g>
        ))}
      </svg>
      {items.map((l, i) => (
        <span key={l.text} aria-hidden="true" data-label={l.text} className={`drop-label drop-label--${l.side}`}
          style={{ left: l.x + (l.side === 'r' ? 6 : -6), top: l.y }} ref={(el) => { textRefs.current[i] = el; }} />
      ))}
    </div>
  );
}
