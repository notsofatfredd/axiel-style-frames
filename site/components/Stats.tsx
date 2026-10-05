'use client';
// Draw calls and triangles for the whole frame. info.autoReset is off (Experience) because the Reflector renders the
// scene inside the main render and an auto reset would drop everything drawn before it; this reads the finished
// frame first thing in the next one, then resets.
import { useFrame } from '@react-three/fiber';
import { runtime } from '../lib/runtime';

export default function Stats() {
  useFrame(({ gl }, dt) => {
    runtime.calls = gl.info.render.calls;
    runtime.tris = gl.info.render.triangles;
    runtime.frameMs = dt * 1000;
    gl.info.reset();
  }, -100);
  return null;
}
