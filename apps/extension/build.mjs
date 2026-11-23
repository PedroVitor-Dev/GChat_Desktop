import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const outdir = new URL('./dist/', import.meta.url);
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: {
    'notification-hook': 'src/main-world/notification-hook.ts',
    'content-bridge': 'src/content/bridge.ts',
    background: 'src/background/index.ts',
  },
  outdir: fileURLToPath(outdir),
  bundle: true,
  format: 'iife',
  target: 'chrome111',
  minify: process.argv.includes('--minify'),
  legalComments: 'none',
});

// Versão da extensão acompanha o package.json.
const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
manifest.version = pkg.version;
await writeFile(new URL('manifest.json', outdir), JSON.stringify(manifest, null, 2) + '\n');

console.log(`extensão gerada em apps/extension/dist (v${pkg.version})`);
