// 빌드 설정 - React 플러그인과 배포 경로
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mobileAppPlugin } from './mobileAppPlugin.mjs';

// Capacitor (webDir: dist) serves this build from the app's local asset root,
// so paths must stay relative rather than absolute from '/'.
export default defineConfig({
  base: './',
  plugins: [react(), mobileAppPlugin()],
  publicDir: '../android-app/public',
  build: {
    outDir: 'dist',
  },
});
