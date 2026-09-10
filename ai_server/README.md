# 🐝 Buzz FastAPI Server

모델 → 서버 → 앱의 현재 필드명, 단위, 책임 분담과 실행 방법은
[음원 분석 데이터 계약](../docs/analysis-contract.md)을 참고하세요.

FastAPI 내부 기능 분리 기준과 지속 분석 설계 원칙은
[AI 서버 구조 원칙](../docs/ai-server-architecture.md)을 참고하세요.

Buzz의 Python 백엔드입니다.

최종 아키텍처에서는 Kafka를 사용하지 않고 **FastAPI가 자동 감지 및 사용자 테스트 음향 입력을 직접 수신**합니다. 이후 2초·24kHz 기준 전처리, AI 추론, 음향 분석 수치 JSON 생성, 사업장 상태 갱신을 담당합니다.

## 역할

```text
음향 입력
→ FastAPI
→ 2초 / 24kHz 전처리
→ Best Model 추론
→ non_wasp / wasp
→ 분석 수치 JSON
→ Android
```

## 실행

전처리는 모델과 동일하게 24,000Hz, 2초, mono, RMS -20dB 정규화 후 zero padding을 적용합니다.
Mel-Spectrogram과 표시용 MFCC는 `n_fft=1024`, `hop_length=256`을 사용하며 Mel 필터 수는 128입니다.
별도 FFT 그래프는 2초 파형 전체에 FFT를 적용합니다. 학습된 ML 모델의 특징 추출 설정은 변경하지 않습니다.

```bash
cd ai_server
pip install -r requirements.txt
python run.py
```

- Swagger: `http://localhost:8000/docs`
- Health: `GET http://localhost:8000/health`

## 주요 API

### `GET /health`
FastAPI 서버 동작 여부 확인

### `POST /api/test/analyze`
사용자 테스트용 MP3/WAV 업로드. 자동 감지 상태/문/이력에는 영향을 주지 않음

### `POST /api/auto/analyze`
자동 감지용 직접 업로드

Form Data:
- `file`: MP3/WAV
- `site_id`: 사업장 ID, 기본값 3

### `POST /api/auto/analyze-batch`
사업장 음원을 최대 3개까지 한 번의 모델 배치로 분석합니다. `files`와 `site_ids`를 같은
순서와 개수로 전송하며, 응답에는 사업장 ID·파일 정보·판정·분석 시각이 포함됩니다. 자동
분석에는 필요하지 않은 파형·FFT·Mel·MFCC 배열을 제외해 응답 크기를 줄였습니다. 음원 Worker가
기본적으로 사용하는 엔드포인트입니다.

### `GET /api/analysis/latest/{site_id}`
해당 사업장의 최신 자동 분석 음원으로 Waveform·FFT·Mel-Spectrogram JSON을 생성합니다.
Worker의 배치 응답에는 큰 배열을 싣지 않고 최신 음원 하나만 메모리에 보관합니다. Web 분석
페이지가 열려 있고 `latest_analysis_id`가 변경될 때만 호출하므로 평상시 그래프 전송은 없습니다.
같은 분석 ID의 시각화 결과는 메모리에 캐시하며 새 음원이 수신되면 자동으로 교체합니다. 실시간
화면에서 사용하지 않는 MFCC는 이 응답에서 제외하고, 1KB 이상의 응답에는 GZip 압축을 적용합니다.

### `POST /api/internal/analyze-file`
서버 로컬 또는 공유 경로 음원 분석

```json
{
  "file_path": "C:/Buzz/data/raw/wasp_001.wav",
  "site_id": 3,
  "source": "auto_detection"
}
```

### 상태/이력/문 제어
- `GET /api/status` — 사업장 3개 상태와 Worker 수신 상태 통합 조회
- `GET /api/status/{site_id}`
- `GET /api/history`
- `POST /api/door/{site_id}`

## 분석 응답

- Prediction: `label`, `confidence`, `probabilities`
- Waveform: `amplitude[]`
- FFT: `frequency[]`, `magnitudeDb[]`
- Mel-Spectrogram: `time[]`, `frequency[]`, `db[][]`
- MFCC: `time[]`, `coefficients[][]` (`POST /api/test/analyze` 응답에만 포함)
- Meta: `source`, `modelName`, `timestamp`

## 현재 구현 상태

현재 FastAPI 기본 구조와 분석 데이터 계약은 구성되어 있습니다.

현재 `app/config.py`의 `AI_MODEL_NAME`으로 사용할 모델을 지정하며, 서버 시작 시 모델을 한 번 로드합니다.
같은 종류의 재학습 모델은 `ai_model/models`의 파일을 교체하고 서버를 재시작하면 됩니다.

```text
음원 업로드 → ai_model 공통 전처리 → 실제 이진분류 모델 추론
→ FastAPI 응답 생성 → Android/Web 연동
```

현재 Android/Web의 **사용자 음원 테스트 화면**은 `/api/test/analyze`에 연결되어 있습니다.
사업장 3개의 지속 분석 Worker, 모니터링·이력·문 제어 화면도 실제 API에 연결되어 있습니다.
Web 분석 화면은 열린 동안에만 선택 사업장의 최신 신호 그래프를 조회합니다.

## 임시 운영 기준

환경변수가 없으면 `app/config.py`의 기본값을 사용합니다.

