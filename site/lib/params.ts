// URL switches for testing the prototype on devices (none of these exist on the launch site).
//   ?p=0.62      start at this p (default 0.58, just before AMOS)
//   ?tier=mid    force a tier
//   ?bench=1     run the scripted fps benchmark through AMOS and show the results
//   ?hud=1       show p, key, fps, draw calls, triangles, tier
//   ?cam=smooth  G5 camera timing to compare (default linear)
export function params() {
  const q = new URLSearchParams(window.location.search);
  const num = (k: string, d: number) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : d);
  return {
    p: num('p', 0.58),
    tier: q.get('tier'),
    bench: q.get('bench') === '1',
    hud: q.get('hud') === '1' || q.get('bench') === '1',
    cam: (q.get('cam') === 'smooth' ? 'smooth' : 'linear') as 'linear' | 'smooth',
  };
}
