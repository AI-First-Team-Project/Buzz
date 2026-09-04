
# UI 개편 사항 (2026-09)

이 폴더는 기존 `Buzz-feature-ui-hyeongjun` 코드를 기준으로 수정한 버전입니다.
기존 Capacitor / Vite / React 구조, Android 빌드 폴더, 기존 팀원 화면은 유지하고
홈 화면과 공통 하단 네비게이션, AI 테스트 화면을 새 기획에 맞춰 추가/교체했습니다.

## 반영된 핵심 조건

- 상태는 `정상 / 위험` 2단계만 사용
- 홈에서 사업장 1~3을 즉시 전환 가능
- 홈의 기술용 `백엔드 연결됨` 문구 제거
- 사용자에게는 `시스템 정상 / 위험 감지`로만 표시
- 영상 영역을 크게 확대
- 영상 오른쪽 상단은 누적 시간이 아니라 **현재 시각**
- 정상일 때 선택 사업장의 꿀벌/양봉장 영상 반복 재생
- 말벌 감지 시 위험 UI로 전환
- AI 결과는 `말벌 / 꿀벌 / Other` 3분류
- 홈에서 주요 주파수 / 활성도 제거
- 가상 출입문 `열림 / 닫힘` 및 수동 제어
- 말벌 감지 시 자동 닫힘
- 말벌 감지 중 사용자가 열면 3초 뒤 다시 자동 닫힘
- 테스트 기능은 하단 `테스트` 탭으로 완전히 분리
- 테스트 파일은 운영 문 상태에 영향을 주지 않음

## 영상

기존 프로젝트에 포함된 영상을 그대로 사용합니다.

```text
public/videos/site-1.mp4
public/videos/site-2.mp4
public/videos/site-3.mp4
```

현재 소스에서 정상/위험 UI 상태에 따라 같은 사업장 영상에 다른 상태/포스터를 적용합니다.
실제 `bee.mp4`, `hornet.mp4`를 따로 확보하면 HomePageV2.jsx의 video src만 분기하도록 변경하면 됩니다.

## 웹 개발 서버 실행

`android-app` 폴더에서:

```bash
npm install
npm run dev
```

터미널에 보이는 주소(기본값은 보통 `http://localhost:5173`)로 접속합니다.

## 프로덕션 빌드 확인

```bash
npm run build
```

성공하면 `dist/` 폴더가 생성됩니다.

## Android Studio / APK 반영

웹 빌드 후:

```bash
npm run build
npx cap sync android
npx cap open android
```

Android Studio가 열리면 앱을 실행하거나 APK를 빌드할 수 있습니다.

## 데모 상태

실제 API 연동 전 발표/개발 확인을 위해 홈 하단에 작은 `개발 데모` 버튼을 남겨두었습니다.
상용 화면을 캡처하거나 최종 배포할 때는 HomePageV2.jsx의 `buzz-dev-demo` 블록을 삭제하면 됩니다.

## 실제 AI 연동 시

현재 말벌/꿀벌/Other 확률은 UI용 값입니다.
FastAPI 응답을 연결하면 다음과 같은 형태를 권장합니다.

```json
{
  "class": "hornet",
  "confidence": 0.97,
  "probabilities": {
    "hornet": 0.97,
    "honeybee": 0.02,
    "other": 0.01
  },
  "status": "danger",
  "timestamp": "2026-09-01T14:30:25"
}
```

`class === "hornet"`일 때 위험 상태로 전환하고 가상 문 상태를 닫힘으로 변경하면 됩니다.

## React 19 useEffect 오류 수정

Chrome 콘솔에서 아래 오류가 발생할 수 있던 부분을 수정했습니다.

```text
useEffect must not return anything besides a function
Uncaught TypeError: destroy is not a function
```

기존:

```js
useEffect(() => window.scrollTo(0, 0), [currentPage]);
```

수정:

```js
useEffect(() => {
  window.scrollTo(0, 0);
}, [currentPage]);
```

