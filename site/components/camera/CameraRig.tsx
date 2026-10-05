'use client';
// §4.1 the one camera: every frame it is placed on the §4.3 path at the global p (no scene moves the camera).
import { useFrame } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { applyCamera, CAMERA_MODES } from './keyframes';
import { useStore } from '../../lib/store';
import { runtime } from '../../lib/runtime';

type Mode = keyof typeof CAMERA_MODES;

export default function CameraRig({ mode }: { mode: Mode }) {
  useFrame(({ camera }) => {
    const { p, phone } = useStore.getState();
    const s = applyCamera(camera as PerspectiveCamera, CAMERA_MODES[mode](p, phone), phone);
    runtime.key = String(s.key);
    runtime.camMode = mode;
  }, -1);
  return null;
}
