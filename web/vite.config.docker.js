import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The mobile browser bundle is built from ../android-app in the Dockerfile.
// Keep this Vite build focused on the desktop bundle.
export default defineConfig({
  base: '/',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist',
  },
});
