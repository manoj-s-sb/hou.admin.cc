/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Migrated from Create React App. Keeps the `REACT_APP_` env prefix (so the existing
// .env files work unchanged) and the `build/` output dir. Env is loaded by mode:
// `vite --mode uat` reads .env.uat, etc.
export default defineConfig({
  plugins: [
    react(),
    // Provides the Node globals (Buffer/process/global) that @react-pdf/renderer and
    // xlsx expect — CRA polyfilled these automatically, Vite does not. Pre-empts the
    // "Buffer/global is not defined" runtime errors on PDF/Excel export.
    nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
  ],
  envPrefix: ['REACT_APP_', 'VITE_'],
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
});
