// §6.2.1–3: a tall spacer sets the scroll length (1200vh desktop / 900vh phone, see globals.css),
// Lenis smooths native scroll, ScrollTrigger reads Lenis and outputs p.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export type Scroll = { lenis: Lenis; toP: (p: number, immediate?: boolean) => void; progress: () => number; destroy: () => void };

export function initScroll(spacer: HTMLElement, onP: (p: number) => void): Scroll {
  gsap.registerPlugin(ScrollTrigger);
  const lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  const st = ScrollTrigger.create({
    trigger: spacer,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (s) => onP(s.progress),
    onRefresh: (s) => onP(s.progress),
  });
  const toP = (p: number, immediate = true) =>
    lenis.scrollTo(st.start + Math.min(1, Math.max(0, p)) * (st.end - st.start), { immediate, force: true });
  return {
    lenis,
    toP,
    progress: () => st.progress,
    destroy() {
      st.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    },
  };
}
