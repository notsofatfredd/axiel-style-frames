import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AXIEL · G6 prototype (AMOS)',
  description: 'Technical prototype of the AMOS scene of the AXIEL homepage. Not the production site.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#0E1520', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* the canvas textures name the families directly ('Montserrat', 'JetBrains Mono'), so the fonts load by name, not through next/font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
