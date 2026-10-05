'use client';
// The experience is client-only (WebGL, scroll); the static export ships an empty shell that loads it.
import dynamic from 'next/dynamic';

const Experience = dynamic(() => import('./Experience'), { ssr: false });

export default function Home() {
  return <Experience />;
}
