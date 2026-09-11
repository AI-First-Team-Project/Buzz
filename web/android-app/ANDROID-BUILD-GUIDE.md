# BUZZ — Capacitor Android 빌드 & 네이버 메일 배포 가이드

Capacitor로 Android 프로젝트를 만들고 `.apk`를 빌드해 네이버 메일로 배포하는 전체 과정입니다.

```
node scripts/cap-android.mjs
        │
        ├─ ① npm run build            → dist/ 생성
        ├─ ② npx cap add android      → Capacitor 네이티브 프로젝트 생성 (최초 1회)
        ├─ ③ 네이티브 패치             → 세로 고정 · 다크 테마(#0A0E1A)
        └─ ④ npx cap sync android     → dist → android/app/src/main/assets/public 복사
        │
        ▼
Android Studio Build APK  →  app-debug.apk  →  ZIP 압축  →  네이버 메일  →  폰 설치
```

---

## 0. 설치된 것 (이미 완료)

```
@capacitor/core      Capacitor 코어
@capacitor/cli       CLI (cap 명령)
@capacitor/android   Android 플랫폼
@capacitor/status-bar 상태바 색상 제어

capacitor.config.ts  appId: com.buzz.detector / appName: BUZZ / webDir: dist
```

`webDir`가 `dist`라서 **복사 스크립트가 필요 없습니다.** 빌드 결과가 그대로 앱에 들어갑니다.
(vite-plugin-singlefile 덕분에 JS/CSS는 index.html 안에 인라인되고 `images/` 폴더만 별도 파일입니다.)

---

## 1. 준비물

| 항목 | 버전 | 비고 |
|------|------|------|
| Android Studio | Hedgehog 이상 | **SDK Platform 34 또는 35** 설치 필수 |
| Node.js | 20 이상 | |
| JDK | 17 | Android Studio 내장 JBR 사용 가능 |
| 테스트 폰 | Android 7.0(API 24) 이상 | |

> Capacitor가 요구하는 compileSdk 버전은 `npx cap doctor` 로 확인할 수 있습니다.
> "SDK not found" 오류가 나면 Android Studio → **SDK Manager**에서 해당 버전을 설치하세요.

---

## 2. Android 프로젝트 생성 (최초 1회)

프로젝트 루트에서:

```bash
node scripts/cap-android.mjs
```

이 한 줄이 다음을 모두 처리합니다.

