'use client';
// §6.2 scroll architecture: a tall spacer sets the scroll length, the canvas is fixed, Lenis → ScrollTrigger → p into
// one global store, scenes mount by range, copy and labels are DOM on top. G6 prototype: AMOS only.
import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { HEX } from '../shared/js/core.js';
import { initScroll } from '../lib/scroll';
import { useStore } from '../lib/store';
import { runtime } from '../lib/runtime';
import { params } from '../lib/params';
import { TIER, isPhone, startTier, PHONE_MAX_W } from '../lib/tiers';
import CameraRig from '../components/camera/CameraRig';
import Freeze from '../components/Freeze';
import Stats from '../components/Stats';
import SceneGate from '../components/scenes/SceneGate';
import SceneCopy from '../components/overlay/SceneCopy';
import SceneCounter from '../components/overlay/SceneCounter';
import DropLabels from '../components/overlay/DropLabels';
import Grain from '../components/overlay/Grain';
import Hud from '../components/overlay/Hud';
import Bench from '../components/overlay/Bench';
import { AMOS_RANGE } from '../components/scenes/amosWorld';

function gpuName(gl: THREE.WebGLRenderer) {
  const c = gl.getContext(), ext = c.getExtension('WEBGL_debug_renderer_info');
  return String(ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER));
}

export default function Experience() {
  const spacer = useRef<HTMLDivElement>(null);
  const [cfg] = useState(() => { const q = params(); return { ...q, tier: startTier(q.tier) }; });
  const tier = useStore((s) => s.tier);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PHONE_MAX_W}px)`);
    const onPhone = () => useStore.setState({ phone: mq.matches });
    useStore.setState({ phone: isPhone(), tier: cfg.tier });
    mq.addEventListener('change', onPhone);
    const s = initScroll(spacer.current!, (p) => useStore.getState().setP(p));
    runtime.scroll = s;
    requestAnimationFrame(() => s.toP(cfg.p));
    // test hooks (tools/proto.mjs): drive p, read state and the scrubbed AMOS values
    (window as any).__axiel = {
      toP: (p: number) => s.toP(p),
      state: () => {
        const st = useStore.getState();
        return { p: st.p, lastMove: st.lastMove, frozen: st.frozen, phone: st.phone, tier: st.tier, mounted: st.mounted, ready: st.ready, labels: st.labels, key: runtime.key, camMode: runtime.camMode, calls: runtime.calls, tris: runtime.tris, gpu: runtime.gpu };
      },
      debug: {
        freeze: () => ({ move: runtime.freeze.move, evals: [...runtime.freeze.evals] }),
        amos: () => runtime.amos && { ...runtime.amos.state, drops: runtime.amos.rain.n, kinds: runtime.amos.rain.counts, reflect: !!runtime.amos.film.reflector, time: runtime.amos.rain.uniforms.uTime.value },
      },
    };
    return () => { mq.removeEventListener('change', onPhone); s.destroy(); runtime.scroll = null; };
  }, [cfg]);

  return (
    <>
      <div ref={spacer} className="spacer" aria-hidden="true" />
      <Canvas
        className="stage"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
        dpr={TIER[tier].dpr}
        shadows="soft"
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
        camera={{ fov: 40, near: 0.05, far: 1500, position: [0, 0, 10] }}
        onCreated={({ gl }) => {
          gl.setClearColor(HEX.night);
          gl.info.autoReset = false;
          runtime.gpu = gpuName(gl);
        }}
      >
        <Stats />
        <Freeze />
        <CameraRig mode={cfg.cam} />
        <SceneGate />
      </Canvas>
      <Grain />
      <SceneCopy />
      <DropLabels />
      <SceneCounter />
      <div className="proto-tag" aria-hidden="true">G6 PROTOTYPE · AMOS ONLY · p {AMOS_RANGE[0].toFixed(2)}–{AMOS_RANGE[1].toFixed(2)}</div>
      {cfg.hud && <Hud />}
      {cfg.bench && <Bench />}
    </>
  );
}
