// §10.1 device tiers. G6 builds High and Mid; Low (static style-frame sequence) and reduced motion
// are Phase 10. The fps probe here only proposes a tier; ?tier=high|mid always wins.
export type Tier = 'high' | 'mid';

export const PHONE_MAX_W = 760; // PROPOSED: below this width the phone camera keys and the 900vh spacer apply

export function isPhone(): boolean {
  return window.matchMedia(`(max-width: ${PHONE_MAX_W}px)`).matches;
}

export function isMobileDevice(): boolean {
  return isPhone() || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches);
}

export function startTier(override: string | null): Tier {
  if (override === 'high' || override === 'mid') return override;
  return isMobileDevice() ? 'mid' : 'high';
}

// fps probe (§10.1): High needs ≥ 55, Mid 30–55. Below 30 is Low (not built at G6: reported only).
export function tierFromFps(fps: number): Tier | 'low' {
  return fps >= 55 ? 'high' : fps >= 30 ? 'mid' : 'low';
}

// per-tier settings (§3.2 rain counts, §10.1 Mid has no planar reflection)
export const TIER = {
  high: { drops: 8000, reflect: true, dpr: [1, 2] as [number, number], shadowMap: 2048 },
  mid: { drops: 2000, reflect: false, dpr: [1, 1.5] as [number, number], shadowMap: 1024 },
} as const;
