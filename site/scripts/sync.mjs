// Copies the shared world kits (../js) and the approved raster assets (../assets) into the app before
// every dev / build. The kits stay single-source in the repo root (the style frames and the animatic use
// the same files); the app never edits its copy. shared/ and public/assets/ are gitignored.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
rmSync(here('../shared'), { recursive: true, force: true });
cpSync(here('../../js'), here('../shared/js'), { recursive: true });
mkdirSync(here('../public'), { recursive: true });
cpSync(here('../../assets'), here('../public/assets'), { recursive: true });
console.log('synced js/ and assets/ into site/');
