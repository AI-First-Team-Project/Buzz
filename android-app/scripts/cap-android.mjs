#!/usr/bin/env node
/**
 * BUZZ — Capacitor Android 프로젝트 생성 & 동기화 스크립트
 *
 *  사용법
 *    node scripts/cap-android.mjs            # 웹빌드 → cap add/sync → 네이티브 패치
 *    node scripts/cap-android.mjs --apk      # 위 작업 후 gradle로 APK까지 빌드
 *    node scripts/cap-android.mjs --open     # Android Studio로 android/ 폴더 열기
 *
 *  최초 1회 실행하면 android/ 폴더가 생성되고, 이후에는 sync만 수행합니다.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const androidDir = path.join(root, 'android');
const appDir = path.join(androidDir, 'app');

const log = (msg = '', color = '\x1b[36m') => console.log(`${color}${msg}\x1b[0m`);
const run = (cmd, cwd = root) => {
  log(`\n$ ${cmd}`, '\x1b[90m');
  execSync(cmd, { stdio: 'inherit', cwd });
};

/* ── 1. 웹 빌드 ───────────────────────────────────────── */
log('\n[1/4] 웹 앱 빌드 (npm run build)');
run('npm run build');

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('\ndist/index.html 이 없습니다. 빌드를 확인하세요.');
  process.exit(1);
}

/* ── 2. Android 프로젝트 생성 또는 동기화 ───────────────── */
if (!fs.existsSync(appDir)) {
  // 비어 있거나 불완전한 android/ 폴더가 있으면 cap add 가 실패하므로 정리
  if (fs.existsSync(androidDir)) {
    fs.rmSync(androidDir, { recursive: true, force: true });
    log('\n기존 android/ 폴더 정리 완료', '\x1b[33m');
  }
  log('\n[2/4] Capacitor Android 프로젝트 최초 생성 (npx cap add android)');
  run('npx cap add android');
} else {
  log('\n[2/4] 기존 프로젝트 동기화 (npx cap sync android)');
  run('npx cap sync android');
}

/* ── 3. 네이티브 설정 패치 ──────────────────────────────── */
log('\n[3/4] 네이티브 설정 적용 (세로 고정 · 다크 테마)');

const resDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'values');
fs.mkdirSync(resDir, { recursive: true });

/* colors.xml */
fs.writeFileSync(
  path.join(resDir, 'colors.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="buzz_background">#0A0E1A</color>
    <color name="buzz_primary">#F7B500</color>
</resources>
`
);

/* styles.xml — Capacitor가 생성한 스타일 이름(AppTheme*)은 그대로 유지 */
const stylesPath = path.join(resDir, 'styles.xml');
if (fs.existsSync(stylesPath)) {
  let s = fs.readFileSync(stylesPath, 'utf8');
  s = s.replace(/<item name="windowBackground">[^<]*<\/item>/,
                '<item name="windowBackground">@color/buzz_background</item>');
  if (!s.includes('android:statusBarColor')) {
    s = s.replace(
      /(<style name="AppTheme\.NoActionBar"[^>]*>)/,
      `$1
        <item name="android:statusBarColor">@color/buzz_background</item>
        <item name="android:navigationBarColor">@color/buzz_background</item>
        <item name="android:windowLightStatusBar">false</item>`
    );
  }
  fs.writeFileSync(stylesPath, s);
  log('  · styles.xml → 다크 배경/상태바 적용');
} else {
  log('  ! styles.xml 을 찾지 못했습니다 (Capacitor 버전 확인 필요)', '\x1b[33m');
}

/* AndroidManifest.xml — 세로 고정 */
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let m = fs.readFileSync(manifestPath, 'utf8');
  if (!m.includes('android:screenOrientation')) {
    m = m.replace(/<activity([^>]*?)>/, '<activity$1 android:screenOrientation="portrait">');
    fs.writeFileSync(manifestPath, m);
    log('  · AndroidManifest.xml → 세로 화면 고정');
  } else {
    log('  · AndroidManifest.xml → 이미 세로 고정됨');
  }
}

log('\n[4/4] 동기화 완료 (npx cap sync android)');
run('npx cap sync android');

/* ── 4. APK 빌드 / Android Studio 열기 (선택) ───────────── */
const gradlew = process.platform === 'win32'
  ? path.join(androidDir, 'gradlew.bat')
  : path.join(androidDir, 'gradlew');

if (args.has('--apk')) {
  if (!fs.existsSync(gradlew)) {
    console.error('\ngradlew 를 찾을 수 없습니다. Android Studio에서 한 번 열어 Gradle Sync를 실행하세요.');
    process.exit(1);
  }
  log('\nAPK 빌드 중... (gradlew assembleDebug)');
  execSync(`"${gradlew}" assembleDebug`, { stdio: 'inherit', cwd: androidDir });
  const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  log('\n=========================================', '\x1b[32m');
  log('  APK 생성 완료!');
  log(`  ${apk}`);
  log('==========================================', '\x1b[32m');
  log('\n메일로 보낼 때는 반드시 ZIP으로 압축하세요 (네이버 메일은 .apk 차단).');
} else if (args.has('--open')) {
  run('npx cap open android');
} else {
  log('\n──────────────────────────────────────────', '\x1b[32m');
  log(' 다음 단계');
  log('──────────────────────────────────────────');
  log('  A) Android Studio 로 빌드 (권장)');
  log('     node scripts/cap-android.mjs --open');
  log('     → Build > Build App Bundle(s) / APK(s) > Build APK(s)');
  log('');
  log('  B) 명령줄로 바로 APK 빌드');
  log('     node scripts/cap-android.mjs --apk');
  log('     → android/app/build/outputs/apk/debug/app-debug.apk');
  log('');
  log('  ※ 메일 전송 시 .apk 를 ZIP으로 압축해 첨부하세요.');
}
