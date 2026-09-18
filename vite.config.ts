import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

// GITHUB_RUN_NUMBER is set automatically on every GitHub Actions run and
// increments with each run, so we use it as the semver patch number; the
// patch digit in package.json's version is otherwise unused/ignored.
const [major, minor] = pkg.version.split('.');
const buildNumber = process.env.GITHUB_RUN_NUMBER;
const displayVersion = buildNumber ? `${major}.${minor}.${buildNumber}` : pkg.version;

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  base: '/voice-mirror/',
  define: {
    __APP_VERSION__: JSON.stringify(displayVersion),
  },
});
