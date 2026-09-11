import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Docker web image contains only the browser frontend. The Android bundle
// remains an external client and is intentionally not built into this image.
export default defineConfig({
  base: '/',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist',
  },
});
