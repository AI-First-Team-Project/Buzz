// 웹 빌드 - JavaScript React 앱과 모바일 앱 번들을 연결
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mobileAppPlugin } from './mobileAppPlugin.mjs';

export default defineConfig({
  base: './',
  plugins: [react(), mobileAppPlugin()],
  publicDir: '../android-app/public',
  build: { outDir: 'dist' },
});
