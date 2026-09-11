import type { CapacitorConfig } from '@capacitor/cli';

/**
 * BUZZ — Capacitor 설정
 *
 * 빌드 결과(dist)는 vite-plugin-singlefile 에 의해 JS/CSS가 index.html 안에
 * 인라인되고, images/ 폴더만 별도 파일로 남습니다.
 * webDir 를 dist 로 지정하면 복사 과정 없이 그대로 앱에 포함됩니다.
 */
const config: CapacitorConfig = {
  appId: 'com.buzz.detector',
  appName: 'BUZZ',
  webDir: 'dist',

  android: {
    // 웹뷰 안전영역/배경색. 상태바까지 딥 네이비로 채움
    backgroundColor: '#0A0E1A',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true, // 배포 시 false 로 바꾸세요
  },

  plugins: {
    StatusBar: {
      style: 'DARK',          // 밝은 아이콘 (배경이 어두움)
      backgroundColor: '#0A0E1A',
      overlaysWebView: false,
    },
  },

  // 실기기에서 개발 서버 연결이 필요할 때 주석 해제
  // server: { url: 'http://192.168.0.10:5173', cleartext: true },
};

export default config;