React 19 개발 모드의 StrictMode에서 effect 반환값 검사가 엄격하기 때문에,
effect는 cleanup 함수 또는 `undefined`만 반환하도록 블록 형태로 작성했습니다.

## 최종 홈/사업장/분석 구조 수정

이번 수정에서 다음 내용을 반영했습니다.

1. `전체 사업장 보기`는 사업장 1, 2, 3을 한 화면에서 동시에 보여주는 카드 목록으로 변경
2. 홈 AI 판정 카드를 축소해 대표 결과 + 보조 확률만 표시
3. 홈에서 FFT 제거
4. FFT / MFCC / Mel-Spectrogram은 `분석 > AI 분석 상세`에서만 표시
5. 홈 정보 우선순위를 `정상/위험 → 영상 → AI 판정 → 문 상태/제어`로 단순화
6. 영상 상단의 `LIVE SIMULATION` 문구 제거, 빨간 점만 유지
7. 영상 우측 상단은 현재 시각 유지

## Vite JSX dependency scan 오류 수정

`SitePage.js`, `AnalysisPage.js` 안에 JSX가 들어 있는데 확장자가 `.js`여서
Vite/esbuild dependency scan에서 `JSX syntax extension is not currently enabled` 오류가 발생했습니다.

수정:
- `SitePage.js` → `SitePage.jsx`
- `AnalysisPage.js` → `AnalysisPage.jsx`
- `App.jsx` import 경로도 `.jsx`로 명시

이 버전에서는 해당 오류가 발생하지 않도록 파일 확장자를 올바르게 맞췄습니다.

## 분석 / 이력 / 설정 UX 개선

사용자 확인 후 다음을 추가 반영했습니다.

### 분석 상세
- AI 판정 요약을 최상단에 배치
- Mel-Spectrogram을 가장 크게 표시
- 시간축 / 주파수축 / 에너지 범례 추가
- FFT에 Hz 축(0~4kHz)과 해석용 요약 문장 추가
- MFCC는 작은 기술 참고 영역으로 축소하고 용도 설명 추가

### 이력
- `전체 / 위험 / 정상 / 문 제어` 필터 추가
- 로그 텍스트 대신 한눈에 볼 수 있는 카드형 목록으로 변경
- 카드에서 사업장 / 시각 / AI 판정 / 신뢰도 / 문 상태 확인 가능
- 이력 항목 클릭 시 상세 Bottom Sheet 표시
- 상세에서 클래스별 확률, 당시 문 상태, 문 동작, 관련 이벤트 흐름 확인
- `관련 AI 분석 상세 보기`로 분석 탭 이동 가능

### 설정
- 기존 어두운 테마를 제거하고 홈과 동일한 크림 / 화이트 / 네이비 / 허니 옐로우 스타일 적용
- 알림 / 자동 보호 / 사업장 / 시스템 / 정보 섹션으로 재구성
- 기술 연결 상태는 기본 화면에 노출하지 않고 시스템 상태를 펼쳤을 때만 확인

## 2026-09 최종 포트폴리오 분석/이력 수정

- 정상 분석은 이력에서 제외하고 `위험 / 문 제어`처럼 확인이 필요한 이벤트만 저장
- 홈 `마지막 분석`은 더 이상 고정 12초가 아니라 UI 데모에서 10~30초 랜덤 간격의 자동 감지 입력 시뮬레이션마다 갱신
- 실제 연동 시 FastAPI 자동 감지 분석 결과 수신 시 현재 시각을 기록하는 방식으로 교체
- 분석 탭에서 사업장 1/2/3 선택 가능
- 사업장별 AI 판정 / 신뢰도 / 클래스별 확률 / 분석시각 / 음원길이 / 판정 요약 표시
- 포트폴리오용 상세 분석 순서:
  1. Waveplot
  2. FFT Spectrum (Hz 축)
  3. Mel-Spectrogram (시간/주파수/에너지 범례)
  4. MFCC
- 분석 데이터 흐름 설명까지 추가

## 분석 색상 / 이력 상세 화면 수정

