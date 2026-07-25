/**
 * Build the UMD bundle (for CDN / <script> tag usage).
 * Output: dist-umd/dtsris-tracker.umd.js
 *
 * Usage: node build-umd.mjs
 */
import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

await esbuild.build({
  entryPoints: ['src/tracker-standalone.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'DTSRIS',
  outfile: 'dist-umd/dtsris-tracker.umd.js',
  minify: true,
  target: 'es2020',
  platform: 'browser',
  banner: {
    js: `/* DTS RIS Web SDK v${pkg.version} — zero-PII analytics | ${new Date().toISOString().split('T')[0]} */`,
  },
});

const size = readFileSync('dist-umd/dtsris-tracker.umd.js').length;
console.log(`✅ UMD bundle built: ${(size / 1024).toFixed(1)} KB (${size} bytes)`);