| 설정 | 기본값 | 의미 |
|---|---:|---|
| `BUZZ_AI_MODEL_NAME` | `CNN` | 서버가 로드할 모델 종류 |
| `BUZZ_AI_MODEL_THRESHOLD` | `0.7` | `P(wasp)`가 말벌 판정으로 인정되는 기준 |
| `BUZZ_DANGER_CONSECUTIVE_DETECTIONS` | `3` | 위험 상태로 전환하기 위한 연속 말벌 판정 횟수 |
| `BUZZ_NORMAL_CONSECUTIVE_NON_DETECTIONS` | `3` | 위험 상태를 자동 해제하기 위한 연속 미검출 횟수 |
| `BUZZ_MANUAL_DANGER_CLEAR_ENABLED` | `true` | 사용자의 수동 위험 해제 허용 여부 |
| `BUZZ_SIMULATOR_AUDIO_ROOT` | `data/audio_simulator` | 사업장별 시연 음원 루트 폴더 |
| `BUZZ_SIMULATOR_API_URL` | `http://127.0.0.1:8000/api/auto/analyze-batch` | Worker가 호출할 배치 분석 API |
| `BUZZ_SIMULATOR_INTERVAL_SECONDS` | `2.0` | 각 사업장 구간 공급 간격(초) |
| `BUZZ_SIMULATOR_BATCH_WAIT_SECONDS` | `0.5` | 다른 사업장 구간을 배치에 포함하기 위해 기다리는 최대 시간(초) |
| `BUZZ_SIMULATOR_RETRY_SECONDS` | `5` | 음원 없음·요청 실패 후 대기 시간(초) |
| `BUZZ_SIMULATOR_MAX_RETRIES` | `3` | 분석 요청 최대 시도 횟수 |
| `BUZZ_SIMULATOR_QUEUE_SIZE` | `3` | 공용 분석 대기열 최대 크기 |
| `BUZZ_WORKER_STALE_AFTER_SECONDS` | `10` | Worker 수신 지연으로 판단할 마지막 분석 경과 시간(초) |

현재 실제 추론에는 모델명과 판정 임계값이 적용됩니다. `/api/auto/analyze`와
`/api/internal/analyze-file`은 연속 감지·해제 횟수에 따라 사업장 상태를 갱신합니다.
수동 위험 해제 정책은 별도 API를 구현할 때 적용할 기준입니다. MySQL 연동 전까지 상태와
이력은 메모리에 저장되므로 서버를 재시작하면 초기화됩니다.

## 자동 분석 상태 처리

자동 분석 요청마다 원시 추론 결과를 응답하고 해당 사업장의 최근 분석 결과와 연속 횟수를
갱신합니다.

- `wasp`가 3회 연속 탐지되면 `DANGER`로 전환합니다.
- 위험 전환 시 문이 열려 있으면 자동으로 닫고, 위험 감지와 문 폐쇄 이력을 각각 남깁니다.
- `DANGER` 상태에서 `non_wasp`가 3회 연속 탐지되면 `NORMAL`로 복귀하고 복귀 이력을 남깁니다.
- 정상 복귀 후에도 문은 자동으로 열지 않습니다. 문 열림은 별도 명령으로 처리합니다.
- 같은 상태가 계속되는 동안 위험 전환이나 문 폐쇄 이력을 중복 생성하지 않습니다.
- `/api/status/{site_id}`에서 최신 분석 ID, 연속 탐지 횟수, 상태와 문 상태를 조회할 수 있습니다.

`/api/test/analyze`는 모델 연결 확인용이므로 사업장 상태와 이력을 변경하지 않습니다.

## 사업장 음원 공급 Worker

시연 음원을 다음 폴더에 넣습니다. MP3와 WAV를 지원하며 음원 파일 자체는 Git에서 제외됩니다.

```text
data/audio_simulator/
├─ site1/
├─ site2/
└─ site3/
```

각 사업장 작업은 파일명을 기준으로 정렬한 뒤 첫 파일부터 재생합니다. 한 파일을 2초 단위로
끝까지 공급하고 다음 파일로 넘어가며, 폴더의 마지막 파일이 끝나면 폴더를 다시 조회해 첫
파일부터 반복합니다. 마지막 구간이 2초보다 짧으면 무음으로 채웁니다.

프로젝트 루트에서 두 프로세스를 별도 터미널로 실행합니다.

```powershell
# 터미널 1: FastAPI
.\.venv\Scripts\python.exe ai_server\run.py

# 터미널 2: 사업장 3개 음원 공급 Worker
.\.venv\Scripts\python.exe -m ai_server.app.workers.audio_simulator
```

Worker에는 사업장별 비동기 생산 작업 3개와 배치 소비자 1개가 있습니다. 소비자는 각 사업장의
현재 구간을 하나씩 모아 최대 3개 입력을 CNN의 한 번의 `predict` 호출로 처리합니다. 한 사업장
구간이 늦으면 설정된 시간까지만 기다리고 준비된 사업장부터 분석합니다. 대기열이 가득 차면
생산 작업이 기다리므로 분석 속도보다 음원이 무한히 쌓이지 않습니다. HTTP 요청 실패는 기록 후
기본 3회까지 재시도하며, 한 사업장 파일 오류가 다른 사업장 작업을 중단시키지 않습니다.
배치의 결과는 사업장별로 분리해 기존 상태·연속 탐지·문·이력 처리에 각각 반영합니다.

## 영상 데이터

영상은 AI 입력이 아니라 Android의 상태 시각화 용도입니다.

```text
NORMAL → 정상 양봉장/꿀벌 영상
DANGER → 말벌 상황 영상
```

## 최종 제외 기술

- Kafka: 현재 규모 대비 복잡도가 높아 제거
