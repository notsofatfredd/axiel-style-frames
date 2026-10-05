// §6.2.4: one global store holds p. Every scene reads p from here; no scene has its own scroll listener.
import { create } from 'zustand';
import type { Tier } from './tiers';

export type Label = { text: string; x: number; y: number; ax: number; ay: number; side: 'l' | 'r'; drop: number };

type State = {
  p: number;              // scroll progress 0..1 (ScrollTrigger over the spacer, smoothed by Lenis)
  lastMove: number;       // performance.now() when p last changed
  frozen: boolean;        // idle-reactive freeze (§5.2): AMOS rain stops, labels attach
  phone: boolean;
  tier: Tier;
  mounted: string[];      // scenes currently mounted (§6.2.5)
  ready: string[];        // scenes built and on screen
  labels: Label[];        // drop labels attached on freeze (DOM, §10.2)
  setP: (p: number) => void;
};

export const useStore = create<State>()((set, get) => ({
  p: 0,
  lastMove: 0,
  frozen: false,
  phone: false,
  tier: 'high',
  mounted: [],
  ready: [],
  labels: [],
  setP: (p) => {
    if (Math.abs(p - get().p) > 1e-6) set({ p, lastMove: performance.now() });
  },
}));

export const toggleIn = (list: string[], id: string, on: boolean) =>
  on ? (list.includes(id) ? list : [...list, id]) : list.filter((x) => x !== id);
