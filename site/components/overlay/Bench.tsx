'use client';
// ?bench=1 scripted run through AMOS for the §6.3 fps targets (60 on a 2021+ laptop, ≥ 45 on a mid Android / iPhone 12+).
// The same path a reader takes, at the G5 animatic pace (40 s per unit of p desktop, 30 phone): the K14 → K16 descent
// with the rain starting, a 3 s hold at K16 (freeze, labels), the rain stopping, then the whole way back up.
// Pass rule PROPOSED: mean ≥ 97% of the target and the 1% low ≥ 75% of it. Results: panel, Copy button, window.__bench.
import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { runtime } from '../../lib/runtime';
import { isMobileDevice } from '../../lib/tiers';

type Phase = { name: string; from: number; to: number; hold?: number };
type Row = { name: string; frames: number; seconds: number; meanFps: number; low1Fps: number; worstMs: number; maxCalls: number; maxTris: number };

const stats = (name: string, dts: number[], calls: number, tris: number): Row => {
  const s = [...dts].sort((a, b) => a - b), sum = dts.reduce((a, b) => a + b, 0);
  const p99 = s[Math.min(s.length - 1, Math.floor(s.length * 0.99))] ?? 0;
  return { name, frames: dts.length, seconds: +(sum / 1000).toFixed(2), meanFps: +(dts.length / (sum / 1000) || 0).toFixed(1), low1Fps: +(1000 / (p99 || 1)).toFixed(1), worstMs: +(s[s.length - 1] ?? 0).toFixed(1), maxCalls: calls, maxTris: tris };
};

export default function Bench() {
  const [res, setRes] = useState<any>(null);
  const [status, setStatus] = useState('waiting for AMOS');

  useEffect(() => {
    let raf = 0, dead = false;
    const phone = useStore.getState().phone, sPerP = phone ? 30 : 40, mobile = isMobileDevice(), target = mobile ? 45 : 60;
    const phases: Phase[] = [
      { name: 'descend 0.58 → 0.79 (K14 → K16, rain starts)', from: 0.58, to: 0.79 },
      { name: 'hold 0.79 3 s (freeze, labels)', from: 0.79, to: 0.79, hold: 3 },
      { name: 'rain stops 0.79 → 0.82', from: 0.79, to: 0.82 },
      { name: 'reverse 0.82 → 0.58', from: 0.82, to: 0.58 },
    ];
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      runtime.scroll?.toP(0.58);
      while (!dead && !useStore.getState().ready.includes('amos')) await wait(100);
      setStatus('warming up');
      await wait(1500);
      if (dead) return;
      setStatus('running');
      const rows: Row[] = [], all: number[] = [];
      let i = 0, t0 = -1, last = -1, dts: number[] = [], calls = 0, tris = 0;
      const loop = (now: number) => {
        if (dead) return;
        const ph = phases[i], dur = ph.hold ?? Math.abs(ph.to - ph.from) * sPerP;
        if (t0 < 0) { t0 = now; last = now; }
        else { const dt = now - last; dts.push(dt); all.push(dt); last = now; calls = Math.max(calls, runtime.calls); tris = Math.max(tris, runtime.tris); }
        const f = Math.min(1, (now - t0) / 1000 / dur);
        if (!ph.hold) runtime.scroll?.toP(ph.from + (ph.to - ph.from) * f);
        if (f >= 1) {
          rows.push(stats(ph.name, dts, calls, tris));
          i++; t0 = -1; dts = []; calls = 0; tris = 0;
          if (i >= phases.length) {
            const total = stats('all', all, Math.max(...rows.map((r) => r.maxCalls)), Math.max(...rows.map((r) => r.maxTris)));
            const gl = document.querySelector('canvas');
            const out = {
              when: new Date().toISOString(), ua: navigator.userAgent, gpu: runtime.gpu, tier: useStore.getState().tier, phone, mobile,
              viewport: `${innerWidth}x${innerHeight}`, dpr: devicePixelRatio, canvas: gl ? `${gl.width}x${gl.height}` : '', camMode: runtime.camMode,
              drops: runtime.amos?.rain.n, reflect: !!runtime.amos?.film.reflector, target, rule: 'mean ≥ 0.97 × target and 1% low ≥ 0.75 × target (PROPOSED)',
              pass: total.meanFps >= 0.97 * target && total.low1Fps >= 0.75 * target, total, phases: rows,
            };
            (window as any).__bench = out;
            setRes(out);
            setStatus('done');
            return;
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => { dead = true; cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="bench" role="region" aria-label="Benchmark">
      <div className="bench__head">BENCH · {status}</div>
      {res && (
        <>
          <div className={res.pass ? 'bench__pass' : 'bench__fail'}>{res.pass ? 'PASS' : 'BELOW TARGET'} · {res.total.meanFps} fps mean · {res.total.low1Fps} 1% low · target {res.target}</div>
          <table>
            <thead><tr><th>phase</th><th>fps</th><th>1% low</th><th>worst ms</th><th>calls</th><th>tris</th></tr></thead>
            <tbody>
              {res.phases.map((r: Row) => <tr key={r.name}><td>{r.name}</td><td>{r.meanFps}</td><td>{r.low1Fps}</td><td>{r.worstMs}</td><td>{r.maxCalls}</td><td>{Math.round(r.maxTris / 1000)}k</td></tr>)}
            </tbody>
          </table>
          <div className="bench__meta">{res.gpu || 'GPU unknown'} · {res.tier} · {res.canvas} @ {res.dpr}x</div>
          <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(res, null, 2))}>Copy results</button>
        </>
      )}
    </div>
  );
}