- `npm run build`
- `npx cap add android` → `android/` 폴더 생성
- 세로 화면 고정, 다크 테마(#0A0E1A) 패치
- `npx cap sync android`

이미 `android/`가 있으면 자동으로 `sync`만 실행합니다.

---

## 3. Android Studio에서 APK 빌드

```bash
node scripts/cap-android.mjs --open
```

Android Studio가 `android/` 폴더를 열면 **Gradle Sync가 끝날 때까지 대기**합니다.
(처음에는 의존성 다운로드로 수 분 걸립니다)

그 다음:

```
Build ▸ Build App Bundle(s) / APK(s) ▸ Build APK(s)
```

완료 후 우측 하단 **locate** 클릭:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. (선택) 명령줄로 바로 APK 빌드

Android Studio 없이 빌드하려면 Android SDK와 JDK가 PATH에 있어야 합니다.

```bash
node scripts/cap-android.mjs --apk
```

결과:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

> release APK가 필요하면 Android Studio에서
> `Build ▸ Generate Signed App Bundle / APK` 로 키스토어를 만들어 서명하세요.
> 사내 테스트용이라면 debug APK로 충분합니다.

---

## 5. 네이버 메일로 보내기

> ⚠️ **네이버 메일은 `.apk`를 실행 파일로 간주해 첨부를 차단합니다. 반드시 ZIP으로 압축하세요.**

```
1. app-debug.apk  →  우클릭  →  압축(ZIP)  →  buzz-v1.0.0.zip
2. mail.naver.com  →  쓰기
3. 받는 사람: 본인 네이버 메일
4. 제목: BUZZ 앱 v1.0.0
5. buzz-v1.0.0.zip 첨부   (APK는 보통 수 MB, 첨부 한도 30MB)
6. 발송
```

용량이 크면 **네이버 MYBOX에 업로드 → 공유 링크를 메일로 전송**해도 됩니다.

---

## 6. 폰에서 설치하기

```
1. 폰에서 네이버 메일 앱 열기 → 받은 메일
2. buzz-v1.0.0.zip 다운로드
3. 내 파일 관리자에서 압축 해제 → app-debug.apk
4. APK 탭 → 설치 시도
5. "출처를 알 수 없는 앱" 경고가 뜨면
   설정 ▸ 보안(또는 앱 설치) ▸ 파일 관리자 / 네이버 메일 ▸ 허용
6. 다시 APK 탭 → 설치 → 열기
7. BUZZ 스플래시 → 모니터링 화면이 뜨면 성공
```

> **Play 프로텍트** 경고가 나올 수 있습니다. 자체 서명 APK는 스토어 심사를 거치지 않아
> 나오는 정상 안내이므로 `세부정보 ▸ 설치(계속)` 를 눌러 진행하세요.

---

## 7. USB로 바로 설치 (빠른 테스트)

메일 배포 전 기능 확인용:

```
폰: 설정 ▸ 개발자 옵션 ▸ USB 디버깅 ON
PC: node scripts/cap-android.mjs --open  →  Android Studio ▶ (Run)
```

---

## 8. 코드 수정 후 재배포

웹 코드(`src/`)를 수정했으면 항상 아까 그 한 줄만 다시 실행하면 됩니다.

```bash
node scripts/cap-android.mjs          # sync
node scripts/cap-android.mjs --apk    # APK까지
```

버전을 올릴 때는 `android/app/build.gradle` 의 `versionCode` / `versionName`을 수정하세요.

```gradle
versionCode 2
versionName "1.0.1"
```

---

## 9. 자주 발생하는 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| `SDK location not found` | local.properties 없음 | Android Studio에서 `android/` 폴더를 한 번 열어줌 (자동 생성) |
| `SDK not found. Please specify` | Platform 34/35 미설치 | SDK Manager에서 해당 버전 설치 |
| 앱 실행 시 흰 화면 | `cap sync` 누락 | `node scripts/cap-android.mjs` 재실행 |
| 벌 사진(이미지)만 안 보임 | dist/images 미포함 | `npm run build` 후 `cap sync` 재실행 |
| 개폐기 상태가 재시작 시 초기화 | DOM storage 비활성 | Capacitor는 기본 활성화 (`android:configChanges` 유지) |
| `cap add android` 실패 | android/ 폴더 잔여 | 스크립트가 자동 정리하므로 재실행 |
| 메일 첨부 안 됨 | `.apk` 직접 첨부 | **ZIP으로 압축** 후 첨부 |
| 폰트가 기본 서체로 보임 | 오프라인 | 인터넷 연결 1회 후 재실행 (CDN 폰트 캐시) |

완전 오프라인 앱이 필요하면 `src/index.css` 상단의 Google Fonts / Pretendard CDN
`@import` 두 줄을 제거하고 시스템 폰트만 사용하도록 바꾸면 됩니다.

---

## 10. 폴더 구조

```
프로젝트/
├── capacitor.config.ts          # appId / appName / webDir
├── dist/                        # 웹 빌드 결과 (webDir)
│   ├── index.html               # JS/CSS 인라인
│   └── images/                  # 벌 사진 에셋
├── scripts/
│   └── cap-android.mjs          # 생성·동기화·패치·APK빌드 원스톱
└── android/                     # ② 단계에서 자동 생성
    ├── app/
    │   ├── build.gradle         # versionCode / versionName
    │   └── src/main/
    │       ├── AndroidManifest.xml        # 세로 고정 (스크립트가 패치)
    │       ├── assets/public/             # dist 가 여기로 복사됨
    │       ├── java/com/buzz/detector/MainActivity.java
    │       └── res/values/
    │           ├── colors.xml             # buzz_background #0A0E1A
    │           └── styles.xml             # 다크 상태바
    ├── build.gradle
    └── settings.gradle
```

---

## 11. 명령어 요약

```bash
node scripts/cap-android.mjs            # 빌드 + 생성/동기화
node scripts/cap-android.mjs --apk      # + APK 빌드
node scripts/cap-android.mjs --open     # + Android Studio 실행
npx cap doctor                          # 환경 진단
npx cap list                            # 설치된 플러그인 확인
```
