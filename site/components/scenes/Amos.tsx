'use client';
// §3.2 AMOS scene: builds the world once on mount (async: fonts, the symbol image), hands its fog, environment and
// clear colour to the shared R3F scene, and drives it from the global p every frame. Labels attach on the freeze edge.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildAmos, type AmosWorld } from './amosWorld';
import { useStore, toggleIn } from '../../lib/store';
import { runtime } from '../../lib/runtime';

export default function Amos() {
  const { gl, scene, camera, size, viewport } = useThree();
  const tier = useStore((s) => s.tier);
  const world = useRef<AmosWorld | null>(null);
  const wasFrozen = useRef(false);
  const labelSize = useRef('');

  useEffect(() => {
    let dead = false;
    const prev = { fog: scene.fog, env: scene.environment, clear: gl.getClearColor(new THREE.Color()).getHex() };
    const px = { w: Math.round(size.width * viewport.dpr), h: Math.round(size.height * viewport.dpr) };
    buildAmos({ renderer: gl, tier, size: px }).then((w) => {
      if (dead) { w.dispose(); return; }
      world.current = w;
      runtime.amos = w;
      scene.add(w.root);
      scene.fog = w.fog;
      scene.environment = w.env;
      gl.setClearColor(w.clear);
      gl.shadowMap.needsUpdate = true;
      useStore.setState((s) => ({ ready: toggleIn(s.ready, 'amos', true) }));
    }).catch((e) => console.error('AMOS build failed', e));
    return () => {
      dead = true;
      const w = world.current;
      world.current = null;
      runtime.amos = null;
      if (w) { scene.remove(w.root); w.dispose(); }
      scene.fog = prev.fog;
      scene.environment = prev.env;
      gl.setClearColor(prev.clear);
      useStore.setState((s) => ({ ready: toggleIn(s.ready, 'amos', false), labels: [], frozen: false }));
    };
    // the world is rebuilt only when the tier changes; size changes go through setSize below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  useEffect(() => {
    world.current?.setSize(Math.round(size.width * viewport.dpr), Math.round(size.height * viewport.dpr));
  }, [size.width, size.height, viewport.dpr]);

  useFrame((_, dt) => {
    const w = world.current;
    if (!w) return;
    const { p, frozen, phone } = useStore.getState();
    w.update(p, Math.min(dt, 0.1), frozen, camera);
    const sz = `${size.width}x${size.height}`;
    if (frozen && (!wasFrozen.current || labelSize.current !== sz)) {
      const labels = w.pickLabels(camera as THREE.PerspectiveCamera, size.width, size.height, phone);
      w.rain.setHi(labels.map((l) => l.drop));
      useStore.setState({ labels });
      labelSize.current = sz;
    } else if (!frozen && wasFrozen.current) {
      w.rain.setHi([]);
      useStore.setState({ labels: [] });
      labelSize.current = '';
    }
    wasFrozen.current = frozen;
  });

  return null;
}
