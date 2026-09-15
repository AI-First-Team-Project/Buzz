import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mobileAppPlugin } from './mobileAppPlugin.mjs';

// The Docker web image contains only the browser frontend. The Android bundle
// remains an external client and is intentionally not built into this image.
export default defineConfig({
  base: '/',
  plugins: [react(), mobileAppPlugin()],
  publicDir: '../android-app/public',
  build: {
    outDir: 'dist',
  },
});
