# BUZZ 최신본 수정 완료 메모

## 핵심 변경

- 웹 대시보드: `[전체 사업장] [사업장1] [사업장2] [사업장3]` 대형 탭 추가
- 전체 사업장: site1/site2/site3 상태, AI 결과, 출입문, 시뮬레이터 파일/chunk 상태 동시 표시
- 개별 사업장: 최신 실제 2초 chunk의 Waveplot / FFT / Mel-Spectrogram / MFCC 표시
- 기존 분석 메뉴: 데모 그래프 대신 최신 실제 2초 chunk 기반 상세 분석으로 변경
- Capacitor 모바일 홈: 같은 4개 사업장 선택 구조와 실제 분석 상세 표시
- 시뮬레이터 폴더: `data/audio_simulator/site1`, `site2`, `site3`만 사용
- 각 사업장은 자기 폴더 파일을 독립 순차 처리하며 마지막 2초 미만은 zero padding
- API 실패 시 정상으로 대체하지 않고 simulator `ERROR` 상태로 기록
- START / STOP, 현재 파일, chunk 번호, 구간, AI 결과, 로그 API 추가
- Docker Compose에 `simulator` 서비스 추가
- 파일 테스트 모드: 전체 파일을 2초씩 끝까지 실제 모델 분석
- 연속 wasp chunk 자동 병합, 테스트 이력/전체 chunk 로그/특정 chunk 상세 분석 지원
- 테스트 이력은 MySQL `file_test_runs`에 JSON 결과 전체를 저장하며 DB 장애 시 현재 프로세스 메모리 이력으로 fallback

## 오디오 시뮬레이터 폴더

```text
Buzz/
└─ data/
   └─ audio_simulator/
      ├─ site1/
      ├─ site2/
      └─ site3/
```

`normal`, `wasp` 하위 폴더는 사용하지 않습니다.

## 실행

### Docker 전체 실행

```bash
docker compose up -d --build
```

웹: `http://localhost:5173`
FastAPI 문서: `http://localhost:8000/docs`

로그 확인:

```bash
docker compose logs -f ai-server simulator web mysql
```

중지:

```bash
docker compose down
```

DB까지 초기화하려면:

```bash
docker compose down -v
docker compose up -d --build
```

기존 DB 볼륨을 유지해도 `file_test_runs` 테이블은 파일 테스트 저장 시 자동 생성됩니다.

### 웹만 로컬 실행

```bash
cd web
npm install
npm run dev
```

### Capacitor 앱

```bash
cd android-app
npm install
npm run build
npx cap sync android
npx cap open android
```

실기기 사용 시 `VITE_API_BASE_URL`을 Docker/FastAPI가 실행 중인 PC의 LAN 주소(예: `http://192.168.x.x:8000`)로 지정합니다.

## 테스트 절차

1. `data/audio_simulator/site1~site3`에 WAV/MP3를 각각 넣습니다.
2. `docker compose up -d --build` 실행 후 웹 대시보드를 엽니다.
3. START 상태에서 각 사업장의 현재 파일/chunk가 2초마다 바뀌는지 확인합니다.
4. 개별 사업장을 눌러 AI 결과와 Waveplot/FFT/Mel/MFCC가 같은 최신 chunk로 갱신되는지 확인합니다.
5. FastAPI를 의도적으로 중단하면 해당 chunk가 정상으로 바뀌지 않고 `ERROR`로 표시되는지 확인합니다.
6. `음원 테스트` 메뉴에서 30초 WAV를 업로드합니다.
7. 0~2, 2~4 ... 마지막 구간까지 로그가 생성되는지 확인합니다.
8. 연속 wasp chunk가 하나의 감지 구간으로 합쳐지는지 확인합니다.
9. 테스트 이력을 누르고 특정 chunk를 선택해 Waveplot/FFT/Mel/MFCC 상세가 표시되는지 확인합니다.

## 검증 결과

- Python `compileall`: 통과
- 새 React/JSX 파일 Babel parser 문법 검사: 통과
- Docker Compose YAML 파싱: 통과
- 5초 + 100 sample 입력의 2초 분할/padding 단위 테스트: 통과 (`0~2`, `2~4`, `4~5.004`)
- 현재 작업 샌드박스에는 Docker CLI와 TensorFlow가 설치되어 있지 않아 실제 Docker 기동/모델 추론 통합 실행은 수행하지 못했습니다.
- 첨부본의 `node_modules`는 Windows용 바이너리라 Linux 샌드박스 Vite 빌드에 사용할 수 없었습니다. 최종 ZIP에서는 `node_modules`를 제외하므로 각 폴더에서 `npm install` 후 사용하세요.
