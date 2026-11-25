// Bundle the demo site into site-dist/ (what Netlify publishes).
//   node scripts/build-site.mjs           → production build
//   node scripts/build-site.mjs --serve   → local dev server on http://localhost:8000
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site-dist');
const serve = process.argv.includes('--serve');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'style.css', 'favicon.svg', 'og.jpg']) {
  cpSync(join(root, 'site', file), join(out, file));
}

const options = {
  entryPoints: [join(root, 'site', 'main.ts')],
  bundle: true,
  minify: !serve,
  sourcemap: serve,
  format: 'iife',
  target: 'es2020',
  outfile: join(out, 'app.js'),
  logLevel: 'info',
};

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: out, port: 8000 });
  console.log(`Serving http://localhost:${port}`);
} else {
  await esbuild.build(options);
}