### 상세 분석 그래프
앱의 허니 옐로우 테마와 일부러 분리해 일반적인 과학/음향 분석 시각화 색상으로 변경했습니다.

- Waveplot: 파란색 파형
- FFT: 청록/파란색 스펙트럼
- Mel-Spectrogram: Inferno/Magma 계열의 어두운 보라 → 빨강 → 노랑 열지도
- MFCC: 파랑 → 흰색 → 빨강 형태의 diverging heatmap
- 상세 분석 카드 자체도 흰색/회색 기반의 중립적인 분석 화면으로 구분

### 이력 상세
기존 Bottom Sheet 형태를 제거하고 항목 클릭 시 전체 화면 상세 정보가 바로 열리도록 변경했습니다.

- 드래그 핸들 제거
- 화면 전체 높이 사용
- 상단 고정 헤더 + 닫기 버튼
- AI 판정 / 신뢰도 / 당시 문 상태 / 문 동작 / 시각 / 사업장
- 클래스별 신뢰도
- 관련 이벤트 흐름
- 관련 AI 분석 상세 이동 버튼

## 테스트 탭 분석 이미지 상세 모달 추가

- 상세 분석 그래프 색상은 다시 앱의 기존 허니 테마에 맞춰 롤백
- 상세 그래프 영역의 높이를 전반적으로 더 크게 조정
- 테스트 탭에서 분석 후 `분석 결과 상세 보기` 버튼 추가
- 버튼 클릭 시 전체 화면 상세 모달이 열리고 다음 이미지가 표시됨:
  - Waveplot
  - FFT Spectrum
  - Mel-Spectrogram
  - MFCC
- 현재는 `/public/mock-analysis/*.png` 샘플 이미지를 사용
- 실제 연동 시 Python AI 서버가 그래프 이미지를 생성해서 URL 또는 파일 경로를 응답하면 동일한 UI에 그대로 연결 가능

권장 백엔드 응답 예시:
```json
{
  "class": "hornet",
  "confidence": 0.968,
  "duration_sec": 15.0,
  "analyzed_at": "2026-09-01T15:40:27",
  "probabilities": {
    "hornet": 0.968,
    "honeybee": 0.021,
    "other": 0.011
  },
  "images": {
    "waveplot": "/analysis/waveplot/123.png",
    "fft": "/analysis/fft/123.png",
    "mel": "/analysis/mel/123.png",
    "mfcc": "/analysis/mfcc/123.png"
  }
}
```

## 최종 모바일 UI 점검 (360×760 기준)

- 홈 화면을 360×760 Android 뷰포트에서 핵심 정보가 하단 내비게이션에 가리지 않도록 압축
- 상태 카드, 영상, AI 판정, 문 상태/제어 버튼의 세로 여백과 높이를 재조정
- 고정 Bottom Navigation 높이와 본문 bottom padding을 맞춰 겹침 방지
- 360×760에서는 영상 높이를 178px로 조정하고 카드 패딩을 소폭 축소
- 문 열기/닫기 버튼과 안내 문구가 한 화면 안쪽에 더 안정적으로 보이도록 조정
- `전체 사업장 보기`는 기능을 유지하면서 한 줄 compact 링크로 축소
- 개발 데모용 토글 UI는 최종 화면에서 제거
- 버튼/배지/타이틀/설명 텍스트의 line-height와 수직 중앙 정렬을 통일
- 다른 탭도 페이지 제목, 카드, 설정 행, 이력 카드의 기준선/여백을 일관되게 정리

## 화면 높이 기반 반응형 간격 추가

모바일 화면 높이에 따라 카드 간격과 패딩이 단계적으로 달라지도록 적용했습니다.

- 800px 이하: 기존 compact 모드 유지
- 801~849px: compact와 기본 사이
- 850~899px: 일반 대화면 폰용 여유 있는 간격
- 900px 이상: 카드 간격, 패딩, 영상 높이를 더 넉넉하게 확대
- 폭이 큰 화면에서는 본문 최대 폭을 430px로 제한해 모바일 UI 비율 유지
