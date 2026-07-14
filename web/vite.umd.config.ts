import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/tracker.ts'),
      name: 'DTSRIS',
      formats: ['umd'],
      fileName: () => 'dtsris-tracker.umd.js',
    },
    outDir: 'dist-umd',
    minify: 'terser',
    target: 'es2020',
  },
});
