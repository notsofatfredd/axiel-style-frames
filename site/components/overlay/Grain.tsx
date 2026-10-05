'use client';
// The 2% paper-fibre grain: the same fibre canvas and the same overlay blend the style frames apply after tone mapping
// (js/app.js GrainShader: mix(c, overlay(c, fibre), 0.02), tile 1024 px at the 1440 frame = 576 CSS px). As a DOM layer
// it composites identically and costs no render pass (PROPOSED in place of a postprocessing grain pass, proposals.md).
import { useEffect, useState } from 'react';
import { fibreCanvas } from '../../shared/js/core.js';

export default function Grain() {
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(fibreCanvas(1024, 20261002, 26000).toDataURL('image/png')); }, []);
  return url ? <div className="grain" aria-hidden="true" style={{ backgroundImage: `url(${url})` }} /> : null;
}
