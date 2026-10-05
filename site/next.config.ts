import type { NextConfig } from 'next';

// §6.1: Next.js App Router, static export. NEXT_BASE_PATH is set by CI when the export is served
// under the Pages project path (/axiel-style-frames/proto); empty for local dev.
const base = process.env.NEXT_BASE_PATH ?? '';

const config: NextConfig = {
  output: 'export',
  basePath: base || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE: base },
  // GLSL files (Appendix A /shaders) load as strings
  turbopack: { rules: { '*.glsl': { loaders: ['raw-loader'], as: '*.js' } } },
  webpack: (c) => {
    c.module.rules.push({ test: /\.glsl$/, type: 'asset/source' });
    return c;
  },
};

export default config;
