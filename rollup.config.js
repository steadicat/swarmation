import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import svelte from 'rollup-plugin-svelte';
import preprocess from 'svelte-preprocess';
import cssOnly from 'rollup-plugin-css-only';

export default {
  input: 'src/client/client.ts',
  output: {
    file: 'public/main.js',
    assetFileNames: 'main.css',
    format: 'iife',
  },
  plugins: [
    commonjs(),
    resolve(),
    typescript(),
    svelte({
      preprocess: preprocess(),
    }),
    cssOnly(),
  ],
};
